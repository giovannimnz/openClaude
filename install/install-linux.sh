#!/bin/bash
# openClaude Installer for Linux (Ubuntu/Debian)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
INSTALL_PATH="$HOME/openClaude"
BRANCH="main"
USE_BUN=true

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --path)
            INSTALL_PATH="$2"
            shift 2
            ;;
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        --no-bun)
            USE_BUN=false
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --path <path>     Installation directory (default: ~/openClaude)"
            echo "  --branch <branch> Git branch to clone (default: main)"
            echo "  --no-bun          Don't use Bun, use npm instead"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Print header
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        openClaude Installer for Linux (Ubuntu/Debian)     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${GREEN}🔍 Checking prerequisites...${NC}"

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${RED}❌ This script is for Linux only${NC}"
    echo -e "${YELLOW}   Use install-mac.sh for macOS or install-windows.ps1 for Windows${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Running on Linux${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo -e "${YELLOW}   Please install Node.js:${NC}"
    echo -e "${YELLOW}   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -${NC}"
    echo -e "${YELLOW}   sudo apt-get install -y nodejs${NC}"
    echo -e "${YELLOW}   Required: Node.js 18.0 or higher${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js found: $NODE_VERSION${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm found: $NPM_VERSION${NC}"

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git not found${NC}"
    echo -e "${YELLOW}   Please install Git: sudo apt-get install git${NC}"
    exit 1
fi
GIT_VERSION=$(git --version)
echo -e "${GREEN}✅ Git found: $GIT_VERSION${NC}"

# Check Bun (optional but recommended)
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    echo -e "${GREEN}✅ Bun found: $BUN_VERSION (recommended for faster builds)${NC}"
else
    echo -e "${YELLOW}⚠️  Bun not found. Will use npm instead (slower builds)${NC}"
    echo -e "${YELLOW}   Install Bun for faster builds: curl -fsSL https://bun.sh/install | bash${NC}"
    USE_BUN=false
fi

echo ""

# Create installation directory
echo -e "${GREEN}📁 Creating installation directory...${NC}"
if [ -d "$INSTALL_PATH" ]; then
    echo -e "${YELLOW}⚠️  Directory already exists: $INSTALL_PATH${NC}"
    read -p "Do you want to continue? (Y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Installation cancelled${NC}"
        exit 1
    fi
else
    mkdir -p "$INSTALL_PATH"
    echo -e "${GREEN}✅ Created: $INSTALL_PATH${NC}"
fi

echo ""

# Clone repository
echo -e "${GREEN}📥 Cloning openClaude repository...${NC}"
REPO_URL="https://github.com/giovannimnz/openClaude.git"

if [ -d "$INSTALL_PATH/.git" ]; then
    echo -e "${YELLOW}⚠️  Repository already exists. Pulling latest changes...${NC}"
    cd "$INSTALL_PATH"
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
else
    git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_PATH"
    cd "$INSTALL_PATH"
fi
echo -e "${GREEN}✅ Repository cloned/updated successfully${NC}"

echo ""

# Install dependencies
echo -e "${GREEN}📦 Installing dependencies...${NC}"
if [ "$USE_BUN" = true ]; then
    echo -e "${CYAN}Using Bun for faster installation...${NC}"
    bun install
else
    echo -e "${CYAN}Using npm for installation...${NC}"
    npm install
fi
echo -e "${GREEN}✅ Dependencies installed successfully${NC}"

echo ""

# Build the project
echo -e "${GREEN}🔨 Building openClaude...${NC}"
if [ "$USE_BUN" = true ]; then
    bun run build
else
    npm run build
fi
echo -e "${GREEN}✅ Build completed successfully${NC}"

echo ""

# Create symbolic link for global command
echo -e "${GREEN}🔗 Setting up global command...${NC}"
BIN_PATH="$INSTALL_PATH/dist/cli.mjs"
LINK_PATH="/usr/local/bin/openclaude"

if [ -w "/usr/local/bin" ]; then
    if [ -L "$LINK_PATH" ]; then
        echo -e "${YELLOW}⚠️  Symbolic link already exists. Updating...${NC}"
        rm "$LINK_PATH"
    fi
    ln -s "$BIN_PATH" "$LINK_PATH"
    chmod +x "$LINK_PATH"
    echo -e "${GREEN}✅ Global command created: openclaude${NC}"
else
    echo -e "${YELLOW}⚠️  Cannot create global link (requires sudo)${NC}"
    echo -e "${YELLOW}   To create manually: sudo ln -s $BIN_PATH $LINK_PATH${NC}"
fi

# Create desktop shortcut (optional)
DESKTOP_PATH="$HOME/.local/share/applications/openclaude.desktop"
if [ -d "$HOME/.local/share/applications" ]; then
    echo -e "${GREEN}📱 Creating desktop shortcut...${NC}"
    cat > "$DESKTOP_PATH" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=openClaude
Comment=Claude Code opened to any LLM
Exec=node $INSTALL_PATH/dist/cli.mjs
Icon=terminal
Terminal=true
Categories=Development;IDE;
EOF
    chmod +x "$DESKTOP_PATH"
    echo -e "${GREEN}✅ Desktop shortcut created${NC}"
    echo -e "${YELLOW}   Find it in: Applications menu${NC}"
fi

echo ""

# Setup environment variables
echo -e "${GREEN}⚙️  Setting up environment...${NC}"
SHELL_CONFIG="$HOME/.bashrc"
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
fi

# Check if PATH already includes openClaude
if ! grep -q "openClaude" "$SHELL_CONFIG" 2>/dev/null; then
    echo -e "${CYAN}Adding openClaude to PATH in $SHELL_CONFIG${NC}"
    echo "" >> "$SHELL_CONFIG"
    echo "# openClaude" >> "$SHELL_CONFIG"
    echo "export PATH=\"\$PATH:$INSTALL_PATH\"" >> "$SHELL_CONFIG"
    echo -e "${GREEN}✅ PATH updated${NC}"
    echo -e "${YELLOW}   Run 'source $SHELL_CONFIG' to apply changes${NC}"
else
    echo -e "${GREEN}✅ openClaude already in PATH${NC}"
fi

echo ""

# Create update script
echo -e "${GREEN}📝 Creating update script...${NC}"
UPDATE_SCRIPT="$INSTALL_PATH/update.sh"
cat > "$UPDATE_SCRIPT" << 'EOF'
#!/bin/bash
# openClaude Update Script

set -e

INSTALL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANCH="main"

echo "🔄 Updating openClaude..."
cd "$INSTALL_PATH"

# Fetch latest changes
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# Install dependencies
if command -v bun &> /dev/null; then
    bun install
else
    npm install
fi

# Build
if command -v bun &> /dev/null; then
    bun run build
else
    npm run build
fi

echo "✅ openClaude updated successfully!"
EOF
chmod +x "$UPDATE_SCRIPT"
echo -e "${GREEN}✅ Update script created: $UPDATE_SCRIPT${NC}"

echo ""

# Display installation summary
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              Installation Summary                         ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Installation completed successfully!${NC}"
echo ""
echo -e "${CYAN}📍 Installation Path:${NC}"
echo -e "${YELLOW}   $INSTALL_PATH${NC}"
echo ""
echo -e "${CYAN}🚀 To run openClaude:${NC}"
echo -e "${YELLOW}   cd $INSTALL_PATH${NC}"
echo -e "${YELLOW}   node dist/cli.mjs${NC}"
if [ -L "$LINK_PATH" ]; then
    echo -e "${YELLOW}   or simply: openclaude${NC}"
fi
echo ""
echo -e "${CYAN}🔄 To update openClaude:${NC}"
echo -e "${YELLOW}   $INSTALL_PATH/update.sh${NC}"
echo ""
echo -e "${CYAN}📚 Documentation:${NC}"
echo -e "${YELLOW}   https://github.com/giovannimnz/openClaude${NC}"
echo ""
echo -e "${CYAN}🔧 Next Steps:${NC}"
echo -e "${YELLOW}   1. Configure your LLM provider: node dist/cli.mjs /provider${NC}"
echo -e "${YELLOW}   2. Set up authentication: node dist/cli.mjs /auth login${NC}"
echo -e "${YELLOW}   3. Start using: node dist/cli.mjs${NC}"
echo ""
echo -e "${GREEN}🎉 Happy coding with openClaude!${NC}"
echo ""

# Offer to open openClaude
read -p "Do you want to start openClaude now? (Y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${CYAN}🚀 Starting openClaude...${NC}"
    cd "$INSTALL_PATH"
    node dist/cli.mjs
fi