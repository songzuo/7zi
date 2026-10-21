/**
 * API Context Types
 * 
 * Type definitions for API route contexts
 */

import type { User, UserRole } from '@/lib/auth'

/**
 * Authenticated user context for API routes
 */
export interface APIUserContext {
  userId: string
  username: string
  email?: string
  role: UserRole
  authMethod?: 'jwt' | 'api-key'
}

/**
 * API route context parameter type
 */
export interface APIRouteContext {
  user: APIUserContext
}
