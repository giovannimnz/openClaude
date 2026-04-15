# Debug script for OpenClaude CLI
# Usage: ./debug-run.ps1 [args...]
# Example: ./debug-run.ps1        # runs CLI with no args
# Example: ./debug-run.ps1 --help # runs CLI with --help

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logDir = "$PSScriptRoot\debug-logs"

# Create debug-logs directory if it doesn't exist
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

# Find next available number
$baseName = "debug_$timestamp"
$logFile = "$logDir\$baseName.txt"
$counter = 1
while (Test-Path $logFile) {
    $logFile = "$logDir\$baseName`_$counter.txt"
    $counter++
}

Write-Host "Log file: $logFile" -ForegroundColor Cyan
Write-Host "Running: node $PSScriptRoot\dist\cli.mjs $args" -ForegroundColor Yellow
Write-Host ("-" * 60) -ForegroundColor Gray

# Run CLI and capture all output
# Important: 2>&1 captures both stdout and stderr
$env:DEBUG_LOG = "1"

try {
    $output = & node "$PSScriptRoot\dist\cli.mjs" @args 2>&1
    $output | Out-File -FilePath $logFile -Encoding UTF8
    
    # Also display output
    $output | ForEach-Object { 
        if ($_ -is [System.Management.Automation.ErrorRecord]) {
            Write-Host $_ -ForegroundColor Red
        } else {
            Write-Host $_
        }
    }
} catch {
    $_ | Out-File -FilePath $logFile -Encoding UTF8 -Append
    Write-Host $_ -ForegroundColor Red
}

Write-Host ("-" * 60) -ForegroundColor Gray
Write-Host "Log saved to: $logFile" -ForegroundColor Green
