/**
 * Auth Plugin
 * Authentication and authorization with multiple providers
 */

import {
  Plugin,
  PluginMetadata,
  PluginConfig,
  PluginContext,
  PluginHealthStatus,
  PluginMetrics,
  HookHandler,
  HookRegistry,
} from '../../types';

export interface AuthPluginConfig {
  providers: AuthProvider[];
  sessionTimeout: number;
  maxAttempts: number;
  lockoutDuration: number;
  passwordPolicy: PasswordPolicy;
}

export interface AuthProvider {
  type: 'local' | 'oauth' | 'jwt' | 'ldap' | 'saml';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  createdAt: Date;
  lastLogin?: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

export class AuthPlugin implements Plugin {
  metadata: PluginMetadata = {
    id: '@openclaw/plugin-auth',
    name: 'Auth Plugin',
    version: '1.0.0',
    description: 'Authentication and authorization with multiple providers',
    category: 'authentication',
    tags: ['auth', 'security', 'oauth', 'jwt'],
    author: {
      name: 'OpenClaw Team',
      email: 'team@openclaw.com',
    },
    license: 'MIT',
  };

  config: PluginConfig = {
    id: this.metadata.id,
    enabled: true,
    priority: 95,
    config: {
      providers: [
        { type: 'local', enabled: true },
        { type: 'jwt', enabled: true },
      ],
      sessionTimeout: 3600,
      maxAttempts: 5,
      lockoutDuration: 900,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        maxAge: 90,
      },
    } as AuthPluginConfig,
  };

  private context?: PluginContext;
  private users: Map<string, User> = new Map();
  private sessions: Map<string, Session> = new Map();
  private attempts: Map<string, number> = new Map();
  private lockouts: Map<string, Date> = new Map();
  private metrics = {
    logins: 0,
    logouts: 0,
    failedAttempts: 0,
    sessionsCreated: 0,
    sessionsExpired: 0,
  };

  /**
   * Initialize plugin
   */
  async init(context: PluginContext): Promise<void> {
    this.context = context;
    context.logger.info('Auth plugin initialized');

    // Start cleanup timer
    setInterval(() => this.cleanupSessions(), 60000); // Every minute
  }

  /**
   * Start plugin
   */
  async start(): Promise<void> {
    this.context?.logger.info('Auth plugin started');
  }

  /**
   * Stop plugin
   */
  async stop(): Promise<void> {
    this.sessions.clear();
    this.context?.logger.info('Auth plugin stopped');
  }

  /**
   * Destroy plugin
   */
  async destroy(): Promise<void> {
    this.users.clear();
    this.sessions.clear();
    this.attempts.clear();
    this.lockouts.clear();
    this.context?.logger.info('Auth plugin destroyed');
  }

  /**
   * Register hooks
   */
  registerHooks(registry: HookRegistry): void {
    registry.register('onAuthAttempt', this.handleAuthAttempt.bind(this) as HookHandler);
    registry.register('onAuthSuccess', this.handleAuthSuccess.bind(this) as HookHandler);
    registry.register('onAuthFailure', this.handleAuthFailure.bind(this) as HookHandler);
  }

  /**
   * Execute plugin action
   */
  async execute<TInput = any, TOutput = any>(
    action: string,
    input?: TInput
  ): Promise<TOutput> {
    switch (action) {
      case 'register':
        return (await this.register(input as any)) as TOutput;

      case 'login':
        return (await this.login(input as any)) as TOutput;

      case 'logout':
        return (await this.logout(input as any)) as TOutput;

      case 'verify':
        return (await this.verify(input as any)) as TOutput;

      case 'refresh':
        return (await this.refresh(input as any)) as TOutput;

      case 'getUser':
        return (await this.getUser(input as any)) as TOutput;

      case 'updateUser':
        return (await this.updateUser(input as any)) as TOutput;

      case 'deleteUser':
        return (await this.deleteUser(input as any)) as TOutput;

      case 'changePassword':
        return (await this.changePassword(input as any)) as TOutput;

      case 'checkPermission':
        return (await this.checkPermission(input as any)) as TOutput;

      case 'checkRole':
        return (await this.checkRole(input as any)) as TOutput;

      case 'stats':
        return (await this.stats()) as TOutput;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Register a new user
   */
  private async register(data: {
    username: string;
    email: string;
    password: string;
    roles?: string[];
  }): Promise<{ success: boolean; userId?: string; error?: string }> {
    // Check if user exists
    const existingUser = Array.from(this.users.values()).find(
      (u) => u.username === data.username || u.email === data.email
    );

    if (existingUser) {
      return { success: false, error: 'User already exists' };
    }

    // Validate password
    const passwordError = this.validatePassword(data.password);
    if (passwordError) {
      return { success: false, error: passwordError };
    }

    // Create user
    const user: User = {
      id: this.generateId(),
      username: data.username,
      email: data.email,
      roles: data.roles || ['user'],
      permissions: [],
      createdAt: new Date(),
    };

    this.users.set(user.id, user);

    // Store password hash (in production, use bcrypt)
    const passwordHash = this.hashPassword(data.password);
    await this.context?.storage.set(`password:${user.id}`, passwordHash);

    return { success: true, userId: user.id };
  }

  /**
   * Login user
   */
  private async login(credentials: {
    username: string;
    password: string;
  }): Promise<{ success: boolean; token?: string; error?: string }> {
    // Check lockout
    const lockout = this.lockouts.get(credentials.username);
    if (lockout && lockout > new Date()) {
      return { success: false, error: 'Account locked' };
    }

    // Find user
    const user = Array.from(this.users.values()).find(
      (u) => u.username === credentials.username
    );

    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Verify password
    const passwordHash = await this.context?.storage.get(`password:${user.id}`);
    if (!passwordHash || !this.verifyPassword(credentials.password, passwordHash)) {
      this.recordFailedAttempt(credentials.username);
      return { success: false, error: 'Invalid credentials' };
    }

    // Clear failed attempts
    this.attempts.delete(credentials.username);
    this.lockouts.delete(credentials.username);

    // Create session
    const session = await this.createSession(user.id);
    user.lastLogin = new Date();

    this.metrics.logins++;
    this.metrics.sessionsCreated++;

    return { success: true, token: session.token };
  }

  /**
   * Logout user
   */
  private async logout(data: { token: string }): Promise<{ success: boolean }> {
    const session = Array.from(this.sessions.values()).find(
      (s) => s.token === data.token
    );

    if (session) {
      this.sessions.delete(session.id);
      this.metrics.logouts++;
    }

    return { success: true };
  }

  /**
   * Verify token
   */
  private async verify(data: { token: string }): Promise<{ success: boolean; userId?: string }> {
    const session = Array.from(this.sessions.values()).find(
      (s) => s.token === data.token
    );

    if (!session) {
      return { success: false };
    }

    // Check if expired
    if (session.expiresAt < new Date()) {
      this.sessions.delete(session.id);
      this.metrics.sessionsExpired++;
      return { success: false };
    }

    return { success: true, userId: session.userId };
  }

  /**
   * Refresh token
   */
  private async refresh(data: { token: string }): Promise<{ success: boolean; token?: string }> {
    const session = Array.from(this.sessions.values()).find(
      (s) => s.token === data.token
    );

    if (!session) {
      return { success: false };
    }

    // Create new session
    const newSession = await this.createSession(session.userId);
    this.sessions.delete(session.id);

    return { success: true, token: newSession.token };
  }

  /**
   * Get user
   */
  private async getUser(data: { userId: string }): Promise<User | undefined> {
    return this.users.get(data.userId);
  }

  /**
   * Update user
   */
  private async updateUser(data: {
    userId: string;
    updates: Partial<User>;
  }): Promise<{ success: boolean }> {
    const user = this.users.get(data.userId);
    if (!user) {
      return { success: false };
    }

    Object.assign(user, data.updates);
    return { success: true };
  }

  /**
   * Delete user
   */
  private async deleteUser(data: { userId: string }): Promise<{ success: boolean }> {
    const result = this.users.delete(data.userId);
    if (result) {
      await this.context?.storage.delete(`password:${data.userId}`);
    }
    return { success: result };
  }

  /**
   * Change password
   */
  private async changePassword(data: {
    userId: string;
    oldPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; error?: string }> {
    // Validate new password
    const passwordError = this.validatePassword(data.newPassword);
    if (passwordError) {
      return { success: false, error: passwordError };
    }

    // Verify old password
    const passwordHash = await this.context?.storage.get(`password:${data.userId}`);
    if (!passwordHash || !this.verifyPassword(data.oldPassword, passwordHash)) {
      return { success: false, error: 'Invalid old password' };
    }

    // Update password
    const newPasswordHash = this.hashPassword(data.newPassword);
    await this.context?.storage.set(`password:${data.userId}`, newPasswordHash);

    return { success: true };
  }

  /**
   * Check permission
   */
  private async checkPermission(data: {
    userId: string;
    permission: string;
  }): Promise<boolean> {
    const user = this.users.get(data.userId);
    if (!user) {
      return false;
    }

    return user.permissions.includes(data.permission);
  }

  /**
   * Check role
   */
  private async checkRole(data: { userId: string; role: string }): Promise<boolean> {
    const user = this.users.get(data.userId);
    if (!user) {
      return false;
    }

    return user.roles.includes(data.role);
  }

  /**
   * Get statistics
   */
  private async stats(): Promise<typeof this.metrics> {
    return { ...this.metrics };
  }

  /**
   * Create session
   */
  private async createSession(userId: string): Promise<Session> {
    const config = this.config.config as AuthPluginConfig;
    const session: Session = {
      id: this.generateId(),
      userId,
      token: this.generateToken(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + config.sessionTimeout * 1000),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Record failed attempt
   */
  private recordFailedAttempt(username: string): void {
    const config = this.config.config as AuthPluginConfig;
    const attempts = (this.attempts.get(username) || 0) + 1;
    this.attempts.set(username, attempts);

    this.metrics.failedAttempts++;

    if (attempts >= config.maxAttempts) {
      this.lockouts.set(username, new Date(Date.now() + config.lockoutDuration * 1000));
    }
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupSessions(): void {
    const now = new Date();
    let expired = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
        expired++;
      }
    }

    if (expired > 0) {
      this.metrics.sessionsExpired += expired;
      this.context?.logger.debug(`Cleaned up ${expired} expired sessions`);
    }
  }

  /**
   * Validate password
   */
  private validatePassword(password: string): string | null {
    const policy = (this.config.config as AuthPluginConfig).passwordPolicy;

    if (password.length < policy.minLength) {
      return `Password must be at least ${policy.minLength} characters`;
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      return 'Password must contain uppercase letters';
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      return 'Password must contain lowercase letters';
    }

    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      return 'Password must contain numbers';
    }

    if (policy.requireSpecialChars && !/[^a-zA-Z0-9]/.test(password)) {
      return 'Password must contain special characters';
    }

    return null;
  }

  /**
   * Hash password
   */
  private hashPassword(password: string): string {
    // In production, use bcrypt
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Verify password
   */
  private verifyPassword(password: string, hash: string): boolean {
    const crypto = require('crypto');
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    return passwordHash === hash;
  }

  /**
   * Generate token
   */
  private generateToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Handle auth attempt hook
   */
  private handleAuthAttempt(context: unknown, input: unknown): void {
    // Log auth attempt
  }

  /**
   * Handle auth success hook
   */
  private handleAuthSuccess(context: unknown, input: unknown): void {
    this.metrics.logins++;
  }

  /**
   * Handle auth failure hook
   */
  private handleAuthFailure(context: unknown, input: unknown): void {
    this.metrics.failedAttempts++;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<PluginHealthStatus> {
    return {
      status: 'healthy',
      message: 'Auth plugin is running',
      timestamp: new Date(),
      checks: {
        sessions: {
          status: 'healthy',
          message: `Active sessions: ${this.sessions.size}`,
        },
        users: {
          status: 'healthy',
          message: `Registered users: ${this.users.size}`,
        },
      },
    };
  }

  /**
   * Get metrics
   */
  async getMetrics(): Promise<PluginMetrics> {
    return {
      executionCount: this.metrics.logins + this.metrics.logouts,
      successCount: this.metrics.logins,
      failureCount: this.metrics.failedAttempts,
      memoryUsage: process.memoryUsage().heapUsed,
      custom: this.metrics as any,
      timestamp: new Date(),
    };
  }
}