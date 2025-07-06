import { z } from 'zod'

export const Message = z.object({
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

export const Conversation = z.object({
  messages: z
    .array(Message)
    .describe(
      'Array of conversation messages leading up to the help request. Include recent context that helps understand the issue.'
    ),
})

export const FileDetail = z.object({
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

export const DirectoryTree = z.record(
  z.string(),
  z.union([
    z.null(), // file
    z.lazy(() => DirectoryTree), // nested folder
  ])
)

export const WorkspaceState = z.object({
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

export const ErrorDetail = z.object({
  message: z.string(),
  stack: z.string().optional(),
  file: z.string().optional(),
  line: z.number().optional(),
})

export const LogEntry = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
  timestamp: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export const Diagnostics = z.object({
  errors: z.array(ErrorDetail).optional(),
  warnings: z.array(ErrorDetail).optional(),
  logs: z.array(LogEntry).optional(),
})

export const SolutionAttempt = z.object({
  description: z.string(),
  steps: z.string().optional(),
  success: z.boolean(),
  resultingErrors: z.array(ErrorDetail).optional(),
  timestamp: z.string().optional(),
})

export const EnvironmentInfo = z.object({
  nodeVersion: z.string().optional(),
  platform: z.string().optional(),
  cwd: z.string().optional(),
  envVars: z.record(z.string(), z.string()).optional(),
})

export const Dependency = z.object({
  name: z.string(),
  version: z.string(),
})

export const VCSInfo = z.object({
  branch: z.string().optional(),
  commitHash: z.string().optional(),
  remoteUrl: z.string().optional(),
})

export const PerformanceMetrics = z.object({
  cpuUsage: z.number().optional(),
  memoryUsage: z.number().optional(),
  executionTimeMs: z.number().optional(),
})

// --- Top-level schema ---
export const HelpRequestSchema = z.object({
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
