/**
 * Example: Google Gemini CLI OAuth Usage
 * 
 * This example demonstrates how to use the Google Gemini CLI OAuth
 * implementation in your application.
 */

import {
  loginGeminiCli,
  refreshGoogleCloudToken,
  getGoogleCloudAccessToken,
  isGeminiCliLoggedIn,
  logoutGeminiCli,
  getGoogleCloudProjectId,
} from '../src/services/oauth/google-gemini-cli.js'
import {
  chatCompletion,
  chatCompletionStream,
  getAvailableModels,
} from '../src/services/api/google-cloud-code-assist.js'

/**
 * Example 1: Simple OAuth Login
 */
async function exampleLogin() {
  console.log('🔐 Starting Google Gemini CLI OAuth login...')

  const result = await loginGeminiCli(
    async (url) => {
      // Open URL in browser
      const { default: open } = await import('open')
      await open(url, { wait: false })
      console.log('✅ Browser opened for authentication')
    },
    (url) => {
      // Display URL to user
      console.log(`🌐 Visit: ${url}`)
    }
  )

  if (result.success) {
    console.log('✅ Login successful!')
    console.log(`📋 Access Token: ${result.accessToken?.substring(0, 20)}...`)
    console.log(`⏰ Expires at: ${new Date(result.expiryDate!).toLocaleString()}`)
  } else {
    console.error('❌ Login failed:', result.error)
  }
}

/**
 * Example 2: Check Login Status
 */
async function exampleCheckLoginStatus() {
  const isLoggedIn = await isGeminiCliLoggedIn()
  
  if (isLoggedIn) {
    console.log('✅ User is logged in with Google Gemini CLI')
    
    const token = await getGoogleCloudAccessToken()
    console.log(`📋 Current token: ${token?.substring(0, 20)}...`)
  } else {
    console.log('❌ User is not logged in')
  }
}

/**
 * Example 3: Simple Chat Completion
 */
async function exampleChatCompletion() {
  const projectId = getGoogleCloudProjectId()
  
  if (!projectId) {
    console.error('❌ GOOGLE_CLOUD_PROJECT environment variable not set')
    return
  }

  console.log('💬 Sending message to Gemini...')

  try {
    const response = await chatCompletion(
      [
        {
          role: 'user',
          content: 'Hello! Can you explain what you are?'
        }
      ],
      {
        model: 'gemini-2.5-pro',
        projectId,
        temperature: 0.7,
      }
    )

    console.log('✅ Response received:')
    console.log(response.choices[0].message.content)
    console.log(`📊 Usage: ${response.usage.total_tokens} tokens`)
  } catch (error) {
    console.error('❌ Chat completion failed:', error)
  }
}

/**
 * Example 4: Streaming Chat
 */
async function exampleStreamingChat() {
  const projectId = getGoogleCloudProjectId()
  
  if (!projectId) {
    console.error('❌ GOOGLE_CLOUD_PROJECT environment variable not set')
    return
  }

  console.log('💬 Streaming response from Gemini...')

  try {
    for await (const chunk of chatCompletionStream(
      [
        {
          role: 'user',
          content: 'Tell me a short story about AI'
        }
      ],
      {
        model: 'gemini-2.5-pro',
        projectId,
        temperature: 0.8,
      }
    )) {
      const content = chunk.choices[0].delta.content
      if (content) {
        process.stdout.write(content)
      }
    }
    console.log('\n✅ Streaming completed')
  } catch (error) {
    console.error('❌ Streaming failed:', error)
  }
}

/**
 * Example 5: Token Refresh
 */
async function exampleTokenRefresh() {
  console.log('🔄 Refreshing access token...')

  try {
    const newToken = await refreshGoogleCloudToken()
    console.log('✅ Token refreshed successfully')
    console.log(`📋 New token: ${newToken.substring(0, 20)}...`)
  } catch (error) {
    console.error('❌ Token refresh failed:', error)
  }
}

/**
 * Example 6: List Available Models
 */
async function exampleListModels() {
  console.log('🔍 Fetching available models...')

  try {
    const models = await getAvailableModels()
    console.log('✅ Available models:')
    models.forEach((model) => {
      console.log(`  • ${model}`)
    })
  } catch (error) {
    console.error('❌ Failed to fetch models:', error)
  }
}

/**
 * Example 7: Logout
 */
async function exampleLogout() {
  console.log('🚪 Logging out...')

  try {
    await logoutGeminiCli()
    console.log('✅ Logged out successfully')
  } catch (error) {
    console.error('❌ Logout failed:', error)
  }
}

/**
 * Example 8: Complete Workflow
 */
async function exampleCompleteWorkflow() {
  console.log('🚀 Starting complete workflow...')

  // 1. Check if logged in
  const isLoggedIn = await isGeminiCliLoggedIn()
  
  if (!isLoggedIn) {
    console.log('📝 User not logged in, starting OAuth flow...')
    await exampleLogin()
  }

  // 2. List available models
  await exampleListModels()

  // 3. Send a message
  await exampleChatCompletion()

  // 4. Refresh token (if needed)
  await exampleTokenRefresh()

  console.log('✅ Workflow completed!')
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || 'workflow'

  switch (command) {
    case 'login':
      await exampleLogin()
      break
    case 'status':
      await exampleCheckLoginStatus()
      break
    case 'chat':
      await exampleChatCompletion()
      break
    case 'stream':
      await exampleStreamingChat()
      break
    case 'refresh':
      await exampleTokenRefresh()
      break
    case 'models':
      await exampleListModels()
      break
    case 'logout':
      await exampleLogout()
      break
    case 'workflow':
      await exampleCompleteWorkflow()
      break
    default:
      console.log('Usage: node example.js [command]')
      console.log('Commands:')
      console.log('  login      - Start OAuth login flow')
      console.log('  status     - Check login status')
      console.log('  chat       - Send a message to Gemini')
      console.log('  stream     - Stream a response from Gemini')
      console.log('  refresh    - Refresh access token')
      console.log('  models     - List available models')
      console.log('  logout     - Logout from Google Gemini CLI')
      console.log('  workflow   - Run complete workflow')
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export {
  exampleLogin,
  exampleCheckLoginStatus,
  exampleChatCompletion,
  exampleStreamingChat,
  exampleTokenRefresh,
  exampleListModels,
  exampleLogout,
  exampleCompleteWorkflow,
}