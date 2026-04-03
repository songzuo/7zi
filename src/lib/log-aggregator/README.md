# Log Aggregator - v1.10.0

企业级日志聚合和分析系统

## 功能特性

### 1. 日志收集器
- **文件收集器** - 监控日志文件变化，实时收集新日志
- **HTTP 收集器** - 提供 HTTP 端点接收日志推送
- **Stdout 收集器** - 拦截控制台输出作为日志源

### 2. 日志解析器
- **JSON 解析器** - 解析 JSON 格式日志
- **Nginx 解析器** - 解析 Nginx 访问日志
- **Apache 解析器** - 解析 Apache 访问日志
- **应用日志解析器** - 解析通用应用日志格式
- **自定义正则解析器** - 支持自定义正则表达式

### 3. 日志存储
- **时序存储** - 按时间分区，支持快速范围查询
- **多级索引** - 级别索引、来源索引、全文索引
- **内存存储** - 高性能内存存储，适合测试和小规模部署
- **文件存储** - 持久化存储，支持备份和恢复

### 4. 分析引擎
- **异常检测** - Z-Score、Isolation Forest、K-Means、DBSCAN
- **趋势分析** - 线性回归、指数平滑、移动平均
- **统计报告** - 自动生成日志分析报告

### 5. 告警系统
- **多种告警类型** - 阈值、速率、缺失、模式匹配、ML
- **多通道通知** - Email、Webhook、Slack、PagerDuty、SMS
- **节流控制** - 防止告警风暴
- **升级策略** - 支持告警升级

### 6. 搜索 API
- **全文搜索** - 支持文本搜索和高亮
- **结构化查询** - 支持过滤、排序、分页
- **聚合查询** - Count、Sum、Avg、Min、Max、Percentile
- **查询缓存** - 提升查询性能

## 技术规格

| 指标 | 目标 |
|------|------|
| 日志吞吐量 | 100GB+/天 |
| 搜索延迟 | < 1秒 |
| 存储压缩率 | 5:1 |
| 并发查询 | 100+ |

## 快速开始

```typescript
import { createLogAggregator, getDefaultConfig } from '@/lib/log-aggregator';

// 创建日志聚合器
const config = getDefaultConfig();
const aggregator = createLogAggregator(config);

// 启动
await aggregator.start();

// 查询日志
const result = await aggregator.storage.query({
  timeRange: {
    start: new Date(Date.now() - 3600000),
    end: new Date(),
  },
  filters: [
    { field: 'level', operator: 'eq', value: 'error' },
  ],
});

console.log(`Found ${result.total} error logs`);

// 停止
await aggregator.stop();
```

## 配置说明

### 收集器配置

```typescript
const collectorConfig = {
  id: 'file-collector',
  type: 'file',
  enabled: true,
  batchSize: 100,        // 批量大小
  flushInterval: 5000,   // 刷新间隔 (ms)
  retryAttempts: 3,      // 重试次数
  retryDelay: 1000,      // 重试延迟 (ms)
  bufferSize: 1000,      // 缓冲区大小
  filePath: '/var/log/app.log',
  encoding: 'utf8',
};
```

### 存储配置

```typescript
const storageConfig = {
  type: 'memory',          // memory | file | elasticsearch | clickhouse
  retentionDays: 7,        // 保留天数
  indexPattern: 'logs-*',  // 索引模式
  compressionEnabled: true,
  compressionAlgorithm: 'gzip',
};
```

### 告警配置

```typescript
const alertRule = {
  id: 'error-threshold',
  name: 'Error Threshold Alert',
  enabled: true,
  severity: 'high',
  condition: {
    type: 'threshold',     // threshold | rate | absence | pattern | ml
    field: 'level',
    operator: 'eq',
    value: 'error',
    timeWindow: 60,        // 时间窗口 (秒)
    minOccurrences: 5,     // 最小触发次数
  },
  actions: [
    { type: 'webhook', config: { url: 'https://hooks.example.com/alert' } },
    { type: 'slack', config: { webhookUrl: 'https://hooks.slack.com/...' } },
  ],
  throttle: {
    enabled: true,
    period: 300,           // 节流周期 (秒)
    maxAlerts: 3,          // 最大告警数
  },
};
```

## API 参考

### 查询语法

```
# 全文搜索
error message

# 字段过滤
level:error

# 范围查询
duration:[100 TO 500]

# 通配符
source:app-*

# 组合查询
level:error AND source:app.log
```

### 聚合查询

```typescript
const result = await aggregator.storage.aggregate({
  timeRange: { start, end },
  groupBy: ['level', 'source.name'],
  aggregations: [
    { type: 'count', field: 'id', name: 'count' },
    { type: 'avg', field: 'metadata.duration', name: 'avg_duration' },
    { type: 'percentile', field: 'metadata.duration', name: 'p95', percentile: 95 },
  ],
  granularity: 'hour',
});
```

### 搜索 API

```typescript
const response = await aggregator.searchApi.search({
  query: 'error OR warning',
  timeRange: { start, end },
  filters: [
    { field: 'source.name', operator: 'eq', value: 'app.log' },
  ],
  sort: [{ field: 'timestamp', order: 'desc' }],
  pagination: { offset: 0, limit: 100 },
  highlight: {
    enabled: true,
    fields: ['message'],
    preTag: '<mark>',
    postTag: '</mark>',
  },
});
```

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     Log Aggregator                           │
├─────────────────────────────────────────────────────────────┤
│  Collectors          Parsers           Storage              │
│  ┌─────────┐        ┌─────────┐       ┌──────────┐         │
│  │ File    │───────▶│ JSON    │──────▶│ Memory   │         │
│  │ HTTP    │        │ Nginx   │       │ File     │         │
│  │ Stdout  │        │ Apache  │       │ ES       │         │
│  └─────────┘        │ Custom  │       └──────────┘         │
│                     └─────────┘              │              │
├──────────────────────────────────────────────┼──────────────┤
│  Analysis Engine    Alert Manager    Search API             │
│  ┌──────────┐       ┌──────────┐    ┌───────────┐          │
│  │ Anomaly  │◀──────│ Rules    │◀───│ Query     │          │
│  │ Trend    │       │ Actions  │    │ Aggregate │          │
│  │ Report   │       │ Throttle │    │ Suggest   │          │
│  └──────────┘       └──────────┘    └───────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## 性能优化

### 内存优化
- 使用流式处理减少内存占用
- 定期清理过期数据
- 启用压缩减少存储空间

### 查询优化
- 使用索引加速查询
- 启用查询缓存
- 合理设置分页大小

### 写入优化
- 批量写入减少 I/O
- 异步处理提升吞吐量
- 合理设置批量大小

## 监控指标

```typescript
const stats = aggregator.storage.getStats();
console.log({
  totalEntries: stats.totalEntries,
  totalSize: stats.totalSize,
  avgEntrySize: stats.avgEntrySize,
});

const status = aggregator.getStatus();
console.log({
  isRunning: status.isRunning,
  queueSize: status.queueSize,
});
```

## 最佳实践

1. **合理设置保留期** - 根据合规要求和存储容量设置
2. **启用压缩** - 减少 80%+ 存储空间
3. **监控告警** - 及时发现和处理问题
4. **定期备份** - 防止数据丢失
5. **优化查询** - 使用索引和缓存

## 版本历史

### v1.10.0 (2024-04-03)
- 初始版本
- 实现日志收集、解析、存储
- 实现分析引擎和告警系统
- 实现搜索 API

## License

MIT