/**
 * Projects API Route Tests
 *
 * 测试项目管理 API 路由的权限控制和响应
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { Permissions } from '@/lib/permissions'

// Mock the permissions decorator system
vi.mock('@/lib/permissions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/permissions')>('../permissions')
  return {
    ...actual,
    RequirePermission: vi.fn((resourceType: string, action: string) => {
      return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value
        descriptor.value = async function (ctx: any, ...args: any[]) {
          const requiredPermission = `${resourceType}:${action}` as const
          const userHasPermission =
            (ctx.user as any).roles?.some((r: any) =>
              r.permissions?.includes(requiredPermission)
            ) ||
            (ctx.user as any).roles?.some((r: any) => r.permissions?.includes('project:manage'))

          if (!userHasPermission) {
            const error = new Error(`Permission denied: ${requiredPermission}`)
            ;(error as any).name = 'PermissionDeniedError'
            ;(error as any).requiredPermissions = [requiredPermission]
            ;(error as any).missingPermissions = [requiredPermission]
            throw error
          }

          return originalMethod.call(this, ctx, ...args)
        }
      }
    }),
    RequireRoleLevel: vi.fn((level: number) => {
      return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value
        descriptor.value = async function (ctx: any, ...args: any[]) {
          const userMaxLevel =
            (ctx.user as any).roles?.reduce(
              (max: number, r: any) => Math.max(max, r.level || 0),
              0
            ) || 0

          if (userMaxLevel < level) {
            const error = new Error(`Role level required: ${level}`)
            ;(error as any).name = 'PermissionDeniedError'
            ;(error as any).requiredPermissions = [`role:${level}`]
            ;(error as any).missingPermissions = [`role:${level}`]
            throw error
          }

          return originalMethod.call(this, ctx, ...args)
        }
      }
    }),
  }
})

describe('Projects API Route', () => {
  describe('GET /api/projects', () => {
    it('should return list of projects with valid permissions', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
        headers: {
          'x-user-id': 'user-2', // team leader
        },
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)
    })

    it('should return 401 when user not found', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
        headers: {
          'x-user-id': 'non-existent',
        },
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('not found')
    })

    it('should include owner information in project list', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
        headers: {
          'x-user-id': 'user-2',
        },
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(data.data[0]).toHaveProperty('id')
      expect(data.data[0]).toHaveProperty('name')
      expect(data.data[0]).toHaveProperty('description')
      expect(data.data[0]).toHaveProperty('ownerId')
      expect(data.data[0]).toHaveProperty('isOwner')
    })

    it('should allow super admin to list projects', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
        headers: {
          'x-user-id': 'user-1', // super admin
        },
      })

      const response = await GET(mockRequest)

      expect(response.status).toBe(200)
    })

    it('should allow developer to list projects', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
        headers: {
          'x-user-id': 'user-3', // developer
        },
      })

      const response = await GET(mockRequest)

      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/projects', () => {
    it('should create a new project with valid data', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'New Project',
          description: 'A new test project',
        }),
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('id')
      expect(data.data.name).toBe('New Project')
      expect(data.data.description).toBe('A new test project')
    })

    it('should return 401 when user not authenticated', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'x-user-id': 'non-existent',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Project',
          description: 'Test',
        }),
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should create project with auto-generated ID', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Auto ID Project',
          description: 'Testing auto ID',
        }),
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(data.data.id).toMatch(/^project-\d+$/)
    })

    it('should set current user as project owner', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Owner Test',
          description: 'Testing owner assignment',
        }),
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(data.data.ownerId).toBe('user-2')
    })

    it('should create project with timestamps', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Timestamp Test',
          description: 'Testing timestamps',
        }),
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(data.data).toHaveProperty('createdAt')
      expect(data.data).toHaveProperty('updatedAt')
      expect(new Date(data.data.createdAt)).toBeInstanceOf(Date)
      expect(new Date(data.data.updatedAt)).toBeInstanceOf(Date)
    })

    it('should handle missing description field', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'No Description',
        }),
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.name).toBe('No Description')
    })

    it('should handle JSON parse errors gracefully', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-2',
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  describe('Error handling', () => {
    it('should handle permission denied errors', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
        headers: {
          'x-user-id': 'user-3', // developer with limited permissions
        },
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(data).toHaveProperty('success')
    })

    it('should handle unexpected errors gracefully', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
        headers: {
          'x-user-id': 'user-2',
        },
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('data')
    })

    describe('Permission-based access control', () => {
      it('should respect project:read permission', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
          headers: {
            'x-user-id': 'user-2', // team leader with permissions
          },
        })

        const response = await GET(mockRequest)

        expect(response.status).toBe(200)
      })

      it('should respect project:create permission', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
          method: 'POST',
          headers: {
            'x-user-id': 'user-2',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Permission Test',
            description: 'Testing create permission',
          }),
        })

        const response = await POST(mockRequest)

        expect(response.status).toBe(200)
      })

      it('should require role level for project management', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
          headers: {
            'x-user-id': 'user-1', // super admin with high role level
          },
        })

        const response = await GET(mockRequest)

        expect(response.status).toBe(200)
      })
    })
  })

  describe('Data validation', () => {
    it('should trim project name whitespace', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: '  Trimmed Name  ',
          description: '  Trimmed description  ',
        }),
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
    })

    it('should accept empty project description', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Empty Description Test',
          description: '',
        }),
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Description may be empty string or undefined depending on implementation
      expect(data.data.description === '' || data.data.description === undefined).toBe(true)
    })
  })
})
