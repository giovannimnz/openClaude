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
echo "[5/7] Merging upstream/$BRANCH into $BRANCH..."
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

  # Restore fork-specific overrides after merge
  echo ""
  echo "[6/7] Restoring fork provider overrides..."
  if [[ "$DRY_RUN" == true ]]; then
    echo "  (skipped - dry run)"
  else
    # Re-apply forkProviderOverrides.ts if it exists (our custom override)
    if [[ -f "src/utils/forkProviderOverrides.ts" ]]; then
      echo "  forkProviderOverrides.ts exists, checking integrity..."
      if ! grep -q "applyForkProviderOverrides" src/utils/forkProviderOverrides.ts 2>/dev/null; then
        echo "  WARNING: forkProviderOverrides.ts was overwritten by merge!"
        echo "  Restoring from git..."
        git checkout HEAD -- src/utils/forkProviderOverrides.ts 2>/dev/null || echo "  Could not restore, file not in our history"
      fi
    fi

    # Re-integrate override into cli.tsx entrypoint
    echo "  Checking cli.tsx entrypoint integration..."
    if ! grep -q "applyForkProviderOverrides" src/entrypoints/cli.tsx 2>/dev/null; then
      echo "  WARNING: cli.tsx fork override integration was lost!"
      echo "  Re-applying..."
      if grep -q "applyProviderFlagFromArgs" src/entrypoints/cli.tsx 2>/dev/null; then
        # Find the closing brace of the --provider block and add our override after it
        sed -i '/applyProviderFlagFromArgs/,/^  }/{
          /^  }/a\
\
  // OpenClaude fork: remap CLAUDE_CODE_USE_GEMINI -> Gemini CLI,\
  // CLAUDE_CODE_USE_GEMINI_API -> Gemini API\
  {\
    const { applyForkProviderOverrides } = await import('\''../utils/forkProviderOverrides.js'\'');\
    applyForkProviderOverrides();\
  }
        }' src/entrypoints/cli.tsx
        git add src/entrypoints/cli.tsx
      fi
    fi

    # Re-apply providerFlag.ts changes
    echo "  Checking providerFlag.ts fork mappings..."
    if grep -q "case 'gemini':" src/utils/providerFlag.ts 2>/dev/null; then
      if ! grep -A2 "case 'gemini':" src/utils/providerFlag.ts | grep -q "CLAUDE_CODE_USE_GEMINI_CLI"; then
        echo "  WARNING: gemini case in providerFlag.ts was overwritten!"
        sed -i "/case 'gemini':/{n;s/.*/      \/\/ OpenClaude fork: gemini flag routes to Gemini CLI (OAuth)\n      process.env.CLAUDE_CODE_USE_GEMINI_CLI = '1'/}" src/utils/providerFlag.ts
        git add src/utils/providerFlag.ts
      fi
    fi
    if grep -q "case 'gemini-api':" src/utils/providerFlag.ts 2>/dev/null; then
      if ! grep -A2 "case 'gemini-api':" src/utils/providerFlag.ts | grep -q "CLAUDE_CODE_USE_GEMINI = '1'"; then
        echo "  WARNING: gemini-api case in providerFlag.ts was overwritten!"
        sed -i "/case 'gemini-api':/{n;s/.*/      \/\/ OpenClaude fork: gemini-api routes to Gemini API (key-based)\n      process.env.CLAUDE_CODE_USE_GEMINI = '1'/}" src/utils/providerFlag.ts
        git add src/utils/providerFlag.ts
      fi
    fi
    if ! grep -q "'gemini-api'" src/utils/providerFlag.ts 2>/dev/null; then
      echo "  WARNING: gemini-api missing from VALID_PROVIDERS!"
      sed -i "s/'gemini',/'gemini',\n  'gemini-api',/" src/utils/providerFlag.ts
      git add src/utils/providerFlag.ts
    fi

    # Commit the restored overrides if anything was changed
    if git diff --cached --quiet 2>/dev/null; then
      echo "  All fork overrides intact, no changes needed."
    else
      echo "  Committing restored fork overrides..."
      git commit -m "chore: restore fork provider overrides after upstream merge" 2>/dev/null || true
    fi

    # Restore ~/.claude as default config dir (envUtils.ts)
    echo "  Checking envUtils.ts config dir default..."
    if ! grep -q "OpenClaude fork: ~/.claude is the canonical default" src/utils/envUtils.ts 2>/dev/null; then
      echo "  WARNING: envUtils.ts was overwritten by merge! Restoring ~/.claude default..."
      if grep -q "resolveClaudeConfigHomeDir" src/utils/envUtils.ts 2>/dev/null; then
        # Replace the entire function with our fork version
        python3 -c "
import re, sys
with open('src/utils/envUtils.ts', 'r') as f:
    content = f.read()

old_func = re.compile(
    r'export function resolveClaudeConfigHomeDir\(options\?: \{[^}]+\}\): string \{.*?return openClaudeDir\.normalize\(\"NFC\"\)\n\}',
    re.DOTALL
)

new_func = '''export function resolveClaudeConfigHomeDir(options?: {
  configDirEnv?: string
  homeDir?: string
  claudeExists?: boolean
  openClaudeExists?: boolean
}): string {
  if (options?.configDirEnv) {
    return options.configDirEnv.normalize('NFC')
  }

  const homeDir = options?.homeDir ?? homedir()
  const claudeDir = join(homeDir, '.claude')
  const openClaudeDir = join(homeDir, '.openclaude')
  const claudeExists =
    options?.claudeExists ?? existsSync(claudeDir)
  const openClaudeExists =
    options?.openClaudeExists ?? existsSync(openClaudeDir)

  // OpenClaude fork: ~/.claude is the canonical default.
  // Fall back to ~/.openclaude only if it exists and ~/.claude does not.
  if (!claudeExists && openClaudeExists) {
    return openClaudeDir.normalize('NFC')
  }

  return claudeDir.normalize('NFC')
}'''

content = old_func.sub(new_func, content)
with open('src/utils/envUtils.ts', 'w') as f:
    f.write(content)
"
        git add src/utils/envUtils.ts
        git commit -m "chore: restore ~/.claude as default config dir after upstream merge" 2>/dev/null || true
      fi
    fi
  fi
fi

# Push to origin
echo "[7/7] Pushing to origin..."
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
