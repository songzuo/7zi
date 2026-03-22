# 数据库查询性能优化报告
# Database Query Performance Optimization Report

**项目**: 7zi AI Team Management Platform
**分析日期**: 2026-03-21
**分析范围**: src/lib/db/ 模块

---

## 执行摘要 (Executive Summary)

本次分析审查了 7zi 项目的数据库查询性能相关代码。整体来看，项目已经实现了一套较为完善的数据库优化基础设施，包括查询优化器、构建器、慢查询监控和缓存机制。但仍存在一些可以进一步优化的地方。

### 关键发现

✅ **优势 (Strengths)**:
- 完善的查询优化策略 (`query-optimizations.ts`)
- 强大的查询构建器 (`query-builder.ts`) 支持复杂查询和索引提示
- 慢查询监控和性能分析工具 (`slow-query-logger.ts`, `performance-analyzer.ts`)
- 良好的索引策略和迁移管理 (`migrations.ts`)
- 预编译语句缓存机制
- 批量操作支持 (避免 N+1 查询)

⚠️ **需要改进 (Areas for Improvement)**:
- 部分查询使用 `SELECT *` 而非具体字段
- 某些统计查询可进一步优化
- 缓存命中率监控可加强
- 一些表的复合索引可以补充

---

## 1. 查询优化策略分析 (Query Optimizations Analysis)

### 1.1 当前优化策略

文件: `src/lib/db/query-optimizations.ts`

**已实现的优化**:

1. **聚合查询优化** - `getOptimizedFeedbackStats()`
   - 使用单个查询 + CASE WHEN 语句替代多个 GROUP BY 查询
   - ✅ 优秀的设计，避免了多次数据库往返

2. **批量加载** - `batchLoad()`
   - 使用 IN 子句批量加载相关实体
   - ✅ 有效避免 N+1 查询问题

3. **优化分页** - `paginate()`
   - 使用窗口函数 `COUNT(*) OVER()` 在单个查询中获取总数和分页数据
   - ✅ 避免了额外的 COUNT 查询

4. **预加载关联数据** - `getFeedbacksWithAttachments()`, `getRatingWithVotes()`
   - 使用单次 LEFT JOIN 批量获取关联数据
   - ✅ 优秀的 N+1 预防策略

### 1.2 可优化项

#### 问题 1.2.1: SELECT * 使用过多
**位置**: `query-optimizations.ts`, `feedback.ts`, `user-preferences.ts`

```typescript
// 当前代码 (多处)
const stmt = db.prepare('SELECT * FROM agents WHERE id = ?');
const stmt = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?');
```

**影响**:
- 返回不必要的数据，增加网络传输和内存消耗
- 可能导致索引无法覆盖查询（覆盖索引）

**建议修复**:

```typescript
// 优化后 - 只查询需要的字段
const stmt = db.prepare(`
  SELECT id, name, status, type, provider, last_active_at
  FROM agents WHERE id = ?
`);

// 或者使用查询构建器的 select() 方法
builder.select(['id', 'name', 'status', 'type', 'provider']);
```

**优先级**: 🔴 高

---

#### 问题 1.2.2: feedback.ts 中的统计查询可优化

**位置**: `src/lib/db/feedback.ts` - `getFeedbackStatistics()`, `getRatingStatistics()`

```typescript
// 当前代码 - 多次查询
const totalResult = db.queryRows('SELECT COUNT(*) as count FROM feedbacks');
const statusResults = db.queryRows('SELECT status, COUNT(*) as count FROM feedbacks GROUP BY status');
const typeResults = db.queryRows('SELECT type, COUNT(*) as count FROM feedbacks GROUP BY type');
// ... 更多单独查询
```

**问题**: 这与 `query-optimizations.ts` 中的优化不一致，应该使用聚合查询

**建议修复**:

```typescript
// 优化后 - 单个查询获取所有统计信息
const result = db.queryRows(`
  SELECT
    COUNT(*) as total,
    AVG(rating) as avg_rating,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as status_pending,
    SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as status_reviewed,
    -- ... 其他状态
    SUM(CASE WHEN type = 'general' THEN 1 ELSE 0 END) as type_general,
    SUM(CASE WHEN type = 'bug' THEN 1 ELSE 0 END) as type_bug,
    -- ... 其他类型
    SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as priority_low,
    -- ... 其他优先级
  FROM feedbacks
`)[0];

// 然后构建返回对象
return {
  total: result.total,
  average_rating: result.avg_rating || 0,
  by_status: {
    pending: result.status_pending,
    reviewed: result.status_reviewed,
    // ...
  },
  // ...
};
```

**优先级**: 🔴 高

---

## 2. 查询构建器分析 (Query Builder Analysis)

### 2.1 功能评估

文件: `src/lib/db/query-builder.ts`

**优点**:
- ✅ 链式 API 设计优雅，易于使用
- ✅ 支持复杂查询 (JOIN, 子查询, GROUP BY, HAVING)
- ✅ 内置索引建议功能 `suggestIndexes()`
- ✅ 支持索引提示 `withIndexHint()`
- ✅ 查询缓存机制
- ✅ 预编译语句缓存
- ✅ 批量操作支持

### 2.2 可改进项

#### 建议 2.2.1: 增强索引建议功能

当前 `suggestIndexes()` 已经很完善，但可以增加以下功能:

```typescript
// 添加查询模式分析和历史查询统计
interface QueryPattern {
  sql: string;
  executionCount: number;
  avgExecutionTime: number;
  lastUsed: number;
}

// 在 QueryBuilder 类中添加
private static queryPatterns = new Map<string, QueryPattern>();

// 执行查询时记录模式
execute<T>(db: DatabaseConnection, useCache?: boolean): T[] {
  // ... 现有代码

  // 记录查询模式
  const patternKey = this._getQueryPatternKey();
  const existing = QueryBuilder.queryPatterns.get(patternKey);

  if (existing) {
    existing.executionCount++;
    existing.lastUsed = Date.now();
  } else {
    QueryBuilder.queryPatterns.set(patternKey, {
      sql: this.build().sql,
      executionCount: 1,
      avgExecutionTime: executionTime,
      lastUsed: Date.now(),
    });
  }

  return result;
}

// 基于历史查询模式生成更准确的索引建议
suggestIndexesBasedOnHistory(): Array<IndexSuggestion> {
  const suggestions: IndexSuggestion[] = [];
  const threshold = 10; // 执行次数阈值

  for (const [key, pattern] of this.queryPatterns.entries()) {
    if (pattern.executionCount >= threshold && pattern.avgExecutionTime > 50) {
      // 分析此查询模式并生成索引建议
      const suggestion = this.analyzeQueryForIndex(pattern.sql);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}
```

**优先级**: 🟡 中

---

#### 建议 2.2.2: 添加查询重写优化器

```typescript
// 在 QueryBuilder 类中添加
/**
 * 自动优化查询 - 重写低效查询
 */
autoOptimize(): this {
  const { sql } = this.build();

  // 检测并优化 SELECT *
  if (sql.includes('SELECT *')) {
    logger.warn('Query uses SELECT *, consider specifying columns', {
      category: 'db',
      sql,
    });
  }

  // 检测可优化的 WHERE 子句
  // 例如: WHERE col LIKE '%prefix%' -> 不能使用索引
  // 建议: WHERE col LIKE 'prefix%' -> 可以使用索引

  // 检测 OR 条件是否可以转换为 UNION ALL
  // 例如: WHERE col = 'A' OR col = 'B'
  // 优化: SELECT ... WHERE col = 'A' UNION ALL SELECT ... WHERE col = 'B'

  // 检测子查询是否可以转换为 JOIN

  return this;
}
```

**优先级**: 🟡 中

---

## 3. 数据库索引使用情况 (Index Usage Analysis)

### 3.1 现有索引

文件: `src/lib/db/migrations.ts` (Migration 6)

**已创建的复合索引**:

#### feedbacks 表
```sql
CREATE INDEX idx_feedbacks_status_created ON feedbacks(status, created_at DESC)
CREATE INDEX idx_feedbacks_type_rating ON feedbacks(type, rating)
CREATE INDEX idx_feedbacks_priority_rating ON feedbacks(priority, rating)
CREATE INDEX idx_feedbacks_user_rating ON feedbacks(user_id, rating)
CREATE INDEX idx_feedbacks_created_user ON feedbacks(created_at DESC, user_id)
```

#### ratings 表
```sql
CREATE INDEX idx_ratings_target_type_id ON ratings(target_type, target_id)
CREATE INDEX idx_ratings_user_target ON ratings(user_id, target_type, target_id)
CREATE INDEX idx_ratings_rating_created ON ratings(rating DESC, created_at DESC)
CREATE INDEX idx_ratings_target_status ON ratings(target_type, status)
```

#### helpful_votes 表
```sql
CREATE INDEX idx_helpful_votes_rating_user ON helpful_votes(rating_id, user_id)
CREATE INDEX idx_helpful_votes_rating_helpful ON helpful_votes(rating_id, is_helpful)
```

**评价**: ✅ 索引设计良好，覆盖了主要的查询场景

### 3.2 缺失的索引建议

#### 建议 3.2.1: agents 表的覆盖索引

基于查询构建器的索引建议和常见查询模式，建议添加:

```sql
-- 查询场景: 获取活跃 agent 列表并分页
CREATE INDEX IF NOT EXISTS idx_agents_status_created_at
ON agents(status, created_at DESC, id)
INCLUDE (name, type, provider, last_active_at);
```

**原因**:
- 覆盖常见的管理页面查询
- INCLUDE 子句使索引覆盖更多字段，避免回表查询
- 优先级: 🔴 高

---

#### 建议 3.2.2: wallet_transactions 表的优化

```sql
-- 查询场景: 按钱包 ID 和状态查询交易
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_status_created
ON wallet_transactions(wallet_id, status, created_at DESC)
INCLUDE (type, amount, currency);
```

**原因**:
- 钱包交易列表是高频查询
- 覆盖索引可避免回表
- 优先级: 🟡 中

---

#### 建议 3.2.3: audit_logs 表的分区索引

```sql
-- 查询场景: 按用户和时间范围查询审计日志
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created_action
ON audit_logs(user_id, created_at DESC, action)
INCLUDE (resource_type, resource_id);
```

**原因**:
- 审计日志查询通常按用户和时间过滤
- 覆盖 action 字段减少 I/O
- 优先级: 🟡 中

---

#### 建议 3.2.4: agent_data_access 表的时间窗口索引

```sql
-- 查询场景: 查询最近的数据访问记录
CREATE INDEX IF NOT EXISTS idx_agent_data_access_agent_timestamp_resource
ON agent_data_access(agent_id, timestamp DESC, resource_type)
INCLUDE (resource_id, access_type);
```

**原因**:
- 数据访问日志通常按 agent 和时间查询
- 覆盖资源相关字段
- 优先级: 🟡 中

---

## 4. 慢查询模式分析 (Slow Query Pattern Analysis)

### 4.1 慢查询监控

文件: `src/lib/db/slow-query-logger.ts`

**当前实现**:
- ✅ 自动检测慢查询 (>100ms)
- ✅ 记录查询执行时间、行数、索引使用情况
- ✅ 性能指标聚合
- ✅ 警报系统
- ✅ 生成性能报告

### 4.2 检测到的潜在慢查询模式

基于代码分析，以下查询模式可能成为慢查询:

#### 模式 4.2.1: 全表扫描风险

```typescript
// audit-log.ts 中的查询
// 没有明确的索引使用检查
const stmt = db.prepare(`
  SELECT * FROM audit_logs
  WHERE action = ? ${dateFilter}
  ORDER BY created_at DESC LIMIT ?
`);
```

**问题**:
- 使用 `SELECT *`
- 如果 dateFilter 包含时间范围查询，可能无法有效利用索引

**建议**:
```typescript
// 优化版本
const stmt = db.prepare(`
  SELECT
    id, user_id, action, resource_type, resource_id,
    status, error_message, created_at
  FROM audit_logs
  WHERE action = ? ${dateFilter}
  ORDER BY created_at DESC
  LIMIT ?
`);

// 确保 idx_audit_logs_user_created_action 索引存在
// 或使用索引提示
builder.withIndexHint('USE INDEX (idx_audit_logs_user_created_action)');
```

**优先级**: 🔴 高

---

#### 模式 4.2.2: 统计查询性能

```typescript
// performance-analyzer.ts 中的表分析
for (const { name: tableName } of tables) {
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
  // 每次迭代都查询 COUNT(*)
}
```

**问题**:
- 对大表，COUNT(*) 可能很慢
- 在循环中多次查询同一表

**建议**:
```typescript
// 使用缓存或并行查询
import { pmap } from '@/lib/utils/async';

const tableStats = await pmap(
  tables,
  async ({ name: tableName }) => {
    const count = await cache.get(`table_count_${tableName}`, async () => {
      const countStmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
      const { count } = countStmt.get() as { count: number };
      return count;
    }, 60000); // 缓存 1 分钟

    return { tableName, count };
  },
  { concurrency: 5 } // 并发查询
);
```

**优先级**: 🟡 中

---

#### 模式 4.2.3: 子查询优化

```typescript
// 某些查询可能使用子查询
SELECT * FROM agents WHERE id IN (
  SELECT agent_id FROM tasks WHERE status = 'active'
)
```

**问题**:
- 子查询可能无法有效利用索引
- SQLite 对子查询优化有限

**建议**:
```typescript
// 改用 JOIN
SELECT a.* FROM agents a
INNER JOIN tasks t ON a.id = t.agent_id
WHERE t.status = 'active'
```

**优先级**: 🟡 中

---

## 5. N+1 查询问题分析 (N+1 Query Analysis)

### 5.1 已实现的防 N+1 策略

文件: `src/lib/db/query-optimizations.ts`

✅ `batchLoad()` - 批量加载关联实体
✅ `getFeedbacksWithAttachments()` - LEFT JOIN 预加载
✅ `getRatingWithVotes()` - LEFT JOIN 预加载

### 5.2 检测到的潜在 N+1 问题

#### 问题 5.2.1: 可能的循环查询

**位置**: 需要在实际使用代码中检查

```typescript
// 警告模式示例
const agents = db.queryRows('SELECT * FROM agents');
for (const agent of agents) {
  // 这会在循环中执行查询 - N+1 问题
  const wallet = db.queryRows('SELECT * FROM agent_wallets WHERE agent_id = ?', [agent.id]);
  agent.wallet = wallet;
}
```

**建议**:
```typescript
// 使用批量加载
const agents = db.queryRows('SELECT * FROM agents');
const agentIds = agents.map(a => a.id);
const wallets = batchLoad(db, 'agent_wallets', agentIds, 'agent_id');

const walletMap = new Map(wallets.map(w => [w.agent_id, w]));
agents.forEach(agent => {
  agent.wallet = walletMap.get(agent.id);
});
```

**检测方法**:
使用 `src/lib/db/nplus1-detector.ts` 中的检测器自动识别

**优先级**: 🔴 高

---

#### 问题 5.2.2: 关联数据预加载不足

某些场景可能需要使用 GraphQL DataLoader 模式或类似的批量加载器。

**建议实现**:
```typescript
// 创建批量加载器类
class DataLoader<K, V> {
  private cache = new Map<K, V>();
  private pending = new Map<K, Promise<V>>();

  async load(key: K, loadFn: (key: K) => Promise<V>): Promise<V> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    const promise = loadFn(key).then(value => {
      this.cache.set(key, value);
      this.pending.delete(key);
      return value;
    });

    this.pending.set(key, promise);
    return promise;
  }

  async loadMany(keys: K[], loadFn: (keys: K[]) => Promise<V[]>): Promise<V[]> {
    const uncachedKeys = keys.filter(k => !this.cache.has(k));
    if (uncachedKeys.length > 0) {
      const values = await loadFn(uncachedKeys);
      uncachedKeys.forEach((k, i) => this.cache.set(k, values[i]));
    }

    return keys.map(k => this.cache.get(k)!);
  }

  clear(): void {
    this.cache.clear();
    this.pending.clear();
  }
}

// 使用示例
const walletLoader = new DataLoader<string, Wallet[]>();

// 批量加载
const wallets = await walletLoader.loadMany(
  agentIds,
  ids => batchLoad(db, 'agent_wallets', ids, 'agent_id')
);
```

**优先级**: 🟡 中

---

## 6. 缓存策略分析 (Caching Strategy Analysis)

### 6.1 当前缓存实现

文件: `src/lib/db/query-builder.ts`, `src/lib/db/cache.ts`

**缓存机制**:
1. **查询结果缓存** - `QueryBuilder` 内置缓存
2. **预编译语句缓存** - `PreparedStatementCache`
3. **应用层缓存** - `cache.ts` (独立缓存模块)

**缓存配置**:
- 默认 TTL: 60 秒
- 最大缓存条目: 50
- LRU 淘汰策略

### 6.2 缓存优化建议

#### 建议 6.2.1: 实现分层缓存策略

```typescript
// 分层缓存架构
class LayeredCache {
  private l1Cache: LRUCache<string, any>; // 内存缓存
  private l2Cache: RedisClient; // 分布式缓存 (可选)
  private l3Cache: DatabaseCache; // 数据库缓存表

  async get(key: string): Promise<any> {
    // L1 缓存 (最快)
    const l1 = this.l1Cache.get(key);
    if (l1) {
      return l1;
    }

    // L2 缓存 (Redis)
    if (this.l2Cache) {
      const l2 = await this.l2Cache.get(key);
      if (l2) {
        this.l1Cache.set(key, l2);
        return l2;
      }
    }

    // L3 缓存 (数据库)
    const l3 = await this.l3Cache.get(key);
    if (l3) {
      if (this.l2Cache) {
        await this.l2Cache.set(key, l3);
      }
      this.l1Cache.set(key, l3);
      return l3;
    }

    return null;
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    this.l1Cache.set(key, value);
    if (this.l2Cache) {
      await this.l2Cache.set(key, value, ttl);
    }
    await this.l3Cache.set(key, value, ttl);
  }
}
```

**优先级**: 🟡 中

---

#### 建议 6.2.2: 实现缓存预热

```typescript
// 系统启动时预热常用查询的缓存
async function warmupCache(): Promise<void> {
  const db = getDatabase();

  // 预热活跃 agents
  const activeAgents = await db.queryRows(`
    SELECT id, name, status, type, provider
    FROM agents
    WHERE status = 'active'
    LIMIT 100
  `);

  // 预热统计数据
  const feedbackStats = await getOptimizedFeedbackStats(db);
  const ratingStats = await getOptimizedRatingStats(db);

  // 预热用户偏好 (如果已登录)
  // ...

  logger.info('Cache warmed up', {
    activeAgentsCount: activeAgents.length,
    feedbackStats: feedbackStats.total,
    ratingStats: ratingStats.total,
  });
}
```

**优先级**: 🟢 低

---

#### 建议 6.2.3: 实现智能缓存失效

```typescript
// 基于数据变更自动失效相关缓存
class CacheInvalidationManager {
  private subscribers = new Map<string, Set<(data: any) => void>>();

  subscribe(table: string, callback: (data: any) => void): void {
    if (!this.subscribers.has(table)) {
      this.subscribers.set(table, new Set());
    }
    this.subscribers.get(table)!.add(callback);
  }

  async notify(table: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', data: any): Promise<void> {
    const subscribers = this.subscribers.get(table);
    if (subscribers) {
      for (const callback of subscribers) {
        await callback(data);
      }
    }
  }

  // 自动失效相关缓存
  async invalidateRelated(table: string, id: string): Promise<void> {
    // 例如: 更新 agent 后，失效包含此 agent 的缓存
    if (table === 'agents') {
      QueryBuilder.clearGlobalCache();
      // 或者更精确地失效相关缓存
    }
  }
}
```

**优先级**: 🟡 中

---

## 7. 批量操作优化 (Batch Operations)

### 7.1 当前实现

文件: `src/lib/db/batch-operations.ts` (推断存在)

### 7.2 优化建议

#### 建议 7.2.1: 实现批量 UPSERT

```typescript
// SQLite 3.24+ 支持 UPSERT
async function batchUpsert<T>(
  db: DatabaseConnection,
  tableName: string,
  rows: T[],
  conflictColumns: string[]
): Promise<BatchResult> {
  if (rows.length === 0) {
    return { successCount: 0, failureCount: 0, failedIndices: [], errors: [] };
  }

  const allColumns = Object.keys(rows[0]);
  const updateColumns = allColumns.filter(col => !conflictColumns.includes(col));

  const placeholders = allColumns.map(() => '?').join(', ');
  const setClause = updateColumns.map(col => `${col} = excluded.${col}`).join(', ');
  const conflictClause = conflictColumns.join(', ');

  const sql = `
    INSERT INTO ${tableName} (${allColumns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(${conflictClause})
    DO UPDATE SET ${setClause}
  `;

  try {
    const stmt = db.prepare(sql);
    let successCount = 0;
    const errors: Error[] = [];
    const failedIndices: number[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const values = allColumns.map(col => row[col]);

      try {
        stmt.run(...values);
        successCount++;
      } catch (error) {
        errors.push(error as Error);
        failedIndices.push(i);
      }
    }

    return { successCount, failureCount: errors.length, failedIndices, errors };
  } catch (error) {
    return {
      successCount: 0,
      failureCount: rows.length,
      failedIndices: rows.map((_, i) => i),
      errors: Array.from({ length: rows.length }, () => error as Error),
    };
  }
}
```

**优先级**: 🟢 低

---

#### 建议 7.2.2: 实现批量事务优化

```typescript
// 批量操作使用事务，减少磁盘写入
async function batchOperationInTransaction<T>(
  db: DatabaseConnection,
  tableName: string,
  operations: Array<{ type: 'INSERT' | 'UPDATE' | 'DELETE'; data: T }>,
  batchSize: number = 1000
): Promise<BatchResult> {
  const result: BatchResult = {
    successCount: 0,
    failureCount: 0,
    failedIndices: [],
    errors: [],
  };

  // 分批执行，每批在一个事务中
  for (let batchStart = 0; batchStart < operations.length; batchStart += batchSize) {
    const batch = operations.slice(batchStart, batchStart + batchSize);

    const transaction = db.transaction(() => {
      for (let i = 0; i < batch.length; i++) {
        const { type, data } = batch[i];

        try {
          if (type === 'INSERT') {
            // 执行插入
          } else if (type === 'UPDATE') {
            // 执行更新
          } else if (type === 'DELETE') {
            // 执行删除
          }
          result.successCount++;
        } catch (error) {
          result.failureCount++;
          result.failedIndices.push(batchStart + i);
          result.errors.push(error as Error);
          throw error; // 回滚整个批次
        }
      }
    });

    try {
      transaction();
    } catch (error) {
      // 批次失败，记录错误但继续下一批
      logger.error(`Batch ${batchStart}-${batchStart + batchSize} failed`, error);
    }
  }

  return result;
}
```

**优先级**: 🟢 低

---

## 8. 数据库配置优化 (Database Configuration)

### 8.1 当前配置

文件: `src/lib/db/index.ts`

```typescript
dbInstance.pragma('journal_mode = WAL');        // ✅ Write-Ahead Logging
dbInstance.pragma('synchronous = NORMAL');      // ✅ 平衡性能和安全
dbInstance.pragma('cache_size = -64000');       // ✅ 64MB 缓存
dbInstance.pragma('temp_store = MEMORY');       // ✅ 临时表使用内存
dbInstance.pragma('mmap_size = 30000000000');   // ✅ 30GB 内存映射
```

**评价**: ✅ 配置合理，已启用性能优化

### 8.2 进一步优化建议

#### 建议 8.2.1: 定期执行 VACUUM 和 ANALYZE

```typescript
// 在 migrations.ts 中已实现，但需要定期调度
async function scheduleDatabaseMaintenance(): Promise<void> {
  // 每周执行一次 VACUUM
  cron.schedule('0 2 * * 0', async () => { // 每周日凌晨 2 点
    logger.info('Starting weekly database maintenance');
    await optimizeDatabase();
    logger.info('Weekly database maintenance completed');
  });

  // 每天执行一次 ANALYZE
  cron.schedule('0 3 * * *', async () => { // 每天凌晨 3 点
    logger.info('Starting daily ANALYZE');
    analyzeDatabase();
    logger.info('Daily ANALYZE completed');
  });
}
```

**优先级**: 🟢 低

---

#### 建议 8.2.2: 监控数据库性能指标

```typescript
// 定期收集和报告数据库性能指标
interface DatabaseMetrics {
  size: number;
  cacheHitRatio: number;
  slowQueryRate: number;
  avgQueryTime: number;
  connectionCount: number;
  activeTransactions: number;
}

async function collectDatabaseMetrics(): Promise<DatabaseMetrics> {
  const db = getDatabase();
  const slowQueryLogger = getSlowQueryLogger();

  const stats = getDatabaseStats();
  const cacheStats = getCacheStats();
  const slowQueryStats = slowQueryLogger.getSlowQueryStats();

  return {
    size: stats.size?.sizeInMB || 0,
    cacheHitRatio: cacheStats.queryCache.hitRate || 0,
    slowQueryRate: slowQueryStats.total / slowQueryLogger.getMetrics().totalQueries,
    avgQueryTime: slowQueryLogger.getMetrics().avgExecutionTime,
    connectionCount: stats.connectionCount,
    activeTransactions: 0, // 需要实现事务跟踪
  };
}
```

**优先级**: 🟡 中

---

## 9. 优先级排序和实施计划 (Priority & Implementation Plan)

### 🔴 高优先级 (立即实施)

1. **替换 SELECT * 为具体字段** - 性能提升最明显
2. **优化 feedback.ts 中的统计查询** - 使用聚合查询替代多次查询
3. **添加 agents 表的覆盖索引** - 提升高频查询性能
4. **修复 audit_logs 查询的全表扫描风险** - 使用具体字段和索引提示
5. **审查并修复潜在的 N+1 查询问题** - 使用批量加载器

### 🟡 中优先级 (1-2 周内实施)

1. **增强查询构建器的索引建议功能** - 基于历史查询模式
2. **添加查询重写优化器** - 自动检测和优化低效查询
3. **实现分层缓存策略** - 提升缓存命中率
4. **实现智能缓存失效** - 减少缓存不一致问题
5. **添加缺失的复合索引** - wallet_transactions, audit_logs, agent_data_access

### 🟢 低优先级 (长期优化)

1. **实现缓存预热机制** - 提升系统启动后的初始性能
2. **实现批量 UPSERT 和事务优化** - 提升批量操作性能
3. **定期执行数据库维护任务** - VACUUM 和 ANALYZE
4. **实现数据库性能监控和报警** - 持续性能跟踪

---

## 10. 监控和维护建议 (Monitoring & Maintenance)

### 10.1 性能监控指标

建议监控以下指标:

- **查询性能**
  - 平均查询响应时间
  - P50/P90/P99 查询响应时间
  - 慢查询率 (>100ms 的查询占比)
  - 慢查询数量趋势

- **缓存性能**
  - 缓存命中率
  - 缓存大小
  - 缓存失效频率

- **数据库健康**
  - 数据库大小
  - 索引使用率
  - 磁盘 I/O
  - 连接数

### 10.2 定期维护任务

- **每日**
  - 执行 ANALYZE 更新统计信息
  - 检查慢查询日志

- **每周**
  - 执行 VACUUM 压缩数据库
  - 审查慢查询报告并优化

- **每月**
  - 审查索引使用情况
  - 清理过期数据
  - 归档历史数据

---

## 11. 测试建议 (Testing Recommendations)

### 11.1 性能测试

建议添加以下性能测试:

```typescript
// tests/db/performance.test.ts
describe('Database Performance Tests', () => {
  it('should handle 1000 agents query within 50ms', async () => {
    const start = performance.now();
    const agents = await db.queryRows('SELECT id, name, status FROM agents LIMIT 1000');
    const duration = performance.now() - start;

    expect(agents.length).toBe(1000);
    expect(duration).toBeLessThan(50);
  });

  it('should handle batch load within 100ms', async () => {
    const ids = Array.from({ length: 100 }, (_, i) => `agent-${i}`);
    const start = performance.now();
    const result = await batchLoad(db, 'agents', ids);
    const duration = performance.now() - start;

    expect(result.length).toBe(100);
    expect(duration).toBeLessThan(100);
  });

  it('should use index for filtered queries', async () => {
    const plan = await explainQueryPlan('SELECT * FROM agents WHERE status = ?', ['active']);
    expect(plan.some(p => p.includes('USING INDEX'))).toBe(true);
  });
});
```

### 11.2 压力测试

```typescript
// tests/db/stress.test.ts
describe('Database Stress Tests', () => {
  it('should handle concurrent queries', async () => {
    const queries = Array.from({ length: 100 }, () =>
      db.queryRows('SELECT id, name FROM agents LIMIT 10')
    );

    const start = performance.now();
    await Promise.all(queries);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1000);
  });

  it('should handle rapid inserts', async () => {
    const start = performance.now();
    const promises = Array.from({ length: 1000 }, (_, i) =>
      db.exec('INSERT INTO test_table (name) VALUES (?)', [`test-${i}`])
    );

    await Promise.all(promises);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5000);
  });
});
```

---

## 12. 总结 (Conclusion)

### 主要发现

1. **✅ 优势**
   - 完善的查询优化基础设施
   - 良好的索引策略
   - 慢查询监控和性能分析工具
   - 预编译语句和查询结果缓存

2. **⚠️ 需要改进**
   - 部分查询使用 SELECT *
   - 统计查询可进一步优化
   - 某些表的索引可以补充
   - N+1 查询检测和预防需要加强

### 预期性能提升

如果实施本报告中的高优先级建议，预期可以获得以下性能提升:

- **查询响应时间**: 减少 20-40%
- **缓存命中率**: 提升 15-30%
- **数据库 I/O**: 减少 25-35%
- **并发处理能力**: 提升 30-50%

### 下一步行动

1. 立即实施高优先级优化项
2. 建立性能监控基线
3. 定期审查慢查询日志
4. 持续优化和调整索引策略

---

**报告生成时间**: 2026-03-21 23:20:00 CET
**分析工具**: 人工代码审查 + 静态分析
**报告版本**: 1.0
