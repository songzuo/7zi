# 数据库优化快速参考
# Database Optimization Quick Reference

## 立即可用的优化功能

### 1. 查询缓存
```typescript
import { cachedQuery, CacheKeyGenerator, CacheInvalidator } from '@/lib/db/cache';

// 缓存查询结果
const user = await cachedQuery(
  CacheKeyGenerator.userKey(userId),
  async () => await getUserById(userId),
  5 * 60 * 1000  // 5分钟
);

// 写入后失效缓存
CacheInvalidator.invalidateAgent(agentId);
CacheInvalidator.invalidateWalletTransactions(agentId);
```

### 2. 批量查询（解决 N+1）
```typescript
// ❌ 避免：循环查询
for (const agentId of agentIds) {
  const wallet = await getWalletByAgentId(agentId); // N 次查询
}

// ✅ 推荐：批量查询
const wallets = await getWalletsByAgentIds(agentIds); // 1 次查询
```

### 3. 性能监控
```typescript
import { getPerformanceLogger } from '@/lib/db/performance-logger';

// 自动监控所有查询
const logger = getPerformanceLogger();
logger.startRequest(requestId);
// ... 执行查询
const detection = logger.endRequest(requestId);

// 生成性能报告
const report = logger.generateReport();
console.log(report);
```

### 4. 分页查询
```typescript
import { QueryBuilder } from '@/lib/db/query-builder';

// 链式 API
const result = await new QueryBuilder()
  .select('*')
  .from('users')
  .where('status = ?', ['active'])
  .orderBy('created_at DESC')
  .paginate({ page: 1, limit: 20 });
```

### 5. 批量操作
```typescript
import { batchInsert, batchUpdate, batchDelete } from '@/lib/db/batch-operations';

// 批量插入
await batchInsert('users', [
  { email: 'user1@example.com', name: 'User 1' },
  { email: 'user2@example.com', name: 'User 2' }
]);

// 批量更新
await batchUpdate('users', 'role = ?', ['admin'], {
  id: ['user1', 'user2', 'user3']
});
```

### 6. 数据库维护
```typescript
import { optimizeDatabase, getDatabaseHealth } from '@/lib/db';

// 完整优化
const result = await optimizeDatabase();

// 健康检查
const health = await getDatabaseHealth();
console.log('Recommendations:', health.recommendations);
```

---

## 常见问题优化模式

### 问题 1：查询慢
**检查清单**:
1. 是否有索引？`EXPLAIN QUERY PLAN SELECT ...`
2. 是否使用了缓存？
3. 是否可以批量查询？
4. 查询字段是否过多？

**解决方案**:
```typescript
// 添加索引 (在 migrations.ts 中)
CREATE INDEX idx_table_column ON table(column);

// 启用缓存
const result = await cachedQuery(key, queryFn, ttl);

// 使用 EXPLAIN
const plan = db.prepare('EXPLAIN QUERY PLAN SELECT ...').all();
console.log(plan);
```

### 问题 2：N+1 查询
**症状**: 页面加载慢，数据库查询次数过多

**检测**:
```typescript
import { getNPlus1Detector } from '@/lib/db/nplus1-detector';

const detector = getNPlus1Detector();
detector.startRequest(requestId);
// ... 执行查询
const detection = detector.endRequest(requestId);
if (detection.detected) {
  console.log('N+1 detected:', detection.suggestions);
}
```

**解决方案**:
```typescript
// 使用批量查询
const items = await getItemsByIds(ids);

// 使用预加载
import { eagerLoad } from '@/lib/db/nplus1-detector';
const itemsWithRelations = await eagerLoad(items, 'userId', loadUsersFn);
```

### 问题 3：数据库过大
**解决方案**:
```typescript
// 定期清理
await cleanupOldData({ daysToKeep: 90 });

// 定期优化
await optimizeDatabase(); // VACUUM + ANALYZE
```

---

## 性能指标

### 查询时间基准
- **极快** (< 10ms): 已优化，缓存命中
- **快** (10-50ms): 正常
- **慢** (50-100ms): 需要关注
- **很慢** (> 100ms): 需要优化
- **不可接受** (> 1000ms): 必须优化

### 缓存命中率
- **优秀** (> 80%): 缓存配置良好
- **良好** (60-80%): 可以接受
- **需改进** (40-60%): 考虑增加缓存
- **差** (< 40%): 缓存策略需要调整

---

## 索引设计原则

### 需要索引的列
1. WHERE 条件中的列
2. JOIN 条件中的列
3. ORDER BY 的列
4. 外键列

### 复合索引顺序
```sql
-- ✅ 正确：等值条件在前，范围条件在后
CREATE INDEX idx_user_status_created ON users(status, created_at DESC);

-- ❌ 错误：范围条件在前
CREATE INDEX idx_user_created_status ON users(created_at DESC, status);
```

### 索引覆盖
```sql
-- ✅ 覆盖索引：包含查询所需的所有字段
CREATE INDEX idx_user_email_name_role ON users(email, name, role);

-- 查询时可以避免回表
SELECT name, role FROM users WHERE email = ?;
```

---

## 环境变量配置

```bash
# 数据库路径
DATABASE_PATH=/tmp/7zi-database.sqlite

# 启用性能日志（开发环境默认开启）
ENABLE_DB_PERFORMANCE_LOGGING=true

# 环境类型
NODE_ENV=development
```

---

## 监控和报告

### API 端点
```
GET  /api/database/health    # 数据库健康检查
POST /api/database/optimize  # 执行数据库优化
GET  /api/performance/report # 性能报告
```

### 日志查看
```typescript
// 查看性能摘要
import { getQueryMetricsSummary } from '@/lib/middleware/db-performance';
const summary = getQueryMetricsSummary();
console.log(summary);

// 查看慢查询
import { getSlowQueryLogger } from '@/lib/db/slow-query-logger';
const stats = getSlowQueryLogger().getSlowQueryStats();
console.log(stats.topQueries);
```

---

## 调试技巧

### 1. 启用详细日志
```typescript
// 开发环境自动启用
NODE_ENV=development

// 或手动启用
ENABLE_DB_PERFORMANCE_LOGGING=true
```

### 2. 查看查询计划
```typescript
const plan = db.prepare('EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = ?').all();
console.log(plan);
// 查看是否使用了索引
```

### 3. 检查索引使用情况
```typescript
// SQLite 查询
const indexes = db.query(`
  SELECT name, tbl_name, sql
  FROM sqlite_master
  WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
`);
console.log(indexes);
```

### 4. 监控缓存状态
```typescript
import { getGlobalCache } from '@/lib/db/cache';
const cache = getGlobalCache();
const stats = cache.getStats();
console.log('Hit rate:', stats.hitRate.toFixed(2) + '%');
console.log('Entries:', stats.entries);
```

---

## 性能优化检查清单

### 新功能开发时
- [ ] 是否使用了批量查询？
- [ ] 是否需要添加索引？
- [ ] 是否可以缓存结果？
- [ ] 是否使用了分页？
- [ ] 是否有性能日志？

### 代码审查时
- [ ] 是否存在 N+1 查询？
- [ ] 是否使用了 SELECT *？
- [ ] 是否有循环查询？
- [ ] 索引是否合理？
- [ ] 缓存 TTL 是否合适？

### 定期维护
- [ ] 每周执行 VACUUM
- [ ] 每天执行 ANALYZE
- [ ] 每月清理过期数据
- [ ] 定期检查慢查询
- [ ] 审查性能报告

---

## 紧急优化步骤

### 如果查询突然变慢

1. **立即检查**:
   ```typescript
   const health = await getDatabaseHealth();
   console.log('Size:', health.size?.sizeInMB, 'MB');
   ```

2. **执行优化**:
   ```typescript
   await optimizeDatabase();
   ```

3. **查看慢查询**:
   ```typescript
   const stats = getSlowQueryLogger().getSlowQueryStats();
   console.log('Slow queries:', stats.topQueries.slice(0, 5));
   ```

4. **添加索引**:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_slow_query_column ON table(column);
   ```

5. **清除缓存**:
   ```typescript
   getGlobalCache().clear();
   ```

---

## 常用命令

### SQLite 命令行
```bash
# 打开数据库
sqlite3 /tmp/7zi-database.sqlite

# 查看表
.tables

# 查看表结构
.schema table_name

# 查看索引
.indexes

# 分析查询
EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = ?;
```

### Node.js 脚本
```typescript
// 运行优化
import { optimizeDatabase } from '@/lib/db';
await optimizeDatabase();

// 检查健康
import { getDatabaseHealth } from '@/lib/db';
const health = await getDatabaseHealth();
console.log(health);

// 清理数据
import { cleanupOldData } from '@/lib/db/migrations';
const result = await cleanupOldData({ daysToKeep: 90 });
console.log('Cleaned:', result.cleanedRows);
```

---

## 最佳实践总结

### ✅ DO
- 使用参数化查询
- 为高频查询添加索引
- 使用批量操作
- 启用查询缓存
- 监控性能指标
- 定期维护数据库

### ❌ DON'T
- 使用 SELECT *
- 循环查询数据库
- 忽略 N+1 问题
- 过度索引
- 忘记失效缓存
- 忽略慢查询警告

---

## 获取帮助

### 文档
- 完整报告: `DATABASE_OPTIMIZATION_SUMMARY.md`
- API 文档: `src/app/api/database/`
- 代码注释: `src/lib/db/*.ts`

### 工具
- 性能监控: `/api/performance/report`
- 健康检查: `/api/database/health`
- 优化工具: `/api/database/optimize`

### 日志
- 性能日志: 查看应用日志中的 `[Performance]`
- 慢查询: 查看应用日志中的 `[Slow Query]`
- N+1 警告: 查看应用日志中的 `[N+1 Detection]`

---

**最后更新**: 2026-03-21
**维护者**: 7zi-project Team
