# 审计日志系统 (Audit Log System)

企业级审计日志系统，用于记录、查询和分析用户操作、系统事件和业务流程。

## 版本

v1.10.0

## 功能特性

### 1. 审计事件

- **用户操作审计** - 记录所有 CRUD 操作
- **系统事件审计** - 登录、登出、权限变更等
- **业务事件审计** - 关键业务流程追踪
- **安全事件审计** - 安全相关事件记录

### 2. 日志管理

- **结构化日志格式** - JSON 格式，易于解析和查询
- **日志级别和分类** - debug/info/warn/error/critical
- **日志归档和压缩** - 自动归档过期日志
- **日志保留策略** - 可配置的保留天数

### 3. 查询和分析

- **多维度查询** - 按用户、时间、操作类型、资源等查询
- **全文搜索支持** - 快速搜索日志内容
- **统计报表生成** - 聚合统计和趋势分析

### 4. 安全和合规

- **敏感数据脱敏** - 自动脱敏密码、令牌等敏感信息
- **日志完整性校验** - HMAC 签名防止篡改
- **合规报告导出** - 支持多种格式的合规报告

## 目录结构

```
src/lib/audit-log/
├── types.ts                    # 类型定义
├── config.ts                   # 配置管理
├── audit-log.ts                # 核心服务
├── event-builder.ts            # 事件构建器
├── sensitive-data-handler.ts   # 敏感数据处理
├── signature-handler.ts        # 数据完整性签名
├── query-service.ts            # 查询服务
├── analytics-service.ts        # 分析服务
├── compliance-service.ts       # 合规服务
├── export-service.ts           # 导出服务
├── storage/
│   ├── storage-factory.ts      # 存储工厂
│   ├── file-storage.ts         # 文件存储
│   └── memory-storage.ts       # 内存存储
└── README.md                   # 本文档
```

## 快速开始

### 1. 初始化服务

```typescript
import { initializeAuditLog, getAuditLogService } from './lib/audit-log/audit-log.js';

// 初始化审计日志服务
await initializeAuditLog();

// 获取服务实例
const auditLog = getAuditLogService();
```

### 2. 记录审计事件

```typescript
// 记录用户操作
await auditLog.logUserAction(
  'create',
  { userId: 'user123', username: 'john' },
  { type: 'document', id: 'doc456' },
  { title: 'New document' }
);

// 记录登录事件
await auditLog.logLogin(
  { userId: 'user123', username: 'john' },
  { clientIp: '192.168.1.1', userAgent: 'Mozilla/5.0' },
  true
);

// 记录权限变更
await auditLog.logPermissionChange(
  'role_assign',
  { userId: 'admin123', username: 'admin' },
  { userId: 'user123', username: 'john' },
  { role: 'editor' }
);

// 记录数据操作
await auditLog.logDataOperation(
  'update',
  { userId: 'user123', username: 'john' },
  { type: 'document', id: 'doc456' },
  [
    { field: 'title', oldValue: 'Old title', newValue: 'New title' },
    { field: 'status', oldValue: 'draft', newValue: 'published' }
  ]
);
```

### 3. 查询审计日志

```typescript
// 基本查询
const result = await auditLog.query({
  filter: {
    userIds: ['user123'],
    timeRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31')
    }
  },
  sort: { field: 'timestamp', order: 'desc' },
  pagination: { page: 1, pageSize: 50 }
});

// 使用查询构建器
import { QueryBuilder } from './lib/audit-log/query-service.js';

const queryBuilder = new QueryBuilder(storage);
const events = await queryBuilder
  .userIds('user123')
  .categories('user', 'security')
  .timeRange(new Date('2024-01-01'), new Date('2024-01-31'))
  .sortBy('timestamp', 'desc')
  .paginate(1, 50)
  .execute();
```

### 4. 统计分析

```typescript
// 聚合统计
const aggregation = await auditLog.aggregate({
  field: 'action',
  timeRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  },
  limit: 10
});

// 趋势分析
const trends = await auditLog.getTrends(
  { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
  'day'
);

// 用户活动统计
const userStats = await auditLog.getUserActivityStats('user123');

// 资源访问统计
const resourceStats = await auditLog.getResourceAccessStats('document', 'doc456');
```

### 5. 合规报告

```typescript
// 生成合规报告
const report = await auditLog.generateComplianceReport({
  type: 'user_access',
  name: '用户访问审计报告',
  timeRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  },
  includeSummary: true,
  includeDetails: true,
  includeCharts: true,
  format: 'json'
});

// 导出报告
await auditLog.export({
  format: 'json',
  timeRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  },
  outputPath: './reports/audit-report.json',
  includeSensitive: false,
  compress: true
});
```

## 配置

### 配置文件

配置文件位于 `./config/audit-log.json`：

```json
{
  "enabled": true,
  "serviceName": "openclaw",
  "levelThreshold": "info",
  "sensitiveFields": [
    { "path": "password", "mask": "full", "encrypt": true },
    { "path": "token", "mask": "full", "encrypt": true },
    { "path": "email", "mask": "partial" }
  ],
  "retention": {
    "retentionDays": 90,
    "archive": true,
    "archivePath": "./logs/audit/archive",
    "compress": true,
    "compressionFormat": "gzip"
  },
  "enableSigning": true,
  "asyncWrite": true,
  "batchSize": 100,
  "batchInterval": 5000,
  "maxStorageSize": 10737418240,
  "logRequestBody": false,
  "logResponseBody": false,
  "maxBodyLogSize": 1024,
  "excludePaths": ["/health", "/metrics"]
}
```

### 环境变量

```bash
# 存储类型 (file | memory | database)
AUDIT_LOG_STORAGE_TYPE=file

# 文件存储路径
AUDIT_LOG_FILE_PATH=./logs/audit

# 最大文件大小 (字节)
AUDIT_LOG_MAX_FILE_SIZE=104857600

# 是否启用压缩
AUDIT_LOG_COMPRESSION_ENABLED=true

# 签名密钥 (生产环境必须设置)
AUDIT_LOG_SIGNING_KEY=your-secret-key-here

# 内存存储最大事件数
AUDIT_LOG_MEMORY_MAX_EVENTS=10000
```

## API 参考

### AuditLogService

核心审计日志服务类。

#### 方法

- `initialize()` - 初始化服务
- `shutdown()` - 关闭服务
- `log(event)` - 记录审计事件
- `logUserAction(action, user, resource, details)` - 记录用户操作
- `logSystemEvent(action, message, level, details)` - 记录系统事件
- `logBusinessEvent(action, user, resource, status, details)` - 记录业务事件
- `logSecurityEvent(action, user, request, details)` - 记录安全事件
- `logLogin(user, request, success, details)` - 记录登录事件
- `logLogout(user, request)` - 记录登出事件
- `logPermissionChange(action, user, targetUser, details)` - 记录权限变更
- `logDataOperation(action, user, resource, changes, details)` - 记录数据操作
- `query(options)` - 查询审计日志
- `getById(id)` - 按ID获取事件
- `aggregate(options)` - 聚合统计
- `getTrends(timeRange, interval)` - 趋势分析
- `getUserActivityStats(userId, timeRange)` - 用户活动统计
- `getResourceAccessStats(resourceType, resourceId, timeRange)` - 资源访问统计
- `generateComplianceReport(config)` - 生成合规报告
- `export(options)` - 导出审计日志
- `import(inputPath, format, options)` - 导入审计日志

### AuditEventBuilder

审计事件构建器，提供流畅的 API。

```typescript
import { createAuditEvent } from './lib/audit-log/event-builder.js';

const event = createAuditEvent()
  .withId('audit_123')
  .withTimestamp(new Date())
  .withCategory('user')
  .withAction('create')
  .withMessage('User created document')
  .withUser({ userId: 'user123', username: 'john' })
  .withResource({ type: 'document', id: 'doc456' })
  .success()
  .build();
```

### QueryBuilder

查询构建器，用于构建复杂查询。

```typescript
import { QueryBuilder } from './lib/audit-log/query-service.js';

const queryBuilder = new QueryBuilder(storage);
const result = await queryBuilder
  .userIds('user123', 'user456')
  .categories('user', 'security')
  .timeRange(new Date('2024-01-01'), new Date('2024-01-31'))
  .actions('create', 'update')
  .statuses('success')
  .sortBy('timestamp', 'desc')
  .paginate(1, 50)
  .execute();
```

## 存储实现

### 文件存储 (FileAuditStorage)

默认存储实现，将日志写入文件系统。

**特点：**
- 持久化存储
- 支持压缩
- 自动归档
- 适合生产环境

**配置：**
```typescript
import { AuditStorageFactory } from './lib/audit-log/storage/storage-factory.js';

const storage = AuditStorageFactory.create({
  type: 'file',
  options: {
    basePath: './logs/audit',
    maxFileSize: 100 * 1024 * 1024, // 100MB
    compressionEnabled: true
  }
});
```

### 内存存储 (MemoryAuditStorage)

内存存储实现，适合测试和轻量级场景。

**特点：**
- 高性能
- 无持久化
- 适合测试环境
- 有限容量

**配置：**
```typescript
const storage = AuditStorageFactory.create({
  type: 'memory',
  options: {
    maxEvents: 10000
  }
});
```

## 敏感数据处理

系统自动脱敏敏感数据，支持以下脱敏规则：

- **full** - 完全脱敏，替换为 `***`
- **partial** - 部分脱敏，保留部分字符
- **hash** - 哈希脱敏，使用 SHA256 哈希

**配置敏感字段：**
```typescript
import { getConfigManager } from './lib/audit-log/config.js';

const config = getConfigManager();

// 添加敏感字段
config.addSensitiveField({
  path: 'user.password',
  mask: 'full',
  encrypt: true
});

// 移除敏感字段
config.removeSensitiveField('user.email');
```

## 数据完整性

使用 HMAC 签名确保日志完整性，防止篡改。

**启用签名：**
```typescript
import { AuditSignatureHandler } from './lib/audit-log/signature-handler.js';

const signatureHandler = new AuditSignatureHandler(true, 'your-secret-key');

// 签名事件
const signedEvent = signatureHandler.sign(event);

// 验证签名
const isValid = signatureHandler.verify(signedEvent);

// 批量验证
const { valid, invalid } = signatureHandler.verifyBatch(events);
```

## 合规报告

支持生成多种类型的合规报告：

- `user_access` - 用户访问审计报告
- `permission_changes` - 权限变更审计报告
- `data_access` - 数据访问审计报告
- `security_events` - 安全事件审计报告
- `admin_actions` - 管理操作审计报告
- `failed_operations` - 失败操作审计报告

**生成报告：**
```typescript
const report = await auditLog.generateComplianceReport({
  type: 'user_access',
  name: '用户访问审计报告',
  timeRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  },
  includeSummary: true,
  includeDetails: true,
  includeCharts: true,
  format: 'json'
});
```

## 导出和导入

### 导出

支持导出为 JSON、CSV、XLSX 格式：

```typescript
await auditLog.export({
  format: 'json',
  timeRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  },
  outputPath: './exports/audit.json',
  includeSensitive: false,
  compress: true
});
```

### 导入

支持从 JSON、CSV 格式导入：

```typescript
const result = await auditLog.import(
  './imports/audit.json',
  'json',
  {
    overwrite: false,
    verifySignature: true,
    skipInvalid: true
  }
);

console.log(`Imported: ${result.imported}, Skipped: ${result.skipped}, Failed: ${result.failed}`);
```

## 最佳实践

### 1. 选择合适的日志级别

- `debug` - 调试信息，生产环境通常不记录
- `info` - 一般信息，正常操作
- `warn` - 警告信息，需要注意但不影响功能
- `error` - 错误信息，操作失败
- `critical` - 严重错误，需要立即处理

### 2. 合理设置保留策略

根据合规要求和存储容量设置保留天数：

```typescript
config.updateRetentionPolicy({
  retentionDays: 90,
  archive: true,
  compress: true
});
```

### 3. 使用异步写入提高性能

生产环境建议启用异步写入：

```typescript
{
  asyncWrite: true,
  batchSize: 100,
  batchInterval: 5000
}
```

### 4. 定期清理过期数据

设置定时任务清理过期日志：

```typescript
// 每天清理一次
setInterval(async () => {
  const deleted = await auditLog.cleanup();
  console.log(`Cleaned up ${deleted} expired events`);
}, 24 * 60 * 60 * 1000);
```

### 5. 监控存储大小

定期检查存储大小，避免磁盘空间不足：

```typescript
const stats = await auditLog.getStorageStats();
console.log(`Storage size: ${stats.storageSize} bytes`);
```

## 性能优化

### 1. 批量写入

使用批量写入减少 I/O 操作：

```typescript
const events = [event1, event2, event3];
await storage.writeBatch(events);
```

### 2. 索引优化

文件存储按日期分文件，查询时自动过滤时间范围。

### 3. 压缩存储

启用压缩减少存储空间：

```typescript
{
  compressionEnabled: true,
  compressionFormat: 'gzip'
}
```

### 4. 分页查询

使用分页避免一次性加载大量数据：

```typescript
await auditLog.query({
  pagination: { page: 1, pageSize: 50 }
});
```

## 安全建议

1. **保护签名密钥** - 使用环境变量存储签名密钥，不要硬编码
2. **限制访问权限** - 审计日志文件应该只有管理员可访问
3. **加密存储** - 敏感字段可以配置加密存储
4. **定期备份** - 定期备份审计日志到安全位置
5. **监控异常** - 监控异常的审计事件，如频繁的失败操作

## 故障排查

### 日志未记录

1. 检查 `enabled` 配置是否为 `true`
2. 检查日志级别是否低于 `levelThreshold`
3. 检查存储路径是否有写入权限

### 查询缓慢

1. 减少查询时间范围
2. 使用分页查询
3. 考虑使用数据库存储

### 存储空间不足

1. 减少保留天数
2. 启用压缩
3. 定期归档旧日志

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！