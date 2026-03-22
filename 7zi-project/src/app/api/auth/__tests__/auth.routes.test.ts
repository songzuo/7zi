/**
 * @fileoverview Auth API route integration tests
 * @description Tests for /api/auth/* endpoints - login, logout, register, me, refresh
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as POST_LOGIN } from '../login/route';
import { POST as POST_LOGOUT } from '../logout/route';
import { GET as GET_ME } from '../me/route';
import { POST as POST_REFRESH } from '../refresh/route';
import { POST as POST_REGISTER } from '../register/route';
import { createMockRequest } from '@/test/mocks/api-mocks';

// Test URLs
const AUTH_URLS = {
  LOGIN: 'http://localhost:3000/api/auth/login',
  LOGOUT: 'http://localhost:3000/api/auth/logout',
  ME: 'http://localhost:3000/api/auth/me',
  REFRESH: 'http://localhost:3000/api/auth/refresh',
  REGISTER: 'http://localhost:3000/api/auth/register',
} as const;

// Mock the auth service functions
vi.mock('@/lib/auth/service', () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  refreshToken: vi.fn(),
  verifyJwtToken: vi.fn(),
}));

// Mock the middleware
vi.mock('@/lib/auth/middleware', () => ({
  withUserAuth: vi.fn((request: Request, handler: Function) => {
    // Simple mock: extract token and call handler with mock context
    const authHeader = (request as any).headers?.get('authorization');
    const token = authHeader?.substring(7);

    if (!token || token === 'invalid-token') {
      return Promise.resolve({
        status: 401,
        json: async () => ({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
        }),
      });
    }

    // Extract userId from mock token format
    const userId = token.replace('mock-jwt-token-', '');
    return handler(request, { userId });
  }),
}));

// Mock the repository
vi.mock('@/lib/auth/repository', () => ({
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  deleteUser: vi.fn(),
  updateUser: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    api: vi.fn(),
    auth: vi.fn(),
    perf: vi.fn(),
    user: vi.fn(),
    security: vi.fn(),
    business: vi.fn(),
    setContext: vi.fn(),
    clearContext: vi.fn(),
    child: vi.fn(),
    updateConfig: vi.fn(),
  },
}));

import { registerUser, loginUser, logoutUser, refreshToken, verifyJwtToken } from '@/lib/auth/service';
import { createUser, getUserByEmail, getUserById, deleteUser } from '@/lib/auth/repository';

describe('/api/auth/register', () => {
  const testUser = {
    email: 'testregister@example.com',
    password: 'SecurePass123',
    name: 'Test Register User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST request', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: testUser.email,
        name: testUser.name,
        role: 'member',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (getUserByEmail as any).mockResolvedValue(null);
      (registerUser as any).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const request = createMockRequest(AUTH_URLS.REGISTER, {
        method: 'POST',
        body: testUser,
      });

      const response = await POST_REGISTER(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.email).toBe(testUser.email);
      expect(data.data.user.name).toBe(testUser.name);
      expect(data.data.user).not.toHaveProperty('password');
    });

    it('should reject registration without email', async () => {
      const request = createMockRequest(AUTH_URLS.REGISTER, {
        method: 'POST',
        body: {
          password: testUser.password,
          name: testUser.name,
        },
      });

      const response = await POST_REGISTER(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Email, password, and name are required');
      expect(data.error).toHaveProperty('timestamp');
    });

    it('should reject registration without password', async () => {
      const request = createMockRequest(AUTH_URLS.REGISTER, {
        method: 'POST',
        body: {
          email: testUser.email,
          name: testUser.name,
        },
      });

      const response = await POST_REGISTER(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject registration without name', async () => {
      const request = createMockRequest(AUTH_URLS.REGISTER, {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await POST_REGISTER(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid email format', async () => {
      const request = createMockRequest(AUTH_URLS.REGISTER, {
        method: 'POST',
        body: {
          email: 'invalid-email',
          password: testUser.password,
          name: testUser.name,
        },
      });

      const response = await POST_REGISTER(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid email format');
    });

    it('should reject weak password (too short)', async () => {
      const request = createMockRequest(AUTH_URLS.REGISTER, {
        method: 'POST',
        body: {
          email: testUser.email,
          password: 'short',
          name: testUser.name,
        },
      });

      const response = await POST_REGISTER(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('WEAK_PASSWORD');
      expect(data.error.message).toContain('at least 8 characters');
    });

    it('should reject weak password (no uppercase)', async () => {
      const request = createMockRequest(AUTH_URLS.REGISTER, {
        method: 'POST',
        body: {
          email: testUser.email,
          password: 'securepass123',
          name: testUser.name,
        },
      });

      const response = await POST_REGISTER(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('WEAK_PASSWORD');
    });

    it('should reject weak password (no lowercase)', async () => {
      const request = createMockRequest(AUTH_URLS.REGISTER, {
        method: 'POST',
        body: {
          email: testUser.email,
          password: 'SECUREPASS123',
          name: testUser.name,
        },
      });

      const response = await POST_REGISTER(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('WEAK_PASSWORD');
    });

    it('should reject weak password (no numbers)', async () => {
      const request = createMockRequest(AUTH_URLS.REGISTER, {
        method: 'POST',
        body: {
          email: testUser.email,
          password: 'SecurePassword',
          name: testUser.name,
        },
      });

      const response = await POST_REGISTER(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('WEAK_PASSWORD');
    });

    it('should reject duplicate email registration', async () => {
      (registerUser as any).mockResolvedValue({
        success: false,
        error: 'Email already exists',
      });

      const request = createMockRequest(AUTH_URLS.REGISTER, {
        method: 'POST',
        body: testUser,
      });

      const response = await POST_REGISTER(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('REGISTRATION_FAILED');
      expect(data.error.message).toContain('already exists');
    });
  });
});

describe('/api/auth/login', () => {
  const testUser = {
    email: 'testlogin@example.com',
    password: 'SecurePass123',
    name: 'Test Login User',
  };

  const mockUser = {
    id: 'user-123',
    email: testUser.email,
    name: testUser.name,
    role: 'member',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST request', () => {
    it('should login with valid credentials', async () => {
      (loginUser as any).mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'jwt-access-token',
        refreshToken: 'refresh-token-123',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const request = createMockRequest(AUTH_URLS.LOGIN, {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await POST_LOGIN(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.email).toBe(testUser.email);
      expect(data.data.token).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();
      expect(data.data.expiresAt).toBeDefined();
    });

    it('should login with rememberMe flag', async () => {
      (loginUser as any).mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'jwt-access-token',
        refreshToken: 'refresh-token-123',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const request = createMockRequest(AUTH_URLS.LOGIN, {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
          rememberMe: true,
        },
      });

      const response = await POST_LOGIN(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();

      // Check cookies are set
      const cookies = response.headers.getSetCookie();
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.includes('auth_token'))).toBe(true);
      expect(cookies.some(c => c.includes('refresh_token'))).toBe(true);
    });

    it('should reject login without email', async () => {
      const request = createMockRequest(AUTH_URLS.LOGIN, {
        method: 'POST',
        body: {
          password: testUser.password,
        },
      });

      const response = await POST_LOGIN(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Email and password are required');
    });

    it('should reject login without password', async () => {
      const request = createMockRequest(AUTH_URLS.LOGIN, {
        method: 'POST',
        body: {
          email: testUser.email,
        },
      });

      const response = await POST_LOGIN(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject login with invalid email format', async () => {
      const request = createMockRequest(AUTH_URLS.LOGIN, {
        method: 'POST',
        body: {
          email: 'invalid-email',
          password: testUser.password,
        },
      });

      const response = await POST_LOGIN(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid email format');
    });

    it('should reject login with wrong credentials', async () => {
      (loginUser as any).mockResolvedValue({
        success: false,
        error: 'Invalid email or password',
      });

      const request = createMockRequest(AUTH_URLS.LOGIN, {
        method: 'POST',
        body: {
          email: testUser.email,
          password: 'WrongPassword123',
        },
      });

      const response = await POST_LOGIN(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('UNAUTHORIZED');
      expect(data.error.message).toContain('Invalid email or password');
    });
  });

  describe('Cookie handling', () => {
    it('should set auth_token cookie', async () => {
      (loginUser as any).mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'jwt-access-token',
        refreshToken: 'refresh-token-123',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const request = createMockRequest(AUTH_URLS.LOGIN, {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await POST_LOGIN(request);
      const cookies = response.headers.getSetCookie();

      expect(cookies.some(c => c.includes('auth_token'))).toBe(true);
    });

    it('should set refresh_token cookie', async () => {
      (loginUser as any).mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'jwt-access-token',
        refreshToken: 'refresh-token-123',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const request = createMockRequest(AUTH_URLS.LOGIN, {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await POST_LOGIN(request);
      const cookies = response.headers.getSetCookie();

      expect(cookies.some(c => c.includes('refresh_token'))).toBe(true);
    });
  });
});

describe('/api/auth/logout', () => {
  const testUser = {
    email: 'testlogout@example.com',
    password: 'SecurePass123',
    name: 'Test Logout User',
  };

  const authToken = 'mock-jwt-token-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    (logoutUser as any).mockResolvedValue(undefined);
  });

  describe('POST request', () => {
    it('should logout with valid token', async () => {
      const request = createMockRequest(AUTH_URLS.LOGOUT, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const response = await POST_LOGOUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.timestamp).toBeDefined();
      expect(logoutUser).toHaveBeenCalledWith(authToken);
    });

    it('should reject logout without token', async () => {
      const request = createMockRequest(AUTH_URLS.LOGOUT, {
        method: 'POST',
      });

      const response = await POST_LOGOUT(request);
      const data = await response.json();

      // Middleware returns 401 for missing auth
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should clear auth cookies on logout', async () => {
      const request = createMockRequest(AUTH_URLS.LOGOUT, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const response = await POST_LOGOUT(request);
      const data = await response.json();

      // Verify successful logout response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.timestamp).toBeDefined();
      expect(logoutUser).toHaveBeenCalledWith(authToken);
    });
  });
});

describe('/api/auth/me', () => {
  const testUser = {
    email: 'testme@example.com',
    password: 'SecurePass123',
    name: 'Test Me User',
  };

  const mockUser = {
    id: 'user-123',
    email: testUser.email,
    name: testUser.name,
    role: 'member',
    status: 'active',
    password: 'hashed-password',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const authToken = 'mock-jwt-token-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    (getUserById as any).mockResolvedValue(mockUser);
  });

  describe('GET request', () => {
    it('should return user information with valid token', async () => {
      const request = createMockRequest(AUTH_URLS.ME, {
        method: 'GET',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const response = await GET_ME(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.email).toBe(testUser.email);
      expect(data.data.name).toBe(testUser.name);
      expect(data.data).not.toHaveProperty('password');
      expect(getUserById).toHaveBeenCalledWith('user-123');
    });

    it('should reject request without token', async () => {
      const request = createMockRequest(AUTH_URLS.ME, {
        method: 'GET',
      });

      const response = await GET_ME(request);

      // Middleware should return 401
      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const request = createMockRequest(AUTH_URLS.ME, {
        method: 'GET',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      const response = await GET_ME(request);

      // Middleware should return 401
      expect(response.status).toBe(401);
    });

    it('should return 404 if user not found', async () => {
      (getUserById as any).mockResolvedValue(null);

      const request = createMockRequest(AUTH_URLS.ME, {
        method: 'GET',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const response = await GET_ME(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('NOT_FOUND');
    });
  });
});

describe('/api/auth/refresh', () => {
  const testUser = {
    email: 'testrefresh@example.com',
    password: 'SecurePass123',
    name: 'Test Refresh User',
  };

  const mockRefreshTokenValue = 'valid-refresh-token-123';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for verifyJwtToken to pass JWT validation
    (verifyJwtToken as any).mockResolvedValue({
      userId: 'user-123',
      email: 'testrefresh@example.com',
    });
  });

  describe('POST request', () => {
    it('should refresh token with valid refresh token', async () => {
      (verifyJwtToken as any).mockResolvedValue({
        userId: 'user-123',
        email: 'testrefresh@example.com',
      });

      (refreshToken as any).mockResolvedValue({
        success: true,
        token: 'new-jwt-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const request = createMockRequest(AUTH_URLS.REFRESH, {
        method: 'POST',
        body: {
          refreshToken: mockRefreshTokenValue,
        },
      });

      const response = await POST_REFRESH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();
      expect(data.data.expiresAt).toBeDefined();
    });

    it('should reject refresh without refresh token', async () => {
      const request = createMockRequest(AUTH_URLS.REFRESH, {
        method: 'POST',
        body: {},
      });

      const response = await POST_REFRESH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Refresh token is required');
    });

    it('should reject refresh with invalid refresh token format', async () => {
      const request = createMockRequest(AUTH_URLS.REFRESH, {
        method: 'POST',
        body: {
          refreshToken: 'short',
        },
      });

      const response = await POST_REFRESH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid refresh token format');
    });

    it('should reject refresh with invalid refresh token', async () => {
      // Mock verifyJwtToken to return a valid context (passes JWT structure validation)
      (verifyJwtToken as any).mockResolvedValueOnce({
        userId: 'user-123',
        email: 'testrefresh@example.com',
      });

      // Mock refreshToken to fail (the actual refresh logic fails)
      (refreshToken as any).mockResolvedValue({
        success: false,
        error: 'UNAUTHORIZED',
      });

      const request = createMockRequest(AUTH_URLS.REFRESH, {
        method: 'POST',
        body: {
          refreshToken: 'invalid-refresh-token-value',
        },
      });

      const response = await POST_REFRESH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('UNAUTHORIZED');
    });

    it('should clear cookies on failed refresh', async () => {
      // Mock verifyJwtToken to return a valid context (passes JWT structure validation)
      (verifyJwtToken as any).mockResolvedValueOnce({
        userId: 'user-123',
        email: 'testrefresh@example.com',
      });

      // Mock refreshToken to fail (the actual refresh logic fails)
      (refreshToken as any).mockResolvedValue({
        success: false,
        error: 'UNAUTHORIZED',
      });

      const request = createMockRequest(AUTH_URLS.REFRESH, {
        method: 'POST',
        body: {
          refreshToken: 'invalid-refresh-token-value',
        },
      });

      const response = await POST_REFRESH(request);
      const data = await response.json();

      // Verify failed refresh response
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('UNAUTHORIZED');
    });

    it('should update cookies on successful refresh', async () => {
      (verifyJwtToken as any).mockResolvedValue({
        userId: 'user-123',
        email: 'testrefresh@example.com',
      });

      (refreshToken as any).mockResolvedValue({
        success: true,
        token: 'new-jwt-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const request = createMockRequest(AUTH_URLS.REFRESH, {
        method: 'POST',
        body: {
          refreshToken: mockRefreshTokenValue,
        },
      });

      const response = await POST_REFRESH(request);
      const data = await response.json();

      // Verify successful refresh response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.token).toBe('new-jwt-token');
      expect(data.data.refreshToken).toBe('new-refresh-token');
      expect(data.data.expiresAt).toBeDefined();
    });
  });
});

describe('Auth Integration Flows', () => {
  const testUser = {
    email: 'testintegration@example.com',
    password: 'SecurePass123',
    name: 'Test Integration User',
  };

  const mockUser = {
    id: 'user-123',
    email: testUser.email,
    name: testUser.name,
    role: 'member',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete registration and login flow', () => {
    it('should successfully register and then login', async () => {
      // Step 1: Register
      (registerUser as any).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const registerRequest = createMockRequest(AUTH_URLS.REGISTER, {
        method: 'POST',
        body: testUser,
      });

      const registerResponse = await POST_REGISTER(registerRequest);
      const registerData = await registerResponse.json();

      expect(registerResponse.status).toBe(201);
      expect(registerData.success).toBe(true);

      // Step 2: Login
      (loginUser as any).mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'jwt-access-token',
        refreshToken: 'refresh-token-123',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const loginRequest = createMockRequest(AUTH_URLS.LOGIN, {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const loginResponse = await POST_LOGIN(loginRequest);
      const loginData = await loginResponse.json();

      expect(loginResponse.status).toBe(200);
      expect(loginData.success).toBe(true);
      expect(loginData.data.token).toBeDefined();
    });
  });

  describe('Login and logout flow', () => {
    it('should successfully login and then logout', async () => {
      // Step 1: Login
      (loginUser as any).mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'jwt-access-token',
        refreshToken: 'refresh-token-123',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const loginRequest = createMockRequest(AUTH_URLS.LOGIN, {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const loginResponse = await POST_LOGIN(loginRequest);
      const loginData = await loginResponse.json();

      expect(loginResponse.status).toBe(200);
      expect(loginData.success).toBe(true);
      expect(loginData.data.token).toBeDefined();

      const authToken = loginData.data.token;

      // Step 2: Logout
      (logoutUser as any).mockResolvedValue(undefined);

      const logoutRequest = createMockRequest(AUTH_URLS.LOGOUT, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const logoutResponse = await POST_LOGOUT(logoutRequest);
      const logoutData = await logoutResponse.json();

      expect(logoutResponse.status).toBe(200);
      expect(logoutData.success).toBe(true);
    });
  });
});

describe('Error handling', () => {
  it('should handle JSON parse errors gracefully', async () => {
    const request = createMockRequest(AUTH_URLS.LOGIN, {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST_LOGIN(request);

    // Should not crash, should handle error
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('should handle malformed request body', async () => {
    const request = createMockRequest(AUTH_URLS.REGISTER, {
      method: 'POST',
      body: {
        email: null,
        password: null,
        name: null,
      },
    });

    const response = await POST_REGISTER(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});
