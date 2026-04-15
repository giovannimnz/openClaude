/**
 * Google Gemini CLI OAuth Flow Component
 * 
 * Implements OAuth login flow for Google Cloud Code Assist
 * Supports both standard OAuth and gcloud ADC authentication
 * Compatible with GSD-2/Pi SDK implementation
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Box, Text, Link } from '../ink.js'
import { Spinner } from './Spinner.js'
import { logEvent } from '../services/analytics/index.js'
import { logError } from '../utils/log.js'
import {
  loginGeminiCli,
  loginGcloudADC,
  isGeminiCliLoggedIn,
  logoutGeminiCli,
  detectEnterpriseEnvironment,
  checkGcloudAvailability,
  checkADCAvailability,
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
  | { state: 'starting' }
  | { state: 'selecting_mode'; enterpriseInfo: EnterpriseInfo; hasGcloud: boolean; hasADC: boolean }
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
  const [selectedAuthMode, setSelectedAuthMode] = useState<AuthMode | null>(null)

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
        setOAuthStatus({ state: 'starting' })
      }
    }
    checkStatus()
  }, [mode, onDone])

  // Start authentication process
  useEffect(() => {
    async function startAuth() {
      if (oauthStatus.state !== 'starting') return

      setOAuthStatus({ state: 'processing' })

      const enterpriseInfo = detectEnterpriseEnvironment()
      const hasGcloud = await checkGcloudAvailability()
      const hasADC = await checkADCAvailability()

      // If force mode is specified, use it directly
      if (forceAuthMode) {
        setSelectedAuthMode(forceAuthMode)
        await performLogin(forceAuthMode, enterpriseInfo)
        return
      }

      // If enterprise environment and gcloud ADC is available, offer choice
      if (enterpriseInfo.projectId && hasGcloud) {
        setOAuthStatus({
          state: 'selecting_mode',
          enterpriseInfo,
          hasGcloud,
          hasADC
        })
        return
      }

      // Otherwise use OAuth directly
      setSelectedAuthMode('oauth')
      await performLogin('oauth', enterpriseInfo)
    }
    startAuth()
  }, [oauthStatus.state, forceAuthMode])

  // Perform login with selected mode
  const performLogin = useCallback(async (authMode: AuthMode, enterpriseInfo: EnterpriseInfo) => {
    try {
      let result: OAuthFlowResult

      if (authMode === 'gcloud-adc') {
        result = await loginGcloudADC()
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
          projectId: result.projectId
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

  // Handle mode selection
  const handleModeSelection = useCallback(async (authMode: AuthMode) => {
    setSelectedAuthMode(authMode)
    setOAuthStatus({ state: 'processing' })
    
    const enterpriseInfo = detectEnterpriseEnvironment()
    await performLogin(authMode, enterpriseInfo)
  }, [performLogin])

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

      case 'starting':
        return (
          <Box flexDirection="column" gap={1}>
            <Box>
              <Spinner />
              <Text>Starting Google Gemini CLI authentication...</Text>
            </Box>
          </Box>
        )

      case 'selecting_mode':
        return (
          <Box flexDirection="column" gap={1}>
            <Text color="cyan">
              🏢 Enterprise Environment Detected
            </Text>
            {oauthStatus.enterpriseInfo.projectId && (
              <Text dimColor>
                📋 Project: {oauthStatus.enterpriseInfo.projectId}
              </Text>
            )}
            <Text dimColor>
              🔄 Select authentication method:
            </Text>
            <Box flexDirection="column" gap={1} marginTop={1}>
              <Text color="green">
                [1] Gcloud ADC (Recommended for Enterprise)
              </Text>
              <Text dimColor>
                Uses: gcloud auth application-default login
              </Text>
              <Text dimColor>
                Pros: No browser needed, works with corporate accounts
              </Text>
              
              <Text color="blue">
                [2] OAuth Browser Login (Standard)
              </Text>
              <Text dimColor>
                Uses: Google OAuth 2.0 in browser
              </Text>
              <Text dimColor>
                Pros: Simple, standard Google login
              </Text>
            </Box>
            <Text dimColor marginTop={1}>
              Press 1 for Gcloud ADC or 2 for OAuth, then Enter
            </Text>
          </Box>
        )

      case 'waiting_for_login':
        return (
          <Box flexDirection="column" gap={1}>
            <Box>
              <Spinner />
              <Text>
                {oauthStatus.authMode === 'gcloud-adc' 
                  ? 'Waiting for gcloud authentication...' 
                  : 'Opening browser for Google authentication...'}
              </Text>
            </Box>
            {oauthStatus.authMode === 'oauth' && (
              <Box flexDirection="column" gap={1}>
                <Text dimColor>If the browser didn't open, visit:</Text>
                <Link url={oauthStatus.url}>
                  <Text dimColor>{oauthStatus.url}</Text>
                </Link>
              </Box>
            )}
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
            {selectedAuthMode === 'gcloud-adc' && (
              <Text dimColor>
                Using: Gcloud Application Default Credentials
              </Text>
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