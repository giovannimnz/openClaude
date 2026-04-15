#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
ROOT_DIR="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
UPDATE_SOURCE=false
QUIET=false

for arg in "$@"; do
  case "$arg" in
    --update-source) UPDATE_SOURCE=true ;;
    --quiet) QUIET=true ;;
    *) ;;
  esac
done

log() {
  if ! $QUIET; then
    echo "$1"
  fi
}

if ! command -v node >/dev/null 2>&1; then
  echo "Erro: node não encontrado no PATH." >&2
  exit 1
fi

mkdir -p "$ROOT_DIR/.iflow"
LOCK_DIR="$ROOT_DIR/.iflow/.gsd-sync.lock"
acquired=false

for _ in {1..50}; do
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    acquired=true
    break
  fi
  sleep 0.1
done

if ! $acquired; then
  echo "Erro: não consegui adquirir lock de sync em $LOCK_DIR" >&2
  exit 1
fi

BRIDGE_LOG_FILE=""

cleanup() {
  rm -rf "$LOCK_DIR" 2>/dev/null || true
  if [[ -n "$BRIDGE_LOG_FILE" && -f "$BRIDGE_LOG_FILE" ]]; then
    rm -f "$BRIDGE_LOG_FILE" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if $UPDATE_SOURCE; then
  log "[1/3] Atualizando GSD fonte em .claude (local)..."
  (cd "$ROOT_DIR" && npx -y get-shit-done-cc@latest --claude --local)
else
  log "[1/3] Pulando update da fonte (.claude)."
fi

log "[2/3] Gerando bridge iFlow (.iflow) a partir de .claude..."
BRIDGE_LOG_FILE="$(mktemp -t gsd-bridge.XXXXXX.log)"
(cd "$ROOT_DIR" && node scripts/gsd-iflow-bridge.mjs >"$BRIDGE_LOG_FILE")
if ! $QUIET; then
  cat "$BRIDGE_LOG_FILE"
fi

log "[3/4] Qoder usa .claude diretamente com --with-claude-config"

log "[4/4] Sincronizando contexto GSD → Qwen..."
if [[ -x "$ROOT_DIR/scripts/gsd-qwen-bridge.mjs" ]]; then
  node "$ROOT_DIR/scripts/gsd-qwen-bridge.mjs" 2>/dev/null || log "  (aviso: sincronização Qwen falhou, continuando)"
else
  log "  (bridge Qwen não encontrado, pulando)"
fi

log "Pronto."

if ! $QUIET; then
  echo ""
  echo "Uso recomendado:"
  echo "  - Qoder:  ./scripts/qoder-gsd.sh -w '$ROOT_DIR'"
  echo "  - iFlow:  ./scripts/iflow-gsd.sh"
  echo "  - Qwen:   ./scripts/qwen-gsd.sh"
fi
