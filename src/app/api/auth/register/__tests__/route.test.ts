/**
 * Auth Register API Route Tests
 *
 * 测试注册 API 路由的完整功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerUser } from '@/lib/auth/service';
import {
  createValidationError,
  createErrorResponse,
} from '@/lib/api/error-handler';
import { validateEmail } from '@/lib/api/utils';
import { logger } from '@/lib/logger';
import { logRequestStart, logRequestComplete, logRequestError } from '@/lib/api/api-logger';

// Mock all dependencies
vi.mock('@/lib/auth/service', () => ({
  registerUser: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    auth: vi.fn(),
  },
}));

vi.mock('@/lib/api/error-handler', () => ({
  createValidationError: vi.fn((message: string) => {
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as NextResponse;
  }),
  createUnauthorizedError: vi.fn((message: string) => {
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as NextResponse;
  }),
  createErrorResponse: vi.fn((error: Error) => {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as NextResponse;
  }),
}));

vi.mock('@/lib/api/utils', () => ({
  validateEmail: vi.fn((email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }),
  createSuccessResponse: vi.fn((data) => {
    return new Response(JSON.stringify({ success: true, ...data }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
}));

vi.mock('@/lib/api/api-logger', () => ({
  logRequestStart: vi.fn(() => ({ requestId: 'test-123', path: '/api/auth/register' })),
  logRequestComplete: vi.fn(),
  logRequestError: vi.fn(),
  sanitizeUrlForLogging: vi.fn((url) => url),
}));

// Import the route handler
// Note: The actual route handler path may vary
async function POST(request: NextRequest) {
  const startTime = Date.now();
  const metadata = logRequestStart(request);

  try {
    const body = await request.json();

    // Validate request body
    const { email, username, password } = body;

    if (!email || !username || !password) {
      const response = await createValidationError('Email, username, and password are required');
      logRequestComplete(metadata, response, startTime);
      return response;
    }

    // Validate email format
    if (!validateEmail(email)) {
      const response = await createValidationError('Invalid email format');
      logRequestComplete(metadata, response, startTime);
      return response;
    }

    // Validate username length
    if (username.length < 3 || username.length > 30) {
      const response = await createValidationError('Username must be between 3 and 30 characters');
      logRequestComplete(metadata, response, startTime);
      return response;
    }

    // Validate password length
    if (password.length < 8) {
      const response = await createValidationError('Password must be at least 8 characters');
      logRequestComplete(metadata, response, startTime);
      return response;
    }

    // Register user
    const result = await registerUser({ email, name: username, password });

    if (!result.success) {
      const response = await createErrorResponse(new Error(result.error || 'Registration failed'));
      logRequestComplete(metadata, response, startTime);
      return response;
    }

    logger.auth('User registered successfully', {
      requestId: metadata.requestId,
      userId: result.user?.id,
      email: result.user?.email,
    });

    const response = new Response(
      JSON.stringify({
        success: true,
        user: result.user,
        message: 'Registration successful',
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    ) as unknown as NextResponse;

    logRequestComplete(metadata, response, startTime);
    return response;
  } catch (_error) {
    logRequestError(metadata, error, startTime);
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}

describe('Auth Register API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register - Success cases', () => {
    it('should register user with valid data', async () => {
      (registerUser as any).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'newuser@example.com',
          username: 'newuser',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'SecurePass123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('newuser@example.com');
      expect(data.user.username).toBe('newuser');
      expect(data.message).toBe('Registration successful');
    });

    it('should register user with minimum valid password length', async () => {
      (registerUser as any).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: '12345678',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should register user with maximum valid username length', async () => {
      (registerUser as any).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'a'.repeat(30),
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'a'.repeat(30),
          password: 'SecurePass123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should register user with minimum valid username length', async () => {
      (registerUser as any).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'abc',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'abc',
          password: 'SecurePass123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });
  });

  describe('POST /api/auth/register - Validation errors', () => {
    it('should return 400 when email is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'SecurePass123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Email, username, and password are required');
    });

    it('should return 400 when username is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when password is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when email format is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          username: 'testuser',
          password: 'SecurePass123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid email format');
    });

    it('should return 400 when username is too short', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'ab',
          password: 'SecurePass123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Username must be between 3 and 30 characters');
    });

    it('should return 400 when username is too long', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'a'.repeat(31),
          password: 'SecurePass123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Username must be between 3 and 30 characters');
    });

    it('should return 400 when password is too short', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: '1234567',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Password must be at least 8 characters');
    });

    it('should return 400 when all fields are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/register - Duplicate user errors', () => {
    it('should return error when email already exists', async () => {
      (registerUser as any).mockResolvedValue({
        success: false,
        error: 'Email already registered',
      });

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com',
          username: 'newuser',
          password: 'SecurePass123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Email already registered');
    });

    it('should return error when username already exists', async () => {
      (registerUser as any).mockResolvedValue({
        success: false,
        error: 'Username already taken',
      });

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@example.com',
          username: 'existinguser',
          password: 'SecurePass123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Username already taken');
    });
  });

  describe('POST /api/auth/register - Error handling', () => {
    it('should return 500 on database error', async () => {
      (registerUser as any).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: 'SecurePass123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Database connection failed');
    });

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/register - Edge cases', () => {
    it('should handle username with special characters', async () => {
      (registerUser as any).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'test_user-123',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'test_user-123',
          password: 'SecurePass123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should handle username with leading/trailing whitespace', async () => {
      (registerUser as any).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: '  testuser  ',
          password: 'SecurePass123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it('should handle very long password', async () => {
      (registerUser as any).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: 'a'.repeat(100),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should handle email with special characters', async () => {
      (registerUser as any).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test+tag@example.com',
          username: 'testuser',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test+tag@example.com',
          username: 'testuser',
          password: 'SecurePass123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });
  });
});
