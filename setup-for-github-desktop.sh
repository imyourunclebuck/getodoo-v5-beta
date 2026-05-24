#!/bin/bash
# =============================================================================
# GetOdoo v5 Beta — GitHub Desktop Setup Script
# Copies project into /Users/luminlabs/Github/getodoo-v5-beta
# and prepares it for GitHub Desktop to push to @imyourunclebuck
# =============================================================================
# HOW TO USE:
#   1. Unzip "GetOdoo-v5-Beta (current).zip" anywhere (e.g. Downloads)
#   2. Drop THIS script into the unzipped GetOdoo-v5-Beta folder
#   3. Open Terminal and run:
#        cd /Users/luminlabs/Downloads/GetOdoo-v5-Beta
#        bash setup-for-github-desktop.sh
#   4. Open GitHub Desktop → File → Add Local Repository
#      → Select: /Users/luminlabs/Github/getodoo-v5-beta
#   5. Click "Publish repository" in GitHub Desktop to push to @imyourunclebuck
# =============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

GITHUB_USER="imyourunclebuck"
MAC_USER="luminlabs"
REPO_NAME="getodoo-v5-beta"
DEST="/Users/$MAC_USER/Github/$REPO_NAME"
SOURCE="$(pwd)"

echo ""
echo -e "${CYAN}=================================================${NC}"
echo -e "${CYAN}  GetOdoo v5 Beta — GitHub Desktop Setup${NC}"
echo -e "${CYAN}  Destination: $DEST${NC}"
echo -e "${CYAN}=================================================${NC}"
echo ""

# -----------------------------------------------------------------------------
# STEP 1: Confirm source is correct
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[1/6] Checking source folder...${NC}"

if [ ! -f "package.json" ]; then
  echo -e "${RED}ERROR: package.json not found in current folder.${NC}"
  echo ""
  echo "  Make sure you run this script from INSIDE the GetOdoo-v5-Beta folder:"
  echo ""
  echo -e "  ${CYAN}cd /Users/luminlabs/Downloads/GetOdoo-v5-Beta${NC}"
  echo -e "  ${CYAN}bash setup-for-github-desktop.sh${NC}"
  exit 1
fi

echo -e "  ${GREEN}Source confirmed:${NC} $SOURCE"

# -----------------------------------------------------------------------------
# STEP 2: Create destination folder in ~/Github/
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[2/6] Creating destination folder...${NC}"

mkdir -p "$DEST"
echo -e "  ${GREEN}Created:${NC} $DEST"

# -----------------------------------------------------------------------------
# STEP 3: Copy project files (excluding Replit junk and node_modules)
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[3/6] Copying project files (excluding Replit artifacts)...${NC}"

rsync -a \
  --exclude='.local' \
  --exclude='.replit' \
  --exclude='replit.nix' \
  --exclude='skills-lock.json' \
  --exclude='generated-icon.png' \
  --exclude='.config' \
  --exclude='.upm' \
  --exclude='.cache' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  "$SOURCE/" "$DEST/"

echo -e "  ${GREEN}Files copied to $DEST${NC}"

# -----------------------------------------------------------------------------
# STEP 4: Create .gitignore
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[4/6] Creating .gitignore...${NC}"

cat > "$DEST/.gitignore" << 'EOF'
# Dependencies
node_modules/

# Build outputs
dist/
dist-ssr/
build/

# Environment variables — NEVER commit
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*

# macOS
.DS_Store

# VS Code
.vscode/

# Replit-specific
.replit
replit.nix
.config/
.upm/
.cache/
.local/
skills-lock.json
generated-icon.png

# TypeScript
*.tsbuildinfo
EOF

echo -e "  ${GREEN}Created .gitignore${NC}"

# -----------------------------------------------------------------------------
# STEP 5: Create .env.example
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[5/6] Creating .env.example...${NC}"

cat > "$DEST/.env.example" << 'EOF'
# Copy this to .env and fill in your values — never commit .env
# cp .env.example .env

# PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/dbname

# OpenAI (your own key from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-...your-key-here...
OPENAI_BASE_URL=https://api.openai.com/v1

# Session secret
SESSION_SECRET=replace-with-a-long-random-string

# Server
PORT=5000
NODE_ENV=development
EOF

echo -e "  ${GREEN}Created .env.example${NC}"

# -----------------------------------------------------------------------------
# STEP 6: Initialize git repo for GitHub Desktop
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[6/6] Initializing git repository...${NC}"

cd "$DEST"

git init
git branch -M main
git config user.name "$GITHUB_USER"
git add .
git commit -m "Initial commit: GetOdoo v5 Beta — Lumin Laboratories"

echo -e "  ${GREEN}Git repo initialized and first commit made.${NC}"

# -----------------------------------------------------------------------------
# DONE — GitHub Desktop instructions
# -----------------------------------------------------------------------------
echo ""
echo -e "${CYAN}=================================================${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${CYAN}=================================================${NC}"
echo ""
echo -e "  ${YELLOW}Now open GitHub Desktop and do the following:${NC}"
echo ""
echo "  1. Open GitHub Desktop"
echo "  2. Click:  File → Add Local Repository"
echo -e "  3. Select this folder: ${CYAN}$DEST${NC}"
echo "  4. Click 'Add Repository'"
echo "  5. Click 'Publish repository' (top bar)"
echo "     → Name: $REPO_NAME"
echo "     → Account: $GITHUB_USER"
echo "     → Keep it Private (recommended)"
echo "     → Uncheck 'Initialize this repository with a README'"
echo "  6. Click 'Publish Repository' — done!"
echo ""
echo -e "  ${YELLOW}After publishing, open the project in VS Code:${NC}"
echo "  → In GitHub Desktop: Repository → Open in Visual Studio Code"
echo ""
echo -e "  ${YELLOW}Then set up your environment:${NC}"
echo "  cd $DEST"
echo "  cp .env.example .env"
echo "  npm install"
echo "  npm run db:push   # once DATABASE_URL is set in .env"
echo "  npm run dev       # starts at http://localhost:5000"
echo ""
