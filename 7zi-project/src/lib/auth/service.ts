/**
 * User Authentication Service
 * Handles user authentication with JWT tokens
 */

import { SignJWT, jwtVerify } from 'jose';
import {
  User,
  UserToken,
  LoginRequest,
  LoginResponse,
  LoginSuccessResponse,
  LoginFailureResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RefreshTokenSuccessResponse,
  RefreshTokenFailureResponse,
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

/**
 * Get JWT secret
 * @throws {Error} If JWT_SECRET is not set in environment
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.AGENT_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  return secret;
}

/**
 * Generate JWT token for user
 */
async function generateJwtToken(user: User, expiresIn: number = 3600): Promise<string> {
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
}

/**
 * Verify JWT token and return user context
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
 */
export async function registerUser(request: RegisterRequest): Promise<RegisterResponse> {
  try {
    // Check if email already exists
    const existingUser = await getUserByEmail(request.email);
    if (existingUser) {
      return {
        success: false,
        error: 'Email already registered',
      };
    }

    // Validate password strength
    if (!isPasswordStrong(request.password)) {
      return {
        success: false,
        error: 'Password is too weak. Must be at least 8 characters with uppercase, lowercase, and number',
      };
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

    return {
      success: true,
      user: userWithoutPassword,
    };
  } catch (error) {
    logger.error('Registration failed', error, { category: 'auth' });
    return {
      success: false,
      error: 'Registration failed',
    };
  }
}

/**
 * Login user
 */
export async function loginUser(request: LoginRequest): Promise<LoginSuccessResponse | LoginFailureResponse> {
  try {
    // Find user by email
    const user = await getUserByEmail(request.email);
    if (!user) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Check user status
    if (user.status !== 'active') {
      return {
        success: false,
        error: 'Account is not active',
      };
    }

    // Verify password
    const isPasswordValid = verifyPassword(request.password, user.password);
    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
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
      success: true,
      user: userWithoutPassword,
      token,
      refreshToken: dbToken.refreshToken,
      expiresAt: dbToken.expiresAt,
    };
  } catch (error) {
    logger.error('Login failed', error, { category: 'auth' });
    return {
      success: false,
      error: 'Login failed',
    };
  }
}

/**
 * Logout user
 */
export async function logoutUser(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    await revokeUserToken(token);
    return { success: true };
  } catch (error) {
    logger.error('Logout failed', error, { category: 'auth' });
    return {
      success: false,
      error: 'Logout failed',
    };
  }
}

/**
 * Refresh token with improved error handling and race condition protection
 */
export async function refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenSuccessResponse | RefreshTokenFailureResponse> {
  if (!request.refreshToken) {
    return {
      success: false,
      error: 'REFRESH_TOKEN_REQUIRED',
    };
  }

  try {
    // Get current user info from refresh token before invalidating it
    const { getUserByRefreshToken } = await import('./repository');
    const tempResult = await getUserByRefreshToken(request.refreshToken);
    
    if (!tempResult) {
      return {
        success: false,
        error: 'INVALID_REFRESH_TOKEN',
      };
    }

    const { user, token: existingToken } = tempResult;

    // Check if user is active
    if (user.status !== 'active') {
      return {
        success: false,
        error: 'USER_INACTIVE',
      };
    }

    // Check if refresh token is expired
    if (existingToken.refreshExpiresAt < new Date()) {
      return {
        success: false,
        error: 'REFRESH_TOKEN_EXPIRED',
      };
    }

    // Generate new JWT token
    const expiresIn = 3600; // 1 hour
    const token = await generateJwtToken(user, expiresIn);

    // Create new refresh token and invalidate old one
    const dbToken = await refreshUserToken(request.refreshToken);
    
    if (!dbToken) {
      return {
        success: false,
        error: 'REFRESH_FAILED',
      };
    }

    return {
      success: true,
      token,
      refreshToken: dbToken.refreshToken,
      expiresAt: dbToken.expiresAt,
    };
  } catch (error) {
    logger.error('Refresh token failed', error, { category: 'auth' });
    return {
      success: false,
      error: 'TOKEN_REFRESH_ERROR',
    };
  }
}

/**
 * Verify token and get user with improved session validation
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
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUserById(userId);
    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Verify current password
    const isPasswordValid = verifyPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Current password is incorrect',
      };
    }

    // Validate new password
    if (!isPasswordStrong(newPassword)) {
      return {
        success: false,
        error: 'New password is too weak',
      };
    }

    // Update password
    await updateUser(userId, { password: newPassword });

    // Revoke all tokens to force re-login
    await revokeAllUserTokens(userId);

    return { success: true };
  } catch (error) {
    logger.error('Change password failed', error, { category: 'auth' });
    return {
      success: false,
      error: 'Password change failed',
    };
  }
}

/**
 * Initiate password reset
 */
export async function initiatePasswordReset(email: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return { success: true };
    }

    // Create reset token (valid for 1 hour)
    const token = await createPasswordResetToken(user.id, 1);

    return { success: true, token };
  } catch (error) {
    logger.error('Password reset failed', error, { category: 'auth' });
    return {
      success: false,
      error: 'Password reset failed',
    };
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate reset token
    const user = await validatePasswordResetToken(token);
    if (!user) {
      return {
        success: false,
        error: 'Invalid or expired reset token',
      };
    }

    // Validate new password
    if (!isPasswordStrong(newPassword)) {
      return {
        success: false,
        error: 'New password is too weak',
      };
    }

    // Update password
    await updateUser(user.id, { password: newPassword });

    // Delete reset token
    await deletePasswordResetToken(token);

    // Revoke all tokens
    await revokeAllUserTokens(user.id);

    return { success: true };
  } catch (error) {
    logger.error('Reset password failed', error, { category: 'auth' });
    return {
      success: false,
      error: 'Password reset failed',
    };
  }
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
