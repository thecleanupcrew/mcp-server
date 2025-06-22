import { logger } from '../config/logger.js'
import { HELP_API_CONFIG } from '../constants/index.js'

/**
 * TEMPORARY MOCK FUNCTION - Remove when real API is ready
 * Simulates API call and returns mock response
 * @param {Object} helpContext - The complete help context object
 * @returns {Promise<Object>} Mock API response containing chat portal link
 */
async function sendMockHelpRequest(helpContext) {
  const timestamp = Date.now()
  const mockChatPortalLink = `https://mock-portal.example.com/chat/mock-session-${timestamp}`

  logger.info('MOCK MODE: Simulating help request to API', {
    endpoint: HELP_API_CONFIG.endpoint,
    sessionId: helpContext.session?.sessionId,
    mockChatPortalLink,
    contextSize: JSON.stringify(helpContext).length,
  })

  // Log what would be sent to the real API (for debugging)
  logger.debug('MOCK MODE: Context that would be sent to real API', {
    sessionId: helpContext.session?.sessionId,
    issueDescription: helpContext.issue?.description?.substring(0, 100),
    conversationLength: helpContext.conversation?.messages?.length || 0,
    workspaceFilesCount: helpContext.workspace?.state?.totalFiles || 0,
    hasErrors: !!helpContext.diagnostics?.errors?.length,
  })

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  const mockResult = {
    chatPortalLink: mockChatPortalLink,
    sessionId: helpContext.session?.sessionId,
    status: 'mock_success',
    message: 'Mock help request processed successfully',
  }

  logger.info('MOCK MODE: Help request simulation completed', {
    sessionId: helpContext.session?.sessionId,
    chatPortalLink: mockResult.chatPortalLink,
  })

  return mockResult
}

/**
 * Sends help request context to external API
 * @param {Object} helpContext - The complete help context object
 * @returns {Promise<Object>} API response containing chat portal link
 */
export async function sendHelpRequestToAPI(helpContext) {
  // TEMPORARY: Check if mock mode is enabled - remove when real API is ready
  if (HELP_API_CONFIG.useMockAPI) {
    return await sendMockHelpRequest(helpContext)
  }

  try {
    logger.info('Sending help request to API', {
      endpoint: HELP_API_CONFIG.endpoint,
      sessionId: helpContext.session?.sessionId,
    })

    const response = await fetch(HELP_API_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HELP_API_CONFIG.jwtSecret}`,
      },
      body: JSON.stringify(helpContext),
    })

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      )
    }

    const result = await response.json()

    if (!result.chatPortalLink) {
      throw new Error('API response missing chatPortalLink')
    }

    logger.info('Help request API call successful', {
      sessionId: helpContext.session?.sessionId,
      chatPortalLink: result.chatPortalLink,
    })

    return result
  } catch (error) {
    logger.error('Failed to send help request to API', {
      error: error.message,
      endpoint: HELP_API_CONFIG.endpoint,
      sessionId: helpContext.session?.sessionId,
      stack: error.stack,
    })
    throw error
  }
}

/**
 * Validates API response structure
 * @param {Object} response - API response to validate
 * @returns {boolean} True if response is valid
 */
export function validateAPIResponse(response) {
  return response && typeof response.chatPortalLink === 'string'
}
