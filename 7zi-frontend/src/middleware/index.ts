/**
 * Middleware Exports
 *
 * Central export point for all middleware modules.
 * Import individual middleware functions from this file.
 *
 * @module @/middleware
 */

// Authentication middleware
export {
  authMiddleware,
  checkPermissions,
  requireAuth,
  getUserId,
  getUserRole,
  type AuthResult,
} from './auth.middleware';
