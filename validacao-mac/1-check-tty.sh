#!/bin/bash
# Check TTY status
echo "=== TTY Check ==="
node -e "console.log('stdout.isTTY:', process.stdout.isTTY, 'stdin.isTTY:', process.stdin.isTTY)"
echo ""
echo "If stdout.isTTY is 'true', the terminal is properly connected."
echo "If it's 'undefined' or 'false', there's a TTY problem."
