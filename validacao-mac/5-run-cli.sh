#!/bin/bash
# Run CLI with debug output
echo "=== Running CLI ==="
echo "Make sure you're in the openClaude directory"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "Project root: $PROJECT_ROOT"
echo ""

# Check if dist exists
if [ ! -f "dist/cli.mjs" ]; then
    echo "❌ dist/cli.mjs not found. Building..."
    bun scripts/build.ts
fi

echo "Running CLI..."
echo "Press Ctrl+C to exit"
echo ""
node dist/cli.mjs
