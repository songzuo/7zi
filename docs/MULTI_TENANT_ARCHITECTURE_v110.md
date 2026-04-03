# 多租户架构设计文档 v1.10.0

## 目录

1. [概述](#概述)
2. [租户隔离模型](#租户隔离模型)
3. [认证与授权](#认证与授权)
4. [计费系统](#计费系统)
5. [数据安全](#数据安全)
6. [API 规范](#api-规范)
7. [迁移方案](#迁移方案)

---

## 概述

### 设计目标

为 7zi 平台设计企业级多租户系统，支持：

- **租户隔离**：三种隔离模式（共享数据库、独立数据库、混合模式）
- **企业认证**：SSO 单点登录、OAuth 2.0/OIDC 集成
- **精细化权限**：基于角色的访问控制（RBAC）+ 租户级权限隔离
- **灵活计费**：用量计费、订阅管理、账单自动生成
- **数据安全**：租户数据加密、审计日志、数据脱敏

### 技术栈

- **运行时**: bailian (字节跳动云服务)
- **数据库**: SQLite (better-sqlite3) + PostgreSQL (可选)
- **认证**: JWT + OAuth 2.0 + OIDC
- **缓存**: Redis (可选)
- **消息队列**: BullMQ

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        API Gateway                           │
│  (租户识别、认证、限流、路由)                                  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  租户服务     │    │  认证服务     │    │  计费服务     │
│  Tenant Svc   │    │  Auth Svc     │    │  Billing Svc  │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     数据访问层                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ 共享数据库   │  │ 独立数据库   │  │  混合模式   │        │
│  │ (行级隔离)  │  │ (租户隔离)  │  │  (灵活配置) │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 租户隔离模型

### 1. 共享数据库模式 (Shared Database)

**适用场景**: 中小企业、SaaS 初创阶段

**优势**:
- 成本低，资源利用率高
- 运维简单，单数据库管理
- 跨租户分析方便

**劣势**:
- 数据隔离性较弱
- 需要严格的行级安全策略
- 性能受其他租户影响

**实现方案**:

```sql
-- 所有表添加 tenant_id 字段
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- 租户ID
  email TEXT NOT NULL,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建租户隔离索引
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
```

### 2. 独立数据库模式 (Separate Database)

**适用场景**: 大型企业、金融医疗、合规要求高

**优势**:
- 数据完全隔离
- 性能独立，不受其他租户影响
- 易于满足合规要求

**劣势**:
- 成本高，资源利用率低
- 运维复杂，多数据库管理
- 跨租户分析困难

### 3. 混合模式 (Hybrid)

**适用场景**: 中大型企业、需要灵活配置

**优势**:
- 根据租户等级选择隔离方式
- 平衡成本和安全性
- 支持租户升级迁移

**劣势**:
- 架构复杂度高
- 需要维护多种连接方式
- 数据迁移成本

### 推荐方案

**Phase 1 (v1.10.0)**: 共享数据库模式
- 快速上线，降低成本
- 积累用户数据

**Phase 2 (v1.11.0)**: 混合模式
- 支持企业客户升级
- 提供数据迁移工具

**Phase 3 (v1.12.0)**: 完整多模式支持
- 企业级独立数据库
- 合规认证

---

## 认证与授权

### 1. SSO 单点登录

**支持的协议**:
- SAML 2.0
- OAuth 2.0
- OIDC (OpenID Connect)

**支持的 IdP**:
- Okta
- Azure Active Directory
- Google Workspace
- 企业自建 IdP

### 2. RBAC 权限模型

**权限层级**:

```
租户 (Tenant)
  └─ 角色 (Role)
       └─ 权限 (Permission)
            └─ 资源 (Resource)
```

**预定义角色**:

| 角色 | 描述 | 权限 |
|------|------|------|
| owner | 租户所有者 | 全部权限 |
| admin | 管理员 | 用户管理、配置管理、计费查看 |
| member | 成员 | 日常操作、查看自己的数据 |
| guest | 访客 | 只读权限 |

### 3. 权限检查流程

```typescript
// 权限检查中间件
async function checkPermission(
  userId: string,
  tenantId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const userRoles = await getUserRoles(userId, tenantId)
  const permissions = await getRolePermissions(userRoles)
  return permissions.some(p => p.resource === resource && p.action === action)
}
```

---

## 计费系统

### 1. 计费模型

**三种计费模式**:

1. **订阅制 (Subscription)**
   - Starter: ¥99/月 (基础功能)
   - Professional: ¥299/月 (高级功能)
   - Enterprise: ¥999/月 (全部功能 + 专属支持)

2. **用量制 (Usage-based)**
   - AI 对话: ¥0.01/次
   - 工作流执行: ¥0.1/次
   - 存储空间: ¥0.5/GB/月

3. **混合制 (Hybrid)**
   - 基础订阅 + 超额用量计费

### 2. 订阅管理

```typescript
interface Subscription {
  id: string
  tenantId: string
  planId: string
  status: 'active' | 'cancelled' | 'expired' | 'past_due'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
}
```

### 3. 账单生成流程

1. 月末自动生成账单
2. 发送账单通知邮件
3. 支付网关自动扣款
4. 更新订阅状态
5. 发送支付确认通知

---

## 数据安全

### 1. 数据加密

**加密策略**:

| 层级 | 方法 | 说明 |
|------|------|------|
| 传输层 | TLS 1.3 | 所有 API 通信 |
| 存储层 | AES-256-GCM | 数据库加密 |
| 字段级 | 租户密钥 | 敏感字段单独加密 |

### 2. 审计日志

**审计范围**:
- 用户登录/登出
- 数据访问/修改
- 权限变更
- 系统配置变更
- 支付操作

**日志保留**: 180 天

### 3. 数据脱敏

| 数据类型 | 脱敏方式 | 示例 |
|---------|---------|------|
| 手机号 | 中间4位隐藏 | 138****1234 |
| 邮箱 | 用户名部分隐藏 | a***@example.com |
| 身份证 | 保留前3后4位 | 110***********1234 |
| 银行卡 | 保留后4位 | ************1234 |

---

## API 规范

### 1. RESTful API 设计

**基础 URL 格式**:

```
https://api.7zi.com/v1/{tenant_id}/{resource}
```

**租户识别方式**:

1. **URL 路径**: `/v1/tenant-123/users`
2. **请求头**: `X-Tenant-ID: tenant-123`
3. **子域名**: `tenant-123.api.7zi.com/v1/users`

### 2. 核心端点

```yaml
# 租户管理
GET    /v1/tenants                    # 列出租户（管理员）
POST   /v1/tenants                    # 创建租户
GET    /v1/tenants/{id}               # 获取租户信息
PUT    /v1/tenants/{id}               # 更新租户信息
DELETE /v1/tenants/{id}               # 删除租户

# 成员管理
GET    /v1/tenants/{id}/members       # 列出成员
POST   /v1/tenants/{id}/members       # 邀请成员
PUT    /v1/tenants/{id}/members/{userId}  # 更新成员角色
DELETE /v1/tenants/{id}/members/{userId}  # 移除成员

# 认证授权
POST   /v1/auth/login                 # 登录
POST   /v1/auth/logout                # 登出
POST   /v1/auth/refresh               # 刷新 Token
POST   /v1/auth/sso/{provider}        # SSO 登录

# 计费管理
GET    /v1/tenants/{id}/subscription  # 获取订阅信息
PUT    /v1/tenants/{id}/subscription  # 更新订阅
GET    /v1/tenants/{id}/usage         # 获取用量信息
GET    /v1/tenants/{id}/invoices      # 列出发票
```

### 3. 响应格式

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-04-03T03:00:00Z"
  }
}
```

---

## 迁移方案

### 1. 数据迁移策略

**Phase 1: 准备阶段**

1. 备份现有数据
2. 创建租户表和关联关系
3. 为所有现有数据添加 `tenant_id`

**Phase 2: 迁移阶段**

1. 创建默认租户
2. 将现有用户关联到默认租户
3. 更新所有查询添加租户过滤

**Phase 3: 验证阶段**

1. 运行测试套件
2. 验证数据完整性
3. 性能测试

### 2. 迁移脚本

```typescript
// migration-add-tenant.ts

async function migrateToMultiTenant() {
  // 1. 创建默认租户
  const defaultTenant = await db.exec(`
    INSERT INTO tenants (id, name, slug, plan, status)
    VALUES (?, ?, ?, ?, ?)
  `, ['default', 'Default Tenant', 'default', 'professional', 'active'])
  
  // 2. 为所有表添加 tenant_id
  const tables = ['users', 'agents', 'workflows', 'conversations']
  
  for (const table of tables) {
    // 添加 tenant_id 列
    await db.exec(`ALTER TABLE ${table} ADD COLUMN tenant_id TEXT DEFAULT 'default'`)
    
    // 创建索引
    await db.exec(`CREATE INDEX idx_${table}_tenant ON ${table}(tenant_id)`)
  }
  
  // 3. 更新外键关系
  // ...
  
  console.log('Migration completed successfully')
}
```

### 3. 回滚方案

```typescript
async function rollbackMigration() {
  // 1. 删除 tenant_id 列
  const tables = ['users', 'agents', 'workflows', 'conversations']
  
  for (const table of tables) {
    await db.exec(`ALTER TABLE ${table} DROP COLUMN tenant_id`)
  }
  
  // 2. 删除租户表
  await db.exec('DROP TABLE IF EXISTS tenants')
  
  console.log('Rollback completed successfully')
}
```

### 4. 迁移检查清单

- [ ] 备份数据库
- [ ] 创建迁移脚本
- [ ] 测试环境验证
- [ ] 性能基准测试
- [ ] 生产环境备份
- [ ] 执行迁移
- [ ] 验证数据完整性
- [ ] 更新应用代码
- [ ] 部署新版本
- [ ] 监控错误日志
- [ ] 用户验收测试

---

## 附录

### A. 数据库 Schema

详见: `/src/lib/db/migrations/001_multi_tenant.sql`

### B. API 文档

详见: `/docs/api/multi-tenant.yaml`

### C. 配置示例

详见: `/config/multi-tenant.example.json`

---

**版本**: v1.10.0  
**最后更新**: 2026-04-03  
**作者**: Executor + 咨询师
