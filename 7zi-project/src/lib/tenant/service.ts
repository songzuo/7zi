/**
 * 租户服务 - 多租户管理
 * 
 * 功能：
 * - 租户创建和管理
 * - 存储计算和配额管理
 * - 租户隔离
 */

// ============================================================================
// 类型定义
// ============================================================================

export interface Tenant {
  id: string;
  name: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'suspended' | 'deleted';
  settings: TenantSettings;
  quota: TenantQuota;
  usage: TenantUsage;
}

export interface TenantSettings {
  timezone: string;
  locale: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    slack: boolean;
  };
}

export interface TenantQuota {
  maxStorageGB: number;
  maxMembers: number;
  maxWorkflows: number;
  maxApiCallsPerMonth: number;
}

export interface TenantUsage {
  storageUsedGB: number;
  membersCount: number;
  workflowsCount: number;
  apiCallsThisMonth: number;
  lastUpdated: number;
}

export interface StorageUsage {
  totalGB: number;
  breakdown: {
    workflows: number;
    agents: number;
    logs: number;
    cache: number;
    other: number;
  };
}

// ============================================================================
// 租户服务
// ============================================================================

export class TenantService {
  private tenants: Map<string, Tenant> = new Map();
  private tenantByOwner: Map<string, string> = new Map(); // ownerId -> tenantId

  /**
   * 创建租户
   */
  createTenant(
    ownerId: string,
    name: string,
    settings?: Partial<TenantSettings>
  ): Tenant {
    // 检查用户是否已有租户
    if (this.tenantByOwner.has(ownerId)) {
      throw new Error(`User ${ownerId} already has a tenant`);
    }

    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const tenant: Tenant = {
      id: tenantId,
      name,
      ownerId,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      settings: {
        timezone: 'UTC',
        locale: 'en-US',
        theme: 'auto',
        notifications: {
          email: true,
          push: true,
          slack: false
        },
        ...settings
      },
      quota: {
        maxStorageGB: 10,
        maxMembers: 10,
        maxWorkflows: 100,
        maxApiCallsPerMonth: 10000
      },
      usage: {
        storageUsedGB: 0,
        membersCount: 1,
        workflowsCount: 0,
        apiCallsThisMonth: 0,
        lastUpdated: now
      }
    };

    this.tenants.set(tenantId, tenant);
    this.tenantByOwner.set(ownerId, tenantId);

    return tenant;
  }

  /**
   * 获取租户
   */
  getTenant(tenantId: string): Tenant | null {
    return this.tenants.get(tenantId) || null;
  }

  /**
   * 根据所有者获取租户
   */
  getTenantByOwner(ownerId: string): Tenant | null {
    const tenantId = this.tenantByOwner.get(ownerId);
    if (!tenantId) {
      return null;
    }
    return this.tenants.get(tenantId) || null;
  }

  /**
   * 更新租户
   */
  updateTenant(tenantId: string, updates: Partial<Tenant>): Tenant | null {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return null;
    }

    const updatedTenant: Tenant = {
      ...tenant,
      ...updates,
      id: tenantId, // 确保 ID 不变
      ownerId: tenant.ownerId, // 确保所有者不变
      createdAt: tenant.createdAt, // 确保创建时间不变
      updatedAt: Date.now()
    };

    this.tenants.set(tenantId, updatedTenant);

    return updatedTenant;
  }

  /**
   * 删除租户
   */
  deleteTenant(tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return false;
    }

    // 标记为已删除
    tenant.status = 'deleted';
    this.tenants.set(tenantId, tenant);
    this.tenantByOwner.delete(tenant.ownerId);

    return true;
  }

  /**
   * 暂停租户
   */
  suspendTenant(tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return false;
    }

    tenant.status = 'suspended';
    tenant.updatedAt = Date.now();

    return true;
  }

  /**
   * 激活租户
   */
  activateTenant(tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return false;
    }

    tenant.status = 'active';
    tenant.updatedAt = Date.now();

    return true;
  }

  /**
   * 计算存储使用量
   */
  calculateStorageUsage(tenantId: string): StorageUsage | null {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return null;
    }

    // TODO: 实现真实的存储计算逻辑
    // 这里需要：
    // 1. 扫描租户的所有数据（工作流、智能体、日志、缓存等）
    // 2. 计算每个类别的存储使用量
    // 3. 汇总并返回
    
    // 模拟数据
    const storageUsage: StorageUsage = {
      totalGB: tenant.usage.storageUsedGB,
      breakdown: {
        workflows: tenant.usage.storageUsedGB * 0.4,
        agents: tenant.usage.storageUsedGB * 0.2,
        logs: tenant.usage.storageUsedGB * 0.15,
        cache: tenant.usage.storageUsedGB * 0.15,
        other: tenant.usage.storageUsedGB * 0.1
      }
    };

    return storageUsage;
  }

  /**
   * 更新存储使用量
   */
  updateStorageUsage(tenantId: string, deltaGB: number): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return false;
    }

    tenant.usage.storageUsedGB = Math.max(0, tenant.usage.storageUsedGB + deltaGB);
    tenant.usage.lastUpdated = Date.now();
    tenant.updatedAt = Date.now();

    return true;
  }

  /**
   * 检查存储配额
   */
  checkStorageQuota(tenantId: string): {
    withinQuota: boolean;
    usedGB: number;
    maxGB: number;
    remainingGB: number;
    usagePercentage: number;
  } {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const usedGB = tenant.usage.storageUsedGB;
    const maxGB = tenant.quota.maxStorageGB;
    const remainingGB = Math.max(0, maxGB - usedGB);
    const usagePercentage = (usedGB / maxGB) * 100;

    return {
      withinQuota: usedGB <= maxGB,
      usedGB,
      maxGB,
      remainingGB,
      usagePercentage
    };
  }

  /**
   * 更新配额
   */
  updateQuota(tenantId: string, quota: Partial<TenantQuota>): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return false;
    }

    tenant.quota = {
      ...tenant.quota,
      ...quota
    };
    tenant.updatedAt = Date.now();

    return true;
  }

  /**
   * 增加成员计数
   */
  incrementMembers(tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return false;
    }

    tenant.usage.membersCount++;
    tenant.usage.lastUpdated = Date.now();
    tenant.updatedAt = Date.now();

    return true;
  }

  /**
   * 减少成员计数
   */
  decrementMembers(tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return false;
    }

    tenant.usage.membersCount = Math.max(0, tenant.usage.membersCount - 1);
    tenant.usage.lastUpdated = Date.now();
    tenant.updatedAt = Date.now();

    return true;
  }

  /**
   * 增加工作流计数
   */
  incrementWorkflows(tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return false;
    }

    tenant.usage.workflowsCount++;
    tenant.usage.lastUpdated = Date.now();
    tenant.updatedAt = Date.now();

    return true;
  }

  /**
   * 减少工作流计数
   */
  decrementWorkflows(tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return false;
    }

    tenant.usage.workflowsCount = Math.max(0, tenant.usage.workflowsCount - 1);
    tenant.usage.lastUpdated = Date.now();
    tenant.updatedAt = Date.now();

    return true;
  }

  /**
   * 记录 API 调用
   */
  recordApiCall(tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return false;
    }

    tenant.usage.apiCallsThisMonth++;
    tenant.usage.lastUpdated = Date.now();
    tenant.updatedAt = Date.now();

    return true;
  }

  /**
   * 重置月度 API 调用计数
   */
  resetMonthlyApiCalls(tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return false;
    }

    tenant.usage.apiCallsThisMonth = 0;
    tenant.usage.lastUpdated = Date.now();
    tenant.updatedAt = Date.now();

    return true;
  }

  /**
   * 获取所有租户
   */
  getAllTenants(): Tenant[] {
    return Array.from(this.tenants.values());
  }

  /**
   * 获取活跃租户
   */
  getActiveTenants(): Tenant[] {
    return Array.from(this.tenants.values()).filter(t => t.status === 'active');
  }
}

// ============================================================================
// 单例实例
// ============================================================================

export const tenantService = new TenantService();

// ============================================================================
// 导出
// ============================================================================

export default tenantService;