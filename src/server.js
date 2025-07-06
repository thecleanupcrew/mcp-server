import 'dotenv/config'
import { FastMCP } from 'fastmcp'

import { logger } from './config/logger.js'
import { SERVER_CONFIG } from './constants/index.js'
import { requestHelpTool } from './tools/index.js'

/**
 * Creates and configures the MCP server
 * @returns {FastMCP} Configured server instance
 */
export function createServer() {
  const server = new FastMCP({
    name: SERVER_CONFIG.name,
    version: SERVER_CONFIG.version,
  })

  // Add tools to the server
  server.addTool(requestHelpTool)

  logger.info('MCP Help Request Server configured with tools', {
    tools: [requestHelpTool.name],
  })

  return server
}

/**
 * Starts the MCP server
 * @param {FastMCP} server - The server instance to start
 */
export function startServer(server) {
  logger.info('MCP Help Request Server starting...')

  server.start({
    transportType: SERVER_CONFIG.transportType,
    httpStream: {
      port: SERVER_CONFIG.port,
    },
  })
}
