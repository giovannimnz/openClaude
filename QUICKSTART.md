# openClaude Quick Start Guide

## Installation Complete! 🎉

openClaude has been successfully installed in this directory.

## Getting Started

### Basic Usage

```bash
# Run openClaude directly
node dist/cli.mjs

# Or use the convenience script (if created)
./bin/openclaude

# Or on Windows
bin\openclaude.bat
```

### First Time Setup

1. **Configure your LLM provider:**
   ```bash
   node dist/cli.mjs /provider
   ```

2. **Set up authentication (if needed):**
   ```bash
   node dist/cli.mjs /auth login
   ```

3. **Start using openClaude:**
   ```bash
   node dist/cli.mjs
   ```

## Available Commands

### Installation & Updates
- `./install.sh` - Reinstall (rarely needed)
- `bun run update` - Update to latest version
- `bun run build` - Rebuild the project

### Development
- `bun run dev` - Run in development mode
- `bun run dev:profile` - Run with profile launcher
- `bun run dev:fast` - Run with fast local model

### Testing
- `bun run test` - Run tests
- `bun run test:coverage` - Run tests with coverage
- `bun run typecheck` - Type check the code

### Diagnostics
- `bun run doctor:runtime` - Check runtime environment
- `bun run smoke` - Quick smoke test

## Configuration

Your configuration files are stored in:
- **User config:** `~/.claude/config.json`
- **Provider profiles:** `~/.claude/providers/`
- **History:** `~/.claude/history/`
- **Projects:** `~/.claude/projects/`

## Supported Providers

- **OpenAI** - GPT-3.5, GPT-4, GPT-4 Turbo
- **Anthropic Claude** - Claude 3, Claude 3.5 Sonnet
- **Google Gemini** - Gemini Pro, Gemini 2.0
- **Ollama** - Local models (Llama, Mistral, etc.)
- **GitHub Models** - GitHub-hosted models
- **And 200+ more!**

## Need Help?

- Run `node dist/cli.mjs /help` for command reference
- Check the documentation: https://github.com/giovannimnz/openClaude
- Report issues: https://github.com/giovannimnz/openClaude/issues

## Tips

1. **Use provider profiles** to quickly switch between different LLM providers
2. **Enable authentication** for better security with cloud providers
3. **Update regularly** with `bun run update` for bug fixes and new features
4. **Check diagnostics** with `bun run doctor:runtime` if you encounter issues

---

**Happy coding with openClaude!** 🚀
