/**
 * @fileoverview MSW setup for API integration tests
 * @description Configures Mock Service Worker for Next.js API route testing
 */

import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { MockDataGenerator } from './data'

export const mockData = new MockDataGenerator()

// Auth endpoints handlers
export const authHandlers = [
  // Register
  http.post(
    'http://localhost:3000/api/auth/register',
    async ({ request }: { request: Request }) => {
      const body = (await request.json()) as any

      // Validation
      if (!body.email || !body.password || !body.name) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'Email, password, and name are required',
            },
          },
          { status: 400 }
        )
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email)) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'Invalid email format',
            },
          },
          { status: 400 }
        )
      }

      if (body.password.length < 8) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'WEAK_PASSWORD',
              message: 'Password must be at least 8 characters',
            },
          },
          { status: 400 }
        )
      }

      if (!/[A-Z]/.test(body.password)) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'WEAK_PASSWORD',
              message: 'Password must contain uppercase letters',
            },
          },
          { status: 400 }
        )
      }

      if (!/[a-z]/.test(body.password)) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'WEAK_PASSWORD',
              message: 'Password must contain lowercase letters',
            },
          },
          { status: 400 }
        )
      }

      if (!/[0-9]/.test(body.password)) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'WEAK_PASSWORD',
              message: 'Password must contain numbers',
            },
          },
          { status: 400 }
        )
      }

      // Check for duplicate email
      const existingUser = mockData.findUserByEmail(body.email)
      if (existingUser) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'REGISTRATION_FAILED',
              message: 'Email already exists',
            },
          },
          { status: 400 }
        )
      }

      // Create user
      const user = mockData.createUser({
        email: body.email,
        password: body.password,
        name: body.name,
      })

      return HttpResponse.json(
        {
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              status: user.status,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            },
          },
        },
        { status: 201 }
      )
    }
  ),

  // Login
  http.post('http://localhost:3000/api/auth/login', async ({ request }: { request: Request }) => {
    const body = (await request.json()) as any

    if (!body.email || !body.password) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Email and password are required',
          },
        },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid email format',
          },
        },
        { status: 400 }
      )
    }

    // Find user and verify password
    const user = mockData.findUserByEmail(body.email)
    if (!user || user.password !== body.password) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          },
        },
        { status: 401 }
      )
    }

    const token = mockData.generateToken(user.id)
    const refreshToken = mockData.generateRefreshToken(user.id)

    return HttpResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          token,
          refreshToken,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          'Set-Cookie': [
            `auth_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/`,
            `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/`,
          ].join(', '),
        },
      }
    )
  }),

  // Logout
  http.post('http://localhost:3000/api/auth/logout', async ({ request }: { request: Request }) => {
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Unauthorized',
          },
        },
        { status: 401 }
      )
    }

    if (!authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Unauthorized',
          },
        },
        { status: 401 }
      )
    }

    // In a real app, we'd invalidate the token here
    return HttpResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  }),

  // Get current user (me)
  http.get('http://localhost:3000/api/auth/me', async ({ request }: { request: Request }) => {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Unauthorized',
          },
        },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const userId = mockData.getUserIdFromToken(token)

    if (!userId) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Unauthorized',
          },
        },
        { status: 401 }
      )
    }

    const user = mockData.getUserById(userId)
    if (!user) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      )
    }

    return HttpResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      { status: 200 }
    )
  }),

  // Refresh token
  http.post('http://localhost:3000/api/auth/refresh', async ({ request }: { request: Request }) => {
    const body = (await request.json()) as any

    if (!body.refreshToken) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Refresh token is required',
          },
        },
        { status: 400 }
      )
    }

    if (body.refreshToken.length < 10) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid refresh token format',
          },
        },
        { status: 400 }
      )
    }

    const userId = mockData.getUserIdFromRefreshToken(body.refreshToken)
    if (!userId) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Invalid refresh token',
          },
        },
        { status: 401 }
      )
    }

    const user = mockData.getUserById(userId)
    if (!user) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Invalid refresh token',
          },
        },
        { status: 401 }
      )
    }

    const newToken = mockData.generateToken(userId)
    const newRefreshToken = mockData.generateRefreshToken(userId)

    return HttpResponse.json(
      {
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          'Set-Cookie': [
            `auth_token=${newToken}; HttpOnly; Secure; SameSite=Lax; Path=/`,
            `refresh_token=${newRefreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/`,
          ].join(', '),
        },
      }
    )
  }),
]

// Agent endpoints handlers
export const agentHandlers = [
  // POST /api/agents/register - Register a new agent
  http.post('http://localhost:3000/api/agents/register', async ({ request }: { request: Request }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { type: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = (await request.json()) as any

    // Validation
    if (!body.name) {
      return HttpResponse.json(
        { success: false, error: { type: 'VALIDATION_ERROR', message: 'Agent name is required' } },
        { status: 400 }
      )
    }

    if (!body.type) {
      return HttpResponse.json(
        { success: false, error: { type: 'VALIDATION_ERROR', message: 'Agent type is required' } },
        { status: 400 }
      )
    }

    const validTypes = ['assistant', 'scheduler', 'executor', 'custom']
    if (!validTypes.includes(body.type)) {
      return HttpResponse.json(
        { success: false, error: { type: 'VALIDATION_ERROR', message: 'Invalid agent type' } },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const existing = mockData.findAgentByName(body.name)
    if (existing) {
      return HttpResponse.json(
        { success: false, error: { type: 'DUPLICATE_AGENT', message: 'Agent with this name already exists' } },
        { status: 400 }
      )
    }

    const token = authHeader.substring(7)
    const userId = mockData.getUserIdFromToken(token)
    if (!userId) {
      return HttpResponse.json(
        { success: false, error: { type: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      )
    }

    const agent = mockData.createAgent({
      ownerId: userId,
      name: body.name,
      type: body.type,
      capabilities: body.capabilities || [],
      endpoint: body.endpoint,
      metadata: body.metadata,
    })

    return HttpResponse.json(
      {
        success: true,
        data: { agent },
      },
      { status: 201 }
    )
  }),

  // GET /api/agents/:id - Get agent info
  http.get('http://localhost:3000/api/agents/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        agent: {
          id: params.id,
          name: 'Mock Agent',
          type: 'assistant',
          status: 'online',
          capabilities: ['chat', 'task-execution'],
          registeredAt: new Date().toISOString(),
        },
      },
    })
  }),

  // DELETE /api/agents/:id - Unregister agent
  http.delete('http://localhost:3000/api/agents/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: { unregistered: true },
    })
  }),

  // GET /api/agents/discover - Discover agents
  http.get('http://localhost:3000/api/agents/discover', () => {
    return HttpResponse.json({
      success: true,
      data: {
        agents: [
          {
            id: 'agent-1',
            name: 'Assistant Agent',
            type: 'assistant',
            status: 'online',
            capabilities: ['chat', 'task-execution'],
          },
          {
            id: 'agent-2',
            name: 'Scheduler Agent',
            type: 'scheduler',
            status: 'online',
            capabilities: ['scheduling', 'task-management'],
          },
        ],
      },
    })
  }),

  // POST /api/agents/heartbeat - Send heartbeat
  http.post('http://localhost:3000/api/agents/heartbeat', async ({ request }: { request: Request }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { type: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = (await request.json()) as any

    if (!body.agentId) {
      return HttpResponse.json(
        { success: false, error: { type: 'VALIDATION_ERROR', message: 'agentId is required' } },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: { received: true, timestamp: new Date().toISOString() },
    })
  }),
]

// Capsule endpoints handlers
export const capsuleHandlers = [
  // POST /api/capsules - Create capsule
  http.post('http://localhost:3000/api/capsules', async ({ request }: { request: Request }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { type: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = (await request.json()) as any

    if (!body.name) {
      return HttpResponse.json(
        { success: false, error: { type: 'VALIDATION_ERROR', message: 'Capsule name is required' } },
        { status: 400 }
      )
    }

    const token = authHeader.substring(7)
    const userId = mockData.getUserIdFromToken(token)
    if (!userId) {
      return HttpResponse.json(
        { success: false, error: { type: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      )
    }

    const capsule = mockData.createCapsule({
      ownerId: userId,
      name: body.name,
      description: body.description || '',
      type: body.type || 'workflow',
      genes: body.genes || [],
    })

    return HttpResponse.json(
      {
        success: true,
        data: { capsule },
      },
      { status: 201 }
    )
  }),

  // GET /api/capsules - List capsules
  http.get('http://localhost:3000/api/capsules', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    let capsules = mockData.getAllCapsules()
    if (status) {
      capsules = capsules.filter(c => c.status === status)
    }

    return HttpResponse.json({
      success: true,
      data: { capsules },
    })
  }),

  // GET /api/capsules/:id - Get capsule
  http.get('http://localhost:3000/api/capsules/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        capsule: {
          id: params.id,
          name: 'Mock Capsule',
          description: 'Mock capsule description',
          type: 'workflow',
          genes: ['gene-1', 'gene-2'],
          status: 'published',
          createdAt: new Date().toISOString(),
        },
      },
    })
  }),
]

// Health endpoints handlers
export const healthHandlers = [
  // Database health check
  http.get('http://localhost:3000/api/database/health', () => {
    const memoryUsage = process.memoryUsage()
    const now = new Date()
    
    // Simulate cache stats
    const cacheHits = Math.floor(Math.random() * 1000)
    const cacheMisses = Math.floor(Math.random() * 200)
    const hitRate = cacheHits / (cacheHits + cacheMisses)

    return HttpResponse.json(
      {
        success: true,
        data: {
          health: 'healthy',
          healthScore: 85 + Math.floor(Math.random() * 10),
          connection: {
            connected: true,
            isOpen: true,
            isMemoryDatabase: false,
            connectionCount: 1,
          },
          database: {
            size: {
              pageCount: 100,
              freePages: 5,
            },
            migrations: {
              current: 10,
              latest: 10,
              needsMigration: false,
            },
          },
          performance: {
            slowQueries: Math.floor(Math.random() * 3),
            missingIndexes: Math.floor(Math.random() * 2),
            databaseSize: {
              sizeInMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            },
          },
          cache: {
            hits: cacheHits,
            misses: cacheMisses,
            hitRate,
            entries: Math.floor(Math.random() * 100),
            totalSize: Math.floor(Math.random() * 1024 * 1024),
            evictions: Math.floor(Math.random() * 10),
            hitRatePercent: Number((hitRate * 100).toFixed(2)),
            totalSizeMB: Number((cacheMisses * 1024 / 1024 / 1024).toFixed(2)),
            status: hitRate > 0.7 ? 'good' : hitRate > 0.5 ? 'fair' : 'poor',
          },
          recommendations: hitRate < 0.7 
            ? ['缓存命中率较低，建议调整缓存策略或TTL']
            : [],
          details: {
            tables: [
              {
                name: 'users',
                rowCount: 10,
                indexCount: 3,
                hasSuggestions: false,
              },
              {
                name: 'tasks',
                rowCount: 25,
                indexCount: 4,
                hasSuggestions: false,
              },
            ],
          },
        },
      },
      { status: 200 }
    )
  }),

  // Health check
  http.get('http://localhost:3000/api/health', () => {
    const memoryUsage = process.memoryUsage()
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)

    return HttpResponse.json(
      {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: '1.0.5',
          checks: {
            memory: {
              status: memoryUsedMB > 460 ? 'warning' : 'ok',
              used: memoryUsedMB,
              limit: 512,
            },
            node: {
              status: 'ok',
              version: process.version,
            },
          },
        },
      },
      { status: 200 }
    )
  }),

  // Readiness check
  http.get('http://localhost:3000/api/health/ready', () => {
    return HttpResponse.json(
      {
        success: true,
        data: {
          status: 'ready',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    )
  }),

  // Liveness check
  http.get('http://localhost:3000/api/health/live', () => {
    return HttpResponse.json(
      {
        success: true,
        data: {
          status: 'alive',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    )
  }),

  // Detailed health check (requires authentication)
  http.get(
    'http://localhost:3000/api/health/detailed',
    async ({ request }: { request: Request }) => {
      const authHeader = request.headers.get('authorization')

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'UNAUTHORIZED',
              message: 'Unauthorized',
            },
          },
          { status: 401 }
        )
      }

      const memoryUsage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()

      return HttpResponse.json(
        {
          success: true,
          data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '1.0.5',
            environment: 'test',
            checks: {
              memory: {
                status: memoryUsage.heapUsed / 1024 / 1024 > 460 ? 'warning' : 'ok',
                used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                limit: 512,
                rss: Math.round(memoryUsage.rss / 1024 / 1024),
              },
              cpu: {
                status: 'ok',
                user: cpuUsage.user,
                system: cpuUsage.system,
              },
              node: {
                status: 'ok',
                version: process.version,
                platform: process.platform,
                arch: process.arch,
              },
              database: {
                status: 'ok',
                connectionPool: 5,
                activeConnections: 2,
              },
            },
            metrics: {
              uptimeSeconds: Math.floor(process.uptime()),
              memoryPercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
            },
          },
        },
        { status: 200 }
      )
    }
  ),
]

// Feedback endpoints handlers
export const feedbackHandlers = [
  // GET /api/feedback - List all feedbacks
  http.get('http://localhost:3000/api/feedback', ({ request }: { request: Request }) => {
    const url = new URL(request.url)

    const filters: {
      user_id?: string
      type?: string
      status?: string
      priority?: string
      rating_min?: number
      rating_max?: number
      search?: string
      sort_by?: 'created_at' | 'rating'
      sort_order?: 'asc' | 'desc'
      page?: number
      per_page?: number
    } = {
      user_id: url.searchParams.get('user_id') || undefined,
      type: url.searchParams.get('type') || undefined,
      status: url.searchParams.get('status') || undefined,
      priority: url.searchParams.get('priority') || undefined,
      rating_min: url.searchParams.get('rating_min')
        ? parseInt(url.searchParams.get('rating_min')!)
        : undefined,
      rating_max: url.searchParams.get('rating_max')
        ? parseInt(url.searchParams.get('rating_max')!)
        : undefined,
      search: url.searchParams.get('search') || undefined,
      sort_by: (url.searchParams.get('sort_by') as 'created_at' | 'rating') || undefined,
      sort_order: (url.searchParams.get('sort_order') as 'asc' | 'desc') || undefined,
      page: url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : undefined,
      per_page: url.searchParams.get('per_page')
        ? parseInt(url.searchParams.get('per_page')!)
        : undefined,
    }

    const result = mockData.filterFeedbacks(filters)
    const stats = mockData.getFeedbackStats()

    return HttpResponse.json(
      {
        success: true,
        data: {
          feedbacks: result.feedbacks,
          meta: result.meta,
          stats,
        },
      },
      { status: 200 }
    )
  }),

  // GET /api/feedback/:id - Get single feedback
  http.get(
    'http://localhost:3000/api/feedback/:id',
    ({ params }: { params: Record<string, string> }) => {
      const feedback = mockData.getFeedbackById(params.id)

      if (!feedback) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'NOT_FOUND',
              message: 'Feedback not found',
            },
          },
          { status: 404 }
        )
      }

      return HttpResponse.json(
        {
          success: true,
          data: feedback,
        },
        { status: 200 }
      )
    }
  ),

  // POST /api/feedback - Create new feedback
  http.post('http://localhost:3000/api/feedback', async ({ request }: { request: Request }) => {
    try {
      const body = (await request.json()) as any

      // Validation
      if (!body.type) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'type is required',
            },
          },
          { status: 400 }
        )
      }

      if (!body.rating || typeof body.rating !== 'number') {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'rating is required',
            },
          },
          { status: 400 }
        )
      }

      if (body.rating < 1 || body.rating > 5) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'rating must be between 1 and 5',
            },
          },
          { status: 400 }
        )
      }

      if (!body.title) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'title is required',
            },
          },
          { status: 400 }
        )
      }

      if (body.title.length > 100) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'title must be less than 100 characters',
            },
          },
          { status: 400 }
        )
      }

      if (!body.description) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'description is required',
            },
          },
          { status: 400 }
        )
      }

      if (body.description.length > 1000) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'description must be less than 1000 characters',
            },
          },
          { status: 400 }
        )
      }

      // Create feedback
      const feedback = mockData.createFeedback({
        user_id: body.user_id || 'user-test-1',
        type: body.type,
        rating: body.rating,
        title: body.title,
        description: body.description,
        email: body.email,
        metadata: body.metadata,
      })

      return HttpResponse.json(
        {
          success: true,
          data: feedback,
        },
        { status: 201 }
      )
    } catch (error) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid JSON body',
          },
        },
        { status: 400 }
      )
    }
  }),

  // PATCH /api/feedback/:id - Update feedback
  http.patch(
    'http://localhost:3000/api/feedback/:id',
    async ({ params, request }: { params: Record<string, string>; request: Request }) => {
      try {
        const body = (await request.json()) as any

        // Check admin permissions
        if (body.admin_id !== 'admin') {
          return HttpResponse.json(
            {
              success: false,
              error: {
                type: 'FORBIDDEN',
                message: 'Admin access required',
              },
            },
            { status: 403 }
          )
        }

        // Check if feedback exists
        const existing = mockData.getFeedbackById(params.id)
        if (!existing) {
          return HttpResponse.json(
            {
              success: false,
              error: {
                type: 'NOT_FOUND',
                message: 'Feedback not found',
              },
            },
            { status: 404 }
          )
        }

        // Update feedback
        const updated = mockData.updateFeedback(params.id, {
          status: body.status,
          priority: body.priority,
          admin_notes: body.admin_notes,
          metadata: body.metadata,
        })

        return HttpResponse.json(
          {
            success: true,
            data: updated,
          },
          { status: 200 }
        )
      } catch (error) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'Invalid JSON body',
            },
          },
          { status: 400 }
        )
      }
    }
  ),

  // DELETE /api/feedback/:id - Delete feedback
  http.delete(
    'http://localhost:3000/api/feedback/:id',
    ({ params }: { params: Record<string, string> }) => {
      const existing = mockData.getFeedbackById(params.id)

      if (!existing) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'NOT_FOUND',
              message: 'Feedback not found',
            },
          },
          { status: 404 }
        )
      }

      mockData.deleteFeedback(params.id)

      return HttpResponse.json(
        {
          success: true,
          data: {
            id: params.id,
            message: 'Feedback deleted successfully',
          },
        },
        { status: 200 }
      )
    }
  ),
]

// ========================================
// Tasks API Handlers
// ========================================
const taskHandlers = [
  // GET /api/tasks - List tasks with pagination, filtering
  http.get('http://localhost:3000/api/tasks', ({ request }: { request: Request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const status = url.searchParams.get('status') || undefined
    const priority = url.searchParams.get('priority') || undefined
    const search = url.searchParams.get('search') || undefined
    const createdBy = url.searchParams.get('createdBy') || undefined
    const assignedTo = url.searchParams.get('assignedTo') || undefined
    const sortBy = url.searchParams.get('sortBy') || 'createdAt'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'

    let tasks = mockData.getAllTasksFull()

    // Apply filters
    if (status) {
      tasks = tasks.filter(t => t.status === status)
    }
    if (priority) {
      tasks = tasks.filter(t => t.priority === priority)
    }
    if (search) {
      const searchLower = search.toLowerCase()
      tasks = tasks.filter(
        t =>
          t.title.toLowerCase().includes(searchLower) ||
          (t.description && t.description.toLowerCase().includes(searchLower))
      )
    }
    if (createdBy) {
      tasks = tasks.filter(t => t.createdBy === createdBy)
    }
    if (assignedTo) {
      tasks = tasks.filter(t => t.assignedTo === assignedTo)
    }

    // Sort
    tasks.sort((a, b) => {
      const aVal = a[sortBy as keyof typeof a] ?? ''
      const bVal = b[sortBy as keyof typeof b] ?? ''
      const cmp = String(aVal).localeCompare(String(bVal))
      return sortOrder === 'desc' ? -cmp : cmp
    })

    const total = tasks.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const items = tasks.slice(offset, offset + limit)

    return HttpResponse.json(
      {
        success: true,
        data: {
          items,
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      { status: 200 }
    )
  }),

  // POST /api/tasks - Create new task
  http.post('http://localhost:3000/api/tasks', async ({ request }: { request: Request }) => {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: { type: 'UNAUTHORIZED', message: 'Unauthorized' },
        },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const userId = mockData.getUserIdFromToken(token)
    if (!userId) {
      return HttpResponse.json(
        {
          success: false,
          error: { type: 'UNAUTHORIZED', message: 'Unauthorized' },
        },
        { status: 401 }
      )
    }

    try {
      const body = (await request.json()) as any

      if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
        return HttpResponse.json(
          {
            success: false,
            error: 'Validation failed',
            errors: ['Title is required and must be a non-empty string'],
          },
          { status: 400 }
        )
      }

      if (body.title.length > 200) {
        return HttpResponse.json(
          {
            success: false,
            error: 'Validation failed',
            errors: ['Title must be less than 200 characters'],
          },
          { status: 400 }
        )
      }

      const validPriorities = ['low', 'medium', 'high', 'urgent']
      if (body.priority && !validPriorities.includes(body.priority)) {
        return HttpResponse.json(
          {
            success: false,
            error: 'Validation failed',
            errors: ['Invalid priority value'],
          },
          { status: 400 }
        )
      }

      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled']
      if (body.status && !validStatuses.includes(body.status)) {
        return HttpResponse.json(
          {
            success: false,
            error: 'Validation failed',
            errors: ['Invalid status value'],
          },
          { status: 400 }
        )
      }

      const task = mockData.createTaskFull({
        title: body.title.trim(),
        description: body.description?.trim(),
        priority: body.priority || 'medium',
        status: body.status || 'pending',
        dueDate: body.dueDate || null,
        createdBy: userId,
        assignedTo: body.assignedTo || null,
      })

      return HttpResponse.json(
        {
          success: true,
          data: task,
        },
        { status: 201 }
      )
    } catch {
      return HttpResponse.json(
        {
          success: false,
          error: { type: 'VALIDATION_ERROR', message: 'Invalid JSON body' },
        },
        { status: 400 }
      )
    }
  }),

  // GET /api/tasks/:id - Get single task
  http.get(
    'http://localhost:3000/api/tasks/:id',
    ({ params }: { params: Record<string, string> }) => {
      const task = mockData.getTaskFullById(params.id)

      if (!task) {
        return HttpResponse.json(
          {
            success: false,
            error: { type: 'NOT_FOUND', message: 'Task not found' },
          },
          { status: 404 }
        )
      }

      return HttpResponse.json(
        {
          success: true,
          data: task,
        },
        { status: 200 }
      )
    }
  ),

  // PUT /api/tasks/:id - Update task
  http.put(
    'http://localhost:3000/api/tasks/:id',
    async ({ params, request }: { params: Record<string, string>; request: Request }) => {
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return HttpResponse.json(
          {
            success: false,
            error: { type: 'UNAUTHORIZED', message: 'Unauthorized' },
          },
          { status: 401 }
        )
      }

      const existing = mockData.getTaskFullById(params.id)
      if (!existing) {
        return HttpResponse.json(
          {
            success: false,
            error: { type: 'NOT_FOUND', message: 'Task not found' },
          },
          { status: 404 }
        )
      }

      try {
        const body = (await request.json()) as any

        if (
          body.title !== undefined &&
          (typeof body.title !== 'string' || body.title.trim().length === 0)
        ) {
          return HttpResponse.json(
            {
              success: false,
              error: 'Validation failed',
              errors: ['Title must be a non-empty string'],
            },
            { status: 400 }
          )
        }

        const validPriorities = ['low', 'medium', 'high', 'urgent']
        if (body.priority && !validPriorities.includes(body.priority)) {
          return HttpResponse.json(
            {
              success: false,
              error: 'Validation failed',
              errors: ['Invalid priority value'],
            },
            { status: 400 }
          )
        }

        const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled']
        if (body.status && !validStatuses.includes(body.status)) {
          return HttpResponse.json(
            {
              success: false,
              error: 'Validation failed',
              errors: ['Invalid status value'],
            },
            { status: 400 }
          )
        }

        const updated = mockData.updateTaskFull(params.id, {
          title: body.title?.trim(),
          description: body.description?.trim(),
          priority: body.priority,
          status: body.status,
          dueDate: body.dueDate,
          assignedTo: body.assignedTo,
        })

        return HttpResponse.json(
          {
            success: true,
            data: updated,
          },
          { status: 200 }
        )
      } catch {
        return HttpResponse.json(
          {
            success: false,
            error: { type: 'VALIDATION_ERROR', message: 'Invalid JSON body' },
          },
          { status: 400 }
        )
      }
    }
  ),

  // DELETE /api/tasks/:id - Delete task
  http.delete(
    'http://localhost:3000/api/tasks/:id',
    ({ params }: { params: Record<string, string> }) => {
      const existing = mockData.getTaskFullById(params.id)

      if (!existing) {
        return HttpResponse.json(
          {
            success: false,
            error: { type: 'NOT_FOUND', message: 'Task not found' },
          },
          { status: 404 }
        )
      }

      mockData.deleteTaskFull(params.id)

      return HttpResponse.json(
        {
          success: true,
          data: { id: params.id },
        },
        { status: 200 }
      )
    }
  ),
]

// ========================================
// Projects API Handlers
// ========================================
const projectHandlers = [
  // GET /api/projects - List projects
  http.get('http://localhost:3000/api/projects', ({ request }: { request: Request }) => {
    const url = new URL(request.url)
    const ownerId = url.searchParams.get('ownerId') || undefined
    const status = url.searchParams.get('status') || undefined

    let projects = mockData.getAllProjects()

    if (ownerId) {
      projects = projects.filter(p => p.ownerId === ownerId)
    }
    if (status) {
      projects = projects.filter(p => p.status === status)
    }

    return HttpResponse.json(
      {
        success: true,
        data: {
          items: projects,
          total: projects.length,
        },
      },
      { status: 200 }
    )
  }),

  // POST /api/projects - Create project
  http.post('http://localhost:3000/api/projects', async ({ request }: { request: Request }) => {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: { type: 'UNAUTHORIZED', message: 'Unauthorized' },
        },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const userId = mockData.getUserIdFromToken(token)
    if (!userId) {
      return HttpResponse.json(
        {
          success: false,
          error: { type: 'UNAUTHORIZED', message: 'Unauthorized' },
        },
        { status: 401 }
      )
    }

    try {
      const body = (await request.json()) as any

      if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
        return HttpResponse.json(
          {
            success: false,
            error: 'Validation failed',
            errors: ['Name is required and must be a non-empty string'],
          },
          { status: 400 }
        )
      }

      const project = mockData.createProject({
        name: body.name.trim(),
        description: body.description?.trim(),
        ownerId: userId,
        status: body.status || 'active',
      })

      return HttpResponse.json(
        {
          success: true,
          data: project,
        },
        { status: 201 }
      )
    } catch {
      return HttpResponse.json(
        {
          success: false,
          error: { type: 'VALIDATION_ERROR', message: 'Invalid JSON body' },
        },
        { status: 400 }
      )
    }
  }),

  // GET /api/projects/:id - Get single project
  http.get(
    'http://localhost:3000/api/projects/:id',
    ({ params }: { params: Record<string, string> }) => {
      const project = mockData.getProjectById(params.id)

      if (!project) {
        return HttpResponse.json(
          {
            success: false,
            error: { type: 'NOT_FOUND', message: 'Project not found' },
          },
          { status: 404 }
        )
      }

      return HttpResponse.json(
        {
          success: true,
          data: project,
        },
        { status: 200 }
      )
    }
  ),

  // PUT /api/projects/:id - Update project
  http.put(
    'http://localhost:3000/api/projects/:id',
    async ({ params, request }: { params: Record<string, string>; request: Request }) => {
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return HttpResponse.json(
          {
            success: false,
            error: { type: 'UNAUTHORIZED', message: 'Unauthorized' },
          },
          { status: 401 }
        )
      }

      const existing = mockData.getProjectById(params.id)
      if (!existing) {
        return HttpResponse.json(
          {
            success: false,
            error: { type: 'NOT_FOUND', message: 'Project not found' },
          },
          { status: 404 }
        )
      }

      try {
        const body = (await request.json()) as any

        if (
          body.name !== undefined &&
          (typeof body.name !== 'string' || body.name.trim().length === 0)
        ) {
          return HttpResponse.json(
            {
              success: false,
              error: 'Validation failed',
              errors: ['Name must be a non-empty string'],
            },
            { status: 400 }
          )
        }

        const updated = mockData.updateProject(params.id, {
          name: body.name?.trim(),
          description: body.description?.trim(),
          status: body.status,
        })

        return HttpResponse.json(
          {
            success: true,
            data: updated,
          },
          { status: 200 }
        )
      } catch {
        return HttpResponse.json(
          {
            success: false,
            error: { type: 'VALIDATION_ERROR', message: 'Invalid JSON body' },
          },
          { status: 400 }
        )
      }
    }
  ),

  // DELETE /api/projects/:id - Delete project
  http.delete(
    'http://localhost:3000/api/projects/:id',
    ({ params }: { params: Record<string, string> }) => {
      const existing = mockData.getProjectById(params.id)

      if (!existing) {
        return HttpResponse.json(
          {
            success: false,
            error: { type: 'NOT_FOUND', message: 'Project not found' },
          },
          { status: 404 }
        )
      }

      mockData.deleteProject(params.id)

      return HttpResponse.json(
        {
          success: true,
          data: { id: params.id },
        },
        { status: 200 }
      )
    }
  ),
]

// ========================================
// Performance API Handlers
// ========================================
const performanceHandlers = [
  // GET /api/performance/metrics
  http.get('http://localhost:3000/api/performance/metrics', ({ request }: { request: Request }) => {
    const url = new URL(request.url)
    const route = url.searchParams.get('route')
    const metric = url.searchParams.get('metric')
    const rating = url.searchParams.get('rating')
    const limit = parseInt(url.searchParams.get('limit') || '100')

    // Return mock performance metrics
    const mockMetrics = [
      {
        id: 'm1',
        name: 'LCP',
        value: 1200,
        rating: 'good',
        timestamp: Date.now() - 3600000,
        route: '/',
        deviceType: 'desktop',
        connectionType: 'broadband',
      },
      {
        id: 'm2',
        name: 'FID',
        value: 50,
        rating: 'good',
        timestamp: Date.now() - 3600000,
        route: '/',
        deviceType: 'desktop',
        connectionType: 'broadband',
      },
      {
        id: 'm3',
        name: 'CLS',
        value: 0.05,
        rating: 'good',
        timestamp: Date.now() - 3600000,
        route: '/',
        deviceType: 'desktop',
        connectionType: 'broadband',
      },
      {
        id: 'm4',
        name: 'TTFB',
        value: 200,
        rating: 'good',
        timestamp: Date.now() - 3600000,
        route: '/',
        deviceType: 'desktop',
        connectionType: 'broadband',
      },
    ]

    let filtered = [...mockMetrics]
    if (route) filtered = filtered.filter(m => m.route === route)
    if (metric) filtered = filtered.filter(m => m.name === metric)
    if (rating) filtered = filtered.filter(m => m.rating === rating)

    const stats = {
      LCP: {
        count: 4,
        avg: 1200,
        min: 1200,
        max: 1200,
        p50: 1200,
        p90: 1200,
        p95: 1200,
        good: 4,
        needsImprovement: 0,
        poor: 0,
      },
      FID: {
        count: 4,
        avg: 50,
        min: 50,
        max: 50,
        p50: 50,
        p90: 50,
        p95: 50,
        good: 4,
        needsImprovement: 0,
        poor: 0,
      },
      CLS: {
        count: 4,
        avg: 0.05,
        min: 0.05,
        max: 0.05,
        p50: 0.05,
        p90: 0.05,
        p95: 0.05,
        good: 4,
        needsImprovement: 0,
        poor: 0,
      },
    }

    return HttpResponse.json(
      {
        success: true,
        data: {
          metrics: filtered.slice(0, limit),
          stats,
          totalAlerts: 0,
        },
      },
      { status: 200 }
    )
  }),

  // POST /api/performance/metrics
  http.post(
    'http://localhost:3000/api/performance/metrics',
    async ({ request }: { request: Request }) => {
      try {
        const body = (await request.json()) as any
        const { metrics, metadata } = body

        if (!Array.isArray(metrics) || metrics.length === 0) {
          return HttpResponse.json(
            {
              success: false,
              error: { type: 'VALIDATION_ERROR', message: 'Invalid metrics data' },
            },
            { status: 400 }
          )
        }

        return HttpResponse.json(
          {
            success: true,
            data: {
              stored: metrics.length,
              alertsTriggered: 0,
              alerts: [],
            },
          },
          { status: 201 }
        )
      } catch {
        return HttpResponse.json(
          {
            success: false,
            error: { type: 'VALIDATION_ERROR', message: 'Invalid JSON body' },
          },
          { status: 400 }
        )
      }
    }
  ),

  // DELETE /api/performance/metrics
  http.delete(
    'http://localhost:3000/api/performance/metrics',
    ({ request }: { request: Request }) => {
      const url = new URL(request.url)
      const before = parseInt(url.searchParams.get('before') || '0')

      return HttpResponse.json(
        {
          success: true,
          data: {
            deleted: before > 0 ? 5 : 10,
            remainingMetrics: 0,
          },
        },
        { status: 200 }
      )
    }
  ),

  // GET /api/metrics/performance (alias)
  http.get('http://localhost:3000/api/metrics/performance', ({ request }: { request: Request }) => {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')

    const mockMetrics = [
      {
        id: 'm1',
        name: 'LCP',
        value: 1200,
        rating: 'good',
        timestamp: Date.now(),
        route: '/',
        deviceType: 'desktop',
        connectionType: 'broadband',
      },
      {
        id: 'm2',
        name: 'FID',
        value: 50,
        rating: 'good',
        timestamp: Date.now(),
        route: '/',
        deviceType: 'desktop',
        connectionType: 'broadband',
      },
    ]

    return HttpResponse.json(
      {
        success: true,
        data: {
          metrics: mockMetrics.slice(0, limit),
          stats: { LCP: { avg: 1200 }, FID: { avg: 50 } },
        },
      },
      { status: 200 }
    )
  }),
]

// Ratings endpoints handlers
export const ratingsHandlers = [
  // GET /api/ratings - List ratings
  http.get('http://localhost:3000/api/ratings', ({ request }: { request: Request }) => {
    const url = new URL(request.url)
    const filters = {
      user_id: url.searchParams.get('user_id') || undefined,
      target_type: url.searchParams.get('target_type') || undefined,
      target_id: url.searchParams.get('target_id') || undefined,
      rating_min: url.searchParams.get('rating_min')
        ? parseInt(url.searchParams.get('rating_min')!)
        : undefined,
      rating_max: url.searchParams.get('rating_max')
        ? parseInt(url.searchParams.get('rating_max')!)
        : undefined,
      status: url.searchParams.get('status') || undefined,
      start_date: url.searchParams.get('start_date') || undefined,
      end_date: url.searchParams.get('end_date') || undefined,
      sort_by: url.searchParams.get('sort_by') || 'created_at',
      sort_order: url.searchParams.get('sort_order') || 'desc',
      page: url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : 1,
      per_page: url.searchParams.get('per_page')
        ? Math.min(parseInt(url.searchParams.get('per_page')!), 100)
        : 20,
    }

    let ratings = Array.from(mockData['ratings']?.values?.() || [])

    // Apply filters
    if (filters.user_id) {
      ratings = ratings.filter(r => r.user_id === filters.user_id)
    }
    if (filters.target_type) {
      ratings = ratings.filter(r => r.target_type === filters.target_type)
    }
    if (filters.target_id) {
      ratings = ratings.filter(r => r.target_id === filters.target_id)
    }
    if (filters.rating_min) {
      ratings = ratings.filter(r => r.rating >= filters.rating_min!)
    }
    if (filters.rating_max) {
      ratings = ratings.filter(r => r.rating <= filters.rating_max!)
    }

    // Sort
    const sortBy = filters.sort_by
    const sortOrder = filters.sort_order
    ratings.sort((a: any, b: any) => {
      let comparison = 0
      if (sortBy === 'rating') {
        comparison = a.rating - b.rating
      } else {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    // Paginate
    const total = ratings.length
    const offset = (filters.page - 1) * filters.per_page
    const paginated = ratings.slice(offset, offset + filters.per_page)
    const totalPages = Math.ceil(total / filters.per_page)

    return HttpResponse.json(
      {
        success: true,
        data: {
          ratings: paginated.map((r: any) => ({
            ...r,
            verified: Boolean(r.verified),
          })),
          meta: {
            total,
            page: filters.page,
            per_page: filters.per_page,
            total_pages: totalPages,
          },
          stats: {
            total,
            averageRating:
              ratings.length > 0
                ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
                : 0,
          },
        },
      },
      { status: 200 }
    )
  }),

  // POST /api/ratings - Create rating
  http.post('http://localhost:3000/api/ratings', async ({ request }: { request: Request }) => {
    try {
      const body = (await request.json()) as any
      const { target_type, target_id, rating, title, description } = body
      const userId = request.headers.get('x-user-id') || 'anonymous'

      // Validation
      if (!target_type || !target_id || !rating) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'target_type, target_id, and rating are required',
            },
          },
          { status: 400 }
        )
      }

      if (rating < 1 || rating > 5) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'Rating must be between 1 and 5',
            },
          },
          { status: 400 }
        )
      }

      const validTypes = ['agent', 'task', 'feature', 'project', 'overall']
      if (!validTypes.includes(target_type)) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: `Invalid target_type. Must be one of: ${validTypes.join(', ')}`,
            },
          },
          { status: 400 }
        )
      }

      // Validate title length
      if (title && title.length > 100) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'Title must be less than 100 characters',
            },
          },
          { status: 400 }
        )
      }

      // Validate description length
      if (description && description.length > 1000) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'Description must be less than 1000 characters',
            },
          },
          { status: 400 }
        )
      }

      // Check if user already rated this target
      const existingRating = Array.from(mockData['ratings']?.values?.() || []).find(
        (r: any) =>
          r.user_id === userId && r.target_type === target_type && r.target_id === target_id
      )

      let resultRating
      if (existingRating) {
        // Update existing
        resultRating = mockData['updateRating']?.(existingRating.id, {
          rating,
          title,
          description,
          updated_at: new Date().toISOString(),
        })
      } else {
        // Create new
        resultRating = mockData['createRating']?.({
          user_id: userId,
          target_type,
          target_id,
          rating,
          title,
          description,
        })
      }

      return HttpResponse.json(
        {
          success: true,
          data: {
            ...resultRating,
            verified: Boolean(resultRating?.verified),
          },
        },
        { status: existingRating ? 200 : 201 }
      )
    } catch {
      return HttpResponse.json(
        {
          success: false,
          error: { type: 'VALIDATION_ERROR', message: 'Invalid request' },
        },
        { status: 400 }
      )
    }
  }),

  // GET /api/ratings/:id
  http.get('http://localhost:3000/api/ratings/:id', ({ params }: { params: { id: string } }) => {
    const rating = mockData['getRatingById']?.(params.id)
    if (!rating) {
      return HttpResponse.json(
        {
          success: false,
          error: { type: 'NOT_FOUND', message: 'Rating not found' },
        },
        { status: 404 }
      )
    }

    return HttpResponse.json(
      {
        success: true,
        data: {
          ...rating,
          verified: Boolean(rating.verified),
        },
      },
      { status: 200 }
    )
  }),

  // DELETE /api/ratings/:id
  http.delete(
    'http://localhost:3000/api/ratings/:id',
    ({ request, params }: { request: Request; params: { id: string } }) => {
      const userId = request.headers.get('x-user-id') || 'anonymous'
      const rating = mockData['getRatingById']?.(params.id)

      if (!rating) {
        return HttpResponse.json(
          {
            success: false,
            error: { type: 'NOT_FOUND', message: 'Rating not found' },
          },
          { status: 404 }
        )
      }

      if (rating.user_id !== userId && userId !== 'admin') {
        return HttpResponse.json(
          {
            success: false,
            error: { type: 'FORBIDDEN', message: 'You can only delete your own ratings' },
          },
          { status: 403 }
        )
      }

      mockData['deleteRating']?.(params.id)
      return HttpResponse.json(
        {
          success: true,
          data: { id: params.id, message: 'Rating deleted successfully' },
        },
        { status: 200 }
      )
    }
  ),

  // POST /api/ratings/:id/helpful
  http.post(
    'http://localhost:3000/api/ratings/:id/helpful',
    async ({ request, params }: { request: Request; params: { id: string } }) => {
      const body = (await request.json()) as any
      const { is_helpful } = body
      const userId = request.headers.get('x-user-id') || 'anonymous'

      if (typeof is_helpful !== 'boolean') {
        return HttpResponse.json(
          {
            success: false,
            error: { type: 'VALIDATION_ERROR', message: 'is_helpful must be a boolean' },
          },
          { status: 400 }
        )
      }

      const rating = mockData['getRatingById']?.(params.id)
      if (!rating) {
        return HttpResponse.json(
          {
            success: false,
            error: { type: 'NOT_FOUND', message: 'Rating not found' },
          },
          { status: 404 }
        )
      }

      // Update counts (simplified mock)
      const updatedRating = mockData['updateRating']?.(params.id, {
        helpful_count: is_helpful ? (rating.helpful_count || 0) + 1 : rating.helpful_count,
        not_helpful_count: !is_helpful
          ? (rating.not_helpful_count || 0) + 1
          : rating.not_helpful_count,
      })

      return HttpResponse.json(
        {
          success: true,
          data: {
            ...updatedRating,
            verified: Boolean(updatedRating?.verified),
            user_vote: is_helpful,
          },
        },
        { status: 200 }
      )
    }
  ),
]

// Export endpoints handlers
export const exportHandlers = [
  // GET /api/export/sync - Synchronous export
  http.get('http://localhost:3000/api/export/sync', async ({ request }: { request: Request }) => {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Unauthorized',
          },
        },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'csv'
    const filename = url.searchParams.get('filename') || 'export'

    // Generate sample CSV data
    const headers = '任务ID,任务标题,任务描述,状态,优先级,负责人,创建时间\n'
    const rows = Array.from({ length: 10 }, (_, i) => 
      `TASK-${String(i + 1).padStart(4, '0')},任务 ${i + 1},这是任务 ${i + 1} 的描述,pending,medium,张三,2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`
    ).join('\n')

    const csvContent = headers + rows

    const headers_response = new Headers()
    headers_response.set('Content-Type', format === 'json' ? 'application/json' : 'text/csv')
    headers_response.set('Content-Disposition', `attachment; filename="${filename}.${format === 'json' ? 'json' : 'csv'}"`)
    headers_response.set('Content-Length', String(csvContent.length))

    return new Response(csvContent, {
      status: 200,
      headers: headers_response,
    })
  }),

  // POST /api/export/sync - Synchronous export with filters
  http.post('http://localhost:3000/api/export/sync', async ({ request }: { request: Request }) => {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Unauthorized',
          },
        },
        { status: 401 }
      )
    }

    let body: any = {}
    try {
      body = await request.json()
    } catch {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid JSON body',
          },
        },
        { status: 400 }
      )
    }

    const { format = 'csv', filename = 'export' } = body

    // Validate required fields
    if (!format || !filename) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: '缺少必填字段: format, filename',
          },
        },
        { status: 400 }
      )
    }

    // Generate sample CSV data
    const headers = '任务ID,任务标题,状态,优先级\n'
    const rows = Array.from({ length: 10 }, (_, i) => 
      `TASK-${String(i + 1).padStart(4, '0')},任务 ${i + 1},pending,high`
    ).join('\n')

    const csvContent = headers + rows

    const headers_response = new Headers()
    headers_response.set('Content-Type', format === 'json' ? 'application/json' : 'text/csv')
    headers_response.set('Content-Disposition', `attachment; filename="${filename}.${format === 'json' ? 'json' : 'csv'}"`)
    headers_response.set('Content-Length', String(csvContent.length))

    return new Response(csvContent, {
      status: 200,
      headers: headers_response,
    })
  }),
]

// Search endpoints handlers
export const searchHandlers = [
  // GET /api/search - Global search
  http.get('http://localhost:3000/api/search', ({ request }: { request: Request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q') || ''
    const target = (url.searchParams.get('target') || 'all') as
      | 'all'
      | 'tasks'
      | 'projects'
      | 'members'
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)
    const includeHistory = url.searchParams.get('history') === 'true'

    // Collect results from different sources
    const results: any[] = []
    const queryLower = query.toLowerCase()

    // Search tasks
    if (target === 'all' || target === 'tasks') {
      const tasks = mockData['getAllTasksFull']?.() || []
      tasks.forEach((task: any) => {
        const taskQuery = `${task.title} ${task.description || ''}`.toLowerCase()
        if (!query || taskQuery.includes(queryLower)) {
          results.push({
            type: 'task',
            id: task.id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            score: query ? taskQuery.indexOf(queryLower) / taskQuery.length : 1,
          })
        }
      })
    }

    // Search projects
    if (target === 'all' || target === 'projects') {
      const projects = mockData['getAllProjects']?.() || []
      projects.forEach((project: any) => {
        const projectQuery = `${project.name} ${project.description || ''}`.toLowerCase()
        if (!query || projectQuery.includes(queryLower)) {
          results.push({
            type: 'project',
            id: project.id,
            name: project.name,
            description: project.description,
            ownerId: project.ownerId,
            status: project.status,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            score: query ? projectQuery.indexOf(queryLower) / projectQuery.length : 1,
          })
        }
      })
    }

    // Search members
    if (target === 'all' || target === 'members') {
      const members = mockData['getAllMembers']?.() || []
      const users = mockData['getAllUsers']?.() || []
      const allMembers = [
        ...members,
        ...users.map((u: any) => ({
          ...u,
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
        })),
      ]

      allMembers.forEach((member: any) => {
        const memberQuery = `${member.name || ''} ${member.email || ''}`.toLowerCase()
        if (!query || memberQuery.includes(queryLower)) {
          results.push({
            type: 'member',
            id: member.id,
            name: member.name,
            email: member.email,
            role: member.role,
            status: member.status,
            createdAt: member.createdAt || member.createdAt,
            updatedAt: member.updatedAt || member.updatedAt,
            score: query ? memberQuery.indexOf(queryLower) / memberQuery.length : 1,
          })
        }
      })
    }

    // Add to history
    if (query.trim() && results.length > 0) {
      mockData['addSearchHistory']?.(query, results.length, target)
    }

    // Build response
    const response: any = {
      results: results.slice(offset, offset + limit).map(r => ({ item: r, score: r.score })),
      total: results.length,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      hasMore: offset + limit < results.length,
    }

    // Include history if requested
    if (includeHistory) {
      response.history = (mockData['getRecentSearchHistory']?.(5) || []).map(h => ({
        query: h.query,
        timestamp: h.timestamp,
      }))
    }

    return HttpResponse.json(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    )
  }),
]

// Workflow endpoints handlers
export const workflowHandlers = [
  // POST /api/workflow - Create workflow
  http.post('http://localhost:3000/api/workflow', async ({ request }: { request: Request }) => {
    const body = (await request.json()) as any
    const authHeader = request.headers.get('Authorization')

    // Check authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      )
    }

    // Validation - name required
    if (!body.name) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: '工作流名称不能为空',
          },
        },
        { status: 400 }
      )
    }

    // Validate nodes structure (each node must have type)
    if (body.nodes && Array.isArray(body.nodes)) {
      for (const node of body.nodes) {
        if (!node.type) {
          return HttpResponse.json(
            {
              success: false,
              error: {
                type: 'VALIDATION_ERROR',
                message: '工作流节点必须包含type字段',
              },
            },
            { status: 400 }
          )
        }
      }
    }

    // Check name length
    if (body.name && body.name.length > 500) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: '工作流名称过长',
          },
        },
        { status: 400 }
      )
    }

    // Create workflow
    const workflow = {
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: body.name,
      description: body.description || '',
      version: 1,
      status: 'draft' as const,
      nodes: body.nodes || [],
      edges: body.edges || [],
      config: {
        timeout: body.config?.timeout || 3600,
        retryPolicy: body.config?.retryPolicy || {
          maxRetries: 3,
          backoff: 'exponential' as const,
          interval: 5,
        },
        variables: body.config?.variables || {},
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: body.userId || 'system',
        updatedBy: body.userId || 'system',
      },
    }

    return HttpResponse.json(
      {
        success: true,
        data: workflow,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    )
  }),

  // GET /api/workflow - List workflows
  http.get('http://localhost:3000/api/workflow', ({ request }: { request: Request }) => {
    const authHeader = request.headers.get('Authorization')

    // Check authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    let limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Handle negative parameters (use defaults)
    if (limit < 0) limit = 50
    // Cap extremely large limits
    if (limit > 1000) limit = 1000

    const workflows = [
      {
        id: 'workflow_1',
        name: '示例工作流',
        description: '一个简单的示例工作流',
        version: 1,
        status: 'active' as const,
        nodes: [
          { id: 'node_1', type: 'start' as const, name: '开始', position: { x: 100, y: 100 } },
          { id: 'node_2', type: 'agent' as const, name: '执行 Agent', position: { x: 350, y: 100 }, agentConfig: { agentId: 'agent_1', agentType: 'assistant' } },
          { id: 'node_3', type: 'end' as const, name: '结束', position: { x: 600, y: 100 } },
        ],
        edges: [
          { id: 'edge_1', source: 'node_1', target: 'node_2', type: 'sequence' as const },
          { id: 'edge_2', source: 'node_2', target: 'node_3', type: 'sequence' as const },
        ],
        config: { timeout: 3600 },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'user_1',
          updatedBy: 'user_1',
        },
      },
    ]

    let filtered = workflows
    if (status) {
      filtered = filtered.filter(w => w.status === status)
    }

    const paginated = filtered.slice(offset, offset + limit)

    return HttpResponse.json({
      success: true,
      data: {
        workflows: paginated,
        total: filtered.length,
        limit,
        offset,
      },
      timestamp: new Date().toISOString(),
    })
  }),

  // POST /api/workflow/[id]/run - Execute workflow
  http.post('http://localhost:3000/api/workflow/:id/run', async ({ request, params }: { request: Request; params: { id: string } }) => {
    const authHeader = request.headers.get('Authorization')

    // Check authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      )
    }

    const body = (await request.json()) as any
    const instanceId = `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return HttpResponse.json({
      success: true,
      data: {
        instanceId,
        workflowId: params.id,
        status: 'running',
        message: '工作流已开始运行',
        metadata: {
          triggeredBy: body.userId || 'system',
          triggerType: body.triggerType || 'manual',
          startedAt: new Date().toISOString(),
        },
      },
      timestamp: new Date().toISOString(),
    })
  }),

  // GET /api/workflow/[id]/run - Get run history
  http.get('http://localhost:3000/api/workflow/:id/run', ({ request }: { request: Request }) => {
    const authHeader = request.headers.get('Authorization')

    // Check authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('status')

    const allInstances = [
      {
        id: 'instance_1',
        workflowId: 'workflow_1',
        workflowVersion: 1,
        status: 'completed' as const,
        progress: { total: 3, completed: 3, failed: 0, percentage: 100 },
        nodeResults: {},
        data: { inputs: { query: 'Hello' }, outputs: { result: 'Done' } },
        metadata: {
          startedAt: new Date(Date.now() - 5000).toISOString(),
          endedAt: new Date().toISOString(),
          duration: 3010,
          triggeredBy: 'user_1',
          triggerType: 'manual' as const,
        },
      },
      {
        id: 'instance_2',
        workflowId: 'workflow_1',
        workflowVersion: 1,
        status: 'running' as const,
        progress: { total: 3, completed: 1, failed: 0, percentage: 33 },
        nodeResults: {},
        data: { inputs: { query: 'Test' } },
        metadata: {
          startedAt: new Date(Date.now() - 1000).toISOString(),
          triggeredBy: 'user_2',
          triggerType: 'api' as const,
        },
      },
    ]

    // Filter by status if provided
    const filteredInstances = statusFilter
      ? allInstances.filter(inst => inst.status === statusFilter)
      : allInstances

    return HttpResponse.json({
      success: true,
      data: {
        instances: filteredInstances,
        stats: {
          total: filteredInstances.length,
          success: filteredInstances.filter(i => i.status === 'completed').length,
          failed: filteredInstances.filter(i => i.status === 'failed').length,
          running: filteredInstances.filter(i => i.status === 'running').length,
        },
        total: filteredInstances.length,
        limit: 50,
        offset: 0,
      },
      timestamp: new Date().toISOString(),
    })
  }),

  // POST /api/workflow/[id]/executions/[execId]/cancel - Cancel execution
  http.post('http://localhost:3000/api/workflow/:id/executions/:execId/cancel', ({ request, params }: { request: Request; params: { id: string; execId: string } }) => {
    const authHeader = request.headers.get('Authorization')

    // Check authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      )
    }

    const { execId } = params

    // Check if execution exists (mock check)
    if (execId === 'non_existent_id') {
      return HttpResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      )
    }

    // Check for completed status (instance_1 is completed)
    if (execId === 'instance_1') {
      return HttpResponse.json(
        { error: 'Cannot cancel execution with status: completed' },
        { status: 400 }
      )
    }

    // Mock workflow ID mismatch - for workflow_999 vs actual execution
    // For simplicity in mock, we'll skip this check and let test handle it

    return HttpResponse.json({
      success: true,
      execution: {
        id: execId,
        workflowId: params.id,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      },
    })
  }),
]

// Analytics endpoints handlers
export const analyticsHandlers = [
  // GET /api/analytics/metrics
  http.get('http://localhost:3000/api/analytics/metrics', ({ request }) => {
    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')

    return HttpResponse.json({
      success: true,
      data: {
        metrics: {
          agents: { total: 10, active: 5, idle: 3, offline: 2, byProvider: {} },
          users: { total: 100, activeToday: 50, activeWeek: 80, newUsers: 10 },
          tasks: { total: 500, completed: 300, inProgress: 150, pending: 50 },
          revenue: { total: 15000, currency: 'USD', change: 12.5, byAgent: {}, monthly: 5000, weekly: 1200, daily: 170 },
          performance: { cpuUsage: 45, memoryUsage: 65, responseTime: 120, uptime: 99.9 },
        },
        timeSeries: [],
        pagination: { page, limit, total: 100, totalPages: Math.ceil(100 / limit) },
        filters: { timeRange: timeRange || 'week' },
        cacheStats: { hits: 100, misses: 10, hitRate: 0.91 },
      },
      timestamp: Date.now(),
    })
  }),

  // POST /api/analytics/metrics
  http.post('http://localhost:3000/api/analytics/metrics', async ({ request }) => {
    const body = await request.json().catch(() => ({}))
    const page = body.page || 1
    const limit = body.limit || 20

    return HttpResponse.json({
      success: true,
      data: {
        metrics: {
          agents: { total: 10, active: 5, idle: 3, offline: 2, byProvider: {} },
          users: { total: 100, activeToday: 50, activeWeek: 80, newUsers: 10 },
          tasks: { total: 500, completed: 300, inProgress: 150, pending: 50 },
          revenue: { total: 15000, currency: 'USD', change: 12.5, byAgent: {}, monthly: 5000, weekly: 1200, daily: 170 },
          performance: { cpuUsage: 45, memoryUsage: 65, responseTime: 120, uptime: 99.9 },
        },
        timeSeries: [],
        pagination: { page, limit, total: 100, totalPages: Math.ceil(100 / limit) },
        filters: body,
        cacheStats: { hits: 100, misses: 10, hitRate: 0.91 },
      },
      timestamp: Date.now(),
    })
  }),

  // POST /api/analytics/export
  http.post('http://localhost:3000/api/analytics/export', async ({ request }) => {
    return HttpResponse.json({
      success: true,
      data: {
        downloadUrl: '/downloads/analytics-export.json',
        filename: 'analytics-export.json',
        format: 'json',
        recordCount: 100,
      },
      timestamp: Date.now(),
    })
  }),

  // GET /api/analytics/export - return export options
  http.get('http://localhost:3000/api/analytics/export', () => {
    return HttpResponse.json({
      success: true,
      data: {
        formats: ['csv', 'xlsx', 'json'],
        maxRecords: 10000,
        options: {
          includeHeaders: true,
          timeRange: ['today', 'week', 'month', 'quarter', 'year', 'custom'],
        },
      },
    })
  }),
]

// Combine all handlers
export const handlers = [
  ...authHandlers,
  ...healthHandlers,
  ...feedbackHandlers,
  ...taskHandlers,
  ...projectHandlers,
  ...performanceHandlers,
  ...ratingsHandlers,
  ...searchHandlers,
  ...exportHandlers,
  ...analyticsHandlers,
  ...workflowHandlers,
  ...agentHandlers,
  ...capsuleHandlers,
]

// Create MSW server
export const server = setupServer(...handlers)
