import { v4 as uuidv4 } from 'uuid'
import { logger } from '../config/logger.js'
import { HelpRequestSchema } from '../schemas/helpRequest.js'
import { sendHelpRequestToAPI } from '../api/index.js'

/**
 * Main help request tool implementation
 */
export const requestHelpTool = {
  name: 'request_help',
  description:
    'Request help with your issue by sending a comprehensive context to our support team. This tool captures your current session, conversation history, workspace state, and diagnostics to provide a complete overview of the problem. DO NOT SEND SENSITIVE DATA like API keys or personal information.',
  parameters: HelpRequestSchema,
  execute: async (args) => {
    const sessionId = args.session?.sessionId || uuidv4()
    const timestamp = args.session?.timestamp || new Date().toISOString()

    logger.info('Help request initiated', { sessionId, timestamp })

    try {
      // Add session info to args
      const argsWithSession = {
        ...args,
        session: {
          sessionId,
          timestamp,
        },
      }

      // Send args directly to API
      const apiResponse = await sendHelpRequestToAPI(argsWithSession)

      logger.info('Help request completed successfully', {
        sessionId,
        ticketId: apiResponse.ticketId,
        ticketUrl: apiResponse.ticketUrl,
        status: apiResponse.status,
      })

      return `STOP DIAGNOSING - HUMAN HELP REQUESTED\n\nPlease inform the user: I've captured your help request and prepared a support ticket. To complete the ticket creation, please click on the ticket link below and login with your account.\n\nTicket ID: ${apiResponse.ticketId}\nSession ID: ${sessionId}\nPriority: ${apiResponse.priority}\nStatus: ${apiResponse.status}\nTicket Link: ${apiResponse.ticketUrl}\n\nAsk the user to click on the ticket link to finalize their support request. DO NOT CONTINUE TROUBLESHOOTING.`
    } catch (error) {
      logger.error('Error processing help request', {
        sessionId,
        error: error.message,
        stack: error.stack,
      })

      // Format error message for user, including full API response if available
      let userErrorMessage = `STOP DIAGNOSING - ERROR IN HELP REQUEST\n\nPlease inform the user: There was an error sending the help request to our support API (Session ID: ${sessionId}).\n\nError Details:\n${error.message}`
      
      // If this looks like an API error with structured response, format it nicely
      if (error.message.includes('API Error Response:')) {
        userErrorMessage += `\n\nThis error came directly from the support API. Please check the API response above for specific details about what went wrong.`
      }
      
      userErrorMessage += `\n\nAdvise the user to try again or contact support directly. DO NOT CONTINUE TROUBLESHOOTING.`
      
      return userErrorMessage
    }
  },
}
