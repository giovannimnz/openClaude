/**
 * OpenClaude Fork Custom: GSD (Get Shit Done) Bootstrap
 *
 * On first launch, automatically installs GSD skills into ~/.claude
 * and triggers /gsd-update to ensure the latest version.
 *
 * Detection: checks for ~/.claude/get-shit-done/VERSION file.
 * If missing, runs `npx get-shit-done-cc@latest --claude --global --yes`.
 *
 * This module is designed to survive upstream merges:
 *   - Single file, easy to re-apply via git hook
 *   - sync-fork.sh automatically restores it after merge
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const GSD_VERSION_FILE = join(homedir(), '.claude', 'get-shit-done', 'VERSION')
const GSD_INITIALIZED_MARKER = join(homedir(), '.claude', '.openclaude-gsd-initialized')

let justInstalledGsd = false

/**
 * Check if GSD is already installed in ~/.claude
 */
function isGsdInstalled(): boolean {
  return existsSync(GSD_VERSION_FILE)
}

/**
 * Get the currently installed GSD version
 */
function getInstalledGsdVersion(): string | null {
  if (!existsSync(GSD_VERSION_FILE)) return null
  try {
    return readFileSync(GSD_VERSION_FILE, 'utf8').trim()
  } catch {
    return null
  }
}

/**
 * Install GSD skills into ~/.claude
 */
function installGsd(): boolean {
  try {
    execSync('npx get-shit-done-cc@latest --claude --global --yes', {
      stdio: 'inherit',
      timeout: 120000, // 2 min timeout
    })
    return true
  } catch (err) {
    console.error(
      '[OpenClaude fork] GSD installation failed (non-fatal):',
      err instanceof Error ? err.message : String(err)
    )
    return false
  }
}

/**
 * Mark that GSD bootstrap has been completed
 */
function markGsdInitialized(): void {
  try {
    const claudeDir = join(homedir(), '.claude')
    if (existsSync(claudeDir)) {
      writeFileSync(GSD_INITIALIZED_MARKER, new Date().toISOString())
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Check if GSD bootstrap has already been completed
 */
function isGsdInitialized(): boolean {
  return existsSync(GSD_INITIALIZED_MARKER)
}

/**
 * Main bootstrap function. Call early in startup (init.ts).
 * Installs GSD if not present. Sets flag if this was first install.
 */
export function bootstrapGsd(): void {
  // Already initialized — nothing to do
  if (isGsdInitialized()) {
    return
  }

  const wasAlreadyInstalled = isGsdInstalled()

  if (!wasAlreadyInstalled) {
    console.error('[OpenClaude fork] First launch — installing GSD (get-shit-done) skills...')
    const success = installGsd()
    if (success) {
      justInstalledGsd = true
      console.error('[OpenClaude fork] GSD installed. Running /gsd-update on first launch.')
    }
  }

  markGsdInitialized()
}

/**
 * Returns the slash command to auto-run on first launch.
 * Returns '/gsd-update' if GSD was just installed this session.
 * Returns null otherwise.
 */
export function getFirstLaunchSlashCommand(): string | null {
  return justInstalledGsd ? '/gsd-update' : null
}
