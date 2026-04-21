/**
 * Release script — builds, bumps version, publishes to npm, and creates GitHub release.
 *
 * Usage:
 *   bun run scripts/release.ts              # full release (build + bump + npm publish + gh release)
 *   bun run scripts/release.ts --npm-only   # only bump version + npm publish
 *   bun run scripts/release.ts --gh-only    # only create GitHub release from current version
 *   bun run scripts/release.ts --dry-run    # show what would happen without doing anything
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const REPO_ROOT = join(import.meta.dir, '..')
const PKG_PATH = join(REPO_ROOT, 'package.json')

function run(cmd: string, opts = {}): string {
  return execSync(cmd, { cwd: REPO_ROOT, stdio: 'pipe', ...opts }).toString().trim()
}

function getPackageInfo() {
  return JSON.parse(readFileSync(PKG_PATH, 'utf-8'))
}

function bumpVersion() {
  execSync(`bun run scripts/version-bump.ts`, { cwd: REPO_ROOT, stdio: 'inherit' })
  return getPackageInfo().version
}

function npmPublish(version: string, dryRun: boolean) {
  if (dryRun) {
    console.log(`[dry-run] Would publish ${version} to npm`)
    return
  }
  console.log(`Publishing ${version} to npm...`)
  const output = run(`npm publish --access public 2>&1`)
  console.log(output)
}

function createGitTag(version: string, dryRun: boolean) {
  const tagName = `v${version}`
  if (dryRun) {
    console.log(`[dry-run] Would create tag ${tagName}`)
    return
  }
  // Check if tag already exists
  try {
    run(`git tag -l ${tagName}`)
    const existing = run(`git tag -l ${tagName}`)
    if (existing) {
      console.log(`Tag ${tagName} already exists, skipping`)
      return
    }
  } catch {
    // ignore
  }

  run(`git tag -a ${tagName} -m "Release ${version}"`)
  run(`git push origin ${tagName}`)
  console.log(`Created and pushed tag ${tagName}`)
}

function createGitHubRelease(version: string, dryRun: boolean) {
  const tagName = `v${version}`
  if (dryRun) {
    console.log(`[dry-run] Would create GitHub release ${tagName}`)
    return
  }

  try {
    // Check if release already exists
    run(`gh release view ${tagName} 2>&1`)
    console.log(`Release ${tagName} already exists, skipping`)
    return
  } catch {
    // Release doesn't exist, create it
  }

  console.log(`Creating GitHub release ${tagName}...`)
  run(`gh release create ${tagName} --title "OpenClaude ${version}" --generate-notes`)
  console.log(`Created GitHub release ${tagName}`)
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const npmOnly = args.includes('--npm-only')
  const ghOnly = args.includes('--gh-only')

  if (ghOnly) {
    const pkg = getPackageInfo()
    createGitHubRelease(pkg.version, dryRun)
    return
  }

  // Step 1: Build
  if (!npmOnly) {
    console.log('Building...')
    if (!dryRun) {
      run(`bun run build`, { stdio: 'inherit' })
    } else {
      console.log('[dry-run] Would build')
    }
  }

  // Step 2: Bump version
  console.log('Bumping version...')
  const newVersion = bumpVersion()

  // Step 3: Commit version bump
  if (!dryRun) {
    run(`git add package.json`)
    try {
      run(`git commit -m "chore: bump version to ${newVersion}"`)
    } catch {
      console.log('Nothing to commit or commit failed')
    }
  } else {
    console.log(`[dry-run] Would commit version bump`)
  }

  // Step 4: Publish to npm
  npmPublish(newVersion, dryRun)

  // Step 5: Create git tag and GitHub release
  createGitTag(newVersion, dryRun)
  createGitHubRelease(newVersion, dryRun)

  console.log(dryRun ? '\n(dry run complete — no changes made)' : `\nRelease ${newVersion} complete!`)
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
