#!/bin/bash
# gsd-browser quick start script for AtiusCapital workspace
# Usage: ./scripts/start-gsd-browser.sh [port]

PORT=${1:-4242}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " GSD Browser - AtiusCapital"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Starting on http://127.0.0.1:$PORT (headless mode)"
echo ""

# Check if already running
if lsof -i :$PORT >/dev/null 2>&1; then
  echo "⚠️  Port $PORT is already in use!"
  echo "   To stop: kill %1 or use: fuser -k $PORT/tcp"
  exit 1
fi

# Start gsd-browser
gsd-browser --port "$PORT" --no-open
