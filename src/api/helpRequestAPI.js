import { logger } from '../config/logger.js'
import { API_CONFIG } from '../constants/index.js'

/**
 * Transforms help context into ticket format for the API
 * @param {Object} helpContext - The complete help context object
 * @returns {Object} Formatted ticket data
 */
function transformHelpContextToTicket(helpContext) {
  // Determine priority based on diagnostics and issue description (must be valid enum value)
  let priority = 'medium' // default to medium
  if (helpContext.diagnostics?.errors?.length > 0) {
    priority = 'high'
  }
  if (helpContext.issue?.description?.toLowerCase().includes('urgent') || 
      helpContext.issue?.description?.toLowerCase().includes('critical')) {
    priority = 'urgent'
  }

  // Create title and description with minimum length requirements
  const issueDesc = helpContext.issue?.description || 'Development assistance requested'
  const title = `Development Help Request - ${issueDesc.substring(0, 30)}${issueDesc.length > 30 ? '...' : ''}`
  
  // Ensure title is at least 5 characters
  const finalTitle = title.length >= 5 ? title : 'Development Help Request'
  
  // Ensure description is at least 10 characters
  const finalDescription = issueDesc.length >= 10 ? issueDesc : 'Development assistance requested for user issue'

  // Put all the raw context into metadata - convert all values to strings as required by schema
  const metadata = {
    // Raw help context - all the captured data (stringify objects)
    rawContext: JSON.stringify(helpContext),
    
    // Quick summary fields for easy access (all as strings)
    sessionId: helpContext.session?.sessionId || '',
    timestamp: helpContext.session?.timestamp || '',
    hasErrors: String(!!helpContext.diagnostics?.errors?.length),
    conversationLength: String(helpContext.conversation?.messages?.length || 0),
    workspaceFiles: String(helpContext.workspace?.totalFiles || 0),
  }

  return {
    title: finalTitle,
    description: finalDescription,
    priority,
    metadata,
  }
}

/**
 * Sends help request context to external API
 * @param {Object} helpContext - The complete help context object
 * @returns {Promise<Object>} API response containing ticket information
 */
export async function sendHelpRequestToAPI(helpContext) {
  try {
    const ticketData = transformHelpContextToTicket(helpContext)
    
    logger.info('Sending help request to ticket API', {
      endpoint: API_CONFIG.endpoint,
      sessionId: helpContext.session?.sessionId,
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
      sessionId: helpContext.session?.sessionId,
      ticketId: result.id,
      status: result.status,
    })

    // Transform API response to match expected format
    return {
      ticketId: result.ticket?.id || result.id,
      status: result.ticket?.status || result.status,
      priority: result.ticket?.priority || result.priority,
      ticketUrl: result.ticketUrl,
      sessionId: helpContext.session?.sessionId,
      message: result.message || 'Help request ticket created successfully',
      apiResponse: result,
    }
  } catch (error) {
    logger.error('Failed to send help request to API', {
      error: error.message,
      endpoint: API_CONFIG.endpoint,
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
  return response && response.ticketId && typeof response.message === 'string'
}
