#!/usr/bin/env tsx
/**
 * openClaude Update Script
 * 
 * Updates the installation by:
 * - Pulling latest changes from git
 * - Updating dependencies
 * - Rebuilding the project
 * - Cleaning old caches
 * 
 * Usage: bun run update
 */

import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { platform } from 'node:os'
import { spawn } from 'node:child_process'

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
}

function log(message: string, color = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`)
}

function logStep(step: number, total: number, message: string): void {
  log(`[${step}/${total}] ${message}`, colors.cyan)
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  silent = false
): Promise<{ success: boolean; stdout?: string; stderr?: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: silent ? 'pipe' : 'inherit',
      shell: process.platform === 'win32',
    })

    let stdout = ''
    let stderr = ''

    if (silent && child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })
    }

    if (silent && child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })
    }

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        stdout: stdout || undefined,
        stderr: stderr || undefined,
      })
    })
  })
}

async function checkGitStatus(): Promise<{ isRepo: boolean; hasChanges: boolean; stashNeeded: boolean }> {
  const result = await runCommand('git', ['status', '--porcelain'], process.cwd(), true)
  
  if (!result.success) {
    return { isRepo: false, hasChanges: false, stashNeeded: false }
  }

  const hasChanges = result.stdout && result.stdout.trim().length > 0
  
  return {
    isRepo: true,
    hasChanges,
    stashNeeded: hasChanges,
  }
}

async function stashChanges(): Promise<{ success: boolean; stashName: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const stashName = `auto-stash-before-update-${timestamp}`
  
  log(`Stashing local changes as "${stashName}"...`, colors.yellow)
  
  // Create stash with name
  const stashResult = await runCommand('git', ['stash', 'push', '-m', stashName], process.cwd(), false)
  
  if (!stashResult.success) {
    log('❌ Failed to stash changes', colors.red)
    return { success: false, stashName }
  }
  
  log('✅ Changes stashed successfully', colors.green)
  log(`💡 To restore stashed changes later, run: git stash pop`, colors.blue)
  
  return { success: true, stashName }
}

async function restoreStashedChanges(): Promise<boolean> {
  log('Restoring stashed changes...', colors.yellow)
  
  const result = await runCommand('git', ['stash', 'pop'], process.cwd(), false)
  
  if (!result.success) {
    log('❌ Failed to restore stashed changes', colors.red)
    log('💡 You can manually restore with: git stash pop', colors.yellow)
    return false
  }
  
  log('✅ Stashed changes restored successfully', colors.green)
  return true
}

async function getCurrentBranch(): Promise<string> {
  const result = await runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD'], process.cwd(), true)
  return result.success && result.stdout ? result.stdout.trim() : 'main'
}

async function getCurrentVersion(): Promise<string> {
  try {
    const packageJsonPath = join(process.cwd(), 'package.json')
    const { readFileSync } = await import('node:fs')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
    return packageJson.version || 'unknown'
  } catch {
    return 'unknown'
  }
}

async function getLatestVersion(): Promise<string> {
  const result = await runCommand(
    'git',
    ['describe', '--tags', '--abbrev=0'],
    process.cwd(),
    true
  )
  return result.success && result.stdout ? result.stdout.trim() : 'unknown'
}

async function cleanCaches(projectRoot: string): Promise<void> {
  const caches = [
    'node_modules/.cache',
    '.turbo',
    'dist',
    'coverage',
  ]

  log('Cleaning caches...', colors.yellow)
  
  const { rm } = await import('node:fs/promises')
  for (const cache of caches) {
    const cachePath = join(projectRoot, cache)
    if (existsSync(cachePath)) {
      try {
        await rm(cachePath, { recursive: true, force: true })
        log(`  Removed: ${cache}`, colors.green)
      } catch (error) {
        log(`  Skipped: ${cache} (${error})`, colors.yellow)
      }
    }
  }
}

async function verifyUpdate(projectRoot: string): Promise<boolean> {
  const requiredFiles = [
    'dist/cli.mjs',
    'package.json',
    'node_modules',
  ]

  for (const file of requiredFiles) {
    if (!existsSync(join(projectRoot, file))) {
      log(`Missing required file: ${file}`, colors.red)
      return false
    }
  }

  // Quick smoke test
  const testResult = await runCommand('node', ['dist/cli.mjs', '--version'], projectRoot, true)
  if (!testResult.success) {
    log('Smoke test failed', colors.red)
    return false
  }

  return true
}

async function backupConfig(): Promise<void> {
  const configPath = join(process.cwd(), 'package.json')
  const backupPath = join(process.cwd(), 'package.json.backup')
  
  try {
    const { readFileSync, copyFile } = await import('node:fs/promises')
    await copyFile(configPath, backupPath)
    log(`Backed up package.json to package.json.backup`, colors.green)
  } catch (error) {
    log(`Warning: Could not backup config: ${error}`, colors.yellow)
  }
}

async function main(): Promise<void> {
  const projectRoot = process.cwd()
  const totalSteps = 6
  let stashedChanges = false
  let stashName = ''

  log('╔════════════════════════════════════════════════════════════╗', colors.cyan)
  log('║           openClaude Update Script                         ║', colors.cyan)
  log('╚════════════════════════════════════════════════════════════╝', colors.cyan)
  log('')

  try {
    // Check git status
    logStep(1, totalSteps, 'Checking git status...')
    const gitStatus = await checkGitStatus()
    
    if (!gitStatus.isRepo) {
      log('❌ Not a git repository. Update requires git.', colors.red)
      log('💡 You can manually update by cloning the latest version:', colors.yellow)
      log('   git clone https://github.com/giovannimnz/openClaude.git', colors.yellow)
      process.exit(1)
    }

    if (gitStatus.hasChanges) {
      log('⚠️  You have uncommitted changes!', colors.yellow)
      log('Automatically stashing changes to continue with update...', colors.cyan)
      
      const stashResult = await stashChanges()
      if (!stashResult.success) {
        log('❌ Failed to stash changes. Update aborted.', colors.red)
        log('💡 You can manually stash with: git stash', colors.yellow)
        process.exit(1)
      }
      
      stashedChanges = true
      stashName = stashResult.stashName
      log('✅ Changes stashed automatically', colors.green)
    }

    const currentBranch = await getCurrentBranch()
    const currentVersion = await getCurrentVersion()
    const latestVersion = await getLatestVersion()

    log(`  Repository: ${gitStatus.isRepo ? '✅ Valid' : '❌ Invalid'}`, gitStatus.isRepo ? colors.green : colors.red)
    log(`  Branch: ${currentBranch}`, colors.blue)
    log(`  Current version: ${currentVersion}`, colors.blue)
    log(`  Latest version: ${latestVersion}`, colors.blue)
    if (stashedChanges) {
      log(`  🗄️  Stashed: ${stashName}`, colors.yellow)
    }
    log('✅ Git status OK', colors.green)
    log('')

    // Backup config
    logStep(2, totalSteps, 'Backing up configuration...')
    await backupConfig()
    log('✅ Configuration backed up', colors.green)
    log('')

    // Pull latest changes
    logStep(3, totalSteps, 'Pulling latest changes...')
    const pullSuccess = await runCommand('git', ['pull', 'origin', currentBranch], projectRoot)
    if (!pullSuccess) {
      log('❌ Failed to pull latest changes', colors.red)
      process.exit(1)
    }
    log('✅ Latest changes pulled', colors.green)
    log('')

    // Update dependencies
    logStep(4, totalSteps, 'Updating dependencies...')
    const depsSuccess = await runCommand('bun', ['install'], projectRoot)
    if (!depsSuccess) {
      log('❌ Failed to update dependencies', colors.red)
      process.exit(1)
    }
    log('✅ Dependencies updated', colors.green)
    log('')

    // Clean caches and rebuild
    logStep(5, totalSteps, 'Cleaning caches and rebuilding...')
    await cleanCaches(projectRoot)
    
    const buildSuccess = await runCommand('bun', ['run', 'build'], projectRoot)
    if (!buildSuccess) {
      log('❌ Failed to rebuild project', colors.red)
      process.exit(1)
    }
    log('✅ Build completed', colors.green)
    log('')

    // Verify update
    logStep(6, totalSteps, 'Verifying update...')
    const verified = await verifyUpdate(projectRoot)
    if (!verified) {
      log('❌ Update verification failed', colors.red)
      log('💡 You can restore the backup: cp package.json.backup package.json', colors.yellow)
      process.exit(1)
    }
    log('✅ Update verified', colors.green)
    log('')

    // Get new version
    const newVersion = await getCurrentVersion()

    // Success message
    log('╔════════════════════════════════════════════════════════════╗', colors.green)
    log('║           Update Successful! 🎉                              ║', colors.green)
    log('╚════════════════════════════════════════════════════════════╝', colors.green)
    log('')
    log('📋 Summary:', colors.blue)
    log(`  📁 Project location: ${projectRoot}`, colors.yellow)
    log(`  📦 Previous version: ${currentVersion}`, colors.yellow)
    log(`  ✨ New version: ${newVersion}`, colors.yellow)
    if (currentVersion !== newVersion) {
      log(`  🔄 Updated from ${currentVersion} to ${newVersion}`, colors.magenta)
    }
    if (stashedChanges) {
      log(`  🗄️  Stashed changes: ${stashName}`, colors.yellow)
      log(`  💡 Restore with: git stash pop`, colors.blue)
    }
    log('')
    log('🚀 You can now use the updated version:', colors.blue)
    log('  node dist/cli.mjs', colors.yellow)
    log('')
    log('📚 Check what\'s new:', colors.blue)
    log('  git log --oneline @{1}..HEAD', colors.yellow)
    log('')
    log('💡 Tips:', colors.blue)
    log('  - Review the changelog for new features', colors.yellow)
    log('  - Update your provider profiles if needed', colors.yellow)
    log('  - Run diagnostics: bun run doctor:runtime', colors.yellow)
    log('')
  } finally {
    // Restore stashed changes if they were stashed
    if (stashedChanges) {
      log('')
      log('🔄 Restoring stashed changes...', colors.cyan)
      await restoreStashedChanges()
    }
  }
}

main().catch((error) => {
  log(`❌ Update failed: ${error}`, colors.red)
  process.exit(1)
})
