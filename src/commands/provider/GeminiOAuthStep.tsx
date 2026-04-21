/**
 * GeminiOAuthStep Component
 * Handles OAuth login for Google Gemini CLI in provider setup
 */

import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { LoadingState } from '../../components/design-system/LoadingState.js'
import type { ProfileEnv } from '../../utils/providerProfile.js'

interface GeminiOAuthStepProps {
  onSave: (profile: string, env: ProfileEnv) => void
  onBack: () => void
  onCancel: () => void
}

export function GeminiOAuthStep({
  onSave,
  onBack,
  onCancel,
}: GeminiOAuthStepProps): React.ReactNode {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    performGeminiOAuthLogin()
  }, [])

  const performGeminiOAuthLogin = async () => {
    try {
      setLoading(true)
      setError(null)

      // Import the Gemini OAuth client
      const {
        loginGeminiOAuth,
        getGeminiOAuthTokenJSON,
        getGeminiOAuthProfile,
      } = await import('../../../services/oauth/gemini-oauth-client.js')

      // Perform OAuth flow with browser
      const { openBrowser } = await import('../../utils/browser.js')

      await loginGeminiOAuth(openBrowser)

      // Get token and profile
      const tokenInfo = await getGeminiOAuthTokenJSON()
      const profile = await getGeminiOAuthProfile()

      if (!tokenInfo) {
        throw new Error('Failed to retrieve OAuth token')
      }

      // Build profile env
      const env: ProfileEnv = {
        CLAUDE_CODE_USE_GEMINI: 'true',
        GEMINI_API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
        GEMINI_PROJECT_ID: tokenInfo.projectId,
      }

      // Store the profile
      const profileJson = JSON.stringify({
        type: 'gemini-oauth',
        email: profile?.email,
        projectId: tokenInfo.projectId,
        provider: 'google-gemini-cli',
      })

      onSave(profileJson, env)

      setLoading(false)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(errorMsg)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Dialog title="Gemini CLI OAuth" onCancel={onCancel}>
        <Box flexDirection="column" gap={1}>
          <LoadingState text="Opening browser for Google authorization..." />
          <Text dimColor>
            A browser window should open. Sign in with your Google account.
          </Text>
        </Box>
      </Dialog>
    )
  }

  if (error) {
    return (
      <Dialog
        title="Gemini CLI OAuth - Error"
        onCancel={onCancel}
      >
        <Box flexDirection="column" gap={1}>
          <Text color="red">Error: {error}</Text>
          <Text dimColor>
            Make sure you have set the Google OAuth environment variables:
          </Text>
          <Text dimColor>  GOOGLE_OAUTH_CLIENT_ID</Text>
          <Text dimColor>  GOOGLE_OAUTH_CLIENT_SECRET</Text>
          <Text dimColor>  GOOGLE_CLOUD_PROJECT</Text>
          <Box gap={2} marginTop={1}>
            <Box>
              <Text
                onPress={() => {
                  performGeminiOAuthLogin()
                }}
                color="cyan"
              >
                ← Retry
              </Text>
            </Box>
            <Box>
              <Text
                onPress={onBack}
                color="cyan"
              >
                ← Back
              </Text>
            </Box>
          </Box>
        </Box>
      </Dialog>
    )
  }

  return null
}
