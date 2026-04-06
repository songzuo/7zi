// @ts-nocheck
/**
 * Collaboration WebSocket Handlers
 *
 * 扩展 WebSocket 服务器以支持实时协作功能
 * 处理协作会话、节点操作、锁管理、光标同步等事件
 */

import type { AuthenticatedSocket } from './types'
import { getCollaborationManager } from './collaboration-manager'
import { logger } from '@/lib/logger'

// ============================================================================
// Collaboration Event Handlers
// ============================================================================

/**
 * 设置协作相关的 WebSocket 事件处理器
 */
export function setupCollaborationHandlers(socket: AuthenticatedSocket): void {
  const user = socket.data.user

  // --------------------------------------------------------------------
  // Collaboration Session Management
  // --------------------------------------------------------------------

  /**
   * 创建协作会话
   */
  socket.on('collab:create_session', (data: { sessionId: string; roomId: string }) => {
    try {
      const { sessionId, roomId } = data

      // 获取协作管理器
      const collabManager = getCollaborationManager()

      // 创建会话
      const session = collabManager.createSession(sessionId, roomId, user.id)

      // 用户加入协作
      collabManager
        .joinCollaboration(sessionId, user.id, user.name, user.email, user.avatar)
        .then(result => {
          if (result.success) {
            socket.emit('collab:session_created', {
              sessionId: session.id,
              roomId: session.roomId,
              participants: collabManager.getParticipants(sessionId),
              documentState: session.docManager.getState(),
            })

            logger.info('Collaboration session created', {
              sessionId,
              userId: user.id,
            })
          } else {
            socket.emit('system:error', {
              message: result.error || 'Failed to create session',
              code: 'SESSION_CREATE_FAILED',
            })
          }
        })
    } catch (error) {
      logger.error('Error creating collaboration session', {
        socketId: socket.id,
        error,
      })
      socket.emit('system:error', { message: 'Failed to create session' })
    }
  })

  /**
   * 加入协作会话
   */
  socket.on('collab:join', (data: { sessionId: string; roomId: string }) => {
    try {
      const { sessionId, roomId } = data

      const collabManager = getCollaborationManager()
      let session = collabManager.getSession(sessionId)

      // 如果会话不存在，创建它
      if (!session) {
        session = collabManager.createSession(sessionId, roomId, user.id)
      }

      // 用户加入协作
      collabManager
        .joinCollaboration(sessionId, user.id, user.name, user.email, user.avatar)
        .then(result => {
          if (result.success) {
            socket.join(`collab:${sessionId}`)

            // 发送会话信息
            socket.emit('collab:joined', {
              sessionId: session.id,
              roomId: session.roomId,
              participants: collabManager.getParticipants(sessionId),
              documentState: session.docManager.getState(),
            })

            // 通知房间内其他用户
            socket.to(`collab:${sessionId}`).emit('collab:user_joined', {
              userId: user.id,
              userName: user.name,
              avatar: user.avatar,
              participant: result.participant,
            })

            logger.info('User joined collaboration', {
              sessionId,
              userId: user.id,
              userName: user.name,
            })
          } else {
            socket.emit('system:error', {
              message: result.error || 'Failed to join collaboration',
              code: 'JOIN_FAILED',
            })
          }
        })
    } catch (error) {
      logger.error('Error joining collaboration', {
        socketId: socket.id,
        error,
      })
      socket.emit('system:error', { message: 'Failed to join collaboration' })
    }
  })

  /**
   * 离开协作会话
   */
  socket.on('collab:leave', (data: { sessionId: string }) => {
    try {
      const { sessionId } = data

      const collabManager = getCollaborationManager()

      collabManager.leaveCollaboration(sessionId, user.id).then(result => {
        if (result.success) {
          socket.leave(`collab:${sessionId}`)

          // 通知房间内其他用户
          socket.to(`collab:${sessionId}`).emit('collab:user_left', {
            userId: user.id,
            userName: user.name,
          })

          logger.info('User left collaboration', {
            sessionId,
            userId: user.id,
          })
        }
      })
    } catch (error) {
      logger.error('Error leaving collaboration', {
        socketId: socket.id,
        error,
      })
    }
  })

  // --------------------------------------------------------------------
  // Node Operations
  // --------------------------------------------------------------------

  /**
   * 更新节点
   */
  socket.on(
    'collab:update_node',
    async (data: { sessionId: string; nodeId: string; changes: Record<string, unknown> }) => {
      try {
        const { sessionId, nodeId, changes } = data

        const collabManager = getCollaborationManager()
        const result = await collabManager.updateNode(sessionId, user.id, nodeId, changes)

        if (result.success) {
          // 获取更新后的节点
          const session = collabManager.getSession(sessionId)
          const node = session?.docManager.getNode(nodeId)

          // 广播更新
          socket
            .to(`collab:${sessionId}`)
            .emit('collab:node_updated', {
              userId: user.id,
              nodeId,
              changes,
              node: node?.toJSON(),
            })

          logger.debug('Node updated', {
            sessionId,
            userId: user.id,
            nodeId,
          })
        } else {
          socket.emit('system:error', {
            message: result.error || 'Failed to update node',
            code: 'UPDATE_FAILED',
          })
        }
      } catch (error) {
        logger.error('Error updating node', {
          socketId: socket.id,
          error,
        })
        socket.emit('system:error', { message: 'Failed to update node' })
      }
    }
  )

  /**
   * 删除节点
   */
  socket.on('collab:delete_node', async (data: { sessionId: string; nodeId: string }) => {
    try {
      const { sessionId, nodeId } = data

      const collabManager = getCollaborationManager()
      const result = await collabManager.deleteNode(sessionId, user.id, nodeId)

      if (result.success) {
        // 广播删除
        socket.to(`collab:${sessionId}`).emit('collab:node_deleted', {
          userId: user.id,
          nodeId,
        })

        logger.debug('Node deleted', {
          sessionId,
          userId: user.id,
          nodeId,
        })
      } else {
        socket.emit('system:error', {
          message: result.error || 'Failed to delete node',
          code: 'DELETE_FAILED',
        })
      }
    } catch (error) {
      logger.error('Error deleting node', {
        socketId: socket.id,
        error,
      })
      socket.emit('system:error', { message: 'Failed to delete node' })
    }
  })

  /**
   * 移动节点
   */
  socket.on(
    'collab:move_node',
    async (data: { sessionId: string; nodeId: string; position: { x: number; y: number } }) => {
      try {
        const { sessionId, nodeId, position } = data

        const collabManager = getCollaborationManager()
        const result = await collabManager.moveNode(sessionId, user.id, nodeId, position)

        if (result.success) {
          // 广播移动
          socket.to(`collab:${sessionId}`).emit('collab:node_moved', {
            userId: user.id,
            nodeId,
            position,
          })

          logger.debug('Node moved', {
            sessionId,
            userId: user.id,
            nodeId,
            position,
          })
        } else {
          socket.emit('system:error', {
            message: result.error || 'Failed to move node',
            code: 'MOVE_FAILED',
          })
        }
      } catch (error) {
        logger.error('Error moving node', {
          socketId: socket.id,
          error,
        })
        socket.emit('system:error', { message: 'Failed to move node' })
      }
    }
  )

  // --------------------------------------------------------------------
  // Edit Lock Management
  // --------------------------------------------------------------------

  /**
   * 获取编辑锁
   */
  socket.on('collab:acquire_lock', async (data: { sessionId: string; nodeId: string }) => {
    try {
      const { sessionId, nodeId } = data

      const collabManager = getCollaborationManager()
      const result = await collabManager.acquireLock(sessionId, user.id, nodeId)

      if (result.success) {
        const lock = collabManager.getLock(nodeId)

        // 广播锁获取
        socket.to(`collab:${sessionId}`).emit('collab:lock_acquired', {
          userId: user.id,
          userName: user.name,
          nodeId,
          lock,
        })

        // 确认
        socket.emit('collab:lock_acquired', {
          nodeId,
          lock,
        })

        logger.debug('Lock acquired', {
          sessionId,
          userId: user.id,
          nodeId,
        })
      } else {
        socket.emit('system:error', {
          message: result.error || 'Failed to acquire lock',
          code: 'LOCK_ACQUIRE_FAILED',
        })
      }
    } catch (error) {
      logger.error('Error acquiring lock', {
        socketId: socket.id,
        error,
      })
      socket.emit('system:error', { message: 'Failed to acquire lock' })
    }
  })

  /**
   * 释放编辑锁
   */
  socket.on('collab:release_lock', (data: { sessionId: string; nodeId: string }) => {
    try {
      const { sessionId, nodeId } = data

      const collabManager = getCollaborationManager()
      const success = collabManager.releaseLock(nodeId, user.id)

      if (success) {
        // 广播锁释放
        socket.to(`collab:${sessionId}`).emit('collab:lock_released', {
          userId: user.id,
          nodeId,
        })

        // 确认
        socket.emit('collab:lock_released', {
          nodeId,
        })

        logger.debug('Lock released', {
          sessionId,
          userId: user.id,
          nodeId,
        })
      } else {
        socket.emit('system:error', {
          message: 'Failed to release lock',
          code: 'LOCK_RELEASE_FAILED',
        })
      }
    } catch (error) {
      logger.error('Error releasing lock', {
        socketId: socket.id,
        error,
      })
      socket.emit('system:error', { message: 'Failed to release lock' })
    }
  })

  /**
   * 续期编辑锁
   */
  socket.on('collab:renew_lock', (data: { sessionId: string; nodeId: string }) => {
    try {
      const { sessionId, nodeId } = data

      const collabManager = getCollaborationManager()
      const success = collabManager.renewLock(nodeId, user.id)

      if (success) {
        // 广播锁续期
        socket.to(`collab:${sessionId}`).emit('collab:lock_renewed', {
          userId: user.id,
          nodeId,
        })

        // 确认
        socket.emit('collab:lock_renewed', {
          nodeId,
        })

        logger.debug('Lock renewed', {
          sessionId,
          userId: user.id,
          nodeId,
        })
      } else {
        socket.emit('system:error', {
          message: 'Failed to renew lock',
          code: 'LOCK_RENEW_FAILED',
        })
      }
    } catch (error) {
      logger.error('Error renewing lock', {
        socketId: socket.id,
        error,
      })
      socket.emit('system:error', { message: 'Failed to renew lock' })
    }
  })

  // --------------------------------------------------------------------
  // Cursor & Selection Sync
  // --------------------------------------------------------------------

  /**
   * 更新光标
   */
  socket.on(
    'collab:update_cursor',
    (data: {
      sessionId: string
      cursor: { userId: string; userName: string; color: string; position: number }
    }) => {
      try {
        const { sessionId, cursor } = data

        const collabManager = getCollaborationManager()
        const success = collabManager.updateCursor(sessionId, user.id, cursor)

        if (success) {
          // 广播光标更新
          socket.to(`collab:${sessionId}`).emit('collab:cursor_updated', {
            userId: user.id,
            cursor,
          })

          logger.debug('Cursor updated', {
            sessionId,
            userId: user.id,
          })
        }
      } catch (error) {
        logger.error('Error updating cursor', {
          socketId: socket.id,
          error,
        })
      }
    }
  )

  /**
   * 更新选择
   */
  socket.on(
    'collab:update_selection',
    (data: {
      sessionId: string
      selection: {
        userId: string
        userName: string
        color: string
        selection: { start: number; end: number }
      }
    }) => {
      try {
        const { sessionId, selection } = data

        const collabManager = getCollaborationManager()
        const success = collabManager.updateSelection(sessionId, user.id, selection)

        if (success) {
          // 广播选择更新
          socket.to(`collab:${sessionId}`).emit('collab:selection_updated', {
            userId: user.id,
            selection,
          })

          logger.debug('Selection updated', {
            sessionId,
            userId: user.id,
          })
        }
      } catch (error) {
        logger.error('Error updating selection', {
          socketId: socket.id,
          error,
        })
      }
    }
  )

  // --------------------------------------------------------------------
  // Sync Protocol
  // --------------------------------------------------------------------

  /**
   * 请求同步
   */
  socket.on('collab:sync_request', (data: { sessionId: string }) => {
    try {
      const { sessionId } = data

      const collabManager = getCollaborationManager()
      const session = collabManager.getSession(sessionId)

      if (!session) {
        socket.emit('system:error', {
          message: 'Session not found',
          code: 'SESSION_NOT_FOUND',
        })
        return
      }

      // 发送文档状态
      const update = session.syncProtocol.createSyncUpdate()

      socket.emit('collab:sync_response', {
        sessionId,
        version: session.docManager.getVersion(),
        data: Array.from(update), // 转换为数组以便 JSON 序列化
      })

      logger.debug('Sync request handled', {
        sessionId,
        userId: user.id,
      })
    } catch (error) {
      logger.error('Error handling sync request', {
        socketId: socket.id,
        error,
      })
      socket.emit('system:error', { message: 'Failed to sync' })
    }
  })

  /**
   * 应用同步更新
   */
  socket.on('collab:sync_update', (data: { sessionId: string; update: number[] }) => {
    try {
      const { sessionId, update } = data

      const collabManager = getCollaborationManager()
      const success = collabManager.applySyncUpdate(sessionId, new Uint8Array(update))

      if (success) {
        logger.debug('Sync update applied', {
          sessionId,
          userId: user.id,
        })
      } else {
        socket.emit('system:error', {
          message: 'Failed to apply sync update',
          code: 'SYNC_UPDATE_FAILED',
        })
      }
    } catch (error) {
      logger.error('Error applying sync update', {
        socketId: socket.id,
        error,
      })
      socket.emit('system:error', { message: 'Failed to apply sync update' })
    }
  })

  // --------------------------------------------------------------------
  // Typing Status
  // --------------------------------------------------------------------

  /**
   * 更新打字状态
   */
  socket.on('collab:typing', (data: { sessionId: string; isTyping: boolean }) => {
    try {
      const { sessionId, isTyping } = data

      const collabManager = getCollaborationManager()
      const session = collabManager.getSession(sessionId)

      if (!session) return

      const participant = session.participants.get(user.id)
      if (participant) {
        participant.isTyping = isTyping
        participant.lastActivity = new Date()
      }

      // 广播打字状态
      socket.to(`collab:${sessionId}`).emit('collab:typing', {
        userId: user.id,
        userName: user.name,
        isTyping,
      })

      logger.debug('Typing status updated', {
        sessionId,
        userId: user.id,
        isTyping,
      })
    } catch (error) {
      logger.error('Error updating typing status', {
        socketId: socket.id,
        error,
      })
    }
  })
}

// ============================================================================
// Cleanup Handler
// ============================================================================

/**
 * 清理协作会话（当用户断开连接时）
 */
export function handleCollaborationDisconnect(socket: AuthenticatedSocket): void {
  const user = socket.data.user
  const userRooms = socket.data.rooms

  if (!userRooms) return

  const collabManager = getCollaborationManager()

  // 离开所有协作会话
  for (const roomId of userRooms) {
    // 查找该房间的所有协作会话
    // 由于没有直接的映射，这里需要遍历所有会话
    // 在生产环境中，应该维护一个房间到会话的映射

    // 临时实现：清理所有该用户的会话
    // TODO: 优化为只清理相关会话
  }

  logger.info('Collaboration disconnect handled', {
    userId: user.id,
    userName: user.name,
  })
}

// ============================================================================
// Periodic Cleanup
// ============================================================================

/**
 * 设置定期清理任务
 */
export function setupCollaborationCleanup(): void {
  // 每分钟清理一次过期锁
  setInterval(() => {
    try {
      const collabManager = getCollaborationManager()
      collabManager.cleanupExpiredLocks()
    } catch (error) {
      logger.error('Error in collaboration cleanup', { error })
    }
  }, 60000)

  logger.info('Collaboration cleanup scheduled')
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * 获取协作统计信息
 */
export function getCollaborationStats(): {
  totalSessions: number
  totalParticipants: number
  totalLocks: number
  sessionsByRoom: Record<string, number>
} {
  const collabManager = getCollaborationManager()
  return collabManager.getStats()
}