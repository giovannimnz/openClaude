/**
 * OAuth Token Storage Layer
 * Manages persistent storage of OAuth tokens for multiple providers
 * Similar to gsd-2's AuthStorage but tailored for openclaude
 */

import { mkdir, readFile, writeFile, access } from 'fs/promises'
import { constants, chmodSync } from 'fs'
import { join } from 'path'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'
import type { OAuthCredential, OAuthTokens } from './types.js'

export interface StoredOAuthCredential {
  provider: string
  token: string
  refreshToken?: string
  expiresAt: number
  scopes: string[]
  metadata?: Record<string, unknown>
}

export class OAuthStorage {
  private storagePath: string
  private data: Map<string, StoredOAuthCredential> = new Map()
  private initialized = false

  constructor(storageDir?: string) {
    const baseDir =
      storageDir || join(getClaudeConfigHomeDir(), 'oauth-credentials')
    this.storagePath = baseDir
  }

  async init(): Promise<void> {
    if (this.initialized) return

    try {
      await mkdir(this.storagePath, { recursive: true, mode: 0o700 })
      await this.load()
      this.initialized = true
    } catch (err) {
      throw new Error(`Failed to initialize OAuth storage: ${String(err)}`)
    }
  }

  private getProviderPath(provider: string): string {
    return join(this.storagePath, `${provider}.json`)
  }

  async save(provider: string, credential: StoredOAuthCredential): Promise<void> {
    if (!this.initialized) await this.init()

    this.data.set(provider, credential)

    const path = this.getProviderPath(provider)
    const content = JSON.stringify(credential, null, 2)

    try {
      await writeFile(path, content, { mode: 0o600, encoding: 'utf-8' })
      chmodSync(path, 0o600)
    } catch (err) {
      throw new Error(`Failed to save OAuth credential for ${provider}: ${String(err)}`)
    }
  }

  async load(provider?: string): Promise<void> {
    if (!this.initialized) await this.init()

    if (provider) {
      // Load single provider
      const path = this.getProviderPath(provider)
      try {
        const content = await readFile(path, 'utf-8')
        const credential = JSON.parse(content) as StoredOAuthCredential
        this.data.set(provider, credential)
      } catch {
        // File doesn't exist or is invalid — that's fine
        this.data.delete(provider)
      }
    } else {
      // Load all providers (on initialization)
      this.data.clear()
      // Scan directory for provider files
      try {
        const fs = await import('fs/promises')
        const entries = await fs.readdir(this.storagePath, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith('.json')) {
            const providerName = entry.name.slice(0, -5) // Remove .json
            try {
              const path = this.getProviderPath(providerName)
              const content = await readFile(path, 'utf-8')
              const credential = JSON.parse(content) as StoredOAuthCredential
              this.data.set(providerName, credential)
            } catch {
              // Skip invalid entries
            }
          }
        }
      } catch {
        // Directory might not exist on first run
      }
    }
  }

  async get(provider: string): Promise<StoredOAuthCredential | null> {
    if (!this.initialized) await this.init()

    // Check memory first
    if (this.data.has(provider)) {
      const cred = this.data.get(provider)!
      // Check if expired
      if (cred.expiresAt > Date.now()) {
        return cred
      }
      // Remove expired credential
      this.data.delete(provider)
      const path = this.getProviderPath(provider)
      try {
        await import('fs').then(m =>
          m.promises.unlink(path).catch(() => {}),
        )
      } catch {}
    }

    // Try to load from disk
    await this.load(provider)
    const cred = this.data.get(provider)
    if (cred && cred.expiresAt > Date.now()) {
      return cred
    }

    return null
  }

  async remove(provider: string): Promise<void> {
    if (!this.initialized) await this.init()

    this.data.delete(provider)
    const path = this.getProviderPath(provider)
    try {
      await import('fs').then(m => m.promises.unlink(path).catch(() => {}))
    } catch {}
  }

  async exists(provider: string): Promise<boolean> {
    if (!this.initialized) await this.init()

    const path = this.getProviderPath(provider)
    try {
      await access(path, constants.R_OK)
      return true
    } catch {
      return false
    }
  }

  async list(): Promise<string[]> {
    if (!this.initialized) await this.init()

    return Array.from(this.data.keys())
  }

  async clear(provider?: string): Promise<void> {
    if (!this.initialized) await this.init()

    if (provider) {
      await this.remove(provider)
    } else {
      // Clear all
      for (const p of this.data.keys()) {
        await this.remove(p)
      }
    }
  }
}

// Singleton instance
let instance: OAuthStorage | null = null

export async function getOAuthStorage(): Promise<OAuthStorage> {
  if (!instance) {
    instance = new OAuthStorage()
    await instance.init()
  }
  return instance
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetOAuthStorage(): void {
  instance = null
}
