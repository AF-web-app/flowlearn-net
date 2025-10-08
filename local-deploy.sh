#!/bin/bash
# local-deploy.sh - Ett skript för lokal deployment och utveckling av Flowlearn
# Detta skript körs lokalt för att bygga och testa webbplatsen

# Färgkoder för tydligare output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Konfigurera sökvägar (lokala)
REPO_DIR="$(pwd)"
ENV_FILE="$REPO_DIR/.env"
DIST_DIR="$REPO_DIR/dist"
NODE_MODULES_DIR="$REPO_DIR/node_modules"

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

# Funktion för att kontrollera Node.js och npm
check_prerequisites() {
  log_message "$YELLOW" "🔍 Kontrollerar förutsättningar..."
  
  # Kontrollera Node.js
  if ! command -v node &> /dev/null; then
    log_message "$RED" "❌ Node.js är inte installerat!"
    log_message "$YELLOW" "Installera Node.js från https://nodejs.org/"
    exit 1
  fi
  
  # Kontrollera npm
  if ! command -v npm &> /dev/null; then
    log_message "$RED" "❌ npm är inte installerat!"
    exit 1
  fi
  
  log_message "$GREEN" "✅ Node.js $(node --version) och npm $(npm --version) är installerade"
}

# Funktion för att rensa tidigare builds
clean_build() {
  log_message "$YELLOW" "🧹 Rensar tidigare builds..."
  
  if [ -d "$DIST_DIR" ]; then
    rm -rf "$DIST_DIR"
    check_success "Rensa dist-mapp"
  fi
  
  # Rensa npm cache om det behövs
  if [ "$1" = "--deep-clean" ]; then
    log_message "$YELLOW" "🧹 Djuprengöring - rensar node_modules..."
    if [ -d "$NODE_MODULES_DIR" ]; then
      rm -rf "$NODE_MODULES_DIR"
      check_success "Rensa node_modules"
    fi
    npm cache clean --force
    check_success "Rensa npm cache"
  fi
}

# Funktion för att installera beroenden
install_dependencies() {
  log_message "$YELLOW" "📦 Installerar beroenden..."
  
  # Använd npm ci för reproducerbara builds om package-lock.json finns
  if [ -f "package-lock.json" ]; then
    npm ci
  else
    npm install
  fi
  check_success "Installera beroenden"
}

# Funktion för att skapa eller uppdatera .env-filen för lokal utveckling
setup_env_file() {
  log_message "$YELLOW" "🔑 Konfigurerar miljövariabler..."
  
  # Skapa .env-fil om den inte finns
  if [ ! -f "$ENV_FILE" ]; then
    log_message "$YELLOW" "📝 Skapar ny .env-fil för lokal utveckling..."
    cat > "$ENV_FILE" << EOL
# Lokala miljövariabler för Flowlearn
NODE_ENV=development

# Web3Forms (för kontaktformulär)
PUBLIC_WEB3FORMS_ACCESS_KEY=your_web3forms_key_here

# WordPress API (valfritt för lokal utveckling)
WORDPRESS_URL=https://flowlearn.se
WORDPRESS_USERNAME=your_username
WORDPRESS_APP_PASSWORD=your_app_password

# Lokal utvecklingsserver
HOST=localhost
PORT=4321
EOL
    check_success "Skapa .env-fil"
    log_message "$BLUE" "📝 Redigera .env-filen och lägg till dina API-nycklar"
  else
    log_message "$GREEN" "✅ .env-fil finns redan"
  fi
}

# Funktion för att bygga projektet
build_project() {
  log_message "$YELLOW" "🏗️ Bygger projektet..."
  npm run build
  check_success "Bygga projektet"
  
  # Kontrollera att build-mappen skapades
  if [ -d "$DIST_DIR" ]; then
    log_message "$GREEN" "✅ Build-mapp skapad: $DIST_DIR"
  else
    log_message "$RED" "❌ Build-mapp saknas!"
    exit 1
  fi
}

# Funktion för att starta utvecklingsserver
start_dev_server() {
  log_message "$YELLOW" "🚀 Startar utvecklingsserver..."
  log_message "$BLUE" "🌐 Webbplatsen kommer att vara tillgänglig på http://localhost:4321"
  log_message "$BLUE" "⏹️  Tryck Ctrl+C för att stoppa servern"
  
  npm run dev
}

# Funktion för att förhandsgranska produktionsbygget
preview_build() {
  log_message "$YELLOW" "👀 Startar förhandsgranskning av produktionsbygget..."
  log_message "$BLUE" "🌐 Förhandsgranskning tillgänglig på http://localhost:4321"
  log_message "$BLUE" "⏹️  Tryck Ctrl+C för att stoppa servern"
  
  npm run preview
}

# Funktion för att köra linting och tester
run_quality_checks() {
  log_message "$YELLOW" "🔍 Kör kvalitetskontroller..."
  
  # Kör ESLint om det finns
  if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ]; then
    log_message "$YELLOW" "🔍 Kör ESLint..."
    npm run lint 2>/dev/null || log_message "$YELLOW" "⚠️  ESLint inte konfigurerat"
  fi
  
  # Kör Prettier om det finns
  if [ -f ".prettierrc" ] || [ -f "prettier.config.js" ]; then
    log_message "$YELLOW" "💅 Kontrollerar kodformatering..."
    npm run format:check 2>/dev/null || log_message "$YELLOW" "⚠️  Prettier inte konfigurerat"
  fi
  
  # Kör TypeScript-kontroll om det finns
  if [ -f "tsconfig.json" ]; then
    log_message "$YELLOW" "📝 Kontrollerar TypeScript..."
    npx tsc --noEmit 2>/dev/null || log_message "$YELLOW" "⚠️  TypeScript-kontroll misslyckades"
  fi
}

# Funktion för att visa hjälp
show_help() {
  echo -e "${BLUE}Flowlearn Local Deploy Script${NC}"
  echo ""
  echo "Användning: $0 [ALTERNATIV]"
  echo ""
  echo "Alternativ:"
  echo "  build           Bygg projektet för produktion"
  echo "  dev             Starta utvecklingsserver"
  echo "  preview         Förhandsgranska produktionsbygget"
  echo "  clean           Rensa tidigare builds"
  echo "  deep-clean      Djuprengöring (inkl. node_modules)"
  echo "  check           Kör kvalitetskontroller"
  echo "  setup           Installera beroenden och konfigurera miljö"
  echo "  full            Fullständig build-process"
  echo "  help            Visa denna hjälp"
  echo ""
  echo "Exempel:"
  echo "  $0 setup        # Första gången du kör skriptet"
  echo "  $0 dev          # Starta utvecklingsserver"
  echo "  $0 build        # Bygg för produktion"
  echo "  $0 full         # Komplett build-process"
}

# Huvudfunktion för fullständig deployment
full_deployment() {
  log_message "$GREEN" "🚀 Startar fullständig lokal deployment av Flowlearn..."
  
  check_prerequisites
  clean_build
  setup_env_file
  install_dependencies
  run_quality_checks
  build_project
  
  log_message "$GREEN" "✅ Fullständig deployment slutförd!"
  log_message "$BLUE" "🎯 Nästa steg:"
  log_message "$BLUE" "   • Kör '$0 preview' för att förhandsgranska"
  log_message "$BLUE" "   • Kör '$0 dev' för utvecklingsserver"
}

# Hantera kommandoradsargument
case "${1:-full}" in
  "build")
    check_prerequisites
    build_project
    ;;
  "dev")
    check_prerequisites
    setup_env_file
    install_dependencies
    start_dev_server
    ;;
  "preview")
    check_prerequisites
    if [ ! -d "$DIST_DIR" ]; then
      log_message "$YELLOW" "⚠️  Ingen build hittades, bygger först..."
      build_project
    fi
    preview_build
    ;;
  "clean")
    clean_build
    ;;
  "deep-clean")
    clean_build --deep-clean
    ;;
  "check")
    check_prerequisites
    run_quality_checks
    ;;
  "setup")
    check_prerequisites
    setup_env_file
    install_dependencies
    log_message "$GREEN" "✅ Setup slutförd! Kör '$0 dev' för att starta utvecklingsserver"
    ;;
  "full")
    full_deployment
    ;;
  "help"|"-h"|"--help")
    show_help
    ;;
  *)
    log_message "$RED" "❌ Okänt kommando: $1"
    show_help
    exit 1
    ;;
esac
