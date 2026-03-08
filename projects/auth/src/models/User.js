import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

export class User {
  constructor(data = {}) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.passwordHash = data.passwordHash;
    this.role = data.role || 'guest';
    this.isActive = data.isActive ?? true;
    this.createdAt = data.createdAt || new Date();
    this.lastLogin = data.lastLogin;
  }

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password) {
    return bcrypt.hash(password, config.security.bcryptRounds);
  }

  /**
   * Verify a password against the hash
   */
  async verifyPassword(password) {
    if (!this.passwordHash) {
      return false;
    }
    return bcrypt.compare(password, this.passwordHash);
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken() {
    const payload = {
      userId: this.id,
      username: this.username,
      email: this.email,
      role: this.role,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      algorithm: config.jwt.algorithm,
    });
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken() {
    const payload = {
      userId: this.id,
      type: 'refresh',
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
      algorithm: config.jwt.algorithm,
    });
  }

  /**
   * Generate token pair (access + refresh)
   */
  generateTokens() {
    return {
      accessToken: this.generateAccessToken(),
      refreshToken: this.generateRefreshToken(),
    };
  }

  /**
   * Get public user data (excluding sensitive info)
   */
  toPublic() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      lastLogin: this.lastLogin,
    };
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission) {
    return checkPermission(this.role, permission);
  }
}

/**
 * In-memory user storage (replace with database in production)
 */
export const userStore = new Map();

/**
 * Check if a role has a specific permission
 */
export function checkPermission(role, permission) {
  const roleConfig = config.roles[role];

  if (!roleConfig) {
    return false;
  }

  // Admin has all permissions
  if (roleConfig.permissions.includes('*')) {
    return true;
  }

  return roleConfig.permissions.includes(permission);
}

/**
 * Check if a role has higher priority than another
 */
export function hasHigherPriority(role1, role2) {
  const priority1 = config.roles[role1]?.priority || 0;
  const priority2 = config.roles[role2]?.priority || 0;
  return priority1 > priority2;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role) {
  const roleConfig = config.roles[role];
  return roleConfig?.permissions || [];
}