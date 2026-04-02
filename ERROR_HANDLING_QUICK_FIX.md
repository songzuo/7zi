# 错误处理与日志系统 - 快速修复指南

## 🚨 需要立即修复的关键问题

### 1. 敏感信息泄露风险

**文件**: `src/app/api/health/detailed/route.ts`

**问题**: 公开暴露内存和数据库信息

**立即修复**:

```typescript
// 添加认证检查
import { withAuth } from '@/middleware/auth'

export async function GET(request: NextRequest): Promise<NextResponse<DetailedHealthResponse>> {
  // 添加认证
  return withAuth(request, async () => {
    // ... 现有代码
  })
}
```

---

## 📋 优先修复清单

### 高优先级 (立即)

- [ ] **P0**: `/api/health/detailed` - 添加认证
- [ ] **P0**: `/api/backup` - 使用标准错误处理
- [ ] **P0**: `/api/export` - 使用标准错误处理
- [ ] **P0**: `/api/status` - 使用标准错误处理

### 中优先级 (本周)

- [ ] **P1**: `/api/health` - 添加详细日志
- [ ] **P1**: `/api/github/commits` - 网络错误处理
- [ ] **P1**: 添加 Request ID 追踪
- [ ] **P1**: 为所有端点添加性能日志

### 低优先级 (下周)

- [ ] **P2**: 创建错误报告页面
- [ ] **P2**: 集成 Sentry
- [ ] **P2**: 添加单元测试
- [ ] **P2**: 更新 API 文档

---

## 🔧 立即修复代码

### 修复 1: /api/health/detailed 添加认证

```typescript
// src/app/api/health/detailed/route.ts

import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { getDatabase, getDatabaseSize } from '@/lib/db'
import { withAuth } from '@/middleware/auth' // ✅ 新增

// ... types 保持不变

export async function GET(request: NextRequest): Promise<NextResponse<DetailedHealthResponse>> {
  // ✅ 添加认证
  return withAuth(request, async () => {
    try {
      const db = getDatabase()
      const dbSize = getDatabaseSize()

      return NextResponse.json({
        success: true,
        status: 'healthy',
        checks: {
          database: {
            status: db ? 'connected' : 'disconnected',
            size: dbSize?.sizeInBytes ?? 0,
          },
          memory: {
            heapUsed: process.memoryUsage().heapUsed,
            heapTotal: process.memoryUsage().heapTotal,
            rss: process.memoryUsage().rss,
          },
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      logger.error('Detailed health check failed', error)
      return NextResponse.json(
        {
          success: false,
          status: 'unhealthy',
          checks: {
            database: { status: 'disconnected', size: 0 },
            memory: { heapUsed: 0, heapTotal: 0, rss: 0 },
            uptime: 0,
            timestamp: new Date().toISOString(),
          },
        } as DetailedHealthResponse,
        { status: 503 }
      )
    }
  })
}
```

### 修复 2: /api/backup 使用标准错误处理

```typescript
// src/app/api/backup/route.ts

import { NextRequest } from 'next/server'
import logger from '@/lib/logger'
import { withAuth } from '@/middleware/auth'
import {
  createSuccessResponse,
  createErrorResponseJson,
  createInternalServerError,
  withErrorHandler,
} from '@/lib/api/error-handler'
import {
  logApiError,
  logApiSuccess,
  createApiContext,
  createPerformanceLogger,
} from '@/lib/api/error-logger'

// ... types 保持不变

export const GET = withErrorHandler(async (request: NextRequest) => {
  return withAuth(request, async () => {
    const perf = createPerformanceLogger(request, Date.now())
    const context = createApiContext(request)

    try {
      const backups = await getAvailableBackups()

      perf.logSuccess(200)
      logApiSuccess(context, 200)

      return createSuccessResponse({
        backups,
        count: backups.length,
      })
    } catch (error) {
      perf.logError(error as Error)
      logApiError(error as Error, context)

      throw createInternalServerError('Failed to list backups')
    }
  })
})

export const POST = withErrorHandler(async (request: NextRequest) => {
  return withAuth(request, async () => {
    const perf = createPerformanceLogger(request, Date.now())
    const context = createApiContext(request)

    try {
      const body = (await request.json()) as CreateBackupRequest

      // Backup creation logic would go here
      const backup = await createBackup(body)

      perf.logSuccess(201)
      logApiSuccess(context, 201)

      return createSuccessResponse(
        {
          id: backup.id,
          message: 'Backup created',
          timestamp: new Date().toISOString(),
        },
        201
      )
    } catch (error) {
      perf.logError(error as Error)
      logApiError(error as Error, context)

      throw createInternalServerError('Backup creation failed')
    }
  })
})

// Helper function
async function createBackup(options: CreateBackupRequest): Promise<{ id: string }> {
  // TODO: 实现备份创建逻辑
  return { id: `backup-${Date.now()}` }
}
```

### 修复 3: /api/export 使用标准错误处理

```typescript
// src/app/api/export/route.ts

import { NextRequest } from 'next/server'
import logger from '@/lib/logger'
import { withAuth } from '@/middleware/auth'
import {
  createSuccessResponse,
  createInternalServerError,
  withErrorHandler,
} from '@/lib/api/error-handler'
import {
  logApiError,
  logApiSuccess,
  createApiContext,
  createPerformanceLogger,
} from '@/lib/api/error-logger'

// ... types 保持不变

export const GET = withErrorHandler(async (request: NextRequest) => {
  return withAuth(request, async () => {
    const perf = createPerformanceLogger(request, Date.now())
    const context = createApiContext(request)

    try {
      // Export formats configuration
      const exportOptions: ExportOptions = {
        formats: ['json', 'csv'],
        default: 'json',
        maxRecords: 10000,
        fields: [
          'id',
          'title',
          'description',
          'status',
          'priority',
          'dueDate',
          'tags',
          'createdAt',
          'updatedAt',
        ],
      }

      perf.logSuccess(200)
      logApiSuccess(context, 200)

      return createSuccessResponse(exportOptions)
    } catch (error) {
      perf.logError(error as Error)
      logApiError(error as Error, context)

      throw createInternalServerError('Export request failed')
    }
  })
})
```

### 修复 4: /api/status 使用标准错误处理

```typescript
// src/app/api/status/route.ts

import { NextRequest } from 'next/server'
import logger from '@/lib/logger'
import { withAuth } from '@/middleware/auth'
import {
  createSuccessResponse,
  createInternalServerError,
  withErrorHandler,
} from '@/lib/api/error-handler'
import {
  logApiError,
  logApiSuccess,
  createApiContext,
  createPerformanceLogger,
} from '@/lib/api/error-logger'

// ... types 保持不变

export const GET = withErrorHandler(async (request: NextRequest) => {
  return withAuth(request, async () => {
    const perf = createPerformanceLogger(request, Date.now())
    const context = createApiContext(request)

    try {
      perf.logSuccess(200)
      logApiSuccess(context, 200)

      // 返回最小信息，防止信息泄露
      return createSuccessResponse({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
      })
    } catch (error) {
      perf.logError(error as Error)
      logApiError(error as Error, context)

      throw createInternalServerError('Status check failed')
    }
  })
})
```

### 修复 5: /api/health 添加详细日志

```typescript
// src/app/api/health/route.ts

import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { getDatabase } from '@/lib/db'
import {
  logApiError,
  logApiSuccess,
  createApiContext,
  createPerformanceLogger,
} from '@/lib/api/error-logger'

// ... types 保持不变

export async function GET(request: NextRequest): Promise<NextResponse<HealthCheckResponse>> {
  const perf = createPerformanceLogger(request, Date.now())
  const context = createApiContext(request)

  try {
    // Check database connection
    let dbStatus = 'ok'
    try {
      const db = getDatabase()
      if (!db) {
        dbStatus = 'error'
      }
    } catch (error) {
      dbStatus = 'error'
    }

    const response = NextResponse.json({
      success: true,
      status: dbStatus === 'ok' ? 'healthy' : 'unhealthy',
      checks: {
        database: dbStatus,
        timestamp: new Date().toISOString(),
      },
    })

    perf.logSuccess(response.status)
    logApiSuccess(context, response.status)

    return response
  } catch (error) {
    perf.logError(error as Error)
    logApiError(error as Error, context)

    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        checks: {
          database: 'error',
          timestamp: new Date().toISOString(),
        },
      } as HealthCheckResponse,
      { status: 503 }
    )
  }
}
```

### 修复 6: /api/github/commits 网络错误处理

```typescript
// src/app/api/github/commits/route.ts

import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import {
  createSuccessResponse,
  createInternalServerError,
  createBadRequestError,
  withErrorHandler,
} from '@/lib/api/error-handler'
import {
  logApiError,
  logApiSuccess,
  createApiContext,
  createPerformanceLogger,
} from '@/lib/api/error-logger'

// ... types 保持不变

export const GET = withErrorHandler(async (request: NextRequest) => {
  const perf = createPerformanceLogger(request, Date.now())
  const context = createApiContext(request)

  const { searchParams } = new URL(request.url)
  const owner = searchParams.get('owner') || 'owner'
  const repo = searchParams.get('repo') || 'repo'
  const branch = searchParams.get('branch') || 'main'

  // 参数验证
  if (!owner || !repo || !branch) {
    throw createBadRequestError('Missing required parameters', {
      required: ['owner', 'repo', 'branch'],
      provided: { owner, repo, branch },
    })
  }

  try {
    // In production, this would fetch from GitHub API
    // For now, return mock data
    const commits: GitHubCommit[] = [
      {
        sha: 'abc123',
        message: 'Initial commit',
        author: 'John Doe',
        date: new Date().toISOString(),
      },
    ]

    perf.logSuccess(200)
    logApiSuccess(context, 200)

    return createSuccessResponse({
      data: commits,
      meta: {
        owner,
        repo,
        branch,
        count: commits.length,
      },
    })
  } catch (error) {
    perf.logError(error as Error)
    logApiError(error as Error, context)

    throw createInternalServerError('Failed to fetch commits')
  }
})
```

---

## 📝 修复步骤总结

1. **第 1 步**: 修复 `/api/health/detailed` 的敏感信息泄露
2. **第 2 步**: 修复 `/api/backup` 的错误处理
3. **第 3 步**: 修复 `/api/export` 的错误处理
4. **第 4 步**: 修复 `/api/status` 的错误处理
5. **第 5 步**: 修复 `/api/health` 添加详细日志
6. **第 6 步**: 修复 `/api/github/commits` 网络错误处理

---

## ✅ 验证清单

每个修复完成后，验证以下项目：

- [ ] 端点返回标准格式响应
- [ ] 错误响应包含 `code`, `message`, `timestamp`
- [ ] 成功响应包含 `success`, `data`, `timestamp`
- [ ] 错误被正确记录到日志
- [ ] 请求上下文 (request ID, path, method) 被记录
- [ ] 性能指标 (duration) 被记录
- [ ] 敏感信息不在日志中暴露
- [ ] 生产环境不返回错误栈

---

## 🔍 测试命令

```bash
# 测试健康检查
curl http://localhost:3000/api/health

# 测试需要认证的端点 (需要先获取 token)
TOKEN="your-jwt-token"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/status

# 测试错误处理 (触发错误)
curl -H "Authorization: Bearer invalid-token" http://localhost:3000/api/backup

# 查看日志
tail -f logs/app.log | grep "API"
```

---

## 📚 相关文档

- 详细审查报告: `ERROR_HANDLING_LOGGING_REVIEW.md`
- 错误处理实现: `src/lib/api/error-handler.ts`
- 错误日志记录: `src/lib/api/error-logger.ts`
- 认证中间件: `src/middleware/auth.ts`

---

**快速修复指南结束**
