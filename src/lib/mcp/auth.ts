/**
 * MCP Authentication and Authorization
 * 
 * Provides permission control, access control, and audit logging:
 * - Tool access permissions
 * - Resource access control
 * - Role-based access control (RBAC)
 * - Audit logging
 * - Rate limiting
 * 
 * @module mcp/auth
 */

import { z } from 'zod';

/**
 * Permission level
 */
export type PermissionLevel = 'none' | 'read' | 'write' | 'execute' | 'admin';

/**
 * Resource scope
 */
export type ResourceScope = 
  | 'tools'
  | 'resources'
  | 'prompts'
  | 'sessions'
  | 'admin'
  | '*';

/**
 * Permission definition
 */
export interface Permission {
  /** Permission ID */
  id: string;
  /** Resource scope */
  scope: ResourceScope;
  /** Resource name (specific tool/resource/prompt) */
  resource: string;
  /** Permission level */
  level: PermissionLevel;
  /** Description */
  description?: string;
}

/**
 * Role definition
 */
export interface Role {
  /** Role ID */
  id: string;
  /** Role name */
  name: string;
  /** Role description */
  description?: string;
  /** Permissions granted by this role */
  permissions: Permission[];
  /** Priority (higher = more important) */
  priority: number;
  /** Whether role is built-in */
  builtin?: boolean;
}

/**
 * User session
 */
export interface UserSession {
  /** Session ID */
  id: string;
  /** User ID */
  userId?: string;
  /** User name */
  userName?: string;
  /** Assigned roles */
  roles: string[];
  /** Session metadata */
  metadata: Record<string, unknown>;
  /** Created timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** Expires timestamp */
  expiresAt?: Date;
}

/**
 * Access request
 */
export interface AccessRequest {
  /** Session ID */
  sessionId: string;
  /** Resource scope */
  scope: ResourceScope;
  /** Resource name */
  resource: string;
  /** Requested permission level */
  level: PermissionLevel;
  /** Action being performed */
  action: string;
  /** Request metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Access decision
 */
export interface AccessDecision {
  /** Whether access is granted */
  granted: boolean;
  /** Reason for decision */
  reason: string;
  /** Matched permissions */
  matchedPermissions: Permission[];
  /** Applicable rate limit */
  rateLimit?: number;
  /** Audit ID */
  auditId: string;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  /** Entry ID */
  id: string;
  /** Timestamp */
  timestamp: Date;
  /** Session ID */
  sessionId: string;
  /** User ID */
  userId?: string;
  /** Resource scope */
  scope: ResourceScope;
  /** Resource name */
  resource: string;
  /** Permission level */
  level: PermissionLevel;
  /** Action */
  action: string;
  /** Whether access was granted */
  granted: boolean;
  /** Reason */
  reason: string;
  /** Request metadata */
  requestMetadata?: Record<string, unknown>;
  /** Response metadata */
  responseMetadata?: Record<string, unknown>;
  /** Duration in milliseconds */
  duration?: number;
  /** Error if failed */
  error?: string;
}

/**
 * Rate limit state
 */
export interface RateLimitState {
  /** Window start time */
  windowStart: Date;
  /** Request count in window */
  count: number;
  /** Rate limit per minute */
  limit: number;
}

/**
 * Audit logger interface
 */
export interface AuditLogger {
  log(entry: AuditLogEntry): Promise<void>;
  query(filter: AuditQuery): Promise<AuditLogEntry[]>;
}

/**
 * Audit query
 */
export interface AuditQuery {
  /** Session ID filter */
  sessionId?: string;
  /** User ID filter */
  userId?: string;
  /** Scope filter */
  scope?: ResourceScope;
  /** Resource filter */
  resource?: string;
  /** Granted filter */
  granted?: boolean;
  /** Start timestamp */
  startTimestamp?: Date;
  /** End timestamp */
  endTimestamp?: Date;
  /** Limit */
  limit?: number;
  /** Offset */
  offset?: number;
}

/**
 * MCP Authorization Manager
 * 
 * Manages permissions, roles, and access control for MCP resources.
 */
export class MCPAuthManager {
  private roles: Map<string, Role> = new Map();
  private sessions: Map<string, UserSession> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private rateLimits: Map<string, RateLimitState> = new Map();
  private auditLogger: AuditLogger;
  private defaultRole: string = 'guest';

  constructor(auditLogger?: AuditLogger) {
    this.auditLogger = auditLogger || new ConsoleAuditLogger();
    this.initializeBuiltinRoles();
  }

  /**
   * Initialize built-in roles
   */
  private initializeBuiltinRoles(): void {
    // Guest role - minimal permissions
    this.addRole({
      id: 'guest',
      name: 'Guest',
      description: 'Minimal read-only access',
      priority: 0,
      builtin: true,
      permissions: [
        { id: 'guest-tools-read', scope: 'tools', resource: '*', level: 'read' },
        { id: 'guest-resources-read', scope: 'resources', resource: '*', level: 'read' },
        { id: 'guest-prompts-read', scope: 'prompts', resource: '*', level: 'read' },
      ],
    });

    // User role - standard access
    this.addRole({
      id: 'user',
      name: 'User',
      description: 'Standard user access with execute permissions',
      priority: 10,
      builtin: true,
      permissions: [
        { id: 'user-tools-read', scope: 'tools', resource: '*', level: 'read' },
        { id: 'user-tools-execute', scope: 'tools', resource: '*', level: 'execute' },
        { id: 'user-resources-read', scope: 'resources', resource: '*', level: 'read' },
        { id: 'user-resources-write', scope: 'resources', resource: '*', level: 'write' },
        { id: 'user-prompts-read', scope: 'prompts', resource: '*', level: 'read' },
      ],
    });

    // Developer role - extended access
    this.addRole({
      id: 'developer',
      name: 'Developer',
      description: 'Developer access with write permissions',
      priority: 20,
      builtin: true,
      permissions: [
        { id: 'dev-tools-*', scope: 'tools', resource: '*', level: 'execute' },
        { id: 'dev-resources-*', scope: 'resources', resource: '*', level: 'write' },
        { id: 'dev-prompts-*', scope: 'prompts', resource: '*', level: 'write' },
        { id: 'dev-sessions-*', scope: 'sessions', resource: '*', level: 'execute' },
      ],
    });

    // Admin role - full access
    this.addRole({
      id: 'admin',
      name: 'Administrator',
      description: 'Full administrative access',
      priority: 100,
      builtin: true,
      permissions: [
        { id: 'admin-all', scope: '*', resource: '*', level: 'admin' },
      ],
    });
  }

  /**
   * Add a role
   */
  addRole(role: Role): void {
    this.roles.set(role.id, role);
  }

  /**
   * Remove a role
   */
  removeRole(roleId: string): boolean {
    const role = this.roles.get(roleId);
    if (role?.builtin) {
      throw new MCPAuthError('Cannot remove built-in role', 'BUILTIN_ROLE');
    }
    return this.roles.delete(roleId);
  }

  /**
   * Get role by ID
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  /**
   * Get all roles
   */
  getRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Set default role for new sessions
   */
  setDefaultRole(roleId: string): void {
    if (!this.roles.has(roleId)) {
      throw new MCPAuthError(`Role "${roleId}" not found`, 'ROLE_NOT_FOUND');
    }
    this.defaultRole = roleId;
  }

  /**
   * Create a new session
   */
  createSession(userId?: string, roles: string[] = []): string {
    const sessionId = crypto.randomUUID();
    const effectiveRoles = roles.length > 0 ? roles : [this.defaultRole];

    const session: UserSession = {
      id: sessionId,
      userId,
      roles: effectiveRoles,
      metadata: {},
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): UserSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = new Date();
    }
    return session;
  }

  /**
   * Update session roles
   */
  updateSessionRoles(sessionId: string, roles: string[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new MCPAuthError('Session not found', 'SESSION_NOT_FOUND');
    }
    session.roles = roles;
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    this.rateLimits.delete(sessionId);
    return this.sessions.delete(sessionId);
  }

  /**
   * Check if access is granted
   */
  async checkAccess(request: AccessRequest): Promise<AccessDecision> {
    const auditId = crypto.randomUUID();
    const startTime = Date.now();

    // Get session
    const session = this.sessions.get(request.sessionId);
    if (!session) {
      return this.logAndReturnDecision(auditId, {
        granted: false,
        reason: 'Session not found',
        matchedPermissions: [],
        auditId,
      }, request, startTime);
    }

    // Check if session is expired
    if (session.expiresAt && new Date() > session.expiresAt) {
      return this.logAndReturnDecision(auditId, {
        granted: false,
        reason: 'Session expired',
        matchedPermissions: [],
        auditId,
      }, request, startTime);
    }

    // Collect all permissions from roles
    const allPermissions = this.collectPermissions(session.roles);

    // Find matching permissions
    const matchedPermissions = this.matchPermissions(
      allPermissions,
      request.scope,
      request.resource,
      request.level
    );

    // Check if any permission grants access
    const granted = this.evaluatePermissions(matchedPermissions, request.level);

    // Check rate limit
    let rateLimit: number | undefined;
    if (granted) {
      rateLimit = await this.checkRateLimit(request.sessionId);
    }

    const reason = granted
      ? 'Access granted'
      : 'Insufficient permissions';

    return this.logAndReturnDecision(auditId, {
      granted,
      reason,
      matchedPermissions,
      rateLimit,
      auditId,
    }, request, startTime);
  }

  /**
   * Collect permissions from roles
   */
  private collectPermissions(roleIds: string[]): Permission[] {
    const permissions: Permission[] = [];
    const added = new Set<string>();

    for (const roleId of roleIds) {
      const role = this.roles.get(roleId);
      if (role) {
        for (const perm of role.permissions) {
          if (!added.has(perm.id)) {
            permissions.push(perm);
            added.add(perm.id);
          }
        }
      }
    }

    return permissions;
  }

  /**
   * Match permissions to request
   */
  private matchPermissions(
    permissions: Permission[],
    scope: ResourceScope,
    resource: string,
    level: PermissionLevel
  ): Permission[] {
    const permissionLevels: Record<PermissionLevel, number> = {
      none: 0,
      read: 1,
      write: 2,
      execute: 3,
      admin: 4,
    };

    return permissions.filter(perm => {
      // Check scope
      if (perm.scope !== '*' && perm.scope !== scope) {
        return false;
      }

      // Check resource
      if (perm.resource !== '*' && perm.resource !== resource) {
        // Support glob patterns
        if (!this.matchGlob(perm.resource, resource)) {
          return false;
        }
      }

      // Check level
      if (permissionLevels[perm.level] < permissionLevels[level]) {
        return false;
      }

      return true;
    });
  }

  /**
   * Evaluate if permissions grant access
   */
  private evaluatePermissions(permissions: Permission[], requiredLevel: PermissionLevel): boolean {
    if (permissions.length === 0) return false;

    const permissionLevels: Record<PermissionLevel, number> = {
      none: 0,
      read: 1,
      write: 2,
      execute: 3,
      admin: 4,
    };

    return permissions.some(
      perm => permissionLevels[perm.level] >= permissionLevels[requiredLevel]
    );
  }

  /**
   * Check and update rate limit
   */
  private async checkRateLimit(sessionId: string): Promise<number> {
    const limit = 60; // Default: 60 requests per minute
    const now = new Date();
    const state = this.rateLimits.get(sessionId);

    if (!state || now.getTime() - state.windowStart.getTime() >= 60000) {
      // New window
      this.rateLimits.set(sessionId, {
        windowStart: now,
        count: 1,
        limit,
      });
      return limit;
    }

    // Increment count
    state.count++;
    return limit - state.count;
  }

  /**
   * Match glob pattern
   */
  private matchGlob(pattern: string, value: string): boolean {
    const regex = new RegExp(
      '^' + pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
        .replace(/\[([^\]]+)\]/g, '[$1]') + '$'
    );
    return regex.test(value);
  }

  /**
   * Log and return decision
   */
  private async logAndReturnDecision(
    auditId: string,
    decision: AccessDecision,
    request: AccessRequest,
    startTime: number
  ): Promise<AccessDecision> {
    const session = this.sessions.get(request.sessionId);

    const entry: AuditLogEntry = {
      id: auditId,
      timestamp: new Date(),
      sessionId: request.sessionId,
      userId: session?.userId,
      scope: request.scope,
      resource: request.resource,
      level: request.level,
      action: request.action,
      granted: decision.granted,
      reason: decision.reason,
      requestMetadata: request.metadata,
      duration: Date.now() - startTime,
    };

    await this.auditLogger.log(entry);

    return decision;
  }

  /**
   * Query audit logs
   */
  async queryAuditLogs(query: AuditQuery): Promise<AuditLogEntry[]> {
    return this.auditLogger.query(query);
  }

  /**
   * Get all sessions
   */
  getSessions(): UserSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of this.sessions) {
      if (session.expiresAt && now > session.expiresAt.getTime()) {
        this.sessions.delete(id);
        this.rateLimits.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      roles: this.roles.size,
      sessions: this.sessions.size,
      permissions: this.collectPermissions(Array.from(this.roles.keys())).length,
    };
  }
}

/**
 * Console audit logger (default)
 */
export class ConsoleAuditLogger implements AuditLogger {
  private entries: AuditLogEntry[] = [];
  private maxEntries: number = 10000;

  async log(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);

    // Enforce limit
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', entry.granted ? 'GRANT' : 'DENY', entry.action, entry.resource);
    }
  }

  async query(filter: AuditQuery): Promise<AuditLogEntry[]> {
    let results = this.entries;

    if (filter.sessionId) {
      results = results.filter(e => e.sessionId === filter.sessionId);
    }
    if (filter.userId) {
      results = results.filter(e => e.userId === filter.userId);
    }
    if (filter.scope) {
      results = results.filter(e => e.scope === filter.scope);
    }
    if (filter.resource) {
      results = results.filter(e => e.resource === filter.resource);
    }
    if (filter.granted !== undefined) {
      results = results.filter(e => e.granted === filter.granted);
    }
    if (filter.startTimestamp) {
      results = results.filter(e => e.timestamp >= filter.startTimestamp!);
    }
    if (filter.endTimestamp) {
      results = results.filter(e => e.timestamp <= filter.endTimestamp!);
    }

    const offset = filter.offset || 0;
    const limit = filter.limit || 100;

    return results.slice(offset, offset + limit);
  }
}

/**
 * File-based audit logger
 */
export class FileAuditLogger implements AuditLogger {
  private filePath: string;
  private buffer: AuditLogEntry[] = [];
  private flushInterval: number;
  private flushTimer?: NodeJS.Timeout;

  constructor(filePath: string, flushInterval: number = 5000) {
    this.filePath = filePath;
    this.flushInterval = flushInterval;
    this.startFlushTimer();
  }

  async log(entry: AuditLogEntry): Promise<void> {
    this.buffer.push(entry);
  }

  async query(filter: AuditQuery): Promise<AuditLogEntry[]> {
    // For file logger, this would read from file
    // Simplified implementation
    return [];
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = this.buffer.splice(0);
    const fs = await import('fs/promises');
    const path = await import('path');

    const logPath = path.join(this.filePath, `audit-${new Date().toISOString().split('T')[0]}.jsonl`);
    const lines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';

    await fs.appendFile(logPath, lines);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

/**
 * MCP Auth Error
 */
export class MCPAuthError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'MCPAuthError';
  }
}

/**
 * Global auth manager instance
 */
export const mcpAuthManager = new MCPAuthManager();

/**
 * Permission middleware for tools
 */
export async function withAuth<T>(
  request: AccessRequest,
  handler: () => Promise<T>
): Promise<T> {
  const decision = await mcpAuthManager.checkAccess(request);

  if (!decision.granted) {
    throw new MCPAuthError(decision.reason, 'ACCESS_DENIED');
  }

  return handler();
}

/**
 * Helper to create access request
 */
export function createAccessRequest(
  sessionId: string,
  scope: ResourceScope,
  resource: string,
  action: string,
  level: PermissionLevel = 'execute'
): AccessRequest {
  return {
    sessionId,
    scope,
    resource,
    action,
    level,
  };
}

export default MCPAuthManager;
