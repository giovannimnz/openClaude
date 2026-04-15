#!/bin/bash
# Check terminal environment
echo "=== Terminal Environment ==="
echo "TERM: $TERM"
echo "TERM_PROGRAM: $TERM_PROGRAM"
echo "TERM_PROGRAM_VERSION: $TERM_PROGRAM_VERSION"
echo "Platform: $(uname -s)"
echo ""
if [ "$TERM_PROGRAM" = "Apple_Terminal" ]; then
    echo "✅ Apple Terminal detected (supported)"
elif [ "$TERM_PROGRAM" = "iTerm.app" ]; then
    echo "✅ iTerm2 detected (supported)"
else
    echo "⚠️  Terminal: $TERM_PROGRAM"
fi
