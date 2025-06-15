import { FastMCP } from 'fastmcp'
import { z } from 'zod'
import fs from 'fs-extra'
import winston from 'winston'
import { v4 as uuidv4 } from 'uuid'
import { glob } from 'glob'
import path from 'path'

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'mcp-help-server' },
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'combined.log'),
    }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
})

// Ensure logs directory exists
await fs.ensureDir(path.join(__dirname, 'logs'))

// Log where logs will be created
console.log('Logs will be created in:', path.join(__dirname, 'logs'))

const server = new FastMCP({
  name: 'MCP Help Request Server',
  version: '1.0.0',
})

// Comprehensive schema for help request parameters
const helpRequestSchema = z.object({
  issue_description: z
    .string()
    .describe("Detailed description of the user's issue or problem"),
  conversation_history: z
    .string()
    .optional()
    .describe('Recent conversation history between user and assistant'),
  error_messages: z
    .string()
    .optional()
    .describe('Any error messages encountered'),
  active_files: z
    .array(z.string())
    .optional()
    .describe('List of currently active/open files'),
  workspace_path: z
    .string()
    .optional()
    .describe('Current workspace directory path'),
  additional_context: z
    .string()
    .optional()
    .describe('Any additional context or information'),
})

// Context capture utilities
async function captureWorkspaceState(workspacePath) {
  try {
    if (!workspacePath || !(await fs.pathExists(workspacePath))) {
      logger.warn('Workspace path not provided or does not exist', {
        workspacePath,
      })
      return null
    }

    // Get all files in workspace (excluding node_modules, .git, etc.)
    const files = await glob('**/*', {
      cwd: workspacePath,
      ignore: ['node_modules/**', '.git/**', 'logs/**', '*.log'],
      nodir: true,
      maxDepth: 5, // Limit depth to avoid too many files
    })

    const workspaceState = {
      totalFiles: files.length,
      fileTypes: {},
      recentFiles: [],
      structure: {},
    }

    // Analyze file types
    files.forEach((file) => {
      const ext = path.extname(file) || 'no-extension'
      workspaceState.fileTypes[ext] = (workspaceState.fileTypes[ext] || 0) + 1
    })

    // Get recent files (by modification time)
    const fileStats = await Promise.all(
      files.slice(0, 20).map(async (file) => {
        try {
          const fullPath = path.join(workspacePath, file)
          const stats = await fs.stat(fullPath)
          return { file, mtime: stats.mtime }
        } catch (error) {
          return null
        }
      })
    )

    workspaceState.recentFiles = fileStats
      .filter(Boolean)
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 10)
      .map((item) => item.file)

    return workspaceState
  } catch (error) {
    logger.error('Error capturing workspace state', {
      error: error.message,
      workspacePath,
    })
    return null
  }
}

async function captureActiveFilesContent(activeFiles, workspacePath) {
  if (!activeFiles || !Array.isArray(activeFiles)) {
    return {}
  }

  const filesContent = {}

  for (const file of activeFiles.slice(0, 5)) {
    // Limit to 5 files to avoid too much data
    try {
      const fullPath = workspacePath ? path.join(workspacePath, file) : file
      if (await fs.pathExists(fullPath)) {
        const stats = await fs.stat(fullPath)
        if (stats.size < 50000) {
          // Only read files smaller than 50KB
          const content = await fs.readFile(fullPath, 'utf8')
          filesContent[file] = {
            size: stats.size,
            lines: content.split('\n').length,
            content: content.substring(0, 2000), // Truncate to first 2000 chars
          }
        } else {
          filesContent[file] = {
            size: stats.size,
            note: 'File too large to include content',
          }
        }
      }
    } catch (error) {
      logger.warn('Could not read active file', { file, error: error.message })
      filesContent[file] = { error: error.message }
    }
  }

  return filesContent
}

function generateZoomLink(sessionId) {
  // Static Zoom link with session ID parameter
  const baseUrl = 'https://zoom.us/j/1234567890'
  const password = 'helpme123'
  return `${baseUrl}?pwd=${password}&sessionId=${sessionId}`
}

// Main help request tool
server.addTool({
  name: 'request_help',
  description:
    'Request help by capturing comprehensive context about the current issue and workspace state',
  parameters: helpRequestSchema,
  execute: async (args) => {
    const sessionId = uuidv4()
    const timestamp = new Date().toISOString()

    logger.info('Help request initiated', { sessionId, timestamp })

    try {
      // Capture workspace state
      const workspaceState = await captureWorkspaceState(args.workspace_path)

      // Capture active files content
      const activeFilesContent = await captureActiveFilesContent(
        args.active_files,
        args.workspace_path
      )

      // Compile comprehensive context
      const helpContext = {
        sessionId,
        timestamp,
        issue: {
          description: args.issue_description,
          errorMessages: args.error_messages || 'None provided',
          additionalContext: args.additional_context || 'None provided',
        },
        conversation: {
          history:
            args.conversation_history || 'No conversation history provided',
        },
        workspace: {
          path: args.workspace_path || 'Not specified',
          state: workspaceState,
        },
        activeFiles: {
          list: args.active_files || [],
          content: activeFilesContent,
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          cwd: process.cwd(),
        },
      }

      // Create session-specific log file
      const sessionLogPath = path.join(
        __dirname,
        'logs',
        `help-session-${sessionId}.json`
      )
      await fs.writeJson(sessionLogPath, helpContext, { spaces: 2 })

      // Log to main logger
      logger.info('Help context captured', {
        sessionId,
        issueLength: args.issue_description.length,
        conversationLength: args.conversation_history?.length || 0,
        activeFilesCount: args.active_files?.length || 0,
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
            args.issue_description.substring(0, 100) +
            (args.issue_description.length > 100 ? '...' : ''),
          conversationHistoryLength: args.conversation_history?.length || 0,
          activeFilesCount: args.active_files?.length || 0,
          workspaceFilesCount: workspaceState?.totalFiles || 0,
          errorMessages: !!args.error_messages,
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
})

// Add a tool to retrieve help session logs
server.addTool({
  name: 'get_help_session',
  description: 'Retrieve the context data for a specific help session',
  parameters: z.object({
    sessionId: z.string().describe('The session ID to retrieve'),
  }),
  execute: async (args) => {
    try {
      const sessionLogPath = path.join(
        __dirname,
        'logs',
        `help-session-${args.sessionId}.json`
      )

      if (!(await fs.pathExists(sessionLogPath))) {
        return JSON.stringify({
          success: false,
          error: 'Session not found',
          sessionId: args.sessionId,
        })
      }

      const sessionData = await fs.readJson(sessionLogPath)
      logger.info('Help session retrieved', { sessionId: args.sessionId })

      return JSON.stringify(
        {
          success: true,
          sessionId: args.sessionId,
          data: sessionData,
        },
        null,
        2
      )
    } catch (error) {
      logger.error('Error retrieving help session', {
        sessionId: args.sessionId,
        error: error.message,
      })

      return JSON.stringify({
        success: false,
        sessionId: args.sessionId,
        error: 'Failed to retrieve session data',
        details: error.message,
      })
    }
  },
})

logger.info('MCP Help Request Server starting...')

server.start({
  transportType: 'stdio',
})
