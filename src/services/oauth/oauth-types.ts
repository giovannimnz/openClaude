/**
 * OAuth types and schemas for various providers
 */

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  scopes: string[]
  profile?: OAuthProfile
  tokenAccount?: {
    uuid: string
    emailAddress: string
    organizationUuid: string
  }
}

export interface OAuthProfile {
  account: {
    uuid: string
    email: string
    display_name?: string
    created_at?: string
  }
  organization: {
    uuid: string
    has_extra_usage_enabled?: boolean
    billing_type?: string
    subscription_created_at?: string
  }
}

export interface OAuthCredential {
  type: 'oauth'
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scopes: string[]
  provider: string
}

export interface OAuthApiKeyCredential {
  type: 'api_key'
  key: string
  provider: string
}

export type Credential = OAuthCredential | OAuthApiKeyCredential

/**
 * Gemini-specific OAuth types
 */
export interface GeminiOAuthToken {
  accessToken: string
  refreshToken: string
  expiresAt: number
  projectId: string
  scopes: string[]
}

export interface GeminiOAuthProfile {
  email: string
  name: string
  picture?: string
}

export type SubscriptionType =
  | 'free'
  | 'pro'
  | 'team'
  | 'enterprise'
  | 'organization'

export type RateLimitTier = 'free' | 'pro' | 'pro_plus' | 'team' | 'enterprise'
