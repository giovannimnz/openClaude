/**
 * Google Gemini CLI Authentication Component
 * 
 * Implements authentication following the official Gemini CLI flow
 * Based on: https://google-gemini.github.io/gemini-cli/docs/get-started/authentication.html
 * 
 * Options:
 * 1. Login with Google - Recommended for Google AI Pro/Ultra users
 * 2. Use Gemini API Key - For users who prefer API keys
 * 3. Vertex AI - For Google Cloud Code Assist users
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Box, Text, Link } from '../ink.js'
import { Spinner } from './Spinner.js'
import { logEvent } from '../services/analytics/index.js'
import { logError } from '../utils/log.js'
import {
  loginGeminiCli,
  loginGeminiCliGoogle,
  loginVertexAI,
  isGeminiCliLoggedIn,
  logoutGeminiCli,
  detectEnterpriseEnvironment,
  checkGcloudAvailability,
  type OAuthFlowResult,
  type AuthMode,
  type EnterpriseInfo,
} from '../services/oauth/google-gemini-cli.js'

type GoogleGeminiCliOAuthProps = {
  onDone: (success: boolean) => void
  mode?: 'login' | 'logout'
  forceAuthMode?: AuthMode
}

type OAuthStatus =
  | { state: 'idle' }
  | { state: 'selecting_method'; enterpriseInfo: EnterpriseInfo; hasGcloud: boolean }
  | { state: 'waiting_for_login'; url: string; authMode: AuthMode }
  | { state: 'processing' }
  | { state: 'success' }
  | { state: 'error'; message: string }

export function GoogleGeminiCliOAuth({
  onDone,
  mode = 'login',
  forceAuthMode,
}: GoogleGeminiCliOAuthProps): React.ReactNode {
  const [oauthStatus, setOAuthStatus] = useState<OAuthStatus>({ state: 'idle' })

  // Check login status on mount
  useEffect(() => {
    async function checkStatus() {
      if (mode === 'logout') {
        try {
          await logoutGeminiCli()
          setOAuthStatus({ state: 'success' })
          logEvent('google_gemini_cli_logout_success', {})
        } catch (error) {
          logError(error)
          setOAuthStatus({ state: 'error', message: String(error) })
        }
        return
      }

      const isLoggedIn = await isGeminiCliLoggedIn()
      if (isLoggedIn) {
        setOAuthStatus({ state: 'success' })
        onDone(true)
      } else {
        setOAuthStatus({ state: 'selecting_method', enterpriseInfo: detectEnterpriseEnvironment(), hasGcloud: await checkGcloudAvailability() })
      }
    }
    checkStatus()
  }, [mode, onDone])

  // Start authentication process
  useEffect(() => {
    async function startAuth() {
      if (oauthStatus.state !== 'selecting_method') return

      const enterpriseInfo = detectEnterpriseEnvironment()
      const hasGcloud = await checkGcloudAvailability()

      // If force mode is specified, use it directly
      if (forceAuthMode) {
        await performLogin(forceAuthMode, enterpriseInfo)
        return
      }

      // If enterprise environment with project and gcloud, auto-select Vertex AI
      if (enterpriseInfo.projectId && enterpriseInfo.location && hasGcloud) {
        setOAuthStatus({ state: 'processing' })
        await performLogin('vertex-ai', enterpriseInfo)
        return
      }

      // Otherwise show selection (or auto-select Google login)
      if (!enterpriseInfo.projectId) {
        setOAuthStatus({ state: 'processing' })
        await performLogin('gemini-cli-google', enterpriseInfo)
      }
    }
    startAuth()
  }, [oauthStatus.state, forceAuthMode])

  // Handle method selection (for UI)
  const handleMethodSelection = useCallback(async (authMode: AuthMode) => {
    setOAuthStatus({ state: 'processing' })
    
    const enterpriseInfo = detectEnterpriseEnvironment()
    await performLogin(authMode, enterpriseInfo)
  }, [])

  // Perform login with selected mode
  const performLogin = useCallback(async (authMode: AuthMode, enterpriseInfo: EnterpriseInfo) => {
    try {
      let result: OAuthFlowResult

      if (authMode === 'vertex-ai') {
        result = await loginVertexAI()
      } else {
        result = await loginGeminiCli(
          async (url) => {
            // Open URL in browser
            const { exec } = await import('node:child_process')
            const platform = process.platform
            let command: string
            
            if (platform === 'win32') {
              command = `start "" "${url}"`
            } else if (platform === 'darwin') {
              command = `open "${url}"`
            } else {
              command = `xdg-open "${url}"`
            }
            
            exec(command, (error) => {
              if (error) {
                logError(new Error(`Failed to open browser: ${error.message}`))
              }
            })
          },
          (url) => {
            setOAuthStatus({ state: 'waiting_for_login', url, authMode })
          }
        )
      }

      if (result.success) {
        setOAuthStatus({ state: 'success' })
        logEvent('google_gemini_cli_login_success', {
          authMode: result.authMode,
          projectId: result.projectId,
          accountType: result.accountType
        })
      } else {
        setOAuthStatus({ state: 'error', message: result.error })
        logEvent('google_gemini_cli_login_failed', {
          error: result.error,
          authMode
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setOAuthStatus({ state: 'error', message: errorMessage })
      logError(error)
    }
  }, [])

  // Auto-close on success
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

      case 'selecting_method':
        return (
          <Box flexDirection="column" gap={1}>
            <Text color="cyan">
              🔐 Google Gemini CLI Authentication
            </Text>
            
            {oauthStatus.enterpriseInfo.projectId && (
              <Box flexDirection="column" gap={1} marginTop={1}>
                <Text color="yellow">
                  🏢 Enterprise Project Detected
                </Text>
                <Text dimColor>
                  📋 Project: {oauthStatus.enterpriseInfo.projectId}
                </Text>
                {oauthStatus.enterpriseInfo.location && (
                  <Text dimColor>
                    📍 Location: {oauthStatus.enterpriseInfo.location}
                  </Text>
                )}
              </Box>
            )}
            
            <Box flexDirection="column" gap={1} marginTop={1}>
              <Text dimColor>
                🔄 Select authentication method:
              </Text>
              
              <Text color="green">
                [1] Login with Google (Recommended)
              </Text>
              <Text dimColor>
                • For Google AI Pro/Ultra subscribers
              </Text>
              <Text dimColor>
                • Simple browser-based login
              </Text>
              
              {oauthStatus.enterpriseInfo.projectId && oauthStatus.hasGcloud && (
                <Text color="blue">
                  [2] Vertex AI (Enterprise)
                </Text>
              )}
            </Box>
            
            <Text dimColor marginTop={1}>
              {oauthStatus.enterpriseInfo.projectId && oauthStatus.hasGcloud
                ? 'Press 1 for Login with Google or 2 for Vertex AI, then Enter'
                : 'Press Enter for Login with Google'}
            </Text>
          </Box>
        )

      case 'waiting_for_login':
        return (
          <Box flexDirection="column" gap={1}>
            <Box>
              <Spinner />
              <Text>
                {oauthStatus.authMode === 'vertex-ai'
                  ? 'Waiting for gcloud authentication...'
                  : 'Opening browser for Google authentication...'}
              </Text>
            </Box>
            
            {oauthStatus.authMode === 'gemini-cli-google' && (
              <Box flexDirection="column" gap={1}>
                <Text dimColor>If the browser didn't open, visit:</Text>
                <Link url={oauthStatus.url}>
                  <Text dimColor>{oauthStatus.url}</Text>
                </Link>
              </Box>
            )}
            
            <Text dimColor>
              {oauthStatus.authMode === 'vertex-ai'
                ? 'Complete the gcloud authentication in your terminal.'
                : 'Complete the authentication in your browser.'}
            </Text>
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
            <Text dimColor>
              You can now use Google Gemini models.
            </Text>
          </Box>
        )

      case 'error':
        return (
          <Box flexDirection="column" gap={1}>
            <Text color="error">
              ✗ Authentication failed: {oauthStatus.message}
            </Text>
            <Text dimColor>
              Please try again or contact support if the problem persists.
            </Text>
          </Box>
        )
    }
  }

  return (
    <Box flexDirection="column" gap={1}>
      {renderStatusMessage()}
    </Box>
  )
}