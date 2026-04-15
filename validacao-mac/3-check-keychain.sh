#!/bin/bash
# Check macOS Keychain access
echo "=== Keychain Check ==="
echo "Testing keychain access (may prompt for password)..."
security find-generic-password -a "$USER" -s "Claude Code" -w 2>&1
EXIT_CODE=$?
echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Keychain accessible"
elif [ $EXIT_CODE -eq 44 ]; then
    echo "❌ Keychain is LOCKED. Unlock it in Keychain Access app."
elif [ $EXIT_CODE -eq 36 ]; then
    echo "⚠️  Keychain not found (normal for first run)"
else
    echo "⚠️  Keychain error (exit code: $EXIT_CODE)"
fi
