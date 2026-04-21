/**
 * Google Gemini CLI OAuth Provider
 * Handles OAuth flow with Google Cloud Code Assist API
 * Compatible with Google's gemini-cli and gsd-2's oauth flow
 */

import { randomBytes } from 'crypto'
import { createServer, type Server } from 'http'
import { parse } from 'url'
import type { GeminiOAuthToken, GeminiOAuthProfile } from './oauth-types.js'

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_PROFILE_ENDPOINT =
  'https://www.googleapis.com/oauth2/v1/userinfo?alt=json'

interface GeminiOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

/**
 * Google OAuth provider for Gemini CLI
 * Handles the PKCE OAuth 2.0 flow with Google
 */
export class GeminiOAuthProvider {
  private config: GeminiOAuthConfig
  private server: Server | null = null
  private port: number
  private authCodeResolve:
    | ((code: string) => void)
    | null = null
  private authCodeReject:
    | ((err: Error) => void)
    | null = null

  constructor(
    clientId: string = process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    clientSecret: string = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    port: number = 8888,
    scopes: string[] = [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/generative-language',
      'openid',
      'email',
      'profile',
    ],
  ) {
    this.port = port
    this.config = {
      clientId,
      clientSecret,
      redirectUri: `http://localhost:${port}/callback`,
      scopes,
    }
  }

  /**
   * Generate PKCE code challenge and verifier
   */
  private generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = randomBytes(32).toString('base64url')
    const crypto = require('crypto')
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url')
    return { codeVerifier, codeChallenge }
  }

  /**
   * Build Google OAuth authorization URL
   */
  buildAuthUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent',
    })

    return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`
  }

  /**
   * Start local callback server to receive the OAuth code
   */
  async startCallbackServer(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        const url = parse(req.url || '', true)

        if (url.pathname === '/callback') {
          const code = url.query.code as string
          const state = url.query.state as string
          const error = url.query.error as string

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/plain' })
            res.end(`Error: ${error}\n${url.query.error_description || ''}`)
            if (this.authCodeReject) {
              this.authCodeReject(new Error(`OAuth error: ${error}`))
            }
          } else if (code && state) {
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end(
              'Authorization successful! You can close this window and return to your terminal.',
            )
            if (this.authCodeResolve) {
              this.authCodeResolve(code)
            }
          } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' })
            res.end('Missing authorization code or state')
          }

          // Close server after handling callback
          setTimeout(() => this.stopCallbackServer(), 1000)
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          res.end('Not found')
        }
      })

      this.server.listen(this.port, 'localhost', () => {
        resolve(this.port)
      })

      this.server.on('error', reject)
    })
  }

  /**
   * Stop the callback server
   */
  async stopCallbackServer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  /**
   * Wait for OAuth authorization code from callback server
   */
  async waitForAuthCode(timeout: number = 300000): Promise<string> {
    return new Promise((resolve, reject) => {
      this.authCodeResolve = resolve
      this.authCodeReject = reject

      const timer = setTimeout(() => {
        this.authCodeResolve = null
        this.authCodeReject = null
        reject(new Error('OAuth callback timeout'))
      }, timeout)

      // Cleanup timer on resolution
      const originalResolve = resolve
      this.authCodeResolve = (code: string) => {
        clearTimeout(timer)
        originalResolve(code)
      }
    })
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
  ): Promise<GeminiOAuthToken> {
    const params = new URLSearchParams({
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    })

    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token exchange failed: ${error}`)
    }

    const data = (await response.json()) as {
      access_token: string
      refresh_token?: string
      expires_in?: number
      scope?: string
    }

    // Extract project ID from token if available (via scope or metadata endpoint)
    const projectId = await this.getProjectId(data.access_token)

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      projectId,
      scopes: (data.scope || '').split(' ').filter(Boolean),
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<GeminiOAuthToken> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    })

    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token refresh failed: ${error}`)
    }

    const data = (await response.json()) as {
      access_token: string
      expires_in?: number
      scope?: string
    }

    const projectId = await this.getProjectId(data.access_token)

    return {
      accessToken: data.access_token,
      refreshToken, // Keep the same refresh token
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      projectId,
      scopes: (data.scope || '').split(' ').filter(Boolean),
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(accessToken: string): Promise<GeminiOAuthProfile> {
    const response = await fetch(GOOGLE_PROFILE_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`)
    }

    const data = (await response.json()) as {
      email: string
      name: string
      picture?: string
    }

    return {
      email: data.email,
      name: data.name,
      picture: data.picture,
    }
  }

  /**
   * Get Google Cloud project ID
   * Tries to extract from token claims or from Cloud Resource Manager API
   */
  private async getProjectId(accessToken: string): Promise<string> {
    // Try to get from environment first
    if (process.env.GOOGLE_CLOUD_PROJECT) {
      return process.env.GOOGLE_CLOUD_PROJECT
    }

    // Try to decode from JWT token (access tokens are JWTs)
    try {
      const parts = accessToken.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64').toString(),
        ) as {
          project_id?: string
          aud?: string
        }
        if (payload.project_id) {
          return payload.project_id
        }
      }
    } catch {
      // Fall through to API call
    }

    // Try Cloud Resource Manager API
    try {
      const response = await fetch(
        'https://cloudresourcemanager.googleapis.com/v1/projects?filter=lifecycleState:ACTIVE',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      )

      if (response.ok) {
        const data = (await response.json()) as {
          projects?: Array<{ projectId: string }>
        }
        if (data.projects && data.projects.length > 0) {
          return data.projects[0].projectId
        }
      }
    } catch {
      // Fall through
    }

    // If all else fails, return a placeholder
    throw new Error(
      'Could not determine Google Cloud Project ID. Set GOOGLE_CLOUD_PROJECT env var.',
    )
  }

  /**
   * Full OAuth flow: authorize, wait for code, exchange for tokens
   */
  async performOAuthFlow(
    openBrowser: (url: string) => Promise<void>,
  ): Promise<GeminiOAuthToken> {
    const { codeVerifier, codeChallenge } = this.generatePKCE()
    const state = randomBytes(16).toString('hex')

    // Start callback server
    await this.startCallbackServer()

    try {
      // Build and open auth URL
      const authUrl = this.buildAuthUrl(state, codeChallenge)
      await openBrowser(authUrl)

      // Wait for authorization code
      const code = await this.waitForAuthCode()

      // Exchange code for token
      const token = await this.exchangeCodeForToken(code, codeVerifier)

      return token
    } finally {
      await this.stopCallbackServer()
    }
  }
}

/**
 * Singleton instance
 */
let geminiProvider: GeminiOAuthProvider | null = null

export function getGeminiOAuthProvider(config?: {
  clientId?: string
  clientSecret?: string
  port?: number
}): GeminiOAuthProvider {
  if (!geminiProvider) {
    geminiProvider = new GeminiOAuthProvider(
      config?.clientId,
      config?.clientSecret,
      config?.port,
    )
  }
  return geminiProvider
}

export function resetGeminiOAuthProvider(): void {
  if (geminiProvider) {
    geminiProvider.stopCallbackServer().catch(() => {})
    geminiProvider = null
  }
}
