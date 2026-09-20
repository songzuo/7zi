/**
 * Tenant Authentication Tests
 * 多租户认证测试套件
 * 覆盖率目标: >80%
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  TenantContextManager,
} from '../context'
import { generateTenantToken, verifyTenantToken } from '../middleware'
import type { TenantUserContext } from '../types'
import { TenantMemberRole, TenantPlan, TenantStatus } from '../../../tenant/types'

// Mock dependencies
vi.mock('../../../db', () => ({
  db: {
    get: vi.fn(),
    queryRows: vi.fn(),
    exec: vi.fn(),
  },
}))

vi.mock('../../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('../../../tenant/service', () => ({
  tenantService: {
    getTenant: vi.fn(),
    getTenantBySlug: vi.fn(),
    getTenantContext: vi.fn(),
    listUserTenants: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
  },
}))

vi.mock('../../../auth/repository', () => ({
  verifyPassword: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  createUserToken: vi.fn(),
  updateLastLogin: vi.fn(),
}))

describe('TenantContextManager', () => {
  const mockContext: TenantUserContext = {
    userId: 'user_123',
    email: 'test@example.com',
    role: TenantMemberRole.MEMBER,
    roles: [],
    permissions: ['perm_users_read', 'perm_users_write'],
    customPermissions: [],
    tenantId: 'tenant_123',
    tenantSlug: 'test-tenant',
    tenantPlan: TenantPlan.PROFESSIONAL,
    tenantStatus: TenantStatus.ACTIVE,
    tenantRole: TenantMemberRole.MEMBER,
    isOwner: false,
    isAdmin: false,
  }

  describe('run', () => {
    it('should run function within context', () => {
      const result = TenantContextManager.run(mockContext, () => {
        return 'test result'
      })
      expect(result).toBe('test result')
    })

    it('should run async function within context', async () => {
      const result = await TenantContextManager.runAsync(mockContext, async () => {
        return 'async result'
      })
      expect(result).toBe('async result')
    })
  })

  describe('getContext', () => {
    it('should return undefined when no context', () => {
      const context = TenantContextManager.getContext()
      expect(context).toBeUndefined()
    })

    it('should return context when inside run', () => {
      const result = TenantContextManager.run(mockContext, () => {
        return TenantContextManager.getContext()
      })
      expect(result).toEqual(mockContext)
    })
  })

  describe('getTenantId', () => {
    it('should return tenantId from context', () => {
      const result = TenantContextManager.run(mockContext, () => {
        return TenantContextManager.getTenantId()
      })
      expect(result).toBe('tenant_123')
    })

    it('should return undefined when no context', () => {
      const result = TenantContextManager.getTenantId()
      expect(result).toBeUndefined()
    })
  })

  describe('getUserId', () => {
    it('should return userId from context', () => {
      const result = TenantContextManager.run(mockContext, () => {
        return TenantContextManager.getUserId()
      })
      expect(result).toBe('user_123')
    })
  })

  describe('isOwner', () => {
    it('should return false for non-owner', () => {
      const result = TenantContextManager.run(mockContext, () => {
        return TenantContextManager.isOwner()
      })
      expect(result).toBe(false)
    })

    it('should return true for owner', () => {
      const ownerContext = { ...mockContext, isOwner: true }
      const result = TenantContextManager.run(ownerContext, () => {
        return TenantContextManager.isOwner()
      })
      expect(result).toBe(true)
    })
  })

  describe('isAdmin', () => {
    it('should return false for non-admin', () => {
      const result = TenantContextManager.run(mockContext, () => {
        return TenantContextManager.isAdmin()
      })
      expect(result).toBe(false)
    })

    it('should return true for admin', () => {
      const adminContext = { ...mockContext, isAdmin: true }
      const result = TenantContextManager.run(adminContext, () => {
        return TenantContextManager.isAdmin()
      })
      expect(result).toBe(true)
    })
  })

  describe('hasPermission', () => {
    it('should return true for existing permission', () => {
      const result = TenantContextManager.run(mockContext, () => {
        return TenantContextManager.hasPermission('perm_users_read')
      })
      expect(result).toBe(true)
    })

    it('should return false for non-existing permission', () => {
      const result = TenantContextManager.run(mockContext, () => {
        return TenantContextManager.hasPermission('perm_users_delete')
      })
      expect(result).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('should return true if has any permission', () => {
      const result = TenantContextManager.run(mockContext, () => {
        return TenantContextManager.hasAnyPermission(['perm_users_delete', 'perm_users_read'])
      })
      expect(result).toBe(true)
    })

    it('should return false if has no permission', () => {
      const result = TenantContextManager.run(mockContext, () => {
        return TenantContextManager.hasAnyPermission(['perm_users_delete', 'perm_users_execute'])
      })
      expect(result).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('should return true if has all permissions', () => {
      const result = TenantContextManager.run(mockContext, () => {
        return TenantContextManager.hasAllPermissions(['perm_users_read', 'perm_users_write'])
      })
      expect(result).toBe(true)
    })

    it('should return false if missing any permission', () => {
      const result = TenantContextManager.run(mockContext, () => {
        return TenantContextManager.hasAllPermissions(['perm_users_read', 'perm_users_delete'])
      })
      expect(result).toBe(false)
    })
  })

  describe('requirePermission', () => {
    it('should not throw for existing permission', () => {
      expect(() => {
        TenantContextManager.run(mockContext, () => {
          TenantContextManager.requirePermission('perm_users_read')
        })
      }).not.toThrow()
    })

    it('should throw for non-existing permission', () => {
      expect(() => {
        TenantContextManager.run(mockContext, () => {
          TenantContextManager.requirePermission('perm_users_delete')
        })
      }).toThrow('Permission denied: perm_users_delete')
    })
  })

  describe('requireAdmin', () => {
    it('should not throw for admin', () => {
      const adminContext = { ...mockContext, isAdmin: true }
      expect(() => {
        TenantContextManager.run(adminContext, () => {
          TenantContextManager.requireAdmin()
        })
      }).not.toThrow()
    })

    it('should throw for non-admin', () => {
      expect(() => {
        TenantContextManager.run(mockContext, () => {
          TenantContextManager.requireAdmin()
        })
      }).toThrow('Admin role required')
    })
  })

  describe('requireOwner', () => {
    it('should not throw for owner', () => {
      const ownerContext = { ...mockContext, isOwner: true }
      expect(() => {
        TenantContextManager.run(ownerContext, () => {
          TenantContextManager.requireOwner()
        })
      }).not.toThrow()
    })

    it('should throw for non-owner', () => {
      expect(() => {
        TenantContextManager.run(mockContext, () => {
          TenantContextManager.requireOwner()
        })
      }).toThrow('Owner role required')
    })
  })

  describe('createTenantUserContext', () => {
    it('should create context with correct properties', () => {
      const baseContext = {
        tenantId: 'tenant_123',
        tenantSlug: 'test-tenant',
        tenantPlan: TenantPlan.PROFESSIONAL,
        tenantStatus: TenantStatus.ACTIVE,
        userId: 'user_123',
        userRole: TenantMemberRole.ADMIN,
        permissions: ['perm_users_read'],
      }

      const result = TenantContextManager.createTenantUserContext(
        baseContext,
        'test@example.com',
        ['perm_users_read']
      )

      expect(result.userId).toBe('user_123')
      expect(result.email).toBe('test@example.com')
      expect(result.tenantId).toBe('tenant_123')
      expect(result.isAdmin).toBe(true)
      expect(result.isOwner).toBe(false)
    })

    it('should set isOwner true for owner role', () => {
      const baseContext = {
        tenantId: 'tenant_123',
        tenantSlug: 'test-tenant',
        tenantPlan: TenantPlan.PROFESSIONAL,
        tenantStatus: TenantStatus.ACTIVE,
        userId: 'user_123',
        userRole: TenantMemberRole.OWNER,
        permissions: [],
      }

      const result = TenantContextManager.createTenantUserContext(
        baseContext,
        'test@example.com',
        []
      )

      expect(result.isOwner).toBe(true)
      expect(result.isAdmin).toBe(true)
    })
  })

  describe('fromJwtPayload', () => {
    it('should create context from JWT payload', () => {
      const payload = {
        userId: 'user_456',
        email: 'payload@example.com',
        tenantId: 'tenant_456',
        tenantSlug: 'payload-tenant',
        tenantPlan: TenantPlan.ENTERPRISE,
        tenantRole: TenantMemberRole.OWNER,
        permissions: ['perm_agents_read'],
        roles: [],
        customPermissions: [],
      }

      const result = TenantContextManager.fromJwtPayload(payload as any)

      expect(result.userId).toBe('user_456')
      expect(result.tenantId).toBe('tenant_456')
      expect(result.isOwner).toBe(true)
      expect(result.isAdmin).toBe(true)
    })
  })
})

describe('Token Generation and Verification', () => {
  const mockContext: TenantUserContext = {
    userId: 'user_123',
    email: 'test@example.com',
    role: TenantMemberRole.MEMBER,
    roles: [],
    permissions: ['perm_users_read'],
    customPermissions: [],
    tenantId: 'tenant_123',
    tenantSlug: 'test-tenant',
    tenantPlan: TenantPlan.PROFESSIONAL,
    tenantStatus: TenantStatus.ACTIVE,
    tenantRole: TenantMemberRole.MEMBER,
    isOwner: false,
    isAdmin: false,
  }

  describe('generateTenantToken', () => {
    it('should generate a valid JWT token', async () => {
      // Set JWT_SECRET for testing
      process.env.JWT_SECRET = 'test-secret-key-for-testing'
      
      const token = await generateTenantToken(mockContext)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })

    it('should generate token with custom expiration', async () => {
      process.env.JWT_SECRET = 'test-secret-key-for-testing'
      
      const token = await generateTenantToken(mockContext, 7200)
      
      expect(token).toBeDefined()
    })
  })

  describe('verifyTenantToken', () => {
    it('should verify valid token', async () => {
      process.env.JWT_SECRET = 'test-secret-key-for-testing'
      
      const token = await generateTenantToken(mockContext)
      const result = await verifyTenantToken(token)
      
      expect(result).not.toBeNull()
      expect(result?.userId).toBe('user_123')
      expect(result?.tenantId).toBe('tenant_123')
    })

    it('should return null for invalid token', async () => {
      const result = await verifyTenantToken('invalid-token')
      expect(result).toBeNull()
    })

    it('should return null for malformed token', async () => {
      const result = await verifyTenantToken('header.payload.signature')
      expect(result).toBeNull()
    })
  })
})

describe('Type exports', () => {
  it('should export TenantUserContext type', () => {
    const context: TenantUserContext = {
      userId: 'test',
      email: 'test@example.com',
      role: TenantMemberRole.MEMBER,
      roles: [],
      permissions: [],
      customPermissions: [],
      tenantId: 'tenant',
      tenantSlug: 'test',
      tenantPlan: TenantPlan.PROFESSIONAL,
      tenantStatus: TenantStatus.ACTIVE,
      tenantRole: TenantMemberRole.MEMBER,
      isOwner: false,
      isAdmin: false,
    }
    expect(context).toBeDefined()
  })
})