import { ZOOM_CONFIG } from '../constants/index.js'

/**
 * Generates a Zoom meeting link with session ID parameter
 * @param {string} sessionId - The session ID to include in the link
 * @returns {string} Complete Zoom meeting URL
 */
export function generateZoomLink(sessionId) {
  const { baseUrl, password } = ZOOM_CONFIG
  return `${baseUrl}?pwd=${password}&sessionId=${sessionId}`
}
