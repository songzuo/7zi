/**
 * Audit Log Module
 * Provides comprehensive audit logging with search and export capabilities
 */

export * from './types';
export * from './storage';
export * from './exporter';
export * from './manager';
export * from './api';

import { AuditLogManager } from './manager';

/**
 * Create a new audit log manager instance
 */
export function createAuditLogManager(): AuditLogManager {
  return new AuditLogManager();
}

/**
 * Default singleton instance
 */
export const auditLogManager = createAuditLogManager();