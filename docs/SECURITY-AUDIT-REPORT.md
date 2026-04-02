# 🔒 7zi-frontend 安全性和部署配置审查报告

**审查日期**: 2026-03-28  
**审查者**: 🛡️ 系统管理员  
**项目路径**: `/root/.openclaw/workspace/7zi-frontend/`

---

## 📋 审查摘要

| 类别            | 评分            | 发现问题数 |
| --------------- | --------------- | ---------- |
| Docker 配置     | ⭐⭐⭐⭐ (良好) | 4 个中风险 |
| Nginx 配置      | ⭐⭐⭐⭐ (良好) | 3 个低风险 |
| Middleware 安全 | ⭐⭐⭐ (中等)   | 3 个中风险 |
| API 路由权限    | ⭐⭐⭐ (中等)   | 5 个中风险 |
| 环境变量管理    | ⭐⭐⭐ (中等)   | 3 个中风险 |
| 敏感信息处理    | ⭐⭐⭐ (中等)   | 2 个中风险 |
| 部署流程        | ⭐⭐⭐ (中等)   | 3 个中风险 |

**总体评分**: ⭐⭐⭐ (B 级 - 良好但需改进)

---

## 1️⃣ Dockerfile 安全审查

### ✅ 做得好

- **多阶段构建**: 使用 deps → builder → runner 三阶段，最小化最终镜像
- **非 root 用户**: runner 阶段使用 `nextjs` 用户 (uid 1001)
- **Alpine Linux**: 使用轻量级 Alpine 减少攻击面
- **权限控制**: `COPY --chown=nextjs:nodejs` 正确设置文件所有权
- **缓存清理**: `npm cache clean --force` 清理构建缓存
- **健康检查**: 配置了 HTTP 健康检查

### ⚠️ 发现的问题

#### 问题 1.1: 健康检查端点不正确 (中风险)

```dockerfile
# 当前配置
HEALTHCHECK CMD node -e "require('http').get('http://localhost:3000/api/health'..."

# docker-compose.yml 中也使用根路径
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/'..."
```

**问题**: 使用根路径 `/` 而不是专门的健康检查端点，可能暴露应用信息  
**修复建议**: 创建 `/api/health` 端点并使用它进行健康检查

#### 问题 1.2: SQLite 运行时依赖 (低风险)

```dockerfile
RUN apk add --no-cache sqlite
```

**问题**: SQLite 作为运行时依赖，可能不适合高并发生产环境  
**建议**: 考虑使用 PostgreSQL 或其他数据库，并验证是否真的需要 SQLite

#### 问题 1.3: 缺少容器安全加固 (中风险)

```dockerfile
# 建议添加以下安全配置
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 缺少以下配置:
# - USER nextjs (已在最后设置)
# - 建议添加 no-new-privileges
```

**建议**: 确保容器以非 root 用户运行（已正确配置）

---

## 2️⃣ docker-compose.yml 安全审查

### ✅ 做得好

- 资源限制配置 (CPU, 内存)
- 日志轮转配置 (max-size: 10m, max-file: 3)
- 服务依赖关系 (`depends_on` with `condition: service_healthy`)
- 网络隔离 (`7zi-network`)
- 容器重启策略 (`unless-stopped`)

### ⚠️ 发现的问题

#### 问题 2.1: 环境变量包含敏感信息 (高风险)

```yaml
environment:
  - RESEND_API_KEY=${RESEND_API_KEY:-} # API 密钥!
```

**问题**: 敏感凭据通过环境变量传递，可能被日志记录或暴露  
**修复建议**:

- 使用 Docker secrets (`echo "key" | docker secret create resend_key -`)
- 或使用 K8s secrets
- 或使用 .env 文件挂载 (已在 .gitignore 中)

#### 问题 2.2: 缺少 read-only 根文件系统 (中风险)

```yaml
# 建议添加
read_only: true
tmpfs:
  - /tmp
```

**问题**: 容器根文件系统可写，增加攻击面  
**修复建议**: 配置 `read_only: true` 并使用 `tmpfs` 挂载临时文件

#### 问题 2.3: 健康检查端点不安全 (中风险)

**同问题 1.1**

---

## 3️⃣ .gitignore 安全审查

### ✅ 做得好

```gitignore
# 环境变量正确排除
.env
.env*.local
.env.local
.env.development.local
.env.test.local
.env.production.local

# 构建产物排除
node_modules/
.next/
dist/
build/

# 日志排除
logs/
*.log
```

### ⚠️ 发现的问题

#### 问题 3.1: .env.production 未明确排除 (低风险)

```gitignore
# 当前配置
.env
.env*.local

# 问题: .env.production 可能被跟踪
```

**修复建议**: 确认 `.env.production` 在 `.gitignore` 中或确保不提交

#### 问题 3.2: 备份目录可能被跟踪 (低风险)

```gitignore
backups/
archive/
*_backup/
```

**说明**: 这些目录在 .gitignore 中，但备份文件可能包含敏感数据

---

## 4️⃣ middleware.ts 安全审查

### ✅ 做得好

```typescript
// 安全响应头配置良好
response.headers.set('X-Frame-Options', 'DENY')
response.headers.set('X-Content-Type-Options', 'nosniff')
response.headers.set('X-XSS-Protection', '1; mode=block')
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

// HSTS 仅在生产环境启用 (正确!)
if (process.env.NODE_ENV === 'production') {
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
}

// 速率限制实现
const RATE_LIMITED_PATHS = ['/api', '/auth']
```

### ⚠️ 发现的问题

#### 问题 4.1: CSP 策略包含 unsafe-inline (中风险)

```typescript
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // ⚠️ 不安全!
  "style-src 'self' 'unsafe-inline'", // ⚠️ 不安全!
  // ...
].join('; ')
```

**问题**: `unsafe-inline` 允许内联脚本和样式，削弱 XSS 防护  
**修复建议**:

- 对于 Next.js 考虑使用 `nonce` 方案
- 或评估是否确实需要这些指令
- CSP Report-Only 模式测试后再强制执行

#### 问题 4.2: 速率限制可能不够严格 (中风险)

```typescript
// 限流路径
const RATE_LIMITED_PATHS = ['/api', '/auth']

// 跳过路径
const SKIP_RATE_LIMIT_PATHS = ['/_next', '/static', '/favicon', '/images']
```

**问题**:

- `/api` 下所有端点共用同一限流配置
- 某些敏感端点可能需要更严格的限制

**修复建议**:

- 对 `/api/auth/login`, `/api/auth/register` 等端点使用更严格的限流
- 考虑添加 IP 黑名单机制

#### 问题 4.3: 缺少 CORS 配置 (低风险)

```typescript
// 当前没有 CORS 头配置
```

**修复建议**: 添加明确的 CORS 配置

```typescript
response.headers.set(
  'Access-Control-Allow-Origin',
  process.env.NEXT_PUBLIC_ALLOWED_ORIGINS || 'https://7zi.com'
)
response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
```

---

## 5️⃣ API 路由权限控制审查

### ✅ 做得好

```typescript
// 权限装饰器使用
@RequirePermission(ResourceType.PROJECT, 'read')
async listProjects(ctx: ApiContext): Promise<NextResponse>

@RequireRoleLevel(60)
async manageProject(ctx: ApiContext): Promise<NextResponse>

// 资源级别权限检查
const permissionContext: PermissionContext = {
  userId: user.id,
  resourceOwnerId: project.ownerId,
  resourceId: projectId,
  resourceType: ResourceType.PROJECT,
};
```

### ⚠️ 发现的问题

#### 问题 5.1: 认证依赖 x-user-id header (高风险)

```typescript
// 当前实现
const userId = request.headers.get('x-user-id') || 'user-3'
```

**问题**: 任何人都可以伪造用户身份!  
**修复建议**:

- 实现真正的 JWT 验证
- 或使用 session-based 认证
- 添加 API key 验证

#### 问题 5.2: 缺少输入验证 (中风险)

```typescript
// 当前实现
const body = await request.json()
const newProject: Project = {
  id: `project-${Date.now()}`,
  name: (projectData as any).name, // ⚠️ 未验证
  description: (projectData as any).description,
  // ...
}
```

**问题**: 没有验证输入数据的类型、格式、长度  
**修复建议**: 使用 Zod 或 Yup 进行 schema 验证

#### 问题 5.3: 缺少 CSRF 保护 (中风险)

**问题**: API 端点没有 CSRF token 验证  
**修复建议**:

- 检查 `Origin` 或 `Referer` header
- 实现 double-submit cookie 模式

#### 问题 5.4: 错误信息可能泄露敏感信息 (低风险)

```typescript
return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
```

**问题**: 原始错误可能包含堆栈跟踪或敏感信息  
**修复建议**: 生产环境使用通用错误消息

#### 问题 5.5: 速率限制在 API 路由级别缺失 (中风险)

**问题**: middleware.ts 的限流可能不够细致  
**修复建议**: 在关键 API 端点添加更细粒度的限流

---

## 6️⃣ Nginx 安全审查

### ✅ 做得好

```nginx
# SSL 安全配置
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5:...;
ssl_prefer_server_ciphers off;

# 安全头
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options SAMEORIGIN always;
add_header X-Content-Type-Options nosniff always;

# 代理头正确设置
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# 静态资源缓存
location /_next/static {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

### ⚠️ 发现的问题

#### 问题 6.1: 缺少速率限制 (中风险)

**问题**: Nginx 层面没有配置限流  
**修复建议**: 添加 nginx 级别的限流

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req zone=api_limit burst=20 nodelay;
```

#### 问题 6.2: 缺少请求体大小限制 (中风险)

**修复建议**: 添加 client_max_body_size

```nginx
client_max_body_size 1M;
client_body_timeout 15s;
```

#### 问题 6.3: 缺少连接限制 (低风险)

**修复建议**: 添加连接限制

```nginx
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
limit_conn conn_limit 10;
```

---

## 7️⃣ 环境变量安全审查

### ✅ 做得好

- `.env.example` 提供了完整的变量文档
- 敏感变量有 placeholder 值
- `.gitignore` 正确排除 `.env` 文件

### ⚠️ 发现的问题

#### 问题 7.1: 敏感密钥在环境变量中 (高风险)

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx  # 邮件 API 密钥!
```

**问题**:

- Docker Compose 直接传递环境变量
- 密钥可能在日志、进程列表中暴露

**修复建议**: 使用 secrets 管理方案

```yaml
# Docker Compose secrets
secrets:
  resend_api_key:
    file: ./secrets/resend_api_key.txt
```

#### 问题 7.2: ALLOWED_ORIGINS 配置在前端 (中风险)

```bash
NEXT_PUBLIC_ALLOWED_ORIGINS=https://7zi.com,https://www.7zi.com
```

**问题**: `NEXT_PUBLIC_` 变量会被嵌入到客户端代码中

#### 问题 7.3: 缺少密钥轮换机制 (低风险)

**问题**: 没有提及如何轮换 API 密钥  
**建议**: 实现定期密钥轮换机制

---

## 🔧 修复优先级建议

### 🔴 高优先级 (立即修复)

1. **API 认证机制**: 实现真正的 JWT 或 session-based 认证
2. **Secrets 管理**: 使用 Docker secrets 或 K8s secrets
3. **CSP unsafe-inline**: 评估并移除或使用 nonce 方案

### 🟡 中优先级 (近期修复)

4. 健康检查端点统一
5. API 输入验证 (Zod)
6. Nginx 层面限流
7. CORS 配置
8. 请求体大小限制

### 🟢 低优先级 (计划内修复)

9. 容器 read-only 模式
10. CSP Report-Only 测试
11. 密钥轮换机制
12. IP 连接限制

---

## 📋 检查清单

- [x] Dockerfile 安全配置
- [x] docker-compose 安全配置
- [x] .gitignore 敏感信息处理
- [x] middleware.ts 安全头配置
- [x] API 路由权限控制
- [x] Nginx 安全配置
- [x] 环境变量管理

---

## 📚 参考资料

- [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [Content Security Policy Guide](https://content-security-policy.com/)
- [Nginx Security Best Practices](https://www.nginx.com/blog/mitigating-ddos-attacks-with-nginx-and-nginx-plus/)

---

**报告生成时间**: 2026-03-28 15:09 GMT+1  
**下次审查建议**: 2026-04-28
