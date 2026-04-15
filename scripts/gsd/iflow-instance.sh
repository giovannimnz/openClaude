#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <1|2|3> [args-do-iflow...]" >&2
  exit 1
fi

INSTANCE="$1"
shift || true

case "$INSTANCE" in
  1|2|3) ;;
  *)
    echo "Instância inválida: $INSTANCE (use 1, 2 ou 3)" >&2
    exit 1
    ;;
esac

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
ROOT_DIR="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
SELF_PATH="$(readlink -f "$0" 2>/dev/null || echo "$0")"

KEY_VAR="IFLOW_API_KEY_${INSTANCE}"
KEY_VAL="${!KEY_VAR:-}"

if [[ -z "$KEY_VAL" ]]; then
  echo "Erro: variável $KEY_VAR não está exportada nesta sessão." >&2
  echo "Dica: adicione/exporte no ~/.zshrc e abra um novo terminal." >&2
  exit 1
fi

if [[ "${GSD_SKIP_SYNC:-0}" != "1" ]]; then
  "$ROOT_DIR/scripts/gsd-sync-clis.sh" --quiet
fi

export IFLOW_HOME="${IFLOW_HOME:-$HOME/.iflow${INSTANCE}}"
export IFLOW_API_KEY="$KEY_VAL"
export IFLOW_SEARCH_API_KEY="$KEY_VAL"
export IFLOW_INSTANCE="$INSTANCE"

node "$ROOT_DIR/scripts/iflow-instance-bootstrap.mjs" --instance "$INSTANCE" >/dev/null

AUTO_YOLO=1
for arg in "$@"; do
  case "$arg" in
    -y|--yolo|--default|--plan)
      AUTO_YOLO=0
      ;;
  esac
done

if [[ -n "${IFLOW_BIN:-}" ]]; then
  if [[ "$AUTO_YOLO" == "1" ]]; then
    exec "$IFLOW_BIN" --yolo "$@"
  fi
  exec "$IFLOW_BIN" "$@"
fi

TARGET=""
while IFS= read -r cand; do
  [[ -z "$cand" ]] && continue
  cand_real="$(readlink -f "$cand" 2>/dev/null || echo "$cand")"
  if [[ "$cand_real" == "$SELF_PATH" ]]; then
    continue
  fi
  if [[ "$cand" == "$HOME/bin/iflow" || "$cand" == "$HOME/.local/bin/iflow" ]]; then
    continue
  fi
  TARGET="$cand"
  break
done < <(which -a iflow 2>/dev/null | awk '!seen[$0]++')

if [[ -z "$TARGET" ]]; then
  NODE_VER="$(node -v 2>/dev/null || true)"
  if [[ -n "$NODE_VER" && -x "$HOME/.nvm/versions/node/$NODE_VER/bin/iflow" ]]; then
    TARGET="$HOME/.nvm/versions/node/$NODE_VER/bin/iflow"
  fi
fi

if [[ -z "$TARGET" ]]; then
  echo "Erro: não consegui localizar o binário real do iflow." >&2
  echo "Defina IFLOW_BIN com o caminho completo do executável." >&2
  exit 1
fi

if [[ "$AUTO_YOLO" == "1" ]]; then
  exec "$TARGET" --yolo "$@"
fi

exec "$TARGET" "$@"
