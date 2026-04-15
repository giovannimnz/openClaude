@echo off
REM Debug script for OpenClaude CLI
REM Usage: debug-run.bat [args...]

setlocal enabledelayedexpansion

set "LOGDIR=%~dp0debug-logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"

REM Get timestamp
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value') do set datetime=%%a
set "TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%"

set "LOGFILE=%LOGDIR%\debug_%TIMESTAMP%.txt"
set counter=1

:checkfile
if exist "%LOGFILE%" (
    set "LOGFILE=%LOGDIR%\debug_%TIMESTAMP%_%counter%.txt"
    set /a counter+=1
    goto checkfile
)

echo Log file: %LOGFILE%
echo Running: node %~dp0dist\cli.mjs %*
echo ------------------------------------------------------------

set DEBUG_LOG=1
node "%~dp0dist\cli.mjs" %* 2>&1 | tee "%LOGFILE%"

echo ------------------------------------------------------------
echo Log saved to: %LOGFILE%
