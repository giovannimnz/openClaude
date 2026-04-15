/**
 * Google Gemini CLI OAuth Flow Component
 * 
 * Implements OAuth login flow for Google Cloud Code Assist
 * Compatible with GSD-2/Pi SDK implementation
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Box, Text, Link } from '../ink.js'
import { Spinner } from './Spinner.js'
import TextInput from './TextInput.js'
import { logEvent } from '../services/analytics/index.js'
import { logError } from '../utils/log.js'
import {
  loginGeminiCli,
  isGeminiCliLoggedIn,
  logoutGeminiCli,
  getGoogleCloudProjectId,
  isEnterpriseEnvironment,
  getEnterpriseMetadata,
  type OAuthFlowResult,
} from '../services/oauth/google-gemini-cli.js'

type GoogleGeminiCliOAuthProps = {
  onDone: (success: boolean) => void
  mode?: 'login' | 'logout'
}

type OAuthStatus =
  | { state: 'idle' }
  | { state: 'starting' }
  | { state: 'waiting_for_login'; url: string }
  | { state: 'processing' }
  | { state: 'success' }
  | { state: 'error'; message: string }

export function GoogleGeminiCliOAuth({
  onDone,
  mode = 'login',
}: GoogleGeminiCliOAuthProps): React.ReactNode {
  const [oauthStatus, setOAuthStatus] = useState<OAuthStatus>({ state: 'idle' })
  const [pastedCode, setPastedCode] = useState('')
  const [enterpriseInfo, setEnterpriseInfo] = useState<{projectId?: string; environment?: string} | null>(null)

  // Check login status and enterprise environment on mount
  useEffect(() => {
    async function checkStatus() {
      // Check for enterprise environment
      if (isEnterpriseEnvironment()) {
        const projectId = getGoogleCloudProjectId()
        const metadata = await getEnterpriseMetadata()
        setEnterpriseInfo({
          projectId: projectId || metadata?.projectId,
          environment: metadata?.environment || 'enterprise',
        })
      }

      if (mode === 'logout') {
        try {
          await logoutGeminiCli()
          setOAuthStatus({ state: 'success' })
          logEvent('google_gemini_cli_logout_success', {})
        } catch (error) {
          logError(error)
          setOAuthStatus({
            state: 'error',
            message: `Logout failed: ${error}`,
          })
          logEvent('google_gemini_cli_logout_error', {
            error: String(error),
          })
        }
      } else {
        const isLoggedIn = await isGeminiCliLoggedIn()
        if (isLoggedIn) {
          setOAuthStatus({ state: 'success' })
          logEvent('google_gemini_cli_already_logged_in', {})
        }
      }
    }

    void checkStatus()
  }, [mode])

  // Start OAuth flow
  const startOAuth = useCallback(async () => {
    try {
      setOAuthStatus({ state: 'starting' })
      logEvent('google_gemini_cli_oauth_start', {})

      const result = await loginGeminiCli(
        async (url: string) => {
          // Open URL in browser
          const { default: open } = await import('open')
          await open(url, { wait: false })
        },
        (url: string) => {
          // Update UI with auth URL
          setOAuthStatus({
            state: 'waiting_for_login',
            url,
          })
        },
      )

      if (result.success) {
        setOAuthStatus({ state: 'success' })
        logEvent('google_gemini_cli_oauth_success', {})
      } else {
        setOAuthStatus({
          state: 'error',
          message: result.error || 'Authentication failed',
        })
        logEvent('google_gemini_cli_oauth_error', {
          error: result.error,
        })
      }
    } catch (error) {
      logError(error)
      setOAuthStatus({
        state: 'error',
        message: `OAuth flow failed: ${error}`,
      })
      logEvent('google_gemini_cli_oauth_error', {
        error: String(error),
      })
    }
  }, [])

  // Auto-start OAuth on mount (if not already logged in)
  useEffect(() => {
    if (mode === 'login' && oauthStatus.state === 'idle') {
      void startOAuth()
    }
  }, [mode, oauthStatus.state, startOAuth])

  // Handle completion
  useEffect(() => {
    if (oauthStatus.state === 'success') {
      const timer = setTimeout(() => {
        onDone(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [oauthStatus.state, onDone])

  // Render status message
  const renderStatusMessage = (): React.ReactNode => {
    switch (oauthStatus.state) {
      case 'idle':
        return <Text>Checking authentication status...</Text>

      case 'starting':
        return (
          <Box flexDirection="column" gap={1}>
            <Box>
              <Spinner />
              <Text>Starting Google Gemini CLI authentication...</Text>
            </Box>
            {enterpriseInfo && (
              <Box flexDirection="column" gap={1}>
                <Text color="cyan">
                  🏢 Enterprise Environment Detected
                </Text>
                {enterpriseInfo.projectId && (
                  <Text dimColor>
                    📋 Project: {enterpriseInfo.projectId}
                  </Text>
                )}
                <Text dimColor>
                  🔐 Using enterprise OAuth scopes
                </Text>
              </Box>
            )}
          </Box>
        )

      case 'waiting_for_login':
        return (
          <Box flexDirection="column" gap={1}>
            <Box>
              <Spinner />
              <Text>Opening browser for Google authentication...</Text>
            </Box>
            <Box flexDirection="column" gap={1}>
              <Text dimColor>If the browser didn't open, visit:</Text>
              <Link url={oauthStatus.url}>
                <Text dimColor>{oauthStatus.url}</Text>
              </Link>
            </Box>
            <Text dimColor>Complete the authentication in your browser.</Text>
          </Box>
        )

      case 'processing':
        return (
          <Box>
            <Spinner />
            <Text>Processing authentication...</Text>
          </Box>
        )

      case 'success':
        return (
          <Box flexDirection="column" gap={1}>
            <Text color="success">
              ✓ Google Gemini CLI authentication successful!
            </Text>
            {enterpriseInfo && (
              <Box flexDirection="column" gap={1}>
                <Text color="cyan">
                  🏢 Enterprise Environment
                </Text>
                {enterpriseInfo.projectId && (
                  <Text dimColor>
                    📋 Project: {enterpriseInfo.projectId}
                  </Text>
                )}
              </Box>
            )}
            {mode === 'login' && (
              <Text dimColor>
                You can now use Google Gemini models with your Google account.
              </Text>
            )}
          </Box>
        )

      case 'error':
        return (
          <Box flexDirection="column" gap={1}>
            <Text color="error">Authentication failed</Text>
            <Text>{oauthStatus.message}</Text>
            <Text dimColor>Press Ctrl+C to exit and try again.</Text>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Google Gemini CLI Authentication</Text>
      <Box paddingX={1}>{renderStatusMessage()}</Box>
    </Box>
  )
}