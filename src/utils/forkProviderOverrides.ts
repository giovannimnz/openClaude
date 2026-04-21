/**
 * OpenClaude Fork Custom: Provider flag override
 *
 * Remaps environment variables so this fork uses different defaults:
 *   CLAUDE_CODE_USE_GEMINI       -> routes to Google Gemini CLI (OAuth)
 *   CLAUDE_CODE_USE_GEMINI_API   -> routes to Google Gemini API (key-based)
 *   ATIUS_ROUTER_API_KEY set     -> auto-detects Atius provider
 *
 * Default provider: Ollama (local)
 *
 * This module is designed to survive upstream merges:
 *   - Single file, easy to re-apply via git hook
 *   - sync-fork.sh automatically restores it after merge
 */

import { isEnvTruthy } from './envUtils.js'

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434/v1'
const DEFAULT_OLLAMA_MODEL = 'llama3.1:8b'

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

  // Auto-detect Atius provider when ATIUS_ROUTER_API_KEY is set
  if (process.env.ATIUS_ROUTER_API_KEY && !process.env.OPENAI_BASE_URL) {
    process.env.CLAUDE_CODE_USE_OPENAI = '1'
    process.env.OPENAI_BASE_URL = 'https://router.atius.com.br/v1'
    process.env.OPENAI_MODEL ??= 'MiniMax-M2.7'
    process.env.OPENAI_API_KEY = process.env.ATIUS_ROUTER_API_KEY
  }

  // Default: Ollama if no provider is set at all
  const hasAnyProvider =
    isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI) ||
    isEnvTruthy(process.env.CLAUDE_CODE_USE_GEMINI) ||
    isEnvTruthy(process.env.CLAUDE_CODE_USE_GEMINI_CLI) ||
    isEnvTruthy(process.env.CLAUDE_CODE_USE_MISTRAL) ||
    isEnvTruthy(process.env.CLAUDE_CODE_USE_GITHUB) ||
    isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK) ||
    isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX) ||
    isEnvTruthy(process.env.NVIDIA_NIM) ||
    isEnvTruthy(process.env.MINIMAX_API_KEY) ||
    !!process.env.ATIUS_ROUTER_API_KEY ||
    !!process.env.ANTHROPIC_API_KEY ||
    !!process.env.OPENAI_API_KEY

  if (!hasAnyProvider) {
    // No provider configured — default to Ollama
    process.env.CLAUDE_CODE_USE_OPENAI = '1'
    process.env.OPENAI_BASE_URL ??= DEFAULT_OLLAMA_BASE_URL
    process.env.OPENAI_MODEL ??= DEFAULT_OLLAMA_MODEL
    process.env.OPENAI_API_KEY ??= 'ollama'
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
  if (process.env.OPENAI_BASE_URL?.includes('router.atius.com.br')) {
    return 'Atius Native'
  }
  if (process.env.OPENAI_BASE_URL?.includes('localhost:11434')) {
    return 'Ollama'
  }
  return null
}
