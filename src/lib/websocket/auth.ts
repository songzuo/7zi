// @ts-nocheck
/**
 * WebSocket Authentication Middleware
 *
 * Handles JWT token verification and socket authentication
 */

import { verifyJwtToken } from '@/lib/auth/service'
import { getUserById } from '@/lib/auth/repository'
import { logger } from '@/lib/logger'
import type { AuthenticatedSocket } from './types'

/**
 * Authenticate a socket connection using JWT token
 */
export async function authenticateSocket(
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const token = socket.handshake.auth.token

    if (!token) {
      logger.warn('Connection rejected: No token provided', { socketId: socket.id })
      return next(new Error('No token provided'))
    }

    const userContext = await verifyJwtToken(token)

    if (!userContext || !userContext.userId) {
      logger.warn('Connection rejected: Invalid token', { socketId: socket.id })
      return next(new Error('Invalid token'))
    }

    const user = await getUserById(userContext.userId)
    if (!user) {
      logger.warn('Connection rejected: User not found', {
        socketId: socket.id,
        userId: userContext.userId,
      })
      return next(new Error('User not found'))
    }

    socket.data.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    }
    socket.data.lastHeartbeat = Date.now()
    socket.data.rooms = new Set()

    logger.info('User authenticated', {
      socketId: socket.id,
      userId: user.id,
      userName: user.name,
    })

    next()
  } catch (error) {
    logger.error('Authentication error', { socketId: socket.id, error })
    next(new Error('Authentication failed'))
  }
}

/**
 * Generate a unique color for a user based on their ID hash
 */
export function generateUserColor(userId: string): string {
  const colors = [
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#84cc16',
    '#10b981',
    '#06b6d4',
    '#0ea5e9',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#d946ef',
    '#ec4899',
    '#f43f5e',
  ]
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}
