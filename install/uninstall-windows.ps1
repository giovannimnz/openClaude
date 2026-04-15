#!/usr/bin/env pwsh
<#
.SYNOPSIS
    openClaude Uninstaller for Windows

.DESCRIPTION
    This script removes openClaude from Windows systems.

.PARAMETER InstallPath
    The installation directory (default: $env:USERPROFILE\openClaude)

.PARAMETER RemoveAll
    Remove all openClaude files including configuration

.EXAMPLE
    .\uninstall-windows.ps1
    Removes openClaude from default location

.EXAMPLE
    .\uninstall-windows.ps1 -InstallPath "C:\openClaude" -RemoveAll
    Removes openClaude from custom location including all files
#>

param(
    [string]$InstallPath = "$env:USERPROFILE\openClaude",
    [switch]$RemoveAll
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
Write-ColorOutput Cyan "║              openClaude Uninstaller                      ║"
Write-ColorOutput Cyan "╚════════════════════════════════════════════════════════════╝"
Write-Output ""

# Check if openClaude is installed
if (-not (Test-Path $InstallPath)) {
    Write-ColorOutput Red "❌ openClaude not found at: $InstallPath"
    Write-ColorOutput Yellow "   Use -InstallPath to specify a different installation path"
    exit 1
}

# Show what will be removed
Write-ColorOutput Yellow "⚠️  This will remove openClaude from: $InstallPath"
if ($RemoveAll) {
    Write-ColorOutput Red "   -RemoveAll: Will also remove configuration files"
}
Write-Output ""

$response = Read-Host "Are you sure you want to continue? (Y/N)"
if ($response -ne "Y" -and $response -ne "y") {
    Write-ColorOutput Red "❌ Uninstallation cancelled"
    exit 0
}

Write-Output ""

# Remove start menu shortcut
Write-ColorOutput Green "📱 Removing start menu shortcut..."
$shortcutPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\openClaude.lnk"
if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-ColorOutput Green "✅ Removed: $shortcutPath"
} else {
    Write-ColorOutput Yellow "⚠️  Start menu shortcut not found"
}

# Remove desktop shortcut
Write-ColorOutput Green "🖥️  Removing desktop shortcut..."
$desktopShortcut = "$env:USERPROFILE\Desktop\openClaude.lnk"
if (Test-Path $desktopShortcut) {
    Remove-Item $desktopShortcut -Force
    Write-ColorOutput Green "✅ Removed: $desktopShortcut"
} else {
    Write-ColorOutput Yellow "⚠️  Desktop shortcut not found"
}

# Remove from PATH
Write-ColorOutput Green "⚙️  Cleaning PATH environment variable..."
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -like "*$InstallPath*") {
    Write-ColorOutput Cyan "Removing $InstallPath from user PATH"
    $newPath = ($currentPath -split ';' | Where-Object { $_ -ne $InstallPath }) -join ';'
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-ColorOutput Green "✅ PATH updated"
    Write-ColorOutput Yellow "   Restart your terminal to apply changes"
} else {
    Write-ColorOutput Yellow "⚠️  openClaude not in PATH"
}

# Remove configuration files if -RemoveAll flag is set
if ($RemoveAll) {
    Write-ColorOutput Green "🗑️  Removing configuration files..."
    
    $configDirs = @(
        "$env:USERPROFILE\.openclaude",
        "$env:USERPROFILE\.claude",
        "$env:APPDATA\openclaude"
    )
    
    foreach ($configDir in $configDirs) {
        if (Test-Path $configDir) {
            Remove-Item $configDir -Recurse -Force
            Write-ColorOutput Green "✅ Removed: $configDir"
        }
    }
    
    Write-ColorOutput Yellow "⚠️  Remember to remove any openClaude environment variables"
}

# Remove installation directory
Write-ColorOutput Green "📁 Removing installation directory..."
if (Test-Path $InstallPath) {
    # Try to remove directory
    try {
        Remove-Item $InstallPath -Recurse -Force
        Write-ColorOutput Green "✅ Removed: $InstallPath"
    } catch {
        Write-ColorOutput Red "❌ Failed to remove $InstallPath"
        Write-ColorOutput Yellow "   Some files may be in use. Close any openClaude instances and try again."
        Write-ColorOutput Yellow "   Manual removal may be required."
    }
}

Write-Output ""

# Display summary
Write-ColorOutput Cyan "╔════════════════════════════════════════════════════════════╗"
Write-ColorOutput Cyan "║              Uninstallation Summary                       ║"
Write-ColorOutput Cyan "╚════════════════════════════════════════════════════════════╝"
Write-Output ""
Write-ColorOutput Green "✅ Uninstallation completed!"
Write-Output ""
Write-ColorOutput Yellow "📝 Notes:"
Write-ColorOutput Yellow "   1. Restart your terminal to apply PATH changes"
Write-ColorOutput Yellow "   2. Restart any applications that may have openClaude loaded"
Write-ColorOutput Yellow "   3. Configuration files preserved (use -RemoveAll to remove)"
Write-Output ""
Write-ColorOutput Cyan "🔄 Want to reinstall?"
Write-ColorOutput Yellow "   Run: .\install-windows.ps1"
Write-Output ""
Write-ColorOutput Green "👋 Thanks for using openClaude!"
Write-Output ""