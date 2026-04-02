/**
 * Authentication Mock for Testing
 * @description Provides mock implementations for authentication contexts and services
 */

import { vi, type MockedFunction } from "vitest";
import type { ReactElement } from "react";
import {
  type User,
  type UserContext,
  type UserToken,
  UserRole,
} from "@/lib/auth/types";
import { Role } from "@/lib/permissions/types";

/**
 * Mock user data
 */
export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  roles: Role[];
  permissions: string[];
  customPermissions?: string[];
  avatar?: string;
}

/**
 * Default mock user
 */
export const DEFAULT_MOCK_USER: MockUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  role: UserRole.MEMBER,
  roles: [Role.MEMBER],
  permissions: ["read:own", "update:own"],
  avatar: "https://example.com/avatar.png",
};

/**
 * Mock admin user
 */
export const MOCK_ADMIN_USER: MockUser = {
  id: "admin-123",
  email: "admin@example.com",
  name: "Admin User",
  role: UserRole.ADMIN,
  roles: [Role.ADMIN],
  permissions: ["read:all", "write:all", "delete:all", "manage:users"],
  avatar: "https://example.com/admin-avatar.png",
};

/**
 * Mock guest user
 */
export const MOCK_GUEST_USER: MockUser = {
  id: "guest-123",
  email: "guest@example.com",
  name: "Guest User",
  role: UserRole.GUEST,
  roles: [Role.GUEST],
  permissions: [],
};

/**
 * Create a mock user with custom properties
 */
export function createMockUser(
  overrides: Partial<MockUser> = {},
): MockUser {
  return {
    ...DEFAULT_MOCK_USER,
    id: overrides.id || `user-${Date.now()}`,
    email: overrides.email || `test${Date.now()}@example.com`,
    name: overrides.name || "Test User",
    ...overrides,
  };
}

/**
 * Mock user token
 */
export interface MockUserToken {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
}

/**
 * Default mock token
 */
export const DEFAULT_MOCK_TOKEN: MockUserToken = {
  id: "token-123",
  userId: DEFAULT_MOCK_USER.id,
  token: "mock-jwt-token",
  refreshToken: "mock-refresh-token",
  expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
  refreshExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 days from now
};

/**
 * Create a mock token
 */
export function createMockToken(
  userId: string = DEFAULT_MOCK_USER.id,
  overrides: Partial<MockUserToken> = {},
): MockUserToken {
  return {
    id: `token-${Date.now()}`,
    userId,
    token: `mock-jwt-token-${Date.now()}`,
    refreshToken: `mock-refresh-token-${Date.now()}`,
    expiresAt: new Date(Date.now() + 3600 * 1000),
    refreshExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    ...overrides,
  };
}

/**
 * Mock authentication context value
 */
export interface MockAuthContextValue {
  user: MockUser | null;
  userContext: UserContext | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: MockedFunction<(email: string, password: string) => Promise<void>>;
  logout: MockedFunction<() => Promise<void>>;
  register: MockedFunction<
    (email: string, password: string, name: string) => Promise<void>
  >;
  refreshToken: MockedFunction<() => Promise<void>>;
  hasPermission: MockedFunction<(permission: string) => boolean>;
  hasRole: MockedFunction<(role: Role | Role[]) => boolean>;
  updateUser: MockedFunction<(updates: Partial<MockUser>) => Promise<void>>;
}

/**
 * Create a mock auth context value
 */
export function createMockAuthContextValue(
  overrides: Partial<MockAuthContextValue> = {},
): MockAuthContextValue {
  const user = overrides.user || DEFAULT_MOCK_USER;
  const isAuthenticated = overrides.isAuthenticated ?? user !== null;

  return {
    user: user || null,
    userContext: user
      ? {
          userId: user.id,
          email: user.email,
          role: user.role,
          roles: user.roles,
          permissions: user.permissions,
          customPermissions: user.customPermissions,
        }
      : null,
    isAuthenticated,
    isLoading: overrides.isLoading ?? false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    refreshToken: vi.fn(),
    hasPermission: vi.fn((permission: string) => {
      return user?.permissions.includes(permission) || false;
    }),
    hasRole: vi.fn((role: Role | Role[]) => {
      if (!user) return false;
      if (Array.isArray(role)) {
        return role.some((r) => user.roles.includes(r));
      }
      return user.roles.includes(role);
    }),
    updateUser: vi.fn(),
    ...overrides,
  };
}

/**
 * Mock authentication service
 */
export interface MockAuthService {
  login: MockedFunction<
    (email: string, password: string) => Promise<{ user: MockUser; token: MockUserToken }>
  >;
  logout: MockedFunction<() => Promise<void>>;
  register: MockedFunction<
    (email: string, password: string, name: string) => Promise<{ user: MockUser; token: MockUserToken }>
  >;
  refreshToken: MockedFunction<(refreshToken: string) => Promise<MockUserToken>>;
  verifyToken: MockedFunction<(token: string) => Promise<UserContext>>;
  changePassword: MockedFunction<
    (currentPassword: string, newPassword: string) => Promise<void>
  >;
  forgotPassword: MockedFunction<(email: string) => Promise<void>>;
  resetPassword: MockedFunction<(token: string, newPassword: string) => Promise<void>>;
}

/**
 * Create a mock auth service
 */
export function createMockAuthService(
  overrides: Partial<MockAuthService> = {},
): MockAuthService {
  return {
    login: vi.fn(async (email: string, password: string) => {
      const user = createMockUser({ email });
      const token = createMockToken(user.id);
      return { user, token };
    }),
    logout: vi.fn(async () => {}),
    register: vi.fn(async (email: string, password: string, name: string) => {
      const user = createMockUser({ email, name });
      const token = createMockToken(user.id);
      return { user, token };
    }),
    refreshToken: vi.fn(async (refreshToken: string) => {
      return createMockToken(DEFAULT_MOCK_USER.id);
    }),
    verifyToken: vi.fn(async (token: string) => {
      return {
        userId: DEFAULT_MOCK_USER.id,
        email: DEFAULT_MOCK_USER.email,
        role: DEFAULT_MOCK_USER.role,
        roles: DEFAULT_MOCK_USER.roles,
        permissions: DEFAULT_MOCK_USER.permissions,
      };
    }),
    changePassword: vi.fn(async (currentPassword: string, newPassword: string) => {}),
    forgotPassword: vi.fn(async (email: string) => {}),
    resetPassword: vi.fn(async (token: string, newPassword: string) => {}),
    ...overrides,
  };
}

/**
 * Mock session data
 */
export interface MockSession {
  user: MockUser;
  token: MockUserToken;
  expiresAt: Date;
}

/**
 * Create a mock session
 */
export function createMockSession(
  overrides: Partial<MockSession> = {},
): MockSession {
  const user = overrides.user || DEFAULT_MOCK_USER;
  const token = overrides.token || createMockToken(user.id);
  return {
    user,
    token,
    expiresAt: token.expiresAt,
    ...overrides,
  };
}

/**
 * Permission check helper for tests
 */
export function checkMockPermission(
  user: MockUser,
  permission: string,
): boolean {
  return user.permissions.includes(permission) || false;
}

/**
 * Role check helper for tests
 */
export function checkMockRole(user: MockUser, role: Role | Role[]): boolean {
  if (Array.isArray(role)) {
    return role.some((r) => user.roles.includes(r));
  }
  return user.roles.includes(role);
}

/**
 * Create multiple mock users for testing
 */
export function createMockUsers(count: number): MockUser[] {
  return Array.from({ length: count }, (_, i) =>
    createMockUser({
      id: `user-${i + 1}`,
      email: `user${i + 1}@example.com`,
      name: `User ${i + 1}`,
      role: i === 0 ? UserRole.ADMIN : UserRole.MEMBER,
      roles: i === 0 ? [Role.ADMIN] : [Role.MEMBER],
      permissions: i === 0
        ? ["read:all", "write:all", "delete:all"]
        : ["read:own", "update:own"],
    }),
  );
}

/**
 * Mock authentication errors
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Invalid email or password",
  USER_NOT_FOUND: "User not found",
  TOKEN_EXPIRED: "Token has expired",
  TOKEN_INVALID: "Invalid token",
  PERMISSION_DENIED: "Permission denied",
  UNAUTHORIZED: "Unauthorized",
  EMAIL_EXISTS: "Email already exists",
  PASSWORD_WEAK: "Password is too weak",
} as const;

/**
 * Create a mock error response
 */
export function createMockAuthError(error: keyof typeof AUTH_ERRORS): Error {
  return new Error(AUTH_ERRORS[error]);
}

/**
 * Mock authentication state for testing hooks
 */
export function createMockAuthState(
  user: MockUser | null = DEFAULT_MOCK_USER,
) {
  return {
    user,
    isAuthenticated: user !== null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    hasPermission: vi.fn((permission: string) => {
      return user?.permissions.includes(permission) || false;
    }),
  };
}
