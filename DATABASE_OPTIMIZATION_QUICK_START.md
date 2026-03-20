# 数据库优化 - 快速开始指南

## 概述

7zi 项目的数据库优化系统包含以下组件：

1. **性能分析器** - 监控和分析查询性能
2. **索引优化** - 为常用查询添加索引
3. **N+1 查询优化** - 使用 JOIN 和批量查询消除 N+1 问题
4. **缓存系统** - 内存缓存提升响应速度
5. **优化 API** - RESTful API 用于管理和监控数据库

---

## 快速开始

### 1. 使用优化的数据仓库

#### 智能体操作

```typescript
import {
  getAgentById,
  getAllAgents,
  getAgentWithTokens,
  getAgentStats,
  getAgentsWithWallets,
} from '@/lib/agents/repository-optimized';

// 获取单个智能体（自动缓存）
const agent = await getAgentById('agent-123');

// 获取所有智能体（支持过滤）
const activeAgents = await getAllAgents({ status: 'active' });

// 获取智能体及其令牌（避免 N+1 查询）
const { agent, tokens } = await getAgentWithTokens('agent-123');

// 获取统计信息（自动缓存）
const stats = await getAgentStats();

// 获取智能体列表及其钱包（单次 JOIN 查询）
const agentsWithWallets = await getAgentsWithWallets({ status: 'active', limit: 20 });
```

#### 钱包操作

```typescript
import {
  getWalletByAgentId,
  getTransactions,
  getWalletStats,
  getWalletWithRecentTransactions,
  deposit,
  withdraw,
  transfer,
} from '@/lib/agents/wallet-repository-optimized';

// 获取钱包（自动缓存）
const wallet = await getWalletByAgentId('agent-123');

// 获取交易记录（自动缓存）
const transactions = await getTransactions('agent-123', {
  type: 'deposit',
  limit: 20,
});

// 获取钱包统计（自动缓存）
const stats = await getWalletStats('agent-123');

// 获取钱包及最近交易（单次查询）
const { wallet, recentTransactions } = await getWalletWithRecentTransactions(
  'agent-123',
  10
);

// 存款（自动失效相关缓存）
await deposit('agent-123', 100, '充值');

// 转账（自动失效相关缓存）
await transfer('agent-123', 'agent-456', 50, '转账');
```

### 2. 手动缓存控制

```typescript
import {
  cachedQuery,
  CacheKeyGenerator,
  CacheInvalidator,
  getCacheStats,
} from '@/lib/db/cache';

// 使用缓存包装查询
const result = await cachedQuery(
  'my:custom:key',
  async () => {
    // 这里执行你的数据库查询
    return await fetchSomethingFromDB();
  },
  5 * 60 * 1000 // TTL: 5分钟
);

// 生成标准缓存键
const agentKey = CacheKeyGenerator.agentKey('agent-123');
const listKey = CacheKeyGenerator.agentsListKey({ status: 'active' });

// 失效缓存
CacheInvalidator.invalidateAgent('agent-123');
CacheInvalidator.invalidateWalletTransactions('agent-123');

// 获取缓存统计
const stats = getCacheStats();
console.log(`命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
console.log(`条目数: ${stats.entries}`);
console.log(`内存使用: ${(stats.totalSize / (1024 * 1024)).toFixed(2)}MB`);
```

### 3. 使用优化 API

#### 检查数据库健康状态

```bash
curl http://localhost:3000/api/database/health
```

响应示例：

```json
{
  "success": true,
  "health": "healthy",
  "healthScore": 95.5,
  "connection": {
    "connected": true,
    "isOpen": true
  },
  "cache": {
    "hits": 15420,
    "misses": 856,
    "hitRatePercent": 94.7,
    "totalSizeMB": 15.2,
    "status": "good"
  },
  "recommendations": []
}
```

#### 获取优化报告

```bash
curl http://localhost:3000/api/database/optimize
```

#### 执行优化操作

```bash
# 运行所有优化
curl -X POST http://localhost:3000/api/database/optimize \
  -H "Content-Type: application/json" \
  -d '{"actions": []}'

# 只添加索引
curl -X POST http://localhost:3000/api/database/optimize \
  -H "Content-Type: application/json" \
  -d '{"actions": ["add-indexes"]}'

# 清理旧数据并压缩数据库
curl -X POST http://localhost:3000/api/database/optimize \
  -H "Content-Type: application/json" \
  -d '{"actions": ["cleanup", "vacuum"], "daysToKeep": 90}'
```

---

## 性能监控

### 使用性能分析器

```typescript
import {
  executeQueryWithMetrics,
  analyzeSlowQueries,
  analyzeTables,
  generatePerformanceReport,
  explainQueryPlan,
} from '@/lib/db/performance-analyzer';

// 执行查询并获取性能指标
const { result, metrics } = await executeQueryWithMetrics(
  'SELECT * FROM agents WHERE status = ?',
  ['active']
);
console.log(`查询时间: ${metrics.executionTime}ms`);
console.log(`返回行数: ${metrics.rowsReturned}`);

// 分析慢查询
const slowQueries = await analyzeSlowQueries(50); // 50ms 阈值
for (const sq of slowQueries) {
  console.log(`慢查询: ${sq.sql}`);
  console.log(`执行时间: ${sq.executionTime}ms`);
  console.log(`建议索引: ${sq.suggestedIndex}`);
}

// 分析表结构
const tables = await analyzeTables();
for (const table of tables) {
  console.log(`表: ${table.name}`);
  console.log(`  行数: ${table.rowCount}`);
  console.log(`  索引数: ${table.indexes.length}`);
  console.log(`  建议: ${table.suggestions.join(', ')}`);
}

// 生成完整性能报告
const report = await generatePerformanceReport();
console.log('数据库大小:', report.databaseSize.sizeInMB, 'MB');
console.log('慢查询数量:', report.slowQueries.length);
console.log('缺失索引数量:', report.missingIndexes.length);

// 分析特定查询的执行计划
const plan = await explainQueryPlan(
  'SELECT * FROM agents WHERE status = ? AND provider = ?',
  ['active', 'openai']
);
console.log('执行计划:', plan);
```

---

## 应用集成

### 在 Next.js 应用中初始化

在 `src/app/layout.tsx` 或 `src/app/api/[...]/route.ts` 中：

```typescript
import { initializeDatabaseOptimization } from '@/lib/db/optimization-init';

// 在应用启动时初始化
if (typeof window === 'undefined') {
  initializeDatabaseOptimization().catch(console.error);
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

### 在 API 路由中使用

```typescript
import { NextResponse } from 'next/server';
import {
  getAllAgents,
  getAgentStats,
} from '@/lib/agents/repository-optimized';

export async function GET() {
  // 获取所有活跃智能体（自动缓存）
  const agents = await getAllAgents({ status: 'active' });

  // 获取统计信息（自动缓存）
  const stats = await getAgentStats();

  return NextResponse.json({
    agents,
    stats,
    // 响应会自动被缓存，提升后续请求速度
  });
}
```

### 在 React 组件中使用

```typescript
'use client';

import { useEffect, useState } from 'react';
import {
  getAllAgents,
  getAgentStats,
} from '@/lib/agents/repository-optimized';

export default function AgentsList() {
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function loadData() {
      // 这些调用会使用缓存，避免重复查询数据库
      const agentsData = await getAllAgents({ status: 'active' });
      const statsData = await getAgentStats();

      setAgents(agentsData);
      setStats(statsData);
    }

    loadData();
  }, []);

  return (
    <div>
      <h1>Active Agents</h1>
      {stats && <p>Total: {stats.total}</p>}
      <ul>
        {agents.map(agent => (
          <li key={agent.id}>{agent.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 维护建议

### 定期优化

建议创建一个定期运行的 cron 任务来维护数据库：

```typescript
// scripts/db-maintenance.ts
import { optimizeDatabase } from '@/lib/db/migrations';
import { CacheInvalidator } from '@/lib/db/cache';

async function runWeeklyMaintenance() {
  console.log('Starting weekly database maintenance...');

  // 1. 运行数据库优化
  const result = await optimizeDatabase();
  console.log('Optimization completed:', result);

  // 2. 清空缓存（可选）
  CacheInvalidator.clearAll();
  console.log('Cache cleared');

  console.log('Weekly maintenance completed');
}

// 导出为可执行脚本
if (require.main === module) {
  runWeeklyMaintenance()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Maintenance failed:', error);
      process.exit(1);
    });
}
```

### 监控指标

关键监控指标：

1. **缓存命中率**: 应该保持在 70% 以上
2. **慢查询数量**: 应该尽量为 0
3. **数据库大小**: 超过 500MB 时需要清理
4. **碎片率**: 超过 10% 时需要运行 VACUUM
5. **查询响应时间**: 单次查询应该 < 100ms

### 告警设置

建议设置以下告警：

- 缓存命中率 < 60%
- 慢查询数量 > 10/天
- 数据库大小 > 1GB
- 碎片率 > 20%

---

## 故障排查

### 缓存未命中

如果缓存命中率低：

1. 检查缓存 TTL 是否太短
2. 检查缓存清理频率是否太高
3. 考虑预热常用数据
4. 检查是否有大量不同的查询模式

### 慢查询问题

如果发现慢查询：

1. 使用 `explainQueryPlan` 分析执行计划
2. 根据建议添加索引
3. 检查是否可以使用 JOIN 代替 N+1 查询
4. 考虑使用缓存

### 内存使用过高

如果缓存内存使用过高：

1. 检查缓存配置
2. 增加 TTL 或减少缓存条目数
3. 清理不必要的缓存
4. 考虑使用外部缓存系统（如 Redis）

---

## 最佳实践

### 1. 缓存策略

- **读取频繁的数据**: 使用较长 TTL（5-10 分钟）
- **经常变化的数据**: 使用较短 TTL（1-3 分钟）或立即失效
- **统计信息**: 使用较长 TTL（5-10 分钟）
- **用户特定数据**: 使用较短 TTL（1-2 分钟）

### 2. 查询优化

- 优先使用索引字段进行过滤
- 避免使用 `SELECT *`，只查询需要的字段
- 使用 JOIN 代替多次单独查询
- 使用 GROUP BY 和聚合函数代替多次查询

### 3. 数据库维护

- 定期运行 `VACUUM` 回收空间
- 定期运行 `ANALYZE` 更新统计信息
- 定期清理旧数据
- 定期检查索引使用情况

---

## 支持与反馈

如有问题或建议，请参考：

- [完整优化文档](./DATABASE_OPTIMIZATION.md)
- [性能分析器 API](../src/lib/db/performance-analyzer.ts)
- [缓存系统 API](../src/lib/db/cache.ts)

---

## 更新日志

### 2026-03-18
- 初始版本发布
- 实现性能分析器
- 添加索引优化
- 实现 N+1 查询优化
- 实现缓存系统
- 添加优化 API
