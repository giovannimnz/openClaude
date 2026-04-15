#!/bin/bash
# Run all diagnostic checks
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     OpenClaude Mac Validation - Diagnostic Suite           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Running all checks..."
echo ""

# Run each check
bash "$SCRIPT_DIR/1-check-tty.sh"
echo ""

bash "$SCRIPT_DIR/2-check-node-version.sh"
echo ""

bash "$SCRIPT_DIR/3-check-keychain.sh"
echo ""

bash "$SCRIPT_DIR/4-check-terminal-env.sh"
echo ""

echo "═════════════════════════════════════════════════════════════"
echo "All checks complete!"
echo ""
echo "To run the CLI: bash $SCRIPT_DIR/5-run-cli.sh"
echo "Or directly: cd $(dirname $SCRIPT_DIR) && node dist/cli.mjs"
