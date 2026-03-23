/**
 * L1 Cache Usage Examples
 *
 * Demonstrates how to use the L1 memory cache for common scenarios:
 * - Session caching
 * - Permission caching
 * - Configuration caching
 *
 * @module lib/cache/l1-cache.examples
 * @version 1.1.0
 */

import { L1Cache, createL1Cache } from './l1-cache';

// ============================================================================
// Example 1: Session Cache
// ============================================================================

interface SessionData {
  userId: string;
  username: string;
  role: string;
  loginTime: number;
  lastActivity: number;
  ipAddress: string;
}

/**
 * Session cache for user authentication data
 * - TTL: 30 minutes (user sessions are typically long-lived)
 * - Max entries: 500 (concurrent users)
 */
const sessionCache = new L1Cache<SessionData>({
  maxSize: 500,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  cleanupInterval: 5 * 60 * 1000, // Clean up every 5 minutes
  enableStats: true,
});

/**
 * Store user session
 */
async function storeUserSession(sessionId: string, sessionData: SessionData): Promise<void> {
  await sessionCache.set(sessionId, sessionData);
  console.log(`Session stored: ${sessionId}`);
}

/**
 * Get user session
 */
async function getUserSession(sessionId: string): Promise<SessionData | null> {
  const session = await sessionCache.get(sessionId);

  if (session) {
    console.log(`Session cache hit: ${sessionId}`);
  } else {
    console.log(`Session cache miss: ${sessionId}`);
  }

  return session;
}

/**
 * Invalidate user session (logout)
 */
async function invalidateUserSession(sessionId: string): Promise<void> {
  await sessionCache.delete(sessionId);
  console.log(`Session invalidated: ${sessionId}`);
}

/**
 * Example usage for session cache
 */
async function sessionCacheExample(): Promise<void> {
  const sessionId = 'session-abc123';

  // Store session
  await storeUserSession(sessionId, {
    userId: 'user-123',
    username: 'john_doe',
    role: 'admin',
    loginTime: Date.now(),
    lastActivity: Date.now(),
    ipAddress: '192.168.1.1',
  });

  // Retrieve session
  const session = await getUserSession(sessionId);
  if (session) {
    console.log(`User: ${session.username}, Role: ${session.role}`);
  }

  // Invalidate session
  await invalidateUserSession(sessionId);

  // Check statistics
  const stats = sessionCache.getStats();
  console.log('Session cache stats:', stats);
}

// ============================================================================
// Example 2: Permission Cache
// ============================================================================

interface Permission {
  resource: string;
  action: string;
  allowed: boolean;
  conditions?: Record<string, unknown>;
}

/**
 * Permission cache for authorization checks
 * - TTL: 10 minutes (permissions may change)
 * - Max entries: 1000 (many permission combinations)
 */
const permissionCache = createL1Cache<Permission[]>({
  maxSize: 1000,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  cleanupInterval: 2 * 60 * 1000, // Clean up every 2 minutes
  enableStats: true,
});

/**
 * Generate permission cache key
 */
function getPermissionKey(userId: string, resource: string): string {
  return `perm:${userId}:${resource}`;
}

/**
 * Check if user has permission
 */
async function checkPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const cacheKey = getPermissionKey(userId, resource);

  // Try cache first
  let permissions = await permissionCache.get(cacheKey);

  if (!permissions) {
    // Cache miss - fetch from database or other source
    console.log(`Permission cache miss: ${cacheKey}`);
    permissions = await fetchPermissionsFromDatabase(userId, resource);
    await permissionCache.set(cacheKey, permissions);
  } else {
    console.log(`Permission cache hit: ${cacheKey}`);
  }

  // Check specific permission
  const permission = permissions.find((p) => p.action === action);
  return permission?.allowed ?? false;
}

/**
 * Invalidate user permissions (when role changes)
 */
async function invalidateUserPermissions(userId: string): Promise<void> {
  // In a real implementation, you'd need to track all permission keys for a user
  // For simplicity, we'll clear the entire permission cache
  await permissionCache.clear();
  console.log(`Permissions invalidated for user: ${userId}`);
}

/**
 * Mock function to fetch permissions from database
 */
async function fetchPermissionsFromDatabase(
  userId: string,
  resource: string
): Promise<Permission[]> {
  // In production, this would query a database or external service
  return [
    { resource, action: 'read', allowed: true },
    { resource, action: 'write', allowed: false },
    { resource, action: 'delete', allowed: false },
  ];
}

/**
 * Example usage for permission cache
 */
async function permissionCacheExample(): Promise<void> {
  const userId = 'user-123';
  const resource = 'documents';

  // Check permissions
  const canRead = await checkPermission(userId, resource, 'read');
  const canWrite = await checkPermission(userId, resource, 'write');
  const canDelete = await checkPermission(userId, resource, 'delete');

  console.log(`Can read: ${canRead}, Can write: ${canWrite}, Can delete: ${canDelete}`);

  // Check statistics
  const stats = permissionCache.getStats();
  console.log('Permission cache stats:', stats);
}

// ============================================================================
// Example 3: Configuration Cache
// ============================================================================

interface AppConfig {
  featureFlags: Record<string, boolean>;
  rateLimits: Record<string, number>;
  uiSettings: Record<string, unknown>;
}

/**
 * Configuration cache for app settings
 * - TTL: 15 minutes (configs change infrequently)
 * - Max entries: 100 (different config scopes)
 */
const configCache = createL1Cache<AppConfig>({
  maxSize: 100,
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  cleanupInterval: 3 * 60 * 1000, // Clean up every 3 minutes
  enableStats: true,
});

/**
 * Get app configuration
 */
async function getAppConfig(scope: string = 'default'): Promise<AppConfig> {
  const cacheKey = `config:${scope}`;

  // Try cache first
  let config = await configCache.get(cacheKey);

  if (!config) {
    // Cache miss - fetch from database or config service
    console.log(`Config cache miss: ${cacheKey}`);
    config = await fetchConfigFromDatabase(scope);
    await configCache.set(cacheKey, config);
  } else {
    console.log(`Config cache hit: ${cacheKey}`);
  }

  return config;
}

/**
 * Invalidate configuration (when settings change)
 */
async function invalidateConfig(scope: string = 'default'): Promise<void> {
  const cacheKey = `config:${scope}`;
  await configCache.delete(cacheKey);
  console.log(`Configuration invalidated: ${cacheKey}`);
}

/**
 * Mock function to fetch config from database
 */
async function fetchConfigFromDatabase(scope: string): Promise<AppConfig> {
  // In production, this would query a database or config service
  return {
    featureFlags: {
      darkMode: true,
      betaFeatures: false,
      newDashboard: true,
    },
    rateLimits: {
      apiRequestsPerMinute: 100,
      uploadSizeMB: 50,
    },
    uiSettings: {
      theme: 'dark',
      language: 'en',
      dateFormat: 'YYYY-MM-DD',
    },
  };
}

/**
 * Example usage for configuration cache
 */
async function configCacheExample(): Promise<void> {
  // Get configuration
  const config = await getAppConfig('default');

  console.log('Feature flags:', config.featureFlags);
  console.log('Rate limits:', config.rateLimits);
  console.log('UI settings:', config.uiSettings);

  // Invalidate and reload
  await invalidateConfig('default');
  const newConfig = await getAppConfig('default');
  console.log('Reloaded config:', newConfig);

  // Check statistics
  const stats = configCache.getStats();
  console.log('Config cache stats:', stats);
}

// ============================================================================
// Example 4: Batch Operations
// ============================================================================

/**
 * Example of batch operations
 */
async function batchOperationsExample(): Promise<void> {
  const batchCache = createL1Cache<string>({
    maxSize: 100,
    defaultTTL: 5 * 60 * 1000,
  });

  // Batch set
  await batchCache.setMany([
    ['key1', 'value1', 60000],
    ['key2', 'value2', 120000],
    ['key3', 'value3'],
  ]);
  console.log('Batch set completed');

  // Batch get
  const results = await batchCache.getMany(['key1', 'key2', 'key3', 'key4']);
  console.log('Batch get results:', results);

  // Batch delete
  await batchCache.deleteMany(['key1', 'key2']);
  console.log('Batch delete completed');

  const stats = batchCache.getStats();
  console.log('Batch cache stats:', stats);
}

// ============================================================================
// Example 5: Sync API for Performance-Critical Paths
// ============================================================================

/**
 * Example of using sync API for high-performance scenarios
 */
function syncApiExample(): void {
  const syncCache = new L1Cache<number>({
    maxSize: 100,
    defaultTTL: 5 * 60 * 1000,
  });

  // Use sync API for performance-critical code
  syncCache.setSync('counter', 0);
  const value = syncCache.getSync('counter');

  console.log('Sync API example:', value);

  // You can still use async API for most cases
  syncCache.set('async-counter', 1).then(() => {
    console.log('Async set completed');
  });
}

// ============================================================================
// Export Examples for Testing
// ============================================================================

export {
  // Session cache
  sessionCache,
  storeUserSession,
  getUserSession,
  invalidateUserSession,
  sessionCacheExample,

  // Permission cache
  permissionCache,
  checkPermission,
  invalidateUserPermissions,
  permissionCacheExample,

  // Configuration cache
  configCache,
  getAppConfig,
  invalidateConfig,
  configCacheExample,

  // Batch operations
  batchOperationsExample,

  // Sync API
  syncApiExample,
};
