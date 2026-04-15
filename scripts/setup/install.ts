#!/usr/bin/env tsx
/**
 * openClaude Installation Script
 * 
 * First-time installation that:
 * - Installs dependencies locally (inside the repository)
 * - Builds the project
 * - Sets up user configuration directory
 * - Creates convenience scripts
 * 
 * Usage: bun run install:setup
 */

import { join } from 'node:path'
import { mkdir, writeFile, chmod } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { spawn } from 'node:child_process'

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
}

function log(message: string, color = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`)
}

function logStep(step: number, total: number, message: string): void {
  log(`[${step}/${total}] ${message}`, colors.cyan)
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })

    child.on('close', (code) => {
      resolve(code === 0)
    })
  })
}

async function ensureDirectory(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
    log(`Created directory: ${dir}`, colors.green)
  }
}

async function setupUserConfigDir(): Promise<string> {
  const configDir = join(homedir(), '.claude')
  await ensureDirectory(configDir)
  
  // Create subdirectories
  const subdirs = ['providers', 'history', 'profiles', 'projects']
  for (const subdir of subdirs) {
    await ensureDirectory(join(configDir, subdir))
  }

  // Create config file if it doesn't exist
  const configFile = join(configDir, 'config.json')
  if (!existsSync(configFile)) {
    const defaultConfig = {
      version: '1.0.0',
      theme: 'dark',
      autoUpdate: true,
      telemetry: false,
      providers: {},
      profiles: {},
    }
    await writeFile(configFile, JSON.stringify(defaultConfig, null, 2), 'utf-8')
    log(`Created config file: ${configFile}`, colors.green)
  }

  return configDir
}

async function createConvenienceScripts(projectRoot: string): Promise<void> {
  const osPlatform = platform()
  const scriptsDir = join(projectRoot, 'bin')

  await ensureDirectory(scriptsDir)

  if (osPlatform === 'win32') {
    // Windows batch file
    const batchScript = `@echo off
cd /d "%~dp0"
node dist\\cli.mjs %*
`
    const batchPath = join(scriptsDir, 'openclaude.bat')
    await writeFile(batchPath, batchScript, 'utf-8')
    log(`Created Windows script: ${batchPath}`, colors.green)

    // PowerShell script
    const psScript = `$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath
& node dist\\cli.mjs @args
`
    const psPath = join(scriptsDir, 'openclaude.ps1')
    await writeFile(psPath, psScript, 'utf-8')
    log(`Created PowerShell script: ${psPath}`, colors.green)
  } else {
    // Unix shell script
    const shellScript = `#!/bin/bash
cd "$(dirname "$0")"
node dist/cli.mjs "$@"
`
    const shellPath = join(scriptsDir, 'openclaude')
    await writeFile(shellPath, shellScript, 'utf-8')
    await chmod(shellPath, 0o755) // Make executable
    log(`Created shell script: ${shellPath}`, colors.green)
  }
}

async function createQuickStartGuide(projectRoot: string): Promise<void> {
  const guidePath = join(projectRoot, 'QUICKSTART.md')
  const guide = `# openClaude Quick Start Guide

## Installation Complete! 🎉

openClaude has been successfully installed in this directory.

## Getting Started

### Basic Usage

\`\`\`bash
# Run openClaude directly
node dist/cli.mjs

# Or use the convenience script (if created)
./bin/openclaude

# Or on Windows
bin\\openclaude.bat
\`\`\`

### First Time Setup

1. **Configure your LLM provider:**
   \`\`\`bash
   node dist/cli.mjs /provider
   \`\`\`

2. **Set up authentication (if needed):**
   \`\`\`bash
   node dist/cli.mjs /auth login
   \`\`\`

3. **Start using openClaude:**
   \`\`\`bash
   node dist/cli.mjs
   \`\`\`

## Available Commands

### Installation & Updates
- \`bun run install:setup\` - Reinstall (rarely needed)
- \`bun run update\` - Update to latest version
- \`bun run build\` - Rebuild the project

### Development
- \`bun run dev\` - Run in development mode
- \`bun run dev:profile\` - Run with profile launcher
- \`bun run dev:fast\` - Run with fast local model

### Testing
- \`bun run test\` - Run tests
- \`bun run test:coverage\` - Run tests with coverage
- \`bun run typecheck\` - Type check the code

### Diagnostics
- \`bun run doctor:runtime\` - Check runtime environment
- \`bun run smoke\` - Quick smoke test

## Configuration

Your configuration files are stored in:
- **User config:** \`~/.claude/config.json\`
- **Provider profiles:** \`~/.claude/providers/\`
- **History:** \`~/.claude/history/\`
- **Projects:** \`~/.claude/projects/\`

## Supported Providers

- **OpenAI** - GPT-3.5, GPT-4, GPT-4 Turbo
- **Anthropic Claude** - Claude 3, Claude 3.5 Sonnet
- **Google Gemini** - Gemini Pro, Gemini 2.0
- **Ollama** - Local models (Llama, Mistral, etc.)
- **GitHub Models** - GitHub-hosted models
- **And 200+ more!**

## Need Help?

- Run \`node dist/cli.mjs /help\` for command reference
- Check the documentation: https://github.com/giovannimnz/openClaude
- Report issues: https://github.com/giovannimnz/openClaude/issues

## Tips

1. **Use provider profiles** to quickly switch between different LLM providers
2. **Enable authentication** for better security with cloud providers
3. **Update regularly** with \`bun run update\` for bug fixes and new features
4. **Check diagnostics** with \`bun run doctor:runtime\` if you encounter issues

---

**Happy coding with openClaude!** 🚀
`

  if (!existsSync(guidePath)) {
    await writeFile(guidePath, guide, 'utf-8')
    log(`Created quick start guide: ${guidePath}`, colors.green)
  }
}

async function verifyInstallation(projectRoot: string): Promise<boolean> {
  const requiredFiles = [
    'dist/cli.mjs',
    'package.json',
    'node_modules',
  ]

  for (const file of requiredFiles) {
    if (!existsSync(join(projectRoot, file))) {
      log(`Missing required file: ${file}`, colors.red)
      return false
    }
  }

  return true
}

async function main(): Promise<void> {
  const projectRoot = process.cwd()
  const totalSteps = 6

  log('╔════════════════════════════════════════════════════════════╗', colors.cyan)
  log('║           openClaude Installation Script                    ║', colors.cyan)
  log('╚════════════════════════════════════════════════════════════╝', colors.cyan)
  log('')

  // Step 1: Install dependencies
  logStep(1, totalSteps, 'Installing dependencies...')
  const depsSuccess = await runCommand('bun', ['install'], projectRoot)
  if (!depsSuccess) {
    log('❌ Failed to install dependencies', colors.red)
    process.exit(1)
  }
  log('✅ Dependencies installed', colors.green)
  log('')

  // Step 2: Build the project
  logStep(2, totalSteps, 'Building openClaude...')
  const buildSuccess = await runCommand('bun', ['run', 'build'], projectRoot)
  if (!buildSuccess) {
    log('❌ Failed to build project', colors.red)
    process.exit(1)
  }
  log('✅ Build completed', colors.green)
  log('')

  // Step 3: Setup user configuration directory
  logStep(3, totalSteps, 'Setting up user configuration...')
  const configDir = await setupUserConfigDir()
  log(`✅ Configuration directory: ${configDir}`, colors.green)
  log('')

  // Step 4: Create convenience scripts
  logStep(4, totalSteps, 'Creating convenience scripts...')
  await createConvenienceScripts(projectRoot)
  log('✅ Scripts created', colors.green)
  log('')

  // Step 5: Create quick start guide
  logStep(5, totalSteps, 'Creating quick start guide...')
  await createQuickStartGuide(projectRoot)
  log('✅ Quick start guide created', colors.green)
  log('')

  // Step 6: Verify installation
  logStep(6, totalSteps, 'Verifying installation...')
  const verified = await verifyInstallation(projectRoot)
  if (!verified) {
    log('❌ Installation verification failed', colors.red)
    process.exit(1)
  }
  log('✅ Installation verified', colors.green)
  log('')

  // Success message
  log('╔════════════════════════════════════════════════════════════╗', colors.green)
  log('║           Installation Successful! 🎉                      ║', colors.green)
  log('╚════════════════════════════════════════════════════════════╝', colors.green)
  log('')
  log('📋 Summary:', colors.blue)
  log(`  📁 Project location: ${projectRoot}`, colors.yellow)
  log(`  ⚙️  Config location: ${configDir}`, colors.yellow)
  log(`  🚀 To start: node dist/cli.mjs`, colors.yellow)
  log('')
  log('📚 Next steps:', colors.blue)
  log('  1. Read QUICKSTART.md for getting started', colors.yellow)
  log('  2. Configure your provider: node dist/cli.mjs /provider', colors.yellow)
  log('  3. Set up authentication: node dist/cli.mjs /auth login', colors.yellow)
  log('  4. Start using: node dist/cli.mjs', colors.yellow)
  log('')
  log('🔄 To update later: bun run update', colors.blue)
  log('')
}

main().catch((error) => {
  log(`❌ Installation failed: ${error}`, colors.red)
  process.exit(1)
})