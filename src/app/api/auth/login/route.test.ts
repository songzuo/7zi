/**
 * Login API Route Tests
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { POST } from './route';
import { loginUser } from '@/lib/auth/service';
import { validateEmail, setAuthCookies, createSuccessResponse } from '@/lib/api/utils';
import {
  createValidationError,
  createUnauthorizedError,
  createErrorResponse,
} from '@/lib/api/error-handler';

// Mock dependencies
vi.mock('@/lib/auth/service');
vi.mock('@/lib/api/utils');
vi.mock('@/lib/api/error-handler');
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

describe('POST /api/auth/login', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock request with proper headers
    mockRequest = {
      json: vi.fn(),
      headers: {
        get: vi.fn().mockReturnValue('test-user-agent'),
      },
      method: 'POST',
      url: 'http://localhost:3000/api/auth/login',
    } as unknown as NextRequest;

    // Setup default mock responses
    (validateEmail as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (setAuthCookies as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    (createSuccessResponse as ReturnType<typeof vi.fn>).mockImplementation((data) => {
      return NextResponse.json({
        success: true,
        ...data,
      });
    });
  });

  describe('request validation', () => {
    it('should return validation error when email is missing', async () => {
      (mockRequest.json as ReturnType<typeof vi.fn>).mockResolvedValue({
        password: 'SecurePass123',
      });

      (createValidationError as ReturnType<typeof vi.fn>).mockReturnValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
          },
        })
      );

      const response = await POST(mockRequest);

      expect(createValidationError).toHaveBeenCalledWith('Email and password are required');
      expect(loginUser).not.toHaveBeenCalled();
    });

    it('should return validation error when password is missing', async () => {
      (mockRequest.json as ReturnType<typeof vi.fn>).mockResolvedValue({
        email: 'user@example.com',
      });

      (createValidationError as ReturnType<typeof vi.fn>).mockReturnValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
          },
        })
      );

      const response = await POST(mockRequest);

      expect(createValidationError).toHaveBeenCalledWith('Email and password are required');
      expect(loginUser).not.toHaveBeenCalled();
    });

    it('should return validation error when both fields are missing', async () => {
      (mockRequest.json as ReturnType<typeof vi.fn>).mockResolvedValue({});

      (createValidationError as ReturnType<typeof vi.fn>).mockReturnValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
          },
        })
      );

      const response = await POST(mockRequest);

      expect(createValidationError).toHaveBeenCalledWith('Email and password are required');
      expect(loginUser).not.toHaveBeenCalled();
    });

    it('should return validation error when email format is invalid', async () => {
      (mockRequest.json as ReturnType<typeof vi.fn>).mockResolvedValue({
        email: 'invalid-email',
        password: 'SecurePass123',
      });

      (validateEmail as ReturnType<typeof vi.fn>).mockReturnValue(false);

      (createValidationError as ReturnType<typeof vi.fn>).mockReturnValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format',
          },
        })
      );

      const response = await POST(mockRequest);

      expect(validateEmail).toHaveBeenCalledWith('invalid-email');
      expect(createValidationError).toHaveBeenCalledWith('Invalid email format');
      expect(loginUser).not.toHaveBeenCalled();
    });
  });

  describe('authentication flow', () => {
    it('should authenticate user with valid credentials', async () => {
      (mockRequest.json as ReturnType<typeof vi.fn>).mockResolvedValue({
        email: 'user@example.com',
        password: 'SecurePass123',
      });

      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Test User',
      };

      const mockToken = 'mock-jwt-token';
      const mockExpiresAt = new Date(Date.now() + 3600000);

      (loginUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: mockUser,
        token: mockToken,
        refreshToken: null,
        expiresAt: mockExpiresAt,
      });

      (createSuccessResponse as ReturnType<typeof vi.fn>).mockReturnValue(
        NextResponse.json({
          success: true,
          user: mockUser,
          token: mockToken,
          refreshToken: null,
          expiresAt: mockExpiresAt.toISOString(),
        })
      );

      const response = await POST(mockRequest);

      expect(loginUser).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'SecurePass123',
        rememberMe: undefined,
      });

      expect(createSuccessResponse).toHaveBeenCalledWith({
        user: mockUser,
        token: mockToken,
        refreshToken: null,
        expiresAt: mockExpiresAt.toISOString(),
      });

      expect(setAuthCookies).toHaveBeenCalledWith(
        expect.any(NextResponse),
        mockToken,
        null,
        false
      );
    });

    it('should authenticate user with remember me enabled', async () => {
      (mockRequest.json as ReturnType<typeof vi.fn>).mockResolvedValue({
        email: 'user@example.com',
        password: 'SecurePass123',
        rememberMe: true,
      });

      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Test User',
      };

      const mockToken = 'mock-jwt-token';
      const mockRefreshToken = 'mock-refresh-token';
      const mockExpiresAt = new Date(Date.now() + 3600000);

      (loginUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: mockUser,
        token: mockToken,
        refreshToken: mockRefreshToken,
        expiresAt: mockExpiresAt,
      });

      const response = await POST(mockRequest);

      expect(loginUser).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'SecurePass123',
        rememberMe: true,
      });

      expect(setAuthCookies).toHaveBeenCalledWith(
        expect.any(NextResponse),
        mockToken,
        mockRefreshToken,
        true
      );
    });

    it('should return unauthorized error for invalid credentials', async () => {
      (mockRequest.json as ReturnType<typeof vi.fn>).mockResolvedValue({
        email: 'user@example.com',
        password: 'WrongPassword123',
      });

      (loginUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Invalid email or password',
      });

      (createUnauthorizedError as ReturnType<typeof vi.fn>).mockReturnValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Invalid email or password',
          },
        })
      );

      const response = await POST(mockRequest);

      expect(createUnauthorizedError).toHaveBeenCalledWith('Invalid email or password');
      expect(setAuthCookies).not.toHaveBeenCalled();
    });

    it('should return unauthorized error when service returns generic failure', async () => {
      (mockRequest.json as ReturnType<typeof vi.fn>).mockResolvedValue({
        email: 'user@example.com',
        password: 'SecurePass123',
      });

      (loginUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
      });

      (createUnauthorizedError as ReturnType<typeof vi.fn>).mockReturnValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Login failed',
          },
        })
      );

      const response = await POST(mockRequest);

      expect(createUnauthorizedError).toHaveBeenCalledWith('Login failed');
    });
  });

  describe('error handling', () => {
    it('should handle JSON parsing errors', async () => {
      (mockRequest.json as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Invalid JSON')
      );

      (createErrorResponse as ReturnType<typeof vi.fn>).mockReturnValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An error occurred during login',
          },
        })
      );

      const response = await POST(mockRequest);

      expect(createErrorResponse).toHaveBeenCalledWith(expect.any(Error));
      expect(loginUser).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      (mockRequest.json as ReturnType<typeof vi.fn>).mockResolvedValue({
        email: 'user@example.com',
        password: 'SecurePass123',
      });

      (loginUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection failed')
      );

      (createErrorResponse as ReturnType<typeof vi.fn>).mockReturnValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An error occurred during login',
          },
        })
      );

      const response = await POST(mockRequest);

      expect(createErrorResponse).toHaveBeenCalledWith(
        new Error('Database connection failed')
      );
    });
  });

  describe('response format', () => {
    it('should return standardized success response', async () => {
      (mockRequest.json as ReturnType<typeof vi.fn>).mockResolvedValue({
        email: 'user@example.com',
        password: 'SecurePass123',
      });

      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Test User',
      };

      (loginUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'mock-token',
        refreshToken: null,
        expiresAt: new Date(),
      });

      const response = await POST(mockRequest);

      expect(createSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          token: 'mock-token',
        })
      );
    });

    it('should include expiresAt in ISO format when provided', async () => {
      (mockRequest.json as ReturnType<typeof vi.fn>).mockResolvedValue({
        email: 'user@example.com',
        password: 'SecurePass123',
      });

      const mockExpiresAt = new Date('2026-03-19T12:00:00.000Z');

      (loginUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: { id: '1', email: 'user@example.com', name: 'Test User' },
        token: 'mock-token',
        refreshToken: null,
        expiresAt: mockExpiresAt,
      });

      const response = await POST(mockRequest);

      expect(createSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: mockExpiresAt.toISOString(),
        })
      );
    });

    it('should set auth cookies on successful response', async () => {
      (mockRequest.json as ReturnType<typeof vi.fn>).mockResolvedValue({
        email: 'user@example.com',
        password: 'SecurePass123',
      });

      const mockResponse = NextResponse.json({ success: true });

      (loginUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: { id: '1', email: 'user@example.com', name: 'Test User' },
        token: 'mock-token',
        refreshToken: null,
        expiresAt: new Date(),
      });

      (createSuccessResponse as ReturnType<typeof vi.fn>).mockReturnValue(mockResponse);

      await POST(mockRequest);

      expect(setAuthCookies).toHaveBeenCalledWith(
        mockResponse,
        'mock-token',
        null,
        undefined
      );
    });
  });
});
