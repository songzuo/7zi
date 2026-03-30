/**
 * Security Module Index
 *
 * Central export point for all security-related utilities
 * @module security
 */

// ============================================================================
// Encryption
// ============================================================================

export {
  encryptGCM,
  decryptGCM,
  encryptApiKeyGCM,
  decryptApiKeyGCM,
  encryptSensitiveFields,
  decryptSensitiveFields,
  generateEncryptionKey,
  validateEncryptionKey,
} from './encryption';

export type {
  EncryptedData,
  EncryptionOptions,
} from './encryption';

// ============================================================================
// WebSocket Security
// ============================================================================

export {
  getWSSecurityManager,
  destroyWSSecurityManager,
  getClientIP,
  createSecurityError,
  formatBytes,
} from './websocket-security';

export type {
  WSSecurityConfig,
  WSSecurityMetrics,
} from './websocket-security';

// ============================================================================
// CSRF Protection
// ============================================================================

export {
  generateCSRFToken,
  validateCSRFToken,
  validateCSRFTokenWithExpiry,
  generateSessionCSRFToken,
  validateSessionCSRFToken,
  getCSRFTokenFromRequest,
  setCSRFTokenInResponse,
  getCSRFSecret,
  generateCSRFFromEnv,
  validateCSFFromEnv,
  shouldProtectFromCSRF,
  hasCSRFToken,
  isTokenExpired,
  getTokenRemainingTime,
  formatTokenExpiry,
} from './csrf';

export type {
  CSRFTokenOptions,
  CSRFToken,
} from './csrf';

// ============================================================================
// Signature Verification
// ============================================================================

export {
  generateSignature,
  generateSignatureWithTimestamp,
  validateSignature,
  validateSignatureWithTimestamp,
  signHTTPRequest,
  validateHTTPRequestSignature,
  addSignatureToHeaders,
  extractSignatureData,
  validateNextRequest,
  getSignatureSecret,
  signWithEnvSecret,
  validateWithEnvSecret,
  requiresSignatureValidation,
} from './signature';

export type {
  SignatureConfig,
  SignedRequestData,
  SignatureResult,
} from './signature';

// ============================================================================
// Log Sanitization
// ============================================================================

export {
  maskValue,
  maskEmail,
  maskPhone,
  maskCreditCard,
  redactValue,
  isSensitiveField,
  sanitizeValue,
  sanitizeStringValue,
  sanitizeObject,
  sanitizeLogEntry,
  sanitizeHeaders,
  sanitizeURL,
  sanitizeError,
  addSensitivePattern,
  addValuePattern,
  resetPatterns,
} from './log-sanitizer';

export type {
  SanitizationConfig,
  SensitiveField,
} from './log-sanitizer';

// ============================================================================
// SQL Injection Protection
// ============================================================================

export {
  checkSQLInjection,
  checkObjectForSQLInjection,
  escapeSQLString,
  removeSQLComments,
  sanitizeSQLInput,
  validateAndSanitizeSQLInput,
  isValidIdentifier,
  isValidSortDirection,
  validateLimit,
  validateOffset,
  buildSafeCondition,
  buildSafeOrder,
  createSQLInjectionMiddleware,
  isRequestSafe,
} from './sql-injection';

export type {
  SQLInjectionCheckResult,
  SQLInjectionConfig,
} from './sql-injection';

// ============================================================================
// Security Headers
// ============================================================================

export {
  applySecurityHeaders,
  getSecurityHeaders,
  generateCSP,
  generateHSTS,
  generatePermissionsPolicy,
  getSecurityConfig,
} from './headers';

export type {
  SecurityHeadersConfig,
} from './headers';

// ============================================================================
// Middleware (Combined)
// ============================================================================

export {
  withSecurity,
  withPublicSecurity,
  withAuthSecurity,
  withProtectedSecurity,
  withAdminSecurity,
  getSanitizedBody,
  getSanitizedQuery,
  getSecurityContext,
} from '../middleware/security';

export type {
  SecurityMiddlewareConfig,
  SecurityContext,
} from '../middleware/security';

// ============================================================================
// Re-exports from subdirectories
// ============================================================================

// RBAC
export * from './rbac';

// Rate limiting has been merged into src/lib/rate-limit
// Use: import { ... } from '@/lib/rate-limit'
