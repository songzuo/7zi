/**
 * WebSocket Permission System E2E Tests - v1.4.0
 *
 * 使用 Playwright 测试权限控制的完整端到端场景：
 * - 角色权限检查
 * - 权限升级/降级
 * - 封禁功能
 * - 权限过期
 */

import { test, expect } from '@playwright/test'

// ============================================================================
// Test Data
// ============================================================================

const testUsers = {
  owner: { id: 'user-owner', name: 'Room Owner', email: 'owner@7zi.com' },
  admin: { id: 'user-admin', name: 'Room Admin', email: 'admin@7zi.com' },
  moderator: { id: 'user-moderator', name: 'Room Moderator', email: 'moderator@7zi.com' },
  member: { id: 'user-member', name: 'Room Member', email: 'member@7zi.com' },
  guest: { id: 'user-guest', name: 'Room Guest', email: 'guest@7zi.com' },
}

const roles = ['owner', 'admin', 'moderator', 'member', 'guest'] as const

// Permissions by category
const roomPermissions = [
  'room:join',
  'room:leave',
  'room:manage',
  'room:view',
  'room:invite',
  'room:kick',
  'room:ban',
] as const

const messagePermissions = [
  'message:send',
  'message:edit',
  'message:delete',
  'message:react',
  'message:pin',
  'message:view_history',
] as const

const adminPermissions = [
  'admin:manage_users',
  'admin:manage_rooms',
  'admin:manage_permissions',
  'admin:ban_users',
  'admin:view_logs',
  'admin:system_announce',
] as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Setup WebSocket page for user
 */
async function setupWebSocketPage(page: any, userId: string, userName: string) {
  await page.goto('/test/websocket')

  await page.evaluate(
    ({ userId, userName }) => {
      return new Promise((resolve, reject) => {
        const socket = new WebSocket(`ws://localhost:3000/socket.io/?EIO=4&transport=websocket`)

        socket.onopen = () => {
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
              // Skip non-JSON
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

  await page.waitForTimeout(500)
  return page
}

/**
 * Create test room
 */
async function createTestRoom(page: any, roomId: string, ownerId: string) {
  await page.evaluate(roomId => {
    const socket = (window as any).testSocket
    socket.send(
      JSON.stringify({
        type: 'room:create',
        payload: {
          id: roomId,
          name: `Test Room ${roomId}`,
          type: 'chat',
          documentId: `doc-${roomId}`,
          visibility: 'public',
        },
      })
    )
  }, roomId)

  await page.waitForTimeout(100)
  return roomId
}

/**
 * Join room
 */
async function joinRoom(page: any, roomId: string, documentId?: string) {
  await page.evaluate(
    ({ roomId, documentId }) => {
      const socket = (window as any).testSocket
      socket.send(
        JSON.stringify({
          type: 'room:join',
          payload: { roomId, documentId: documentId || `doc-${roomId}` },
        })
      )
    },
    { roomId, documentId }
  )

  await page.waitForTimeout(100)
}

/**
 * Wait for message
 */
async function waitForSocketMessage(page: any, messageType: string, timeout = 5000) {
  return page.evaluate(
    ({ messageType, timeout }) => {
      return new Promise(resolve => {
        const messages = (window as any).testMessages

        const existing = messages.find((m: any) => m.type === messageType)
        if (existing) return resolve(existing)

        const socket = (window as any).testSocket
        const handler = (event: any) => {
          try {
            const message = JSON.parse(event.data)
            if (message.type === messageType) {
              socket.removeEventListener('message', handler)
              resolve(message)
            }
          } catch (e) {}
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
 * Get all messages
 */
async function getSocketMessages(page: any) {
  return page.evaluate(() => (window as any).testMessages || [])
}

/**
 * Clear messages
 */
async function clearSocketMessages(page: any) {
  return page.evaluate(() => {
    ;(window as any).testMessages = []
  })
}

/**
 * Send message
 */
async function sendSocketMessage(page: any, message: any) {
  return page.evaluate(message => {
    const socket = (window as any).testSocket
    socket.send(JSON.stringify(message))
  }, message)
}

/**
 * Check permission
 */
async function checkPermission(page: any, roomId: string, permission: string) {
  await sendSocketMessage(page, {
    type: 'permission:check',
    payload: { roomId, permission },
  })

  const response = await waitForSocketMessage(page, 'permission:result')
  return response?.payload?.hasPermission || false
}

// ============================================================================
// Test Suite: Role Permissions
// ============================================================================

test.describe('Role Permissions', () => {
  let roomId: string

  test.beforeEach(async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)
    roomId = await createTestRoom(page, 'perm-role-test', testUsers.owner.id)
    await joinRoom(page, roomId)
  })

  test('should have correct owner permissions', async ({ page }) => {
    await clearSocketMessages(page)

    // Owner should have all permissions
    const permissions = [...roomPermissions, ...messagePermissions, ...adminPermissions]

    for (const permission of permissions) {
      const hasPermission = await checkPermission(page, roomId, permission)
      expect(hasPermission).toBe(true)
    }
  })

  test('should have correct admin permissions', async ({ page, context }) => {
    // Create admin user
    const adminPage = await context.newPage()
    await setupWebSocketPage(adminPage, testUsers.admin.id, testUsers.admin.name)
    await joinRoom(adminPage, roomId)

    await clearSocketMessages(adminPage)

    // Admin should have most permissions except some admin-level
    const expectedPermissions = [
      ...roomPermissions.filter(p => p !== 'room:manage'), // Admin cannot manage room
      ...messagePermissions,
      ...adminPermissions.filter(
        p => p !== 'admin:manage_permissions' // Admin cannot manage permissions
      ),
    ]

    for (const permission of expectedPermissions) {
      const hasPermission = await checkPermission(adminPage, roomId, permission)
      expect(hasPermission).toBe(true)
    }

    await adminPage.close()
  })

  test('should have correct moderator permissions', async ({ page, context }) => {
    const moderatorPage = await context.newPage()
    await setupWebSocketPage(moderatorPage, testUsers.moderator.id, testUsers.moderator.name)
    await joinRoom(moderatorPage, roomId)

    await clearSocketMessages(moderatorPage)

    // Moderator should have room permissions except manage, all message permissions
    const expectedPermissions = [
      'room:join',
      'room:leave',
      'room:view',
      'room:invite',
      'room:kick',
      ...messagePermissions,
    ]

    const deniedPermissions = ['room:manage', 'room:ban', ...adminPermissions]

    for (const permission of expectedPermissions) {
      const hasPermission = await checkPermission(moderatorPage, roomId, permission)
      expect(hasPermission).toBe(true)
    }

    for (const permission of deniedPermissions) {
      const hasPermission = await checkPermission(moderatorPage, roomId, permission)
      expect(hasPermission).toBe(false)
    }

    await moderatorPage.close()
  })

  test('should have correct member permissions', async ({ page, context }) => {
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    await clearSocketMessages(memberPage)

    // Member should have basic room and message permissions
    const expectedPermissions = [
      'room:join',
      'room:leave',
      'room:view',
      'room:invite',
      'message:send',
      'message:edit',
      'message:react',
      'message:view_history',
    ]

    const deniedPermissions = [
      'room:manage',
      'room:kick',
      'room:ban',
      'message:delete',
      'message:pin',
      ...adminPermissions,
    ]

    for (const permission of expectedPermissions) {
      const hasPermission = await checkPermission(memberPage, roomId, permission)
      expect(hasPermission).toBe(true)
    }

    for (const permission of deniedPermissions) {
      const hasPermission = await checkPermission(memberPage, roomId, permission)
      expect(hasPermission).toBe(false)
    }

    await memberPage.close()
  })

  test('should have correct guest permissions', async ({ page, context }) => {
    const guestPage = await context.newPage()
    await setupWebSocketPage(guestPage, testUsers.guest.id, testUsers.guest.name)
    await joinRoom(guestPage, roomId)

    await clearSocketMessages(guestPage)

    // Guest should have minimal permissions
    const expectedPermissions = [
      'room:join',
      'room:leave',
      'room:view',
      'message:send',
      'message:react',
    ]

    const deniedPermissions = [
      'room:manage',
      'room:invite',
      'room:kick',
      'room:ban',
      'message:edit',
      'message:delete',
      'message:pin',
      'message:view_history',
      ...adminPermissions,
    ]

    for (const permission of expectedPermissions) {
      const hasPermission = await checkPermission(guestPage, roomId, permission)
      expect(hasPermission).toBe(true)
    }

    for (const permission of deniedPermissions) {
      const hasPermission = await checkPermission(guestPage, roomId, permission)
      expect(hasPermission).toBe(false)
    }

    await guestPage.close()
  })
})

// ============================================================================
// Test Suite: Permission Upgrade/Downgrade
// ============================================================================

test.describe('Permission Upgrade/Downgrade', () => {
  let roomId: string

  test.beforeEach(async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)
    roomId = await createTestRoom(page, 'perm-upgrade-test', testUsers.owner.id)
    await joinRoom(page, roomId)
  })

  test('should upgrade member to moderator', async ({ page, context }) => {
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    // Member initially cannot kick
    const canKickBefore = await checkPermission(memberPage, roomId, 'room:kick')
    expect(canKickBefore).toBe(false)

    // Owner upgrades member to moderator
    await sendSocketMessage(page, {
      type: 'room:change_role',
      payload: {
        roomId,
        userId: testUsers.member.id,
        newRole: 'moderator',
      },
    })

    await page.waitForTimeout(100)

    // Wait for role change notification
    const roleChanged = await waitForSocketMessage(memberPage, 'room:role_changed')
    expect(roleChanged).toBeDefined()
    expect(roleChanged.payload.newRole).toBe('moderator')

    // Member can now kick
    const canKickAfter = await checkPermission(memberPage, roomId, 'room:kick')
    expect(canKickAfter).toBe(true)

    await memberPage.close()
  })

  test('should downgrade admin to member', async ({ page, context }) => {
    // Create admin user
    const adminPage = await context.newPage()
    await setupWebSocketPage(adminPage, testUsers.admin.id, testUsers.admin.name)
    await joinRoom(adminPage, roomId)

    // Owner makes admin
    await sendSocketMessage(page, {
      type: 'room:change_role',
      payload: {
        roomId,
        userId: testUsers.admin.id,
        newRole: 'admin',
      },
    })

    await page.waitForTimeout(100)

    // Admin can manage users
    const canManageBefore = await checkPermission(adminPage, roomId, 'admin:manage_users')
    expect(canManageBefore).toBe(true)

    // Owner downgrades admin to member
    await sendSocketMessage(page, {
      type: 'room:change_role',
      payload: {
        roomId,
        userId: testUsers.admin.id,
        newRole: 'member',
      },
    })

    await page.waitForTimeout(100)

    const roleChanged = await waitForSocketMessage(adminPage, 'room:role_changed')
    expect(roleChanged?.payload?.newRole).toBe('member')

    // Admin can no longer manage users
    const canManageAfter = await checkPermission(adminPage, roomId, 'admin:manage_users')
    expect(canManageAfter).toBe(false)

    await adminPage.close()
  })

  test('should require manage permission to change roles', async ({ page, context }) => {
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    const guestPage = await context.newPage()
    await setupWebSocketPage(guestPage, testUsers.guest.id, testUsers.guest.name)
    await joinRoom(guestPage, roomId)

    await clearSocketMessages(guestPage)

    // Guest tries to change member's role (should fail)
    await sendSocketMessage(guestPage, {
      type: 'room:change_role',
      payload: {
        roomId,
        userId: testUsers.member.id,
        newRole: 'moderator',
      },
    })

    const errorResponse = await waitForSocketMessage(guestPage, 'system:error')
    expect(errorResponse).toBeDefined()
    expect(errorResponse.payload.message).toContain('No permission')

    await memberPage.close()
    await guestPage.close()
  })

  test('should prevent upgrading to higher role', async ({ page, context }) => {
    const adminPage = await context.newPage()
    await setupWebSocketPage(adminPage, testUsers.admin.id, testUsers.admin.name)
    await joinRoom(adminPage, roomId)

    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    await clearSocketMessages(memberPage)

    // Member tries to upgrade admin to owner (should fail)
    await sendSocketMessage(memberPage, {
      type: 'room:change_role',
      payload: {
        roomId,
        userId: testUsers.admin.id,
        newRole: 'owner',
      },
    })

    const errorResponse = await waitForSocketMessage(memberPage, 'system:error')
    expect(errorResponse).toBeDefined()
    expect(errorResponse.payload.message).toContain('Cannot change role')

    await adminPage.close()
    await memberPage.close()
  })
})

// ============================================================================
// Test Suite: Ban Functionality
// ============================================================================

test.describe('Ban Functionality', () => {
  let roomId: string

  test.beforeEach(async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)
    roomId = await createTestRoom(page, 'perm-ban-test', testUsers.owner.id)
    await joinRoom(page, roomId)
  })

  test('should ban user and revoke all permissions', async ({ page, context }) => {
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    // Member has permissions before ban
    const canJoinBefore = await checkPermission(memberPage, roomId, 'room:join')
    expect(canJoinBefore).toBe(true)

    // Owner bans member
    await sendSocketMessage(page, {
      type: 'room:ban',
      payload: {
        roomId,
        userId: testUsers.member.id,
        reason: 'Test ban',
      },
    })

    await page.waitForTimeout(100)

    // Member receives ban notification
    const banNotification = await waitForSocketMessage(memberPage, 'room:banned')
    expect(banNotification).toBeDefined()
    expect(banNotification.payload.roomId).toBe(roomId)
    expect(banNotification.payload.reason).toBe('Test ban')

    // Member no longer has permissions
    const canJoinAfter = await checkPermission(memberPage, roomId, 'room:join')
    expect(canJoinAfter).toBe(false)

    await memberPage.close()
  })

  test('should unban user and restore basic access', async ({ page, context }) => {
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    // Ban user
    await sendSocketMessage(page, {
      type: 'room:ban',
      payload: {
        roomId,
        userId: testUsers.member.id,
        reason: 'Test ban',
      },
    })

    await page.waitForTimeout(100)

    // Verify banned
    const isBannedBefore = await checkPermission(memberPage, roomId, 'room:join')
    expect(isBannedBefore).toBe(false)

    // Unban user
    await sendSocketMessage(page, {
      type: 'room:unban',
      payload: {
        roomId,
        userId: testUsers.member.id,
      },
    })

    await page.waitForTimeout(100)

    // User should have basic access again
    const canJoinAfter = await checkPermission(memberPage, roomId, 'room:join')
    expect(canJoinAfter).toBe(true)

    await memberPage.close()
  })

  test('should require ban permission to ban users', async ({ page, context }) => {
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    const guestPage = await context.newPage()
    await setupWebSocketPage(guestPage, testUsers.guest.id, testUsers.guest.name)
    await joinRoom(guestPage, roomId)

    await clearSocketMessages(guestPage)

    // Guest tries to ban member (should fail)
    await sendSocketMessage(guestPage, {
      type: 'room:ban',
      payload: {
        roomId,
        userId: testUsers.member.id,
        reason: 'Unauthorized ban',
      },
    })

    const errorResponse = await waitForSocketMessage(guestPage, 'system:error')
    expect(errorResponse).toBeDefined()
    expect(errorResponse.payload.message).toContain('No permission')

    await memberPage.close()
    await guestPage.close()
  })

  test('should prevent banning users with equal or higher role', async ({ page, context }) => {
    const adminPage = await context.newPage()
    await setupWebSocketPage(adminPage, testUsers.admin.id, testUsers.admin.name)

    // Owner makes admin
    await sendSocketMessage(page, {
      type: 'room:change_role',
      payload: {
        roomId,
        userId: testUsers.admin.id,
        newRole: 'admin',
      },
    })

    await joinRoom(adminPage, roomId)

    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    await clearSocketMessages(memberPage)

    // Member tries to ban admin (should fail)
    await sendSocketMessage(memberPage, {
      type: 'room:ban',
      payload: {
        roomId,
        userId: testUsers.admin.id,
        reason: 'Cannot ban admin',
      },
    })

    const errorResponse = await waitForSocketMessage(memberPage, 'system:error')
    expect(errorResponse).toBeDefined()
    expect(errorResponse.payload.message).toContain('Cannot ban')

    await adminPage.close()
    await memberPage.close()
  })

  test('should prevent banned user from joining', async ({ page, context }) => {
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    // Ban user
    await sendSocketMessage(page, {
      type: 'room:ban',
      payload: {
        roomId,
        userId: testUsers.member.id,
        reason: 'Prevent join test',
      },
    })

    await page.waitForTimeout(100)

    // User leaves and tries to rejoin
    await sendSocketMessage(memberPage, {
      type: 'room:leave',
      payload: { roomId },
    })

    await page.waitForTimeout(100)

    await sendSocketMessage(memberPage, {
      type: 'room:join',
      payload: { roomId, documentId: `doc-${roomId}` },
    })

    const errorResponse = await waitForSocketMessage(memberPage, 'system:error')
    expect(errorResponse).toBeDefined()
    expect(errorResponse.payload.message).toContain('banned')

    await memberPage.close()
  })
})

// ============================================================================
// Test Suite: Permission Expiration
// ============================================================================

test.describe('Permission Expiration', () => {
  let roomId: string

  test.beforeEach(async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)
    roomId = await createTestRoom(page, 'perm-expire-test', testUsers.owner.id)
    await joinRoom(page, roomId)
  })

  test('should expire temporary permission', async ({ page, context }) => {
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    // Member initially cannot manage room
    const canManageBefore = await checkPermission(memberPage, roomId, 'room:manage')
    expect(canManageBefore).toBe(false)

    // Grant temporary permission (expires in 100ms)
    await sendSocketMessage(page, {
      type: 'permission:grant',
      payload: {
        roomId,
        userId: testUsers.member.id,
        permission: 'room:manage',
        expiresAt: new Date(Date.now() + 100).toISOString(),
      },
    })

    await page.waitForTimeout(50)

    // Permission should be active
    const canManageDuring = await checkPermission(memberPage, roomId, 'room:manage')
    expect(canManageDuring).toBe(true)

    // Wait for expiration
    await page.waitForTimeout(100)

    // Permission should be expired
    const canManageAfter = await checkPermission(memberPage, roomId, 'room:manage')
    expect(canManageAfter).toBe(false)

    await memberPage.close()
  })

  test('should support renewing expired permissions', async ({ page, context }) => {
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    // Grant temporary permission (expires in 50ms)
    await sendSocketMessage(page, {
      type: 'permission:grant',
      payload: {
        roomId,
        userId: testUsers.member.id,
        permission: 'message:delete',
        expiresAt: new Date(Date.now() + 50).toISOString(),
      },
    })

    await page.waitForTimeout(30)

    const canDeleteBefore = await checkPermission(memberPage, roomId, 'message:delete')
    expect(canDeleteBefore).toBe(true)

    // Wait for expiration
    await page.waitForTimeout(50)

    const canDeleteExpired = await checkPermission(memberPage, roomId, 'message:delete')
    expect(canDeleteExpired).toBe(false)

    // Renew permission (longer duration)
    await sendSocketMessage(page, {
      type: 'permission:grant',
      payload: {
        roomId,
        userId: testUsers.member.id,
        permission: 'message:delete',
        expiresAt: new Date(Date.now() + 5000).toISOString(),
      },
    })

    await page.waitForTimeout(50)

    const canDeleteRenewed = await checkPermission(memberPage, roomId, 'message:delete')
    expect(canDeleteRenewed).toBe(true)

    await memberPage.close()
  })

  test('should handle multiple expiring permissions', async ({ page, context }) => {
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    // Grant multiple temporary permissions with different expiration times
    await sendSocketMessage(page, {
      type: 'permission:grant',
      payload: {
        roomId,
        userId: testUsers.member.id,
        permission: 'room:kick',
        expiresAt: new Date(Date.now() + 200).toISOString(),
      },
    })

    await sendSocketMessage(page, {
      type: 'permission:grant',
      payload: {
        roomId,
        userId: testUsers.member.id,
        permission: 'message:delete',
        expiresAt: new Date(Date.now() + 100).toISOString(),
      },
    })

    await page.waitForTimeout(50)

    // Both permissions should be active
    let canKick = await checkPermission(memberPage, roomId, 'room:kick')
    let canDelete = await checkPermission(memberPage, roomId, 'message:delete')
    expect(canKick).toBe(true)
    expect(canDelete).toBe(true)

    // Wait for first expiration (message:delete)
    await page.waitForTimeout(100)

    canKick = await checkPermission(memberPage, roomId, 'room:kick')
    canDelete = await checkPermission(memberPage, roomId, 'message:delete')
    expect(canKick).toBe(true) // Still active
    expect(canDelete).toBe(false) // Expired

    // Wait for second expiration (room:kick)
    await page.waitForTimeout(150)

    canKick = await checkPermission(memberPage, roomId, 'room:kick')
    expect(canKick).toBe(false) // Expired

    await memberPage.close()
  })
})

// ============================================================================
// Test Suite: Permission Queries
// ============================================================================

test.describe('Permission Queries', () => {
  let roomId: string

  test.beforeEach(async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)
    roomId = await createTestRoom(page, 'perm-query-test', testUsers.owner.id)
    await joinRoom(page, roomId)
  })

  test('should get all permissions for user', async ({ page, context }) => {
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    await sendSocketMessage(memberPage, {
      type: 'permission:get_all',
      payload: { roomId },
    })

    const response = await waitForSocketMessage(memberPage, 'permission:all')
    expect(response).toBeDefined()
    expect(response.payload.permissions).toBeInstanceOf(Array)
    expect(response.payload.permissions.length).toBeGreaterThan(0)

    await memberPage.close()
  })

  test('should get user role in room', async ({ page, context }) => {
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    await sendSocketMessage(memberPage, {
      type: 'permission:get_role',
      payload: { roomId },
    })

    const response = await waitForSocketMessage(memberPage, 'permission:role')
    expect(response).toBeDefined()
    expect(response.payload.role).toBe('member')

    await memberPage.close()
  })

  test('should check multiple permissions at once', async ({ page, context }) => {
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    const permissionsToCheck = ['room:join', 'room:manage', 'message:send', 'message:delete']

    await sendSocketMessage(memberPage, {
      type: 'permission:check_multiple',
      payload: { roomId, permissions: permissionsToCheck },
    })

    const response = await waitForSocketMessage(memberPage, 'permission:results')
    expect(response).toBeDefined()
    expect(response.payload.results).toBeDefined()

    const results = response.payload.results
    expect(results['room:join']).toBe(true)
    expect(results['room:manage']).toBe(false)
    expect(results['message:send']).toBe(true)
    expect(results['message:delete']).toBe(false)

    await memberPage.close()
  })
})

// ============================================================================
// Test Suite: Permission Edge Cases
// ============================================================================

test.describe('Permission Edge Cases', () => {
  let roomId: string

  test.beforeEach(async ({ page }) => {
    await setupWebSocketPage(page, testUsers.owner.id, testUsers.owner.name)
    roomId = await createTestRoom(page, 'perm-edge-test', testUsers.owner.id)
    await joinRoom(page, roomId)
  })

  test('should handle permission checks for non-existent room', async ({ page }) => {
    await sendSocketMessage(page, {
      type: 'permission:check',
      payload: { roomId: 'nonexistent-room', permission: 'room:join' },
    })

    const response = await waitForSocketMessage(page, 'permission:result')
    expect(response).toBeDefined()
    // Default to guest permissions for unknown rooms
    expect(response.payload.hasPermission).toBe(true) // guest can join
  })

  test('should handle invalid permission names', async ({ page, context }) => {
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    await sendSocketMessage(memberPage, {
      type: 'permission:check',
      payload: { roomId, permission: 'invalid:permission' },
    })

    const response = await waitForSocketMessage(memberPage, 'permission:result')
    expect(response).toBeDefined()
    expect(response.payload.hasPermission).toBe(false)

    await memberPage.close()
  })

  test('should handle empty room ID', async ({ page }) => {
    await sendSocketMessage(page, {
      type: 'permission:check',
      payload: { roomId: '', permission: 'room:join' },
    })

    const response = await waitForSocketMessage(page, 'permission:result')
    expect(response).toBeDefined()
    expect(response.payload.hasPermission).toBe(true) // guest permissions
  })

  test('should handle concurrent permission checks', async ({ page, context }) => {
    const memberPage = await context.newPage()
    await setupWebSocketPage(memberPage, testUsers.member.id, testUsers.member.name)
    await joinRoom(memberPage, roomId)

    // Send multiple permission checks concurrently
    const checks = [
      checkPermission(memberPage, roomId, 'room:join'),
      checkPermission(memberPage, roomId, 'room:manage'),
      checkPermission(memberPage, roomId, 'message:send'),
      checkPermission(memberPage, roomId, 'message:delete'),
      checkPermission(memberPage, roomId, 'admin:manage_users'),
    ]

    const results = await Promise.all(checks)

    expect(results[0]).toBe(true) // room:join
    expect(results[1]).toBe(false) // room:manage
    expect(results[2]).toBe(true) // message:send
    expect(results[3]).toBe(false) // message:delete
    expect(results[4]).toBe(false) // admin:manage_users

    await memberPage.close()
  })
})
