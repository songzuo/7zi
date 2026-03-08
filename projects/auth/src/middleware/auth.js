import { extractTokenFromHeader, verifyToken } from '../utils/auth.js';
import { userStore } from '../models/User.js';

/**
 * Authentication middleware - verifies JWT token
 */
export function authenticate(req, res, next) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const decoded = verifyToken(token);
    const user = userStore.get(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User account is inactive',
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

/**
 * Authorization middleware - checks if user has required permission
 */
export function authorize(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (req.user.hasPermission(permission)) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        error: `Permission '${permission}' required`,
      });
    }
  };
}

/**
 * Role-based authorization middleware
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (allowedRoles.includes(req.user.role)) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        error: `One of these roles required: ${allowedRoles.join(', ')}`,
      });
    }
  };
}

/**
 * Require minimum role priority
 */
export function requireMinRole(minPriority) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const userPriority = req.user.constructor.config?.roles?.[req.user.role]?.priority || 0;

    if (userPriority >= minPriority) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role privileges',
      });
    }
  };
}

/**
 * Optional authentication - attaches user if token is valid, but doesn't require it
 */
export function optionalAuth(req, res, next) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const decoded = verifyToken(token);
      const user = userStore.get(decoded.userId);

      if (user && user.isActive) {
        req.user = user;
        req.userId = decoded.userId;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}