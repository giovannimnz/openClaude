/**
 * Integration Points for Gemini OAuth with OpenClaude
 * Shows how the OAuth system connects to existing components
 */

// ────────────────────────────────────────────────────────────────────────────
// 1. CLI Integration
// ────────────────────────────────────────────────────────────────────────────

// In: src/cli/handlers/auth.ts
// When user runs: claude auth login google-gemini-cli
export async function authLoginGemini(): Promise<void> {
  const { geminiLogin } = await import(
    '../../commands/auth/gemini-oauth-handler.js'
  )
  return geminiLogin()
}

// Example usage:
// $ claude auth login google-gemini-cli
// $ claude auth status google-gemini-cli
// $ claude auth logout google-gemini-cli

// ────────────────────────────────────────────────────────────────────────────
// 2. Model Provider Integration
// ────────────────────────────────────────────────────────────────────────────

// In: src/utils/model/providers.ts
export async function getGeminiOAuthCredentials(): Promise<{
  token: string
  projectId: string
} | null> {
  const { getGeminiOAuthTokenJSON } = await import(
    '../../services/oauth/gemini-oauth-client.js'
  )
  return getGeminiOAuthTokenJSON()
}

// Usage in model initialization:
const credentials = await getGeminiOAuthCredentials()
if (credentials) {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      'X-Goog-Api-Client': `...`,
    },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Search Tool Integration
// ────────────────────────────────────────────────────────────────────────────

// In: src/services/oauth/gemini-search.ts
// Exported as a tool that can be called from extensions

import { googleSearch, performGeminiSearch } from './gemini-search.js'

// Usage in LLM context:
const searchResult = await googleSearch('latest OpenClaude features')
// Returns: AI-synthesized answer with sources from Google

// ────────────────────────────────────────────────────────────────────────────
// 4. MCP Server Integration
// ────────────────────────────────────────────────────────────────────────────

// In: src/services/mcp/auth.ts
// Could expose Gemini OAuth tokens to MCP servers

import { getGeminiOAuthToken } from './oauth/gemini-oauth-client.js'

export async function getCredentialsForMCPServer(
  serverId: string,
): Promise<Record<string, string> | null> {
  if (serverId === 'gemini-api') {
    const token = await getGeminiOAuthToken()
    if (token) {
      return {
        accessToken: token.accessToken,
        projectId: token.projectId,
      }
    }
  }
  return null
}

// ────────────────────────────────────────────────────────────────────────────
// 5. Settings Integration
// ────────────────────────────────────────────────────────────────────────────

// In: ~/.claude/settings.json
// Users can configure OAuth providers:

const exampleSettings = {
  // Google Gemini OAuth configuration
  googleOAuthClientId: "xxx.apps.googleusercontent.com",
  googleOAuthClientSecret: "xxx",
  googleCloudProject: "my-project",
  
  // Feature flags
  enableGeminiOAuth: true,
  enableGoogleSearch: true,
  
  // OAuth auto-refresh settings
  oauthRefreshBuffer: 5 * 60 * 1000, // 5 minutes
  oauthRefreshRetries: 3,
}

// ────────────────────────────────────────────────────────────────────────────
// 6. Analytics Integration
// ────────────────────────────────────────────────────────────────────────────

// Events logged:
// - gemini_oauth_login_success: { email, project }
// - gemini_oauth_login_failed: { error }
// - gemini_oauth_logout_success: {}
// - gemini_oauth_refresh_success: { projectId }
// - gemini_oauth_refresh_failed: { error, retry }

import { logEvent } from './services/analytics/index.js'

logEvent('gemini_oauth_login_success', {
  email: 'user@example.com',
  project: 'my-project',
})

// ────────────────────────────────────────────────────────────────────────────
// 7. Error Handling Integration
// ────────────────────────────────────────────────────────────────────────────

// When OAuth fails, user sees:
// "Error: Failed to get Gemini OAuth token"
// 
// Error types:
// - NO_CREDENTIALS: Not logged in
// - EXPIRED_TOKEN: Token expired (will attempt refresh)
// - REFRESH_FAILED: Both original and refresh token failed
// - NETWORK_ERROR: Connection issue
// - INVALID_PROJECT: Project ID not found

// In error handlers:
try {
  const token = await getGeminiOAuthToken()
} catch (err) {
  if (err.message.includes('Could not determine Google Cloud Project ID')) {
    // User needs to set GOOGLE_CLOUD_PROJECT
    process.stderr.write(
      'Please set GOOGLE_CLOUD_PROJECT environment variable\n'
    )
  } else if (err.message.includes('Token refresh failed')) {
    // Suggest re-login
    process.stderr.write(
      'Your Gemini OAuth token has expired. Run: claude auth login google-gemini-cli\n'
    )
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 8. Logout Integration
// ────────────────────────────────────────────────────────────────────────────

// When user logs out via performLogout(), should also logout Gemini:

import { logoutGeminiOAuth } from './services/oauth/gemini-oauth-client.js'

export async function performLogout(options: { clearOnboarding: boolean }) {
  // ... existing Anthropic logout ...
  
  // Also clear Gemini credentials
  try {
    await logoutGeminiOAuth()
  } catch {
    // Don't fail main logout if Gemini logout fails
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 9. Extension Hook Integration
// ────────────────────────────────────────────────────────────────────────────

// Extensions could check for Gemini OAuth and expose new tools:

export async function onSessionStart() {
  const { hasGeminiOAuth } = await import(
    './services/oauth/gemini-oauth-client.js'
  )
  
  if (await hasGeminiOAuth()) {
    // Register google_search tool
    registerTool({
      name: 'google_search',
      description: 'Search Google via Gemini',
      execute: (query) => googleSearch(query),
    })
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 10. Environment Variable Integration
// ────────────────────────────────────────────────────────────────────────────

// OAuth initialization checks environment:

export function initializeOAuth() {
  // Read OAuth credentials from env (for CI/CD or server contexts)
  if (process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    // Initialize with env credentials
  }
  
  // Check for headless mode
  if (process.env.CLAUDE_CODE_HEADLESS) {
    // Skip browser opening, use manual auth code flow
  }
  
  // Check for custom callback port
  if (process.env.GOOGLE_OAUTH_CALLBACK_PORT) {
    const port = parseInt(process.env.GOOGLE_OAUTH_CALLBACK_PORT)
    // Use custom port for callback server
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 11. Docker Integration
// ────────────────────────────────────────────────────────────────────────────

// In Dockerfile or docker-compose:
// 
// environment:
//   - GOOGLE_OAUTH_CLIENT_ID=xxx
//   - GOOGLE_OAUTH_CLIENT_SECRET=xxx
//   - GOOGLE_CLOUD_PROJECT=my-project
//   - GOOGLE_OAUTH_CALLBACK_PORT=8888
//
// ports:
//   - "8888:8888"  # For OAuth callback
//
// volumes:
//   - ~/.claude/oauth-credentials:/root/.claude/oauth-credentials  # Persist creds

// ────────────────────────────────────────────────────────────────────────────
// 12. Testing Integration
// ────────────────────────────────────────────────────────────────────────────

// Mock Gemini OAuth in tests:

import { vi } from 'vitest'

export function mockGeminiOAuth() {
  vi.mock('./services/oauth/gemini-oauth-client.js', () => ({
    getGeminiOAuthToken: vi.fn(async () => ({
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh',
      expiresAt: Date.now() + 3600000,
      projectId: 'mock-project',
      scopes: [],
    })),
    hasGeminiOAuth: vi.fn(async () => true),
    getGeminiOAuthStatus: vi.fn(async () => ({
      loggedIn: true,
      email: 'test@example.com',
      name: 'Test User',
      projectId: 'mock-project',
    })),
  }))
}

// Usage in tests:
describe('Google Search with OAuth', () => {
  beforeEach(() => mockGeminiOAuth())
  
  it('should use OAuth token for search', async () => {
    const result = await googleSearch('test query')
    // Test uses mocked OAuth token
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Summary of Integration Points
// ────────────────────────────────────────────────────────────────────────────

/*
1. ✅ CLI Commands       → auth.ts handlers (login/logout/status)
2. ✅ Model Providers    → providers.ts (getGeminiOAuthCredentials)
3. ✅ Search Tool        → gemini-search.ts (googleSearch)
4. ✅ MCP Servers        → auth.ts (getCredentialsForMCPServer)
5. ✅ Settings           → ~/.claude/settings.json
6. ✅ Analytics          → logEvent() calls throughout
7. ✅ Error Handling     → Graceful fallbacks and messages
8. ✅ Logout Flow        → performLogout() cleanup
9. ✅ Extensions         → onSessionStart() registration
10. ✅ Environment Vars  → initializeOAuth() checks
11. ✅ Docker/Container  → Volume mounts for credential persistence
12. ✅ Testing           → Mock implementations available

All integration points are designed to be:
- Non-breaking: Existing code works without OAuth
- Lazy-loaded: OAuth code only loads when needed
- Graceful: Failures don't crash the application
- Observable: Events logged for monitoring
- Testable: Full mock support for testing
*/
