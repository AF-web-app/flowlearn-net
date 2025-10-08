#!/usr/bin/env bash
set -euo pipefail

# ==============================
# Flowlearn Production Deployment
# Bygger lokalt och synkar ./dist till servern, sedan startar/omstartar PM2
# ==============================

# --- Konfiguration ---
# ÄNDRA dessa värden innan du kör
USER="root"                     # SSH-användare på servern
HOST="217.160.17.72"            # IP eller domän till servern (ÄNDRA DETTA!)
SSH_PORT=22                     # SSH-port (oftast 22)
DESTINATION_PATH="/home/flowlearn/htdocs/www.flowlearn.se"  # Webbroten på servern
# Valfri server-side .env-fil som innehåller hemligheter för runtime
SERVER_ENV_FILE="/var/www/flowlearn/.env"
APP_NAME="flowlearn"            # PM2-appens namn
PORT=4321                       # App-porten bakom reverse proxy

# Om du vill använda en specifik SSH-nyckel, avkommentera och sätt sökvägen
# SSH_KEY="~/.ssh/id_rsa"

# Färgkoder för tydligare output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Funktioner ---
err() { 
  echo -e "${RED}[ERROR] $*${NC}" >&2
  exit 1
}

info() { 
  echo -e "${BLUE}[INFO] $*${NC}"
}

success() {
  echo -e "${GREEN}[SUCCESS] $*${NC}"
}

warn() {
  echo -e "${YELLOW}[WARNING] $*${NC}"
}

# Funktion för att kontrollera konfiguration
check_config() {
  info "Kontrollerar konfiguration..."
  
  if [ "$HOST" = "din.server.ip" ]; then
    err "Du måste ändra HOST-variabeln till din servers IP-adress!"
  fi
  
  # Kontrollera SSH-anslutning
  info "Testar SSH-anslutning till ${USER}@${HOST}:${SSH_PORT}..."
  SSH_OPTS=("-p" "${SSH_PORT}" "-o" "ConnectTimeout=10")
  if [ -n "${SSH_KEY:-}" ]; then
    SSH_OPTS+=("-i" "${SSH_KEY}")
  fi
  
  if ! ssh "${SSH_OPTS[@]}" "${USER}@${HOST}" "echo 'SSH-anslutning OK'" 2>/dev/null; then
    err "Kan inte ansluta till servern via SSH. Kontrollera HOST, USER och SSH_PORT."
  fi
  
  success "SSH-anslutning fungerar"
}

# --- Förkontroller ---
info "Kör förkontroller..."

command -v rsync >/dev/null 2>&1 || err "rsync saknas lokalt. Installera rsync."
command -v ssh >/dev/null 2>&1   || err "ssh saknas lokalt."
command -v npm >/dev/null 2>&1   || err "npm saknas lokalt."

[ -f "package.json" ] || err "Kör detta skript från projektroten (där package.json finns)."

# Kontrollera att det är Flowlearn-projektet
if ! grep -q "flowlearn" package.json; then
  warn "Detta verkar inte vara Flowlearn-projektet. Fortsätter ändå..."
fi

# Kontrollera konfiguration
check_config

# --- 1) Rensa och bygg lokalt ---
info "Rensar tidigare builds..."
if [ -d "dist" ]; then
  rm -rf dist
  success "Rensade dist-mapp"
fi

info "Bygger Flowlearn lokalt (npm ci && npm run build)..."
if ! npm ci; then
  info "npm ci misslyckades, försöker npm install..."
  npm install
fi

# Kör build
npm run build

# Kontrollera att bygget lyckades
if [ ! -d "dist" ]; then
  err "Bygget misslyckades - dist-mappen saknas"
fi

if [ ! -f "dist/server/entry.mjs" ]; then
  err "Bygget saknar dist/server/entry.mjs. Kontrollera Astro-konfigurationen."
fi

success "Lokal build slutförd"

# --- 2) Synka till servern ---
info "Synkroniserar ./dist till ${USER}@${HOST}:${DESTINATION_PATH} via rsync..."

RSYNC_SSH_OPTS=("-p" "${SSH_PORT}")
if [ -n "${SSH_KEY:-}" ]; then
  RSYNC_SSH_OPTS+=("-i" "${SSH_KEY}")
fi

# Skapa en timestamp-fil i dist för att säkerställa att servern ser ändringarna
echo "Flowlearn deployment timestamp: $(date)" > ./dist/deployment-timestamp.txt
echo "Deployed from: $(whoami)@$(hostname)" >> ./dist/deployment-timestamp.txt
echo "Git commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" >> ./dist/deployment-timestamp.txt

# Synka dist-mappen
info "Synkar applikationsfiler..."
rsync -azv --delete \
  -e "ssh ${RSYNC_SSH_OPTS[*]}" \
  ./dist/ "${USER}@${HOST}:${DESTINATION_PATH}/"

# Synka package.json och package-lock.json
info "Synkar package-filer..."
rsync -azv \
  -e "ssh ${RSYNC_SSH_OPTS[*]}" \
  package.json package-lock.json "${USER}@${HOST}:${DESTINATION_PATH}/"

success "Filsynkronisering slutförd"

# --- 3) Initiera/Starta PM2 på servern ---
info "Säkerställer PM2 och start/omstartar Flowlearn på servern..."

SSH_OPTS=("-p" "${SSH_PORT}")
if [ -n "${SSH_KEY:-}" ]; then
  SSH_OPTS+=("-i" "${SSH_KEY}")
fi

# Kör fjärrskriptet via SSH med en heredoc
ssh "${SSH_OPTS[@]}" "${USER}@${HOST}" "bash -s" <<EOSSH
set -euo pipefail

# Färgkoder för remote-output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

remote_info() { echo -e "\${BLUE}[REMOTE] \$*\${NC}"; }
remote_success() { echo -e "\${GREEN}[REMOTE] \$*\${NC}"; }
remote_warn() { echo -e "\${YELLOW}[REMOTE] \$*\${NC}"; }

# Installera PM2 om det saknas
if ! command -v pm2 >/dev/null 2>&1; then
  remote_info "Installerar PM2 globalt..."
  npm install -g pm2
  remote_success "PM2 installerat"
fi

# Gå till webbroten och installera produktionsberoenden
remote_info "Installerar beroenden i ${DESTINATION_PATH}..."
cd "${DESTINATION_PATH}"
export NODE_ENV=production

if [ -f package-lock.json ]; then
  npm ci --only=production
else
  npm install --only=production
fi
remote_success "Beroenden installerade"

# Skapa ecosystem-filen för Flowlearn
ECO_FILE="${DESTINATION_PATH}/ecosystem.config.cjs"
remote_info "Skriver PM2 ecosystem.config.cjs för Flowlearn..."
cat > "\$ECO_FILE" <<EOL
module.exports = {
  apps: [{
    name: "${APP_NAME}",
    script: "./server/entry.mjs",
    cwd: "${DESTINATION_PATH}",
    instances: 1,
    exec_mode: "fork",
    env: {
      HOST: "0.0.0.0",
      PORT: "${PORT}",
      NODE_ENV: "production",
    },
    error_file: "${DESTINATION_PATH}/logs/err.log",
    out_file: "${DESTINATION_PATH}/logs/out.log",
    log_file: "${DESTINATION_PATH}/logs/combined.log",
    time: true,
    max_memory_restart: "1G",
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: "10s"
  }]
};
EOL

# Skapa logs-mapp
mkdir -p "${DESTINATION_PATH}/logs"

# Läs in .env-fil och starta/omstarta appen
remote_info "Laddar miljö och startar/omstartar Flowlearn..."
set -o allexport
if [ -f "${SERVER_ENV_FILE}" ]; then
  remote_info "Läser in server-miljövariabler från ${SERVER_ENV_FILE}"
  source "${SERVER_ENV_FILE}"
else
  remote_warn "Ingen .env-fil hittades på ${SERVER_ENV_FILE}"
fi
set +o allexport

# Kontrollera om appen redan körs
if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  remote_info "PM2 app '${APP_NAME}' finns. Startar om..."
  pm2 restart "\$ECO_FILE" --update-env
else
  remote_info "Startar Flowlearn i PM2..."
  pm2 start "\$ECO_FILE" --update-env
fi

# Spara PM2-konfigurationen
pm2 save
remote_success "PM2-konfiguration sparad"

# Deployment-kontroller
remote_info "Deployment klar. Kör sanity checks..."
echo "---"
pm2 describe "${APP_NAME}" || remote_warn "Kunde inte hämta PM2-beskrivning."
echo "---"

# Health check
if command -v curl >/dev/null 2>&1; then
  remote_info "Health check (curl http://127.0.0.1:${PORT}/):"
  if curl -sS --max-time 10 "http://127.0.0.1:${PORT}/" | head -n 5; then
    remote_success "Health check OK"
  else
    remote_warn "Health check misslyckades - appen kanske inte har startat än"
  fi
else
  remote_warn "curl saknas, kan inte köra health check."
fi

# Visa PM2-status
echo "---"
remote_info "PM2 Status:"
pm2 status
echo "---"
remote_info "Senaste loggar:"
pm2 logs "${APP_NAME}" --lines 10 --nostream || true

EOSSH

success "Deployment slutförd!"
info "Servern ska nu köra Flowlearn (${APP_NAME}) på port ${PORT}."
info "Kontrollera status med: ssh ${USER}@${HOST} 'pm2 status'"
info "Visa loggar med: ssh ${USER}@${HOST} 'pm2 logs ${APP_NAME}'"

# Visa deployment-sammanfattning
echo ""
echo -e "${GREEN}=== DEPLOYMENT SAMMANFATTNING ===${NC}"
echo -e "${BLUE}Projekt:${NC} Flowlearn"
echo -e "${BLUE}Server:${NC} ${USER}@${HOST}:${SSH_PORT}"
echo -e "${BLUE}Sökväg:${NC} ${DESTINATION_PATH}"
echo -e "${BLUE}PM2 App:${NC} ${APP_NAME}"
echo -e "${BLUE}Port:${NC} ${PORT}"
echo -e "${BLUE}Tid:${NC} $(date)"
echo -e "${GREEN}=================================${NC}"
