/**
 * Error Components and Utilities
 *
 * Shared error handling components for the application.
 */

// Error utils
export { analyzeErrorType, getErrorTitle, getErrorMessage } from './error-utils'

// Error pages
export { default as UnauthorizedPage } from './UnauthorizedPage'
export { default as ForbiddenPage } from './ForbiddenPage'

// Error boundary factory and pre-defined error boundaries
export { createPageErrorBoundary, HomeError, AboutError, BlogError, BlogSlugError, ContactError, DashboardError, TeamError } from './index.tsx'
