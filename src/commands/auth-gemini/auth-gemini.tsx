/**
 * Google Gemini CLI OAuth Manager Component
 */

import chalk from 'chalk'
import { Fragment } from 'react'
import { Box, Text } from 'ink'
import { useInput, useWindowSize } from 'ink'
import {
  getGeminiOAuthStatus,
  hasGeminiOAuth,
  logoutGeminiOAuth,
} from '../../services/oauth/gemini-oauth-client.js'
import { openBrowser } from '../../utils/browser.js'

interface State {
  mode: 'menu' | 'logging-in' | 'status' | 'error'
  error?: string
  status?: {
    loggedIn: boolean
    email?: string
    name?: string
    projectId?: string
    expiresAt?: number
  }
}

export default function AuthGeminiComponent(): React.ReactNode {
  const [state, setState] = (useInput as any)((input: string) => {
    // Handle menu navigation
    if (input === '1' && state.mode === 'menu') {
      handleLogin()
    } else if (input === '2' && state.mode === 'menu') {
      handleLogout()
    } else if (input === '3' && state.mode === 'menu') {
      handleStatus()
    } else if (input === 'q' && state.mode === 'menu') {
      process.exit(0)
    }
  }) || {}

  const [state, setState] = (() => {
    const [s, setS] = require('react').useState<State>({
      mode: 'menu',
    })
    return [s, setS]
  })()

  const handleLogin = async () => {
    setState({ mode: 'logging-in' })
    try {
      const { loginGeminiOAuth } = await import(
        '../../services/oauth/gemini-oauth-client.js'
      )
      await loginGeminiOAuth(openBrowser)
      setState({ mode: 'status' })
    } catch (err) {
      setState({ mode: 'error', error: String(err) })
    }
  }

  const handleLogout = async () => {
    try {
      await logoutGeminiOAuth()
      setState({ mode: 'menu' })
    } catch (err) {
      setState({ mode: 'error', error: String(err) })
    }
  }

  const handleStatus = async () => {
    try {
      const status = await getGeminiOAuthStatus()
      setState({ mode: 'status', status })
    } catch (err) {
      setState({ mode: 'error', error: String(err) })
    }
  }

  if (state.mode === 'menu') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          Google Gemini CLI OAuth
        </Text>
        <Text>
          Manage credentials for Google's Gemini CLI via Cloud Code Assist
        </Text>
        <Text>
          {'\n'}
        </Text>
        <Text>1. Login</Text>
        <Text>2. Logout</Text>
        <Text>3. Status</Text>
        <Text>q. Quit</Text>
      </Box>
    )
  }

  if (state.mode === 'logging-in') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="blue">Logging in...</Text>
        <Text dim>
          Opening browser for authorization...
        </Text>
      </Box>
    )
  }

  if (state.mode === 'status' && state.status) {
    const status = state.status
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color={status.loggedIn ? 'green' : 'yellow'}>
          {status.loggedIn ? '✓ Logged in' : '✗ Not logged in'}
        </Text>
        {status.email && <Text>Email: {status.email}</Text>}
        {status.name && <Text>Name: {status.name}</Text>}
        {status.projectId && <Text>Project: {status.projectId}</Text>}
        {status.expiresAt && (
          <Text>
            Expires: {new Date(status.expiresAt).toLocaleString()}
          </Text>
        )}
        <Text>{'\n'}</Text>
        <Text dim>Press any key to return to menu...</Text>
      </Box>
    )
  }

  if (state.mode === 'error') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red">
          Error
        </Text>
        <Text>{state.error}</Text>
        <Text>{'\n'}</Text>
        <Text dim>Press any key to return to menu...</Text>
      </Box>
    )
  }

  return null
}
