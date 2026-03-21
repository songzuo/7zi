/**
 * @fileoverview Auth API integration tests
 * @description Tests for /api/auth/* endpoints using MSW
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { server } from './mocks/handlers';
import { MockDataGenerator } from './mocks/data';

const mockData = new MockDataGenerator();

describe('/api/auth - Integration Tests', () => {
  beforeEach(() => {
    server.listen();
    mockData.resetUsers();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'newuser@example.com',
      password: 'SecurePass123',
      name: 'New User',
    };

    it('should register a new user successfully', async () => {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validUserData),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.email).toBe(validUserData.email);
      expect(data.data.user.name).toBe(validUserData.name);
      expect(data.data.user).not.toHaveProperty('password');
    });

    it('should reject registration without email', async () => {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: validUserData.password,
          name: validUserData.name,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject registration without password', async () => {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: validUserData.email,
          name: validUserData.name,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-email',
          password: validUserData.password,
          name: validUserData.name,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Invalid email format');
    });

    it('should reject weak password (too short)', async () => {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: validUserData.email,
          password: 'short',
          name: validUserData.name,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.type).toBe('WEAK_PASSWORD');
    });

    it('should reject weak password (no uppercase)', async () => {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: validUserData.email,
          password: 'securepass123',
          name: validUserData.name,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.type).toBe('WEAK_PASSWORD');
    });

    it('should reject weak password (no lowercase)', async () => {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: validUserData.email,
          password: 'SECUREPASS123',
          name: validUserData.name,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.type).toBe('WEAK_PASSWORD');
    });

    it('should reject weak password (no numbers)', async () => {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: validUserData.email,
          password: 'SecurePassword',
          name: validUserData.name,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.type).toBe('WEAK_PASSWORD');
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validUserData),
      });

      // Second registration with same email
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validUserData),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      email: 'loginuser@example.com',
      password: 'LoginPass123',
      name: 'Login User',
    };

    beforeEach(async () => {
      // Register user before each login test
      await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      });
    });

    it('should login with valid credentials', async () => {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.email).toBe(testUser.email);
      expect(data.data.token).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();
      expect(data.data.expiresAt).toBeDefined();
    });

    it('should reject login without email', async () => {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: testUser.password,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject login without password', async () => {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject login with invalid email format', async () => {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-email',
          password: testUser.password,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject login with wrong credentials', async () => {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: 'WrongPassword123',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('UNAUTHORIZED');
    });

    it('should reject login with non-existent user', async () => {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: testUser.password,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout with valid token', async () => {
      // First, login to get a token
      const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
        }),
      });

      const loginData = await loginResponse.json();
      const token = loginData.data.token;

      // Logout
      const response = await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.timestamp).toBeDefined();
    });

    it('should reject logout without token', async () => {
      const response = await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject logout with invalid token format', async () => {
      const response = await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': 'InvalidFormat',
        },
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user information with valid token', async () => {
      // Login to get a token
      const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
        }),
      });

      const loginData = await loginResponse.json();
      const token = loginData.data.token;

      // Get user info
      const response = await fetch('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.email).toBe('test@example.com');
      expect(data.data).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      const response = await fetch('http://localhost:3000/api/auth/me', {
        method: 'GET',
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await fetch('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      // Login to get tokens
      const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
        }),
      });

      const loginData = await loginResponse.json();
      const refreshToken = loginData.data.refreshToken;

      // Refresh token
      const response = await fetch('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();
      expect(data.data.expiresAt).toBeDefined();
    });

    it('should reject refresh without refresh token', async () => {
      const response = await fetch('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Refresh token is required');
    });

    it('should reject refresh with invalid refresh token', async () => {
      const response = await fetch('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: 'invalid-refresh-token',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject refresh with invalid refresh token format', async () => {
      const response = await fetch('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: 'short',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Invalid refresh token format');
    });
  });

  describe('Integration Flows', () => {
    it('should successfully register, login, get user info, and logout', async () => {
      // Step 1: Register
      const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'integration@example.com',
          password: 'IntegrationPass123',
          name: 'Integration User',
        }),
      });

      expect(registerResponse.status).toBe(201);

      // Step 2: Login
      const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'integration@example.com',
          password: 'IntegrationPass123',
        }),
      });

      expect(loginResponse.status).toBe(200);
      const loginData = await loginResponse.json();
      const token = loginData.data.token;

      // Step 3: Get user info
      const meResponse = await fetch('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      expect(meResponse.status).toBe(200);
      const meData = await meResponse.json();
      expect(meData.data.email).toBe('integration@example.com');

      // Step 4: Logout
      const logoutResponse = await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      expect(logoutResponse.status).toBe(200);
    });

    it('should handle token refresh flow', async () => {
      // Login to get tokens
      const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
        }),
      });

      const loginData = await loginResponse.json();
      const originalToken = loginData.data.token;
      const refreshToken = loginData.data.refreshToken;

      // Refresh token
      const refreshResponse = await fetch('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken,
        }),
      });

      const refreshData = await refreshResponse.json();
      const newToken = refreshData.data.token;

      // Verify new token is different
      expect(newToken).not.toBe(originalToken);

      // Use new token to get user info
      const meResponse = await fetch('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${newToken}`,
        },
      });

      expect(meResponse.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      // Should not crash
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle empty request body', async () => {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle null values in request body', async () => {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: null,
          password: null,
          name: null,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
