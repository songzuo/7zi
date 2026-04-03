/**
 * 访问控制器
 * @module config-center/access-control
 * @version 1.10.0
 */

import {
  ConfigPermission,
  ConfigPermissionAction,
  PermissionCondition,
  ApiKey,
  RateLimitConfig,
  ConfigEnvironment,
} from './types';
import { StorageAdapter } from './types';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

/**
 * 访问控制器
 * 
 * 提供配置权限管理、API密钥认证、访问控制等功能
 */
export class AccessController {
  private storage: StorageAdapter;
  private permissions: Map<string, ConfigPermission> = new Map();
  private apiKeys: Map<string, ApiKey> = new Map();
  private rateLimitStore: Map<string, { count: number; resetAt: number }> = new Map();
  private initialized = false;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  /**
   * 初始化访问控制器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
  }

  /**
   * 检查权限
   */
  async checkPermission(
    principalId: string,
    resourceType: ConfigPermission['resourceType'],
    resourceId: string,
    action: ConfigPermissionAction,
    environment?: ConfigEnvironment
  ): Promise<boolean> {
    // 查找适用的权限
    const applicablePermissions = await this.findApplicablePermissions(
      principalId,
      resourceType,
      resourceId,
      action
    );

    if (applicablePermissions.length === 0) {
      return false;
    }

    // 检查是否有任何允许的权限
    for (const permission of applicablePermissions) {
      // 检查是否允许
      if (!permission.allow) {
        continue;
      }

      // 检查条件
      if (permission.conditions && permission.conditions.length > 0) {
        const conditionsMet = await this.evaluateConditions(
          permission.conditions,
          { environment }
        );
        if (!conditionsMet) {
          continue;
        }
      }

      // 检查过期时间
      if (permission.expiresAt && new Date() > permission.expiresAt) {
        continue;
      }

      return true;
    }

    return false;
  }

  /**
   * 查找适用的权限
   */
  private async findApplicablePermissions(
    principalId: string,
    resourceType: ConfigPermission['resourceType'],
    resourceId: string,
    action: ConfigPermissionAction
  ): Promise<ConfigPermission[]> {
    const permissions: ConfigPermission[] = [];

    for (const permission of this.permissions.values()) {
      // 检查主体匹配
      if (permission.principalId !== principalId) {
        continue;
      }

      // 检查资源类型匹配
      if (permission.resourceType !== resourceType) {
        continue;
      }

      // 检查资源ID匹配 (支持通配符)
      if (permission.resourceId !== '*' && permission.resourceId !== resourceId) {
        continue;
      }

      // 检查操作匹配
      if (!permission.actions.includes(action)) {
        continue;
      }

      permissions.push(permission);
    }

    return permissions;
  }

  /**
   * 评估条件
   */
  private async evaluateConditions(
    conditions: PermissionCondition[],
    context: { environment?: ConfigEnvironment }
  ): Promise<boolean> {
    for (const condition of conditions) {
      let result: boolean;

      switch (condition.type) {
        case 'environment':
          result = this.evaluateEnvironmentCondition(condition, context.environment);
          break;
        case 'time':
          result = this.evaluateTimeCondition(condition);
          break;
        case 'ip':
          result = this.evaluateIpCondition(condition);
          break;
        case 'custom':
          result = true; // 自定义条件需要额外的处理器
          break;
        default:
          result = false;
      }

      if (!result) {
        return false;
      }
    }

    return true;
  }

  /**
   * 评估环境条件
   */
  private evaluateEnvironmentCondition(
    condition: PermissionCondition,
    environment?: ConfigEnvironment
  ): boolean {
    if (!environment) {
      return false;
    }

    switch (condition.operator) {
      case 'equals':
        return environment === condition.value;
      case 'not_equals':
        return environment !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(environment);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(environment);
      default:
        return false;
    }
  }

  /**
   * 评估时间条件
   */
  private evaluateTimeCondition(condition: PermissionCondition): boolean {
    const now = new Date();
    const currentHour = now.getHours();

    switch (condition.operator) {
      case 'range': {
        const range = condition.value as { start: number; end: number };
        return currentHour >= range.start && currentHour <= range.end;
      }
      default:
        return false;
    }
  }

  /**
   * 评估IP条件
   */
  private evaluateIpCondition(condition: PermissionCondition): boolean {
    // 实际实现需要获取客户端IP
    return true;
  }

  /**
   * 创建权限
   */
  async createPermission(
    permission: Omit<ConfigPermission, 'id' | 'createdAt'>
  ): Promise<ConfigPermission> {
    const newPermission: ConfigPermission = {
      ...permission,
      id: uuidv4(),
      createdAt: new Date(),
    };

    this.permissions.set(newPermission.id, newPermission);
    return newPermission;
  }

  /**
   * 更新权限
   */
  async updatePermission(
    id: string,
    updates: Partial<ConfigPermission>
  ): Promise<ConfigPermission> {
    const existing = this.permissions.get(id);
    if (!existing) {
      throw new Error(`Permission ${id} not found`);
    }

    const updated: ConfigPermission = {
      ...existing,
      ...updates,
      id, // 不能修改 id
      createdAt: existing.createdAt, // 不能修改创建时间
    };

    this.permissions.set(id, updated);
    return updated;
  }

  /**
   * 删除权限
   */
  async deletePermission(id: string): Promise<void> {
    this.permissions.delete(id);
  }

  /**
   * 获取权限列表
   */
  async getPermissions(
    filter?: {
      principalId?: string;
      resourceType?: ConfigPermission['resourceType'];
      resourceId?: string;
    }
  ): Promise<ConfigPermission[]> {
    let permissions = Array.from(this.permissions.values());

    if (filter) {
      if (filter.principalId) {
        permissions = permissions.filter(p => p.principalId === filter.principalId);
      }
      if (filter.resourceType) {
        permissions = permissions.filter(p => p.resourceType === filter.resourceType);
      }
      if (filter.resourceId) {
        permissions = permissions.filter(p => p.resourceId === filter.resourceId);
      }
    }

    return permissions;
  }

  /**
   * 生成API密钥
   */
  async generateApiKey(
    options: {
      name: string;
      userId: string;
      scopes: string[];
      environments?: ConfigEnvironment[];
      ipWhitelist?: string[];
      rateLimit?: RateLimitConfig;
      expiresAt?: Date;
    }
  ): Promise<{ apiKey: ApiKey; key: string }> {
    // 生成密钥
    const key = this.generateKey();
    const keyPrefix = key.substring(0, 8);
    const keyHash = this.hashKey(key);

    const apiKey: ApiKey = {
      id: uuidv4(),
      name: options.name,
      keyHash,
      keyPrefix,
      userId: options.userId,
      scopes: options.scopes,
      environments: options.environments,
      ipWhitelist: options.ipWhitelist,
      rateLimit: options.rateLimit,
      enabled: true,
      createdAt: new Date(),
      expiresAt: options.expiresAt,
      usageCount: 0,
    };

    this.apiKeys.set(apiKey.id, apiKey);

    return { apiKey, key };
  }

  /**
   * 验证API密钥
   */
  async validateApiKey(
    key: string,
    options: {
      requiredScope?: string;
      environment?: ConfigEnvironment;
      clientIp?: string;
    } = {}
  ): Promise<{ valid: boolean; apiKey?: ApiKey; error?: string }> {
    const keyHash = this.hashKey(key);

    // 查找API密钥
    const apiKey = Array.from(this.apiKeys.values()).find(k => k.keyHash === keyHash);

    if (!apiKey) {
      return { valid: false, error: 'Invalid API key' };
    }

    // 检查是否启用
    if (!apiKey.enabled) {
      return { valid: false, error: 'API key is disabled' };
    }

    // 检查是否过期
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return { valid: false, error: 'API key has expired' };
    }

    // 检查作用域
    if (options.requiredScope && !apiKey.scopes.includes(options.requiredScope)) {
      return { valid: false, error: 'Insufficient scope' };
    }

    // 检查环境
    if (options.environment && apiKey.environments) {
      if (!apiKey.environments.includes(options.environment)) {
        return { valid: false, error: 'Environment not allowed' };
      }
    }

    // 检查IP白名单
    if (options.clientIp && apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0) {
      if (!apiKey.ipWhitelist.includes(options.clientIp)) {
        return { valid: false, error: 'IP not whitelisted' };
      }
    }

    // 检查速率限制
    if (apiKey.rateLimit && apiKey.rateLimit.enabled) {
      const rateLimitResult = this.checkRateLimit(
        apiKey.id,
        apiKey.rateLimit
      );

      if (!rateLimitResult.allowed) {
        return {
          valid: false,
          error: `Rate limit exceeded. Try again in ${rateLimitResult.resetIn} seconds`,
        };
      }
    }

    // 更新使用统计
    apiKey.lastUsedAt = new Date();
    apiKey.usageCount++;

    return { valid: true, apiKey };
  }

  /**
   * 检查速率限制
   */
  private checkRateLimit(
    keyId: string,
    config: RateLimitConfig
  ): { allowed: boolean; resetIn: number } {
    const now = Date.now();
    const windowMs = config.windowMs * 1000;
    const record = this.rateLimitStore.get(keyId);

    if (!record || now > record.resetAt) {
      // 创建新的时间窗口
      this.rateLimitStore.set(keyId, {
        count: 1,
        resetAt: now + windowMs,
      });
      return { allowed: true, resetIn: 0 };
    }

    if (record.count >= config.maxRequests) {
      // 超过限制
      const resetIn = Math.ceil((record.resetAt - now) / 1000);
      return { allowed: false, resetIn };
    }

    // 增加计数
    record.count++;
    return { allowed: true, resetIn: 0 };
  }

  /**
   * 生成密钥
   */
  private generateKey(): string {
    const prefix = 'cc'; // config-center
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}_${randomBytes}`;
  }

  /**
   * 哈希密钥
   */
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * 撤销API密钥
   */
  async revokeApiKey(id: string): Promise<void> {
    const apiKey = this.apiKeys.get(id);
    if (apiKey) {
      apiKey.enabled = false;
    }
  }

  /**
   * 删除API密钥
   */
  async deleteApiKey(id: string): Promise<void> {
    this.apiKeys.delete(id);
  }

  /**
   * 获取用户的API密钥列表
   */
  async getApiKeys(userId: string): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values())
      .filter(key => key.userId === userId)
      .map(key => ({
        ...key,
        keyHash: '***', // 不返回哈希值
      }));
  }

  /**
   * 获取所有API密钥
   */
  async getAllApiKeys(): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values()).map(key => ({
      ...key,
      keyHash: '***',
    }));
  }

  /**
   * 创建角色权限
   */
  async createRolePermissions(
    roleId: string,
    permissions: Array<{
      resourceType: ConfigPermission['resourceType'];
      resourceId: string;
      actions: ConfigPermissionAction[];
      conditions?: PermissionCondition[];
    }>
  ): Promise<ConfigPermission[]> {
    const createdPermissions: ConfigPermission[] = [];

    for (const perm of permissions) {
      const permission = await this.createPermission({
        principalId: roleId,
        principalType: 'role',
        resourceType: perm.resourceType,
        resourceId: perm.resourceId,
        actions: perm.actions,
        allow: true,
        conditions: perm.conditions,
      });
      createdPermissions.push(permission);
    }

    return createdPermissions;
  }

  /**
   * 复制权限
   */
  async copyPermissions(
    fromPrincipalId: string,
    toPrincipalId: string
  ): Promise<ConfigPermission[]> {
    const existingPermissions = await this.getPermissions({ principalId: fromPrincipalId });
    const newPermissions: ConfigPermission[] = [];

    for (const perm of existingPermissions) {
      const newPerm = await this.createPermission({
        ...perm,
        principalId: toPrincipalId,
      });
      newPermissions.push(newPerm);
    }

    return newPermissions;
  }

  /**
   * 检查用户是否为管理员
   */
  async isAdministrator(userId: string): Promise<boolean> {
    return await this.checkPermission(
      userId,
      'config',
      '*',
      'admin'
    );
  }

  /**
   * 获取用户的有效权限
   */
  async getEffectivePermissions(
    principalId: string,
    principalType: ConfigPermission['principalType']
  ): Promise<Map<string, ConfigPermissionAction[]>> {
    const effectivePermissions = new Map<string, ConfigPermissionAction[]>();

    for (const permission of this.permissions.values()) {
      if (
        permission.principalId === principalId &&
        permission.principalType === principalType &&
        permission.allow &&
        (!permission.expiresAt || new Date() <= permission.expiresAt)
      ) {
        const key = `${permission.resourceType}:${permission.resourceId}`;
        const existing = effectivePermissions.get(key) || [];
        const merged = [...new Set([...existing, ...permission.actions])];
        effectivePermissions.set(key, merged);
      }
    }

    return effectivePermissions;
  }

  /**
   * 清理过期的权限
   */
  async cleanupExpiredPermissions(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [id, permission] of this.permissions) {
      if (permission.expiresAt && now > permission.expiresAt) {
        this.permissions.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 清理速率限制缓存
   */
  cleanupRateLimitCache(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, record] of this.rateLimitStore) {
      if (now > record.resetAt) {
        this.rateLimitStore.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}
