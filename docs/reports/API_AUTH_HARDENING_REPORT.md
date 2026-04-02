# 🔒 API 认证安全审计报告

**日期**: 2026-03-29
**审计范围**: API 端点认证、密钥管理
**审计人员**: 📚 咨询师 + 🛡️ 系统管理员
**状态**: ⚠️ 发现严重问题

---

## 📋 执行摘要

本次审计发现 **2 个严重安全问题** 需要立即修复：

1. 🔴 **`/api/feedback` PATCH 端点使用弱认证机制** - 任何人都可绕过认证
2. 🔴 **`/api/feedback` DELETE 端点未实际验证 JWT token** - 存在认证缺失风险

其他 API 端点 (`/api/database/optimize`, `/api/performance/clear`) 已正确使用 `withAdmin` 中间件。

---

## 1. API 端点认证状态

### 🔴 严重问题 - `/api/feedback` PATCH

**文件**: `src/app/api/feedback/route.ts`

**问题代码** (第 312-318 行):

```typescript
// Check admin permissions (simplified - in production, verify JWT token)
const isAdmin = body.admin_id === 'admin' // Placeholder

if (!isAdmin) {
  const response = await createForbiddenError('Admin access required')
  logRequestComplete(metadata, response, startTime)
  return response
}
```

**安全风险**:

- ⚠️ 使用请求体中的 `admin_id === 'admin'` 进行认证
- ⚠️ 任何人都可以在请求中发送 `{ admin_id: 'admin' }` 绕过认证
- ⚠️ 这是一个"占位符"实现，但代码已部署在生产环境中

**攻击场景**:

```bash
# 任何人都可以修改反馈数据
curl -X PATCH http://7zi.com/api/feedback/xxx \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": "admin",
    "status": "resolved",
    "priority": "low"
  }'
```

**影响范围**:

- ✗ 未授权访问反馈数据
- ✗ 可以修改反馈状态、优先级
- ✗ 可以添加管理员备注
- ✗ 可以篡改反馈元数据

**修复优先级**: 🔴 **P0 - 立即修复**

---

### 🔴 严重问题 - `/api/feedback` DELETE

**文件**: `src/app/api/feedback/route.ts`

**问题代码** (第 397-400 行):

```typescript
// Check admin permissions (simplified - in production, verify JWT token)
const authHeader = request.headers.get('authorization')
// In production, verify JWT token here
```

**安全风险**:

- ⚠️ 获取了 `authorization` header 但**没有实际验证**
- ⚠️ 代码中只有注释，没有 JWT token 验证逻辑
- ⚠️ 任何人都可以删除反馈数据

**攻击场景**:

```bash
# 任何人都可以删除反馈
curl -X DELETE http://7zi.com/api/feedback/xxx
```

**影响范围**:

- ✗ 未授权删除反馈数据
- ✗ 数据丢失风险
- ✗ 审计日志完整性受损

**修复优先级**: 🔴 **P0 - 立即修复**

---

### ✅ 已安全配置的端点

#### `/api/database/optimize` POST

**文件**: `src/app/api/database/optimize/route.ts`

```typescript
export async function POST(request: NextRequest) {
  return withAdmin(request, POSTHandler)
}
```

**状态**: ✅ **安全** - 正确使用 `withAdmin` 中间件

**认证流程**:

1. 检查 Authorization header
2. 验证 JWT token
3. 验证用户角色为 ADMIN
4. 记录操作日志

---

#### `/api/performance/clear` POST

**文件**: `src/app/api/performance/clear/route.ts`

```typescript
export async function POST(request: NextRequest) {
  return withAdmin(request, POSTHandler)
}
```

**状态**: ✅ **安全** - 正确使用 `withAdmin` 中间件

---

## 2. `withAdmin` 中间件分析

**文件**: `src/lib/auth/middleware-rbac.ts`

```typescript
/**
 * Admin role middleware (RBAC-aware)
 */
export function withAdmin(
  request: NextRequest,
  handler: (request: NextRequest, context: RBACUserContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return withRole(Role.ADMIN)(request, handler)
}
```

**认证流程**:

1. ✅ 检查 `Authorization: Bearer <token>` header
2. ✅ 验证 JWT token 签名和过期时间
3. ✅ 验证 token 类型为 `user`
4. ✅ 验证用户角色包含 `Role.ADMIN`
5. ✅ 返回增强的用户上下文

**状态**: ✅ **实现正确** - 中间件本身没有问题

**问题根源**: `/api/feedback` 端点没有使用这个中间件！

---

## 3. JWT 密钥管理问题

### 🔍 密钥配置

**文件**: `src/lib/auth/service.ts`

```typescript
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.AGENT_ENCRYPTION_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required in production')
  }
  return secret
}
```

**当前配置**:

- ✅ 要求配置 `JWT_SECRET` 或 `AGENT_ENCRYPTION_SECRET`
- ✅ 生产环境未配置会抛出错误
- ⚠️ **缺少密钥轮换机制**

### 🔴 密钥轮换策略缺失

**问题**:

- ❌ 没有定期轮换 JWT 密钥的机制
- ❌ 没有密钥过期策略
- ❌ 没有多密钥支持（平滑轮换）
- ❌ 没有密钥版本管理

**安全风险**:

- ⚠️ 密钥泄露后无法快速撤销
- ⚠️ 长期使用同一密钥增加暴力破解风险
- ⚠️ 无法应对密钥泄露事件

**最佳实践建议**:

1. 🔴 **立即**: 建立密钥轮换计划（建议 90 天）
2. 🟡 **短期**: 实现多密钥支持（平滑轮换）
3. 🟢 **长期**: 使用密钥管理服务（AWS KMS / HashiCorp Vault）

---

## 4. 环境变量安全性评估

### `.env.production` 文件分析

**文件**: `.env.production`

```env
# 应用配置
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# 网站统计配置
NEXT_PUBLIC_PLAUSIBLE_ID=7zi.com

# 邮件服务 (已注释)
# RESEND_API_KEY=re_your_production_api_key

# GitHub API (已注释)
# GITHUB_TOKEN=ghp_your_production_token
```

**安全状态**: ✅ **良好**

**优点**:

- ✅ 所有敏感密钥已注释
- ✅ 没有 `NEXT_PUBLIC_` 前缀的服务端密钥
- ✅ 无泄露风险

**缺失配置**:

```bash
# ⚠️ 需要在生产服务器上配置:
JWT_SECRET=your_strong_random_secret_here  # 必须配置
AGENT_ENCRYPTION_SECRET=your_strong_random_secret_here  # 备选密钥

# 可选配置:
RESEND_API_KEY=re_xxx  # 邮件服务
GITHUB_TOKEN=ghp_xxx  # GitHub API
```

---

## 5. 修复建议

### 🔴 P0 - 立即修复

#### 修复 1: `/api/feedback` PATCH 端点认证

**文件**: `src/app/api/feedback/route.ts`

**当前代码** (第 293 行):

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const metadata = logRequestStart(request);

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();

    // ❌ 移除这个弱认证
    const isAdmin = body.admin_id === 'admin';

    if (!isAdmin) {
      const response = await createForbiddenError('Admin access required');
      logRequestComplete(metadata, response, startTime);
      return response;
    }

    // ... rest of the code
  }
}
```

**修复方案 A** - 使用 withAdmin 中间件（推荐）:

```typescript
// 在文件顶部导入 withAdmin
import { withAdmin, RBACUserContext } from '@/lib/auth/middleware-rbac';

// 修改 PATCH handler
async function PATCHHandler(
  request: NextRequest,
  context: RBACUserContext
) {
  const startTime = Date.now();
  const metadata = logRequestStart(request);

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();

    // ✅ 认证已完成，无需手动检查
    const updates: UpdateFeedbackDto = {
      status: body.status,
      priority: body.priority,
      admin_notes: body.admin_notes,
      metadata: body.metadata,
    };

    // ... rest of the code

    logger.info('Feedback updated', {
      category: 'feedback',
      feedbackId: id,
      adminId: context.userId,  // ✅ 使用认证后的用户 ID
      updates,
    });

    // ... rest of the code
  }
  // ... error handling
}

// ✅ 导出使用 withAdmin 包装的 handler
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdmin(request, (req, ctx) => PATCHHandler(req, ctx, params));
}
```

**修复方案 B** - 手动验证 JWT token:

```typescript
// 在文件顶部导入认证函数
import { authenticateToken } from '@/lib/auth/service';

// 修改 PATCH handler
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const metadata = logRequestStart(request);

  try {
    // ✅ 获取并验证 JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response = await createUnauthorizedError('Missing authorization header');
      logRequestComplete(metadata, response, startTime);
      return response;
    }

    const token = authHeader.substring(7);
    const authResult = await authenticateToken(token);

    if (!authResult) {
      const response = await createUnauthorizedError('Invalid or expired token');
      logRequestComplete(metadata, response, startTime);
      return response;
    }

    // ✅ 验证管理员权限
    if (authResult.user.role !== 'admin') {
      const response = await createForbiddenError('Admin access required');
      logRequestComplete(metadata, response, startTime);
      return response;
    }

    // ... rest of the code

    logger.info('Feedback updated', {
      category: 'feedback',
      feedbackId: id,
      adminId: authResult.context.userId,  // ✅ 使用认证后的用户 ID
      updates,
    });

    // ... rest of the code
  }
  // ... error handling
}
```

**推荐**: 使用 **方案 A**，因为:

- 代码更简洁
- 与其他端点保持一致
- 利用现有的 RBAC 系统
- 更容易维护

---

#### 修复 2: `/api/feedback` DELETE 端点认证

**文件**: `src/app/api/feedback/route.ts`

**当前代码** (第 397 行):

```typescript
export async function DELETE_FEEDBACK(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const metadata = logRequestStart(request);

  try {
    const { id } = params;

    // ❌ 只获取了 header，没有验证
    const authHeader = request.headers.get('authorization');
    // In production, verify JWT token here

    // ... rest of the code
  }
}
```

**修复方案** - 使用 withAdmin 中间件:

```typescript
// 在文件顶部导入 withAdmin
import { withAdmin, RBACUserContext } from '@/lib/auth/middleware-rbac';

// 修改 DELETE_FEEDBACK handler
async function DELETE_FEEDBACKHandler(
  request: NextRequest,
  context: RBACUserContext,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const metadata = logRequestStart(request);

  try {
    const { id } = params;

    // ✅ 认证已完成，无需手动检查

    const db = await getDatabaseAsync();

    // ... rest of the code

    db.exec('DELETE FROM feedbacks WHERE id = ?', [id]);

    logger.info('Feedback deleted', {
      category: 'feedback',
      feedbackId: id,
      adminId: context.userId,  // ✅ 记录执行删除的管理员
    });

    // ... rest of the code
  }
  // ... error handling
}

// ✅ 导出使用 withAdmin 包装的 handler
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdmin(request, (req, ctx) => DELETE_FEEDBACKHandler(req, ctx, { params }));
}
```

---

### 🟡 P1 - 短期修复

#### 修复 3: 实现 JWT 密钥轮换机制

**目标**: 建立 90 天密钥轮换策略

**方案 A** - 简单版本（短期）:

```typescript
// src/lib/auth/rotation-service.ts

export class JwtRotationService {
  private static readonly ROTATION_DAYS = 90

  /**
   * 检查密钥是否需要轮换
   */
  static shouldRotate(): boolean {
    const lastRotation = process.env.JWT_LAST_ROTATION
    if (!lastRotation) return true

    const lastRotationDate = new Date(lastRotation)
    const daysSinceRotation = (Date.now() - lastRotationDate.getTime()) / (1000 * 60 * 60 * 24)

    return daysSinceRotation >= this.ROTATION_DAYS
  }

  /**
   * 记录密钥轮换时间
   */
  static recordRotation(): void {
    process.env.JWT_LAST_ROTATION = new Date().toISOString()
    // 在生产环境中，应该更新 .env.production 文件或数据库
  }

  /**
   * 生成新的 JWT 密钥
   */
  static generateNewSecret(): string {
    return require('crypto').randomBytes(64).toString('hex')
  }
}
```

**使用方法**:

```bash
# 在服务器上运行密钥轮换脚本
node scripts/rotate-jwt-secret.js
```

**方案 B** - 完整版本（长期）:

```typescript
// src/lib/auth/rotation-service.ts

export class JwtRotationService {
  private static readonly ROTATION_DAYS = 90
  private static readonly GRACE_PERIOD_DAYS = 7

  /**
   * 获取当前活跃的密钥
   */
  static getActiveSecret(): string {
    const currentSecret = process.env.JWT_SECRET
    const previousSecret = process.env.JWT_SECRET_PREVIOUS

    // 支持双密钥：验证时尝试两个密钥
    return {
      current: currentSecret || process.env.AGENT_ENCRYPTION_SECRET || '',
      previous: previousSecret || '',
    }
  }

  /**
   * 验证 token（支持多密钥）
   */
  static async verifyToken(token: string) {
    const secrets = this.getActiveSecret()

    // 先尝试当前密钥
    try {
      return await verifyJwtToken(token, secrets.current)
    } catch {
      // 尝试上一个密钥（在轮换过渡期内）
      if (secrets.previous) {
        try {
          return await verifyJwtToken(token, secrets.previous)
        } catch {
          return null
        }
      }
      return null
    }
  }

  /**
   * 执行密钥轮换
   */
  static async rotateSecret(): Promise<void> {
    const newSecret = this.generateNewSecret()

    // 1. 保存当前密钥为 previous（在过渡期内验证旧 token）
    process.env.JWT_SECRET_PREVIOUS = process.env.JWT_SECRET

    // 2. 设置新密钥
    process.env.JWT_SECRET = newSecret

    // 3. 记录轮换时间
    this.recordRotation()

    // 4. 通知需要更新 .env.production
    console.warn('\n⚠️  JWT 密钥已轮换！')
    console.warn('⚠️  请更新生产服务器的 .env.production 文件:')
    console.warn(`JWT_SECRET=${newSecret}`)
    console.warn(`JWT_SECRET_PREVIOUS=${process.env.JWT_SECRET_PREVIOUS}`)
    console.warn(`JWT_LAST_ROTATION=${new Date().toISOString()}\n`)
  }
}
```

**密钥轮换流程**:

```bash
# 1. 生成新密钥（不影响服务）
node scripts/generate-new-secret.js

# 2. 更新 .env.production
# 3. 重启服务（使用新密钥签发，支持验证旧密钥）
# 4. 等待 7 天（过渡期，所有旧 token 自然过期）
# 5. 移除 JWT_SECRET_PREVIOUS
```

---

### 🟢 P2 - 长期优化

#### 优化 1: 使用密钥管理服务

```typescript
// src/lib/auth/kms-provider.ts

export class KmsJwtProvider {
  private static readonly KEY_ID = 'jwt-signing-key'

  /**
   * 从 KMS 获取签名密钥
   */
  static async getSigningKey(): Promise<Uint8Array> {
    // AWS KMS
    // return await kmsClient.send(new GetPublicKeyCommand({ KeyId: this.KEY_ID }));

    // HashiCorp Vault
    // return await vault.read('secret/data/jwt');

    throw new Error('KMS not configured')
  }

  /**
   * 使用 KMS 签名 token
   */
  static async signToken(payload: any): Promise<string> {
    const key = await this.getSigningKey()
    return await new SignJWT(payload).setProtectedHeader({ alg: 'RS256' }).sign(key)
  }
}
```

#### 优化 2: 实现密钥版本控制

```typescript
// src/lib/auth/key-versioning.ts

export interface KeyVersion {
  version: number
  secret: string
  createdAt: string
  expiresAt?: string
  status: 'active' | 'previous' | 'deprecated'
}

export class KeyVersionManager {
  private static versions: KeyVersion[] = []

  /**
   * 添加新密钥版本
   */
  static addVersion(secret: string): KeyVersion {
    const version: KeyVersion = {
      version: this.versions.length + 1,
      secret,
      createdAt: new Date().toISOString(),
      status: 'active',
    }

    // 将当前活跃密钥降级为 previous
    this.versions = this.versions.map(v => ({
      ...v,
      status: v.status === 'active' ? 'previous' : v.status,
    }))

    this.versions.push(version)
    return version
  }

  /**
   * 获取活跃密钥
   */
  static getActiveKey(): string {
    const active = this.versions.find(v => v.status === 'active')
    if (!active) throw new Error('No active key found')
    return active.secret
  }

  /**
   * 获取所有验证密钥（active + previous）
   */
  static getVerificationKeys(): string[] {
    return this.versions
      .filter(v => v.status === 'active' || v.status === 'previous')
      .map(v => v.secret)
  }
}
```

---

## 6. 安全检查清单

### 🔴 立即修复（本周内）

- [ ] 修复 `/api/feedback` PATCH 认证
- [ ] 修复 `/api/feedback` DELETE 认证
- [ ] 在生产服务器配置 `JWT_SECRET`
- [ ] 验证所有 admin 端点使用 `withAdmin`
- [ ] 运行回归测试

### 🟡 短期修复（30 天内）

- [ ] 实现 JWT 密钥轮换机制
- [ ] 建立密钥轮换提醒系统
- [ ] 添加密钥轮换文档
- [ ] 创建密钥轮换脚本
- [ ] 配置生产环境密钥轮换 cron

### 🟢 长期优化（90 天内）

- [ ] 评估密钥管理服务（KMS/Vault）
- [ ] 实现密钥版本控制
- [ ] 添加密钥泄露检测
- [ ] 实现自动密钥轮换
- [ ] 集成安全审计日志

---

## 7. 风险评估

### 当前风险等级

| 问题            | 严重性 | 影响     | 可能性 | 风险等级    |
| --------------- | ------ | -------- | ------ | ----------- |
| PATCH 认证绕过  | 🔴 高  | 数据篡改 | 高     | 🔴 **严重** |
| DELETE 认证缺失 | 🔴 高  | 数据丢失 | 高     | 🔴 **严重** |
| 密钥无轮换      | 🟡 中  | 长期泄露 | 中     | 🟡 **中等** |

### 修复后风险等级

| 问题            | 严重性 | 影响 | 可能性 | 风险等级      |
| --------------- | ------ | ---- | ------ | ------------- |
| PATCH 认证绕过  | 🟢 低  | 无   | 极低   | 🟢 **可接受** |
| DELETE 认证缺失 | 🟢 低  | 无   | 极低   | 🟢 **可接受** |
| 密钥无轮换      | 🟡 中  | 有限 | 低     | 🟡 **可接受** |

---

## 8. 测试建议

### 认证绕过测试

```bash
# 测试 PATCH 认证绕过（修复前应该成功，修复后应该失败）
curl -X PATCH http://7zi.com/api/feedback/test-id \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": "admin",
    "status": "resolved"
  }'

# 预期修复后响应:
# {
#   "success": false,
#   "error": {
#     "code": "UNAUTHORIZED",
#     "message": "Missing authorization header"
#   }
# }
```

### DELETE 认证测试

```bash
# 测试 DELETE 认证（修复前应该成功，修复后应该失败）
curl -X DELETE http://7zi.com/api/feedback/test-id

# 预期修复后响应:
# {
#   "success": false,
#   "error": {
#     "code": "UNAUTHORIZED",
#     "message": "Missing authorization header"
#   }
# }
```

### 正常认证测试

```bash
# 1. 登录获取 token
TOKEN=$(curl -X POST http://7zi.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@7zi.studio",
    "password": "your-password"
  }' | jq -r '.token')

# 2. 使用 token 访问 admin 端点
curl -X DELETE http://7zi.com/api/feedback/test-id \
  -H "Authorization: Bearer $TOKEN"

# 预期响应:
# {
#   "success": true,
#   "data": { ... }
# }
```

---

## 9. 监控和告警

### 关键指标

```typescript
// src/lib/auth/metrics.ts

export class AuthMetrics {
  /**
   * 记录认证失败
   */
  static recordAuthFailure(userId: string, reason: string) {
    logger.warn('Auth failure', { userId, reason })

    // 如果失败率超过阈值，触发告警
    if (this.getFailureRate() > 0.1) {
      this.triggerAlert('High auth failure rate detected')
    }
  }

  /**
   * 记录成功认证
   */
  static recordAuthSuccess(userId: string) {
    logger.info('Auth success', { userId })
  }

  /**
   * 检查密钥轮换提醒
   */
  static checkRotationReminder() {
    const lastRotation = process.env.JWT_LAST_ROTATION
    if (!lastRotation) {
      this.triggerAlert('JWT_LAST_ROTATION not set')
      return
    }

    const daysSinceRotation =
      (Date.now() - new Date(lastRotation).getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceRotation > 85) {
      this.triggerAlert('JWT secret rotation due in less than 5 days')
    }
  }
}
```

---

## 10. 总结

### 📊 审计结果

- **严重问题**: 2 个
- **中等问题**: 1 个（密钥轮换）
- **已安全端点**: 2 个

### ✅ 优点

- ✅ `withAdmin` 中间件实现正确
- ✅ `/api/database/optimize` 和 `/api/performance/clear` 已正确使用认证
- ✅ 环境变量配置安全（无泄露）
- ✅ JWT token 验证逻辑完善

### ⚠️ 需要改进

- ⚠️ `/api/feedback` PATCH/DELETE 端点认证缺失
- ⚠️ 缺少 JWT 密钥轮换机制
- ⚠️ 缺少密钥版本管理

### 🎯 下一步行动

1. **立即修复**（本周内）:
   - 修复 `/api/feedback` PATCH 认证
   - 修复 `/api/feedback` DELETE 认证
   - 配置生产环境 `JWT_SECRET`

2. **短期改进**（30 天内）:
   - 实现 JWT 密钥轮换机制
   - 建立密钥轮换提醒

3. **长期优化**（90 天内）:
   - 评估密钥管理服务
   - 实现密钥版本控制

---

**报告完成时间**: 2026-03-29 20:45 GMT+2
**审计工具**: OpenClaw 安全审计系统
**报告版本**: 1.0
