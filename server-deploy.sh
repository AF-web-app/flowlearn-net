#!/bin/bash
# server-deploy.sh - Ett skript som körs på servern för att uppdatera webbplatsen
# Detta skript ska kopieras till servern och köras där

# Färgkoder för tydligare output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Konfigurera sökvägar
REPO_DIR="/var/www/flowlearn"
ENV_FILE="$REPO_DIR/.env"
SYSTEMD_SERVICE="flowlearn"
SYSTEMD_SERVICE_FILE="/etc/systemd/system/$SYSTEMD_SERVICE.service"

# Funktion för att skriva ut meddelanden med färg
log_message() {
  local color=$1
  local message=$2
  echo -e "${color}${message}${NC}"
}

# Funktion för att kontrollera om ett kommando lyckades
check_success() {
  if [ $? -eq 0 ]; then
    log_message "$GREEN" "✅ $1"
  else
    log_message "$RED" "❌ $1"
    exit 1
  fi
}

# Konfigurera GitHub-autentisering
GITHUB_CONFIG_FILE="/root/.github-token"
GITHUB_REPO="AF-web-app/flowlearn-web2"
GITHUB_BRANCH="main"

# Läs in GitHub-token från konfigurationsfilen om den finns
if [ -f "$GITHUB_CONFIG_FILE" ]; then
  GITHUB_TOKEN=$(cat "$GITHUB_CONFIG_FILE")
else
  GITHUB_TOKEN="" # Tom om filen inte finns
fi

# Funktion för att uppdatera koden från GitHub
update_code() {
  log_message "$YELLOW" "🔄 Uppdaterar koden från GitHub..."
  
  # Kontrollera om repo-mappen finns
  if [ ! -d "$REPO_DIR" ]; then
    log_message "$YELLOW" "📁 Skapar repo-mapp..."
    mkdir -p "$REPO_DIR"
    check_success "Skapa repo-mapp"
  fi
  
  # Gå till repo-mappen
  cd "$REPO_DIR" || exit 1
  
  # Spara undan .env-filen om den finns
  if [ -f "$ENV_FILE" ]; then
    log_message "$YELLOW" "📂 Säkerhetskopierar .env-fil..."
    cp "$ENV_FILE" "/tmp/.env.backup"
    check_success "Säkerhetskopiera .env-fil"
  fi
  
  # Fråga efter GitHub-token om den inte redan är satt
  if [ -z "$GITHUB_TOKEN" ]; then
    log_message "$YELLOW" "🔑 GitHub-token saknas. Du behöver skapa en Personal Access Token på GitHub."
    read -p "Ange din GitHub Personal Access Token: " GITHUB_TOKEN
    if [ -z "$GITHUB_TOKEN" ]; then
      log_message "$RED" "❌ Ingen token angiven. Kan inte fortsätta."
      exit 1
    fi
    
    # Fråga om tokenen ska sparas för framtida användning
    read -p "Vill du spara tokenen för framtida användning? (j/n): " save_token
    if [ "$save_token" = "j" ] || [ "$save_token" = "J" ]; then
      echo "$GITHUB_TOKEN" > "$GITHUB_CONFIG_FILE"
      chmod 600 "$GITHUB_CONFIG_FILE" # Sätt rätt behörigheter för säkerhet
      log_message "$GREEN" "✅ GitHub-token sparad för framtida användning."
    fi
  fi
  
  # Sätt upp GitHub URL med token
  GITHUB_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git"
  
  # Kontrollera om det är ett git-repo
  if [ ! -d ".git" ]; then
    log_message "$YELLOW" "🔄 Klonar repo med autentisering..."
    git init
    git remote add origin "$GITHUB_URL"
    check_success "Initiera git-repo"
  else
    # Uppdatera remote URL med token för att säkerställa autentisering
    log_message "$YELLOW" "🔄 Uppdaterar remote URL med autentisering..."
    git remote set-url origin "$GITHUB_URL"
  fi
  
  # Uppdatera koden oavsett om det var ett repo eller inte
  log_message "$YELLOW" "🔄 Hämtar senaste koden..."
  git fetch origin
  git reset --hard origin/$GITHUB_BRANCH
  check_success "Uppdatera kod från GitHub"
  
  # Återställ .env-filen om den fanns
  if [ -f "/tmp/.env.backup" ]; then
    log_message "$YELLOW" "📂 Återställer .env-fil..."
    cp "/tmp/.env.backup" "$ENV_FILE"
    check_success "Återställa .env-fil"
  fi
}

# Funktion för att installera beroenden
install_dependencies() {
  log_message "$YELLOW" "📦 Installerar beroenden..."
  npm ci
  check_success "Installera beroenden"
}

# Funktion för att bygga projektet
build_project() {
  log_message "$YELLOW" "🏗️ Bygger projektet..."
  npm run build
  check_success "Bygga projektet"
}

# Funktion för att skapa eller uppdatera .env-filen
update_env_file() {
  log_message "$YELLOW" "🔑 Uppdaterar .env-filen..."
  
  # Kontrollera om .env-filen finns
  if [ ! -f "$ENV_FILE" ]; then
    log_message "$YELLOW" "📝 Skapar ny .env-fil..."
    touch "$ENV_FILE"
  fi
  
  # Fråga efter WordPress-uppgifter om de inte redan finns i .env-filen
  if ! grep -q "WORDPRESS_URL" "$ENV_FILE"; then
    read -p "Ange WordPress URL (t.ex. https://flowlearn.se): " wp_url
    echo "WORDPRESS_URL=\"$wp_url\"" >> "$ENV_FILE"
  fi
  
  if ! grep -q "WORDPRESS_USERNAME" "$ENV_FILE"; then
    read -p "Ange WordPress användarnamn: " wp_username
    echo "WORDPRESS_USERNAME=\"$wp_username\"" >> "$ENV_FILE"
  fi
  
  if ! grep -q "WORDPRESS_APP_PASSWORD" "$ENV_FILE"; then
    read -p "Ange WordPress App Password: " wp_password
    echo "WORDPRESS_APP_PASSWORD=\"$wp_password\"" >> "$ENV_FILE"
  fi
  
  # Sätt rätt behörigheter på .env-filen
  chmod 600 "$ENV_FILE"
  check_success "Uppdatera .env-fil"
}

# Funktion för att uppdatera systemd-tjänsten
update_systemd_service() {
  log_message "$YELLOW" "🔧 Uppdaterar systemd-tjänsten..."
  
  # Läs in miljövariabler från .env-filen
  if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
  else
    log_message "$RED" "❌ .env-filen saknas!"
    exit 1
  fi
  
  # Skapa systemd-tjänstfilen
  cat > "$SYSTEMD_SERVICE_FILE" << EOL
[Unit]
Description=Flowlearn Astro Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$REPO_DIR
ExecStart=/usr/bin/node dist/server/entry.mjs
Restart=always
Environment="NODE_ENV=production"
Environment="WORDPRESS_URL=$WORDPRESS_URL"
Environment="WORDPRESS_USERNAME=$WORDPRESS_USERNAME"
Environment="WORDPRESS_APP_PASSWORD=$WORDPRESS_APP_PASSWORD"

[Install]
WantedBy=multi-user.target
EOL
  
  check_success "Skapa systemd-tjänstfil"
  
  # Ladda om systemd-konfigurationen
  systemctl daemon-reload
  check_success "Ladda om systemd-konfiguration"
}

# Funktion för att starta om tjänsten
restart_service() {
  log_message "$YELLOW" "🔄 Startar om tjänsten..."
  systemctl restart "$SYSTEMD_SERVICE"
  check_success "Starta om tjänsten"
  
  # Visa status för tjänsten
  systemctl status "$SYSTEMD_SERVICE" --no-pager
}

# Funktion för att testa WordPress-autentisering
test_wordpress_auth() {
  log_message "$YELLOW" "🔍 Testar WordPress-autentisering..."
  
  # Läs in miljövariabler från .env-filen
  if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
    
    # Kontrollera om miljövariablerna är satta
    if [ -z "$WORDPRESS_URL" ] || [ -z "$WORDPRESS_USERNAME" ] || [ -z "$WORDPRESS_APP_PASSWORD" ]; then
      log_message "$RED" "❌ En eller flera WordPress-miljövariabler saknas i .env-filen!"
      echo "WORDPRESS_URL: ${WORDPRESS_URL:-saknas}"
      echo "WORDPRESS_USERNAME: ${WORDPRESS_USERNAME:-saknas}"
      echo "WORDPRESS_APP_PASSWORD: ${WORDPRESS_APP_PASSWORD:-saknas (längd: ${#WORDPRESS_APP_PASSWORD})}"
      
      # Visa innehållet i .env-filen (utan att visa lösenord)
      log_message "$YELLOW" "📄 Innehåll i .env-filen (utan lösenord):"
      grep -v "PASSWORD" "$ENV_FILE" || echo "Ingen data hittades"
    fi
  else
    log_message "$RED" "❌ .env-filen saknas!"
    exit 1
  fi
  
  # Skapa en temporär Node.js-fil för att testa autentiseringen
  cat > /tmp/test-wordpress-auth.js << EOL
const https = require('https');
const { URL } = require('url');

// Logga alla miljövariabler för felsökning
console.log('=== WordPress Credentials Debug ===');
console.log("WORDPRESS_URL: " + (process.env.WORDPRESS_URL || 'saknas'));
console.log("WORDPRESS_USERNAME: " + (process.env.WORDPRESS_USERNAME || 'saknas'));
console.log("WORDPRESS_APP_PASSWORD: " + (process.env.WORDPRESS_APP_PASSWORD ? 'finns (längd: ' + process.env.WORDPRESS_APP_PASSWORD.length + ')' : 'saknas'));

if (process.env.WORDPRESS_URL && process.env.WORDPRESS_USERNAME && process.env.WORDPRESS_APP_PASSWORD) {
  // Skapa Basic Auth header
  const credentials = Buffer.from(process.env.WORDPRESS_USERNAME + ':' + process.env.WORDPRESS_APP_PASSWORD).toString('base64');
  console.log("Basic Auth header: Basic " + credentials);
  
  // Visa första 4 tecknen av lösenordet för att verifiera att det är korrekt
  console.log("App-lösenord första 4 tecken: " + process.env.WORDPRESS_APP_PASSWORD.substring(0, 4) + "...");
  
  // Gör en testförfrågan till WordPress API
  const options = {
    hostname: new URL(process.env.WORDPRESS_URL).hostname,
    path: '/wp-json/wp/v2/posts?per_page=1',
    method: 'GET',
    headers: {
      'Authorization': 'Basic ' + credentials
    }
  };
  
  const req = https.request(options, (res) => {
    console.log("Status: " + res.statusCode);
    console.log("Headers: " + JSON.stringify(res.headers));
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('Autentisering lyckades!');
        try {
          const posts = JSON.parse(data);
          console.log("Antal inlägg: " + posts.length);
          if (posts.length > 0) {
            console.log("Första inläggets titel: " + posts[0].title.rendered);
          }
        } catch (e) {
          console.error('Kunde inte tolka svaret som JSON:', e);
          console.log('Rådata:', data.substring(0, 200) + '...');
        }
      } else {
        console.error('Autentisering misslyckades!');
        console.error("Felmeddelande: " + data);
      }
    });
  });
  
  req.on('error', (e) => {
    console.error("Problem med förfrågan: " + e.message);
  });
  
  req.end();
} else {
  console.error('Saknar nödvändiga miljövariabler för WordPress-autentisering');
}
EOL
  
  # Kör testfilen med miljövariabler direkt från bash
  WORDPRESS_URL="$WORDPRESS_URL" WORDPRESS_USERNAME="$WORDPRESS_USERNAME" WORDPRESS_APP_PASSWORD="$WORDPRESS_APP_PASSWORD" node /tmp/test-wordpress-auth.js
}

# Huvudfunktion
main() {
  log_message "$GREEN" "🚀 Startar deployment av Flowlearn..."
  
  # Uppdatera koden
  update_code
  
  # Uppdatera .env-filen
  update_env_file
  
  # Installera beroenden
  install_dependencies
  
  # Bygga projektet
  build_project
  
  # Uppdatera systemd-tjänsten
  update_systemd_service
  
  # Starta om tjänsten
  restart_service
  
  # Testa WordPress-autentisering
  test_wordpress_auth
  
  log_message "$GREEN" "✅ Deployment slutförd!"
}

# Kör huvudfunktionen
main
