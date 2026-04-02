# Database Performance Optimization Implementation Guide

# 数据库性能优化实施指南

## Overview / 概述

This guide provides comprehensive documentation for the database performance optimization features implemented for the 7zi-project, including:

- Connection pooling with health checks
- Slow query detection and logging
- Query performance monitoring
- Pagination support
- N+1 query detection and prevention
- Query caching integration

本指南为 7zi-project 的数据库性能优化功能提供全面文档，包括：

- 带健康检查的连接池
- 慢查询检测和日志
- 查询性能监控
- 分页支持
- N+1 查询检测和预防
- 查询缓存集成

---

## 1. Connection Pool / 连接池

### 1.1 Features / 功能

- **Automatic connection management**: Creates and manages database connections automatically
- **Health checks**: Periodic health checks to ensure connection validity
- **Connection recovery**: Automatic recovery from unhealthy connections
- **Configurable pool size**: Adjustable minimum and maximum connections
- **Connection timeout**: Automatic timeout for long-running queries
- **Idle connection cleanup**: Automatic cleanup of idle connections
- **Load balancing**: Distributes queries across available connections
- **Statistics and monitoring**: Real-time pool statistics

**自动连接管理**：自动创建和管理数据库连接
**健康检查**：定期健康检查以确保连接有效性
**连接恢复**：从不健康的连接自动恢复
**可配置的池大小**：可调整的最小和最大连接数
**连接超时**：长时间运行查询的自动超时
**空闲连接清理**：自动清理空闲连接
**负载均衡**：在可用连接之间分配查询
**统计和监控**：实时池统计

### 1.2 Usage / 使用方法

```typescript
import { getConnectionPool, type PoolConfig } from '@/lib/db/connection-pool'

// Get or create connection pool
const pool = getConnectionPool({
  databasePath: '/path/to/database.sqlite',
  maxConnections: 10,
  minConnections: 2,
  connectionTimeout: 30000,
  idleTimeout: 300000,
  healthCheckInterval: 60000,
  maxConnectionAge: 3600000,
  enableWAL: true,
})

// Acquire a connection
const db = await pool.acquire()

// Use the connection
const stmt = db.prepare('SELECT * FROM agents WHERE status = ?')
const agents = stmt.all('active')

// Release the connection back to the pool
pool.release(db)

// Get pool statistics
const stats = pool.getStats()
console.log('Pool stats:', stats)

// Perform health check
const health = await pool.performHealthCheck()
console.log('Health status:', health)

// Shutdown the pool
await pool.shutdown()
```

### 1.3 Configuration / 配置

```typescript
interface PoolConfig {
  databasePath: string // Database file path
  maxConnections: number // Max connections (default: 10)
  minConnections: number // Min connections (default: 2)
  connectionTimeout: number // Timeout in ms (default: 30000)
  idleTimeout: number // Idle timeout in ms (default: 300000)
  healthCheckInterval: number // Health check interval (default: 60000)
  maxConnectionAge: number // Max connection age in ms (default: 3600000)
  enableWAL: boolean // Enable WAL mode (default: true)
}
```

---

## 2. Slow Query Logger / 慢查询日志

### 2.1 Features / 功能

- **Automatic detection**: Automatically logs slow queries (>100ms by default)
- **Query pattern analysis**: Analyzes query patterns for optimization
- **Performance metrics**: Tracks total queries, execution times, and statistics
- **Alert system**: Generates alerts for degraded performance
- **Detailed logging**: Logs SQL, execution time, rows affected, and more
- **Report generation**: Generates comprehensive performance reports

**自动检测**：自动记录慢查询（默认 >100ms）
**查询模式分析**：分析查询模式以进行优化
**性能指标**：跟踪总查询数、执行时间和统计信息
**警报系统**：为性能下降生成警报
**详细日志**：记录 SQL、执行时间、受影响的行数等
**报告生成**：生成全面的性能报告

### 2.2 Usage / 使用方法

```typescript
import { getSlowQueryLogger } from '@/lib/db/slow-query-logger'

// Get slow query logger instance
const logger = getSlowQueryLogger()

// Set thresholds
logger.setSlowQueryThreshold(100) // Slow query threshold in ms
logger.setVerySlowQueryThreshold(1000) // Very slow query threshold in ms

// Get slow queries
const slowQueries = logger.getSlowQueries(10) // Get top 10 slow queries

// Get performance metrics
const metrics = logger.getMetrics()
console.log('Total queries:', metrics.totalQueries)
console.log('Average time:', metrics.avgExecutionTime)

// Get slow query statistics
const stats = logger.getSlowQueryStats()
console.log('Slow queries:', stats.total)
console.log('Average slow query time:', stats.avgTime)

// Generate performance report
const report = logger.generateReport()
console.log(report)

// Clear logs
logger.clear()
```

---

## 3. Query Pagination / 查询分页

### 3.1 Features / 功能

- **Offset-based pagination**: Traditional page/offset pagination
- **Cursor-based pagination**: Efficient cursor pagination for large datasets
- **Automatic limit enforcement**: Enforces default and maximum limits
- **Type-safe**: Full TypeScript support
- **Total count optimization**: Efficient total count queries
- **Meta information**: Provides pagination metadata

**基于偏移量的分页**：传统的页/偏移量分页
**基于游标的分页**：用于大数据集的高效游标分页
**自动限制执行**：强制执行默认和最大限制
**类型安全**：完整的 TypeScript 支持
**总数优化**：高效的总数查询
**元信息**：提供分页元数据

### 3.2 Usage / 使用方法

```typescript
import {
  parsePaginationOptions,
  buildPaginationClause,
  executePaginatedQuery,
  executeCursorPaginatedQuery,
  type PaginationOptions,
  type PaginatedResult,
} from '@/lib/db/pagination'

// Offset-based pagination
const options: PaginationOptions = {
  page: 1,
  limit: 20,
  maxLimit: 100,
}

// Build pagination clause
const { clause, params } = buildPaginationClause(options)
const sql = `SELECT * FROM agents ${clause}`

// Execute paginated query
const result = await executePaginatedQuery(
  async (limit, offset) => {
    const db = await getDatabase()
    const stmt = db.prepare(`SELECT * FROM agents LIMIT ? OFFSET ?`)
    return stmt.all(limit, offset)
  },
  async () => {
    const db = await getDatabase()
    const stmt = db.prepare('SELECT COUNT(*) as count FROM agents')
    const { count } = stmt.get() as { count: number }
    return count
  },
  options
)

console.log('Items:', result.items)
console.log('Page:', result.meta.currentPage)
console.log('Total:', result.meta.total)
console.log('Has next:', result.meta.hasNext)

// Cursor-based pagination
const cursorOptions: PaginationOptions = {
  limit: 20,
  cursor: 'first', // or use cursor from previous page
  cursorField: 'id',
}

const cursorResult = await executeCursorPaginatedQuery(async (limit, cursor) => {
  const db = await getDatabase()
  let sql = `SELECT * FROM agents ORDER BY id ASC LIMIT ?`
  let params = [limit]

  if (cursor) {
    sql = `SELECT * FROM agents WHERE id > ? ORDER BY id ASC LIMIT ?`
    params = [cursor, limit]
  }

  const stmt = db.prepare(sql)
  return stmt.all(...params)
}, cursorOptions)

console.log('Items:', cursorResult.items)
console.log('Next cursor:', cursorResult.meta.nextCursor)
```

---

## 4. N+1 Query Detection / N+1 查询检测

### 4.1 Features / 功能

- **Automatic detection**: Detects N+1 query patterns
- **Query pattern analysis**: Analyzes query patterns across requests
- **Optimization suggestions**: Provides actionable optimization suggestions
- **Batch query generation**: Converts multiple queries to batch queries
- **Eager loading helpers**: Helper functions for eager loading related entities
- **Request tracking**: Tracks queries per HTTP request

**自动检测**：检测 N+1 查询模式
**查询模式分析**：分析跨请求的查询模式
**优化建议**：提供可操作的优化建议
**批量查询生成**：将多个查询转换为批量查询
**急切加载助手**：用于急切加载相关实体的助手函数
**请求跟踪**：跟踪每个 HTTP 请求的查询

### 4.2 Usage / 使用方法

```typescript
import {
  getNPlus1Detector,
  createBatchQuery,
  executeBatchQuery,
  eagerLoad,
} from '@/lib/db/nplus1-detector'

// Get N+1 detector
const detector = getNPlus1Detector()

// Start tracking a request
detector.startRequest('request-123')

// Record queries (this is typically done automatically)
detector.recordQuery('SELECT * FROM agents WHERE id = 1', 5)
detector.recordQuery('SELECT * FROM agents WHERE id = 2', 5)
detector.recordQuery('SELECT * FROM agents WHERE id = 3', 5)

// End tracking and analyze
const detection = detector.endRequest('request-123')

if (detection.detected) {
  console.warn('N+1 query detected!')
  console.warn('Severity:', detection.severity)
  console.warn('Patterns:', detection.patterns)
  console.warn('Suggestions:', detection.suggestions)
}

// Create batch query
const individualQueries = [
  { sql: 'SELECT * FROM agents WHERE id = ?', params: [1] },
  { sql: 'SELECT * FROM agents WHERE id = ?', params: [2] },
  { sql: 'SELECT * FROM agents WHERE id = ?', params: [3] },
]

const batchQuery = createBatchQuery(individualQueries)
if (batchQuery) {
  const results = await executeBatchQuery(batchQuery)
  console.log('Batch results:', results)
}

// Eager load related entities
const agents = [
  { id: 1, wallet_id: 100 },
  { id: 2, wallet_id: 101 },
  { id: 3, wallet_id: 102 },
]

const agentsWithWallets = await eagerLoad(agents, 'wallet_id', async walletIds => {
  const db = await getDatabase()
  const stmt = db.prepare('SELECT * FROM wallets WHERE id IN (...)')
  return stmt.all(walletIds)
})
```

---

## 5. Enhanced Database Module / 增强的数据库模块

### 5.1 Features / 功能

- **All-in-one integration**: Integrates connection pool, slow query logging, and pagination
- **Automatic performance monitoring**: Logs all queries with execution times
- **Query caching**: Optional query caching layer
- **Health checks**: Built-in health check endpoints
- **Performance reports**: Comprehensive performance reporting

**一体化集成**：集成连接池、慢查询日志和分页
**自动性能监控**：记录所有查询及其执行时间
**查询缓存**：可选的查询缓存层
**健康检查**：内置健康检查端点
**性能报告**：全面的性能报告

### 5.2 Usage / 使用方法

```typescript
import {
  initializeEnhancedDatabase,
  getEnhancedDatabase,
  getDatabaseHealth,
  getPerformanceReport,
  clearPerformanceMetrics,
} from '@/lib/db/enhanced-db'

// Initialize enhanced database
await initializeEnhancedDatabase({
  databasePath: '/path/to/database.sqlite',
  poolConfig: {
    maxConnections: 10,
    minConnections: 2,
  },
  enableSlowQueryLogging: true,
  slowQueryThreshold: 100,
  enableCaching: true,
  defaultCacheTTL: 30000,
})

// Get enhanced database connection
const db = await getEnhancedDatabase()

// Use like normal database connection
const agents = await db.query('SELECT * FROM agents WHERE status = ?', ['active'])

// Use pagination
const paginatedAgents = await db.paginate('SELECT * FROM agents', { page: 1, limit: 20 })

// Get slow queries
const slowQueries = db.getSlowQueries?.()
console.log('Slow queries:', slowQueries)

// Get performance metrics
const metrics = db.getMetrics?.()
console.log('Metrics:', metrics)

// Get database health
const health = await getDatabaseHealth()
console.log('Health:', health)

// Get performance report
const report = await getPerformanceReport()
console.log(report)

// Clear metrics
clearPerformanceMetrics()
```

---

## 6. API Endpoints / API 端点

### 6.1 GET /api/database/optimize/health

Get comprehensive database health report.

```bash
curl http://localhost:3000/api/database/optimize/health
```

**Response:**

```json
{
  "success": true,
  "data": {
    "pool": {
      "totalConnections": 10,
      "activeConnections": 2,
      "idleConnections": 8,
      "waitingRequests": 0,
      "totalAcquires": 1000,
      "totalReleases": 998,
      "totalErrors": 0,
      "avgAcquireTime": 1.5
    },
    "performance": {
      "totalQueries": 5000,
      "totalExecutionTime": 25000,
      "avgExecutionTime": 5.0,
      "slowQueryCount": 50,
      "verySlowQueryCount": 5
    },
    "report": "...",
    "dbAnalysis": {
      "slowQueries": [...],
      "tableAnalyses": [...],
      "recommendations": [...],
      "databaseSize": {...},
      "missingIndexes": [...]
    },
    "timestamp": "2026-03-19T16:00:00.000Z"
  }
}
```

### 6.2 POST /api/database/optimize

Run database optimization operations.

```bash
curl -X POST http://localhost:3000/api/database/optimize \
  -H "Content-Type: application/json" \
  -d '{"operations": ["vacuum", "analyze", "clear_metrics"]}'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "results": [
      { "operation": "vacuum", "success": true, "message": "Database vacuumed successfully" },
      { "operation": "analyze", "success": true, "message": "Database analyzed successfully" },
      { "operation": "clear_metrics", "success": true, "message": "Performance metrics cleared" }
    ],
    "timestamp": "2026-03-19T16:00:00.000Z"
  }
}
```

### 6.3 PUT /api/database/optimize/config

Update database pool configuration.

```bash
curl -X PUT http://localhost:3000/api/database/optimize/config \
  -H "Content-Type: application/json" \
  -d '{"config": {"maxConnections": 20, "minConnections": 5}}'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Pool configuration update requires restart. Current config:",
    "oldStats": {...},
    "newConfig": {...},
    "timestamp": "2026-03-19T16:00:00.000Z"
  }
}
```

---

## 7. Best Practices / 最佳实践

### 7.1 Connection Pool / 连接池

- **Always release connections**: Always release connections back to the pool after use
- **Set appropriate pool size**: Configure pool size based on your application's concurrency needs
- **Monitor pool statistics**: Regularly check pool statistics for performance issues
- **Use health checks**: Enable health checks to detect connection issues early

**始终释放连接**：使用后始终将连接释放回池
**设置适当的池大小**：根据应用程序的并发需求配置池大小
**监控池统计**：定期检查池统计信息以发现性能问题
**使用健康检查**：启用健康检查以早期发现连接问题

### 7.2 Query Optimization / 查询优化

- **Use indexes**: Ensure frequently queried columns are indexed
- **Avoid N+1 queries**: Use eager loading or batch queries instead of multiple similar queries
- **Use pagination**: Always use pagination for list queries
- **Cache frequently accessed data**: Use query caching for frequently accessed, rarely changing data
- **Monitor slow queries**: Regularly check slow query logs for optimization opportunities

**使用索引**：确保频繁查询的列已索引
**避免 N+1 查询**：使用急切加载或批量查询代替多个类似查询
**使用分页**：始终为列表查询使用分页
**缓存频繁访问的数据**：对频繁访问且很少变化的数据使用查询缓存
**监控慢查询**：定期检查慢查询日志以发现优化机会

### 7.3 Pagination / 分页

- **Use cursor pagination for large datasets**: Cursor pagination is more efficient for large datasets
- **Set reasonable limits**: Set appropriate default and maximum limits
- **Avoid deep pagination**: Deep pagination (offset > 10000) can be slow; use cursor pagination instead

**对大数据集使用游标分页**：游标分页对大数据集更高效
**设置合理的限制**：设置适当的默认和最大限制
**避免深层分页**：深层分页（偏移量 > 10000）可能很慢；改用游标分页

### 7.4 N+1 Query Prevention / N+1 查询预防

- **Enable detection**: Enable N+1 query detection in development
- **Use eager loading**: Use eager loading for related entities
- **Batch queries**: Use batch queries for multiple similar operations
- **Review suggestions**: Review and act on N+1 query suggestions

**启用检测**：在开发环境中启用 N+1 查询检测
**使用急切加载**：对相关实体使用急切加载
**批量查询**：对多个类似操作使用批量查询
**审查建议**：审查并采取 N+1 查询建议

---

## 8. Environment Variables / 环境变量

```bash
# Database Configuration
DATABASE_PATH=/tmp/7zi-database.sqlite

# Connection Pool Configuration
DB_POOL_MAX_CONNECTIONS=10
DB_POOL_MIN_CONNECTIONS=2
DB_POOL_CONNECTION_TIMEOUT=30000
DB_POOL_IDLE_TIMEOUT=300000
DB_POOL_HEALTH_CHECK_INTERVAL=60000

# Slow Query Logging
ENABLE_SLOW_QUERY_LOGGING=true
SLOW_QUERY_THRESHOLD=100
VERY_SLOW_QUERY_THRESHOLD=1000

# Query Caching
ENABLE_QUERY_CACHING=false
DEFAULT_CACHE_TTL=30000

# Pagination
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
```

---

## 9. Monitoring / 监控

### 9.1 Health Checks / 健康检查

Regular health checks should be performed:

- **Connection pool health**: Monitor pool statistics and health check results
- **Query performance**: Monitor slow query rate and average execution time
- **Database size**: Monitor database size and fragmentation

定期应进行健康检查：

**连接池健康**：监控池统计信息和健康检查结果
**查询性能**：监控慢查询率和平均执行时间
**数据库大小**：监控数据库大小和碎片

### 9.2 Alerts / 警报

Set up alerts for:

- **High slow query rate**: >10% of queries are slow
- **High average execution time**: >500ms average
- **Connection pool exhaustion**: No available connections
- **Database size**: Database size exceeds threshold

为以下情况设置警报：

**高慢查询率**：>10% 的查询是慢查询
**高平均执行时间**：平均 >500ms
**连接池耗尽**：无可用连接
**数据库大小**：数据库大小超过阈值

---

## 10. Troubleshooting / 故障排除

### 10.1 Connection Pool Issues / 连接池问题

**Problem**: Connection timeout
**Solution**: Increase `connectionTimeout` or `maxConnections`

**问题**：连接超时
**解决方案**：增加 `connectionTimeout` 或 `maxConnections`

**Problem**: Too many idle connections
**Solution**: Reduce `idleTimeout` or `maxConnections`

**问题**：空闲连接过多
**解决方案**：减少 `idleTimeout` 或 `maxConnections`

### 10.2 Slow Query Issues / 慢查询问题

**Problem**: Many slow queries detected
**Solution**: Add indexes, optimize queries, or use eager loading

**问题**：检测到许多慢查询
**解决方案**：添加索引、优化查询或使用急切加载

**Problem**: N+1 queries detected
**Solution**: Use batch queries or eager loading

**问题**：检测到 N+1 查询
**解决方案**：使用批量查询或急切加载

---

## 11. Conclusion / 结论

This database optimization suite provides comprehensive tools for monitoring, analyzing, and optimizing database performance in the 7zi-project. By implementing these features, you can:

- Improve query performance through connection pooling
- Detect and optimize slow queries
- Prevent N+1 query problems
- Efficiently paginate large datasets
- Monitor database health in real-time

此数据库优化套件为监控、分析和优化 7zi-project 中的数据库性能提供了全面的工具。通过实现这些功能，您可以：

- 通过连接池提高查询性能
- 检测和优化慢查询
- 防止 N+1 查询问题
- 高效分页大数据集
- 实时监控数据库健康

For questions or issues, please refer to the code documentation or create an issue in the project repository.

如有问题或疑问，请参阅代码文档或在项目仓库中创建问题。
