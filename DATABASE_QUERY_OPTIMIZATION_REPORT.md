# 数据库查询优化审查报告

**项目**: 7zi AI Team Management Platform
**审查日期**: 2026-03-20
**数据库**: SQLite (better-sqlite3)
**ORM**: Direct SQL queries with helper utilities

---

## 执行摘要

本报告对 7zi 项目的数据库查询进行了全面审查。项目使用了 **better-sqlite3** 直接操作数据库，而不是 Prisma ORM。项目已经实现了大量的查询优化基础设施，包括查询构建器、批量操作、N+1 检测、性能分析器和缓存系统。

### 关键发现

✅ **优点**:
- 完善的索引策略（包含单列索引和复合索引）
- 实现了 N+1 查询检测工具
- 批量操作支持
- 查询性能分析和慢查询日志
- 查询缓存机制
- 连接池管理

⚠️ **需要改进**:
- 备份 API 中的潜在 N+1 查询问题
- 部分查询使用了 `SELECT *` 而非指定字段
- 缺少查询结果分页限制

---

## 1. 查询模式分析

### 1.1 发现的数据库查询

项目使用直接 SQL 查询（better-sqlite3），主要查询分布在以下模块：

#### 核心模块
- **`src/lib/agents/repository.ts`** - 智能体数据访问
- **`src/lib/agents/wallet-repository.ts`** - 钱包和交易
- **`src/lib/auth/repository.ts`** - 用户认证
- **`src/lib/permissions/repository.ts`** - 权限管理

#### API 路由
- **`src/app/api/backup/route.ts`** - 数据库备份
- **`src/app/api/database/health/route.ts`** - 健康检查

---

## 2. N+1 查询问题检测

### 🔴 问题 1: 备份 API 中的循环查询

**位置**: `src/app/api/backup/route.ts:68-78`

```typescript
for (const table of tables) {
  const tableData = await db.query(`SELECT * FROM ${table}`);
  backupData[table] = Array.isArray(tableData) ? tableData : [];

  const countResult = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
  recordCounts[table] = Array.isArray(countResult) && countResult[0]
    ? (countResult[0] as CountResult).count
    : 0;
}
```

**问题描述**:
- 对每个表执行两次查询（一次 `SELECT *`，一次 `COUNT`）
- 如果有 N 个表，执行 2N 次查询
- `SELECT *` 会获取所有字段，可能包含不必要的数据

**影响**:
- 中等 - 备份操作不是高频操作，但仍可优化
- 内存占用高 - 大表会消耗大量内存

---

## 3. 索引审查

### ✅ 已实现的优秀索引策略

#### agents 表
```sql
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_provider ON agents(provider);
CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_agents_last_active ON agents(last_active_at DESC);
CREATE INDEX idx_agents_status_provider ON agents(status, provider); -- 复合索引
```

#### agent_tokens 表
```sql
CREATE INDEX idx_agent_tokens_agent_id ON agent_tokens(agent_id);
CREATE INDEX idx_agent_tokens_token ON agent_tokens(token); -- UNIQUE
CREATE INDEX idx_agent_tokens_expires ON agent_tokens(expires_at);
```

#### agent_data_access 表
```sql
CREATE INDEX idx_agent_data_access_agent_id ON agent_data_access(agent_id);
CREATE INDEX idx_agent_data_access_timestamp ON agent_data_access(timestamp DESC);
CREATE INDEX idx_agent_data_access_agent_timestamp ON agent_data_access(agent_id, timestamp DESC); -- 复合索引
CREATE INDEX idx_agent_data_access_resource ON agent_data_access(resource_type, resource_id); -- 复合索引
```

#### wallet_transactions 表
```sql
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX idx_wallet_transactions_wallet_status ON wallet_transactions(wallet_id, status); -- 复合索引
CREATE INDEX idx_wallet_transactions_wallet_created ON wallet_transactions(wallet_id, created_at DESC); -- 复合索引
CREATE INDEX idx_wallet_transactions_type_status ON wallet_transactions(type, status); -- 复合索引
```

### ✅ 评估
索引策略**非常完善**，包含了：
- 单列索引覆盖常见过滤条件
- 复合索引覆盖常见查询组合
- 降序索引用于时间排序
- 没有发现明显的缺失索引

---

## 4. 字段选择审查

### 🔴 问题 2: SELECT * 使用

**位置**: `src/app/api/backup/route.ts:70`

```typescript
const tableData = await db.query(`SELECT * FROM ${table}`);
```

**问题**:
- 备份时获取所有字段，可能包含敏感数据（如 `api_key`, `password`）
- 没有字段过滤，可能导出大量不必要的数据

**建议**: 明确列出需要导出的字段，排除敏感字段

### ✅ 其他查询
大部分 repository 中的查询使用了明确的字段选择，例如：
- `SELECT * FROM agents WHERE id = ?` - 合理（单条记录）
- `SELECT id, name, description, type, provider...` - 部分查询已优化

---

## 5. 缺少分页限制

### 🔴 问题 3: 无限制查询

**位置**: 多处

```typescript
// src/lib/auth/repository.ts: getAllUsers()
const stmt = db.prepare(sql);
const rows = stmt.all(...params) as unknown as Record<string, unknown>[];

// src/lib/permissions/repository.ts: getAllRoles()
const stmt = db.prepare('SELECT * FROM roles ORDER BY name ASC');
const rows = stmt.all() as Array<Record<string, unknown>>;
```

**问题**:
- `getAllUsers()`, `getAllRoles()` 等函数没有默认分页限制
- 可能返回大量数据，导致内存和性能问题

**建议**:
- 添加默认分页限制（如 `LIMIT 100`）
- 要求调用者显式传递分页参数以获取更多数据

---

## 6. 优化建议和实现

### 优化 1: 修复备份 API 的 N+1 查询 ✅

**文件**: `src/app/api/backup/route.ts`

**优化前**:
```typescript
for (const table of tables) {
  const tableData = await db.query(`SELECT * FROM ${table}`);
  backupData[table] = Array.isArray(tableData) ? tableData : [];

  const countResult = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
  recordCounts[table] = Array.isArray(countResult) && countResult[0]
    ? (countResult[0] as CountResult).count
    : 0;
}
```

**优化后**:
```typescript
// 使用单次查询获取表信息和行数
const tablesInfo = db.prepare(`
  SELECT
    name,
    (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=t.name) as row_count
  FROM sqlite_master t
  WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
`).all() as Array<{ name: string; row_count: number }>;

// 定义敏感字段黑名单（不备份这些字段）
const SENSITIVE_FIELDS = ['password', 'api_key', 'token', 'refresh_token'];

for (const tableInfo of tablesInfo) {
  const { name: table, row_count } = tableInfo;

  // 动态获取表结构，排除敏感字段
  const pragma = db.prepare(`PRAGMA table_info(${table})`);
  const columns = pragma.all() as Array<{ name: string }>;
  const safeColumns = columns
    .map(c => c.name)
    .filter(col => !SENSITIVE_FIELDS.includes(col));

  if (safeColumns.length === 0) {
    backupData[table] = [];
    recordCounts[table] = row_count;
    continue;
  }

  const columnsStr = safeColumns.join(', ');
  const tableData = db.query(`SELECT ${columnsStr} FROM ${table}`);
  backupData[table] = Array.isArray(tableData) ? tableData : [];
  recordCounts[table] = row_count;
}
```

**改进**:
- 消除了循环中的 COUNT 查询
- 自动排除敏感字段
- 减少查询次数从 2N 到 N + 1（初始查询 + N 次数据查询）

---

### 优化 2: 添加默认分页限制 ✅

**文件**: `src/lib/auth/repository.ts`

**优化前**:
```typescript
export async function getAllUsers(options?: {
  status?: UserStatus;
  role?: UserRole;
}): Promise<User[]> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  let sql = 'SELECT * FROM users';
  const conditions: string[] = [];
  const params: string[] = [];

  if (options?.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }
  if (options?.role) {
    conditions.push('role = ?');
    params.push(options.role);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY created_at DESC';

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as unknown as Record<string, unknown>[];

  return rows.map(mapRowToUser);
}
```

**优化后**:
```typescript
export async function getAllUsers(options?: {
  status?: UserStatus;
  role?: UserRole;
  limit?: number;
  offset?: number;
}): Promise<User[]> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  // 默认分页限制
  const defaultLimit = 100;
  const maxLimit = 1000;
  const limit = Math.min(options?.limit ?? defaultLimit, maxLimit);
  const offset = options?.offset ?? 0;

  let sql = 'SELECT * FROM users';
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }
  if (options?.role) {
    conditions.push('role = ?');
    params.push(options.role);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as unknown as Record<string, unknown>[];

  return rows.map(mapRowToUser);
}

// 新增：获取用户总数（用于分页）
export async function getUsersCount(options?: {
  status?: UserStatus;
  role?: UserRole;
}): Promise<number> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  let sql = 'SELECT COUNT(*) as count FROM users';
  const conditions: string[] = [];
  const params: string[] = [];

  if (options?.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }
  if (options?.role) {
    conditions.push('role = ?');
    params.push(options.role);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  const stmt = db.prepare(sql);
  const result = stmt.get(...params) as { count: number };
  return result.count;
}
```

**改进**:
- 添加默认分页限制（100 条记录）
- 设置最大限制（1000 条）防止滥用
- 添加 `getUsersCount()` 支持分页 UI

---

### 优化 3: 使用批量查询优化钱包交易查询 ✅

**文件**: `src/lib/agents/wallet-repository.ts`

**场景**: 当需要获取多个钱包的交易记录时

**新增函数**:
```typescript
import { batchQuery } from '../db/batch-operations';

/**
 * 批量获取多个钱包的交易记录
 * 优化: 使用 UNION ALL 替代多个单独查询
 */
export async function getWalletTransactionsBatch(
  walletIds: string[],
  options?: {
    limit?: number;
    status?: TransactionStatus;
    type?: TransactionType;
  }
): Promise<Map<string, WalletTransaction[]>> {
  if (walletIds.length === 0) {
    return new Map();
  }

  const db = await getDatabaseAsync();
  await initializeWalletTables();

  // 构建批量查询
  const placeholders = walletIds.map(() => '?').join(', ');
  let sql = `
    SELECT * FROM wallet_transactions
    WHERE wallet_id IN (${placeholders})
  `;

  const params: (string | number)[] = [...walletIds];

  if (options?.status) {
    sql += ' AND status = ?';
    params.push(options.status);
  }
  if (options?.type) {
    sql += ' AND type = ?';
    params.push(options.type);
  }

  sql += ' ORDER BY created_at DESC';

  if (options?.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as Array<Record<string, unknown>>;

  // 按钱包 ID 分组
  const result = new Map<string, WalletTransaction[]>();
  for (const walletId of walletIds) {
    result.set(walletId, []);
  }

  for (const row of rows) {
    const transaction = mapRowToTransaction(row);
    const walletId = row.wallet_id as string;
    const transactions = result.get(walletId) || [];
    transactions.push(transaction);
    result.set(walletId, transactions);
  }

  return result;
}
```

**使用场景**:
```typescript
// API 中获取多个智能体的钱包交易
const agents = await getAllAgents();
const walletIds = agents
  .map(a => a.id)
  .filter(id => id); // 获取所有 agent ID

const transactions = await getWalletTransactionsBatch(walletIds, {
  limit: 10,
  status: TransactionStatus.COMPLETED
});

// 结果: Map<walletId, WalletTransaction[]>
```

**改进**:
- 从 N 次查询减少到 1 次查询
- 使用 `IN` 子句批量获取数据
- 结果按钱包 ID 分组，便于使用

---

## 7. 性能监控建议

### 已有工具（无需额外实现）

项目已经实现了完整的性能监控基础设施：

#### 7.1 N+1 查询检测
```typescript
import { getNPlus1Detector } from '@/lib/db/nplus1-detector';

// 在 API 路由中使用
const detector = getNPlus1Detector();
detector.startRequest(requestId);
// ... 执行查询 ...
const detection = detector.endRequest(requestId);

if (detection.detected) {
  console.warn('N+1 query detected:', detection.patterns);
}
```

#### 7.2 慢查询日志
```typescript
import { getSlowQueryLogger } from '@/lib/db/slow-query-logger';

const logger = getSlowQueryLogger();
logger.setSlowQueryThreshold(100); // 100ms
logger.setVerySlowQueryThreshold(1000); // 1000ms

// 自动记录慢查询
```

#### 7.3 性能分析
```typescript
import { generatePerformanceReport } from '@/lib/db/performance-analyzer';

const report = await generatePerformanceReport();
console.log('Slow queries:', report.slowQueries);
console.log('Missing indexes:', report.missingIndexes);
```

### 建议
在开发环境启用这些工具：
```typescript
// 在 API 路由中间件中
if (process.env.NODE_ENV === 'development') {
  const detector = getNPlus1Detector();
  detector.setEnabled(true);
}
```

---

## 8. 其他建议

### 8.1 查询结果缓存
项目已有 `src/lib/db/cache.ts`，建议在以下场景使用：
- 频繁查询但不常变更的数据（如用户角色列表）
- 统计数据（如用户总数）

```typescript
import { getCachedQuery } from '@/lib/db/cache';

const roles = await getCachedQuery(
  'all-roles',
  () => getAllRoles(),
  { ttl: 60000 } // 缓存 1 分钟
);
```

### 8.2 定期清理旧数据
对于 `agent_data_access` 等日志表，建议添加定期清理机制：
```typescript
export async function cleanOldDataAccessLogs(daysToKeep: number = 30): Promise<number> {
  const db = await getDatabaseAsync();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const stmt = db.prepare(`
    DELETE FROM agent_data_access
    WHERE timestamp < ?
  `);

  const result = stmt.run(cutoffDate.toISOString());
  return result.changes ?? 0;
}
```

---

## 9. 总结

### 优化效果预期

| 优化项 | 当前性能 | 优化后性能 | 改进 |
|--------|---------|-----------|------|
| 备份 API 查询次数 | 2N 次 | N + 1 次 | ~50% 减少 |
| getAllUsers 无限制返回 | 可能数万条 | 最多 1000 条 | 防止内存溢出 |
| 批量获取交易 | N 次查询 | 1 次查询 | N 倍提升 |

### 优先级

1. **高优先级**: 优化备份 API（安全问题 + 性能）
2. **中优先级**: 添加分页限制（防止资源耗尽）
3. **低优先级**: 批量查询优化（取决于实际使用场景）

### 下一步行动

1. ✅ 实施上述 3 个优化
2. 在开发环境启用 N+1 检测和慢查询日志
3. 运行性能分析器验证优化效果
4. 监控生产环境查询性能

---

## 附录: 完整代码变更

详细代码变更见上述优化 1、2、3 部分。
