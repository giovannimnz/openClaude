/**
 * Google Cloud Code Assist API Provider
 * 
 * Implements the Google Cloud Code Assist API for Gemini CLI
 * Compatible with GSD-2/Pi SDK implementation
 * 
 * Uses OAuth tokens for authentication and provides access to
 * Gemini models through Google Cloud Code Assist endpoints
 */

import {
  getGoogleCloudAccessToken,
  refreshGoogleCloudToken,
  getGoogleCloudProjectId,
} from '../oauth/google-gemini-cli.js'

// Google Cloud Code Assist API endpoints
const CLOUD_CODE_ASSIST_BASE_URL = 'https://cloudcodeassist.googleapis.com/v1'
const CLOUD_CODE_ASSIST_STREAM_URL = 'https://cloudcodeassist.googleapis.com/v1beta/stream'

// Cloud Code Assist API models
export const CLOUD_CODE_ASSIST_MODELS = {
  GEMINI_2_0_FLASH: 'gemini-2.0-flash',
  GEMINI_2_5_PRO: 'gemini-2.5-pro',
  GEMINI_3_0_FLASH: 'gemini-3.0-flash',
  GEMINI_3_0_PRO: 'gemini-3.0-pro',
} as const

/**
 * Cloud Code Assist API request configuration
 */
export interface CloudCodeAssistConfig {
  model: keyof typeof CLOUD_CODE_ASSIST_MODELS
  projectId?: string
  accessToken?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  topK?: number
}

/**
 * Message format for Cloud Code Assist API
 */
export interface CloudCodeAssistMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Chat completion response
 */
export interface CloudCodeAssistResponse {
  id: string
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Streaming chunk
 */
export interface CloudCodeAssistStreamChunk {
  id: string
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: string
      content?: string
    }
    finish_reason: string | null
  }>
}

/**
 * Get access token with auto-refresh
 */
async function getValidAccessToken(): Promise<string> {
  try {
    const token = await getGoogleCloudAccessToken()
    if (token) {
      return token
    }
  } catch {
    // Token not found or expired, refresh it
  }

  return await refreshGoogleCloudToken()
}

/**
 * Build Cloud Code Assist API URL
 */
function buildApiUrl(endpoint: string, projectId?: string): string {
  const pid = projectId || getGoogleCloudProjectId()
  if (!pid) {
    throw new Error('Google Cloud project ID is required. Set GOOGLE_CLOUD_PROJECT environment variable.')
  }
  return `${CLOUD_CODE_ASSIST_BASE_URL}/projects/${pid}/${endpoint}`
}

/**
 * Make non-streaming request to Cloud Code Assist API
 */
export async function chatCompletion(
  messages: CloudCodeAssistMessage[],
  config: CloudCodeAssistConfig,
): Promise<CloudCodeAssistResponse> {
  const accessToken = await getValidAccessToken()
  const url = buildApiUrl('models/gemini-pro:generateContent', config.projectId)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'x-goog-user-project': config.projectId || getGoogleCloudProjectId() || '',
    },
    body: JSON.stringify({
      model: `projects/${config.projectId || getGoogleCloudProjectId()}/models/${config.model}`,
      contents: messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens ?? 4096,
        topP: config.topP ?? 0.9,
        topK: config.topK ?? 40,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Cloud Code Assist API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  
  // Convert Cloud Code Assist response to OpenAI-compatible format
  return {
    id: data.id || `chatcmpl-${Date.now()}`,
    model: config.model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        },
        finish_reason: data.candidates?.[0]?.finishReason || 'stop',
      },
    ],
    usage: {
      prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: data.usageMetadata?.totalTokenCount || 0,
    },
  }
}

/**
 * Make streaming request to Cloud Code Assist API
 */
export async function* chatCompletionStream(
  messages: CloudCodeAssistMessage[],
  config: CloudCodeAssistConfig,
): AsyncGenerator<CloudCodeAssistStreamChunk, void, unknown> {
  const accessToken = await getValidAccessToken()
  const url = buildApiUrl('models/gemini-pro:streamGenerateContent', config.projectId)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'x-goog-user-project': config.projectId || getGoogleCloudProjectId() || '',
    },
    body: JSON.stringify({
      model: `projects/${config.projectId || getGoogleCloudProjectId()}/models/${config.model}`,
      contents: messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens ?? 4096,
        topP: config.topP ?? 0.9,
        topK: config.topK ?? 40,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Cloud Code Assist API error: ${response.status} - ${error}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Response body is not readable')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      
      // Process NDJSON lines (Cloud Code Assist uses newline-delimited JSON)
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (!line.trim()) continue
        
        try {
          const data = JSON.parse(line)
          
          // Convert Cloud Code Assist streaming response to OpenAI-compatible format
          const chunk: CloudCodeAssistStreamChunk = {
            id: data.id || `chatcmpl-${Date.now()}`,
            model: config.model,
            choices: [
              {
                index: 0,
                delta: {
                  role: 'assistant',
                  content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
                },
                finish_reason: data.candidates?.[0]?.finishReason || null,
              },
            ],
          }
          
          yield chunk
        } catch (error) {
          // Skip invalid JSON lines
          console.error('Error parsing streaming chunk:', error)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Check if Cloud Code Assist API is available
 */
export async function isCloudCodeAssistAvailable(): Promise<boolean> {
  try {
    const token = await getValidAccessToken()
    const projectId = getGoogleCloudProjectId()
    
    if (!projectId) {
      return false
    }

    const response = await fetch(
      buildApiUrl('models', projectId),
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-goog-user-project': projectId,
        },
      },
    )
    
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get available models from Cloud Code Assist
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    const token = await getValidAccessToken()
    const projectId = getGoogleCloudProjectId()
    
    if (!projectId) {
      return Object.values(CLOUD_CODE_ASSIST_MODELS)
    }

    const response = await fetch(
      buildApiUrl('models', projectId),
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-goog-user-project': projectId,
        },
      },
    )
    
    if (!response.ok) {
      return Object.values(CLOUD_CODE_ASSIST_MODELS)
    }

    const data = await response.json()
    return data.models?.map((m: { name: string }) => 
      m.name.split('/').pop()
    ) || Object.values(CLOUD_CODE_ASSIST_MODELS)
  } catch {
    return Object.values(CLOUD_CODE_ASSIST_MODELS)
  }
}