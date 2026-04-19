#!/usr/bin/env bash
# openClaude - Installation Script
# Detects and installs required dependencies (node, npm, bun)
# then runs the full project setup.

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
RESET='\033[0m'

# ── Minimum versions ───────────────────────────────────────────
REQUIRED_NODE_MAJOR=20
REQUIRED_BUN_MAJOR=1

# ── Helpers ─────────────────────────────────────────────────────
log_info()  { printf "${CYAN}[INFO]${RESET}  %s\n" "$*"; }
log_ok()    { printf "${GREEN}[OK]${RESET}    %s\n" "$*"; }
log_warn()  { printf "${YELLOW}[WARN]${RESET}  %s\n" "$*"; }
log_error() { printf "${RED}[ERROR]${RESET} %s\n" "$*"; }
log_step()  { printf "${BLUE}[%s/%s]${RESET} %s\n" "$1" "$2" "$3"; }

# Compare semver: returns 0 if $1 >= $2
version_gte() {
  local IFS=.
  local i a=($1) b=($2)
  for ((i = 0; i < ${#b[@]}; i++)); do
    local va=${a[i]:-0}
    local vb=${b[i]:-0}
    if ((va > vb)); then return 0; fi
    if ((va < vb)); then return 1; fi
  done
  return 0
}

get_version() {
  "$1" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1
}

# ── Detect OS / arch ───────────────────────────────────────────
detect_platform() {
  OS="$(uname -s)"
  ARCH="$(uname -m)"

  case "$OS" in
    Linux*)  PLATFORM="linux"  ;;
    Darwin*) PLATFORM="macos"  ;;
    *)       log_error "Unsupported OS: $OS"; exit 1 ;;
  esac

  case "$ARCH" in
    x86_64|amd64)  ARCH="x64"   ;;
    aarch64|arm64) ARCH="arm64" ;;
    *)             log_error "Unsupported architecture: $ARCH"; exit 1 ;;
  esac
}

# ── Package manager helper (Linux only) ────────────────────────
has_cmd() { command -v "$1" &>/dev/null; }

install_via_pkg() {
  if has_cmd apt-get; then
    sudo apt-get update -qq && sudo apt-get install -y -qq "$@"
  elif has_cmd dnf; then
    sudo dnf install -y -q "$@"
  elif has_cmd yum; then
    sudo yum install -y -q "$@"
  elif has_cmd pacman; then
    sudo pacman -Sy --noconfirm "$@"
  elif has_cmd apk; then
    sudo apk add --quiet "$@"
  else
    return 1
  fi
}

# ── Install curl if missing ────────────────────────────────────
ensure_curl() {
  if has_cmd curl; then return 0; fi
  log_warn "curl not found, attempting to install..."
  install_via_pkg curl || {
    log_error "Could not install curl. Please install it manually."
    exit 1
  }
}

# ── Node.js ─────────────────────────────────────────────────────
check_node() {
  if ! has_cmd node; then
    return 1
  fi

  local ver
  ver="$(get_version node)"
  if [ -z "$ver" ]; then return 1; fi

  local major="${ver%%.*}"
  if (( major < REQUIRED_NODE_MAJOR )); then
    log_warn "Node.js $ver found, but >= $REQUIRED_NODE_MAJOR is required."
    return 1
  fi

  log_ok "Node.js $ver detected"
  return 0
}

install_node() {
  log_info "Installing Node.js >= $REQUIRED_NODE_MAJOR ..."
  ensure_curl

  # Try NodeSource setup first (provides latest LTS)
  if [ "$PLATFORM" = "linux" ]; then
    if has_cmd apt-get; then
      curl -fsSL "https://deb.nodesource.com/setup_${REQUIRED_NODE_MAJOR}.x" | sudo -E bash - \
        && sudo apt-get install -y -qq nodejs
    elif has_cmd dnf || has_cmd yum; then
      curl -fsSL "https://rpm.nodesource.com/setup_${REQUIRED_NODE_MAJOR}.x" | sudo -E bash - \
        && install_via_pkg nodejs
    else
      # Fallback: use nvm
      install_node_via_nvm
      return
    fi
  elif [ "$PLATFORM" = "macos" ]; then
    if has_cmd brew; then
      brew install node@${REQUIRED_NODE_MAJOR}
      brew link --overwrite --force node@${REQUIRED_NODE_MAJOR} 2>/dev/null || true
    else
      install_node_via_nvm
      return
    fi
  fi

  if ! check_node; then
    log_warn "NodeSource install may have failed, trying nvm fallback..."
    install_node_via_nvm
  fi
}

install_node_via_nvm() {
  log_info "Installing Node.js via nvm..."
  ensure_curl

  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  fi

  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"

  nvm install "$REQUIRED_NODE_MAJOR" --default
  nvm use "$REQUIRED_NODE_MAJOR"
}

# ── npm ──────────────────────────────────────────────────────────
check_npm() {
  if ! has_cmd npm; then
    return 1
  fi

  local ver
  ver="$(get_version npm)"
  log_ok "npm $ver detected"
  return 0
}

install_npm() {
  log_info "Installing npm..."
  # npm ships with Node, so if node is present npm should be too.
  # If it's somehow missing, install it via corepack or the package manager.
  if has_cmd corepack; then
    corepack enable npm 2>/dev/null || true
  fi

  if ! has_cmd npm; then
    install_via_pkg npm 2>/dev/null || {
      log_error "Could not install npm. It should come bundled with Node.js."
      log_error "Try reinstalling Node.js."
      exit 1
    }
  fi
}

# ── Bun ──────────────────────────────────────────────────────────
check_bun() {
  if ! has_cmd bun; then
    return 1
  fi

  local ver
  ver="$(get_version bun)"
  if [ -z "$ver" ]; then return 1; fi

  local major="${ver%%.*}"
  if (( major < REQUIRED_BUN_MAJOR )); then
    log_warn "Bun $ver found, but >= $REQUIRED_BUN_MAJOR is required."
    return 1
  fi

  log_ok "Bun $ver detected"
  return 0
}

install_bun() {
  log_info "Installing Bun..."
  ensure_curl
  curl -fsSL https://bun.sh/install | bash

  # Source the updated shell profile so bun is available in this session
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"

  if ! has_cmd bun; then
    log_error "Bun installation failed. Please install manually: https://bun.sh"
    exit 1
  fi
}

# ── Main ─────────────────────────────────────────────────────────
main() {
  local TOTAL_STEPS=5

  printf "\n"
  printf "${CYAN}========================================================${RESET}\n"
  printf "${CYAN}           openClaude - Install Script                  ${RESET}\n"
  printf "${CYAN}========================================================${RESET}\n"
  printf "\n"

  detect_platform
  log_info "Platform: $PLATFORM ($ARCH)"
  printf "\n"

  # ── Step 1: Check / install Node.js ──────────────────────────
  log_step 1 "$TOTAL_STEPS" "Checking Node.js (>= $REQUIRED_NODE_MAJOR) ..."
  if ! check_node; then
    install_node
    check_node || { log_error "Node.js installation failed."; exit 1; }
  fi
  printf "\n"

  # ── Step 2: Check / install npm ──────────────────────────────
  log_step 2 "$TOTAL_STEPS" "Checking npm ..."
  if ! check_npm; then
    install_npm
    check_npm || { log_error "npm installation failed."; exit 1; }
  fi
  printf "\n"

  # ── Step 3: Check / install Bun ──────────────────────────────
  log_step 3 "$TOTAL_STEPS" "Checking Bun (>= $REQUIRED_BUN_MAJOR) ..."
  if ! check_bun; then
    install_bun
    check_bun || { log_error "Bun installation failed."; exit 1; }
  fi
  printf "\n"

  # ── Step 4: Install dependencies ─────────────────────────────
  log_step 4 "$TOTAL_STEPS" "Installing dependencies (bun install) ..."
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$SCRIPT_DIR"

  bun install
  log_ok "Dependencies installed"
  printf "\n"

  # ── Step 5: Run full setup ───────────────────────────────────
  log_step 5 "$TOTAL_STEPS" "Running project setup ..."
  bun run scripts/setup/install.ts
  printf "\n"

  printf "${GREEN}========================================================${RESET}\n"
  printf "${GREEN}           Installation complete!                       ${RESET}\n"
  printf "${GREEN}========================================================${RESET}\n"
  printf "\n"
  printf "  Start openClaude:  ${YELLOW}node dist/cli.mjs${RESET}\n"
  printf "  Or via wrapper:    ${YELLOW}./bin/openclaude${RESET}\n"
  printf "\n"
}

main "$@"
