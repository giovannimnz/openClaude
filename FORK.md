# Fork Technical Documentation

This document provides comprehensive technical documentation for all changes made to the `giovannimnz/openClaude` fork relative to the upstream `gitlawb/openclaude` repository.

## Table of Contents

- [Version History](#version-history)
- [1. Atius Provider Integration](#1-atius-provider-integration)
- [2. Ollama as Default Provider](#2-ollama-as-default-provider)
- [3. `--dangerously-skip-permissions` by Default](#3-dangerously-skip-permissions-by-default)
- [4. Config Directory Change (`~/.claude`)](#4-config-directory-change-claude)
- [5. GSD (get-shit-done) Integration](#5-gsd-get-shit-done-integration)
- [6. Version Bump System](#6-version-bump-system)
- [7. `claude` Command Entry Point](#7-claude-command-entry-point)
- [8. Provider Flag Remapping](#8-provider-flag-remapping)
- [9. Anthropic API Link Removal](#9-anthropic-api-link-removal)
- [10. Build & Release System](#10-build--release-system)
- [11. Fork Sync Protection](#11-fork-sync-protection)

## Version History

| Fork Version | Upstream | Changes |
|---|---|---|
| `0.5.2.1` | `0.5.2` | Initial fork release with all changes documented here |

## 1. Atius Provider Integration

**Files changed:** `src/components/StartupScreen.ts`

### Problem

The Atius OpenAI-compatible API (`router.atius.com.br/v1`) was not recognized as a distinct provider. When using Atius with a model like "MiniMax-M2.7", the startup screen incorrectly displayed "MiniMax" as the provider name because the model name matched the MiniMax detection pattern.

### Solution

Added Atius provider detection **before** the MiniMax check in the provider detection chain. Detection order matters because model names can contain provider-like keywords.

```typescript
// src/components/StartupScreen.ts (line ~127)
let name = 'OpenAI'
if (/nvidia/i.test(baseUrl) || /nvidia/i.test(rawModel) || process.env.NVIDIA_NIM)
  name = 'NVIDIA NIM'
else if (/router\.atius\.com\.br/i.test(baseUrl) || /atius/i.test(baseUrl))
  name = 'Atius'
else if (/minimax/i.test(baseUrl) || /minimax/i.test(rawModel) || process.env.MINIMAX_API_KEY)
  name = 'MiniMax'
```

### Environment Variables

Atius works with the standard OpenAI-compatible environment variables:

```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_BASE_URL=https://router.atius.com.br/v1
export OPENAI_API_KEY=your-key
export OPENAI_MODEL=your-model
```

## 2. Ollama as Default Provider

**Files changed:** `src/components/StartupScreen.ts`, `src/commands/provider/provider.tsx`

### Problem

The upstream fork defaulted to first-party Anthropic as the primary provider, which requires an Anthropic API key. This is not suitable for users who want local inference.

### Solution

Changed the fallback provider from Anthropic to Ollama (local) across all fallback paths:

```typescript
// src/components/StartupScreen.ts
// Default: Ollama (local) - our fork's default provider
return { name: 'Ollama', model: process.env.OPENAI_MODEL || 'llama3.1:8b', baseUrl: process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1', isLocal: true }
```

```typescript
// src/commands/provider/provider.tsx
// Default: Ollama (our fork's default provider)
return {
  providerLabel: 'Ollama',
  modelLabel: processEnv.OPENAI_MODEL ?? 'llama3.1:8b',
  endpointLabel: processEnv.OPENAI_BASE_URL ?? 'http://localhost:11434/v1',
  savedProfileLabel,
}
```

### Impact

- Users without any provider configured will see Ollama as the default
- No API key required to start using the CLI
- Removes unused imports: `getSettings_DEPRECATED`, `parseUserSpecifiedModel`

## 3. `--dangerously-skip-permissions` by Default

**Files changed:** `bin/openclaude`, `bin/claude`

### Problem

The CLI requires manual permission approval for every tool action (file edits, bash commands, etc.), which interrupts workflow for trusted usage scenarios.

### Solution

Both entry points now automatically add `--dangerously-skip-permissions`:

**`bin/openclaude`** (already had this from upstream):
```bash
exec node "$DIST_PATH" --dangerously-skip-permissions "$@"
```

**`bin/claude`** (added in this fork):
```bash
SKIP_FLAG=true
NEW_ARGS=()
for arg in "$@"; do
  if [[ "$arg" == "--no-skip-permissions" ]]; then
    SKIP_FLAG=false
  else
    NEW_ARGS+=("$arg")
  fi
done

if [[ "$SKIP_FLAG" == true ]]; then
  exec node "$DIST_PATH" --dangerously-skip-permissions "${NEW_ARGS[@]}"
else
  exec node "$DIST_PATH" "${NEW_ARGS[@]}"
fi
```

### Override

Users can re-enable permission prompts with `--no-skip-permissions`:

```bash
openclaude --no-skip-permissions
claude --no-skip-permissions
```

## 4. Config Directory Change (`~/.claude`)

**Files changed:** `src/cli/config.ts` (and related config path resolution)

### Problem

Upstream used `~/.openclaude` for configuration, which conflicts with the original Anthropic Claude CLI's config directory.

### Solution

Changed config directory to `~/.claude` with fallback to `~/.openclaude` if it exists (for migration compatibility).

### Config Files

All configuration is now stored in `~/.claude/`:
- `settings.json` - CLI settings
- `feature-flags.json` - Feature flag overrides
- Provider profiles and credentials

## 5. GSD (get-shit-done) Integration

**Files changed:** Startup initialization, first-run setup

### What is GSD

GSD (get-shit-done) v2.73.1 is a meta-prompting system that provides structured workflow capabilities including phase planning, execution, code review, debugging, and more.

### Integration

- GSD skills are auto-installed on first launch into `~/.claude/`
- GSD auto-runs `/gsd-update` on startup to keep itself current
- GSD commands are available as slash commands (`/gsd-plan-phase`, `/gsd-execute-phase`, etc.)

### GSD Bootstrap Markers

The GSD system uses two markers for bootstrap detection:
1. `VERSION` file - tracks GSD version
2. `.openclaude-gsd-initialized` - marks completion of initial setup

## 6. Version Bump System

**Files created:** `scripts/version-bump.ts`, `scripts/release.ts`
**Files changed:** `scripts/build.ts`, `scripts/sync-fork.sh`, `package.json`, `src/cli/update.ts`

### Problem

After merging upstream changes, there was no systematic way to track the fork's version relative to upstream. Running `bun run update` showed `Previous version: 0.3.0 / New version: 0.3.0` because the version wasn't changing.

### Solution: Suffix Version System

Fork version format: `X.Y.Z.N` where:
- `X.Y.Z` = upstream base version (e.g., `0.5.2`)
- `N` = incremental fork suffix (e.g., `1`, `2`, `3`)

Examples:
- `0.5.2.1` - first fork release on upstream 0.5.2
- `0.5.2.2` - second fork release, upstream still 0.5.2
- `0.6.0.1` - upstream changed to 0.6.0, fork suffix resets to 1

### Version Bump Script (`scripts/version-bump.ts`)

```typescript
function parseForkVersion(version: string): { base: string; suffix: number } {
  const parts = version.split('.')
  if (parts.length === 4) {
    return { base: `${parts[0]}.${parts[1]}.${parts[2]}`, suffix: parseInt(parts[3], 10) }
  }
  return { base: version, suffix: 0 }
}
```

Logic:
1. Fetches upstream version from npm (`@gitlawb/openclaude`)
2. Compares upstream base version with current fork base version
3. If base changed → reset suffix to 1
4. If base unchanged → increment suffix by 1

### NPM Scripts

```json
"version:bump": "bun run scripts/version-bump.ts",
"version:bump:check": "bun run scripts/version-bump.ts --check",
"release": "bun run build && bun run scripts/release.ts",
"release:check": "bun run build && bun run scripts/version-bump.ts --check"
```

### Auto-Bump on Sync

`scripts/sync-fork.sh` automatically runs version-bump after merging upstream changes (step 7/8).

### MACRO.VERSION Fix

Changed from hardcoded `'99.0.0'` to actual package version:

```typescript
// scripts/build.ts (line 120)
'MACRO.VERSION': JSON.stringify(version),
'MACRO.DISPLAY_VERSION': JSON.stringify(version),
```

### Update Command Fix

Removed the block that prevented updates for third-party providers when it's the fork:

```typescript
// src/cli/update.ts (lines 31-37)
export async function update() {
  const isFork = MACRO.PACKAGE_URL && MACRO.PACKAGE_URL.includes('openclaude')
  if (getAPIProvider() !== 'firstParty' && !isFork) {
```

## 7. `claude` Command Entry Point

**Files changed:** `bin/claude`

### Problem

The `bin/claude` entry point was a Node.js ESM loader that didn't include `--dangerously-skip-permissions`. Users who typed `claude` instead of `openclaude` got permission prompts.

### Solution

Converted `bin/claude` from Node.js ESM to a bash wrapper (same pattern as `bin/openclaude`):

```bash
#!/bin/bash
# OpenClaude fork: --dangerously-skip-permissions by default for `claude` command too
# Users can override with --no-skip-permissions
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
PACKAGE_DIR="$(dirname "$(dirname "$SCRIPT_PATH")")"

DIST_PATH="$PACKAGE_DIR/dist/cli.mjs"

if [ ! -f "$DIST_PATH" ]; then
  echo "  claude: dist/cli.mjs not found."
  exit 1
fi

SKIP_FLAG=true
NEW_ARGS=()
for arg in "$@"; do
  if [[ "$arg" == "--no-skip-permissions" ]]; then
    SKIP_FLAG=false
  else
    NEW_ARGS+=("$arg")
  fi
done

if [[ "$SKIP_FLAG" == true ]]; then
  exec node "$DIST_PATH" --dangerously-skip-permissions "${NEW_ARGS[@]}"
else
  exec node "$DIST_PATH" "${NEW_ARGS[@]}"
fi
```

## 8. Provider Flag Remapping

**Files changed:** Provider detection logic

### Changes

| Environment Variable | Routes To | Notes |
|---|---|---|
| `CLAUDE_CODE_USE_GEMINI` | Gemini CLI (OAuth) | Uses browser-based OAuth flow |
| `CLAUDE_CODE_USE_GEMINI_API` | Gemini API (key-based) | Uses API key directly |

## 9. Anthropic API Link Removal

**Files changed:** `src/components/StartupScreen.ts`, `src/commands/provider/provider.tsx`

### Problem

User-facing fallback code referenced `api.anthropic.com` as the default provider endpoint, which is not usable without an Anthropic API key.

### Solution

Replaced all user-facing Anthropic API fallbacks with Ollama:

- `StartupScreen.ts`: Changed fallback from Anthropic to Ollama
- `provider.tsx`: Changed `/provider` command fallback from Anthropic to Ollama

### What Was NOT Changed

- OAuth infrastructure for Claude.ai subscribers (deeply integrated, 96 import references) - this is only used for Claude.ai authentication, not API calls
- Infrastructure code that handles Anthropic response parsing (necessary for OpenAI shim compatibility)
- Test fixtures and mock data

### Files with Protections in sync-fork.sh

Both files have explicit protection in the sync script to prevent upstream from overwriting these changes:
- `src/components/StartupScreen.ts`
- `src/commands/provider/provider.tsx`

## 10. Build & Release System

### Build Command

```bash
bun install
bun run build
```

Build produces `dist/cli.mjs` - a single bundled file.

### Release Command

```bash
bun run release          # Full release: build + bump + npm publish + GitHub release
bun run release:check    # Dry run: build + check version bump
bun run release --npm-only   # npm publish only
bun run release --gh-only    # GitHub release only
bun run release --dry-run    # Full dry run
```

### Release Script (`scripts/release.ts`)

Handles the full release pipeline:
1. Build the project
2. Bump fork version
3. npm publish
4. Create git tag
5. Create GitHub release

### Global Installation

```bash
npm install -g @giovannimnz/openclaude
# or via symlink for development
npm link
```

## 11. Fork Sync Protection

**File:** `scripts/sync-fork.sh`

### Purpose

Protects fork-specific customizations when merging upstream changes.

### Protected Files

The following files have explicit protection logic that either:
1. Skips the file during merge (keeps fork version)
2. Re-applies fork changes after merge
3. Prompts the user before overwriting

| File | Protection Strategy |
|---|---|
| `src/components/StartupScreen.ts` | Re-apply Ollama fallback + Atius detection after merge |
| `src/commands/provider/provider.tsx` | Re-apply Ollama fallback after merge |
| `bin/claude` | Keep bash wrapper (don't revert to Node.js ESM) |
| `package.json` (version) | Auto-bump version after merge |

### Sync Steps

1. Fetch upstream
2. Check for changes
3. Merge upstream
4. Resolve protected files (re-apply fork changes)
5. Run version bump
6. Commit changes
7. Push to fork

### Usage

```bash
./scripts/sync-fork.sh              # Normal sync
./scripts/sync-fork.sh --dry-run    # Preview changes
./scripts/sync-fork.sh --force      # Skip protections
```

## Known Issues

1. **GitHub release creation requires `gh` CLI auth**: The release script uses `gh` for GitHub release creation. Run `gh auth login` first, or create releases manually.

2. **npm view fallback**: If `npm view @gitlawb/openclaude version` fails (e.g., network issue), the version bump script tries to read from git upstream. If both fail, the bump errors out.

3. **Atius detection order**: Atius must be detected before MiniMax in the provider detection chain. If you add a new provider whose name could match an Atius model, add the detection before the conflicting check.

## Troubleshooting

### Version not updating

```bash
bun run version:bump:check    # See what version would be set
bun run version:bump          # Actually bump the version
git diff package.json         # Verify the change
```

### Build fails

```bash
bun install                   # Ensure dependencies are current
bun run build                 # Rebuild
node dist/cli.mjs --version   # Verify the build
```

### Provider not detected

Check environment variables:
```bash
env | grep -E '(OPENAI|ATius|OLLAMA|CLAUDE_CODE_USE)'
```

Verify the detection order in `src/components/StartupScreen.ts`.

### Sync-fork.sh overwrites changes

Run sync again - the protection logic should re-apply fork changes after the merge. If a specific file was missed, add it to the protection list in `sync-fork.sh`.
