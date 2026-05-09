# 安全审计报告 - 7zi-frontend v1.14.x

**审计时间**: 2026-05-08 04:12 GMT+2  
**审计范围**: 生产环境健康检查  
**审计角色**: 系统管理员 (子代理)

---

## 1. 依赖安全性检查 (npm audit)

### 状态: ⚠️ 需要关注

执行 `pnpm audit` 发现 **2 个漏洞**:

| 严重程度 | 数量 | 说明 |
|---------|------|------|
| 🔴 Critical | 1 | protobufjs - 任意代码执行漏洞 |
| 🟡 Moderate | 1 | postcss - XSS 漏洞 |

### 漏洞详情

#### 1.1 Critical: protobufjs 任意代码执行

```
Package: protobufjs
Vulnerable: <7.5.5
Path: .>@xenova/transformers>onnxruntime-web>onnx-proto>protobufjs
CVE: GHSA-xq3m-2v4x-88gg
```

**风险**: 攻击者可通过恶意构造的 Protobuf 消息执行任意代码。

**修复建议**: 升级 protobufjs 到 >=7.5.5

#### 1.2 Moderate: postcss XSS

```
Package: postcss
Vulnerable: <8.5.10
Path: .>next>postcss
CVE: GHSA-qx2v-qp2m-jg93
```

**风险**: CSS 输出中未转义的 `</style>` 可能导致 XSS 攻击。

**修复建议**: 升级 postcss 到 >=8.5.10 (Next.js 内置，应升级 Next.js)

### 建议操作

```bash
# 建议升级相关依赖
pnpm update protobufjs
pnpm update postcss
# 或升级 Next.js 到最新版本
pnpm update next
```

---

## 2. 环境变量配置检查 (.env.example)

### 状态: ✅ 良好

`.env.example` 文件内容完整，包含:

| 分类 | 配置项 | 安全性 |
|------|--------|--------|
| **认证** | JWT_SECRET | ✅ 有详细说明，建议最小 64 字符 |
| **认证** | JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN | ✅ 已配置 |
| **认证** | SESSION_SECRET | ✅ 有说明 |
| **数据库** | DATABASE_URL | ✅ 支持 MongoDB/PostgreSQL |
| **Redis** | REDIS_URL | ✅ 可选配置 |
| **CORS** | ALLOWED_ORIGINS | ✅ 需生产环境配置 |
| **速率限制** | RATE_LIMIT_* | ✅ 已配置 |
| **邮件** | SMTP_* | ✅ 占位符值 |
| **监控** | SENTRY_DSN | ✅ 占位符 |
| **第三方** | GA_ID, GTM_ID, RECAPTCHA_* | ✅ 可选 |

**优点**:
- 每个敏感配置项都有详细注释
- 标注了生产环境注意事项
- 提供了密钥生成方法
- 安全建议完整 (如 JWT 轮换、密钥强度要求)

---

## 3. Next.js 安全配置检查

### 状态: ✅ 优秀

`next.config.ts` 配置完善:

#### 3.1 基础安全配置

| 配置项 | 状态 | 说明 |
|--------|------|------|
| `poweredByHeader: false` | ✅ | 隐藏 X-Powered-By |
| `reactStrictMode: true` | ✅ | 启用 React 严格模式 |
| `output: 'standalone'` | ✅ | Docker 部署优化 |

#### 3.2 安全响应头 (已配置)

```typescript
headers: [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
]
```

#### 3.3 Content Security Policy (CSP)

```typescript
"default-src 'self'",
"script-src 'self'",
"style-src 'self' 'unsafe-inline'",
"img-src 'self' data: https: blob:",
"font-src 'self' data:",
"connect-src 'self' https://sentry.io wss: https://",
"frame-src 'none'",
"object-src 'none'",
"base-uri 'self'",
"form-action 'self'",
```

**注意**: `style-src 'self' 'unsafe-inline'` 允许内联样式，可能略微降低 CSP 防护效果。

#### 3.4 图片安全配置

```typescript
images: {
  dangerouslyAllowSVG: false,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
}
```

#### 3.5 生产环境优化

| 配置 | 状态 |
|------|------|
| `compress: true` | ✅ |
| `generateEtags: true` | ✅ |
| `productionBrowserSourceMaps: false` | ✅ |
| `removeConsole` (生产环境) | ✅ 保留 error/warn/info |

---

## 4. 敏感信息暴露检查

### 状态: ⚠️ 需注意

#### 4.1 源码扫描结果

扫描 `src/` 目录，未发现硬编码的敏感信息:
- ✅ 无硬编码密码
- ✅ 无硬编码 API Keys
- ✅ 日志模块正确过滤敏感字段 (password, token, secret, api_key)

#### 4.2 .env.production 文件 ⚠️ 风险点

`.env.production` 存在于项目根目录:

```env
JWT_SECRET=8861d60e34463a2e0feafb90a6e249edaa1322c7fb7361f87cd1d227adbf4d8ddf84c27814c5069bea57595df00c7484fb76f3fa7b2b33ba72fc583047a2047f
SESSION_SECRET=your-session-secret-change-this-at-least-32-characters
```

**风险**: 
1. `JWT_SECRET` 看起来像真实密钥 (64 字符十六进制)
2. `.gitignore` 中 **未排除 `.env.production`**
3. 如提交到版本控制会造成密钥泄露

#### 4.3 .dockerignore 检查

`.dockerignore` 内容存在但可能不完整:

```
# 存在的问题:
- 未明确排除 .env.production
- 未排除 .env.*.local 变体
```

---

## 5. Git 工作流安全检查

### 状态: ⚠️ 需改进

#### 5.1 .gitignore 缺失

**严重问题**: 项目根目录 **没有 `.gitignore` 文件**！

```bash
# 当前项目状态
/root/.openclaw/workspace/7zi-frontend/.gitignore  # 不存在
```

只有 `.dockerignore` 文件存在。

#### 5.2 .dockerignore 内容分析

```dockerignore
# ✅ 正确忽略
node_modules
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.example

# ⚠️ 缺失
# - .env.production  未排除！
# - 各种 IDE 文件
# - 敏感配置文件
```

#### 5.3 GitHub Actions 工作流

`.github/workflows/` 存在，配置良好:

```yaml
# 安全实践
- 使用 `GITHUB_TOKEN` 而非硬编码凭证
- SSH 部署使用 `secrets.SSH_PRIVATE_KEY`
- 健康检查配置
- 缓存优化 (npm, node_modules, Next.js build)
```

**风险点**:
- `secrets.PRODUCTION_HOST` 和 `secrets.SSH_PRIVATE_KEY` 需确保在 GitHub Secrets 中正确配置
- 蓝绿部署脚本 `/root/7zi-frontend/scripts/deploy/blue-green-deploy.sh` 需审查

---

## 6. 总结与建议

### 紧急 (24小时内处理)

| 优先级 | 问题 | 建议操作 |
|--------|------|----------|
| 🔴 P0 | `.env.production` 可能包含真实密钥且未在 .gitignore 中 | 1. 确认 JWT_SECRET 是否为真实密钥<br>2. 如果是，立即轮换<br>3. 创建 `.gitignore` 并添加 `.env.production` |
| 🔴 P0 | protobufjs 漏洞 (Critical) | 升级: `pnpm update protobufjs` |

### 高优先级 (本周内处理)

| 优先级 | 问题 | 建议操作 |
|--------|------|----------|
| 🟠 P1 | postcss XSS 漏洞 | 升级 Next.js 到最新版本 |
| 🟠 P1 | 缺少 `.gitignore` 文件 | 创建并添加标准忽略规则 |

### 中优先级 (本月内处理)

| 优先级 | 问题 | 建议操作 |
|--------|------|----------|
| 🟡 P2 | `.dockerignore` 不完整 | 添加 `.env.production`, IDE 文件等 |
| 🟡 P2 | CSP 中允许 `unsafe-inline` | 考虑使用 nonce 或 hash 方案 |

### 已验证安全 (良好)

| 项目 | 状态 |
|------|------|
| `.env.example` 完整性 | ✅ |
| Next.js 安全 headers | ✅ |
| CSP 配置 | ✅ |
| 日志敏感信息过滤 | ✅ |
| GitHub Actions 配置 | ✅ |
| poweredByHeader 隐藏 | ✅ |

---

## 附录: 建议的 .gitignore 文件

```gitignore
# Dependencies
node_modules
.pnpm-store

# Build
.next
out
.turbo
*.tsbuildinfo

# Environment (重要!)
.env
.env.local
.env.*.local
!.env.example
!.env.pwa.example

# Production env - 敏感！
.env.production

# Testing
coverage
*.lcov
.nyc_output
test-results
playwright-report

# IDE
.vscode
.idea
*.swp
*.swo

# Logs
logs/
*.log
npm-debug.log*
pnpm-debug.log*

# Misc
.DS_Store
*.pem

# Git
.git
.gitignore
```

---

**审计完成**

生成时间: 2026-05-08 04:12 GMT+2  
审计角色: 系统管理员 (子代理)
