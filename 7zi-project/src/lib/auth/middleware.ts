/**
 * User Authentication Middleware - Unified Entry Point
 * This file redirects to the RBAC-enhanced middleware
 * Maintains backward compatibility for existing imports
 *
 * @deprecated Use specific middleware functions from './middleware-rbac' directly
 *   or import from './index' for the unified auth module
 */

// Re-export all from RBAC middleware for backward compatibility
export * from './middleware-rbac';
