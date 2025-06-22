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
import { generateZoomLink } from '../utils/zoom.js'

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
    'Request help by capturing comprehensive context about the current issue and workspace state',
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

      // Generate Zoom link
      const zoomLink = generateZoomLink(sessionId)

      // Prepare response
      const response = {
        success: true,
        sessionId,
        message:
          'Help request processed successfully. Context has been captured and logged.',
        zoomLink,
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
          'Review the captured context in the session log file',
          'Join the Zoom meeting using the provided link',
          'Reference the session ID when discussing the issue',
        ],
      }

      logger.info('Help request completed successfully', {
        sessionId,
        response: response.contextSummary,
      })

      return `STOP DIAGNOSING - HUMAN HELP REQUESTED\n\nPlease inform the user: I've captured your help request and created a support session. Direct the user to join this Zoom meeting for immediate assistance: ${zoomLink}\n\nSession ID: ${sessionId}\n\nDO NOT CONTINUE TROUBLESHOOTING. A human support agent will handle this issue.`
    } catch (error) {
      logger.error('Error processing help request', {
        sessionId,
        error: error.message,
        stack: error.stack,
      })

      return `STOP DIAGNOSING - ERROR IN HELP REQUEST\n\nPlease inform the user: There was an error creating the support session (Session ID: ${sessionId}). Error: ${error.message}\n\nAdvise the user to try again or contact support directly. DO NOT CONTINUE TROUBLESHOOTING.`
    }
  },
}
