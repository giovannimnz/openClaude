/**
 * Setup OpenClaude Command Wrappers
 * 
 * Creates symbolic links and sets up executable permissions
 * for easy command-line access to openclaude
 */

import { stat, chmod, symlink, unlink } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const binDir = join(projectRoot, 'bin')

/**
 * Check if running on Windows
 */
function isWindows(): boolean {
  return process.platform === 'win32'
}

/**
 * Check if running as admin/root
 */
async function isAdmin(): Promise<boolean> {
  if (isWindows()) {
    try {
      await execAsync('net session', { windowsHide: true })
      return true
    } catch {
      return false
    }
  } else {
    return process.getuid?.() === 0 || false
  }
}

/**
 * Setup Unix/Linux/macOS wrappers
 */
async function setupUnixWrappers(): Promise<void> {
  console.log('Setting up Unix/Linux/macOS wrappers...')
  
  const wrappers = ['openclaude', 'openclaude.sh']
  
  for (const wrapper of wrappers) {
    const wrapperPath = join(binDir, wrapper)
    
    try {
      // Make executable
      await chmod(wrapperPath, 0o755)
      console.log(`✓ Made ${wrapper} executable`)
      
      // Create symlink in /usr/local/bin if we have permissions
      const globalBinPath = '/usr/local/bin/openclaude'
      if (!existsSync(globalBinPath) && await isAdmin()) {
        try {
          await unlink(globalBinPath).catch(() => {}) // Remove if exists
          await symlink(wrapperPath, globalBinPath)
          console.log(`✓ Created symlink at ${globalBinPath}`)
        } catch (error) {
          console.log(`ℹ Could not create symlink (requires sudo): ${error}`)
        }
      }
    } catch (error) {
      console.log(`✗ Error setting up ${wrapper}: ${error}`)
    }
  }
  
  console.log('\nTo use openclaude command globally, run:')
  console.log('  sudo ln -sf $(pwd)/bin/openclaude /usr/local/bin/openclaude')
  console.log('\nOr add to your PATH:')
  console.log('  export PATH="$(pwd)/bin:$PATH"')
}

/**
 * Setup Windows wrappers
 */
async function setupWindowsWrappers(): Promise<void> {
  console.log('Setting up Windows wrappers...')
  
  const wrappers = ['openclaude.bat', 'openclaude.ps1']
  
  for (const wrapper of wrappers) {
    const wrapperPath = join(binDir, wrapper)
    
    try {
      if (existsSync(wrapperPath)) {
        console.log(`✓ ${wrapper} ready`)
      }
    } catch (error) {
      console.log(`✗ Error checking ${wrapper}: ${error}`)
    }
  }
  
  console.log('\nTo use openclaude command:')
  console.log('1. Add bin directory to PATH:')
  console.log(`   set PATH=%PATH%;${binDir}`)
  console.log('\n2. Or create a global symlink (requires admin):')
  console.log(`   mklink openclaude.bat ${binDir}\\openclaude.bat`)
  console.log(`   mklink openclaude.ps1 ${binDir}\\openclaude.ps1`)
}

/**
 * Main setup function
 */
async function main() {
  console.log('🚀 OpenClaude Command Setup')
  console.log('='.repeat(40))
  
  if (isWindows()) {
    await setupWindowsWrappers()
  } else {
    await setupUnixWrappers()
  }
  
  console.log('\n✓ Setup complete!')
  console.log('\nYou can now use:')
  console.log('  openclaude        # from project directory')
  console.log('  ./bin/openclaude  # explicit path')
  console.log('\nOr build first:')
  console.log('  bun run build')
  console.log('\nThen test:')
  console.log('  openclaude --version')
}

main().catch(error => {
  console.error('Setup failed:', error)
  process.exit(1)
})
