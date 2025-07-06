import fs from 'fs-extra'
import { glob } from 'glob'
import path from 'path'
import { logger } from '../config/logger.js'

/**
 * Captures the current state of a workspace directory
 * @param {string} workspacePath - Path to the workspace directory
 * @returns {Object|null} Workspace state object or null if error
 */
export async function captureWorkspaceState(workspacePath) {
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
