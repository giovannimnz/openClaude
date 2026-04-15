@echo off
REM Claude — Claude Code with any LLM
REM Windows batch wrapper

setlocal

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "DIST_PATH=%PROJECT_ROOT%\dist\cli.mjs"

REM Check if dist/cli.mjs exists
if not exist "%DIST_PATH%" (
    echo.
    echo claude: dist\cli.mjs not found.
    echo.
    echo Build first:
    echo   bun run build
    echo.
    echo Or run directly with Bun:
    echo   bun run dev
    echo.
    echo See README.md for setup instructions.
    echo.
    exit /b 1
)

REM Run the CLI
node "%DIST_PATH%" %*