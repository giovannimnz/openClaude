#!/usr/bin/env pwsh
<#
.SYNOPSIS
    openClaude Installer for Windows

.DESCRIPTION
    This script installs openClaude on Windows systems.
    It clones the repository, installs dependencies, and sets up the CLI.

.PARAMETER InstallPath
    The installation directory (default: $env:USERPROFILE\openClaude)

.PARAMETER Branch
    The Git branch to clone (default: main)

.EXAMPLE
    .\install-windows.ps1
    Installs openClaude to default location

.EXAMPLE
    .\install-windows.ps1 -InstallPath "C:\openClaude" -Branch "develop"
    Installs openClaude to custom location with specific branch
#>

param(
    [string]$InstallPath = "$env:USERPROFILE\openClaude",
    [string]$Branch = "main"
)

# Error handling
$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Cyan "╔════════════════════════════════════════════════════════════╗"
Write-ColorOutput Cyan "║           openClaude Installer for Windows              ║"
Write-ColorOutput Cyan "╚════════════════════════════════════════════════════════════╝"
Write-Output ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-ColorOutput Yellow "⚠️  Running as Administrator. Some checks may be elevated."
    Write-Output ""
}

# Check prerequisites
Write-ColorOutput Green "🔍 Checking prerequisites..."

# Check Node.js
try {
    $nodeVersion = node --version
    Write-ColorOutput Green "✅ Node.js found: $nodeVersion"
} catch {
    Write-ColorOutput Red "❌ Node.js not found. Please install Node.js from https://nodejs.org/"
    Write-ColorOutput Yellow "   Required: Node.js 18.0 or higher"
    exit 1
}

# Check Git
try {
    $gitVersion = git --version
    Write-ColorOutput Green "✅ Git found: $gitVersion"
} catch {
    Write-ColorOutput Red "❌ Git not found. Please install Git from https://git-scm.com/"
    exit 1
}

# Check Bun (optional but recommended)
try {
    $bunVersion = bun --version
    Write-ColorOutput Green "✅ Bun found: $bunVersion (recommended for faster builds)"
} catch {
    Write-ColorOutput Yellow "⚠️  Bun not found. Will use npm instead (slower builds)"
    $useBun = $false
}

Write-Output ""

# Create installation directory
Write-ColorOutput Green "📁 Creating installation directory..."
if (Test-Path $InstallPath) {
    Write-ColorOutput Yellow "⚠️  Directory already exists: $InstallPath"
    $response = Read-Host "Do you want to continue? (Y/N)"
    if ($response -ne "Y" -and $response -ne "y") {
        Write-ColorOutput Red "❌ Installation cancelled"
        exit 1
    }
} else {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    Write-ColorOutput Green "✅ Created: $InstallPath"
}

Write-Output ""

# Clone repository
Write-ColorOutput Green "📥 Cloning openClaude repository..."
$repoUrl = "https://github.com/giovannimnz/openClaude.git"

try {
    if (Test-Path "$InstallPath\.git") {
        Write-ColorOutput Yellow "⚠️  Repository already exists. Pulling latest changes..."
        Set-Location $InstallPath
        git fetch origin
        git checkout $Branch
        git pull origin $Branch
    } else {
        git clone -b $Branch $repoUrl $InstallPath
        Set-Location $InstallPath
    }
    Write-ColorOutput Green "✅ Repository cloned/updated successfully"
} catch {
    Write-ColorOutput Red "❌ Failed to clone repository: $_"
    exit 1
}

Write-Output ""

# Install dependencies
Write-ColorOutput Green "📦 Installing dependencies..."

try {
    if ($useBun) {
        Write-ColorOutput Cyan "Using Bun for faster installation..."
        bun install
    } else {
        Write-ColorOutput Cyan "Using npm for installation..."
        npm install
    }
    Write-ColorOutput Green "✅ Dependencies installed successfully"
} catch {
    Write-ColorOutput Red "❌ Failed to install dependencies: $_"
    exit 1
}

Write-Output ""

# Build the project
Write-ColorOutput Green "🔨 Building openClaude..."

try {
    if ($useBun) {
        bun run build
    } else {
        npm run build
    }
    Write-ColorOutput Green "✅ Build completed successfully"
} catch {
    Write-ColorOutput Red "❌ Build failed: $_"
    Write-ColorOutput Yellow "   You can still use openClaude in development mode"
}

Write-Output ""

# Create global command (optional)
Write-ColorOutput Green "🔗 Setting up global command..."

try {
    # Add to PATH (current session)
    $env:PATH += ";$InstallPath"
    
    # Create shortcut in user's AppData\Roaming\Microsoft\Windows\Start Menu\Programs
    $shortcutPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\openClaude.lnk"
    $wshShell = New-Object -ComObject WScript.Shell
    $shortcut = $wshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "node"
    $shortcut.Arguments = "`"$InstallPath\dist\cli.mjs`""
    $shortcut.WorkingDirectory = $InstallPath
    $shortcut.Description = "openClaude AI Assistant"
    $shortcut.Save()
    
    Write-ColorOutput Green "✅ Global command configured"
    Write-ColorOutput Yellow "   Start menu shortcut created"
} catch {
    Write-ColorOutput Yellow "⚠️  Could not create global command: $_"
    Write-ColorOutput Yellow "   You can run openClaude from: $InstallPath"
}

Write-Output ""

# Setup environment variables
Write-ColorOutput Green "⚙️  Setting up environment..."

$envPath = "$InstallPath\bin"
$env:PATH += ";$envPath"

Write-ColorOutput Cyan "To permanently add openClaude to your PATH, run:"
Write-ColorOutput Yellow "[Environment]::SetEnvironmentVariable('Path', `$env:PATH + ';$InstallPath', 'User')"
Write-Output ""

# Display installation summary
Write-ColorOutput Cyan "╔════════════════════════════════════════════════════════════╗"
Write-ColorOutput Cyan "║              Installation Summary                         ║"
Write-ColorOutput Cyan "╚════════════════════════════════════════════════════════════╝"
Write-Output ""
Write-ColorOutput Green "✅ Installation completed successfully!"
Write-Output ""
Write-ColorOutput Cyan "📍 Installation Path:"
Write-ColorOutput Yellow "   $InstallPath"
Write-Output ""
Write-ColorOutput Cyan "🚀 To run openClaude:"
Write-ColorOutput Yellow "   cd $InstallPath"
Write-ColorOutput Yellow "   node dist\cli.mjs"
Write-Output ""
Write-ColorOutput Cyan "📚 Documentation:"
Write-ColorOutput Yellow "   https://github.com/giovannimnz/openClaude"
Write-Output ""
Write-ColorOutput Cyan "🔧 Next Steps:"
Write-ColorOutput Yellow "   1. Configure your LLM provider: node dist\cli.mjs /provider"
Write-ColorOutput Yellow "   2. Set up authentication: node dist\cli.mjs /auth login"
Write-ColorOutput Yellow "   3. Start using: node dist\cli.mjs"
Write-Output ""
Write-ColorOutput Green "🎉 Happy coding with openClaude!"
Write-Output ""

# Offer to open openClaude
$response = Read-Host "Do you want to start openClaude now? (Y/N)"
if ($response -eq "Y" -or $response -eq "y") {
    Write-Output ""
    Write-ColorOutput Cyan "🚀 Starting openClaude..."
    node "$InstallPath\dist\cli.mjs"
}