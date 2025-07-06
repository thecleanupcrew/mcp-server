import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { logger } from '../config/logger.js'
import { HelpRequestSchema } from '../schemas/helpRequest.js'
import {
  captureWorkspaceState,
  captureActiveFilesContent,
} from '../utils/workspace.js'
import { sendHelpRequestToAPI } from '../api/index.js'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..', '..')

/**
 * Main help request tool implementation
 */
export const requestHelpTool = {
  name: 'request_help',
  description:
    'Request help with your issue by sending a comprehensive context to our support team. This tool captures your current session, conversation history, workspace state, and diagnostics to provide a complete overview of the problem. DO NOT SEND SENSITIVE DATA like API keys or personal information.',
  parameters: HelpRequestSchema,
  execute: async (args) => {
    // Use session info from args or generate new one
    const sessionId = args.session?.sessionId || uuidv4()
    const timestamp = args.session?.timestamp || new Date().toISOString()

    logger.info('Help request initiated', { sessionId, timestamp })

    try {
      // Capture workspace state if workspace info is provided
      let workspaceState = null
      if (args.workspace?.rootPath) {
        workspaceState = await captureWorkspaceState(args.workspace.rootPath)
      }

      // Capture active files content from workspace files
      let activeFilesContent = {}
      if (args.workspace?.files) {
        const filePaths = args.workspace.files.map((f) => f.path)
        activeFilesContent = await captureActiveFilesContent(
          filePaths,
          args.workspace?.rootPath
        )
      }

      // Compile comprehensive context using the new schema structure
      const helpContext = {
        session: {
          sessionId,
          timestamp,
        },
        conversation: args.conversation,
        issue: args.issue,
        workspace: args.workspace
          ? {
              ...args.workspace,
              state: workspaceState,
            }
          : null,
        diagnostics: args.diagnostics || null,
        solutionsAttempted: args.solutionsAttempted || [],
        environment: args.environment || {
          nodeVersion: process.version,
          platform: process.platform,
          cwd: process.cwd(),
        },
        dependencies: args.dependencies || [],
        versionControl: args.versionControl || null,
        performance: args.performance || null,
        // Legacy compatibility data
        activeFiles: {
          content: activeFilesContent,
        },
      }

      // Create session-specific log file
      const sessionLogPath = path.join(
        projectRoot,
        'logs',
        `help-session-${sessionId}.json`
      )
      await fs.writeJson(sessionLogPath, helpContext, { spaces: 2 })

      // Log to main logger
      logger.info('Help context captured', {
        sessionId,
        issueLength: args.issue?.description?.length || 0,
        conversationLength: args.conversation?.messages?.length || 0,
        activeFilesCount: args.workspace?.files?.length || 0,
        workspaceFilesCount: workspaceState?.totalFiles || 0,
        sessionLogPath,
      })

      // Send help context to API
      const apiResponse = await sendHelpRequestToAPI(helpContext)

      // Prepare response
      const response = {
        success: true,
        sessionId,
        ticketId: apiResponse.ticketId,
        ticketUrl: apiResponse.ticketUrl,
        message: apiResponse.message,
        priority: apiResponse.priority,
        status: apiResponse.status,
        contextSummary: {
          issueDescription:
            args.issue?.description?.substring(0, 100) +
            (args.issue?.description?.length > 100 ? '...' : ''),
          conversationLength: args.conversation?.messages?.length || 0,
          activeFilesCount: args.workspace?.files?.length || 0,
          workspaceFilesCount: workspaceState?.totalFiles || 0,
          hasErrors: !!args.diagnostics?.errors?.length,
          hasDiagnostics: !!args.diagnostics,
        },
        logFile: sessionLogPath,
        nextSteps: [
          'MUST click the ticket URL to complete ticket creation and login',
          'Review the captured context in the session log file',
          'Use the ticket URL to track progress and communicate with support',
          'Reference the session ID and ticket ID when discussing the issue',
        ],
      }

      logger.info('Help request completed successfully', {
        sessionId,
        ticketId: apiResponse.ticketId,
        ticketUrl: apiResponse.ticketUrl,
        status: apiResponse.status,
        response: response.contextSummary,
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
