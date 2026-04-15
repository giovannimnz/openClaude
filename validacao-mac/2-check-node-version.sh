#!/bin/bash
# Check Node version
echo "=== Node Version Check ==="
node --version
echo ""
echo "Required: Node >= 20.0.0"
NODE_VERSION=$(node --version | sed 's/v//')
MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
if [ "$MAJOR" -ge 20 ]; then
    echo "✅ Node version OK"
else
    echo "❌ Node version too old. Please upgrade to Node 20+"
fi
