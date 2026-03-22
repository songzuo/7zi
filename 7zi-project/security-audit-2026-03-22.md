# 7zi-Project 安全审计报告

**审计日期**: 2026-03-22
**审计人员**: 系统管理员
**项目路径**: `/root/.openclaw/workspace/7zi-project`
**项目版本**: 1.0.8

---

## 📋 执行摘要

本次安全审计针对 7zi-project 进行了全面的安全检查，涵盖依赖包漏洞、API 路由安全、环境变量管理、CORS 配置以及 SQL 注入风险。

**总体评估**: 🟡 **中等风险**

发现了多个需要立即关注的安全问题，主要集中在 API 认证授权、敏感信息暴露和环境变量配置方面。虽然有良好的基础安全措施，但仍需进行加固。

---

## 🚨 严重安全漏洞

### 1. API 端点缺乏认证机制

**严重级别**: 🔴 严重
**影响范围**: `/api/backup`, `/api/export`, `/api/status`

**问题描述**:
- `/api/backup` 的 POST 请求（创建备份）没有认证检查
- `/api/export` 的 GET 请求虽然有 authorization header 检查，但只检查格式，不验证 token 有效性
- `/api/status` 无任何认证限制，任何人都可以访问系统状态信息

**代码示例**:
```typescript
// src/app/api/backup/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ⚠️ 无认证检查，任何人都可以创建备份
    return NextResponse.json({
      success: true,
      data: { message: 'Backup created' },
    }, { status: 201 });
  }
}

// src/app/api/export/route.ts
const authHeader = request.headers.get('authorization');
if (authHeader && !authHeader.startsWith('Bearer ')) {
  // ⚠️ 只检查格式，不验证实际 token 是否有效
  return NextResponse.json({ success: false, error: 'Invalid authorization header' }, { status: 401 });
}
```

**安全风险**:
- 攻击者可滥用备份接口造成磁盘空间耗尽
- 系统状态信息可能泄露部署环境和版本信息
- 导出接口可能被滥用导出敏感数据

**修复建议**:
```typescript
// 添加认证中间件
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await verifyJwtToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // 检查权限
    if (!hasPermission(user.role, 'backup:create')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // 执行备份逻辑
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 401 });
  }
}
```

---

### 2. WebSocket 认证漏洞

**严重级别**: 🔴 严重
**影响范围**: `/api/ws` (WebSocket 连接)

**问题描述**:
- WebSocket 认证依赖于 `verifyJwtToken` 函数，但没有速率限制
- 认证失败不会记录尝试次数，可能遭受暴力破解攻击
- 缺少对重复连接的限制

**代码示例**:
```typescript
// src/lib/websocket/server.ts
async function authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      // ⚠️ 无速率限制，可能被滥用
      return next(new Error('No token provided'));
    }

    const userContext = await verifyJwtToken(token);
    // ... 验证逻辑
  } catch (error) {
    // ⚠️ 错误处理不完善
    next(new Error('Authentication failed'));
  }
}
```

**修复建议**:
1. 添加连接速率限制
2. 实现认证失败追踪
3. 添加 IP 封禁机制

```typescript
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

async function authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  const ip = socket.handshake.address;

  // 检查是否被封禁
  const attempts = failedAttempts.get(ip);
  if (attempts && attempts.count >= 5 && Date.now() - attempts.lastAttempt < 15 * 60 * 1000) {
    return next(new Error('Too many failed attempts. Please try again later.'));
  }

  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      trackFailedAttempt(ip);
      return next(new Error('No token provided'));
    }

    const userContext = await verifyJwtToken(token);
    if (!userContext || !userContext.userId) {
      trackFailedAttempt(ip);
      return next(new Error('Invalid token'));
    }

    // 清除失败记录
    failedAttempts.delete(ip);
    next();
  } catch (error) {
    trackFailedAttempt(ip);
    logger.error('Authentication error', { socketId: socket.id, error, ip });
    next(new Error('Authentication failed'));
  }
}
```

---

### 3. 敏感信息暴露

**严重级别**: 🔴 严重
**影响范围**: `/api/status` 端点

**问题描述**:
- `/api/status` 暴露了系统版本、运行时间、环境信息
- 这些信息可被攻击者用于指纹识别和针对性攻击

**代码示例**:
```typescript
// src/app/api/status/route.ts
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,  // ⚠️ 暴露环境信息
    version: process.env.APP_VERSION,    // ⚠️ 暴露版本信息
  });
}
```

**修复建议**:
- 在生产环境中，status 端点应该需要认证
- 减少暴露的信息量
- 使用更通用的状态码

---

## ⚠️ 高危安全漏洞

### 4. 环境变量配置风险

**严重级别**: 🟠 高
**影响范围**: 全局

**问题描述**:
- `.env.production` 文件存在，但缺少 `.gitignore` 文件保护
- 虽然当前密钥都已注释，但结构清晰，容易造成配置错误
- 缺少环境变量验证和类型检查

**发现**:
```bash
# .env.production 文件存在
RESEND_API_KEY=re_your_production_api_key  # ⚠️ 容易被误用
GITHUB_TOKEN=ghp_your_production_token      # ⚠️ 容易被误用
```

**修复建议**:
1. 创建 `.gitignore` 文件：
```gitignore
# Environment variables
.env
.env.local
.env.production
.env.development

# Secrets
*.key
*.pem
secrets/

# Database
*.db
*.db-shm
*.db-wal
data/
```

2. 使用环境变量验证库（如 `zod`）：
```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  RESEND_API_KEY: z.string().min(1).optional(),
  GITHUB_TOKEN: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

function validateEnv() {
  try {
    envSchema.parse(process.env);
  } catch (error) {
    console.error('Environment validation failed:', error);
    process.exit(1);
  }
}
```

3. 在生产环境中使用密钥管理服务（如 AWS Secrets Manager、Vault 等）

---

### 5. CORS 配置风险

**严重级别**: 🟠 高
**影响范围**: WebSocket 和 API 路由

**问题描述**:
- CORS 配置依赖环境变量，如果配置不当可能导致安全漏洞
- WebSocket CORS 配置可能过于宽松

**代码示例**:
```typescript
// src/lib/websocket/server.ts
io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio',  // ⚠️ 默认值可能不适用于所有环境
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
```

**修复建议**:
```typescript
// 使用严格的 CORS 配置
const allowedOrigins = [
  process.env.NEXT_PUBLIC_SITE_URL,
  'https://7zi.studio',
].filter(Boolean);

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
```

---

### 6. JWT Token 安全性

**严重级别**: 🟠 高
**影响范围**: 认证系统

**问题描述**:
- 没有找到 JWT token 的具体实现（`verifyJwtToken` 函数）
- 需要确认：
  - Token 是否设置了合理的过期时间
  - 是否使用了强密钥
  - 是否实现了 token 刷新机制
  - 是否支持 token 吊销

**修复建议**:
1. 确保 JWT 配置安全：
```typescript
const JWT_CONFIG = {
  expiresIn: '1h',           // Access token 有效期
  refreshExpiresIn: '7d',    // Refresh token 有效期
  algorithm: 'HS256',        // 使用安全算法
  issuer: '7zi.com',         // 颁发者
  audience: '7zi-users',     // 受众
};

// 使用强密钥（至少 32 字符）
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}
```

2. 实现 token 黑名单（用于吊销）：
```typescript
interface TokenBlacklist {
  [token: string]: {
    expiresAt: number;
    reason: string;
  };
}

const tokenBlacklist: TokenBlacklist = {};

async function revokeToken(token: string, reason = 'logout') {
  const decoded = decodeJwt(token);
  tokenBlacklist[token] = {
    expiresAt: decoded.exp * 1000,
    reason,
  };
}

async function isTokenRevoked(token: string): boolean {
  const entry = tokenBlacklist[token];
  if (!entry) return false;

  if (Date.now() > entry.expiresAt) {
    delete tokenBlacklist[token];
    return false;
  }

  return true;
}
```

---

## ⚡ 中等安全风险

### 7. 缺少请求速率限制

**严重级别**: 🟡 中
**影响范围**: 所有 API 端点

**问题描述**:
- 没有实现 API 请求速率限制
- 容易遭受 DDoS 攻击或滥用

**修复建议**:
使用速率限制中间件：
```typescript
import { Ratelimit } from '@unkey/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
  analytics: true,
});

export async function withRateLimit(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const result = await ratelimit.limit(ip);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
        },
      }
    );
  }

  return null;
}

// 在路由中使用
export async function POST(request: NextRequest) {
  const rateLimitError = await withRateLimit(request);
  if (rateLimitError) return rateLimitError;

  // 继续处理请求
}
```

---

### 8. 日志和监控不足

**严重级别**: 🟡 中
**影响范围**: 全局

**问题描述**:
- 虽然有日志系统，但缺少安全事件专门日志
- 没有发现入侵检测或异常行为监控
- 缺少对敏感操作的审计日志

**修复建议**:
```typescript
// 安全事件日志
const securityLogger = logger.child({ module: 'security' });

export function logSecurityEvent(event: {
  type: 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'privilege_escalation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
}) {
  securityLogger.warn('Security event', event);

  // 高严重性事件触发警报
  if (event.severity === 'critical' || event.severity === 'high') {
    // 发送到监控系统（如 Sentry、Datadog）
    sendAlert(event);
  }
}

// 使用示例
logSecurityEvent({
  type: 'auth_failure',
  severity: 'medium',
  details: {
    ip: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
    endpoint: request.nextUrl.pathname,
  },
});
```

---

### 9. 文件上传安全（潜在）

**严重级别**: 🟡 中
**影响范围**: 可能存在的文件上传功能

**问题描述**:
- 虽然没有直接发现文件上传 API，但项目使用了 `sharp` 和 `better-sqlite3`，可能存在文件处理功能
- 需要确保所有文件上传都有验证

**修复建议**:
如果存在文件上传功能，确保：
```typescript
export async function uploadFile(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  // 验证文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  // 验证文件大小（10MB 限制）
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }

  // 验证文件内容（防止伪造的 MIME 类型）
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileType = await fileTypeFromBuffer(buffer);
  if (!allowedTypes.includes(fileType.mime)) {
    return NextResponse.json({ error: 'Invalid file content' }, { status: 400 });
  }

  // 重命名文件（防止路径遍历）
  const filename = `${crypto.randomUUID()}.${getExtension(fileType.ext)}`;

  // 继续处理...
}
```

---

## ✅ 已发现的良好实践

1. **依赖包安全**: npm audit 显示 0 个已知漏洞 ✅
2. **安全头部**: `next.config.ts` 已配置 HSTS、X-Frame-Options 等安全头部 ✅
3. **参数化查询**: SQLite 使用参数化查询，减少 SQL 注入风险 ✅
4. **WebSocket 认证**: 实现了 JWT 认证机制 ✅
5. **环境变量**: 密钥未硬编码在代码中，使用环境变量 ✅
6. **TypeScript**: 使用 TypeScript 提供类型安全 ✅

---

## 📊 安全加固建议

### 立即执行（1-3天）

1. **添加 API 认证**: 为 `/api/backup`、`/api/export`、`/api/status` 添加认证中间件
2. **创建 `.gitignore`**: 保护敏感文件不被提交
3. **限制 `/api/status`**: 在生产环境移除敏感信息或要求认证

### 短期执行（1-2周）

4. **实现速率限制**: 使用 Redis 或内存存储实现 API 速率限制
5. **加强 WebSocket 认证**: 添加连接限制和失败追踪
6. **环境变量验证**: 使用 zod 验证所有环境变量
7. **安全审计日志**: 实现专门的安全事件日志系统

### 中期执行（1-2月）

8. **依赖更新监控**: 设置自动化依赖更新和安全告警
9. **安全测试**: 添加自动化安全测试（SAST、DAST）
10. **渗透测试**: 进行定期渗透测试
11. **监控告警**: 集成安全监控和告警系统

### 长期执行（持续）

12. **安全培训**: 团队定期安全培训
13. **合规检查**: 定期进行合规性检查（GDPR、SOC2 等）
14. **安全策略**: 制定和更新安全策略文档
15. **CI/CD 安全**: 在 CI/CD 流程中加入安全扫描

---

## 🔧 优先级修复清单

| 优先级 | 问题 | 影响范围 | 预计工时 |
|--------|------|----------|----------|
| P0 | API 端点缺乏认证 | 多个端点 | 4-6h |
| P0 | WebSocket 认证漏洞 | 实时功能 | 6-8h |
| P0 | 敏感信息暴露 | `/api/status` | 2h |
| P1 | 环境变量配置风险 | 全局 | 2-4h |
| P1 | CORS 配置风险 | WebSocket/API | 4-6h |
| P1 | JWT Token 安全性 | 认证系统 | 8-12h |
| P2 | 缺少请求速率限制 | 所有 API | 8-12h |
| P2 | 日志和监控不足 | 全局 | 6-8h |
| P3 | 文件上传安全 | 潜在上传 | 待评估 |

---

## 📝 附录

### A. 依赖包清单

**主要依赖**:
- next: ^16.2.1
- react: ^19.2.4
- better-sqlite3: ^12.8.0
- socket.io-client: ^4.8.3
- zod: ^4.3.6
- @sentry/nextjs: ^10.44.0

**安全相关依赖**:
- isomorphic-dompurify: ^3.6.0 (XSS 防护)
- jose: ^6.2.1 (JWT 处理)

### B. 检查的文件清单

- `package.json`
- `next.config.ts`
- `.env.production`
- `src/app/api/backup/route.ts`
- `src/app/api/export/route.ts`
- `src/app/api/status/route.ts`
- `src/lib/websocket/server.ts`
- `src/lib/db.ts`
- 其他相关配置文件

### C. 工具和资源

**推荐工具**:
- OWASP ZAP: Web 应用安全扫描
- Snyk: 依赖漏洞检测
- ESLint 安全插件: 代码安全检查
- Helmet: Express 安全头部

**学习资源**:
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [WebSocket Security](https://socket.io/docs/v4/security/)

---

## 📞 联系信息

**审计人员**: 系统管理员 (AI Subagent)
**审计日期**: 2026-03-22
**报告版本**: 1.0

如有问题或需要进一步说明，请联系。

---

*本报告基于当前代码库分析，不保证覆盖所有潜在安全问题。建议定期进行安全审计和渗透测试。*
