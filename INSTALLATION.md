# openClaude Installation Guide

This guide explains how to install and maintain openClaude with a clean, self-contained structure.

## Installation Methods

### Method 1: Quick Install (Recommended)

The easiest way to get started with openClaude. The install script automatically detects
and installs missing dependencies (Node.js >= 20, npm, Bun) before setting up the project.

```bash
# Clone the repository
git clone https://github.com/giovannimnz/openClaude.git
cd openClaude

# Run the installation script
./install.sh

# Start using openClaude
node dist/cli.mjs
```

### Method 2: Manual Install

For users who prefer manual control over the installation.

```bash
# Clone the repository
git clone https://github.com/giovannimnz/openClaude.git
cd openClaude

# Install dependencies
bun install

# Build the project
bun run build

# Start using openClaude
node dist/cli.mjs
```

## Installation Structure

openClaude uses a **self-contained installation** that keeps everything organized:

```
openClaude/                    # Repository root (your installation)
├── dist/                     # Built application files
│   └── cli.mjs              # Main executable
├── node_modules/            # Dependencies (local to project)
├── src/                     # Source code
├── bin/                     # Convenience scripts
│   ├── openclaude           # Unix/Linux/Mac script
│   ├── openclaude.bat       # Windows batch script
│   └── openclaude.ps1       # PowerShell script
├── install/                 # Installation scripts
│   ├── install-windows.ps1  # Windows installer
│   ├── install-mac.sh       # Mac installer
│   └── install-linux.sh     # Linux installer
└── QUICKSTART.md            # Quick start guide

~/.claude/                    # User configuration (in home directory)
├── config.json              # Main configuration
├── providers/               # Provider profiles
├── history/                 # Command history
├── profiles/                # User profiles
└── projects/                # Project-specific data
```

## Key Benefits

### ✅ Self-Contained
- All dependencies stay inside the repository
- No global npm packages required
- Easy to move or backup

### ✅ Clean Configuration
- User settings in `~/.claude/`
- Easy to manage and backup
- Separation of code and data

### ✅ Simple Updates
- One command to update everything
- Automatic dependency updates
- Safe rollback if needed

## Usage

### Running openClaude

```bash
# Direct execution
node dist/cli.mjs

# Using convenience scripts (Unix/Linux/Mac)
./bin/openclaude

# Using convenience scripts (Windows)
bin\openclaude.bat

# Using PowerShell script (Windows)
.\bin\openclaude.ps1
```

### Available Scripts

```bash
# Installation
bun run install:setup    # First-time installation (or ./install.sh directly)
./install.sh             # Auto-detects and installs node/npm/bun if needed

# Updates
bun run update           # Update to latest version

# Development
bun run dev             # Run in development mode
bun run build           # Rebuild the project

# Testing
bun run test            # Run tests
bun run test:coverage   # Run tests with coverage
bun run typecheck       # Type check code

# Diagnostics
bun run doctor:runtime  # Check runtime environment
bun run smoke           # Quick smoke test
```

## Updating openClaude

### Automatic Update

The update script handles everything automatically:

```bash
# Update to the latest version
bun run update
```

The update script will:
1. Check git status for uncommitted changes
2. Pull latest changes from the repository
3. Update dependencies
4. Clean old caches
5. Rebuild the project
6. Verify the update

### Manual Update

If you prefer manual updates:

```bash
# Pull latest changes
git pull origin main

# Update dependencies
bun install

# Rebuild the project
bun run build
```

## Configuration

### First-Time Setup

After installation, configure your LLM provider:

```bash
# Interactive provider setup
node dist/cli.mjs /provider

# Set up authentication (if needed)
node dist/cli.mjs /auth login

# Start using openClaude
node dist/cli.mjs
```

### Configuration Files

Your configuration is stored in `~/.claude/`:

- **`config.json`** - Main settings (theme, auto-update, etc.)
- **`providers/`** - Provider profiles (API keys, endpoints, etc.)
- **`history/`** - Command history
- **`profiles/`** - User-defined profiles
- **`projects/`** - Project-specific data

### Example Configuration

```json
{
  "version": "1.0.0",
  "theme": "dark",
  "autoUpdate": true,
  "telemetry": false,
  "providers": {
    "openai": {
      "apiKey": "sk-...",
      "baseUrl": "https://api.openai.com/v1"
    }
  },
  "profiles": {
    "default": {
      "provider": "openai",
      "model": "gpt-4"
    }
  }
}
```

## Troubleshooting

### Installation Issues

**Problem:** Installation fails
```bash
# Check Node.js version (requires 18+)
node --version

# Check Bun installation
bun --version

# Clean and retry
rm -rf node_modules dist
./install.sh
```

**Problem:** Build fails
```bash
# Check TypeScript installation
bun run typecheck

# Clean cache and rebuild
rm -rf node_modules/.cache dist
bun install
bun run build
```

### Update Issues

**Problem:** Update fails with uncommitted changes
```bash
# Commit your changes
git add .
git commit -m "Backup before update"

# Or stash them
git stash
bun run update
```

**Problem:** Update verification fails
```bash
# Restore backup
cp package.json.backup package.json

# Retry update
bun run update
```

### Runtime Issues

**Problem:** openClaude won't start
```bash
# Check build
ls -la dist/cli.mjs

# Rebuild
bun run build

# Check dependencies
bun run doctor:runtime
```

**Problem:** Provider authentication issues
```bash
# Re-authenticate
node dist/cli.mjs /auth login

# Check provider configuration
node dist/cli.mjs /provider
```

## Advanced Usage

### Custom Installation Location

```bash
# Install to custom directory
git clone https://github.com/giovannimnz/openClaude.git /path/to/installation
cd /path/to/installation
./install.sh

# Create alias for easy access
alias openclaude='/path/to/installation/node dist/cli.mjs'
```

### Multiple Instances

```bash
# Install multiple versions
git clone https://github.com/giovannimnz/openClaude.git openclaude-v1
git clone https://github.com/giovannimnz/openClaude.git openclaude-dev

# Switch between versions
cd openclaude-v1 && ./install.sh
cd ../openclaude-dev && ./install.sh
```

### Development Setup

```bash
# Clone repository
git clone https://github.com/giovannimnz/openClaude.git
cd openClaude

# Install and setup
./install.sh

# Development mode with hot reload
bun run dev

# Or specific provider development
bun run dev:ollama
bun run dev:openai
```

## Platform-Specific Notes

### Windows

- Run scripts with PowerShell or Command Prompt
- Use backslashes for paths: `bin\openclaude.bat`
- May need administrator privileges for some operations

### macOS

- Scripts are executable by default
- Use forward slashes for paths: `./bin/openclaude`
- Consider adding to PATH for global access

### Linux

- Scripts are executable by default
- Use forward slashes for paths: `./bin/openclaude`
- Consider creating a systemd service for background operation

## Getting Help

- **Quick Start:** Read `QUICKSTART.md` in your installation directory
- **Command Help:** Run `node dist/cli.mjs /help`
- **Diagnostics:** Run `bun run doctor:runtime`
- **Documentation:** https://github.com/giovannimnz/openClaude
- **Issues:** https://github.com/giovannimnz/openClaude/issues

## Summary

| Command | Purpose |
|---------|---------|
| `./install.sh` | First-time installation (auto-installs deps) |
| `bun run install:setup` | Same as above (calls install.sh) |
| `bun run update` | Update to latest version |
| `node dist/cli.mjs` | Run openClaude |
| `node dist/cli.mjs /provider` | Configure provider |
| `node dist/cli.mjs /auth login` | Set up authentication |
| `bun run doctor:runtime` | Diagnose issues |

---

**Happy coding with openClaude!** 🚀