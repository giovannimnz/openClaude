/**
 * OpenClaude Fork Custom: Provider flag override
 *
 * Remaps environment variables so this fork uses different defaults:
 *   CLAUDE_CODE_USE_GEMINI       -> routes to Google Gemini CLI (OAuth)
 *   CLAUDE_CODE_USE_GEMINI_API   -> routes to Google Gemini API (key-based)
 *
 * Vertex AI (CLAUDE_CODE_USE_VERTEX) is left untouched — it already
 * exists upstream as a separate provider.
 *
 * This module is designed to survive upstream merges:
 *   - Single file, easy to re-apply via git hook
 *   - sync-fork.sh automatically restores it after merge
 */

import { isEnvTruthy } from './envUtils.js'

/**
 * Apply custom provider flag mapping for this fork.
 * Must be called early in startup, before any provider detection runs.
 */
export function applyForkProviderOverrides(): void {
  // If user explicitly set CLAUDE_CODE_USE_GEMINI, route to Gemini CLI (OAuth)
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_GEMINI)) {
    delete process.env.CLAUDE_CODE_USE_GEMINI
    process.env.CLAUDE_CODE_USE_GEMINI_CLI = '1'
  }

  // If user set CLAUDE_CODE_USE_GEMINI_API, route to Gemini API (key-based)
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_GEMINI_API)) {
    delete process.env.CLAUDE_CODE_USE_GEMINI_API
    process.env.CLAUDE_CODE_USE_GEMINI = '1'
  }
}

/**
 * Reverse mapping for display purposes (e.g., startup screen).
 * Returns the "user-facing" provider name.
 */
export function getForkProviderDisplay(): string | null {
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_GEMINI_CLI)) {
    return 'Google Gemini CLI'
  }
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_GEMINI)) {
    return 'Google Gemini API'
  }
  return null
}
