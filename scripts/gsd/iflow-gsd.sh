#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
ROOT_DIR="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"

# Compatibilidade: iflow-gsd agora aponta para a instância 1.
exec "$ROOT_DIR/scripts/iflow1.sh" "$@"
