# 多租户系统使用指南 v2.0

> **架构更新**: v2.0 版本新增了增强的安全建议。请确保已执行数据库迁移以启用租户级别的权限隔离。

## 快速开始

### 1. 运行数据库迁移

```bash
# 预览迁移（不执行）
npx tsx scripts/migrate-to-multi-tenant.ts --dry-run

# 执行迁移
npx tsx scripts/migrate-to-multi-tenant.ts
```

### 2. 创建租户

```typescript
import { tenantService } from '@/lib/tenant'

const tenant = await tenantService.createTenant(userId, {
  name: 'My Company',
  plan: 'professional',
  isolationMode: 'shared',
})

console.log('Tenant created:', tenant.id)
```

### 3. 添加成员

```typescript
await tenantService.addMember(tenantId, userId, 'member')
```

### 4. 记录用量

```typescript
import { billingService } from '@/lib/billing'

await billingService.recordUsage(tenantId, 'ai_calls', 100)
```

## API 使用

### 创建租户

```bash
POST /api/v1/tenants
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "My Company",
  "plan": "professional",
  "isolationMode": "shared"
}
```

### 获取租户信息

```bash
GET /api/v1/tenants/{tenant_id}
Authorization: Bearer {token}
```

### 更新租户

```bash
PUT /api/v1/tenants/{tenant_id}
Authorization: Bearer {token}

{
  "name": "Updated Company Name",
  "plan": "enterprise"
}
```

### 获取租户统计

```bash
GET /api/v1/tenants/{tenant_id}/stats
Authorization: Bearer {token}
```

### 获取租户配额

```bash
GET /api/v1/tenants/{tenant_id}/quota
Authorization: Bearer {token}
```

## 中间件使用

### 租户识别

```typescript
import { tenantMiddleware } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const response = await tenantMiddleware(request)
  if (response) return response
  
  // 处理请求
}
```

### 权限检查

```typescript
import { requirePermission } from '@/lib/tenant'

export async function POST(request: NextRequest) {
  const response = await requirePermission('agents', 'write')(request)
  if (response) return response
  
  // 处理请求
}
```

### 角色检查

```typescript
import { requireRole } from '@/lib/tenant'

export async function DELETE(request: NextRequest) {
  const response = await requireRole('admin', 'owner')(request)
  if (response) return response
  
  // 处理请求
}
```

### 配额检查

```typescript
import { checkQuota } from '@/lib/tenant'

export async function POST(request: NextRequest) {
  const response = await checkQuota('agents')(request)
  if (response) return response
  
  // 处理请求
}
```

## 数据加密

### 加密敏感字段

```typescript
import { encryptionService } from '@/lib/security'

const data = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '13812345678',
}

const encrypted = await encryptionService.encryptField(
  data,
  ['email', 'phone'],
  tenantId
)
```

### 解密敏感字段

```typescript
const decrypted = await encryptionService.decryptField(
  encrypted,
  ['email', 'phone'],
  tenantId
)
```

## 审计日志

### 记录审计事件

```typescript
import { auditService } from '@/lib/security'

await auditService.log({
  tenantId,
  userId,
  action: 'data_update',
  resourceType: 'agent',
  resourceId: agentId,
  oldValue: oldData,
  newValue: newData,
  ipAddress: request.headers.get('x-forwarded-for'),
  userAgent: request.headers.get('user-agent'),
})
```

### 查询审计日志

```typescript
const logs = await auditService.query({
  tenantId,
  userId,
  action: 'data_update',
  startDate: new Date('2026-04-01'),
  endDate: new Date('2026-04-30'),
  limit: 100,
})
```

### 导出审计日志

```typescript
const exported = await auditService.export(tenantId, 'json')
// 或
const exported = await auditService.export(tenantId, 'csv')
```

## 数据脱敏

### 自动脱敏

```typescript
import { dataMaskingService } from '@/lib/security'

const masked = dataMaskingService.autoMask('13812345678')
// 输出: 138****5678
```

### 指定类型脱敏

```typescript
const masked = dataMaskingService.maskByType('test@example.com', 'email')
// 输出: t***@example.com
```

### 批量脱敏

```typescript
const data = {
  name: '张三',
  phone: '13812345678',
  email: 'test@example.com',
}

const masked = dataMaskingService.maskObject(data, {
  name: 'name',
  phone: 'phone',
  email: 'email',
})
```

## 计费管理

### 获取订阅

```typescript
import { billingService } from '@/lib/billing'

const subscription = await billingService.getSubscription(tenantId)
```

### 更新订阅

```typescript
const subscription = await billingService.createOrUpdateSubscription(
  tenantId,
  'plan_enterprise',
  'yearly'
)
```

### 取消订阅

```typescript
await billingService.cancelSubscription(tenantId, false) // 立即取消
await billingService.cancelSubscription(tenantId, true)  // 周期结束后取消
```

### 生成发票

```typescript
const invoice = await billingService.generateInvoice(tenantId)
```

### 处理支付

```typescript
const payment = await billingService.processPayment(
  invoiceId,
  'alipay'
)
```

## 权限检查

### 检查用户权限

```typescript
import { tenantService } from '@/lib/tenant'

const hasPermission = await tenantService.checkPermission(
  userId,
  tenantId,
  'agents',
  'write'
)
```

### 获取用户权限列表

```typescript
const permissions = await tenantService.getUserPermissions(userId, tenantId)
```

## 配额管理

### 获取租户配额

```typescript
const quota = await tenantService.getTenantQuota(tenantId)

console.log('Users:', quota.current.users, '/', quota.maxUsers)
console.log('Agents:', quota.current.agents, '/', quota.maxAgents)
console.log('Workflows:', quota.current.workflows, '/', quota.maxWorkflows)
console.log('Storage:', quota.current.storageGB, '/', quota.maxStorageGB)
```

### 检查用量限制

```typescript
const limit = await billingService.checkUsageLimit(tenantId, 'ai_calls')

if (limit.exceeded) {
  console.log('AI calls quota exceeded!')
  console.log(`Used: ${limit.used}, Limit: ${limit.limit}`)
}
```

## 环境变量

```bash
# 加密主密钥（必须设置）
ENCRYPTION_MASTER_KEY=your-256-bit-hex-key

# 数据库路径
DATABASE_PATH=/path/to/database.sqlite

# 支付网关配置
ALIPAY_APP_ID=your_app_id
ALIPAY_PRIVATE_KEY=your_private_key
WECHAT_APP_ID=your_app_id
WECHAT_APP_SECRET=your_app_secret
```

## 测试

```bash
# 运行所有测试
npm test

# 运行多租户测试
npm test -- tenant

# 运行特定测试
npm test -- tenant.test.ts
```

## 故障排查

### 迁移失败

1. 检查数据库备份
2. 查看错误日志
3. 使用 `--dry-run` 预览
4. 手动执行 SQL

### 权限错误

1. 检查用户角色
2. 验证权限配置
3. 查看审计日志

### 加密错误

1. 检查 `ENCRYPTION_MASTER_KEY`
2. 验证租户密钥
3. 检查数据格式

## 最佳实践

1. **始终使用中间件**: 在所有 API 路由中使用租户和权限中间件
2. **记录审计日志**: 对所有敏感操作记录审计日志
3. **加密敏感数据**: 对用户隐私数据使用字段级加密
4. **检查配额**: 在创建资源前检查配额
5. **脱敏输出**: 对日志和导出数据进行脱敏

## v2.0 安全增强

### 权限表租户隔离 (推荐执行)

为 `resource_permissions` 表添加租户隔离：

```bash
# 备份数据库
cp database.sqlite database.sqlite.backup

# 执行 SQL 迁移
npx tsx -e "
import { db } from './src/lib/db';
await db.exec(\`ALTER TABLE resource_permissions ADD COLUMN tenant_id TEXT DEFAULT 'default'\`);
await db.exec(\`CREATE INDEX IF NOT EXISTS idx_resource_permissions_tenant ON resource_permissions(tenant_id)\`);
console.log('Migration complete');
process.exit(0);
"
```

### 缓存 Key 格式

使用租户感知的缓存 key 格式：

```typescript
// ✅ 推荐：包含租户 ID
cache:${tenantId}:${resource}:${id}

// ❌ 不推荐：缺少租户隔离
cache:${resource}:${id}
```

### 防御性验证

在服务层添加输入验证：

```typescript
// 验证 tenantId 格式
function validateTenantId(tenantId: string): boolean {
  return /^tenant_[a-z0-9]+$/.test(tenantId) || tenantId === 'default';
}

// 在所有公共方法开头验证
async getSubscription(tenantId: string): Promise<Subscription | null> {
  if (!validateTenantId(tenantId)) {
    throw new Error('Invalid tenant ID');
  }
  // ...
}
```

## 支持

如有问题，请查看：
- 设计文档: `/docs/MULTI_TENANT_ARCHITECTURE_v110.md`
- 实现报告: `/MULTI_TENANT_IMPLEMENTATION_REPORT.md`
- 架构分析: `MULTI_TENANT_ARCHITECTURE_ANALYSIS.md` (详细问题分析和改进建议)
- API 文档: `/docs/api/multi-tenant.yaml`

---

**文档版本**: v2.0  
**更新日期**: 2026-04-03  
**新增内容**: 权限系统租户隔离建议、缓存安全最佳实践、防御性验证指南