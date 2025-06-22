import { FastMCP } from 'fastmcp'
import { z } from 'zod'
import fs from 'fs-extra'
import winston from 'winston'
import { v4 as uuidv4 } from 'uuid'
import { glob } from 'glob'
import path from 'path'
import { fileURLToPath } from 'url'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

// --- Reusable sub-schemas ---
const SessionInfo = z.object({
  sessionId: z
    .string()
    .uuid()
    .describe(
      'Unique session identifier (UUID format). Generate a new UUID for each help request.'
    ),
  timestamp: z
    .string()
    .refine((s) => !isNaN(Date.parse(s)), {
      message: 'Must be an ISO timestamp',
    })
    .describe(
      "ISO timestamp when the help request was initiated (e.g., '2025-06-22T14:44:38.000Z')"
    ),
})

const Message = z.object({
  role: z
    .enum(['system', 'user', 'assistant', 'tool'])
    .describe(
      "Message sender: 'user' for human messages, 'assistant' for AI responses, 'system' for system messages, 'tool' for tool outputs"
    ),
  content: z.string().describe('The actual message content'),
  timestamp: z
    .string()
    .optional()
    .describe('When the message was sent (ISO timestamp)'),
})

const Conversation = z.object({
  messages: z
    .array(Message)
    .describe(
      'Array of conversation messages leading up to the help request. Include recent context that helps understand the issue.'
    ),
})

const FileDetail = z.object({
  path: z
    .string()
    .describe(
      "Relative path to the file from workspace root (e.g., 'src/index.js', 'package.json')"
    ),
  size: z.number().int().describe('File size in bytes'),
  lines: z.number().int().optional().describe('Number of lines in the file'),
  hash: z
    .string()
    .optional()
    .describe('File hash for change detection (optional)'),
  diff: z
    .string()
    .optional()
    .describe('Recent changes to the file (git diff format, optional)'),
  lastModified: z
    .string()
    .optional()
    .describe('When the file was last modified (ISO timestamp)'),
})

const DirectoryTree = z.record(
  z.string(),
  z.union([
    z.null(), // file
    z.lazy(() => DirectoryTree), // nested folder
  ])
)

const WorkspaceState = z.object({
  rootPath: z
    .string()
    .describe(
      "Absolute path to the workspace/project root directory (e.g., '/Users/dev/myproject' or 'C:/Projects/myapp')"
    ),
  files: z
    .array(FileDetail)
    .describe(
      'Array of important files in the workspace. Include files relevant to the current issue.'
    ),
  structure: DirectoryTree.describe(
    'Directory structure of the workspace as a nested object'
  ),
  totalFiles: z
    .number()
    .int()
    .describe('Total number of files in the workspace'),
  recentFiles: z
    .array(z.string())
    .optional()
    .describe('List of recently modified file paths (optional)'),
})

const ErrorDetail = z.object({
  message: z.string(),
  stack: z.string().optional(),
  file: z.string().optional(),
  line: z.number().optional(),
})

const LogEntry = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
  timestamp: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

const Diagnostics = z.object({
  errors: z.array(ErrorDetail).optional(),
  warnings: z.array(ErrorDetail).optional(),
  logs: z.array(LogEntry).optional(),
})

const SolutionAttempt = z.object({
  id: z.string().optional(),
  description: z.string(),
  steps: z.string().optional(),
  success: z.boolean(),
  resultingErrors: z.array(ErrorDetail).optional(),
  timestamp: z.string().optional(),
})

const EnvironmentInfo = z.object({
  nodeVersion: z.string().optional(),
  platform: z.string().optional(),
  cwd: z.string().optional(),
  envVars: z.record(z.string(), z.string()).optional(),
})

const Dependency = z.object({
  name: z.string(),
  version: z.string(),
})

const VCSInfo = z.object({
  branch: z.string().optional(),
  commitHash: z.string().optional(),
  remoteUrl: z.string().optional(),
})

const PerformanceMetrics = z.object({
  cpuUsage: z.number().optional(),
  memoryUsage: z.number().optional(),
  executionTimeMs: z.number().optional(),
})

// --- Top-level schema ---
export const HelpRequestSchema = z.object({
  session: SessionInfo.describe(
    'REQUIRED: Session information with unique ID and timestamp'
  ),
  conversation: Conversation.describe(
    'REQUIRED: Recent conversation messages that led to this help request. Include context that helps understand the issue'
  ),
  issue: z
    .object({
      description: z
        .string()
        .describe(
          'REQUIRED: Clear description of the problem or issue that needs human assistance'
        ),
      additionalContext: z
        .string()
        .optional()
        .describe(
          'OPTIONAL: Any additional context, error messages, or relevant information'
        ),
    })
    .describe('REQUIRED: The core issue that needs help'),
  workspace: WorkspaceState.optional().describe(
    "RECOMMENDED: Information about the user's workspace/project if relevant to the issue"
  ),
  diagnostics: Diagnostics.optional().describe(
    'OPTIONAL: Error messages, warnings, or logs related to the issue'
  ),
  solutionsAttempted: z
    .array(SolutionAttempt)
    .optional()
    .describe(
      'OPTIONAL: Previous attempts to solve the issue and their outcomes'
    ),
  environment: EnvironmentInfo.optional().describe(
    'OPTIONAL: System environment details (Node.js version, platform, etc.)'
  ),
  dependencies: z
    .array(Dependency)
    .optional()
    .describe('OPTIONAL: Project dependencies if relevant to the issue'),
  versionControl: VCSInfo.optional().describe(
    'OPTIONAL: Git/version control information'
  ),
  performance: PerformanceMetrics.optional().describe(
    'OPTIONAL: Performance metrics if the issue is performance-related'
  ),
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
        __dirname,
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
