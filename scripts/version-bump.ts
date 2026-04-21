/**
 * Version bump script — syncs fork version with upstream + incremental suffix.
 *
 * Logic:
 * 1. Fetch upstream version from npm (@gitlawb/openclaude)
 * 2. Read current package.json version
 * 3. If upstream base version changed (e.g. 0.5.2 -> 0.6.0), reset suffix to .1
 * 4. If upstream base version same, increment suffix (e.g. 0.5.2.3 -> 0.5.2.4)
 * 5. Write new version to package.json
 *
 * Usage:
 *   bun run scripts/version-bump.ts          # auto-increment
 *   bun run scripts/version-bump.ts --check  # show what would happen, no write
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const REPO_ROOT = join(import.meta.dir, '..')
const PKG_PATH = join(REPO_ROOT, 'package.json')
const UPSTREAM_PACKAGE = '@gitlawb/openclaude'

function parseForkVersion(version: string): { base: string; suffix: number } {
  // Fork version format: X.Y.Z.N where N is the fork suffix
  // Or X.Y.Z if no suffix yet
  const parts = version.split('.')
  if (parts.length === 4) {
    return { base: `${parts[0]}.${parts[1]}.${parts[2]}`, suffix: parseInt(parts[3], 10) }
  }
  return { base: version, suffix: 0 }
}

function getUpstreamVersion(): string {
  try {
    const result = execSync(`npm view ${UPSTREAM_PACKAGE} version`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return result.trim()
  } catch {
    console.error('Warning: Could not fetch upstream version from npm')
    // Fallback: try fetching from git upstream
    try {
      const pkgRaw = execSync(
        'git show upstream:package.json 2>/dev/null || git show upstream/main:package.json 2>/dev/null',
        { encoding: 'utf-8', cwd: REPO_ROOT, stdio: ['pipe', 'pipe', 'pipe'] }
      )
      const upstreamPkg = JSON.parse(pkgRaw)
      if (upstreamPkg.version) return upstreamPkg.version
    } catch {
      // ignore
    }
    throw new Error('Unable to determine upstream version')
  }
}

async function main() {
  const checkOnly = process.argv.includes('--check')

  const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8'))
  const currentVersion = pkg.version
  const upstreamVersion = getUpstreamVersion()

  const { base: currentBase, suffix: currentSuffix } = parseForkVersion(currentVersion)

  let newSuffix: number
  if (currentBase !== upstreamVersion) {
    // Upstream base changed — reset suffix to 1
    newSuffix = 1
    console.log(`Upstream base changed: ${currentBase} -> ${upstreamVersion}`)
  } else {
    // Same upstream base — increment suffix
    newSuffix = currentSuffix + 1
    console.log(`Upstream base unchanged: ${upstreamVersion}`)
  }

  const newVersion = `${upstreamVersion}.${newSuffix}`

  console.log(`Current version:  ${currentVersion}`)
  console.log(`Upstream version: ${upstreamVersion}`)
  console.log(`New fork version: ${newVersion}`)

  if (checkOnly) {
    console.log('\n(Dry run — no changes made)')
    return
  }

  // Write new version to package.json
  pkg.version = newVersion
  writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n')

  console.log(`\nUpdated package.json to ${newVersion}`)
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
