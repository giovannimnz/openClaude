# OpenClaude — Claude Code with any LLM
# PowerShell wrapper

$ErrorActionPreference = "Stop"

# Get the directory where this script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Join-Path $ScriptDir ".."
$DistPath = Join-Path $ProjectRoot "dist\cli.mjs"

# Check if dist/cli.mjs exists
if (-not (Test-Path $DistPath)) {
    Write-Host ""
    Write-Host "openclaude: dist\cli.mjs not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Build first:" -ForegroundColor Yellow
    Write-Host "  bun run build"
    Write-Host ""
    Write-Host "Or run directly with Bun:" -ForegroundColor Yellow
    Write-Host "  bun run dev"
    Write-Host ""
    Write-Host "See README.md for setup instructions."
    Write-Host ""
    exit 1
}

# Run the CLI
& node $DistPath @args