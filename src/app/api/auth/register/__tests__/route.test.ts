/**
 * Auth Register API Route Tests
 * Tests for /api/auth/register endpoint
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';
import { createMockRequest } from '@/test/mocks/api-mocks';

// Mock dependencies
vi.mock('@/lib/auth/service');
vi.mock('@/lib/auth/repository');
vi.mock('@/lib/logger');

import { registerUser } from '@/lib/auth/service';
import { getUserByEmail } from '@/lib/auth/repository';

describe('/api/auth/register', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'SecurePass123',
    name: 'Test User',
  };

  const mockCreatedUser = {
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
    vi.mocked(getUserByEmail).mockResolvedValue(null);
    vi.mocked(registerUser).mockResolvedValue({
      success: true,
      user: mockCreatedUser,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/auth/register - Success cases', () => {
    it('should register a new user successfully', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: testUser,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.email).toBe(testUser.email);
      expect(data.data.user.name).toBe(testUser.name);
      expect(data.data.user.role).toBe('member');
      expect(data.data.user.status).toBe('active');
      expect(data.data.user).not.toHaveProperty('password');
      expect(vi.mocked(registerUser)).toHaveBeenCalledWith({
        email: testUser.email,
        password: testUser.password,
        name: testUser.name,
      });
    });

    it('should create user with default role', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: testUser,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.user.role).toBe('member');
    });

    it('should return user with timestamps', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: testUser,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.user).toHaveProperty('createdAt');
      expect(data.data.user).toHaveProperty('updatedAt');
    });

    it('should not expose password in response', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: testUser,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.user.password).toBeUndefined();
    });
  });

  describe('POST /api/auth/register - Validation errors', () => {
    it('should reject registration without email', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          password: testUser.password,
          name: testUser.name,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Email, password, and name are required');
    });

    it('should reject registration without password', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          name: testUser.name,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject registration without name', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject empty email', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: '',
          password: testUser.password,
          name: testUser.name,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject empty password', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: '',
          name: testUser.name,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject empty name', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
          name: '',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: 'invalid-email',
          password: testUser.password,
          name: testUser.name,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid email format');
    });

    it('should reject email without @', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: 'invalidemail.com',
          password: testUser.password,
          name: testUser.name,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject email without domain', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: 'user@',
          password: testUser.password,
          name: testUser.name,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/register - Password validation', () => {
    it('should reject weak password (too short)', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: 'short',
          name: testUser.name,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('WEAK_PASSWORD');
      expect(data.error.message).toContain('at least 8 characters');
    });

    it('should reject password less than 8 characters', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: 'Pass1',
          name: testUser.name,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('WEAK_PASSWORD');
    });

    it('should reject weak password (no uppercase)', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: 'securepass123',
          name: testUser.name,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('WEAK_PASSWORD');
      expect(data.error.message).toContain('uppercase');
    });

    it('should reject weak password (no lowercase)', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: 'SECUREPASS123',
          name: testUser.name,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('WEAK_PASSWORD');
      expect(data.error.message).toContain('lowercase');
    });

    it('should reject weak password (no numbers)', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: 'SecurePassword',
          name: testUser.name,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('WEAK_PASSWORD');
      expect(data.error.message).toContain('number');
    });

    it('should reject password with only numbers', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: '12345678',
          name: testUser.name,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('WEAK_PASSWORD');
    });

    it('should accept strong password', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: 'StrongPass123',
          name: testUser.name,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should accept password with special characters', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: 'Secure@Pass123',
          name: testUser.name,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });
  });

  describe('POST /api/auth/register - Duplicate email', () => {
    it('should reject duplicate email registration', async () => {
      vi.mocked(registerUser).mockResolvedValue({
        success: false,
        error: 'Email already exists',
      });

      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: testUser,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('REGISTRATION_FAILED');
      expect(data.error.message).toContain('already exists');
    });

    it('should reject registration with existing email', async () => {
      vi.mocked(getUserByEmail).mockResolvedValue(mockCreatedUser);

      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: testUser,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/register - Error handling', () => {
    it('should handle service errors gracefully', async () => {
      vi.mocked(registerUser).mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: testUser,
      });

      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(response.status).toBeLessThan(600);
    });

    it('should handle malformed JSON', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing body', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
      });

      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle empty body', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {},
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle null values', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: null,
          password: null,
          name: null,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/register - Name validation', () => {
    it('should handle very short name', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
          name: 'AB',
        },
      });

      const response = await POST(request);

      // API may or may not validate minimum length
      expect([201, 400]).toContain(response.status);
    });

    it('should handle very long name', async () => {
      const longName = 'A'.repeat(300);

      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
          name: longName,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // Should reject or handle gracefully
      expect([400, 201]).toContain(response.status);
    });

    it('should accept name with special characters', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
          name: "O'Connor-Müller",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should trim name whitespace', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
          name: '  Test User  ',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.user.name).toBeDefined();
      // Should not have leading/trailing whitespace
      expect(data.data.user.name.trim()).toBe(data.data.user.name);
    });
  });

  describe('POST /api/auth/register - Edge cases', () => {
    it('should handle email with extra spaces', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: `  ${testUser.email}  `,
          password: testUser.password,
          name: testUser.name,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // Should either trim or validate
      expect([201, 400]).toContain(response.status);
    });

    it('should handle special characters in email', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: 'user+tag@example.com',
          password: testUser.password,
          name: testUser.name,
        },
      });

      const response = await POST(request);

      // Should either accept or validate
      expect([201, 400]).toContain(response.status);
    });

    it('should handle very long email', async () => {
      const longEmail = 'a'.repeat(300) + '@example.com';

      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: longEmail,
          password: testUser.password,
          name: testUser.name,
        },
      });

      const response = await POST(request);

      // Should reject or handle gracefully
      expect([201, 400, 500]).toContain(response.status);
    });

    it('should handle very long password', async () => {
      const longPassword = 'Aa1' + 'a'.repeat(1000);

      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: longPassword,
          name: testUser.name,
        },
      });

      const response = await POST(request);

      // Should not crash
      expect([201, 400, 500]).toContain(response.status);
    });

    it('should handle unicode in name', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
          name: '用户 名字',
        },
      });

      const response = await POST(request);

      // Should either accept or validate
      expect([201, 400]).toContain(response.status);
    });
  });
});
