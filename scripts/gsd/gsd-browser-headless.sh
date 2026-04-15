#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
ROOT_DIR="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
SELF_PATH="$(readlink -f "$0" 2>/dev/null || echo "$0")"

# Optional explicit override for testing/custom installs.
if [[ -n "${GSD_BROWSER_BIN:-}" ]]; then
  TARGET="$GSD_BROWSER_BIN"
else
  TARGET=""
  while IFS= read -r cand; do
    [[ -z "$cand" ]] && continue
    cand_real="$(readlink -f "$cand" 2>/dev/null || echo "$cand")"
    if [[ "$cand_real" != "$SELF_PATH" ]]; then
      TARGET="$cand"
      break
    fi
  done < <(which -a gsd-browser 2>/dev/null || true)

  if [[ -z "$TARGET" ]]; then
    NODE_VER="$(node -v 2>/dev/null || true)"
    if [[ -n "$NODE_VER" && -x "$HOME/.nvm/versions/node/$NODE_VER/bin/gsd-browser" ]]; then
      TARGET="$HOME/.nvm/versions/node/$NODE_VER/bin/gsd-browser"
    fi
  fi
fi

if [[ -z "$TARGET" ]]; then
  echo "Erro: não encontrei binário real do gsd-browser (defina GSD_BROWSER_BIN se necessário)." >&2
  exit 1
fi

# Commands that do not run the server UI; no need to inject --no-open.
if [[ $# -gt 0 ]]; then
  case "$1" in
    add|remove|list|-h|--help|-v|--version)
      exec "$TARGET" "$@"
      ;;
  esac
fi

# Force headless unless already explicit.
for arg in "$@"; do
  if [[ "$arg" == "--no-open" ]]; then
    exec "$TARGET" "$@"
  fi
done

exec "$TARGET" --no-open "$@"
