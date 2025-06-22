import winston from 'winston'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs-extra'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get the project root directory (two levels up from src/config)
const projectRoot = path.resolve(__dirname, '..', '..')

// Ensure logs directory exists
await fs.ensureDir(path.join(projectRoot, 'logs'))

// Configure Winston logger
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'mcp-help-server' },
  transports: [
    new winston.transports.File({
      filename: path.join(projectRoot, 'logs', 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(projectRoot, 'logs', 'combined.log'),
    }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
})

// Log where logs will be created
console.log('Logs will be created in:', path.join(projectRoot, 'logs'))
