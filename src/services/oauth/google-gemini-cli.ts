/**
 * Google Gemini CLI Authentication Implementation
 * 
 * Implements authentication for Google Gemini CLI following the official flow
 * Based on: https://google-gemini.github.io/gemini-cli/docs/get-started/authentication.html
 * 
 * Features:
 * - Official "Login with Google" flow
 * - Google Cloud Code Assist API support
 * - Google AI Pro/Ultra subscription support
 * - Project selection for enterprise environments
 * - Retry logic for token refresh
 */

import { randomBytes, createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

// Official Gemini CLI OAuth endpoints
const GEMINI_CLI_OAUTH_URL = 'https://geminicli.com/auth'
const GEMINI_CLI_REDIRECT_URI = 'http://127.0.0.1:8085'

// Storage paths (compatible with Pi SDK)
const PI_CONFIG_DIR = join(homedir(), '.pi')
const PI_AGENT_DIR = join(PI_CONFIG_DIR, 'agent')
const AUTH_JSON_PATH = join(PI_AGENT_DIR, 'auth.json')

/**
 * Authentication mode types
 */
export type AuthMode = 'gemini-cli-google' | 'gemini-api-key' | 'vertex-ai' | 'gcloud-adc'

/**
 * Gemini CLI credential types
 */
export type GeminiCliCredential = {
  type: 'gemini-cli-google'
  credentials: {
    access_token: string
    refresh_token: string
    expiry_date: number
    token_type: string
    scope: string
  }
  metadata?: {
    projectId?: string
    accountType?: 'personal' | 'workspace'
    subscription?: 'pro' | 'ultra' | 'code-assist'
  }
}

/**
 * API key credential types
 */
export type ApiKeyCredential = {
  type: 'gemini-api-key'
  credentials: {
    apiKey: string
  }
}

/**
 * Vertex AI credential types
 */
export type VertexAICredential = {
  type: 'vertex-ai'
  credentials: {
    projectId: string
    location: string
    authMethod: 'adc' | 'service-account' | 'api-key'
  }
}

/**
 * Combined credential types
 */
export type GoogleGeminiCredential = GeminiCliCredential | ApiKeyCredential | VertexAICredential

/**
 * Auth file structure
 */
export type AuthFile = {
  'google-gemini-cli'?: GoogleGeminiCredential
}

/**
 * OAuth flow result
 */
export type OAuthFlowResult =
  | {
      success: true
      accessToken: string
      refreshToken?: string
      expiryDate: number
      authMode: AuthMode
      projectId?: string
      accountType?: 'personal' | 'workspace'
    }
  | {
      success: false
      error: string
    }

/**
 * Enterprise environment info
 */
export type EnterpriseInfo = {
  projectId?: string
  location?: string
  hasGcloud: boolean
  hasVertexAI: boolean
}

/**
 * Detect enterprise environment
 */
export function detectEnterpriseEnvironment(): EnterpriseInfo {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.CLOUDSDK_CORE_PROJECT
  const location = process.env.GOOGLE_CLOUD_LOCATION || process.env.CLOUDSDK_CORE_LOCATION
  
  // Check if gcloud is available
  let hasGcloud = false
  try {
    const isWindows = process.platform === 'win32'
    const gcloudPath = isWindows 
      ? process.env.ProgramFiles + '\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd'
      : '/usr/local/bin/gcloud'
    hasGcloud = true
  } catch {
    hasGcloud = false
  }

  // Check for Vertex AI setup
  const hasVertexAI = !!(projectId && location) && !!process.env.GOOGLE_APPLICATION_CREDENTIALS
  
  return {
    projectId: projectId || undefined,
    location: location || undefined,
    hasGcloud,
    hasVertexAI
  }
}

/**
 * Check if gcloud is installed and can be used
 */
export async function checkGcloudAvailability(): Promise<boolean> {
  try {
    const isWindows = process.platform === 'win32'
    const command = isWindows ? 'gcloud.cmd' : 'gcloud'
    
    await execFileAsync(command, ['--version'], {
      windowsHide: true,
      timeout: 5000
    })
    return true
  } catch {
    return false
  }
}

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
  return { codeVerifier, codeChallenge }
}

/**
 * Generate random state parameter
 */
function generateState(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Check if token is expired
 */
function isTokenExpired(expiryDate: number): boolean {
  return Date.now() >= expiryDate - 60000 // 1 minute buffer
}

/**
 * Load auth.json file
 */
async function loadAuthFile(): Promise<AuthFile> {
  try {
    const content = await readFile(AUTH_JSON_PATH, 'utf-8')
    return JSON.parse(content)
  } catch {
    return {}
  }
}

/**
 * Save auth.json file
 */
async function saveAuthFile(auth: AuthFile): Promise<void> {
  await mkdir(PI_AGENT_DIR, { recursive: true })
  await writeFile(AUTH_JSON_PATH, JSON.stringify(auth, null, 2))
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Don't retry on certain errors
      if (lastError.message.includes('invalid_grant') || 
          lastError.message.includes('invalid_client') ||
          lastError.message.includes('unauthorized_client')) {
        throw lastError
      }
      
      // Exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError || new Error('Retry failed')
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForToken(code: string, codeVerifier: string) {
  // Use official Gemini CLI OAuth endpoint
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: '77185425430.apps.googleusercontent.com',
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: GEMINI_CLI_REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Token exchange failed (${response.status}): ${errorText}`)
  }

  return response.json()
}

/**
 * Refresh access token with retry logic
 */
async function refreshAccessToken(refreshToken: string): Promise<any> {
  return retryWithBackoff(async () => {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: '77185425430.apps.googleusercontent.com',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      
      // Handle specific error cases
      if (response.status === 400 && errorText.includes('invalid_grant')) {
        throw new Error('Refresh token expired or revoked. Please re-authenticate.')
      }
      
      if (response.status === 401) {
        throw new Error('Unauthorized. Please check your credentials.')
      }
      
      throw new Error(`Token refresh failed (${response.status}): ${errorText}`)
    }

    return response.json()
  }, 3, 1000)
}

/**
 * Get access token with automatic refresh and retry
 */
export async function getGoogleCloudAccessToken(): Promise<string> {
  try {
    const auth = await loadAuthFile()
    const geminiCliAuth = auth['google-gemini-cli']

    if (!geminiCliAuth) {
      throw new Error('No authentication credentials found. Please run `claude /auth login`.')
    }

    // Handle API key
    if (geminiCliAuth.type === 'gemini-api-key') {
      return geminiCliAuth.credentials.apiKey
    }

    // Handle Vertex AI (use gcloud ADC)
    if (geminiCliAuth.type === 'vertex-ai') {
      const isWindows = process.platform === 'win32'
      const command = isWindows ? 'gcloud.cmd' : 'gcloud'
      
      try {
        const { stdout } = await execFileAsync(command, ['auth', 'application-default', 'print-access-token'], {
          windowsHide: true,
          timeout: 10000
        })
        return stdout.trim()
      } catch (error) {
        throw new Error('Failed to get Vertex AI token. Please ensure gcloud is configured.')
      }
    }

    // Handle Gemini CLI Google login
    if (geminiCliAuth.type !== 'gemini-cli-google') {
      throw new Error('Invalid authentication type')
    }

    const { credentials } = geminiCliAuth

    // If token is still valid, return it
    if (!isTokenExpired(credentials.expiry_date)) {
      return credentials.access_token
    }

    // Token expired, refresh it with retry logic
    try {
      const newTokens = await refreshAccessToken(credentials.refresh_token)
      
      // Update credentials
      const updatedCredentials: GeminiCliCredential['credentials'] = {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || credentials.refresh_token,
        expiry_date: Date.now() + (newTokens.expires_in || 3600) * 1000,
        token_type: newTokens.token_type,
        scope: newTokens.scope,
      }

      // Save updated credentials
      auth['google-gemini-cli'] = {
        type: 'gemini-cli-google',
        credentials: updatedCredentials,
        metadata: geminiCliAuth.metadata
      }
      
      await saveAuthFile(auth)

      return newTokens.access_token
    } catch (error) {
      // If refresh fails, suggest re-authentication
      if (error instanceof Error && error.message.includes('invalid_grant')) {
        throw new Error('Authentication expired. Please run `claude /auth login` to re-authenticate.')
      }
      throw new Error(`Failed to refresh Google Cloud token: ${error}`)
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`Failed to get Google Cloud access token: ${error}`)
  }
}

/**
 * Check if user is logged in
 */
export async function isGeminiCliLoggedIn(): Promise<boolean> {
  try {
    const auth = await loadAuthFile()
    const geminiCliAuth = auth['google-gemini-cli']

    if (!geminiCliAuth) {
      return false
    }

    // For API key, always return true
    if (geminiCliAuth.type === 'gemini-api-key') {
      return true
    }

    // For Vertex AI, check if gcloud is configured
    if (geminiCliAuth.type === 'vertex-ai') {
      try {
        const isWindows = process.platform === 'win32'
        const command = isWindows ? 'gcloud.cmd' : 'gcloud'
        await execFileAsync(command, ['auth', 'application-default', 'print-access-token'], {
          windowsHide: true,
          timeout: 5000
        })
        return true
      } catch {
        return false
      }
    }

    // For Gemini CLI Google login, check if token exists and is not expired
    if (geminiCliAuth.type === 'gemini-cli-google') {
      return !isTokenExpired(geminiCliAuth.credentials.expiry_date)
    }

    return false
  } catch {
    return false
  }
}

/**
 * Logout from Google Gemini CLI
 */
export async function logoutGeminiCli(): Promise<void> {
  try {
    const auth = await loadAuthFile()
    delete auth['google-gemini-cli']
    await saveAuthFile(auth)
  } catch (error) {
    throw new Error(`Failed to logout: ${error}`)
  }
}

/**
 * Login via official Gemini CLI "Login with Google" flow
 */
export async function loginGeminiCliGoogle(
  openUrl: (url: string) => Promise<void>,
  onCodeReceived?: (url: string) => void,
): Promise<OAuthFlowResult> {
  const { codeVerifier, codeChallenge } = generatePKCE()
  const state = generateState()

  // Build official Gemini CLI OAuth URL
  const authUrl = new URL(GEMINI_CLI_OAUTH_URL)
  authUrl.searchParams.set('redirect_uri', GEMINI_CLI_REDIRECT_URI)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('access_type', 'offline') // For refresh token

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

        // Exchange code for tokens with retry
        try {
          const tokens = await retryWithBackoff(async () => {
            return await exchangeCodeForToken(code!, codeVerifier)
          }, 3, 1000)
          
          // Get enterprise info
          const enterpriseInfo = detectEnterpriseEnvironment()
          
          // Determine account type based on project
          const accountType = enterpriseInfo.projectId ? 'workspace' : 'personal'
          
          // Store tokens in auth.json
          const auth = await loadAuthFile()
          auth['google-gemini-cli'] = {
            type: 'gemini-cli-google',
            credentials: {
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              expiry_date: Date.now() + (tokens.expires_in || 3600) * 1000,
              token_type: tokens.token_type,
              scope: tokens.scope,
            },
            metadata: {
              projectId: enterpriseInfo.projectId,
              accountType,
              subscription: enterpriseInfo.projectId ? 'code-assist' : 'pro'
            }
          }
          await saveAuthFile(auth)

          // Send success response
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(`
            <html>
              <head><title>Authentication Successful</title></head>
              <body>
                <h1>Authentication Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
                ${enterpriseInfo.projectId ? `<p><strong>Project:</strong> ${enterpriseInfo.projectId}</p>` : ''}
                <p><strong>Account Type:</strong> ${accountType}</p>
              </body>
            </html>
          `)

          server.close()
          resolve({
            success: true,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: Date.now() + (tokens.expires_in || 3600) * 1000,
            authMode: 'gemini-cli-google',
            projectId: enterpriseInfo.projectId,
            accountType
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end(`Authentication failed: ${errorMessage}`)
          server.close()
          resolve({
            success: false,
            error: errorMessage,
          })
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not found')
      }
    })

    server.listen(8085, '127.0.0.1', () => {
      // Server is listening
    })
  })
}

/**
 * Login via Vertex AI (gcloud ADC)
 */
export async function loginVertexAI(): Promise<OAuthFlowResult> {
  try {
    const enterpriseInfo = detectEnterpriseEnvironment()
    
    if (!enterpriseInfo.projectId || !enterpriseInfo.location) {
      return {
        success: false,
        error: 'GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION environment variables are required for Vertex AI'
      }
    }

    const hasGcloud = await checkGcloudAvailability()
    if (!hasGcloud) {
      return {
        success: false,
        error: 'gcloud CLI is not installed. Please install it first.'
      }
    }

    const isWindows = process.platform === 'win32'
    const command = isWindows ? 'gcloud.cmd' : 'gcloud'
    
    // Run gcloud auth application-default login
    await execFileAsync(command, ['auth', 'application-default', 'login'], {
      windowsHide: false, // Allow user interaction
      timeout: 120000
    })
    
    // Store Vertex AI credentials
    const auth = await loadAuthFile()
    auth['google-gemini-cli'] = {
      type: 'vertex-ai',
      credentials: {
        projectId: enterpriseInfo.projectId,
        location: enterpriseInfo.location,
        authMethod: 'adc'
      },
      metadata: {
        projectId: enterpriseInfo.projectId,
        accountType: 'workspace',
        subscription: 'code-assist'
      }
    }
    await saveAuthFile(auth)
    
    return {
      success: true,
      accessToken: 'vertex-ai',
      expiryDate: Date.now() + 3600 * 1000,
      authMode: 'vertex-ai',
      projectId: enterpriseInfo.projectId
    }
  } catch (error) {
    return {
      success: false,
      error: `Vertex AI login failed: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * Main login function - auto-selects best auth method
 */
export async function loginGeminiCli(
  openUrl: (url: string) => Promise<void>,
  onCodeReceived?: (url: string) => void,
  forceMode?: AuthMode,
): Promise<OAuthFlowResult> {
  const enterpriseInfo = detectEnterpriseEnvironment()
  const hasGcloud = await checkGcloudAvailability()

  // If Vertex AI is explicitly requested
  if (forceMode === 'vertex-ai') {
    return await loginVertexAI()
  }

  // If enterprise environment with project and gcloud, suggest Vertex AI
  if (!forceMode && enterpriseInfo.projectId && enterpriseInfo.location && hasGcloud) {
    // Return with info about both options available
    return {
      success: false,
      error: 'Both "Login with Google" and "Vertex AI" are available. Set GOOGLE_CLOUD_PROJECT for corporate projects or use forceMode to select.'
    }
  }

  // Default to "Login with Google"
  return await loginGeminiCliGoogle(openUrl, onCodeReceived)
}

/**
 * Get current auth mode
 */
export async function getCurrentAuthMode(): Promise<AuthMode | null> {
  try {
    const auth = await loadAuthFile()
    const geminiCliAuth = auth['google-gemini-cli']

    if (!geminiCliAuth) {
      return null
    }

    return geminiCliAuth.type
  } catch {
    return null
  }
}

/**
 * Get current project ID
 */
export async function getCurrentProjectId(): Promise<string | null> {
  try {
    const auth = await loadAuthFile()
    const geminiCliAuth = auth['google-gemini-cli']

    if (!geminiCliAuth) {
      return null
    }

    if (geminiCliAuth.type === 'vertex-ai') {
      return geminiCliAuth.credentials.projectId
    }

    return geminiCliAuth.metadata?.projectId || null
  } catch {
    return null
  }
}