#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
ROOT_DIR="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
SELF_PATH="$(readlink -f "$0" 2>/dev/null || echo "$0")"

if [[ "${GSD_SKIP_SYNC:-0}" != "1" ]]; then
  "$ROOT_DIR/scripts/gsd-sync-clis.sh" --quiet
fi

EXTRA_ARGS=(--with-claude-config)
AUTO_YOLO=1
for arg in "$@"; do
  case "$arg" in
    --yolo|--dangerously-skip-permissions)
      AUTO_YOLO=0
      ;;
  esac
done
if [[ "$AUTO_YOLO" == "1" ]]; then
  EXTRA_ARGS+=(--yolo)
fi

if [[ -n "${QODER_BIN:-}" ]]; then
  exec "$QODER_BIN" "${EXTRA_ARGS[@]}" "$@"
fi

TARGET=""
while IFS= read -r cand; do
  [[ -z "$cand" ]] && continue
  cand_real="$(readlink -f "$cand" 2>/dev/null || echo "$cand")"
  if [[ "$cand_real" != "$SELF_PATH" ]]; then
    TARGET="$cand"
    break
  fi
done < <(which -a qoder 2>/dev/null || true)

if [[ -z "$TARGET" ]]; then
  echo "Erro: não encontrei binário real do qoder (defina QODER_BIN se necessário)." >&2
  exit 1
fi

exec "$TARGET" "${EXTRA_ARGS[@]}" "$@"
