import { logger } from '../config/logger.js'
import { API_CONFIG } from '../constants/index.js'

/**
 * Transforms help args into ticket format for the API
 * @param {Object} args - The tool arguments object
 * @returns {Object} Formatted ticket data
 */
function transformArgsToTicket(args) {
  // Determine priority based on diagnostics and issue description (must be valid enum value)
  let priority = 'medium' // default to medium

  // Create title and description with minimum length requirements
  const issueDesc = args.issue?.description || 'Development assistance requested'
  const title = `${issueDesc.substring(0, 30)}${issueDesc.length > 30 ? '...' : ''}`
  
  // Ensure title is at least 5 characters
  const finalTitle = title.length >= 5 ? title : 'Development Help Request'
  
  // Convert all args to strings for metadata
  const metadata = {}
  for (const [key, value] of Object.entries(args)) {
    metadata[key] = JSON.stringify(value)
  }

  return {
    title: finalTitle,
    description: issueDesc,
    priority,
    metadata,
  }
}

/**
 * Sends help request args to external API
 * @param {Object} args - The tool arguments object
 * @returns {Promise<Object>} API response containing ticket information
 */
export async function sendHelpRequestToAPI(args) {
  try {
    const ticketData = transformArgsToTicket(args)
    
    logger.info('Sending help request to ticket API', {
      endpoint: API_CONFIG.endpoint,
      sessionId: args.session?.sessionId,
      title: ticketData.title,
      priority: ticketData.priority,
    })

    const response = await fetch(API_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': API_CONFIG.serviceKey,
      },
      body: JSON.stringify(ticketData),
    })

    if (!response.ok) {
      let errorDetails = `API request failed with status ${response.status}: ${response.statusText}`
      try {
        const errorBody = await response.json()
        errorDetails += `\nAPI Error Response: ${JSON.stringify(errorBody, null, 2)}`
      } catch (parseError) {
        const errorText = await response.text()
        if (errorText) {
          errorDetails += `\nAPI Error Response: ${errorText}`
        }
      }
      throw new Error(errorDetails)
    }

    const result = await response.json()

    logger.info('Help request API call successful', {
      sessionId: args.session?.sessionId,
      ticketId: result.id,
      status: result.status,
    })

    // Transform API response to match expected format
    return {
      ticketId: result.ticket?.id || result.id,
      status: result.ticket?.status || result.status,
      priority: result.ticket?.priority || result.priority,
      ticketUrl: result.ticketUrl,
      sessionId: args.session?.sessionId,
      message: result.message || 'Help request ticket created successfully',
      apiResponse: result,
    }
  } catch (error) {
    logger.error('Failed to send help request to API', {
      error: error.message,
      endpoint: API_CONFIG.endpoint,
      sessionId: args.session?.sessionId,
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
  return response && response.ticketId && typeof response.message === 'string'
}
