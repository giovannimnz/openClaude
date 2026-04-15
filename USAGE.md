# OpenClaude Usage Guide

## Quick Start

### First Time Setup

```bash
# Clone repository
git clone https://github.com/giovannimnz/openClaude.git
cd openClaude

# Install dependencies
bun install

# Build the project
bun run build

# Setup command wrappers
bun run setup:wrappers

# Configure provider
openclaude /provider
```

### Running OpenClaude

#### Using the wrapper command:
```bash
claude
```

#### Using direct paths:
```bash
# Unix/Linux/macOS
./bin/claude

# Windows
bin\claude.bat
# or
.\bin\claude.ps1

# Direct node execution
node dist/cli.mjs
```

#### Using bun:
```bash
bun run dev
```

## Common Commands

### Provider Management
```bash
claude /provider              # Configure providers
claude /provider list        # List saved profiles
claude /provider remove      # Remove a profile
```

### Authentication
```bash
claude /auth login           # Login to auth providers
claude /auth status          # Check auth status
claude /auth logout          # Logout from auth providers
```

### Project Management
```bash
claude /project new          # Create new project
claude /project list         # List projects
claude /project switch       # Switch between projects
```

### Help and Information
```bash
claude --help                # Show help
claude --version             # Show version
claude /help                 # Show command help
```

### Advanced Features
```bash
claude /agent                # Agent commands
claude /task                 # Task management
claude /mcp                  # MCP server management
claude /settings             # Configuration settings
```

## Platform-Specific Setup

### Windows

#### Method 1: Add to PATH
```powershell
# Add bin directory to PATH
set PATH=%PATH%;C:\path\to\openClaude\bin

# Now you can run from anywhere
claude
```

#### Method 2: Create Global Symlink (Admin)
```powershell
# Run as Administrator
cd C:\path\to\openClaude\bin
mklink claude.bat claude.bat
mklink claude.ps1 claude.ps1
```

#### Method 3: Use from project directory
```powershell
cd C:\path\to\openClaude
.\bin\claude.bat
```

### macOS/Linux

#### Method 1: Add to PATH
```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.profile
export PATH="$(pwd)/bin:$PATH"

# Reload shell
source ~/.bashrc  # or source ~/.zshrc

# Now you can run from anywhere
claude
```

#### Method 2: Create Global Symlink
```bash
sudo ln -sf $(pwd)/bin/claude /usr/local/bin/claude
```

#### Method 3: Use from project directory
```bash
./bin/claude
```

## Authentication Methods

### Google Gemini CLI

#### Enterprise (Gcloud ADC) - Recommended for Corporate Projects
```bash
# Set project
export GOOGLE_CLOUD_PROJECT="your-project-id"

# Login via gcloud ADC
claude /auth login
# Select [1] Gcloud ADC
```

#### Standard OAuth - For Personal Use
```bash
claude /auth login
# Select [2] OAuth Browser Login
```

### Anthropic Claude
```bash
claude /auth login
# Select "Claude"
# Follow browser authentication
```

### Other Providers
```bash
claude /provider
# Configure OpenAI, Ollama, or other providers
```

## Development Workflow

### Development Mode
```bash
# Watch mode with hot reload
bun run dev

# With specific provider
bun run dev:gemini
bun run dev:openai
bun run dev:ollama
```

### Testing
```bash
# Run all tests
bun test

# Run specific tests
bun test src/services/api/*.test.ts

# With coverage
bun run test:coverage
```

### Building
```bash
# Build for production
bun run build

# Build and verify
bun run smoke

# Build with privacy checks
bun run build:verified
```

## Troubleshooting

### Command Not Found
```bash
# Make sure you're in the project directory
cd /path/to/openClaude

# Build first
bun run build

# Setup wrappers
bun run setup:wrappers

# Try direct path
./bin/claude  # Unix/macOS
.\bin\claude.bat  # Windows
```

### Build Errors
```bash
# Clean and rebuild
rm -rf dist node_modules
bun install
bun run build
```

### Permission Issues (Unix/macOS)
```bash
# Make scripts executable
chmod +x bin/claude
chmod +x bin/claude.sh
```

### Windows Execution Policy
```powershell
# Allow running scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Tips and Tricks

### Quick Access Aliases
```bash
# Add to your shell config (.bashrc, .zshrc, etc.)
alias oc='claude'
alias ocp='claude /provider'
alias oca='claude /auth login'
```

### Multiple Profiles
```bash
# Create different profiles for different projects
claude /provider create profile1 --provider openai --model gpt-4
claude /provider create profile2 --provider ollama --model llama3
claude /provider use profile1
```

### Update and Maintenance
```bash
# Update to latest version
bun run update

# Check system health
bun run doctor:runtime

# Verify installation
bun run hardening:check
```

## Getting Help

### Built-in Help
```bash
claude --help           # General help
claude /help            # Command help
claude /provider --help # Provider-specific help
```

### Documentation
- **Installation Guide:** `INSTALLATION.md`
- **README:** `README.md`
- **GitHub Issues:** https://github.com/giovannimnz/openClaude/issues
- **Discussions:** https://github.com/giovannimnz/openClaude/discussions