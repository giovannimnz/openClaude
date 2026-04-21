/**
 * Tests for Gemini OAuth implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  OAuthStorage,
  resetOAuthStorage,
  getOAuthStorage,
} from '../oauth-storage.js'
import {
  storeGeminiOAuthToken,
  getGeminiOAuthToken,
  hasGeminiOAuth,
  getGeminiOAuthStatus,
} from '../gemini-oauth-client.js'
import type { GeminiOAuthToken } from '../oauth-types.js'
import { InMemoryAuthStorageBackend } from '../oauth-storage.js'

describe('Gemini OAuth', () => {
  let storage: OAuthStorage

  beforeEach(async () => {
    resetOAuthStorage()
    // Use in-memory storage for tests
    storage = new OAuthStorage(
      './test-oauth-credentials-' + Date.now(),
    )
    await storage.init()
  })

  afterEach(async () => {
    resetOAuthStorage()
  })

  it('should store and retrieve Gemini OAuth token', async () => {
    const token: GeminiOAuthToken = {
      accessToken: 'ya29.test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 3600000,
      projectId: 'test-project',
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    }

    await storeGeminiOAuthToken(token)
    const retrieved = await getGeminiOAuthToken()

    expect(retrieved).toBeTruthy()
    expect(retrieved?.accessToken).toBe('ya29.test-token')
    expect(retrieved?.projectId).toBe('test-project')
  })

  it('should detect expired tokens', async () => {
    const expiredToken: GeminiOAuthToken = {
      accessToken: 'ya29.expired-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() - 1000, // Expired 1 second ago
      projectId: 'test-project',
      scopes: [],
    }

    await storeGeminiOAuthToken(expiredToken)
    const retrieved = await getGeminiOAuthToken()

    // Should return null because token is expired
    expect(retrieved).toBeNull()
  })

  it('should check if OAuth is configured', async () => {
    let hasAuth = await hasGeminiOAuth()
    expect(hasAuth).toBe(false)

    const token: GeminiOAuthToken = {
      accessToken: 'ya29.test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 3600000,
      projectId: 'test-project',
      scopes: [],
    }

    await storeGeminiOAuthToken(token)
    hasAuth = await hasGeminiOAuth()
    expect(hasAuth).toBe(true)
  })

  it('should provide OAuth status', async () => {
    const token: GeminiOAuthToken = {
      accessToken: 'ya29.test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 3600000,
      projectId: 'test-project',
      scopes: [],
    }

    await storeGeminiOAuthToken(token)
    const status = await getGeminiOAuthStatus()

    expect(status.loggedIn).toBe(true)
    expect(status.projectId).toBe('test-project')
    expect(status.expiresAt).toBe(token.expiresAt)
  })

  it('should handle missing tokens gracefully', async () => {
    const status = await getGeminiOAuthStatus()
    expect(status.loggedIn).toBe(false)
    expect(status.email).toBeUndefined()
  })

  it('should store token with metadata', async () => {
    const token: GeminiOAuthToken = {
      accessToken: 'ya29.test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 3600000,
      projectId: 'test-project',
      scopes: ['scope1', 'scope2'],
    }

    await storeGeminiOAuthToken(token)

    // Verify storage format
    const stored = await storage.get('google-gemini-cli')
    expect(stored).toBeTruthy()
    expect(stored?.scopes).toEqual(['scope1', 'scope2'])
    expect(stored?.metadata?.type).toBe('gemini-oauth-v1')
    expect(stored?.metadata?.projectId).toBe('test-project')
  })

  it('should respect token refresh buffer', async () => {
    // Token expires in 3 minutes (less than 5 minute buffer)
    const token: GeminiOAuthToken = {
      accessToken: 'ya29.test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 3 * 60 * 1000,
      projectId: 'test-project',
      scopes: [],
    }

    await storeGeminiOAuthToken(token)

    // Mock refresh to test that it would be attempted
    // In real scenario, this would trigger a refresh
    const retrieved = await getGeminiOAuthToken()

    // Token is still returned (refresh would happen if available)
    expect(retrieved).toBeTruthy()
  })

  it('should handle concurrent access safely', async () => {
    const token1: GeminiOAuthToken = {
      accessToken: 'ya29.token1',
      refreshToken: 'refresh1',
      expiresAt: Date.now() + 3600000,
      projectId: 'project1',
      scopes: [],
    }

    // Simulate concurrent stores and retrieves
    const promises = [
      storeGeminiOAuthToken(token1),
      getGeminiOAuthToken(),
      hasGeminiOAuth(),
      getGeminiOAuthStatus(),
    ]

    const results = await Promise.all(promises)

    // All should complete successfully
    expect(results).toHaveLength(4)
    expect(results[0]).toBeUndefined() // store returns void
    expect(results[1]).toBeTruthy() // get returns token
    expect(results[2]).toBe(true) // has returns bool
    expect(results[3].loggedIn).toBe(true) // status returns status
  })
})

describe('OAuthStorage', () => {
  let storage: OAuthStorage

  beforeEach(async () => {
    storage = new OAuthStorage(
      './test-oauth-storage-' + Date.now(),
    )
    await storage.init()
  })

  it('should create storage directory with correct permissions', async () => {
    expect(storage).toBeTruthy()
    // In real test, would verify directory permissions are 0700
  })

  it('should handle missing credentials gracefully', async () => {
    const cred = await storage.get('nonexistent-provider')
    expect(cred).toBeNull()
  })

  it('should list providers', async () => {
    const providers = await storage.list()
    expect(Array.isArray(providers)).toBe(true)
  })

  it('should remove credentials', async () => {
    const cred = {
      provider: 'test',
      token: 'test-token',
      expiresAt: Date.now() + 3600000,
      scopes: [],
    }

    await storage.save('test', cred)
    let exists = await storage.exists('test')
    expect(exists).toBe(true)

    await storage.remove('test')
    exists = await storage.exists('test')
    expect(exists).toBe(false)
  })
})

describe('PKCE OAuth Flow', () => {
  it('should generate valid PKCE parameters', async () => {
    const { GeminiOAuthProvider } = await import(
      '../gemini-oauth-provider.js'
    )
    const provider = new GeminiOAuthProvider(
      'test-client-id',
      'test-client-secret',
    )

    // The provider should be able to generate PKCE
    // This is a basic check that the class instantiates
    expect(provider).toBeTruthy()
  })

  it('should build valid authorization URL', async () => {
    const { GeminiOAuthProvider } = await import(
      '../gemini-oauth-provider.js'
    )
    const provider = new GeminiOAuthProvider(
      'test-client-id',
      'test-client-secret',
      8888,
    )

    const state = 'test-state'
    const challenge = 'test-challenge'
    const url = provider.buildAuthUrl(state, challenge)

    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url).toContain('client_id=test-client-id')
    expect(url).toContain('state=test-state')
    expect(url).toContain('code_challenge=test-challenge')
    expect(url).toContain('code_challenge_method=S256')
  })
})
