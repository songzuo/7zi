# 多租户架构分析报告 v2.0

**作者**: 架构师  
**日期**: 2026-04-03  
**版本**: 2.0  

---

## 一、当前架构状态

### 1.1 已实现模块概览

| 模块 | 路径 | 状态 | 备注 |
|------|------|------|------|
| 租户服务 | `src/lib/tenant/service.ts` | ✅ 核心完成 | 约 500 行 |
| 租户中间件 | `src/lib/tenant/middleware.ts` | ✅ 核心完成 | 约 300 行 |
| 计费服务 | `src/lib/billing/service.ts` | ✅ 核心完成 | 约 500 行 |
| 增强权限 | `src/lib/auth/enhanced-permissions.ts` | ⚠️ 需要改造 | 无租户隔离 |
| 分布式缓存 | `src/lib/cache/distributed/` | ⚠️ 需要改造 | 无租户隔离 |
| 数据库迁移 | `src/lib/db/migrations/001_multi_tenant.sql` | ✅ 完成 | 完整 schema |
| 审计服务 | `src/lib/security/audit.ts` | ✅ 完成 | 有租户隔离 |
| 加密服务 | `src/lib/security/encryption.ts` | ✅ 完成 | 支持租户密钥 |

### 1.2 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                             │
│  /api/v1/tenants/*  /api/v1/billing/*  /api/v1/auth/*     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Middleware Layer                        │
│  tenantMiddleware → authMiddleware → permissionMiddleware    │
│  → quotaMiddleware → auditMiddleware                        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Tenant   │ │ Billing  │ │Enhanced  │ │ Security │      │
│  │ Service  │ │ Service  │ │Permission│ │ Service  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Data Layer                         │  │
│  │  SQLite │ Redis Cache │ Distributed Cache            │  │
│  │  ✓ 租户隔离  │ ✗ 无租户隔离 │ ✗ 无租户隔离          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、发现的问题

### 2.1 🔴 严重问题

#### 问题 1: 权限系统缺少租户隔离
**位置**: `src/lib/auth/enhanced-permissions.ts`

```typescript
// 当前问题：权限表是全局的，没有 tenant_id 字段
db.exec(`
  CREATE TABLE IF NOT EXISTS resource_permissions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    agent_id TEXT,
    role_id TEXT,
    resource TEXT NOT NULL,    // 没有 tenant_id
    ...
  )
`)
```

**影响**: 
- 用户 A 在租户 1 的权限会影响到租户 2
- 角色继承是全局的，无法实现"租户内继承"

**修复建议**:
```sql
ALTER TABLE resource_permissions ADD COLUMN tenant_id TEXT;
CREATE INDEX idx_permissions_tenant ON resource_permissions(tenant_id);
```

#### 问题 2: 分布式缓存缺少租户隔离
**位置**: `src/lib/cache/distributed/DistributedCacheManager.ts`

```typescript
// 当前：所有租户共享相同的 key prefix
const l3Config: L3Config = {
  keyPrefix: `cache:${this.distributedConfig.clusterName}:`, // 全局 prefix
  // 应该: `cache:${tenantId}:${clusterName}:`
}
```

**影响**:
- 租户 A 的缓存数据可能被租户 B 访问
- 缓存穿透一个租户会影响所有租户

**修复建议**:
```typescript
// 缓存 key 格式应为
`cache:${tenantId}:${resource}:${id}`

async get<T>(key: string, tenantId: string): Promise<T | null> {
  const prefixedKey = `cache:${tenantId}:${key}`
  // ...
}
```

#### 问题 3: 计费服务无内部租户验证
**位置**: `src/lib/billing/service.ts`

```typescript
// 当前：完全信任调用者传入的 tenantId
async getSubscription(tenantId: string): Promise<Subscription | null> {
  const row = await db.get(... 
    'SELECT * FROM subscriptions WHERE tenant_id = ?',  // 直接使用，未验证
    [tenantId]
  )
}
```

**影响**:
- 如果中间件漏检，可能出现跨租户访问
- 建议增加防御性验证

---

### 2.2 🟡 中等问题

#### 问题 4: TypeScript 类型问题

**位置**: `src/lib/tenant/middleware.ts` + `service.ts`

```typescript
// 问题：TenantRequest 在 middleware.ts 定义，但 service.ts 引用
// middleware.ts
export interface TenantRequest extends NextRequest {
  tenantContext?: {...}
}

// service.ts 引用会怎样？
```

**修复建议**: 将 `TenantRequest` 移到独立类型文件

#### 问题 5: 动态 import 在热路径
**位置**: `src/lib/tenant/middleware.ts`

```typescript
// auditMiddleware 使用动态 import
const { auditService } = await import('../security/audit')
```

**影响**: 每次请求都执行动态 import，有性能损耗

**修复建议**: 使用静态 import 或在模块初始化时缓存

#### 问题 6: 权限表初始化频繁调用
**位置**: `src/lib/auth/enhanced-permissions.ts`

```typescript
// 每个操作都调用 initializePermissionTables
async function checkPermission(params) {
  await initializePermissionTables() // 每次都检查/创建表
  // ...
}
```

**影响**: 数据库压力，不必要的重复检查

**修复建议**: 使用 `once` pattern 或在模块加载时初始化

#### 问题 7: 数据库索引不完整
**位置**: `001_multi_tenant.sql`

```sql
-- 问题：缺少复合索引支持常见查询模式
-- 常见查询：WHERE tenant_id = ? AND status = ? AND created_at > ?
CREATE INDEX idx_usage_tenant ON usage_records(tenant_id);
-- 应该增加:
-- CREATE INDEX idx_usage_tenant_status_date ON usage_records(tenant_id, status, recorded_at);
```

---

### 2.3 🟢 轻微问题

#### 问题 8: 审计日志 oldValue/newValue 序列化风险
**位置**: `src/lib/security/audit.ts`

```typescript
oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null
```

**影响**: 大对象序列化可能影响性能

**建议**: 对大对象使用压缩或引用

#### 问题 9: 加密服务密钥轮换未完成
**位置**: `src/lib/security/encryption.ts`

```typescript
// TODO: 重新加密所有使用旧密钥的数据
async rotateTenantKey(tenantId: string): Promise<void> {
  // ...
  // TODO: 重新加密所有使用旧密钥的数据
}
```

---

## 三、改进建议

### 3.1 优先级 P0 (必须修复)

#### 1. 为权限系统添加租户隔离

```typescript
// 新表结构
CREATE TABLE resource_permissions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,           -- 新增
  user_id TEXT,
  role_id TEXT,
  resource TEXT NOT NULL,
  resource_id TEXT,
  action TEXT NOT NULL,
  -- ...
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, user_id, resource, resource_id, action)
);

CREATE INDEX idx_resource_permissions_tenant ON resource_permissions(tenant_id);
```

#### 2. 缓存 key 添加租户前缀

```typescript
// DistributedCacheManager.ts
private getTenantAwareKey(tenantId: string, key: string): string {
  return `cache:${tenantId}:${key}`
}

async get<T>(key: string, tenantId: string): Promise<T | null> {
  const prefixedKey = this.getTenantAwareKey(tenantId, key)
  // ...
}
```

#### 3. 防御性租户验证

```typescript
// 在 billing/service.ts 添加验证
async getSubscription(tenantId: string): Promise<Subscription | null> {
  // 验证 tenantId 格式
  if (!tenantId || !/^tenant_[a-z0-9]+$/.test(tenantId)) {
    throw new Error('Invalid tenant ID')
  }
  // ...
}
```

### 3.2 优先级 P1 (建议修复)

#### 4. 类型文件分离

```
src/lib/tenant/
├── types.ts          # 已存在，移动 TenantRequest 到这里
├── service.ts
├── middleware.ts
└── index.ts
```

#### 5. 权限表初始化优化

```typescript
// 使用单例模式
let initialized = false
async function initializePermissionTables(): Promise<void> {
  if (initialized) return
  // ... init logic
  initialized = true
}
```

#### 6. 添加复合索引

```sql
-- usage_records 表
CREATE INDEX idx_usage_tenant_type_date ON usage_records(tenant_id, resource_type, recorded_at);

-- audit_logs 表
CREATE INDEX idx_audit_tenant_user_date ON audit_logs(tenant_id, user_id, created_at);

-- tenant_members 表
CREATE INDEX idx_tenant_members_tenant_role ON tenant_members(tenant_id, role);
```

### 3.3 优先级 P2 (未来规划)

#### 7. 租户级缓存隔离配置

```typescript
interface TenantCacheConfig {
  maxMemoryMB: number
  defaultTTL: number
  isolationMode: 'shared' | 'dedicated'
}
```

#### 8. 跨租户分析报表

```typescript
interface CrossTenantReport {
  totalTenants: number
  totalUsers: number
  totalUsage: Record<string, number>
  topTenants: Array<{ tenantId: string; usage: number }>
}
```

---

## 四、测试建议

### 4.1 必须测试的场景

1. **租户隔离测试**
   - 租户 A 无法访问租户 B 的数据
   - 租户 A 的缓存不会泄露到租户 B
   - 权限隔离正确

2. **边界测试**
   - 空 tenantId
   - 无效 tenantId 格式
   - 已删除租户的访问

3. **性能测试**
   - 多租户并发下的缓存命中率
   - 权限检查性能

---

## 五、迁移指南

### Phase 1: 数据库迁移
```sql
-- 1. 备份数据
-- 2. 添加 tenant_id 到 resource_permissions
ALTER TABLE resource_permissions ADD COLUMN tenant_id TEXT DEFAULT 'default';

-- 3. 创建索引
CREATE INDEX idx_resource_permissions_tenant ON resource_permissions(tenant_id);

-- 4. 验证数据完整性
SELECT COUNT(*) FROM resource_permissions WHERE tenant_id IS NULL;
```

### Phase 2: 代码部署
1. 部署带租户隔离的新权限代码
2. 部署缓存 key 改造代码
3. 验证所有 API 调用正确传递 tenantId

### Phase 3: 监控
- 监控异常跨租户访问
- 监控缓存命中率变化
- 监控权限检查延迟

---

## 六、总结

### 当前状态
- ✅ 核心租户管理已完成
- ✅ 计费系统已完成
- ✅ 审计日志已完成
- ⚠️ 权限系统需要租户隔离改造
- ⚠️ 缓存系统需要租户隔离改造

### 下一步行动
1. **P0**: 为 `resource_permissions` 表添加 `tenant_id` 列
2. **P0**: 修改缓存 key 格式支持租户隔离
3. **P1**: 优化权限表初始化逻辑
4. **P1**: 添加必要的复合索引
5. **P2**: 类型文件分离

---
**报告生成时间**: 2026-04-03 13:30 GMT+2  
**架构师**: subagent:multi-tenant-review  
