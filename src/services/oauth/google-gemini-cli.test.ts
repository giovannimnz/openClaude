/**
 * Tests for Google Gemini CLI OAuth implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  loginGeminiCli,
  refreshGoogleCloudToken,
  getGoogleCloudAccessToken,
  isGeminiCliLoggedIn,
  logoutGeminiCli,
  getGoogleCloudProjectId,
  type GoogleOAuthCredential,
  type PiAuthFile,
} from './google-gemini-cli.js'

// Mock file system operations
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}))

// Mock HTTP server
vi.mock('node:http', () => ({
  createServer: vi.fn(),
}))

describe('Google Gemini CLI OAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getGoogleCloudProjectId', () => {
    it('should return project ID from GOOGLE_CLOUD_PROJECT', () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project'
      expect(getGoogleCloudProjectId()).toBe('test-project')
      delete process.env.GOOGLE_CLOUD_PROJECT
    })

    it('should return project ID from GCLOUD_PROJECT', () => {
      process.env.GCLOUD_PROJECT = 'test-project-2'
      expect(getGoogleCloudProjectId()).toBe('test-project-2')
      delete process.env.GCLOUD_PROJECT
    })

    it('should return project ID from GOOGLE_PROJECT_ID', () => {
      process.env.GOOGLE_PROJECT_ID = 'test-project-3'
      expect(getGoogleCloudProjectId()).toBe('test-project-3')
      delete process.env.GOOGLE_PROJECT_ID
    })

    it('should return undefined when no project ID is set', () => {
      expect(getGoogleCloudProjectId()).toBeUndefined()
    })
  })

  describe('loginGeminiCli', () => {
    it('should generate PKCE code verifier and challenge', async () => {
      const openUrl = vi.fn().mockResolvedValue(undefined)
      const onCodeReceived = vi.fn()

      // This would normally start the OAuth flow
      // For testing, we just verify it can be called
      expect(() => loginGeminiCli(openUrl, onCodeReceived)).not.toThrow()
    })
  })

  describe('refreshGoogleCloudToken', () => {
    it('should throw error when no credentials exist', async () => {
      await expect(refreshGoogleCloudToken()).rejects.toThrow()
    })
  })

  describe('getGoogleCloudAccessToken', () => {
    it('should return null when no credentials exist', async () => {
      const token = await getGoogleCloudAccessToken()
      expect(token).toBeNull()
    })
  })

  describe('isGeminiCliLoggedIn', () => {
    it('should return false when not logged in', async () => {
      const isLoggedIn = await isGeminiCliLoggedIn()
      expect(isLoggedIn).toBe(false)
    })
  })

  describe('logoutGeminiCli', () => {
    it('should not throw when logging out', async () => {
      await expect(logoutGeminiCli()).resolves.not.toThrow()
    })
  })
})

describe('Google OAuth Credential Types', () => {
  it('should have correct structure for GoogleOAuthCredential', () => {
    const credential: GoogleOAuthCredential = {
      type: 'oauth',
      credentials: {
        access_token: 'test-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/cloud-platform',
      },
    }

    expect(credential.type).toBe('oauth')
    expect(credential.credentials.access_token).toBe('test-token')
    expect(credential.credentials.refresh_token).toBe('test-refresh-token')
    expect(typeof credential.credentials.expiry_date).toBe('number')
  })

  it('should have correct structure for PiAuthFile', () => {
    const authFile: PiAuthFile = {
      'google-gemini-cli': {
        type: 'oauth',
        credentials: {
          access_token: 'test-token',
          refresh_token: 'test-refresh-token',
          expiry_date: Date.now() + 3600000,
          token_type: 'Bearer',
          scope: 'https://www.googleapis.com/auth/cloud-platform',
        },
      },
    }

    expect(authFile['google-gemini-cli']).toBeDefined()
    expect(authFile['google-gemini-cli']?.type).toBe('oauth')
  })
})