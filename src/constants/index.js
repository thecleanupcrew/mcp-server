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

// API configuration
export const API_CONFIG = {
  endpoint: process.env.API_ENDPOINT || 'http://localhost:3000/api/tickets',
  serviceKey: process.env.API_SERVICE_KEY || 'your_mcp_service_key_here',
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
