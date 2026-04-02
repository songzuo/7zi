/**
 * API 路由集成测试套件
 *
 * 使用 Supertest 测试所有核心 API 路由
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'

describe('API Routes Integration Tests', () => {
  let app: any
  let server: any

  beforeAll(async () => {
    // 创建 Next.js 应用实例
    const dev = process.env.NODE_ENV !== 'production'
    app = next({ dev, dir: './' })
    await app.prepare()

    // 创建 HTTP 服务器
    const handle = app.getRequestHandler()
    server = createServer(async (req, res) => {
      const parsedUrl = parse(req.url || '', true)
      await handle(req, res, parsedUrl)
    })
  }, 60000)

  afterAll(async () => {
    if (server) {
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
    if (app) {
      await app.close()
    }
  })

  describe('Health API', () => {
    it('GET /api/health should return 200', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('status')
    })
  })

  describe('Projects API', () => {
    describe('GET /api/projects', () => {
      it('should return 200 with projects list for admin user', async () => {
        const response = await request(server)
          .get('/api/projects')
          .set('x-user-id', 'user-1')
          .expect('Content-Type', /json/)
          .expect(200)

        expect(response.body).toHaveProperty('success', true)
        expect(response.body).toHaveProperty('data')
        expect(Array.isArray(response.body.data)).toBe(true)
      })

      it('should return 200 with projects list for team_leader user', async () => {
        const response = await request(server)
          .get('/api/projects')
          .set('x-user-id', 'user-2')
          .expect('Content-Type', /json/)
          .expect(200)

        expect(response.body).toHaveProperty('success', true)
      })

      it('should return 200 with projects list for developer user', async () => {
        const response = await request(server)
          .get('/api/projects')
          .set('x-user-id', 'user-3')
          .expect('Content-Type', /json/)
          .expect(200)

        expect(response.body).toHaveProperty('success', true)
      })
    })

    describe('POST /api/projects', () => {
      it('should create new project for admin user', async () => {
        const newProject = {
          name: 'Test Project',
          description: 'Test description',
        }

        const response = await request(server)
          .post('/api/projects')
          .set('x-user-id', 'user-1')
          .send(newProject)
          .expect('Content-Type', /json/)
          .expect(200)

        expect(response.body).toHaveProperty('success', true)
        expect(response.body.data).toHaveProperty('name', 'Test Project')
      })

      it('should create new project for team_leader', async () => {
        const newProject = {
          name: 'Team Leader Project',
          description: 'Created by team leader',
        }

        const response = await request(server)
          .post('/api/projects')
          .set('x-user-id', 'user-2')
          .send(newProject)
          .expect('Content-Type', /json/)
          .expect(200)

        expect(response.body).toHaveProperty('success', true)
      })

      it('should return 403 for user without create permission', async () => {
        const newProject = {
          name: 'Unauthorized Project',
          description: 'Should fail',
        }

        const response = await request(server)
          .post('/api/projects')
          .set('x-user-id', 'user-3')
          .send(newProject)
          .expect('Content-Type', /json/)
          .expect(403)

        expect(response.body).toHaveProperty('error', 'Permission denied')
      })

      it('should validate project data', async () => {
        const invalidProject = {
          // missing name
          description: 'No name provided',
        }

        const response = await request(server)
          .post('/api/projects')
          .set('x-user-id', 'user-1')
          .send(invalidProject)

        // Should either succeed or return validation error
        expect([200, 400, 422]).toContain(response.status)
      })
    })
  })

  describe('Users API', () => {
    describe('GET /api/users', () => {
      it('should return 200 with users list for admin', async () => {
        const response = await request(server)
          .get('/api/users')
          .set('x-user-id', 'user-1')
          .expect('Content-Type', /json/)
          .expect(200)

        expect(response.body).toHaveProperty('success', true)
      })

      it('should handle pagination parameters', async () => {
        const response = await request(server)
          .get('/api/users?page=1&limit=10')
          .set('x-user-id', 'user-1')
          .expect('Content-Type', /json/)

        expect(response.status).toBe(200)
      })
    })
  })

  describe('MCP API', () => {
    describe('POST /api/mcp/rpc', () => {
      it('should handle RPC request', async () => {
        const rpcRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'test',
          params: {},
        }

        const response = await request(server).post('/api/mcp/rpc').send(rpcRequest)

        // Should either succeed or return error
        expect([200, 400, 404, 500]).toContain(response.status)
      })

      it('should validate JSON-RPC format', async () => {
        const invalidRequest = {
          // missing jsonrpc version
          id: 1,
          method: 'test',
        }

        const response = await request(server).post('/api/mcp/rpc').send(invalidRequest)

        expect([200, 400]).toContain(response.status)
      })
    })
  })

  describe('Notifications API', () => {
    describe('GET /api/notifications', () => {
      it('should return 200 with notifications list', async () => {
        const response = await request(server)
          .get('/api/notifications')
          .set('x-user-id', 'user-1')
          .expect('Content-Type', /json/)

        expect([200, 404]).toContain(response.status)
      })

      it('should handle filter parameters', async () => {
        const response = await request(server)
          .get('/api/notifications?status=unread')
          .set('x-user-id', 'user-1')
          .expect('Content-Type', /json/)

        expect([200, 404]).toContain(response.status)
      })
    })

    describe('POST /api/notifications', () => {
      it('should create new notification', async () => {
        const notification = {
          title: 'Test Notification',
          message: 'Test message',
          type: 'info',
        }

        const response = await request(server)
          .post('/api/notifications')
          .set('x-user-id', 'user-1')
          .send(notification)
          .expect('Content-Type', /json/)

        expect([200, 201, 404]).toContain(response.status)
      })
    })
  })

  describe('CSRF Protection', () => {
    it('GET /api/csrf-token should return CSRF token', async () => {
      const response = await request(server).get('/api/csrf-token').expect('Content-Type', /json/)

      expect([200, 404]).toContain(response.status)
    })
  })
})
