/**
 * Command: claude auth login [google-gemini-cli]
 * Handles OAuth login for Google Gemini CLI via Cloud Code Assist
 */

import * as process from 'process'
import chalk from 'chalk'
import {
  getGeminiOAuthStatus,
  getGeminiOAuthTokenJSON,
  loginGeminiOAuth,
  logoutGeminiOAuth,
} from '../../services/oauth/gemini-oauth-client.js'
import { logEvent } from '../../services/analytics/index.js'
import { errorMessage } from '../../utils/errors.js'
import { logError } from '../../utils/log.js'
import { openBrowser } from '../../utils/browser.js'

/**
 * Login with Google Gemini CLI OAuth
 */
export async function geminiLogin(): Promise<void> {
  try {
    process.stderr.write(
      chalk.blue('🔐 Logging in to Google Gemini CLI...\n'),
    )
    process.stderr.write(
      chalk.dim('Opening browser for authorization...\n'),
    )

    // Perform OAuth flow
    const token = await loginGeminiOAuth(openBrowser)

    // Get status for display
    const status = await getGeminiOAuthStatus()

    process.stderr.write(
      chalk.green(
        `\n✓ Successfully logged in to Google Gemini CLI\n`,
      ),
    )

    if (status.email) {
      process.stderr.write(chalk.dim(`Email: ${status.email}\n`))
    }

    if (status.name) {
      process.stderr.write(chalk.dim(`Name: ${status.name}\n`))
    }

    if (status.projectId) {
      process.stderr.write(chalk.dim(`Project: ${status.projectId}\n`))
    }

    if (status.expiresAt) {
      const expiryDate = new Date(status.expiresAt)
      process.stderr.write(
        chalk.dim(`Token expires: ${expiryDate.toLocaleString()}\n`),
      )
    }

    process.stderr.write(
      chalk.green(
        '\n✓ Gemini CLI OAuth credentials are now available for use.\n',
      ),
    )

    logEvent('gemini_oauth_login_success', {
      email: status.email,
      project: status.projectId,
    })

    process.exit(0)
  } catch (err) {
    logError(err)
    process.stderr.write(
      chalk.red(
        `\n✗ Login failed: ${errorMessage(err)}\n`,
      ),
    )

    logEvent('gemini_oauth_login_failed', {
      error: errorMessage(err),
    })

    process.exit(1)
  }
}

/**
 * Check Gemini OAuth login status
 */
export async function geminiStatus(): Promise<void> {
  try {
    const status = await getGeminiOAuthStatus()

    if (!status.loggedIn) {
      process.stdout.write(
        chalk.yellow('Not logged in to Google Gemini CLI.\n'),
      )
      process.stdout.write(
        chalk.dim(
          'Run: claude auth login google-gemini-cli\n',
        ),
      )
      process.exit(1)
    }

    process.stdout.write(
      chalk.green('✓ Logged in to Google Gemini CLI\n\n'),
    )

    if (status.email) {
      process.stdout.write(`Email: ${status.email}\n`)
    }

    if (status.name) {
      process.stdout.write(`Name: ${status.name}\n`)
    }

    if (status.projectId) {
      process.stdout.write(`Project: ${status.projectId}\n`)
    }

    if (status.expiresAt) {
      const expiryDate = new Date(status.expiresAt)
      const isExpired = expiryDate < new Date()
      process.stdout.write(
        `Token expires: ${expiryDate.toLocaleString()}${
          isExpired
            ? chalk.red(' (EXPIRED)')
            : chalk.dim(' (' + getRelativeTime(expiryDate) + ')')
        }\n`,
      )
    }

    process.exit(0)
  } catch (err) {
    logError(err)
    process.stderr.write(
      chalk.red(
        `Failed to get status: ${errorMessage(err)}\n`,
      ),
    )
    process.exit(1)
  }
}

/**
 * Logout from Gemini OAuth
 */
export async function geminiLogout(): Promise<void> {
  try {
    await logoutGeminiOAuth()
    process.stdout.write(
      chalk.green(
        '✓ Successfully logged out from Google Gemini CLI.\n',
      ),
    )

    logEvent('gemini_oauth_logout_success', {})

    process.exit(0)
  } catch (err) {
    logError(err)
    process.stderr.write(
      chalk.red(
        `Failed to logout: ${errorMessage(err)}\n`,
      ),
    )
    process.exit(1)
  }
}

/**
 * Helper: Get relative time string (e.g., "in 2 days")
 */
function getRelativeTime(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `in ${days} day${days > 1 ? 's' : ''}`
  }
  if (hours > 0) {
    return `in ${hours} hour${hours > 1 ? 's' : ''}`
  }
  if (minutes > 0) {
    return `in ${minutes} minute${minutes > 1 ? 's' : ''}`
  }
  return 'soon'
}
