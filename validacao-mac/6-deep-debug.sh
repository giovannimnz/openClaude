#!/bin/bash
# Deep debug - capture all output and state

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     OpenClaude Deep Debug - Capturing All Output           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

LOG_FILE="$PROJECT_ROOT/validacao-mac/debug-output-$(date +%Y%m%d_%H%M%S).txt"

echo "Project root: $PROJECT_ROOT"
echo "Log file: $LOG_FILE"
echo ""

# Check prerequisites
echo "=== Prerequisites ===" | tee -a "$LOG_FILE"
echo "Node: $(node --version)" | tee -a "$LOG_FILE"
echo "Platform: $(uname -s)" | tee -a "$LOG_FILE"
echo "TERM: $TERM" | tee -a "$LOG_FILE"
echo "TERM_PROGRAM: $TERM_PROGRAM" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# TTY Check
echo "=== TTY Check ===" | tee -a "$LOG_FILE"
node -e "console.log('stdout.isTTY:', process.stdout.isTTY, 'stdin.isTTY:', process.stdin.isTTY)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Keychain Check
echo "=== Keychain Status ===" | tee -a "$LOG_FILE"
security show-keychain-info 2>&1 | tee -a "$LOG_FILE"
echo "Exit code: $?" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Check dist exists
if [ ! -f "dist/cli.mjs" ]; then
    echo "Building..." | tee -a "$LOG_FILE"
    bun scripts/build.ts 2>&1 | tee -a "$LOG_FILE"
fi

# Now run with timeout to capture initial output
echo "=== CLI Output (first 10 seconds) ===" | tee -a "$LOG_FILE"
echo "Running: timeout 10 node dist/cli.mjs 2>&1" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Use script to capture TTY output properly
if command -v script &> /dev/null; then
    # macOS has script command
    script -q "$LOG_FILE.tmp" -c "timeout 10 node dist/cli.mjs 2>&1" 2>/dev/null || true
    if [ -f "$LOG_FILE.tmp" ]; then
        cat "$LOG_FILE.tmp" >> "$LOG_FILE"
        rm -f "$LOG_FILE.tmp"
    fi
else
    # Fallback without script
    timeout 10 node dist/cli.mjs 2>&1 >> "$LOG_FILE" || true
fi

echo "" | tee -a "$LOG_FILE"
echo "=== Debug Complete ===" | tee -a "$LOG_FILE"
echo "Full log saved to: $LOG_FILE" | tee -a "$LOG_FILE"
echo ""
echo "Please send the contents of $LOG_FILE for analysis."
