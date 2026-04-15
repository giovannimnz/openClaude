#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
ROOT_DIR="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
PID_FILE="$ROOT_DIR/.iflow/gsd-watch.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "Watcher não está rodando (pid file ausente)."
  exit 0
fi

PID="$(cat "$PID_FILE" 2>/dev/null || true)"
if [[ -z "${PID:-}" ]]; then
  rm -f "$PID_FILE"
  echo "PID inválido removido."
  exit 0
fi

if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  sleep 0.2
fi

rm -f "$PID_FILE"
echo "Watcher parado."
