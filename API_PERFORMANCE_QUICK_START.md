# API Performance Monitoring - Quick Start Guide
# API 性能监控 - 快速开始指南

## 📊 概述

本指南帮助你快速开始使用 7zi-project 的 API 性能监控系统。

---

## 🚀 快速开始

### 1. 在现有 API 路由中启用性能监控

#### 最简单的方式：使用包装器

```typescript
import { withApiPerformanceTracking } from '@/lib/middleware/api-performance';
import { NextRequest, NextResponse } from 'next/server';

// 自动记录性能
export const GET = withApiPerformanceTracking(async (request: NextRequest) => {
  // 你的 API 逻辑
  return NextResponse.json({ success: true });
});

export const POST = withApiPerformanceTracking(async (request: NextRequest) => {
  const body = await request.json();
  // 处理请求
  return NextResponse.json({ success: true, data: body });
});
```

#### 手动方式：自定义性能记录

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logRequestStart, logRequestComplete, logRequestError } from '@/lib/api/api-logger';
import { recordCustomMetric } from '@/lib/monitoring';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const metadata = logRequestStart(request);

  try {
    // 你的 API 逻辑
    const result = await someOperation();

    const response = NextResponse.json({ success: true, data: result });

    // 记录性能
    logRequestComplete(metadata, response, startTime);

    return response;
  } catch (error) {
    logRequestError(metadata, error, startTime);
    throw error;
  }
}
```

---

## 📈 查看性能报告

### 方式 1: 使用 curl

```bash
# 获取完整性能报告
curl http://localhost:3000/api/performance/report

# 获取慢请求列表
curl http://localhost:3000/api/performance/report?action=slow

# 清除性能数据
curl -X DELETE http://localhost:3000/api/performance/report
```

### 方式 2: 使用测试脚本

```bash
# 运行测试脚本
./test-api-performance.sh

# 指定不同的基础 URL
./test-api-performance.sh https://your-production-url.com
```

### 方式 3: 在浏览器中访问

```
http://localhost:3000/api/performance/report
http://localhost:3000/api/performance/report?action=slow
```

---

## 🎯 性能指标说明

### 响应时间等级

| 级别 | 响应时间 | 日志级别 | 说明 |
|------|----------|----------|------|
| 🟢 快速 | < 500ms | INFO | 正常范围 |
| 🟡 慢速 | 500ms - 2000ms | WARN | 需要关注 |
| 🔴 严重 | > 2000ms | ERROR | 需要优化 |

### 响应头

每个 API 响应会自动添加以下响应头：

- `x-request-id`: 请求唯一标识符
- `x-response-time`: 响应时间（毫秒）

---

## 🔔 告警机制

### 自动告警

系统会自动检测并记录：

1. **慢查询** (> 500ms)
   ```
   [WARN] [API Performance] Slow request detected
   { requestId: '...', path: '/api/...', duration: 650.5ms, ... }
   ```

2. **严重性能问题** (> 2000ms)
   ```
   [ERROR] [API Performance] Critical slow request detected
   { requestId: '...', path: '/api/...', duration: 3500.0ms, ... }
   ```

### 查看日志

慢查询会记录到应用程序日志中，你可以通过以下方式查看：

```bash
# 查看最近的慢查询
grep "Slow request detected" logs/app.log

# 查看严重的性能问题
grep "Critical slow request detected" logs/app.log
```

---

## 📊 性能报告数据结构

### 完整报告

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRequests": 1250,
      "successfulRequests": 1180,
      "failedRequests": 70,
      "averageDuration": 245.5,
      "maxDuration": 3450.0,
      "minDuration": 12.0,
      "slowRequests": 85,
      "errors": {
        "400": 25,
        "401": 30,
        "500": 15
      }
    },
    "slowRequests": [
      {
        "requestId": "req_123",
        "method": "POST",
        "path": "/api/auth/login",
        "statusCode": 200,
        "duration": 850.5,
        "timestamp": 1679287200000,
        "success": true
      }
    ],
    "routes": {
      "/api/auth/login": {
        "count": 150,
        "avgDuration": 320.5,
        "maxDuration": 850.0,
        "minDuration": 45.0,
        "errorRate": 5.33
      }
    }
  },
  "timestamp": "2026-03-19T23:45:00.000Z"
}
```

### 字段说明

#### Summary（汇总统计）

- `totalRequests`: 总请求数
- `successfulRequests`: 成功请求数（2xx-3xx）
- `failedRequests`: 失败请求数（4xx-5xx）
- `averageDuration`: 平均响应时间（毫秒）
- `maxDuration`: 最慢响应时间（毫秒）
- `minDuration`: 最快响应时间（毫秒）
- `slowRequests`: 慢请求数（>500ms）
- `errors`: 按状态码分类的错误统计

#### Routes（路由统计）

- `count`: 该路由的总请求数
- `avgDuration`: 平均响应时间
- `maxDuration`: 最慢响应时间
- `minDuration`: 最快响应时间
- `errorRate`: 错误率（百分比）

---

## 🛠️ 高级用法

### 自定义性能记录

```typescript
import { recordCustomMetric } from '@/lib/monitoring';

// 记录数据库查询性能
const queryStart = Date.now();
const result = await db.query('SELECT * FROM users');
const queryDuration = Date.now() - queryStart;

recordCustomMetric('db.query.users', queryDuration, 'api', {
  query: 'SELECT * FROM users',
  rows: result.length,
});

// 记录外部 API 调用
const apiStart = Date.now();
const response = await fetch('https://external-api.com/data');
const apiDuration = Date.now() - apiStart;

recordCustomMetric('external.api.fetch', apiDuration, 'api', {
  url: 'https://external-api.com/data',
  status: response.status,
});
```

### 监听性能事件

```typescript
import { onPerformanceMetric, onPerformanceAlert } from '@/lib/monitoring';

// 监听性能指标
const unsubscribeMetrics = onPerformanceMetric((metric) => {
  console.log('Performance metric:', metric);
});

// 监听性能告警
const unsubscribeAlerts = onPerformanceAlert((alert) => {
  console.error('Performance alert:', alert);

  // 发送通知
  if (alert.level === 'critical') {
    sendSlackNotification(alert);
  }
});

// 取消监听
unsubscribeMetrics();
unsubscribeAlerts();
```

---

## 📚 相关文件

### 核心文件

- `src/lib/middleware/api-performance.ts` - API 性能监控中间件
- `src/lib/api/api-performance-logger.ts` - 性能日志记录
- `src/app/api/performance/report/route.ts` - 性能报告端点

### 示例文件

- `src/app/api/example/performance/route.ts` - 性能监控示例 API
- `test-api-performance.sh` - 性能监控测试脚本

### 文档文件

- `docs/PERFORMANCE_REPORT.md` - 完整性能报告文档
- `API_PERFORMANCE_QUICK_START.md` - 本文件

---

## 🤝 贡献

如果你有任何问题或建议，请：

1. 提交 Issue
2. 创建 Pull Request
3. 联系开发团队

---

## 📞 支持

如有问题，请联系：

- **项目**: 7zi AI Team Management Platform
- **文档**: [docs/PERFORMANCE_REPORT.md](PERFORMANCE_REPORT.md)
- **Issue**: [GitHub Issues](https://github.com/your-repo/issues)

---

**最后更新**: 2026-03-19 23:50:00 UTC
