/**
 * Atius router model discovery for the /model picker.
 * Fetches available models from the Atius router API and caches them
 * so the synchronous getModelOptions() can use them.
 */

import type { ModelOption } from './modelOptions.js'

const ATIUS_BASE_URL = 'https://router.atius.com.br/v1'

/**
 * Returns true when the current OPENAI_BASE_URL points at the Atius router.
 */
export function isAtiusProvider(): boolean {
  if (!process.env.OPENAI_BASE_URL) return false
  const baseUrl = process.env.OPENAI_BASE_URL
  return baseUrl.startsWith('https://router.atius.com.br') ||
         baseUrl.startsWith('http://router.atius.com.br')
}

/**
 * Fetch models from the Atius router /v1/models endpoint.
 */
export async function fetchAtiusModels(): Promise<ModelOption[]> {
  const apiKey = process.env.ATIUS_ROUTER_API_KEY ?? process.env.OPENAI_API_KEY
  if (!apiKey) return []

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${ATIUS_BASE_URL}/models`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })
    if (!response.ok) return []

    const data = (await response.json()) as {
      data?: Array<{
        id?: string
        object?: string
        created?: number
        owned_by?: string
      }>
    }

    return (data.data ?? [])
      .filter(m => Boolean(m.id))
      .map(m => {
        const ownedBy = m.owned_by ?? ''
        const description = ownedBy ? `Atius · ${ownedBy}` : 'Atius model'
        return {
          value: m.id!,
          label: m.id!,
          description,
        }
      })
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Prefetch and cache Atius models. Call during startup.
 */
export function prefetchAtiusModels(): void {
  if (!isAtiusProvider()) return
  const apiKey = process.env.ATIUS_ROUTER_API_KEY ?? process.env.OPENAI_API_KEY
  if (!apiKey) return

  fetchAtiusModels()
    .then(options => {
      cachedAtiusOptions = options
    })
}

let cachedAtiusOptions: ModelOption[] | null = null

/**
 * Get cached Atius model options (synchronous).
 * Returns empty array if not yet fetched.
 */
export function getCachedAtiusModelOptions(): ModelOption[] {
  return cachedAtiusOptions ?? []
}
