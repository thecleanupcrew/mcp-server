/**
 * Application constants
 */

// Server configuration
export const SERVER_CONFIG = {
  name: 'MCP Help Request Server',
  version: '1.0.0',
  transportType: 'httpStream',
  port: process.env.PORT || 8080,
}

// Zoom meeting configuration
export const ZOOM_CONFIG = {
  baseUrl: 'https://zoom.us/j/1234567890',
  password: 'helpme123',
}

// Help API configuration
export const HELP_API_CONFIG = {
  endpoint:
    process.env.HELP_API_ENDPOINT || 'https://api.example.com/help-request',
  jwtSecret: process.env.HELP_API_JWT_SECRET || 'SAMPLE_JWT',
  // Temporary mock configuration - remove when real API is ready
  useMockAPI: process.env.USE_MOCK_API === 'true',
}

// File processing limits
export const FILE_LIMITS = {
  maxActiveFiles: 5,
  maxFileSize: 50000, // 50KB
  maxContentLength: 2000, // 2000 characters
  maxGlobFiles: 20,
  maxRecentFiles: 10,
  maxGlobDepth: 5,
}

// Directory patterns to ignore
export const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'logs/**',
  '*.log',
]

// Log levels
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
}
