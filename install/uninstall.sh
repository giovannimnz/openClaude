#!/bin/bash
# openClaude Uninstaller for macOS and Linux

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default installation path
INSTALL_PATH="$HOME/openClaude"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --path)
            INSTALL_PATH="$2"
            shift 2
            ;;
        --all)
            REMOVE_ALL=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --path <path>     Installation directory (default: ~/openClaude)"
            echo "  --all             Remove all openClaude files including config"
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
echo -e "${CYAN}║              openClaude Uninstaller                      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if openClaude is installed
if [ ! -d "$INSTALL_PATH" ]; then
    echo -e "${RED}❌ openClaude not found at: $INSTALL_PATH${NC}"
    echo -e "${YELLOW}   Use --path to specify a different installation path${NC}"
    exit 1
fi

# Show what will be removed
echo -e "${YELLOW}⚠️  This will remove openClaude from: $INSTALL_PATH${NC}"
if [ "$REMOVE_ALL" = true ]; then
    echo -e "${RED}   --all flag: Will also remove configuration files${NC}"
fi
echo ""

read -p "Are you sure you want to continue? (Y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Uninstallation cancelled${NC}"
    exit 0
fi

echo ""

# Remove symbolic links
echo -e "${GREEN}🔗 Removing symbolic links...${NC}"
LINK_PATH="/usr/local/bin/openclaude"
if [ -L "$LINK_PATH" ]; then
    if [ -w "/usr/local/bin" ]; then
        rm "$LINK_PATH"
        echo -e "${GREEN}✅ Removed: $LINK_PATH${NC}"
    else
        echo -e "${YELLOW}⚠️  Cannot remove $LINK_PATH (requires sudo)${NC}"
        echo -e "${YELLOW}   Run: sudo rm $LINK_PATH${NC}"
    fi
fi

# Remove desktop shortcut
echo -e "${GREEN}📱 Removing desktop shortcuts...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    APP_PATH="$HOME/Applications/openClaude.app"
    if [ -d "$APP_PATH" ]; then
        rm -rf "$APP_PATH"
        echo -e "${GREEN}✅ Removed: $APP_PATH${NC}"
    fi
else
    DESKTOP_PATH="$HOME/.local/share/applications/openclaude.desktop"
    if [ -f "$DESKTOP_PATH" ]; then
        rm "$DESKTOP_PATH"
        echo -e "${GREEN}✅ Removed: $DESKTOP_PATH${NC}"
    fi
fi

# Remove from shell configuration
echo -e "${GREEN}⚙️  Cleaning shell configuration...${NC}"
SHELL_CONFIG="$HOME/.bashrc"
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    SHELL_CONFIG="$HOME/.zshrc"
fi

if [ -f "$SHELL_CONFIG" ]; then
    if grep -q "openClaude" "$SHELL_CONFIG"; then
        echo -e "${CYAN}Removing openClaude from $SHELL_CONFIG${NC}"
        # Create backup
        cp "$SHELL_CONFIG" "$SHELL_CONFIG.backup"
        # Remove openClaude entries
        sed -i.bak '/# openClaude/,+1d' "$SHELL_CONFIG" 2>/dev/null || true
        echo -e "${GREEN}✅ Cleaned $SHELL_CONFIG${NC}"
        echo -e "${YELLOW}   Backup saved: $SHELL_CONFIG.backup${NC}"
    fi
fi

# Remove configuration files if --all flag is set
if [ "$REMOVE_ALL" = true ]; then
    echo -e "${GREEN}🗑️  Removing configuration files...${NC}"
    
    # Remove openClaude config directories
    CONFIG_DIRS=(
        "$HOME/.openclaude"
        "$HOME/.claude"
    )
    
    for config_dir in "${CONFIG_DIRS[@]}"; do
        if [ -d "$config_dir" ]; then
            rm -rf "$config_dir"
            echo -e "${GREEN}✅ Removed: $config_dir${NC}"
        fi
    done
    
    # Remove environment variables
    echo -e "${YELLOW}⚠️  Remember to remove any openClaude environment variables from your shell configuration${NC}"
fi

# Remove installation directory
echo -e "${GREEN}📁 Removing installation directory...${NC}"
if [ -d "$INSTALL_PATH" ]; then
    rm -rf "$INSTALL_PATH"
    echo -e "${GREEN}✅ Removed: $INSTALL_PATH${NC}"
fi

echo ""

# Display summary
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              Uninstallation Summary                       ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Uninstallation completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📝 Notes:${NC}"
echo -e "${YELLOW}   1. Restart your terminal to apply shell changes${NC}"
echo -e "${YELLOW}   2. If you used sudo for global links, they may still exist${NC}"
echo -e "${YELLOW}   3. Configuration files preserved (use --all to remove)${NC}"
echo ""
echo -e "${CYAN}🔄 Want to reinstall?${NC}"
echo -e "${YELLOW}   Run: ./install-mac.sh (macOS) or ./install-linux.sh (Linux)${NC}"
echo ""
echo -e "${GREEN}👋 Thanks for using openClaude!${NC}"
echo ""