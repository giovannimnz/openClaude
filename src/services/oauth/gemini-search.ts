/**
 * Google Search Tool Extension
 * Provides google_search tool that uses Gemini OAuth for Cloud Code Assist API
 * Compatible with gsd-2's implementation
 */

import { getGeminiOAuthTokenJSON } from '../../services/oauth/gemini-oauth-client.js'

interface SearchResult {
  answer: string
  sources: Array<{
    title: string
    uri: string
    domain: string
  }>
  searchQueries: string[]
  cached: boolean
}

const resultCache = new Map<string, SearchResult>()

function cacheKey(query: string): string {
  return query.toLowerCase().trim()
}

export async function performGeminiSearch(
  query: string,
  maxSources: number = 5,
): Promise<SearchResult> {
  // Check cache
  const key = cacheKey(query)
  if (resultCache.has(key)) {
    return { ...resultCache.get(key)!, cached: true }
  }

  // Get OAuth token
  const tokenInfo = await getGeminiOAuthTokenJSON()
  if (!tokenInfo) {
    throw new Error(
      'No Gemini OAuth token found. Login first with: claude auth login google-gemini-cli',
    )
  }

  const model = process.env.GEMINI_SEARCH_MODEL || 'gemini-2.5-flash'
  const url =
    'https://cloudcode-pa.googleapis.com/v1internal:streamGenerateContent?alt=sse'

  const GEMINI_CLI_HEADERS = {
    ideType: 'IDE_UNSPECIFIED',
    platform: 'PLATFORM_UNSPECIFIED',
    pluginType: 'GEMINI',
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenInfo.token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
      'X-Goog-Api-Client': 'gl-node/22.17.0',
      'Client-Metadata': JSON.stringify(GEMINI_CLI_HEADERS),
    },
    body: JSON.stringify({
      project: tokenInfo.projectId,
      model,
      request: {
        contents: [{ parts: [{ text: query }] }],
        tools: [{ googleSearch: {} }],
      },
      userAgent: 'openclaude',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Cloud Code Assist API error (${response.status}): ${errorText}`,
    )
  }

  // Parse SSE response
  const text = await response.text()
  const jsonLines = text
    .split('\n')
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trim())
    .filter((l) => l.length > 0)

  let data
  if (jsonLines.length > 0) {
    data = JSON.parse(jsonLines[jsonLines.length - 1])
  } else {
    data = JSON.parse(text)
  }

  const candidate = data.response?.candidates?.[0]
  const answer = candidate?.content?.parts?.find((p: any) => p.text)?.text ?? ''
  const grounding = candidate?.groundingMetadata

  const sources: SearchResult['sources'] = []
  const seenTitles = new Set<string>()
  if (grounding?.groundingChunks) {
    for (const chunk of grounding.groundingChunks) {
      if (chunk.web) {
        const title = chunk.web.title ?? 'Untitled'
        if (seenTitles.has(title)) continue
        seenTitles.add(title)
        const domain = chunk.web.domain ?? title
        sources.push({
          title,
          uri: chunk.web.uri ?? '',
          domain,
        })
      }
    }
  }

  const searchQueries = grounding?.webSearchQueries ?? []

  const result: SearchResult = {
    answer,
    sources,
    searchQueries,
    cached: false,
  }

  // Cache result
  resultCache.set(key, result)

  return result
}

function formatSearchOutput(result: SearchResult, maxSources: number): string {
  const lines: string[] = []

  // Answer
  if (result.answer) {
    lines.push(result.answer)
  } else {
    lines.push('(No answer text returned from search)')
  }

  // Sources
  if (result.sources.length > 0) {
    lines.push('')
    lines.push('Sources:')
    const sourcesToShow = result.sources.slice(0, maxSources)
    for (let i = 0; i < sourcesToShow.length; i++) {
      const s = sourcesToShow[i]
      lines.push(`[${i + 1}] ${s.title} - ${s.domain}`)
      lines.push(`    ${s.uri}`)
    }
    if (result.sources.length > maxSources) {
      lines.push(
        `(${result.sources.length - maxSources} more sources omitted)`,
      )
    }
  } else {
    lines.push('')
    lines.push('(No source URLs found in grounding metadata)')
  }

  // Search queries
  if (result.searchQueries.length > 0) {
    lines.push('')
    lines.push(
      `Searches performed: ${result.searchQueries.map((q) => `"${q}"`).join(', ')}`,
    )
  }

  return lines.join('\n')
}

export function clearSearchCache(): void {
  resultCache.clear()
}

export function getSearchCacheSize(): number {
  return resultCache.size
}

/**
 * Web search via Google Search and Gemini
 * Returns AI-synthesized answer grounded in Google Search results with source URLs
 */
export async function googleSearch(
  query: string,
  maxSources: number = 5,
): Promise<string> {
  const result = await performGeminiSearch(query, maxSources)
  return formatSearchOutput(result, maxSources)
}
