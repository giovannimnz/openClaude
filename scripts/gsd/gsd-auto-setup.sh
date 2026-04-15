#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_HOOKS=true
INSTALL_LINKS=true
START_WATCH=false
OVERRIDE_BASE_CMDS=true

for arg in "$@"; do
  case "$arg" in
    --no-hooks) INSTALL_HOOKS=false ;;
    --no-links) INSTALL_LINKS=false ;;
    --start-watch) START_WATCH=true ;;
    --no-override) OVERRIDE_BASE_CMDS=false ;;
    *) ;;
  esac
done

ensure_hook_block() {
  local hook_file="$1"
  local marker_start="# >>> gsd-iflow-qoder-sync >>>"
  local marker_end="# <<< gsd-iflow-qoder-sync <<<"
  local block

  block=$(cat <<EOF
$marker_start
PROJECT_DIR="$ROOT_DIR"
if [ -x "\$PROJECT_DIR/scripts/gsd-sync-clis.sh" ]; then
  (cd "\$PROJECT_DIR" && GSD_SKIP_SYNC=1 "\$PROJECT_DIR/scripts/gsd-sync-clis.sh" --quiet >/dev/null 2>&1 || true)
fi
$marker_end
EOF
)

  mkdir -p "$(dirname "$hook_file")"
  if [ ! -f "$hook_file" ]; then
    printf '#!/usr/bin/env bash\nset -e\n\n%s\n' "$block" > "$hook_file"
    chmod +x "$hook_file"
    return
  fi

  if grep -q "$marker_start" "$hook_file"; then
    awk -v s="$marker_start" -v e="$marker_end" '
      $0==s{inblock=1; next}
      $0==e{inblock=0; next}
      !inblock{print}
    ' "$hook_file" > "$hook_file.tmp"
    mv "$hook_file.tmp" "$hook_file"
  fi

  printf '\n%s\n' "$block" >> "$hook_file"
  chmod +x "$hook_file"
}

safe_link() {
  local src="$1"
  local dst="$2"

  mkdir -p "$(dirname "$dst")"

  if [[ -e "$dst" || -L "$dst" ]]; then
    local current=""
    current="$(readlink -f "$dst" 2>/dev/null || true)"
    local desired="$(readlink -f "$src" 2>/dev/null || true)"

    if [[ -n "$current" && -n "$desired" && "$current" == "$desired" ]]; then
      return
    fi

    # Preserve unexpected existing file as backup once
    if [[ ! -L "$dst" ]]; then
      mv "$dst" "$dst.backup.$(date +%s)"
    else
      rm -f "$dst"
    fi
  fi

  ln -s "$src" "$dst"
}

if $INSTALL_LINKS; then
  mkdir -p "$HOME/.local/bin" "$HOME/bin"

  # Explicit commands
  safe_link "$ROOT_DIR/scripts/qoder-gsd.sh" "$HOME/.local/bin/qoder-gsd"
  safe_link "$ROOT_DIR/scripts/iflow-gsd.sh" "$HOME/.local/bin/iflow-gsd"
  safe_link "$ROOT_DIR/scripts/iflow1.sh" "$HOME/.local/bin/iflow1"
  safe_link "$ROOT_DIR/scripts/iflow2.sh" "$HOME/.local/bin/iflow2"
  safe_link "$ROOT_DIR/scripts/iflow3.sh" "$HOME/.local/bin/iflow3"
  safe_link "$ROOT_DIR/scripts/gsd-sync-clis.sh" "$HOME/.local/bin/gsd-sync-clis"
  safe_link "$ROOT_DIR/scripts/gsd-watch-start.sh" "$HOME/.local/bin/gsd-watch-start"
  safe_link "$ROOT_DIR/scripts/gsd-watch-stop.sh" "$HOME/.local/bin/gsd-watch-stop"
  safe_link "$ROOT_DIR/scripts/gsd-watch-status.sh" "$HOME/.local/bin/gsd-watch-status"
  safe_link "$ROOT_DIR/scripts/gsd-browser-headless.sh" "$HOME/.local/bin/gsd-browser"

  safe_link "$ROOT_DIR/scripts/qoder-gsd.sh" "$HOME/bin/qoder-gsd"
  safe_link "$ROOT_DIR/scripts/iflow-gsd.sh" "$HOME/bin/iflow-gsd"
  safe_link "$ROOT_DIR/scripts/iflow1.sh" "$HOME/bin/iflow1"
  safe_link "$ROOT_DIR/scripts/iflow2.sh" "$HOME/bin/iflow2"
  safe_link "$ROOT_DIR/scripts/iflow3.sh" "$HOME/bin/iflow3"
  safe_link "$ROOT_DIR/scripts/gsd-sync-clis.sh" "$HOME/bin/gsd-sync-clis"
  safe_link "$ROOT_DIR/scripts/gsd-watch-start.sh" "$HOME/bin/gsd-watch-start"
  safe_link "$ROOT_DIR/scripts/gsd-watch-stop.sh" "$HOME/bin/gsd-watch-stop"
  safe_link "$ROOT_DIR/scripts/gsd-watch-status.sh" "$HOME/bin/gsd-watch-status"
  safe_link "$ROOT_DIR/scripts/gsd-browser-headless.sh" "$HOME/bin/gsd-browser"

  # Seamless override: plain qoder/iflow run through sync wrappers.
  if $OVERRIDE_BASE_CMDS; then
    safe_link "$ROOT_DIR/scripts/qoder-gsd.sh" "$HOME/bin/qoder"
    safe_link "$ROOT_DIR/scripts/iflow1.sh" "$HOME/bin/iflow"
    echo "[ok] override automático de qoder e iflow->iflow1 ativado via ~/bin"
  fi

  echo "[ok] links em ~/.local/bin e ~/bin criados/atualizados"
fi

if $INSTALL_HOOKS; then
  if git -C "$ROOT_DIR" rev-parse --show-toplevel >/dev/null 2>&1; then
    GIT_ROOT="$(git -C "$ROOT_DIR" rev-parse --show-toplevel)"
    ensure_hook_block "$GIT_ROOT/.git/hooks/post-merge"
    ensure_hook_block "$GIT_ROOT/.git/hooks/post-checkout"
    ensure_hook_block "$GIT_ROOT/.git/hooks/post-rewrite"
    echo "[ok] hooks git instalados em: $GIT_ROOT/.git/hooks"
  else
    echo "[warn] diretório não está em um repositório git; hooks ignorados"
  fi
fi

if $START_WATCH; then
  "$ROOT_DIR/scripts/gsd-watch-start.sh"
fi

echo "Concluído."
echo "Uso transparente: qoder / iflow (iflow = iflow1)."
echo "Múltiplas instâncias: iflow1 / iflow2 / iflow3."
echo "Compatibilidade: qoder-gsd / iflow-gsd."
