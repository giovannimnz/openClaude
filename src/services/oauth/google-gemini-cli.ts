/**
 * Google Gemini CLI OAuth Implementation
 * 
 * Implements OAuth 2.0 flow for Google Cloud Code Assist API
 * Compatible with GSD-2/Pi SDK implementation
 * 
 * Features:
 * - PKCE OAuth flow
 * - Automatic token refresh
 * - Secure credential storage
 * - Google Cloud Code Assist API support
 */

import { randomBytes, createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

// Google Cloud OAuth endpoints
const GOOGLE_OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// Google Cloud Code Assist Client ID (for OAuth flow)
const GEMINI_CLI_CLIENT_ID = '77185425430.apps.googleusercontent.com'
const GEMINI_CLI_REDIRECT_URI = 'http://127.0.0.1:8085'

// OAuth scopes for Google Cloud Code Assist
const GEMINI_CLI_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/cloud-code-assist',
]

// OAuth scopes for Google Cloud Enterprise projects
const GEMINI_CLI_ENTERPRISE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/cloud-code-assist',
  'https://www.googleapis.com/auth/cloud-identity',
  'https://www.googleapis.com/auth/iam',
]

/**
 * Get Google Cloud Project ID from environment or credentials
 */
export function getGoogleCloudProjectId(): string | undefined {
  return (
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_PROJECT_ID ||
    undefined
  )
}

/**
 * Check if running in enterprise/corporate environment
 */
export function isEnterpriseEnvironment(): boolean {
  const projectId = getGoogleCloudProjectId()
  return projectId !== undefined && projectId !== ''
}

/**
 * Get enterprise metadata from stored credentials
 */
export async function getEnterpriseMetadata(): Promise<{projectId?: string; environment?: string} | null> {
  try {
    const auth = await loadAuthFile()
    const geminiCliAuth = auth['google-gemini-cli'] as GoogleOAuthCredential | undefined
    
    if (!geminiCliAuth || !geminiCliAuth.metadata) {
      return null
    }
    
    return {
      projectId: geminiCliAuth.metadata.projectId,
      environment: geminiCliAuth.metadata.environment,
    }
  } catch {
    return null
  }
}

/**
 * Get appropriate OAuth scopes based on environment
 */
function getOAuthScopes(): string[] {
  if (isEnterpriseEnvironment()) {
    return GEMINI_CLI_ENTERPRISE_OAUTH_SCOPES
  }
  return GEMINI_CLI_OAUTH_SCOPES
}

// Storage paths (compatible with Pi SDK)
const PI_CONFIG_DIR = join(homedir(), '.pi')
const PI_AGENT_DIR = join(PI_CONFIG_DIR, 'agent')
const AUTH_JSON_PATH = join(PI_AGENT_DIR, 'auth.json')

/**
 * OAuth credential types
 */
export type GoogleOAuthCredential = {
  type: 'oauth'
  credentials: {
    access_token: string
    refresh_token: string
    expiry_date: number // Unix timestamp in milliseconds
    token_type: string
    scope: string
  }
  metadata?: {
    projectId?: string
    environment?: 'standard' | 'enterprise'
    organizationId?: string
  }
}

/**
 * Auth.json structure (Pi SDK compatible)
 */
export type PiAuthFile = {
  'google-gemini-cli'?: GoogleOAuthCredential
  [key: string]: unknown
}

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  
  return { codeVerifier, codeChallenge }
}

/**
 * Generate random state for CSRF protection
 */
function generateState(): string {
  return randomBytes(16).toString('base64url')
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}> {
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GEMINI_CLI_CLIENT_ID,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: GEMINI_CLI_REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  return response.json()
}

/**
 * Refresh expired access token
 */
async function refreshAccessToken(
  refreshToken: string,
): Promise<{
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}> {
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GEMINI_CLI_CLIENT_ID,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  return response.json()
}

/**
 * Ensure Pi SDK directories exist
 */
async function ensurePiDirectories(): Promise<void> {
  try {
    await mkdir(PI_AGENT_DIR, { recursive: true })
  } catch (error) {
    throw new Error(`Failed to create Pi SDK directories: ${error}`)
  }
}

/**
 * Load auth.json file
 */
async function loadAuthFile(): Promise<PiAuthFile> {
  try {
    const content = await readFile(AUTH_JSON_PATH, 'utf-8')
    return JSON.parse(content) as PiAuthFile
  } catch (error) {
    // File doesn't exist or is invalid, return empty
    return {}
  }
}

/**
 * Save auth.json file
 */
async function saveAuthFile(auth: PiAuthFile): Promise<void> {
  await ensurePiDirectories()
  await writeFile(AUTH_JSON_PATH, JSON.stringify(auth, null, 2), {
    mode: 0o600, // Read/write for owner only
  })
}

/**
 * Check if access token is expired
 */
function isTokenExpired(expiryDate: number): boolean {
  // Add 5 minute buffer to refresh before actual expiry
  return Date.now() >= expiryDate - 5 * 60 * 1000
}

/**
 * Get fresh access token (refresh if needed)
 */
export async function refreshGoogleCloudToken(): Promise<string> {
  const auth = await loadAuthFile()
  const geminiCliAuth = auth['google-gemini-cli']

  if (!geminiCliAuth || geminiCliAuth.type !== 'oauth') {
    throw new Error('No valid Google Gemini CLI OAuth credentials found. Run login first.')
  }

  const { credentials } = geminiCliAuth

  // If token is still valid, return it
  if (!isTokenExpired(credentials.expiry_date)) {
    return credentials.access_token
  }

  // Token expired, refresh it
  try {
    const newTokens = await refreshAccessToken(credentials.refresh_token)
    
    // Update credentials
    const updatedCredentials: GoogleOAuthCredential['credentials'] = {
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || credentials.refresh_token,
      expiry_date: Date.now() + newTokens.expires_in * 1000,
      token_type: newTokens.token_type,
      scope: newTokens.scope,
    }

    // Save updated credentials
    auth['google-gemini-cli'] = {
      type: 'oauth',
      credentials: updatedCredentials,
    }
    
    await saveAuthFile(auth)

    return newTokens.access_token
  } catch (error) {
    throw new Error(`Failed to refresh Google Cloud token: ${error}`)
  }
}

/**
 * Get current access token (without auto-refresh)
 */
export async function getGoogleCloudAccessToken(): Promise<string | null> {
  try {
    const auth = await loadAuthFile()
    const geminiCliAuth = auth['google-gemini-cli']

    if (!geminiCliAuth || geminiCliAuth.type !== 'oauth') {
      return null
    }

    const { credentials } = geminiCliAuth

    if (isTokenExpired(credentials.expiry_date)) {
      return null
    }

    return credentials.access_token
  } catch {
    return null
  }
}

/**
 * OAuth flow result
 */
export type OAuthFlowResult = {
  success: boolean
  accessToken?: string
  refreshToken?: string
  expiryDate?: number
  error?: string
}

/**
 * Start Google Gemini CLI OAuth flow
 * 
 * This function:
 * 1. Generates PKCE verifier/challenge
 * 2. Opens browser for user authorization
 * 3. Listens for callback on localhost
 * 4. Exchanges authorization code for tokens
 * 5. Stores tokens in auth.json
 * 
 * @param openUrl - Function to open URL in browser
 * @param onCodeReceived - Callback when authorization code is received
 * @returns OAuth flow result with access token
 */
export async function loginGeminiCli(
  openUrl: (url: string) => Promise<void>,
  onCodeReceived?: (url: string) => void,
): Promise<OAuthFlowResult> {
  const { codeVerifier, codeChallenge } = generatePKCE()
  const state = generateState()
  const projectId = getGoogleCloudProjectId()
  const isEnterprise = isEnterpriseEnvironment()

  // Build authorization URL
  const authUrl = new URL(GOOGLE_OAUTH_AUTH_URL)
  authUrl.searchParams.set('client_id', GEMINI_CLI_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', GEMINI_CLI_REDIRECT_URI)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', getOAuthScopes().join(' '))
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('state', state)

  // Add enterprise-specific parameters
  if (isEnterprise && projectId) {
    // Add access_type for offline access (required for refresh tokens)
    authUrl.searchParams.set('access_type', 'offline')
    
    // Add prompt for consent (required for enterprise apps)
    authUrl.searchParams.set('prompt', 'consent')
    
    console.log(`🏢 Enterprise environment detected`)
    console.log(`📋 Project: ${projectId}`)
    console.log(`🔐 Using enterprise OAuth scopes`)
  }

  const authUrlString = authUrl.toString()

  // Notify callback (for UI display)
  if (onCodeReceived) {
    onCodeReceived(authUrlString)
  }

  // Open browser
  await openUrl(authUrlString)

  // Create simple HTTP server to receive callback
  const { createServer } = await import('node:http')
  
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`)
      
      // Handle OAuth callback
      if (url.pathname === '/' && url.searchParams.has('code')) {
        const code = url.searchParams.get('code')
        const returnedState = url.searchParams.get('state')

        // Validate state
        if (returnedState !== state) {
          res.writeHead(400, { 'Content-Type': 'text/plain' })
          res.end('Invalid state parameter')
          server.close()
          resolve({
            success: false,
            error: 'State parameter mismatch',
          })
          return
        }

        // Exchange code for tokens
        try {
          const tokens = await exchangeCodeForToken(code!, codeVerifier)
          
          // Store tokens in auth.json
          const auth = await loadAuthFile()
          
          const credentialData: GoogleOAuthCredential = {
            type: 'oauth',
            credentials: {
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              expiry_date: Date.now() + tokens.expires_in * 1000,
              token_type: tokens.token_type,
              scope: tokens.scope,
            },
          }
          
          // Add enterprise metadata if applicable
          if (isEnterprise && projectId) {
            credentialData.metadata = {
              projectId,
              environment: 'enterprise',
            }
          }
          
          auth['google-gemini-cli'] = credentialData
          await saveAuthFile(auth)

          // Send success response
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(`
            <html>
              <head><title>Authentication Successful</title></head>
              <body>
                <h1>Authentication Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
              </body>
            </html>
          `)

          server.close()
          resolve({
            success: true,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: Date.now() + tokens.expires_in * 1000,
          })
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end(`Authentication failed: ${error}`)
          server.close()
          resolve({
            success: false,
            error: String(error),
          })
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not found')
      }
    })

    server.listen(8085, '127.0.0.1', () => {
      console.log('OAuth callback server listening on http://127.0.0.1:8085')
    })

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close()
      resolve({
        success: false,
        error: 'OAuth flow timed out',
      })
    }, 5 * 60 * 1000)
  })
}

/**
 * Check if user is logged in with Google Gemini CLI
 */
export async function isGeminiCliLoggedIn(): Promise<boolean> {
  try {
    const token = await getGoogleCloudAccessToken()
    return token !== null
  } catch {
    return false
  }
}

/**
 * Logout from Google Gemini CLI
 */
export async function logoutGeminiCli(): Promise<void> {
  const auth = await loadAuthFile()
  delete auth['google-gemini-cli']
  await saveAuthFile(auth)
}

/**
 * Get Google Cloud project ID from environment or credentials
 */
export function getGoogleCloudProjectId(): string | undefined {
  return (
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_PROJECT_ID ||
    undefined
  )
}