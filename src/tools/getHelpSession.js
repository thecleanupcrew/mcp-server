import { z } from 'zod'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { logger } from '../config/logger.js'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..', '..')

/**
 * Tool to retrieve help session data
 */
export const getHelpSessionTool = {
  name: 'get_help_session',
  description: 'Retrieve the context data for a specific help session',
  parameters: z.object({
    sessionId: z.string().describe('The session ID to retrieve'),
  }),
  execute: async (args) => {
    try {
      const sessionLogPath = path.join(
        projectRoot,
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
}
