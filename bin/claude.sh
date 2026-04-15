#!/bin/bash
# Claude — Claude Code with any LLM
# Unix/Linux/macOS wrapper

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_PATH="$PROJECT_ROOT/dist/cli.mjs"

# Check if dist/cli.mjs exists
if [ ! -f "$DIST_PATH" ]; then
    echo ""
    echo "claude: dist/cli.mjs not found."
    echo ""
    echo "Build first:"
    echo "  bun run build"
    echo ""
    echo "Or run directly with Bun:"
    echo "  bun run dev"
    echo ""
    echo "See README.md for setup instructions."
    echo ""
    exit 1
fi

# Run the CLI
node "$DIST_PATH" "$@"