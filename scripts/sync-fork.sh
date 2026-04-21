#!/usr/bin/env bash
#
# sync-fork.sh - Automatically sync this fork with the upstream repository
# Usage: ./scripts/sync-fork.sh [--strategy ours|theirs] [--dry-run]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

UPSTREAM_URL="${UPSTREAM_URL:-https://github.com/gitlawb/openclaude.git}"
UPSTREAM_NAME="upstream"
BRANCH="${SYNC_BRANCH:-main}"
STRATEGY="${SYNC_STRATEGY:-theirs}"  # theirs = prefer upstream, ours = prefer fork
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --strategy) STRATEGY="$2"; shift 2 ;;
    --strategy=*) STRATEGY="${1#*=}"; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --branch=*) BRANCH="${1#*=}"; shift ;;
    -h|--help)
      echo "Usage: $0 [--strategy ours|theirs] [--branch <branch>] [--dry-run]"
      echo ""
      echo "Options:"
      echo "  --strategy   Conflict resolution: 'theirs' (prefer upstream, default) or 'ours' (prefer fork)"
      echo "  --branch     Branch to sync (default: main)"
      echo "  --dry-run    Show what would be done without making changes"
      echo "  -h, --help   Show this help message"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

cd "$REPO_ROOT"

echo "=== OpenClaude Fork Sync ==="
echo "Upstream:  $UPSTREAM_URL"
echo "Branch:    $BRANCH"
echo "Strategy:  $STRATEGY (conflict resolution)"
echo "Dry run:   $DRY_RUN"
echo ""

# Add upstream remote if it doesn't exist
if ! git remote | grep -q "^${UPSTREAM_NAME}$"; then
  echo "[1/6] Adding upstream remote: $UPSTREAM_NAME -> $UPSTREAM_URL"
  [[ "$DRY_RUN" == true ]] || git remote add "$UPSTREAM_NAME" "$UPSTREAM_URL"
else
  CURRENT_URL="$(git remote get-url "$UPSTREAM_NAME")"
  echo "[1/6] Upstream remote already exists: $UPSTREAM_NAME -> $CURRENT_URL"
  [[ "$DRY_RUN" == true ]] || git remote set-url "$UPSTREAM_NAME" "$UPSTREAM_URL"
fi

# Fetch upstream
echo "[2/6] Fetching from upstream..."
[[ "$DRY_RUN" == true ]] && echo "  (skipped - dry run)" || git fetch "$UPSTREAM_NAME" --prune

# Check current branch
CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  echo "[3/6] Switching to branch: $BRANCH (currently on: $CURRENT_BRANCH)"
  [[ "$DRY_RUN" == true ]] && echo "  (skipped - dry run)" || git checkout "$BRANCH"
else
  echo "[3/6] Already on branch: $BRANCH"
fi

# Pull latest from origin
echo "[4/6] Pulling latest from origin..."
if [[ "$DRY_RUN" == true ]]; then
  echo "  (skipped - dry run)"
else
  git pull origin "$BRANCH" --rebase || {
    echo "ERROR: Failed to pull from origin. Resolve conflicts first."
    exit 1
  }
fi

# Merge from upstream with auto-resolution
echo "[5/6] Merging upstream/$BRANCH into $BRANCH..."
if [[ "$DRY_RUN" == true ]]; then
  echo "  (skipped - dry run)"
else
  MERGE_OUTPUT="$(git merge "$UPSTREAM_NAME/$BRANCH" --no-edit -X "$STRATEGY" 2>&1)" || {
    echo ""
    echo "WARNING: Merge had conflicts. Manual intervention needed."
    echo "Merge output: $MERGE_OUTPUT"
    echo ""
    echo "To continue manually:"
    echo "  1. Fix conflicts: git status"
    echo "  2. Stage fixes:    git add <files>"
    echo "  3. Complete merge: git commit"
    echo "  4. Push:           git push origin $BRANCH"
    echo ""
    echo "Or abort: git merge --abort"
    exit 1
  }
  echo "  $MERGE_OUTPUT"
fi

# Push to origin
echo "[6/6] Pushing to origin..."
if [[ "$DRY_RUN" == true ]]; then
  echo "  (skipped - dry run)"
else
  # Check if there's anything to push
  BEHIND="$(git rev-list --count "origin/$BRANCH..HEAD" 2>/dev/null || echo "0")"
  if [[ "$BEHIND" -eq 0 ]]; then
    echo "  Already up to date, nothing to push."
  else
    echo "  Pushing $BEHIND commit(s) to origin/$BRANCH..."
    git push origin "$BRANCH"
  fi
fi

echo ""
echo "=== Sync complete! ==="
if [[ "$DRY_RUN" == true ]]; then
  echo "(Dry run - no changes were made)"
fi
