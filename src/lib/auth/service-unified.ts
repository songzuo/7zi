/**
 * User Authentication Service (Unified Error Handling)
 * Handles user authentication with JWT tokens
 *
 * 使用统一的错误处理系统,抛出 UnifiedAppError 而不是返回 { success, error } 对象。
 *
 * @example
 * try {
 *   const result = await loginUser({ email, password });
 *   // result 直接是成功的用户数据
 * } catch (error) {
 *   if (isUnifiedError(error)) {
 *     // 处理统一错误
 *   }
 * }
 */

import { SignJWT, jwtVerify } from 'jose';
import {
  User,
  UserToken,
  UserContext,
  UserRole,
} from './types';
import { Role } from '@/lib/permissions/types';
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  createUserToken,
  validateUserToken,
  refreshUserToken,
  revokeUserToken,
  revokeAllUserTokens,
  updateLastLogin,
  createPasswordResetToken,
  validatePasswordResetToken,
  deletePasswordResetToken,
  verifyPassword,
} from './repository';
import { logger } from '../logger';
import {
  UnifiedAppError,
  UnifiedErrorType,
  isUnifiedError,
} from '../errors/unified-error';
import { ErrorCodes } from '../errors/unified-types';

/**
 * Get JWT secret
 * @throws {UnifiedAppError} If JWT_SECRET is not set in environment
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.AGENT_ENCRYPTION_SECRET;
  if (!secret) {
    throw UnifiedAppError.internal(
      'JWT_SECRET environment variable is required in production'
    );
  }
  return secret;
}

/**
 * Generate JWT token for user
 * @throws {UnifiedAppError} If JWT generation fails
 */
async function generateJwtToken(user: User, expiresIn: number = 3600): Promise<string> {
  try {
    const secret = new TextEncoder().encode(getJwtSecret());

    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      role: user.role,
      roles: user.roles || [],
      permissions: user.permissions,
      customPermissions: user.customPermissions || [],
      type: 'user',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
      .setIssuer('7zi-api')
      .setAudience('7zi-users')
      .sign(secret);

    return token;
  } catch (error) {
    logger.error('Failed to generate JWT token', error, { category: 'auth' });
    throw UnifiedAppError.internal('Failed to generate authentication token');
  }
}

/**
 * Verify JWT token and return user context
 * @returns User context or null if token is invalid
 */
export async function verifyJwtToken(token: string): Promise<UserContext | null> {
  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    const { payload } = await jwtVerify(token, secret, {
      issuer: '7zi-api',
      audience: '7zi-users',
    });

    if (payload.type !== 'user') {
      return null;
    }

    return {
      userId: payload.sub as string,
      email: payload.email as string,
      role: payload.role as UserRole,
      roles: payload.roles as Role[] || [],
      permissions: payload.permissions as string[] || [],
      customPermissions: payload.customPermissions as string[] || [],
    };
  } catch {
    return null;
  }
}

/**
 * Register a new user
 * @throws {UnifiedAppError} If registration fails
 */
export async function registerUser(request: {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}): Promise<Omit<User, 'password'>> {
  // Check if email already exists
  const existingUser = await getUserByEmail(request.email);
  if (existingUser) {
    throw UnifiedAppError.registrationFailed(
      'Email already registered',
      { email: request.email }
    );
  }

  // Validate password strength
  if (!isPasswordStrong(request.password)) {
    throw UnifiedAppError.weakPassword(
      'Password is too weak. Must be at least 8 characters with uppercase, lowercase, and number'
    );
  }

  // Create user
  const user = await createUser({
    email: request.email,
    password: request.password,
    name: request.name,
    role: request.role,
  });

  // Remove password from response
  const { password, ...userWithoutPassword } = user;

  return userWithoutPassword;
}

/**
 * Login user
 * @throws {UnifiedAppError} If login fails
 */
export async function loginUser(request: {
  email: string;
  password: string;
  rememberMe?: boolean;
}): Promise<{
  user: Omit<User, 'password'>;
  token: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  // Find user by email
  const user = await getUserByEmail(request.email);
  if (!user) {
    throw UnifiedAppError.unauthorized('Invalid email or password');
  }

  // Check user status
  if (user.status !== 'active') {
    throw UnifiedAppError.unauthorized('Account is not active');
  }

  // Verify password
  const isPasswordValid = verifyPassword(request.password, user.password);
  if (!isPasswordValid) {
    throw UnifiedAppError.unauthorized('Invalid email or password');
  }

  // Create JWT token
  const expiresIn = request.rememberMe ? 86400 * 7 : 3600; // 7 days if remember me, else 1 hour
  const token = await generateJwtToken(user, expiresIn);

  // Create database token record
  const dbToken = await createUserToken(user.id, expiresIn / 3600);

  // Update last login
  await updateLastLogin(user.id);

  // Remove password from response
  const { password, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
    refreshToken: dbToken.refreshToken,
    expiresAt: dbToken.expiresAt,
  };
}

/**
 * Logout user
 * @throws {UnifiedAppError} If logout fails
 */
export async function logoutUser(token: string): Promise<void> {
  try {
    await revokeUserToken(token);
  } catch (error) {
    logger.error('Logout failed', error, { category: 'auth' });
    throw UnifiedAppError.internal('Failed to logout');
  }
}

/**
 * Refresh token with improved error handling and race condition protection
 * @throws {UnifiedAppError} If refresh fails
 */
export async function refreshToken(refreshToken: string): Promise<{
  token: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  if (!refreshToken) {
    throw UnifiedAppError.unauthorized('Refresh token is required');
  }

  try {
    // Get current user info from refresh token before invalidating it
    const { getUserByRefreshToken } = await import('./repository');
    const tempResult = await getUserByRefreshToken(refreshToken);

    if (!tempResult) {
      throw UnifiedAppError.unauthorized('Invalid refresh token');
    }

    const { user, token: existingToken } = tempResult;

    // Check if user is active
    if (user.status !== 'active') {
      throw UnifiedAppError.unauthorized('User account is inactive');
    }

    // Check if refresh token is expired
    if (existingToken.refreshExpiresAt < new Date()) {
      throw UnifiedAppError.unauthorized('Refresh token has expired');
    }

    // Generate new JWT token
    const expiresIn = 3600; // 1 hour
    const token = await generateJwtToken(user, expiresIn);

    // Create new refresh token and invalidate old one
    const dbToken = await refreshUserToken(refreshToken);

    if (!dbToken) {
      throw UnifiedAppError.internal('Failed to refresh token');
    }

    return {
      token,
      refreshToken: dbToken.refreshToken,
      expiresAt: dbToken.expiresAt,
    };
  } catch (error) {
    // 如果是我们自己抛出的 UnifiedAppError,直接抛出
    if (isUnifiedError(error)) {
      throw error;
    }

    // 其他错误记录后转换为内部错误
    logger.error('Refresh token failed', error, { category: 'auth' });
    throw UnifiedAppError.internal('Failed to refresh token');
  }
}

/**
 * Verify token and get user with improved session validation
 * @returns User and context or null if token is invalid
 */
export async function authenticateToken(token: string): Promise<{ user: User; context: UserContext } | null> {
  if (!token) {
    return null;
  }

  try {
    // Verify JWT first
    const context = await verifyJwtToken(token);
    if (!context) {
      return null;
    }

    // Verify token in database
    const dbResult = await validateUserToken(token);
    if (!dbResult) {
      return null;
    }

    // Check user status
    if (dbResult.user.status !== 'active') {
      // Revoke token for inactive users
      await revokeUserToken(token);
      return null;
    }

    return {
      user: dbResult.user,
      context,
    };
  } catch (error) {
    logger.error('Token verification failed', error, { category: 'auth' });
    return null;
  }
}

/**
 * Change password
 * @throws {UnifiedAppError} If password change fails
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await getUserById(userId);
  if (!user) {
    throw UnifiedAppError.notFound('User not found');
  }

  // Verify current password
  const isPasswordValid = verifyPassword(currentPassword, user.password);
  if (!isPasswordValid) {
    throw UnifiedAppError.validation('Current password is incorrect');
  }

  // Validate new password
  if (!isPasswordStrong(newPassword)) {
    throw UnifiedAppError.weakPassword('New password is too weak');
  }

  // Update password
  await updateUser(userId, { password: newPassword });

  // Revoke all tokens to force re-login
  await revokeAllUserTokens(userId);
}

/**
 * Initiate password reset
 * @throws {UnifiedAppError} If password reset initiation fails
 */
export async function initiatePasswordReset(email: string): Promise<{ token?: string }> {
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return {};
    }

    // Create reset token (valid for 1 hour)
    const token = await createPasswordResetToken(user.id, 1);

    return { token };
  } catch (error) {
    logger.error('Password reset failed', error, { category: 'auth' });
    throw UnifiedAppError.internal('Failed to initiate password reset');
  }
}

/**
 * Reset password with token
 * @throws {UnifiedAppError} If password reset fails
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  // Validate reset token
  const user = await validatePasswordResetToken(token);
  if (!user) {
    throw UnifiedAppError.unauthorized('Invalid or expired reset token');
  }

  // Validate new password
  if (!isPasswordStrong(newPassword)) {
    throw UnifiedAppError.weakPassword('New password is too weak');
  }

  // Update password
  await updateUser(user.id, { password: newPassword });

  // Delete reset token
  await deletePasswordResetToken(token);

  // Revoke all tokens
  await revokeAllUserTokens(user.id);
}

/**
 * Check password strength
 */
function isPasswordStrong(password: string): boolean {
  // At least 8 characters
  if (password.length < 8) {
    return false;
  }

  // Contains uppercase letter
  if (!/[A-Z]/.test(password)) {
    return false;
  }

  // Contains lowercase letter
  if (!/[a-z]/.test(password)) {
    return false;
  }

  // Contains number
  if (!/[0-9]/.test(password)) {
    return false;
  }

  return true;
}

/**
 * Check if user has permission
 */
export function hasPermission(permissions: string[], requiredPermission: string): boolean {
  // Check exact match
  if (permissions.includes(requiredPermission)) {
    return true;
  }

  // Check wildcard permissions
  const [action, resource] = requiredPermission.split(':');
  if (
    permissions.includes(`${action}:*`) ||
    permissions.includes(`*:${resource}`) ||
    permissions.includes('*:*')
  ) {
    return true;
  }

  return false;
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(permissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some((p) => hasPermission(permissions, p));
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(permissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every((p) => hasPermission(permissions, p));
}
