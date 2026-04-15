/**
 * OAuth Service
 * 
 * Provides unified OAuth functionality for different providers
 * Handles OAuth flows, manual code input, and cleanup
 */

import { AuthCodeListener } from './auth-code-listener.js'
import { generateCodeChallenge, generateCodeVerifier, generateState } from './crypto.js'

export interface OAuthOptions {
  loginWithClaudeAi?: boolean
  inferenceOnly?: boolean
  expiresIn?: number
  orgUUID?: string
}

export interface OAuthResult {
  accessToken: string
  refreshToken?: string
  expiryDate?: number
  provider: string
  metadata?: Record<string, any>
}

export class OAuthService {
  private authCodeListener: AuthCodeListener | null = null
  private port: number | null = null
  private tokenExchangeAbortController: AbortController | null = null

  /**
   * Start an OAuth flow
   */
  async startOAuthFlow(
    openUrl: (url: string) => Promise<void>,
    options: OAuthOptions = {}
  ): Promise<OAuthResult> {
    try {
      // Import CodexOAuthService for Claude AI authentication
      const { CodexOAuthService } = await import('../api/codexOAuth.js')
      const codexService = new CodexOAuthService()
      
      const tokens = await codexService.startOAuthFlow(openUrl)
      
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        provider: 'claudeai',
        metadata: {
          apiKey: tokens.apiKey,
          idToken: tokens.idToken,
          accountId: tokens.accountId
        }
      }
    } catch (error) {
      throw new Error(`OAuth flow failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Handle manual authorization code input
   */
  async handleManualAuthCodeInput(options: {
    code?: string
    codeVerifier?: string
    port?: number
  }): Promise<OAuthResult> {
    if (!options.code) {
      throw new Error('Authorization code is required for manual input')
    }

    try {
      // Import codexOAuth utilities
      const { exchangeAuthorizationCode } = await import('../api/codexOAuth.js')
      
      const tokens = await exchangeAuthorizationCode({
        authorizationCode: options.code,
        codeVerifier: options.codeVerifier || generateCodeVerifier(),
        port: options.port || 8085,
        signal: this.tokenExchangeAbortController?.signal
      })

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        provider: 'claudeai',
        metadata: {
          apiKey: tokens.apiKey,
          idToken: tokens.idToken,
          accountId: tokens.accountId
        }
      }
    } catch (error) {
      throw new Error(`Manual auth code input failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Cleanup OAuth resources
   */
  cleanup(): void {
    if (this.authCodeListener) {
      this.authCodeListener.stop()
      this.authCodeListener = null
    }
    
    if (this.tokenExchangeAbortController) {
      this.tokenExchangeAbortController.abort()
      this.tokenExchangeAbortController = null
    }
    
    this.port = null
  }

  /**
   * Get current OAuth state
   */
  getState(): {
    isActive: boolean
    port: number | null
  } {
    return {
      isActive: this.authCodeListener !== null,
      port: this.port
    }
  }
}