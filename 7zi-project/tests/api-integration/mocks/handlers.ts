/**
 * @fileoverview MSW setup for API integration tests
 * @description Configures Mock Service Worker for Next.js API route testing
 */

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { MockDataGenerator } from './data';

const mockData = new MockDataGenerator();

// Auth endpoints handlers
export const authHandlers = [
  // Register
  http.post('http://localhost:3000/api/auth/register', async ({ request }: { request: Request }) => {
    const body = await request.json() as any;

    // Validation
    if (!body.email || !body.password || !body.name) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Email, password, and name are required',
        },
      }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid email format',
        },
      }, { status: 400 });
    }

    if (body.password.length < 8) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters',
        },
      }, { status: 400 });
    }

    if (!/[A-Z]/.test(body.password)) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'WEAK_PASSWORD',
          message: 'Password must contain uppercase letters',
        },
      }, { status: 400 });
    }

    if (!/[a-z]/.test(body.password)) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'WEAK_PASSWORD',
          message: 'Password must contain lowercase letters',
        },
      }, { status: 400 });
    }

    if (!/[0-9]/.test(body.password)) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'WEAK_PASSWORD',
          message: 'Password must contain numbers',
        },
      }, { status: 400 });
    }

    // Check for duplicate email
    const existingUser = mockData.findUserByEmail(body.email);
    if (existingUser) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'REGISTRATION_FAILED',
          message: 'Email already exists',
        },
      }, { status: 400 });
    }

    // Create user
    const user = mockData.createUser({
      email: body.email,
      password: body.password,
      name: body.name,
    });

    return HttpResponse.json({
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
    }, { status: 201 });
  }),

  // Login
  http.post('http://localhost:3000/api/auth/login', async ({ request }: { request: Request }) => {
    const body = await request.json() as any;

    if (!body.email || !body.password) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
      }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid email format',
        },
      }, { status: 400 });
    }

    // Find user and verify password
    const user = mockData.findUserByEmail(body.email);
    if (!user || user.password !== body.password) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        },
      }, { status: 401 });
    }

    const token = mockData.generateToken(user.id);
    const refreshToken = mockData.generateRefreshToken(user.id);

    return HttpResponse.json({
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
    }, {
      status: 200,
      headers: {
        'Set-Cookie': [
          `auth_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/`,
          `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/`,
        ].join(', '),
      },
    });
  }),

  // Logout
  http.post('http://localhost:3000/api/auth/logout', async ({ request }: { request: Request }) => {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'UNAUTHORIZED',
          message: 'Unauthorized',
        },
      }, { status: 401 });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'UNAUTHORIZED',
          message: 'Unauthorized',
        },
      }, { status: 401 });
    }

    // In a real app, we'd invalidate the token here
    return HttpResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  }),

  // Get current user (me)
  http.get('http://localhost:3000/api/auth/me', async ({ request }: { request: Request }) => {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'UNAUTHORIZED',
          message: 'Unauthorized',
        },
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userId = mockData.getUserIdFromToken(token);

    if (!userId) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'UNAUTHORIZED',
          message: 'Unauthorized',
        },
      }, { status: 401 });
    }

    const user = mockData.getUserById(userId);
    if (!user) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: 'User not found',
        },
      }, { status: 404 });
    }

    return HttpResponse.json({
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
    }, { status: 200 });
  }),

  // Refresh token
  http.post('http://localhost:3000/api/auth/refresh', async ({ request }: { request: Request }) => {
    const body = await request.json() as any;

    if (!body.refreshToken) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Refresh token is required',
        },
      }, { status: 400 });
    }

    if (body.refreshToken.length < 10) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid refresh token format',
        },
      }, { status: 400 });
    }

    const userId = mockData.getUserIdFromRefreshToken(body.refreshToken);
    if (!userId) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'UNAUTHORIZED',
          message: 'Invalid refresh token',
        },
      }, { status: 401 });
    }

    const user = mockData.getUserById(userId);
    if (!user) {
      return HttpResponse.json({
        success: false,
        error: {
          type: 'UNAUTHORIZED',
          message: 'Invalid refresh token',
        },
      }, { status: 401 });
    }

    const newToken = mockData.generateToken(userId);
    const newRefreshToken = mockData.generateRefreshToken(userId);

    return HttpResponse.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    }, {
      status: 200,
      headers: {
        'Set-Cookie': [
          `auth_token=${newToken}; HttpOnly; Secure; SameSite=Lax; Path=/`,
          `refresh_token=${newRefreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/`,
        ].join(', '),
      },
    });
  }),
];

// Health endpoints handlers
export const healthHandlers = [
  // Health check
  http.get('http://localhost:3000/api/health', () => {
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

    return HttpResponse.json({
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
    }, { status: 200 });
  }),

  // Readiness check
  http.get('http://localhost:3000/api/health/ready', () => {
    return HttpResponse.json({
      success: true,
      data: {
        status: 'ready',
        timestamp: new Date().toISOString(),
      },
    }, { status: 200 });
  }),

  // Liveness check
  http.get('http://localhost:3000/api/health/live', () => {
    return HttpResponse.json({
      success: true,
      data: {
        status: 'alive',
        timestamp: new Date().toISOString(),
      },
    }, { status: 200 });
  }),
];

// Combine all handlers
export const handlers = [
  ...authHandlers,
  ...healthHandlers,
];

// Create MSW server
export const server = setupServer(...handlers);
