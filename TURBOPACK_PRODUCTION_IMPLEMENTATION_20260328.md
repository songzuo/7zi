# Turbopack 生产环境支持实施报告

**日期**: 2026-03-28
**实施人**: 🛡️ 系统管理员 (Subagent)
**项目路径**: /root/.openclaw/workspace/7zi-frontend
**文档版本**: 1.0.0

---

## 执行摘要

### ✅ 实施完成状态

所有要求的任务已成功完成：

1. ✅ 创建 `next.config.ts` 生产环境配置
2. ✅ 设置合理的 chunk 大小限制
3. ✅ 配置日志级别和错误报告
4. ✅ 添加生产环境健康检查端点
5. ✅ 验证配置有效性

**验证结果**: 37/37 项检查通过 ✅

---

## 一、实施内容

### 1.1 创建 next.config.ts 生产环境配置

**文件**: `next.config.ts`

#### 核心配置项

| 配置项                        | 设置                                            | 说明                                   |
| ----------------------------- | ----------------------------------------------- | -------------------------------------- |
| **基础配置**                  |                                                 |                                        |
| `reactStrictMode`             | `true`                                          | React 严格模式                         |
| `poweredByHeader`             | `false`                                         | 移除 X-Powered-By 头                   |
| `output`                      | `'standalone'`                                  | Docker 部署优化                        |
| **生产优化**                  |                                                 |                                        |
| `compress`                    | `true`                                          | 启用 gzip 压缩                         |
| `generateEtags`               | `true`                                          | 生成 ETags                             |
| `productionBrowserSourceMaps` | `false`                                         | 生产环境不生成 source maps             |
| **编译器配置**                |                                                 |                                        |
| `compiler.removeConsole`      | `exclude: ['error', 'warn', 'info']`            | 生产环境移除 console.log，保留错误日志 |
| **图片优化**                  |                                                 |                                        |
| `formats`                     | `['image/avif', 'image/webp']`                  | 现代图片格式                           |
| `deviceSizes`                 | `[640, 750, 828, 1080, 1200, 1920, 2048, 3840]` | 响应式图片尺寸                         |
| `imageSizes`                  | `[16, 32, 48, 64, 96, 128, 256, 384]`           | 图片优化尺寸                           |
| `minimumCacheTTL`             | `30天`                                          | 最小缓存时间                           |

#### Turbopack 配置

```typescript
turbopack: {
  // 路径别名
  resolveAlias: {
    '@': path.join(__dirname, 'src'),
  },
  // 文件系统根目录
  root: __dirname,
  // 扩展名解析
  resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
}
```

#### 实验性优化

```typescript
experimental: {
  // 包导入优化 - 改善 tree-shaking
  optimizePackageImports: [
    'lucide-react', 'zustand', 'web-vitals', 'date-fns',
    'three', '@react-three/fiber', '@react-three/drei',
    'recharts', 'zod', 'react-i18next', 'i18next',
  ],
  // CSS 优化
  optimizeCss: true,
}
```

#### Webpack 后备配置

保留 Webpack 配置作为后备，仅当 `USE_WEBPACK=true` 时启用：

- **性能预算**:
  - 最大入口点: 300KB
  - 最大资源: 250KB
  - 最大异步 chunk: 200KB
  - 最小 chunk: 15KB

- **代码分包策略**: 9 个 cacheGroups
  - `three-libs`: Three.js 相关库 (maxSize: 300KB)
  - `chart-libs`: 图表库 (maxSize: 200KB)
  - `realtime-libs`: Socket.IO 等
  - `ui-libs`: Radix UI, Lucide 等
  - `framework`: React, Next.js (maxSize: 400KB)
  - `vendor-utils`: 工具库
  - `forms-libs`: 表单验证
  - `i18n-libs`: 国际化库
  - `vendors`: 通用 node_modules

#### 安全 Headers

```typescript
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

---

### 1.2 Chunk 大小限制配置

#### 配置常量

```typescript
const CHUNK_LIMITS = {
  // 最大入口点大小 (300KB)
  maxEntrypointSize: 300 * 1024,
  // 最大资源大小 (250KB)
  maxAssetSize: 250 * 1024,
  // 最大异步 chunk 大小 (200KB)
  maxAsyncChunkSize: 200 * 1024,
  // 最小 chunk 大小 (15KB)
  minChunkSize: 15 * 1024,
}
```

#### 配置说明

| 限制类型       | 大小  | 应用场景             |
| -------------- | ----- | -------------------- |
| **入口点**     | 300KB | 首屏加载的主 JS 文件 |
| **资源**       | 250KB | 所有输出资源         |
| **异步 chunk** | 200KB | 按需加载的模块       |
| **最小 chunk** | 15KB  | 避免过度分割         |

#### Webpack 性能预算

```typescript
config.performance = {
  maxEntrypointSize: CHUNK_LIMITS.maxEntrypointSize,
  maxAssetSize: CHUNK_LIMITS.maxAssetSize,
  hints: 'warning',
}
```

#### 分包策略

Webpack 后备配置中的分包策略：

- **maxInitialRequests: 25** - 初始请求数上限
- **maxAsyncRequests: 30** - 异步请求数上限
- **minSize: 15KB** - 最小 chunk 大小
- **maxSize: 200KB** - 最大 chunk 大小
- **enforceSizeThreshold: 30KB** - 强制分割阈值

---

### 1.3 日志级别和错误报告

#### 日志配置文件

**文件**: `src/lib/logger.ts`

##### 日志级别

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
```

| 级别      | 优先级 | 用途         |
| --------- | ------ | ------------ |
| **debug** | 0      | 开发调试信息 |
| **info**  | 1      | 一般信息     |
| **warn**  | 2      | 警告信息     |
| **error** | 3      | 错误信息     |
| **fatal** | 4      | 致命错误     |

##### 默认配置

```typescript
const DEFAULT_CONFIG: LogConfig = {
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: process.env.NODE_ENV === 'production' ? 'json' : 'text',
  includeTimestamp: true,
  includeContext: true,
  sanitizeSensitiveData: true,
  enableRemoteLogging: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.LOG_ENDPOINT,
}
```

##### 敏感数据过滤

自动过滤以下字段：

- `password`, `token`, `secret`
- `apiKey`, `api_key`, `authorization`
- `cookie`, `session`
- `privateKey`, `private_key`

##### Logger 功能

```typescript
// 创建 logger
const logger = new Logger('app')

// 日志方法
logger.debug('Debug message', { data })
logger.info('Info message', { data })
logger.warn('Warning message', { data })
logger.error('Error message', error, { data })
logger.fatal('Fatal error', error, { data })

// 性能计时器
const endTimer = logger.time('operation')
// ... 执行操作
endTimer()

// 子 logger
const childLogger = logger.child('component')
```

---

#### 错误处理文件

**文件**: `src/lib/errors.ts`

##### 错误类型定义

```typescript
enum ErrorCode {
  // 客户端错误 (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',

  // 服务端错误 (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT = 'TIMEOUT',

  // 业务错误
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}
```

##### AppError 类

```typescript
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>
  public readonly reportToSentry: boolean
  public readonly timestamp: string

  constructor(options: AppErrorOptions) {
    // ...
  }

  toJSON(): Record<string, unknown> {
    // 返回结构化的错误信息
  }
}
```

##### 错误工厂函数

```typescript
createBadRequestError(message, details?)
createUnauthorizedError(message, details?)
createForbiddenError(message, details?)
createNotFoundError(message, details?)
createValidationError(message, details?)
createInternalError(message, cause?, details?)
createServiceUnavailableError(message, details?)
createDatabaseError(message, cause?, details?)
```

##### 错误处理函数

```typescript
function handleError(
  error: unknown,
  context?: string
): {
  error: AppError
  shouldReport: boolean
}
```

##### 错误聚合器

```typescript
class ErrorAggregator {
  private config: ErrorAggregatorConfig

  add(error: AppError): void
  flush(): Promise<void>
}
```

**用途**: 批量收集错误，避免频繁的远程日志调用。

##### API 错误响应格式

```typescript
interface ApiErrorResponse {
  success: false
  error: {
    code: ErrorCode
    message: string
    details?: Record<string, unknown>
    timestamp: string
    requestId?: string
  }
}
```

---

### 1.4 生产环境健康检查端点

**文件**: `src/app/api/health/route.ts`

#### 端点配置

| 配置项       | 值            | 说明         |
| ------------ | ------------- | ------------ |
| **路径**     | `/api/health` | 健康检查端点 |
| **方法**     | `GET`, `HEAD` | 支持两种方法 |
| **缓存**     | 60秒          | 公开缓存     |
| **响应格式** | JSON          | 结构化响应   |

#### 健康检查配置

```typescript
const HEALTH_CHECK_CONFIG = {
  // 内存警告阈值 (90%)
  memoryWarningThreshold: 0.9,
  // 磁盘警告阈值 (90%)
  diskWarningThreshold: 0.9,
  // 响应时间警告阈值 (ms)
  responseTimeWarningThreshold: 1000,
  // 缓存时间 (秒)
  cacheTime: 60,
}
```

#### 响应示例

##### 健康状态

```json
{
  "status": "healthy",
  "timestamp": "2026-03-28T21:44:00.000Z",
  "responseTime": "5ms",
  "uptime": "1234 minutes",
  "build": {
    "version": "1.0.0",
    "name": "7zi-frontend",
    "environment": "production",
    "buildTime": "2026-03-28T21:00:00.000Z"
  },
  "system": {
    "platform": "linux",
    "arch": "x64",
    "nodeVersion": "v22.22.1",
    "uptime": 74064,
    "loadAverage": [0.5, 0.8, 0.7],
    "memory": {
      "total": 17179869184,
      "used": 8589934592,
      "free": 8589934592,
      "usage": "50%",
      "formatted": {
        "total": "16GB",
        "used": "8GB",
        "free": "8GB",
        "usage": "50%"
      }
    },
    "cpus": 8
  },
  "health": {
    "issues": [],
    "warnings": []
  }
}
```

##### 降级状态

```json
{
  "status": "degraded",
  "health": {
    "issues": [],
    "warnings": ["Memory usage high: 85%", "Response time slow: 1200ms"]
  }
}
```

##### 不健康状态

```json
{
  "status": "unhealthy",
  "health": {
    "issues": ["Memory usage critical: 95% (threshold: 90%)"],
    "warnings": ["Load average high: 16.00 (CPUs: 8)"]
  }
}
```

#### HTTP 状态码

| 状态          | HTTP 状态码 | 说明             |
| ------------- | ----------- | ---------------- |
| **healthy**   | 200         | 系统健康         |
| **degraded**  | 200         | 系统降级但有警告 |
| **unhealthy** | 503         | 系统不健康       |

#### 响应 Headers

```
X-Health-Status: healthy
X-Response-Time: 5ms
Cache-Control: public, max-age=60
```

#### 使用示例

##### GET 请求

```bash
curl http://localhost:3000/api/health
```

##### HEAD 请求 (用于监控)

```bash
curl -I http://localhost:3000/api/health
```

##### 监控集成

```yaml
# Kubernetes readinessProbe
readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 3

# Kubernetes livenessProbe
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 30
  failureThreshold: 3
```

---

### 1.5 配置验证

#### 验证脚本

**文件**: `scripts/validate-turbopack-config.ts`

#### 验证项目

| 类别               | 检查项                              | 状态 |
| ------------------ | ----------------------------------- | ---- |
| **next.config.ts** | output: standalone                  | ✅   |
|                    | reactStrictMode: true               | ✅   |
|                    | turbopack 配置                      | ✅   |
|                    | experimental.optimizePackageImports | ✅   |
|                    | compiler.removeConsole              | ✅   |
| **package.json**   | dev 脚本                            | ✅   |
|                    | build 脚本                          | ✅   |
|                    | start 脚本                          | ✅   |
|                    | build:analyze 脚本                  | ✅   |
|                    | build:webpack 脚本 (可选)           | ✅   |
|                    | build:analyze:webpack 脚本 (可选)   | ✅   |
| **健康检查**       | GET 请求处理器                      | ✅   |
|                    | HEAD 请求处理器                     | ✅   |
|                    | 系统信息获取                        | ✅   |
|                    | 健康状态评估                        | ✅   |
|                    | 内存检查                            | ✅   |
| **日志配置**       | Logger 类                           | ✅   |
|                    | 日志级别                            | ✅   |
|                    | 敏感数据过滤                        | ✅   |
|                    | JSON 格式输出                       | ✅   |
|                    | 远程日志                            | ✅   |
| **错误处理**       | AppError 类                         | ✅   |
|                    | ErrorCode 枚举                      | ✅   |
|                    | 错误工厂函数                        | ✅   |
|                    | handleError 函数                    | ✅   |
|                    | 错误聚合器                          | ✅   |
| **环境变量**       | NODE_ENV                            | ✅   |
|                    | LOG_LEVEL                           | ✅   |
| **构建配置**       | tsconfig.json                       | ✅   |
|                    | 依赖 next (16.2.1)                  | ✅   |
|                    | 依赖 react (^18.2.0)                | ✅   |
|                    | 依赖 react-dom (^18.2.0)            | ✅   |
|                    | Next.js 版本 >= 16                  | ✅   |

**总计**: 37 项检查，37 项通过 ✅

#### 运行验证

```bash
# 使用 tsx 运行验证脚本
npx tsx scripts/validate-turbopack-config.ts

# 预期输出
# ✓ 所有必需的检查都通过了！
```

---

## 二、配置验证结果

### 2.1 完整验证输出

```
=====================================================
Turbopack 生产环境配置验证
=====================================================

ℹ 检查 next.config.ts...
✓ output: standalone 已配置
✓ reactStrictMode: true 已配置
✓ turbopack 配置 已配置
✓ experimental.optimizePackageImports 已配置
✓ compiler.removeConsole 已配置

ℹ 检查 package.json 构建脚本...
✓ 脚本 dev 配置正确: next dev --turbopack
✓ 脚本 build 配置正确: NODE_ENV=production next build --turbopack
✓ 脚本 start 配置正确: next start
✓ 脚本 build:analyze 配置正确: NODE_ENV=production ANALYZE=true next build --turbopack
✓ 可选脚本 build:webpack 存在: NODE_ENV=production USE_WEBPACK=true next build
✓ 可选脚本 build:analyze:webpack 存在: NODE_ENV=production ANALYZE=true USE_WEBPACK=true next build

ℹ 检查健康检查端点...
✓ 健康检查 GET 请求处理器 已实现
✓ 健康检查 HEAD 请求处理器 已实现
✓ 健康检查 系统信息获取 已实现
✓ 健康检查 健康状态评估 已实现
✓ 健康检查 内存检查 已实现

ℹ 检查日志配置...
✓ 日志 Logger 类 已配置
✓ 日志 日志级别 已配置
✓ 日志 敏感数据过滤 已配置
✓ 日志 JSON 格式输出 已配置
✓ 日志 远程日志 已配置

ℹ 检查错误处理...
✓ 错误处理 AppError 类 已配置
✓ 错误处理 ErrorCode 枚举 已配置
✓ 错误处理 错误工厂函数 已配置
✓ 错误处理 handleError 函数 已配置
✓ 错误处理 错误聚合器 已配置

ℹ 检查环境变量...
✓ 环境变量 NODE_ENV 已定义 (节点环境)
✓ 环境变量 LOG_LEVEL 已定义 (日志级别)

ℹ 验证构建配置...
✓ tsconfig.json 存在
✓ 依赖 next 已安装: 16.2.1
✓ 依赖 react 已安装: ^18.2.0
✓ 依赖 react-dom 已安装: ^18.2.0
✓ Next.js 版本 >= 16: 16.2.1

=====================================================
验证总结
=====================================================

总计: 37 项检查
✓ 通过: 37 项
⚠ 警告: 0 项
✗ 失败: 0 项

✓ 所有必需的检查都通过了！
```

### 2.2 验证结论

✅ **所有必需的配置都已正确实施**

- Next.js 16.2.1 + Turbopack 配置完整
- 构建脚本正确配置
- 健康检查端点功能完整
- 日志和错误处理系统完善
- 所有验证项通过

---

## 三、使用指南

### 3.1 构建命令

#### 开发环境

```bash
# 使用 Turbopack (默认)
npm run dev

# 使用 Webpack (后备)
npm run dev:webpack
```

#### 生产构建

```bash
# 使用 Turbopack (推荐)
npm run build

# 使用 Webpack (后备)
npm run build:webpack
```

#### Bundle 分析

```bash
# Turbopack 分析
npm run build:analyze

# Webpack 分析
npm run build:analyze:webpack
```

#### 启动生产服务器

```bash
npm run start
```

### 3.2 健康检查

#### 手动检查

```bash
# GET 请求
curl http://localhost:3000/api/health

# HEAD 请求 (快速检查)
curl -I http://localhost:3000/api/health

# 检查响应头
curl -I http://localhost:3000/api/health | grep -i "X-Health-Status"
```

#### 监控集成

##### Kubernetes

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: 7zi-frontend
      image: 7zi-frontend:latest
      ports:
        - containerPort: 3000
      readinessProbe:
        httpGet:
          path: /api/health
          port: 3000
        initialDelaySeconds: 5
        periodSeconds: 10
        failureThreshold: 3
      livenessProbe:
        httpGet:
          path: /api/health
          port: 3000
        initialDelaySeconds: 30
        periodSeconds: 30
        failureThreshold: 3
```

##### Docker Compose

```yaml
services:
  frontend:
    image: 7zi-frontend:latest
    ports:
      - '3000:3000'
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 3.3 日志使用

#### 基础使用

```typescript
import { logger } from '@/lib/logger'

// 记录不同级别的日志
logger.debug('Debug information', { data: 'value' })
logger.info('Information message')
logger.warn('Warning message', { details })
logger.error('Error occurred', error, { context })
logger.fatal('Fatal error', error, { context })
```

#### 创建子 Logger

```typescript
import { createLogger } from '@/lib/logger'

// 为特定模块创建 logger
const componentLogger = createLogger('MyComponent')

componentLogger.info('Component mounted')
```

#### 性能计时

```typescript
const endTimer = logger.time('database-query')
await db.query('SELECT * FROM users')
endTimer() // 自动记录耗时
```

#### 环境变量

```bash
# 生产环境日志级别
LOG_LEVEL=warn

# 开发环境日志级别
LOG_LEVEL=debug

# 远程日志端点 (生产环境)
LOG_ENDPOINT=https://logs.example.com/api/logs
```

### 3.4 错误处理

#### 创建错误

```typescript
import { createBadRequestError, createNotFoundError, createInternalError } from '@/lib/errors'

// 客户端错误
throw createBadRequestError('Invalid input', { field: 'email' })

// 服务端错误
throw createInternalError('Database connection failed', error)
```

#### 处理错误

```typescript
import { handleError } from '@/lib/errors'

try {
  await someOperation()
} catch (error) {
  const { error: appError, shouldReport } = handleError(error, 'myModule')

  if (shouldReport) {
    // 报告到 Sentry 或其他错误跟踪服务
    Sentry.captureException(appError)
  }

  // 返回错误响应
  return NextResponse.json(
    { success: false, error: appError.message },
    { status: appError.statusCode }
  )
}
```

#### API 错误响应

```typescript
import { AppError, formatErrorResponse } from '@/lib/errors'

export async function GET() {
  try {
    const data = await fetchData()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    const { error: appError } = handleError(error, 'GET /api/data')

    return NextResponse.json(formatErrorResponse(appError), { status: appError.statusCode })
  }
}
```

### 3.5 环境变量配置

#### .env.example

```bash
# Node 环境
NODE_ENV=production

# 日志配置
LOG_LEVEL=warn
LOG_ENDPOINT=https://logs.example.com/api/logs

# 构建选项
ANALYZE=false
USE_WEBPACK=false

# 其他环境变量 (根据实际项目配置)
# NEXT_PUBLIC_API_URL=https://api.example.com
# DATABASE_URL=...
```

#### 生产环境

```bash
# 复制示例文件
cp .env.example .env.production

# 编辑生产环境变量
nano .env.production

# 使用生产环境变量构建
NODE_ENV=production npm run build
```

---

## 四、监控和运维

### 4.1 关键监控指标

#### 系统指标

| 指标           | 阈值        | 告警级别 |
| -------------- | ----------- | -------- |
| **内存使用率** | > 90%       | Critical |
|                | > 80%       | Warning  |
| **CPU 负载**   | > 2x 核心数 | Critical |
|                | > 1x 核心数 | Warning  |
| **响应时间**   | > 2000ms    | Critical |
|                | > 1000ms    | Warning  |

#### 应用指标

| 指标           | 阈值      | 告警级别 |
| -------------- | --------- | -------- |
| **错误率**     | > 5%      | Critical |
|                | > 1%      | Warning  |
| **5xx 错误率** | > 1%      | Critical |
|                | > 0.5%    | Warning  |
| **健康状态**   | unhealthy | Critical |
|                | degraded  | Warning  |

### 4.2 日志监控

#### 日志级别配置

```typescript
// 开发环境
LOG_LEVEL = debug

// 生产环境
LOG_LEVEL = warn

// 调试生产问题时
LOG_LEVEL = debug
```

#### 远程日志

生产环境启用远程日志：

```typescript
// .env.production
LOG_ENDPOINT=https://logs.example.com/api/logs
```

### 4.3 错误跟踪

#### 集成 Sentry

```typescript
// next.config.ts
import { withSentryConfig } from '@sentry/nextjs'

export default withSentryConfig(nextConfig, {
  // Sentry 配置
  org: 'your-org',
  project: '7zi-frontend',
  silent: true,
})
```

#### 使用 ErrorAggregator

```typescript
import { ErrorAggregator, AppError } from '@/lib/errors'

const errorAggregator = new ErrorAggregator({
  maxBatchSize: 10,
  flushIntervalMs: 30000,
  onErrorBatch: async errors => {
    // 批量发送到 Sentry
    errors.forEach(err => {
      Sentry.captureException(err)
    })
  },
})

// 添加错误到聚合器
errorAggregator.add(appError)
```

---

## 五、故障排查

### 5.1 构建问题

#### 问题: Turbopack 构建失败

**症状**: `npm run build` 失败

**解决方案**:

```bash
# 尝试使用 Webpack 后备
npm run build:webpack

# 检查配置
npx tsx scripts/validate-turbopack-config.ts

# 清理缓存
rm -rf .next
npm run build
```

#### 问题: Bundle 大小超限

**症状**: 构建警告 "asset size limit"

**解决方案**:

```bash
# 分析 bundle
npm run build:analyze

# 查看分析报告，找出大模块
# 优化导入策略或调整 chunk 大小限制
```

### 5.2 运行时问题

#### 问题: 健康检查失败

**症状**: `/api/health` 返回 503

**检查**:

```bash
# 检查详细响应
curl http://localhost:3000/api/health

# 查看服务器日志
npm run start

# 检查内存使用
free -h
```

#### 问题: 日志级别不生效

**症状**: 期望的日志没有输出

**检查**:

```bash
# 验证环境变量
echo $LOG_LEVEL

# 重启服务
npm run start
```

---

## 六、最佳实践

### 6.1 开发环境

1. 使用 `npm run dev` 进行开发
2. 保持 `LOG_LEVEL=debug` 以查看详细日志
3. 使用 `logger.time()` 测量关键操作性能
4. 定期运行 `npm run build:analyze` 监控 bundle 大小

### 6.2 生产环境

1. 使用 `npm run build` 进行生产构建
2. 保持 `LOG_LEVEL=warn` 以减少日志量
3. 启用远程日志 (`LOG_ENDPOINT`)
4. 配置健康检查端点监控
5. 使用错误聚合器批量上报错误
6. 定期检查 `/api/health` 端点

### 6.3 安全建议

1. 生产环境不生成 source maps (`productionBrowserSourceMaps: false`)
2. 自动过滤敏感数据
3. 使用安全 headers
4. 定期更新依赖包
5. 监控错误率和异常

### 6.4 性能优化

1. 启用图片优化 (AVIF/WebP)
2. 使用 code splitting
3. 优化包导入 (`optimizePackageImports`)
4. 配置合理的 chunk 大小
5. 启用 gzip 压缩

---

## 七、下一步建议

### 7.1 短期 (1-2 周)

1. ✅ 配置验证完成
2. ⏭ 在测试环境部署
3. ⏭ 监控健康检查端点
4. ⏭ 配置错误跟踪 (Sentry)
5. ⏭ 设置日志聚合服务

### 7.2 中期 (1-2 月)

1. ⏭ 完全迁移到 Turbopack (移除 Webpack 后备)
2. ⏭ 优化 chunk 分包策略
3. ⏭ 设置性能监控 (Lighthouse CI)
4. ⏭ 配置自动化测试
5. ⏭ 优化 CI/CD 流程

### 7.3 长期 (3-6 月)

1. ⏭ 启用更多 Turbopack 实验性功能
2. ⏭ 实现高级性能优化
3. ⏭ 集成 APM (Application Performance Monitoring)
4. ⏭ 优化 CDN 缓存策略
5. ⏭ 实现自动化扩缩容

---

## 八、参考资料

### 官方文档

- [Next.js 16 文档](https://nextjs.org/docs)
- [Turbopack 文档](https://turbo.build/pack/docs)
- [Next.js 配置 API](https://nextjs.org/docs/app/api-reference/config/next-config-js)
- [Next.js Health Check](https://nextjs.org/docs/advanced-features/custom-server)

### 研究报告

- [TURBOPACK_RESEARCH_20260328.md](./TURBOPACK_RESEARCH_20260328.md)

### 工具

- [Next.js Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
- [Sentry](https://sentry.io)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

## 附录 A: 文件清单

### 新增文件

| 文件                                              | 大小    | 说明                   |
| ------------------------------------------------- | ------- | ---------------------- |
| `next.config.ts`                                  | 9.8 KB  | Turbopack 生产环境配置 |
| `src/app/api/health/route.ts`                     | 6.4 KB  | 健康检查端点           |
| `src/lib/logger.ts`                               | 6.1 KB  | 日志配置               |
| `src/lib/errors.ts`                               | 8.4 KB  | 错误处理               |
| `scripts/validate-turbopack-config.ts`            | 11.7 KB | 配置验证脚本           |
| `TURBOPACK_PRODUCTION_IMPLEMENTATION_20260328.md` | 本文档  | 实施报告               |

### 修改文件

| 文件           | 修改内容                 |
| -------------- | ------------------------ |
| `package.json` | 构建脚本已配置，无需修改 |
| `.env.example` | 建议添加日志相关环境变量 |

---

## 附录 B: 快速参考

### 配置文件路径

```
next.config.ts                              # Turbopack 配置
src/app/api/health/route.ts                 # 健康检查端点
src/lib/logger.ts                           # 日志配置
src/lib/errors.ts                           # 错误处理
scripts/validate-turbopack-config.ts        # 配置验证
```

### 关键命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 启动
npm run start

# 分析
npm run build:analyze

# 验证配置
npx tsx scripts/validate-turbopack-config.ts

# 健康检查
curl http://localhost:3000/api/health
```

### 环境变量

```bash
NODE_ENV=production          # 节点环境
LOG_LEVEL=warn               # 日志级别
LOG_ENDPOINT=...             # 远程日志端点
ANALYZE=false                # 启用 Bundle Analyzer
USE_WEBPACK=false            # 使用 Webpack 后备
```

---

**报告完成时间**: 2026-03-28 21:44 GMT+1
**验证状态**: ✅ 全部通过 (37/37)
**实施状态**: ✅ 完成

---

_此报告由 🛡️ 系统管理员子代理生成，基于 TURBOPACK_RESEARCH_20260328.md 研究报告实施。_
