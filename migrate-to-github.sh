#!/bin/bash
# =============================================================================
# GetOdoo v5 Beta — GitHub Migration Script
# Mac user: luminlabs | GitHub: imyourunclebuck
# =============================================================================
# USAGE:
#   1. Unzip "GetOdoo-v5-Beta (current).zip" — it creates a folder called
#      GetOdoo-v5-Beta inside your Downloads folder (or wherever you saved it)
#   2. Place THIS script inside that folder
#   3. Open Terminal and run:
#        cd /Users/luminlabs/Downloads/GetOdoo-v5-Beta
#        bash migrate-to-github.sh
# =============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

GITHUB_USER="imyourunclebuck"
MAC_USER="luminlabs"
REPO_NAME="getodoo-v5-beta"
EXPECTED_PATH="/Users/$MAC_USER"

echo ""
echo -e "${CYAN}=================================================${NC}"
echo -e "${CYAN}  GetOdoo v5 Beta — GitHub Migration Script${NC}"
echo -e "${CYAN}  GitHub: @${GITHUB_USER}${NC}"
echo -e "${CYAN}=================================================${NC}"
echo ""

# -----------------------------------------------------------------------------
# STEP 1: Confirm we're in the right directory
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[1/7] Checking project directory...${NC}"

if [ ! -f "package.json" ]; then
  echo -e "${RED}ERROR: package.json not found.${NC}"
  echo ""
  echo "  Make sure you are running this script from INSIDE the project folder."
  echo "  Try this in Terminal:"
  echo ""
  echo -e "  ${CYAN}cd /Users/luminlabs/Downloads/GetOdoo-v5-Beta${NC}"
  echo -e "  ${CYAN}bash migrate-to-github.sh${NC}"
  echo ""
  exit 1
fi

echo -e "  ${GREEN}Project folder confirmed.${NC}"
echo -e "  Working directory: $(pwd)"

# -----------------------------------------------------------------------------
# STEP 2: Remove Replit-specific files
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[2/7] Removing Replit-specific files...${NC}"

REMOVED=()
remove_if_exists() {
  if [ -e "$1" ]; then
    rm -rf "$1"
    REMOVED+=("$1")
    echo -e "  ${GREEN}Removed:${NC} $1"
  fi
}

remove_if_exists ".local"
remove_if_exists "skills-lock.json"
remove_if_exists ".replit"
remove_if_exists "replit.nix"
remove_if_exists "generated-icon.png"
remove_if_exists ".config"
remove_if_exists ".upm"
remove_if_exists ".cache"

if [ ${#REMOVED[@]} -eq 0 ]; then
  echo "  (Nothing to remove — already clean)"
else
  echo -e "  ${GREEN}Cleaned ${#REMOVED[@]} Replit-specific item(s).${NC}"
fi

# -----------------------------------------------------------------------------
# STEP 3: Create .gitignore
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[3/7] Creating .gitignore...${NC}"

cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Build outputs
dist/
dist-ssr/
build/

# Environment variables — NEVER commit these
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

# macOS
.DS_Store
.AppleDouble
.LSOverride

# Editor (VS Code)
.vscode/
*.swp
*.swo

# Replit-specific
.replit
replit.nix
.config/
.upm/
.cache/
.local/
skills-lock.json
generated-icon.png

# TypeScript cache
*.tsbuildinfo
EOF

echo -e "  ${GREEN}Created .gitignore${NC}"

# -----------------------------------------------------------------------------
# STEP 4: Create .env.example
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[4/7] Creating .env.example...${NC}"

if [ -f ".env" ]; then
  echo "  .env already exists — skipping to protect your secrets."
else
  cat > .env.example << 'EOF'
# -------------------------------------------------------
# Copy this file to .env and fill in your real values:
#   cp .env.example .env
# NEVER commit .env to GitHub
# -------------------------------------------------------

# PostgreSQL — your database connection string
DATABASE_URL=postgresql://user:password@host:5432/dbname

# OpenAI API — get your key at https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...your-key-here...
OPENAI_BASE_URL=https://api.openai.com/v1

# Session secret — any long random string
SESSION_SECRET=replace-with-a-long-random-string

# Server
PORT=5000
NODE_ENV=development
EOF
  echo -e "  ${GREEN}Created .env.example${NC}"
  echo -e "  ${YELLOW}Action needed:${NC} Run 'cp .env.example .env' and fill in your secrets."
fi

# -----------------------------------------------------------------------------
# STEP 5: Initialize git
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[5/7] Initializing git repository...${NC}"

if [ -d ".git" ]; then
  echo "  Git repo already exists — skipping init."
else
  git init
  git branch -M main
  echo -e "  ${GREEN}Git initialized on branch 'main'${NC}"
fi

# Set git identity if not already configured
GIT_NAME=$(git config --global user.name 2>/dev/null || echo "")
GIT_EMAIL=$(git config --global user.email 2>/dev/null || echo "")

if [ -z "$GIT_NAME" ]; then
  git config --global user.name "$GITHUB_USER"
  echo -e "  ${GREEN}Set git user.name to: $GITHUB_USER${NC}"
fi

if [ -z "$GIT_EMAIL" ]; then
  echo -e "  ${YELLOW}Note:${NC} No git email configured."
  echo "  You can set it with:"
  echo "    git config --global user.email \"your@email.com\""
fi

# -----------------------------------------------------------------------------
# STEP 6: First commit
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[6/7] Staging files and creating first commit...${NC}"

git add .

if git diff --cached --quiet; then
  echo "  Nothing new to commit — working tree is clean."
else
  git commit -m "Initial commit: GetOdoo v5 Beta — Lumin Laboratories"
  echo -e "  ${GREEN}First commit created successfully.${NC}"
fi

# -----------------------------------------------------------------------------
# STEP 7: Connect to GitHub and push
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[7/7] Connecting to GitHub...${NC}"
echo ""
echo -e "  Your GitHub repo URL will be:"
echo -e "  ${CYAN}https://github.com/$GITHUB_USER/$REPO_NAME${NC}"
echo ""
echo -e "  ${BOLD}First, create the repo on GitHub:${NC}"
echo -e "  ${CYAN}https://github.com/new${NC}"
echo "  → Repository name: $REPO_NAME"
echo "  → Set to Private (recommended for now)"
echo "  → Do NOT initialize with README, .gitignore, or license"
echo ""

read -p "  Have you created the repo on GitHub? Push now? (y/n): " PUSH_NOW

if [[ "$PUSH_NOW" =~ ^[Yy]$ ]]; then
  REMOTE_URL="https://github.com/$GITHUB_USER/$REPO_NAME.git"

  git remote remove origin 2>/dev/null || true
  git remote add origin "$REMOTE_URL"

  echo ""
  echo -e "  Pushing to: ${CYAN}$REMOTE_URL${NC}"
  echo "  (You may be prompted for your GitHub password or Personal Access Token)"
  echo ""

  git push -u origin main

  echo ""
  echo -e "  ${GREEN}Successfully pushed to GitHub!${NC}"
  echo -e "  View your repo: ${CYAN}https://github.com/$GITHUB_USER/$REPO_NAME${NC}"
else
  echo ""
  echo -e "  ${YELLOW}Skipped push. When ready, run:${NC}"
  echo "    git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git"
  echo "    git push -u origin main"
fi

# -----------------------------------------------------------------------------
# DONE
# -----------------------------------------------------------------------------
echo ""
echo -e "${CYAN}=================================================${NC}"
echo -e "${GREEN}  Migration complete!${NC}"
echo -e "${CYAN}=================================================${NC}"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo ""
echo "  1. Fill in your environment variables:"
echo "     cp .env.example .env"
echo "     open -a 'Visual Studio Code' .env"
echo ""
echo "  2. Install dependencies:"
echo "     npm install"
echo ""
echo "  3. Push database schema (needs DATABASE_URL in .env):"
echo "     npm run db:push"
echo ""
echo "  4. Start the dev server:"
echo "     npm run dev"
echo "     → Open http://localhost:5000"
echo ""
echo "  5. Open the project in VS Code anytime:"
echo "     code ."
echo ""
echo -e "  ${YELLOW}GitHub Desktop tip:${NC}"
echo "  Open GitHub Desktop → File → Add Local Repository"
echo "  → Select this folder to manage future commits visually."
echo ""
echo -e "  ${YELLOW}Reminder:${NC} Replace Replit's OpenAI proxy vars in .env with:"
echo "  OPENAI_API_KEY=sk-...  and  OPENAI_BASE_URL=https://api.openai.com/v1"
echo ""
