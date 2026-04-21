/**
 * Gemini OAuth Token Access Layer
 * Provides convenient access to stored Gemini OAuth tokens
 */

import { getOAuthStorage } from './oauth-storage.js'
import {
  getGeminiOAuthProvider,
  resetGeminiOAuthProvider,
} from './gemini-oauth-provider.js'
import type {
  GeminiOAuthToken,
  GeminiOAuthProfile,
} from './oauth-types.js'

const PROVIDER_NAME = 'google-gemini-cli'
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000 // Refresh 5 minutes before expiry

/**
 * Store Gemini OAuth token in secure storage
 */
export async function storeGeminiOAuthToken(
  token: GeminiOAuthToken,
): Promise<void> {
  const storage = await getOAuthStorage()
  const metadata: Record<string, unknown> = {
    type: 'gemini-oauth-v1',
    obtainedAt: new Date().toISOString(),
  }

  if (token.projectId) {
    metadata.projectId = token.projectId
  }

  await storage.save(PROVIDER_NAME, {
    provider: PROVIDER_NAME,
    token: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: token.expiresAt,
    scopes: token.scopes,
    metadata,
  })
}

/**
 * Get valid Gemini OAuth token, refreshing if necessary
 */
export async function getGeminiOAuthToken(): Promise<GeminiOAuthToken | null> {
  const storage = await getOAuthStorage()
  const stored = await storage.get(PROVIDER_NAME)

  if (!stored) {
    return null
  }

  // Check if token needs refresh (with buffer)
  const needsRefresh =
    stored.expiresAt - TOKEN_REFRESH_BUFFER_MS < Date.now()

  if (needsRefresh && stored.refreshToken) {
    try {
      const provider = getGeminiOAuthProvider()
      const newToken = await provider.refreshToken(stored.refreshToken)
      await storeGeminiOAuthToken(newToken)
      return newToken
    } catch (err) {
      // If refresh fails, still return the token if it's not completely expired
      if (stored.expiresAt > Date.now()) {
        console.warn(
          `Failed to refresh Gemini OAuth token: ${String(err)}. Using cached token.`,
        )
        return {
          accessToken: stored.token,
          refreshToken: stored.refreshToken,
          expiresAt: stored.expiresAt,
          projectId: (stored.metadata?.projectId as string) || '',
          scopes: stored.scopes,
        }
      }
      throw err
    }
  }

  return {
    accessToken: stored.token,
    refreshToken: stored.refreshToken,
    expiresAt: stored.expiresAt,
    projectId: (stored.metadata?.projectId as string) || '',
    scopes: stored.scopes,
  }
}

/**
 * Get Gemini OAuth token as a formatted header value
 */
export async function getGeminiOAuthTokenHeader(): Promise<
  string | null
> {
  const token = await getGeminiOAuthToken()
  if (!token) return null
  return `Bearer ${token.accessToken}`
}

/**
 * Get Gemini OAuth token as JSON for internal APIs
 */
export async function getGeminiOAuthTokenJSON(): Promise<{
  token: string
  projectId: string
} | null> {
  const token = await getGeminiOAuthToken()
  if (!token) return null
  return {
    token: token.accessToken,
    projectId: token.projectId,
  }
}

/**
 * Check if Gemini OAuth is configured
 */
export async function hasGeminiOAuth(): Promise<boolean> {
  return (await getGeminiOAuthToken()) !== null
}

/**
 * Perform Gemini OAuth login flow
 */
export async function loginGeminiOAuth(openBrowser: (url: string) => Promise<void>): Promise<GeminiOAuthToken> {
  const provider = getGeminiOAuthProvider()
  const token = await provider.performOAuthFlow(openBrowser)
  await storeGeminiOAuthToken(token)
  return token
}

/**
 * Get Gemini OAuth user profile
 */
export async function getGeminiOAuthProfile(): Promise<
  GeminiOAuthProfile | null
> {
  const token = await getGeminiOAuthToken()
  if (!token) return null

  const provider = getGeminiOAuthProvider()
  return provider.getUserProfile(token.accessToken)
}

/**
 * Logout from Gemini OAuth (remove stored token)
 */
export async function logoutGeminiOAuth(): Promise<void> {
  const storage = await getOAuthStorage()
  await storage.remove(PROVIDER_NAME)
  resetGeminiOAuthProvider()
}

/**
 * Get Gemini OAuth token status
 */
export async function getGeminiOAuthStatus(): Promise<{
  loggedIn: boolean
  email?: string
  name?: string
  expiresAt?: number
  projectId?: string
}> {
  const token = await getGeminiOAuthToken()
  if (!token) {
    return { loggedIn: false }
  }

  try {
    const profile = await getGeminiOAuthProfile()
    return {
      loggedIn: true,
      email: profile?.email,
      name: profile?.name,
      expiresAt: token.expiresAt,
      projectId: token.projectId,
    }
  } catch {
    // Profile fetch may fail but token is still valid
    return {
      loggedIn: true,
      expiresAt: token.expiresAt,
      projectId: token.projectId,
    }
  }
}
