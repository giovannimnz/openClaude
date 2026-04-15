// Google Cloud Code Assist OAuth scopes
export const GOOGLE_CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform' as const
export const GOOGLE_CLOUD_CODE_ASSIST_SCOPE = 'https://www.googleapis.com/auth/cloud-code-assist' as const

// Google Gemini CLI OAuth scopes - for Google Cloud Code Assist
export const GOOGLE_GEMINI_CLI_OAUTH_SCOPES = [
  GOOGLE_CLOUD_PLATFORM_SCOPE,
  GOOGLE_CLOUD_CODE_ASSIST_SCOPE,
] as const

// Google Cloud OAuth configuration
export const GOOGLE_OAUTH_CONFIG = {
  AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
  TOKEN_URL: 'https://oauth2.googleapis.com/token',
  CLIENT_ID: '77185425430.apps.googleusercontent.com',
  REDIRECT_URI: 'http://127.0.0.1:8085',
  RESPONSE_TYPE: 'code',
  CODE_CHALLENGE_METHOD: 'S256',
} as const

// Google Cloud Code Assist API endpoints
export const GOOGLE_CLOUD_CODE_ASSIST_CONFIG = {
  BASE_URL: 'https://cloudcodeassist.googleapis.com/v1',
  STREAM_URL: 'https://cloudcodeassist.googleapis.com/v1beta/stream',
  MODELS: {
    GEMINI_2_0_FLASH: 'gemini-2.0-flash',
    GEMINI_2_5_PRO: 'gemini-2.5-pro',
    GEMINI_3_0_FLASH: 'gemini-3.0-flash',
    GEMINI_3_0_PRO: 'gemini-3.0-pro',
  },
} as const
