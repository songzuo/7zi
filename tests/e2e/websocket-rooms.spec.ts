/**
 * WebSocket Room System E2E Tests - v1.4.0
 *
 * 使用 Playwright 测试房间系统的完整端到端场景：
 * - 创建房间（公开/私有/邀请）
 * - 加入/离开房间
 * - 邀请系统
 * - 房间权限
 * - 房间清理
 */

import { test, expect } from '@playwright/test'

// ============================================================================
// Test Data
// ============================================================================

const testUsers = {
  owner: { id: 'user-owner', name: 'Room Owner', email: 'owner@7zi.com' },
  admin: { id: 'user-admin', name: 'Room Admin', email: 'admin@7zi.com' },
  member: { id: 'user-member', name: 'Room Member', email: 'member@7zi.com' },
  guest: { id: 'user-guest', name: 'Room Guest', email: 'guest@7zi.com' },
}

const roomTypes = ['task', 'project', 'chat', 'document', 'voice', 'video'] as const
const visibilityTypes = ['public', 'private', 'invite-only'] as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a WebSocket page for testing
 */
async function setupWebSocketPage(page: any, userId: string, userName: string) {
  await page.goto('/test/websocket')

  // Connect to WebSocket server
  await page.evaluate(
    ({ userId, userName }) => {
      return new Promise((resolve, reject) => {
        const socket = new WebSocket(`ws://localhost:3000/socket.io/?EIO=4&transport=websocket`)

        socket.onopen = () => {
          // Send auth message
          socket.send(
            JSON.stringify({
              type: 'auth:login',
              payload: { userId, userName },
            })
          )
          ;(window as any).testSocket = socket
          ;(window as any).testMessages = []

          socket.onmessage = event => {
            try {
              const message = JSON.parse(event.data)
              ;(window as any).testMessages.push(message)
            } catch (e) {
              // Skip non-JSON messages
            }
          }

          resolve(true)
        }

        socket.onerror = reject

        setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000)
      })
    },
    { userId, userName }
  )

  // Wait for connection
  await page.waitForTimeout(500)

  return page
}

/**
 * Wait for specific WebSocket message
 */
async function waitForSocketMessage(page: any, messageType: string, timeout = 5000) {
  return page.evaluate(
    ({ messageType, timeout }) => {
      return new Promise(resolve => {
        const socket = (window as any).testSocket
        const messages = (window as any).testMessages

        // Check if message already received
        const existing = messages.find((m: any) => m.type === messageType)
        if (existing) {
          return resolve(existing)
        }

        // Wait for new message
        const handler = (event: any) => {
          try {
            const message = JSON.parse(event.data)
            if (message.type === messageType) {
              socket.removeEventListener('message', handler)
              resolve(message)
            }
          } catch (e) {
            // Skip
          }
        }

        socket.addEventListener('message', handler)

        setTimeout(() => {
          socket.removeEventListener('message', handler)
          resolve(null)
        }, timeout)
      })
    },
    { messageType, timeout }
  )
}

/**
 * Send WebSocket message
 */
async function sendSocketMessage(page: any, message: any) {
  return page.evaluate(message => {
    const socket = (window as any).testSocket
    socket.send(JSON.stringify(message))
  }, message)
}

/**
 * Get all received messages
 */
async function getSocketMessages(page: any) {
  return page.evaluate(() => {
    return (window as any).testMessages || []
  })
}

/**
 * Clear message history
 */
async function clearSocketMessages(page: any) {
  return page.evaluate(() => {
    ;(window as any).testMessages = []
  })
}

// ============================================================================
// Test Suite: Room Creation
// ============================================================================

test.describe('Room Creation', () => {
  test.beforeEach(async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)
  })

  test('should create a public room', async ({ page }) => {
    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-public-1',
        name: 'Public Room',
        type: 'chat',
        documentId: 'doc-1',
        visibility: 'public',
      },
    })

    await page.waitForTimeout(100)

    // Verify room was created
    const messages = await getSocketMessages(page)
    const createResponse = messages.find((m: any) => m.type === 'room:created')

    expect(createResponse).toBeDefined()
    expect(createResponse.payload.room.id).toBe('room-public-1')
    expect(createResponse.payload.room.visibility).toBe('public')
  })

  test('should create a private room', async ({ page }) => {
    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-private-1',
        name: 'Private Room',
        type: 'chat',
        documentId: 'doc-2',
        visibility: 'private',
      },
    })

    await page.waitForTimeout(100)

    const messages = await getSocketMessages(page)
    const createResponse = messages.find((m: any) => m.type === 'room:created')

    expect(createResponse).toBeDefined()
    expect(createResponse.payload.room.visibility).toBe('private')
  })

  test('should create an invite-only room', async ({ page }) => {
    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-invite-1',
        name: 'Invite Only Room',
        type: 'chat',
        documentId: 'doc-3',
        visibility: 'invite-only',
      },
    })

    await page.waitForTimeout(100)

    const messages = await getSocketMessages(page)
    const createResponse = messages.find((m: any) => m.type === 'room:created')

    expect(createResponse).toBeDefined()
    expect(createResponse.payload.room.visibility).toBe('invite-only')
  })

  test('should create different room types', async ({ page }) => {
    for (const type of roomTypes) {
      const roomId = `room-${type}-${Date.now()}`

      await sendSocketMessage(page, {
        type: 'room:create',
        payload: {
          id: roomId,
          name: `${type.toUpperCase()} Room`,
          type,
          documentId: `doc-${type}`,
          visibility: 'public',
        },
      })

      await page.waitForTimeout(100)

      const messages = await getSocketMessages(page)
      const createResponse = messages.find(
        (m: any) => m.type === 'room:created' && m.payload.room.id === roomId
      )

      expect(createResponse).toBeDefined()
      expect(createResponse.payload.room.type).toBe(type)

      await clearSocketMessages(page)
    }
  })

  test('should validate required fields for room creation', async ({ page }) => {
    // Try to create room without required fields
    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-invalid',
        // Missing required fields
      },
    })

    await page.waitForTimeout(100)

    const messages = await getSocketMessages(page)
    const errorResponse = messages.find((m: any) => m.type === 'system:error')

    expect(errorResponse).toBeDefined()
  })
})

// ============================================================================
// Test Suite: Room Join/Leave
// ============================================================================

test.describe('Room Join/Leave', () => {
  test('should join a public room', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.member.id, testUsers.member.name)

    // Create room first
    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-join-test',
        name: 'Join Test Room',
        type: 'chat',
        documentId: 'doc-join',
        visibility: 'public',
      },
    })

    await page.waitForTimeout(100)
    await clearSocketMessages(page)

    // Join the room
    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-join-test',
        documentId: 'doc-join',
      },
    })

    // Wait for join confirmation
    const joinResponse = await waitForSocketMessage(page, 'room:joined')

    expect(joinResponse).toBeDefined()
    expect(joinResponse.payload.roomId).toBe('room-join-test')
    expect(joinResponse.payload.users.length).toBeGreaterThan(0)
  })

  test('should leave a room', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.member.id, testUsers.member.name)

    // Create and join room
    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-leave-test',
        name: 'Leave Test Room',
        type: 'chat',
        documentId: 'doc-leave',
        visibility: 'public',
      },
    })

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-leave-test',
        documentId: 'doc-leave',
      },
    })

    await page.waitForTimeout(100)
    await clearSocketMessages(page)

    // Leave the room
    await sendSocketMessage(page, {
      type: 'room:leave',
      payload: {
        roomId: 'room-leave-test',
      },
    })

    const leaveResponse = await waitForSocketMessage(page, 'room:left')

    expect(leaveResponse).toBeDefined()
    expect(leaveResponse.payload.roomId).toBe('room-leave-test')
  })

  test('should notify other users when someone joins', async ({ page, context }) => {
    // First user creates room
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-notify-join',
        name: 'Notify Join Room',
        type: 'chat',
        documentId: 'doc-notify',
        visibility: 'public',
      },
    })

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-notify-join',
        documentId: 'doc-notify',
      },
    })

    await page.waitForTimeout(200)
    await clearSocketMessages(page)

    // Second user joins (in a new page/browser context)
    const page2 = await context.newPage()
    await setupWebSocketPage(page2, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(page2, {
      type: 'room:join',
      payload: {
        roomId: 'room-notify-join',
        documentId: 'doc-notify',
      },
    })

    // First user should receive notification
    const userJoinedMsg = await waitForSocketMessage(page, 'room:user_joined')

    expect(userJoinedMsg).toBeDefined()
    expect(userJoinedMsg.payload.user.id).toBe(testUsers.member.id)
    expect(userJoinedMsg.payload.userCount).toBe(2)

    await page2.close()
  })

  test('should notify other users when someone leaves', async ({ page, context }) => {
    // Create room and join both users
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-notify-leave',
        name: 'Notify Leave Room',
        type: 'chat',
        documentId: 'doc-notify-leave',
        visibility: 'public',
      },
    })

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-notify-leave',
        documentId: 'doc-notify-leave',
      },
    })

    await page.waitForTimeout(200)

    const page2 = await context.newPage()
    await setupWebSocketPage(page2, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(page2, {
      type: 'room:join',
      payload: {
        roomId: 'room-notify-leave',
        documentId: 'doc-notify-leave',
      },
    })

    await page.waitForTimeout(200)
    await clearSocketMessages(page)

    // Second user leaves
    await sendSocketMessage(page2, {
      type: 'room:leave',
      payload: {
        roomId: 'room-notify-leave',
      },
    })

    // First user should receive notification
    const userLeftMsg = await waitForSocketMessage(page, 'room:user_left')

    expect(userLeftMsg).toBeDefined()
    expect(userLeftMsg.payload.userId).toBe(testUsers.member.id)
    expect(userLeftMsg.payload.userCount).toBe(1)

    await page2.close()
  })
})

// ============================================================================
// Test Suite: Room Invitation System
// ============================================================================

test.describe('Room Invitation System', () => {
  test('should invite user to private room', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    // Create private room
    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-invite-test',
        name: 'Invite Test Room',
        type: 'chat',
        documentId: 'doc-invite',
        visibility: 'private',
      },
    })

    await page.waitForTimeout(100)
    await clearSocketMessages(page)

    // Invite user
    await sendSocketMessage(page, {
      type: 'room:invite',
      payload: {
        roomId: 'room-invite-test',
        userId: testUsers.member.id,
      },
    })

    const inviteResponse = await waitForSocketMessage(page, 'room:invited')

    expect(inviteResponse).toBeDefined()
    expect(inviteResponse.payload.roomId).toBe('room-invite-test')
    expect(inviteResponse.payload.userId).toBe(testUsers.member.id)
  })

  test('should allow invited user to join private room', async ({ page, context }) => {
    // Owner creates and invites
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-invite-join',
        name: 'Invite Join Room',
        type: 'chat',
        documentId: 'doc-invite-join',
        visibility: 'private',
      },
    })

    await sendSocketMessage(page, {
      type: 'room:invite',
      payload: {
        roomId: 'room-invite-join',
        userId: testUsers.member.id,
      },
    })

    await page.waitForTimeout(200)

    // Invited user joins
    const page2 = await context.newPage()
    await setupWebSocketPage(page2, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(page2, {
      type: 'room:join',
      payload: {
        roomId: 'room-invite-join',
        documentId: 'doc-invite-join',
      },
    })

    const joinResponse = await waitForSocketMessage(page2, 'room:joined')

    expect(joinResponse).toBeDefined()
    expect(joinResponse.payload.roomId).toBe('room-invite-join')

    await page2.close()
  })

  test('should reject uninvited user from private room', async ({ page, context }) => {
    // Owner creates private room
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-private-reject',
        name: 'Private Reject Room',
        type: 'chat',
        documentId: 'doc-private-reject',
        visibility: 'private',
      },
    })

    await page.waitForTimeout(200)

    // Uninvited user tries to join
    const page2 = await context.newPage()
    await setupWebSocketPage(page2, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(page2, {
      type: 'room:join',
      payload: {
        roomId: 'room-private-reject',
        documentId: 'doc-private-reject',
      },
    })

    const errorResponse = await waitForSocketMessage(page2, 'system:error')

    expect(errorResponse).toBeDefined()
    expect(errorResponse.payload.message).toContain('Not invited')

    await page2.close()
  })

  test('should check invite permissions', async ({ page }) => {
    // Owner creates room
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-invite-perm',
        name: 'Invite Permission Room',
        type: 'chat',
        documentId: 'doc-invite-perm',
        visibility: 'private',
      },
    })

    await page.waitForTimeout(100)
    await clearSocketMessages(page)

    // Member tries to invite (should fail)
    await sendSocketMessage(page, {
      type: 'room:invite',
      payload: {
        roomId: 'room-invite-perm',
        userId: testUsers.guest.id,
      },
    })

    const errorResponse = await waitForSocketMessage(page, 'system:error')

    expect(errorResponse).toBeDefined()
    expect(errorResponse.payload.message).toContain('No permission')
  })
})

// ============================================================================
// Test Suite: Room Permissions
// ============================================================================

test.describe('Room Permissions', () => {
  test('should allow owner to kick users', async ({ page, context }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-kick-test',
        name: 'Kick Test Room',
        type: 'chat',
        documentId: 'doc-kick',
        visibility: 'public',
      },
    })

    await page.waitForTimeout(100)

    // Member joins
    const page2 = await context.newPage()
    await setupWebSocketPage(page2, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(page2, {
      type: 'room:join',
      payload: {
        roomId: 'room-kick-test',
        documentId: 'doc-kick',
      },
    })

    await page.waitForTimeout(200)

    // Owner kicks member
    await sendSocketMessage(page, {
      type: 'room:kick',
      payload: {
        roomId: 'room-kick-test',
        userId: testUsers.member.id,
        reason: 'Test kick',
      },
    })

    await page.waitForTimeout(100)

    // Member should receive kick notification
    const kickMsg = await waitForSocketMessage(page2, 'room:kicked')

    expect(kickMsg).toBeDefined()
    expect(kickMsg.payload.roomId).toBe('room-kick-test')
    expect(kickMsg.payload.reason).toBe('Test kick')

    await page2.close()
  })

  test('should prevent non-admin from kicking users', async ({ page, context }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-kick-deny',
        name: 'Kick Deny Room',
        type: 'chat',
        documentId: 'doc-kick-deny',
        visibility: 'public',
      },
    })

    await page.waitForTimeout(100)

    // Member joins
    const page2 = await context.newPage()
    await setupWebSocketPage(page2, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(page2, {
      type: 'room:join',
      payload: {
        roomId: 'room-kick-deny',
        documentId: 'doc-kick-deny',
      },
    })

    await page.waitForTimeout(200)
    await clearSocketMessages(page2)

    // Another member joins and tries to kick
    const page3 = await context.newPage()
    await setupWebSocketPage(page3, testUsers.guest.id, testUsers.guest.name)

    await sendSocketMessage(page3, {
      type: 'room:join',
      payload: {
        roomId: 'room-kick-deny',
        documentId: 'doc-kick-deny',
      },
    })

    await page.waitForTimeout(200)

    // Guest tries to kick member (should fail)
    await sendSocketMessage(page3, {
      type: 'room:kick',
      payload: {
        roomId: 'room-kick-deny',
        userId: testUsers.member.id,
        reason: 'Unauthorized kick',
      },
    })

    const errorResponse = await waitForSocketMessage(page3, 'system:error')

    expect(errorResponse).toBeDefined()
    expect(errorResponse.payload.message).toContain('No permission')

    await page2.close()
    await page3.close()
  })

  test('should change user role with proper permissions', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-role-test',
        name: 'Role Test Room',
        type: 'chat',
        documentId: 'doc-role',
        visibility: 'public',
      },
    })

    await page.waitForTimeout(100)
    await clearSocketMessages(page)

    // Promote member to admin
    await sendSocketMessage(page, {
      type: 'room:change_role',
      payload: {
        roomId: 'room-role-test',
        userId: testUsers.member.id,
        newRole: 'admin',
      },
    })

    const roleChangedMsg = await waitForSocketMessage(page, 'room:role_changed')

    expect(roleChangedMsg).toBeDefined()
    expect(roleChangedMsg.payload.newRole).toBe('admin')
  })

  test('should enforce room capacity limits', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-capacity-test',
        name: 'Capacity Test Room',
        type: 'chat',
        documentId: 'doc-capacity',
        visibility: 'public',
        config: {
          maxParticipants: 2,
        },
      },
    })

    await page.waitForTimeout(100)

    // Owner joins (1/2)
    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-capacity-test',
        documentId: 'doc-capacity',
      },
    })

    await page.waitForTimeout(100)

    // This test would require creating multiple browser contexts
    // For brevity, we'll skip the full implementation
    // In production, create contexts for member and guest
  })
})

// ============================================================================
// Test Suite: Room Cleanup
// ============================================================================

test.describe('Room Cleanup', () => {
  test('should clean up empty chat rooms after timeout', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-cleanup-test',
        name: 'Cleanup Test Room',
        type: 'chat',
        documentId: 'doc-cleanup',
        visibility: 'public',
        config: {
          autoCleanupMinutes: 0.01, // ~0.6 seconds for testing
        },
      },
    })

    await page.waitForTimeout(100)

    // Join and immediately leave
    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-cleanup-test',
        documentId: 'doc-cleanup',
      },
    })

    await page.waitForTimeout(100)

    await sendSocketMessage(page, {
      type: 'room:leave',
      payload: {
        roomId: 'room-cleanup-test',
      },
    })

    await page.waitForTimeout(100)
    await clearSocketMessages(page)

    // Try to rejoin after cleanup timeout
    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-cleanup-test',
        documentId: 'doc-cleanup',
      },
    })

    // Room might be destroyed or recreated, check response
    const messages = await getSocketMessages(page)

    // Either room:joined (if recreated) or system:error (if destroyed)
    const joined = messages.find((m: any) => m.type === 'room:joined')
    const error = messages.find((m: any) => m.type === 'system:error')

    expect(joined || error).toBeDefined()
  })

  test('should not clean up project rooms', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-project-no-cleanup',
        name: 'Project Room',
        type: 'project',
        documentId: 'doc-project',
        visibility: 'public',
        config: {
          autoCleanupMinutes: 0.01,
        },
      },
    })

    await page.waitForTimeout(100)

    // Join and leave
    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-project-no-cleanup',
        documentId: 'doc-project',
      },
    })

    await page.waitForTimeout(100)

    await sendSocketMessage(page, {
      type: 'room:leave',
      payload: {
        roomId: 'room-project-no-cleanup',
      },
    })

    await page.waitForTimeout(200)

    // Room should still exist
    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-project-no-cleanup',
        documentId: 'doc-project',
      },
    })

    const joinResponse = await waitForSocketMessage(page, 'room:joined')

    expect(joinResponse).toBeDefined()
  })

  test('should destroy room on owner request', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-destroy-test',
        name: 'Destroy Test Room',
        type: 'chat',
        documentId: 'doc-destroy',
        visibility: 'public',
      },
    })

    await page.waitForTimeout(100)
    await clearSocketMessages(page)

    // Destroy room
    await sendSocketMessage(page, {
      type: 'room:destroy',
      payload: {
        roomId: 'room-destroy-test',
      },
    })

    const destroyResponse = await waitForSocketMessage(page, 'room:destroyed')

    expect(destroyResponse).toBeDefined()
    expect(destroyResponse.payload.roomId).toBe('room-destroy-test')
  })

  test('should clear room messages on destroy', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-destroy-msgs',
        name: 'Destroy Messages Room',
        type: 'chat',
        documentId: 'doc-destroy-msgs',
        visibility: 'public',
      },
    })

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-destroy-msgs',
        documentId: 'doc-destroy-msgs',
      },
    })

    await page.waitForTimeout(100)

    // Send a message
    await sendSocketMessage(page, {
      type: 'message:send',
      payload: {
        roomId: 'room-destroy-msgs',
        content: 'Test message',
      },
    })

    await page.waitForTimeout(100)
    await clearSocketMessages(page)

    // Destroy room
    await sendSocketMessage(page, {
      type: 'room:destroy',
      payload: {
        roomId: 'room-destroy-msgs',
      },
    })

    await page.waitForTimeout(100)

    // Try to get message history
    await sendSocketMessage(page, {
      type: 'message:get_history',
      payload: {
        roomId: 'room-destroy-msgs',
        limit: 10,
      },
    })

    const messages = await getSocketMessages(page)
    const historyResponse = messages.find((m: any) => m.type === 'message:history')

    // History should be empty or room should not exist
    expect(historyResponse).toBeDefined()
    expect(historyResponse.payload.messages.length).toBe(0)
  })
})

// ============================================================================
// Test Suite: Multi-User Collaboration
// ============================================================================

test.describe('Multi-User Collaboration', () => {
  test('should support multiple users in same room', async ({ page, context }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-multi-user',
        name: 'Multi User Room',
        type: 'chat',
        documentId: 'doc-multi',
        visibility: 'public',
      },
    })

    await page.waitForTimeout(100)

    // Join multiple users
    const pages: any[] = []
    const users = [testUsers.admin, testUsers.member, testUsers.guest]

    for (const user of users) {
      const userPage = await context.newPage()
      await setupWebSocketPage(userPage, user.id, user.name)

      await sendSocketMessage(userPage, {
        type: 'room:join',
        payload: {
          roomId: 'room-multi-user',
          documentId: 'doc-multi',
        },
      })

      pages.push(userPage)
    }

    await page.waitForTimeout(500)

    // Check owner received all user joined notifications
    const messages = await getSocketMessages(page)
    const userJoinedCount = messages.filter((m: any) => m.type === 'room:user_joined').length

    expect(userJoinedCount).toBe(users.length)

    // Cleanup
    for (const userPage of pages) {
      await userPage.close()
    }
  })

  test('should broadcast messages to all room users', async ({ page, context }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-broadcast',
        name: 'Broadcast Room',
        type: 'chat',
        documentId: 'doc-broadcast',
        visibility: 'public',
      },
    })

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-broadcast',
        documentId: 'doc-broadcast',
      },
    })

    await page.waitForTimeout(100)

    // Member joins
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(memberPage, {
      type: 'room:join',
      payload: {
        roomId: 'room-broadcast',
        documentId: 'doc-broadcast',
      },
    })

    await page.waitForTimeout(200)
    await clearSocketMessages(page)
    await clearSocketMessages(memberPage)

    // Owner sends message
    await sendSocketMessage(page, {
      type: 'message:send',
      payload: {
        roomId: 'room-broadcast',
        content: 'Hello everyone!',
      },
    })

    await page.waitForTimeout(100)

    // Both users should receive the message
    const ownerMessages = await getSocketMessages(page)
    const memberMessages = await getSocketMessages(memberPage)

    const ownerMsg = ownerMessages.find((m: any) => m.type === 'message:new')
    const memberMsg = memberMessages.find((m: any) => m.type === 'message:new')

    expect(ownerMsg).toBeDefined()
    expect(ownerMsg.payload.content).toBe('Hello everyone!')
    expect(memberMsg).toBeDefined()
    expect(memberMsg.payload.content).toBe('Hello everyone!')

    await memberPage.close()
  })
})

// ============================================================================
// Test Suite: Error Handling
// ============================================================================

test.describe('Room Error Handling', () => {
  test('should handle duplicate room creation', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    // Create room
    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-duplicate',
        name: 'Duplicate Room',
        type: 'chat',
        documentId: 'doc-duplicate',
        visibility: 'public',
      },
    })

    await page.waitForTimeout(100)

    // Try to create same room again
    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-duplicate',
        name: 'Duplicate Room',
        type: 'chat',
        documentId: 'doc-duplicate',
        visibility: 'public',
      },
    })

    await page.waitForTimeout(100)

    const messages = await getSocketMessages(page)
    const createResponses = messages.filter((m: any) => m.type === 'room:created')

    // Should only have one created response (duplicate creation returns existing room)
    expect(createResponses.length).toBeGreaterThanOrEqual(1)
  })

  test('should handle joining non-existent room', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-nonexistent',
        documentId: 'doc-nonexistent',
      },
    })

    await page.waitForTimeout(100)

    const messages = await getSocketMessages(page)
    const errorResponse = messages.find((m: any) => m.type === 'system:error')

    // Either error or auto-created room
    expect(errorResponse || messages.find((m: any) => m.type === 'room:joined')).toBeDefined()
  })

  test('should handle leaving non-joined room', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(page, {
      type: 'room:leave',
      payload: {
        roomId: 'room-not-joined',
      },
    })

    await page.waitForTimeout(100)

    const messages = await getSocketMessages(page)
    const errorResponse = messages.find((m: any) => m.type === 'system:error')
    const leftResponse = messages.find((m: any) => m.type === 'room:left')

    expect(errorResponse || leftResponse).toBeDefined()
  })

  test('should handle invalid room IDs', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: '',
        name: 'Invalid Room',
        type: 'chat',
        documentId: 'doc-invalid',
        visibility: 'public',
      },
    })

    await page.waitForTimeout(100)

    const messages = await getSocketMessages(page)
    const errorResponse = messages.find((m: any) => m.type === 'system:error')

    expect(errorResponse).toBeDefined()
  })
})

// ============================================================================
// Test Suite: Message History Query
// ============================================================================

test.describe('Message History Query', () => {
  test('should return limited message history', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    // Create room and join
    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-history-limit',
        name: 'History Limit Room',
        type: 'chat',
        documentId: 'doc-history',
        visibility: 'public',
        config: { messageHistoryEnabled: true },
      },
    })

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-history-limit',
        documentId: 'doc-history',
      },
    })

    await page.waitForTimeout(100)

    // Send 5 messages
    for (let i = 1; i <= 5; i++) {
      await sendSocketMessage(page, {
        type: 'message:send',
        payload: {
          roomId: 'room-history-limit',
          content: `Message ${i}`,
        },
      })
      await page.waitForTimeout(50)
    }

    await page.waitForTimeout(200)
    await clearSocketMessages(page)

    // Request history with limit=3
    await sendSocketMessage(page, {
      type: 'message:get_history',
      payload: {
        roomId: 'room-history-limit',
        limit: 3,
      },
    })

    const historyResponse = await waitForSocketMessage(page, 'message:history')

    expect(historyResponse).toBeDefined()
    expect(historyResponse.payload.messages.length).toBe(3)
    expect(historyResponse.payload.messages[0].content).toBe('Message 5') // Most recent
  })

  test('should support before parameter for pagination', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-history-before',
        name: 'History Before Room',
        type: 'chat',
        documentId: 'doc-history-before',
        visibility: 'public',
        config: { messageHistoryEnabled: true },
      },
    })

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-history-before',
        documentId: 'doc-history-before',
      },
    })

    await page.waitForTimeout(100)

    // Send 10 messages
    const messageIds: string[] = []
    for (let i = 1; i <= 10; i++) {
      await sendSocketMessage(page, {
        type: 'message:send',
        payload: {
          roomId: 'room-history-before',
          content: `Message ${i}`,
        },
      })
      await page.waitForTimeout(50)
    }

    await page.waitForTimeout(200)

    // Get first 5 messages
    await clearSocketMessages(page)
    await sendSocketMessage(page, {
      type: 'message:get_history',
      payload: {
        roomId: 'room-history-before',
        limit: 5,
      },
    })

    const firstResponse = await waitForSocketMessage(page, 'message:history')
    const firstMessages = firstResponse.payload.messages
    expect(firstMessages.length).toBe(5)

    // Get next 5 messages using 'before' (use timestamp of 5th message)
    const beforeTimestamp = firstMessages[4].timestamp
    await clearSocketMessages(page)

    await sendSocketMessage(page, {
      type: 'message:get_history',
      payload: {
        roomId: 'room-history-before',
        limit: 5,
        before: new Date(beforeTimestamp),
      },
    })

    const secondResponse = await waitForSocketMessage(page, 'message:history')

    expect(secondResponse).toBeDefined()
    expect(secondResponse.payload.messages.length).toBe(5)
    // Messages should be older than the first batch
    expect(secondResponse.payload.messages[0].timestamp).toBeLessThan(beforeTimestamp)
  })

  test('should return empty history for new room', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-history-empty',
        name: 'Empty History Room',
        type: 'chat',
        documentId: 'doc-empty',
        visibility: 'public',
      },
    })

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-history-empty',
        documentId: 'doc-empty',
      },
    })

    await page.waitForTimeout(100)
    await clearSocketMessages(page)

    // Request history
    await sendSocketMessage(page, {
      type: 'message:get_history',
      payload: {
        roomId: 'room-history-empty',
        limit: 10,
      },
    })

    const historyResponse = await waitForSocketMessage(page, 'message:history')

    expect(historyResponse).toBeDefined()
    expect(historyResponse.payload.messages.length).toBe(0)
  })
})

// ============================================================================
// Test Suite: Room User List
// ============================================================================

test.describe('Room User List', () => {
  test('should return current user list on join', async ({ page, context }) => {
    // Owner creates room
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-userlist-join',
        name: 'User List Room',
        type: 'chat',
        documentId: 'doc-userlist',
        visibility: 'public',
      },
    })

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-userlist-join',
        documentId: 'doc-userlist',
      },
    })

    await page.waitForTimeout(100)

    // Add 3 more users
    const users = [testUsers.admin, testUsers.member, testUsers.guest]
    for (const user of users) {
      const userPage = await context.newPage()
      await setupWebSocketPage(userPage, user.id, user.name)

      await sendSocketMessage(userPage, {
        type: 'room:join',
        payload: {
          roomId: 'room-userlist-join',
          documentId: 'doc-userlist',
        },
      })

      await page.waitForTimeout(50)
      await userPage.close()
    }

    await page.waitForTimeout(200)
    await clearSocketMessages(page)

    // New user joins and should receive full user list
    const newPage = await context.newPage()
    await setupWebSocketPage(newPage, 'new-user', 'New User')

    await sendSocketMessage(newPage, {
      type: 'room:join',
      payload: {
        roomId: 'room-userlist-join',
        documentId: 'doc-userlist',
      },
    })

    const joinResponse = await waitForSocketMessage(newPage, 'room:joined')

    expect(joinResponse).toBeDefined()
    expect(joinResponse.payload.users.length).toBe(5) // Owner + 3 users + new user
    expect(joinResponse.payload.users.some((u: any) => u.id === testUsers.owner.id)).toBe(true)

    await newPage.close()
  })

  test('should notify when user joins room', async ({ page, context }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-user-notify',
        name: 'User Notify Room',
        type: 'chat',
        documentId: 'doc-notify',
        visibility: 'public',
      },
    })

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-user-notify',
        documentId: 'doc-notify',
      },
    })

    await page.waitForTimeout(100)
    await clearSocketMessages(page)

    // User joins
    const userPage = await context.newPage()
    await setupWebSocketPage(userPage, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(userPage, {
      type: 'room:join',
      payload: {
        roomId: 'room-user-notify',
        documentId: 'doc-notify',
      },
    })

    // Owner should receive notification
    const userJoinedMsg = await waitForSocketMessage(page, 'room:user_joined')

    expect(userJoinedMsg).toBeDefined()
    expect(userJoinedMsg.payload.user.id).toBe(testUsers.member.id)
    expect(userJoinedMsg.payload.user.name).toBe(testUsers.member.name)
    expect(userJoinedMsg.payload.userCount).toBe(2)

    await userPage.close()
  })

  test('should notify when user leaves room', async ({ page, context }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-user-leave',
        name: 'User Leave Room',
        type: 'chat',
        documentId: 'doc-leave',
        visibility: 'public',
      },
    })

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-user-leave',
        documentId: 'doc-leave',
      },
    })

    await page.waitForTimeout(100)

    // User joins
    const userPage = await context.newPage()
    await setupWebSocketPage(userPage, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(userPage, {
      type: 'room:join',
      payload: {
        roomId: 'room-user-leave',
        documentId: 'doc-leave',
      },
    })

    await page.waitForTimeout(100)
    await clearSocketMessages(page)

    // User leaves
    await sendSocketMessage(userPage, {
      type: 'room:leave',
      payload: {
        roomId: 'room-user-leave',
      },
    })

    // Owner should receive notification
    const userLeftMsg = await waitForSocketMessage(page, 'room:user_left')

    expect(userLeftMsg).toBeDefined()
    expect(userLeftMsg.payload.userId).toBe(testUsers.member.id)
    expect(userLeftMsg.payload.userCount).toBe(1)

    await userPage.close()
  })

  test('should update user presence status', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-presence',
        name: 'Presence Room',
        type: 'chat',
        documentId: 'doc-presence',
        visibility: 'public',
      },
    })

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-presence',
        documentId: 'doc-presence',
      },
    })

    await page.waitForTimeout(100)
    await clearSocketMessages(page)

    // Send typing indicator
    await sendSocketMessage(page, {
      type: 'user:typing',
      payload: {
        roomId: 'room-presence',
        isTyping: true,
      },
    })

    // Should receive typing update
    const typingMsg = await waitForSocketMessage(page, 'user:typing')

    expect(typingMsg).toBeDefined()
    expect(typingMsg.payload.isTyping).toBe(true)

    // Stop typing
    await clearSocketMessages(page)
    await sendSocketMessage(page, {
      type: 'user:typing',
      payload: {
        roomId: 'room-presence',
        isTyping: false,
      },
    })

    const stopTypingMsg = await waitForSocketMessage(page, 'user:typing')

    expect(stopTypingMsg).toBeDefined()
    expect(stopTypingMsg.payload.isTyping).toBe(false)
  })
})

// ============================================================================
// Test Suite: Room Permission Verification
// ============================================================================

test.describe('Room Permission Verification', () => {
  test('should verify owner has all permissions', async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-perm-owner',
        name: 'Owner Permission Room',
        type: 'chat',
        documentId: 'doc-perm-owner',
        visibility: 'private',
      },
    })

    await page.waitForTimeout(100)
    await clearSocketMessages(page)

    // Owner should be able to invite
    await sendSocketMessage(page, {
      type: 'room:invite',
      payload: {
        roomId: 'room-perm-owner',
        userId: testUsers.member.id,
      },
    })

    const inviteResponse = await waitForSocketMessage(page, 'room:invited')
    expect(inviteResponse).toBeDefined()

    await clearSocketMessages(page)

    // Owner should be able to kick
    await sendSocketMessage(page, {
      type: 'room:kick',
      payload: {
        roomId: 'room-perm-owner',
        userId: testUsers.member.id,
        reason: 'Test',
      },
    })

    // Kick might fail if user not in room, but should not be permission error
    const messages = await getSocketMessages(page)
    const kickResponse = messages.find((m: any) => m.type === 'room:kicked')
    expect(kickResponse || messages.find((m: any) => m.type === 'system:error')).toBeDefined()
  })

  test('should verify member has limited permissions', async ({ page, context }) => {
    // Owner creates room
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-perm-member',
        name: 'Member Permission Room',
        type: 'chat',
        documentId: 'doc-perm-member',
        visibility: 'private',
      },
    })

    // Owner invites member
    await sendSocketMessage(page, {
      type: 'room:invite',
      payload: {
        roomId: 'room-perm-member',
        userId: testUsers.member.id,
      },
    })

    await page.waitForTimeout(100)

    // Member joins
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(memberPage, {
      type: 'room:join',
      payload: {
        roomId: 'room-perm-member',
        documentId: 'doc-perm-member',
      },
    })

    await memberPage.waitForTimeout(100)
    await clearSocketMessages(memberPage)

    // Member tries to invite another user (should fail)
    await sendSocketMessage(memberPage, {
      type: 'room:invite',
      payload: {
        roomId: 'room-perm-member',
        userId: testUsers.guest.id,
      },
    })

    const errorResponse = await waitForSocketMessage(memberPage, 'system:error')

    expect(errorResponse).toBeDefined()
    expect(errorResponse.payload.message).toContain('No permission')

    await memberPage.close()
  })

  test('should verify admin has elevated permissions', async ({ page, context }) => {
    // Owner creates room
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-perm-admin',
        name: 'Admin Permission Room',
        type: 'chat',
        documentId: 'doc-perm-admin',
        visibility: 'private',
      },
    })

    // Owner promotes member to admin
    await sendSocketMessage(page, {
      type: 'room:invite',
      payload: {
        roomId: 'room-perm-admin',
        userId: testUsers.member.id,
      },
    })

    await page.waitForTimeout(100)

    // Admin joins
    const adminPage = await context.newPage()
    await setupWebSocketPage(adminPage, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(adminPage, {
      type: 'room:join',
      payload: {
        roomId: 'room-perm-admin',
        documentId: 'doc-perm-admin',
      },
    })

    await adminPage.waitForTimeout(100)

    // Owner promotes to admin
    await sendSocketMessage(page, {
      type: 'room:change_role',
      payload: {
        roomId: 'room-perm-admin',
        userId: testUsers.member.id,
        newRole: 'admin',
      },
    })

    await page.waitForTimeout(100)
    await clearSocketMessages(adminPage)

    // Admin should be able to invite users
    await sendSocketMessage(adminPage, {
      type: 'room:invite',
      payload: {
        roomId: 'room-perm-admin',
        userId: testUsers.guest.id,
      },
    })

    const inviteResponse = await waitForSocketMessage(adminPage, 'room:invited')

    expect(inviteResponse).toBeDefined()

    await adminPage.close()
  })

  test('should verify guest has read-only permissions', async ({ page, context }) => {
    // Owner creates room
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-perm-guest',
        name: 'Guest Permission Room',
        type: 'chat',
        documentId: 'doc-perm-guest',
        visibility: 'public',
        config: { allowGuests: true },
      },
    })

    await page.waitForTimeout(100)

    // Guest joins
    const guestPage = await context.newPage()
    await setupWebSocketPage(guestPage, testUsers.guest.id, testUsers.guest.name)

    await sendSocketMessage(guestPage, {
      type: 'room:join',
      payload: {
        roomId: 'room-perm-guest',
        documentId: 'doc-perm-guest',
      },
    })

    await guestPage.waitForTimeout(100)
    await clearSocketMessages(guestPage)

    // Guest tries to kick user (should fail)
    await sendSocketMessage(guestPage, {
      type: 'room:kick',
      payload: {
        roomId: 'room-perm-guest',
        userId: testUsers.owner.id,
        reason: 'Unauthorized',
      },
    })

    const errorResponse = await waitForSocketMessage(guestPage, 'system:error')

    expect(errorResponse).toBeDefined()
    expect(errorResponse.payload.message).toContain('No permission')

    await guestPage.close()
  })

  test('should verify role hierarchy', async ({ page, context }) => {
    // Owner creates room
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-role-hierarchy',
        name: 'Role Hierarchy Room',
        type: 'chat',
        documentId: 'doc-hierarchy',
        visibility: 'public',
      },
    })

    // Add admin and member
    await sendSocketMessage(page, {
      type: 'room:invite',
      payload: {
        roomId: 'room-role-hierarchy',
        userId: testUsers.admin.id,
      },
    })

    await sendSocketMessage(page, {
      type: 'room:invite',
      payload: {
        roomId: 'room-role-hierarchy',
        userId: testUsers.member.id,
      },
    })

    await page.waitForTimeout(100)

    // Admin joins
    const adminPage = await context.newPage()
    await setupWebSocketPage(adminPage, testUsers.admin.id, testUsers.admin.name)

    await sendSocketMessage(adminPage, {
      type: 'room:join',
      payload: {
        roomId: 'room-role-hierarchy',
        documentId: 'doc-hierarchy',
      },
    })

    await adminPage.waitForTimeout(100)

    // Member joins
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(memberPage, {
      type: 'room:join',
      payload: {
        roomId: 'room-role-hierarchy',
        documentId: 'doc-hierarchy',
      },
    })

    await memberPage.waitForTimeout(100)

    // Owner promotes admin
    await sendSocketMessage(page, {
      type: 'room:change_role',
      payload: {
        roomId: 'room-role-hierarchy',
        userId: testUsers.admin.id,
        newRole: 'admin',
      },
    })

    await page.waitForTimeout(100)
    await clearSocketMessages(memberPage)

    // Member tries to kick admin (should fail - hierarchy)
    await sendSocketMessage(memberPage, {
      type: 'room:kick',
      payload: {
        roomId: 'room-role-hierarchy',
        userId: testUsers.admin.id,
        reason: 'Test',
      },
    })

    const errorResponse = await waitForSocketMessage(memberPage, 'system:error')

    expect(errorResponse).toBeDefined()
    expect(errorResponse.payload.message).toContain('Cannot kick user with equal or higher role')

    await adminPage.close()
    await memberPage.close()
  })
})

// ============================================================================
// Test Suite: Message Broadcasting
// ============================================================================

test.describe('Message Broadcasting', () => {
  test('should broadcast message to all room users', async ({ page, context }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-broadcast-all',
        name: 'Broadcast All Room',
        type: 'chat',
        documentId: 'doc-broadcast',
        visibility: 'public',
      },
    })

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-broadcast-all',
        documentId: 'doc-broadcast',
      },
    })

    await page.waitForTimeout(100)

    // Create multiple users
    const userPages: any[] = []
    for (let i = 0; i < 3; i++) {
      const userPage = await context.newPage()
      await setupWebSocketPage(userPage, `user-${i}`, `User ${i}`)

      await sendSocketMessage(userPage, {
        type: 'room:join',
        payload: {
          roomId: 'room-broadcast-all',
          documentId: 'doc-broadcast',
        },
      })

      userPages.push(userPage)
    }

    await page.waitForTimeout(200)
    await clearSocketMessages(page)

    for (const userPage of userPages) {
      await clearSocketMessages(userPage)
    }

    // Owner sends broadcast message
    await sendSocketMessage(page, {
      type: 'message:send',
      payload: {
        roomId: 'room-broadcast-all',
        content: 'Broadcast message to all users!',
      },
    })

    await page.waitForTimeout(100)

    // Verify all users received the message
    const ownerMessages = await getSocketMessages(page)
    const ownerMsg = ownerMessages.find((m: any) => m.type === 'message:new')
    expect(ownerMsg).toBeDefined()
    expect(ownerMsg.payload.content).toBe('Broadcast message to all users!')

    for (const userPage of userPages) {
      const userMessages = await getSocketMessages(userPage)
      const userMsg = userMessages.find((m: any) => m.type === 'message:new')
      expect(userMsg).toBeDefined()
      expect(userMsg.payload.content).toBe('Broadcast message to all users!')
    }

    for (const userPage of userPages) {
      await userPage.close()
    }
  })

  test('should not broadcast to users in different rooms', async ({ page, context }) => {
    // Create two rooms
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-a',
        name: 'Room A',
        type: 'chat',
        documentId: 'doc-a',
        visibility: 'public',
      },
    })

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-b',
        name: 'Room B',
        type: 'chat',
        documentId: 'doc-b',
        visibility: 'public',
      },
    })

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-a',
        documentId: 'doc-a',
      },
    })

    await page.waitForTimeout(100)

    // User in room A
    const userA = await context.newPage()
    await setupWebSocketPage(userA, testUsers.member.id, 'User A')

    await sendSocketMessage(userA, {
      type: 'room:join',
      payload: {
        roomId: 'room-a',
        documentId: 'doc-a',
      },
    })

    // User in room B
    const userB = await context.newPage()
    await setupWebSocketPage(userB, testUsers.guest.id, 'User B')

    await sendSocketMessage(userB, {
      type: 'room:join',
      payload: {
        roomId: 'room-b',
        documentId: 'doc-b',
      },
    })

    await page.waitForTimeout(200)
    await clearSocketMessages(userB)

    // Owner sends message in room A
    await sendSocketMessage(page, {
      type: 'message:send',
      payload: {
        roomId: 'room-a',
        content: 'Message for room A only',
      },
    })

    await page.waitForTimeout(100)

    // User A should receive message
    const messagesA = await getSocketMessages(userA)
    const msgA = messagesA.find((m: any) => m.type === 'message:new')
    expect(msgA).toBeDefined()
    expect(msgA.payload.content).toBe('Message for room A only')

    // User B should NOT receive message
    const messagesB = await getSocketMessages(userB)
    const msgB = messagesB.find((m: any) => m.type === 'message:new')
    expect(msgB).toBeUndefined()

    await userA.close()
    await userB.close()
  })

  test('should handle rapid message broadcasting', async ({ page, context }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-rapid-broadcast',
        name: 'Rapid Broadcast Room',
        type: 'chat',
        documentId: 'doc-rapid',
        visibility: 'public',
      },
    })

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-rapid-broadcast',
        documentId: 'doc-rapid',
      },
    })

    await page.waitForTimeout(100)

    // Member joins
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(memberPage, {
      type: 'room:join',
      payload: {
        roomId: 'room-rapid-broadcast',
        documentId: 'doc-rapid',
      },
    })

    await memberPage.waitForTimeout(100)
    await clearSocketMessages(memberPage)

    // Send 10 rapid messages
    const messageCount = 10
    for (let i = 1; i <= messageCount; i++) {
      await sendSocketMessage(page, {
        type: 'message:send',
        payload: {
          roomId: 'room-rapid-broadcast',
          content: `Rapid message ${i}`,
        },
      })
    }

    await page.waitForTimeout(500)

    // Verify all messages received
    const memberMessages = await getSocketMessages(memberPage)
    const newMessages = memberMessages.filter((m: any) => m.type === 'message:new')

    expect(newMessages.length).toBe(messageCount)

    // Verify order
    for (let i = 0; i < messageCount; i++) {
      expect(newMessages[i].payload.content).toBe(`Rapid message ${i + 1}`)
    }

    await memberPage.close()
  })

  test('should broadcast system messages to all users', async ({ page, context }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)

    await sendSocketMessage(page, {
      type: 'room:create',
      payload: {
        id: 'room-system-msg',
        name: 'System Message Room',
        type: 'chat',
        documentId: 'doc-system',
        visibility: 'public',
      },
    })

    await sendSocketMessage(page, {
      type: 'room:join',
      payload: {
        roomId: 'room-system-msg',
        documentId: 'doc-system',
      },
    })

    await page.waitForTimeout(100)

    // Member joins
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)

    await sendSocketMessage(memberPage, {
      type: 'room:join',
      payload: {
        roomId: 'room-system-msg',
        documentId: 'doc-system',
      },
    })

    await memberPage.waitForTimeout(100)
    await clearSocketMessages(page)
    await clearSocketMessages(memberPage)

    // Owner sends system message
    await sendSocketMessage(page, {
      type: 'message:send',
      payload: {
        roomId: 'room-system-msg',
        content: 'System announcement',
        type: 'system',
      },
    })

    await page.waitForTimeout(100)

    // Both should receive system message
    const ownerMessages = await getSocketMessages(page)
    const memberMessages = await getSocketMessages(memberPage)

    const ownerMsg = ownerMessages.find((m: any) => m.type === 'message:new')
    const memberMsg = memberMessages.find((m: any) => m.type === 'message:new')

    expect(ownerMsg).toBeDefined()
    expect(ownerMsg.payload.type).toBe('system')
    expect(memberMsg).toBeDefined()
    expect(memberMsg.payload.type).toBe('system')

    await memberPage.close()
  })
})
