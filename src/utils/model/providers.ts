import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { shouldUseCodexTransport } from '../../services/api/providerConfig.js'
import { isEnvTruthy } from '../envUtils.js'

export type APIProvider =
  | 'bedrock'
  | 'vertex'
  | 'foundry'
  | 'openai'
  | 'gemini'
  | 'github'
  | 'codex'
  | 'nvidia-nim'
  | 'minimax'
  | 'mistral'
  | 'google-gemini-cli'
  | 'ollama'

/**
 * OpenClaude fork: Anthropic removed. Default is Ollama (local).
 */
export function getAPIProvider(): APIProvider {
  if (isEnvTruthy(process.env.NVIDIA_NIM)) {
    return 'nvidia-nim'
  }
  if (isEnvTruthy(process.env.MINIMAX_API_KEY)) {
    return 'minimax'
  }
  return isEnvTruthy(process.env.CLAUDE_CODE_USE_GEMINI)
    ? 'gemini'
    :
    isEnvTruthy(process.env.CLAUDE_CODE_USE_MISTRAL)
    ? 'mistral'
    : isEnvTruthy(process.env.CLAUDE_CODE_USE_GITHUB)
      ? 'github'
      : isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI)
        ? isCodexModel()
          ? 'codex'
          : 'openai'
        : isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)
          ? 'bedrock'
          : isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)
            ? 'vertex'
            : isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)
              ? 'foundry'
              : 'ollama'
}

export function usesAnthropicAccountFlow(): boolean {
  return false
}

/**
 * OpenClaude fork: Anthropic removed — always false.
 */
export function isGithubNativeAnthropicMode(resolvedModel?: string): boolean {
  return false
}
function isCodexModel(): boolean {
  return shouldUseCodexTransport(
    process.env.OPENAI_MODEL || '',
    process.env.OPENAI_BASE_URL ?? process.env.OPENAI_API_BASE,
  )
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/**
 * OpenClaude fork: Anthropic removed — always false.
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  return false
}
