# 审计日志系统 v1.12.0

企业级审计日志系统，用于记录、查询和分析用户操作，支持合规和故障排查。

## 功能特性

### 核心功能

- **结构化审计字段** - userId, action, resource, resourceId, metadata, ipAddress, userAgent
- **操作类型** - CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, ADMIN
- **异步写入** - 不阻塞主流程，支持批量处理
- **日志保留策略** - 默认90天，可配置

### 额外功能

- **实时事件推送** - 通过 WebSocket 推送审计事件
- **自动中间件** - 自动捕获 API 请求
- **查询 API** - RESTful API 查询和导出
- **统计分析** - 支持统计和导出功能

## 目录结构

```
src/lib/audit/
├── types.ts                    # 类型定义
├── audit-logger.ts             # 核心服务
├── middleware.ts               # 中间件
├── websocket.ts                # WebSocket 服务
├── storage/
│   └── memory-storage.ts       # 内存存储实现
├── __tests__/
│   └── audit-logger.test.ts    # 测试
└── index.ts                   # 入口文件
```

## 快速开始

### 1. 初始化服务

```typescript
import { getAuditLogger } from '@/lib/audit';

// 获取审计日志服务实例
const auditLogger = getAuditLogger();
```

### 2. 记录审计事件

```typescript
import { getAuditLogger } from '@/lib/audit';

const auditLogger = getAuditLogger();

// 记录创建操作
await auditLogger.logCreate(
  'user123',           // userId
  'document',          // resource
  'doc456',           // resourceId (optional)
  { title: 'Test' }   // metadata (optional)
);

// 记录登录操作
await auditLogger.logLogin(
  'user123',
  'john',
  '192.168.1.1',
  'Mozilla/5.0'
);

// 记录通用操作
await auditLogger.log({
  userId: 'user123',
  action: 'UPDATE',
  resource: 'document',
  resourceId: 'doc456',
  status: 'success',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  metadata: { changes: ['title', 'content'] }
});
```

### 3. 查询审计日志

```typescript
import { getAuditLogger } from '@/lib/audit';

const auditLogger = getAuditLogger();

// 基本查询
const result = await auditLogger.query({
  limit: 50,
  offset: 0,
  sortBy: 'timestamp',
  sortOrder: 'desc'
});

// 按条件查询
const result = await auditLogger.query({
  userId: 'user123',
  action: 'CREATE',
  resource: 'document',
  startTime: new Date('2024-01-01'),
  endTime: new Date('2024-01-31')
});

console.log(result.logs);
console.log(result.total);
```

### 4. 获取统计信息

```typescript
const stats = await auditLogger.getStats();
console.log(stats.totalLogs);
console.log(stats.byAction);
console.log(stats.byStatus);
console.log(stats.topUsers);
```

### 5. 导出日志

```typescript
// 导出为 JSON
const jsonData = await auditLogger.export({
  format: 'json',
  startTime: new Date('2024-01-01'),
  endTime: new Date('2024-01-31')
});

// 导出为 CSV
const csvData = await auditLogger.export({
  format: 'csv',
  startTime: new Date('2024-01-01'),
  endTime: new Date('2024-01-31'),
  userId: 'user123'
});
```

## API 路由

### GET /api/audit/logs

查询审计日志

**Query Parameters:**

| 参数 | 类型 | 描述 |
|------|------|------|
| userId | string | 用户ID (可选) |
| username | string | 用户名 (可选) |
| action | string | 操作类型 (可选) |
| resource | string | 资源类型 (可选) |
| resourceId | string | 资源ID (可选) |
| status | string | 状态 (可选) |
| startTime | ISO date | 开始时间 (可选) |
| endTime | ISO date | 结束时间 (可选) |
| search | string | 搜索关键词 (可选) |
| sortBy | string | 排序字段 (默认: timestamp) |
| sortOrder | string | 排序方向 (默认: desc) |
| offset | number | 偏移量 (默认: 0) |
| limit | number | 限制数量 (默认: 100, 最大: 1000) |

### GET /api/audit/logs/[id]

获取审计日志详情

### GET /api/audit/export

导出审计日志

**Query Parameters:**

| 参数 | 类型 | 描述 |
|------|------|------|
| format | string | 导出格式 (json 或 csv, 必需) |
| startTime | ISO date | 开始时间 (必需) |
| endTime | ISO date | 结束时间 (必需) |
| userId | string | 用户ID (可选) |
| action | string | 操作类型 (可选) |
| resource | string | 资源类型 (可选) |
| resourceId | string | 资源ID (可选) |
| status | string | 状态 (可选) |
| maxRecords | number | 最大记录数 (默认: 10000, 最大: 100000) |

## 中间件

### 创建中间件

```typescript
import { createAuditMiddleware } from '@/lib/audit';

const middleware = createAuditMiddleware({
  enabled: true,
  excludePaths: ['/health', '/api/health', '/_next'],
  actionMap: {
    'POST': 'CREATE',
    'GET': 'READ',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE',
  },
  extractUserId: (request) => {
    const token = request.headers.get('authorization');
    // 从token提取用户ID
    return extractUserIdFromToken(request);
  }
});
```

### 在 Next.js 中使用

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAuditMiddleware } from '@/lib/audit/middleware';

const auditMiddleware = createAuditMiddleware();

export async function middleware(request: NextRequest) {
  const response = await auditMiddleware(request);
  return response || NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

## WebSocket 实时推送

### 服务端

```typescript
import { getAuditWebSocketService } from '@/lib/audit/websocket';

const wsService = getAuditWebSocketService();

// 添加订阅者
wsService.addSubscriber(
  'subscriber-1',
  (data) => {
    // 发送数据到客户端
    socket.send(data);
  },
  {
    userId: 'user123',        // 可选过滤
    actions: ['CREATE', 'UPDATE'],  // 可选过滤
    resources: ['document']    // 可选过滤
  }
);

// 广播审计事件
wsService.broadcast({
  id: 'audit_123',
  userId: 'user123',
  action: 'CREATE',
  resource: 'document',
  resourceId: 'doc456',
  status: 'success',
  timestamp: new Date()
});

// 获取统计
const stats = wsService.getStats();
```

### 客户端

```typescript
// 连接到 WebSocket
const ws = new WebSocket('ws://localhost:3000/api/audit/ws');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'audit_event') {
    const auditLog = message.data;
    console.log('New audit event:', auditLog);
  } else if (message.type === 'stats_update') {
    const stats = message.data;
    console.log('Stats update:', stats);
  }
};
```

## 配置

### 环境变量

| 变量 | 默认值 | 描述 |
|------|--------|------|
| AUDIT_LOG_ENABLED | true | 是否启用 |
| AUDIT_LOG_RETENTION_DAYS | 90 | 保留天数 |
| AUDIT_LOG_ASYNC_WRITE | true | 异步写入 |
| AUDIT_LOG_BATCH_SIZE | 50 | 批量大小 |
| AUDIT_LOG_BATCH_INTERVAL | 3000 | 批量间隔 (ms) |
| AUDIT_LOG_MAX_LOGS | 10000 | 最大日志数 |

## 测试

```bash
# 运行测试
npm test -- --testPathPattern=audit-logger

# 运行测试并查看覆盖率
npm test -- --testPathPattern=audit-logger --coverage
```

## 许可证

MIT License
