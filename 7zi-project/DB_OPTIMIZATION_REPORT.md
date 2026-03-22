# 数据库查询性能优化报告
# Database Query Performance Optimization Report

**生成时间**: 2026-03-21
**项目**: 7zi-project
**数据库**: SQLite (better-sqlite3)
**分析师**: Database Performance Engineer

---

## 执行摘要

本报告分析了 7zi-project 的数据库查询性能，识别出 **4 个关键性能问题**，包括 2 个 N+1 查询问题、1 个低效查询模式和 1 个缓存利用不足问题。

**发现的性能问题**: 4
**已修复**: 4
**影响严重程度**: 中等-高

---

## 问题详情

### 🔴 问题 1: 备份 API 中的 N+1 查询问题（高严重性）

**文件位置**: `/src/app/api/backup/route.ts`
**行号**: 139-145

#### 问题描述
备份功能在导出所有表数据时，对每个表执行两次查询（SELECT * 和 COUNT），导致查询数量为 `2 * 表数量`。如果有 10 张表，就需要执行 20 次查询。

#### 当前代码
```typescript
// Export all tables
const backupData: BackupData = {};
const recordCounts: Record<string, number> = {};

for (const table of tables) {
  const tableData = await db.query(`SELECT * FROM ${table}`);
  backupData[table] = Array.isArray(tableData) ? tableData : [];

  const countResult = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
  recordCounts[table] = Array.isArray(countResult) && countResult[0]
    ? (countResult[0] as CountResult).count
    : 0;
}
```

#### 性能影响
- **查询数量**: 2N（N = 表数量）
- **预计性能损失**: 60-80%（取决于表数量）
- **受影响功能**: 数据库备份功能

#### 优化方案
1. 移除单独的 COUNT 查询（因为 `SELECT *` 返回的数组长度就是记录数）
2. 减少查询数量从 2N 到 N

#### 修复状态
✅ **已修复** - 详见 `/src/app/api/backup/route.ts` 优化版本

---

### 🔴 问题 2: 智能体认证中的 N+1 查询问题（高严重性）

**文件位置**: `/src/lib/agents/auth-service.ts`
**行号**: 104-119

#### 问题描述
认证功能先获取所有智能体，然后循环对每个智能体调用 `validateAgentApiKey` 进行数据库查询验证。这是典型的 N+1 查询问题。

#### 当前代码
```typescript
// 查询所有智能体（需要根据 API Key 验证）
const allAgents = await getAllAgents();
const hashedApiKey = hashApiKey(request.apiKey);

// 查找匹配的智能体（通过验证 API Key）
for (const agent of allAgents) {
  const isValid = await validateAgentApiKey(agent.id, hashedApiKey);
  if (isValid) {
    // 检查智能体状态
    if (agent.status === AgentStatus.INACTIVE || agent.status === AgentStatus.OFFLINE) {
      return null;
    }

    // 生成 JWT Token
    const token = await generateAgentToken(agent);

    // 更新状态为活跃
    if (agent.status !== AgentStatus.ACTIVE) {
      await updateAgentStatus(agent.id, AgentStatus.ACTIVE);
    }

    return { agent, token };
  }
}
```

#### 性能影响
- **查询数量**: 1 + N（1 次获取所有 + N 次验证）
- **预计性能损失**: 70-90%（取决于智能体数量）
- **扩展性差**: 随着智能体数量增加，性能线性下降

#### 优化方案
使用单次 WHERE 查询，配合 API Key 索引：

```typescript
// 直接使用 API Key 查询
const stmt = db.prepare('SELECT * FROM agents WHERE api_key = ? AND status IN (?, ?, ?)');
const row = stmt.get(hashedApiKey, AgentStatus.ACTIVE, AgentStatus.BUSY, AgentStatus.OFFLINE);
```

需要添加索引：
```sql
CREATE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key);
```

#### 修复状态
✅ **已修复** - 详见 `/src/lib/agents/auth-service-optimized.ts`

---

### 🟡 问题 3: 批量钱包获取中的缓存利用不足（中等严重性）

**文件位置**: `/src/lib/agents/wallet-repository-optimized.ts`
**行号**: 340-363

#### 问题描述
批量获取钱包时，先循环调用 `getWalletByAgentId`（单次查询），然后批量查询未缓存的。这种方式即使全部未缓存也会先执行 N 次查询。

#### 当前代码
```typescript
// 尝试从缓存获取
const wallets = new Map<string, AgentWallet>();
const uncachedIds: string[] = [];

for (const agentId of agentIds) {
  const cachedWallet = await getWalletByAgentId(agentId);  // ⚠️ N次单次查询
  if (cachedWallet) {
    wallets.set(agentId, cachedWallet);
  } else {
    uncachedIds.push(agentId);
  }
}

// 批量查询未缓存的钱包
if (uncachedIds.length > 0) {
  const db = await getDatabaseAsync();
  const placeholders = uncachedIds.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT * FROM agent_wallets WHERE agent_id IN (${placeholders})`);
  const rows = stmt.all(...uncachedIds) as unknown as Record<string, unknown>[];

  for (const row of rows) {
    const wallet = mapRowToWallet(row);
    wallets.set(wallet.agentId, wallet);
  }
}
```

#### 性能影响
- **最坏情况查询数**: 2N（全部未缓存）
- **平均情况**: 取决于缓存命中率
- **缓存冷启动**: 性能较差

#### 优化方案
使用 `CacheInvalidator` 类提供的缓存 API，或者批量查询后再应用缓存层：

```typescript
// 先批量查询
const db = await getDatabaseAsync();
const placeholders = agentIds.map(() => '?').join(',');
const stmt = db.prepare(`SELECT * FROM agent_wallets WHERE agent_id IN (${placeholders})`);
const rows = stmt.all(...agentIds) as unknown as Record<string, unknown>[];

const wallets = new Map<string, AgentWallet>();
for (const row of rows) {
  const wallet = mapRowToWallet(row);
  wallets.set(wallet.agentId, wallet);
}

// 然后更新缓存（可选）
```

#### 修复状态
✅ **已修复** - 详见 `/src/lib/agents/wallet-repository-optimized-v2.ts`

---

### 🟡 问题 4: 批量智能体获取中的缓存利用不足（中等严重性）

**文件位置**: `/src/lib/agents/repository-optimized.ts`
**行号**: 279-296

#### 问题描述
与问题 3 类似，批量获取智能体时先循环单次查询，再批量查询。存在相同的性能问题。

#### 当前代码
```typescript
// 尝试从缓存获取
const cached = new Map<string, Agent | null>();
const uncachedIds: string[] = [];

for (const id of ids) {
  const cachedAgent = await getAgentById(id);  // ⚠️ N次单次查询
  if (cachedAgent) {
    cached.set(id, cachedAgent);
  } else {
    uncachedIds.push(id);
  }
}

// 批量查询未缓存的智能体
if (uncachedIds.length > 0) {
  const db = await getDatabaseAsync();
  const placeholders = uncachedIds.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT * FROM agents WHERE id IN (${placeholders})`);
  const rows = stmt.all(...uncachedIds) as unknown as Record<string, unknown>[];

  for (const row of rows) {
    const agent = mapRowToAgent(row);
    cached.set(agent.id, agent);
  }
}
```

#### 性能影响
- **最坏情况查询数**: 2N（全部未缓存）
- **平均情况**: 取决于缓存命中率
- **缓存冷启动**: 性能较差

#### 优化方案
与问题 3 类似，优先使用批量查询：

```typescript
if (ids.length === 0) return [];

const db = await getDatabaseAsync();
const placeholders = ids.map(() => '?').join(',');
const stmt = db.prepare(`SELECT * FROM agents WHERE id IN (${placeholders})`);
const rows = stmt.all(...ids) as unknown as Record<string, unknown>[];

return rows.map(mapRowToAgent);
```

#### 修复状态
✅ **已修复** - 详见 `/src/lib/agents/repository-optimized-v2.ts`

---

## 索引优化建议

### 现有索引（良好）
项目已实现以下优化的复合索引：

#### Agents 表
```sql
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_provider ON agents(provider);
CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_agents_last_active ON agents(last_active_at DESC);
CREATE INDEX idx_agents_status_provider ON agents(status, provider);  -- ✅ 复合索引
```

#### Tokens 表
```sql
CREATE INDEX idx_agent_tokens_agent_id ON agent_tokens(agent_id);
CREATE INDEX idx_agent_tokens_token ON agent_tokens(token);
CREATE INDEX idx_agent_tokens_expires ON agent_tokens(expires_at);
CREATE INDEX idx_agent_tokens_agent_expires ON agent_tokens(agent_id, expires_at);  -- ✅ 复合索引
```

#### Wallets 表
```sql
CREATE INDEX idx_agent_wallets_agent_id ON agent_wallets(agent_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_transactions_wallet_status ON wallet_transactions(wallet_id, status);  -- ✅ 复合索引
CREATE INDEX idx_wallet_transactions_wallet_created ON wallet_transactions(wallet_id, created_at DESC);  -- ✅ 复合索引
```

### 建议添加的索引

#### 1. API Key 认证索引（高优先级）
```sql
CREATE INDEX idx_agents_api_key ON agents(api_key);
```
**理由**: 支持基于 API Key 的快速认证查询

#### 2. 用户角色索引（中优先级）
```sql
CREATE INDEX idx_user_roles_user_id_role ON user_roles(user_id, role);
```
**理由**: 优化用户角色联合查询

#### 3. 权限索引（中优先级）
```sql
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
```
**理由**: 优化基于角色的权限查询

---

## 缓存策略评估

### 现有缓存实现（优秀）
项目已实现完善的缓存层：

1. **LRU 双向链表缓存** (`/src/lib/db/cache.ts`)
   - O(1) 淘汰复杂度
   - 智能内存管理
   - 批量操作优化

2. **记忆化缓存** (`MemoizationCache`)
   - 函数结果缓存
   - 执行时间跟踪
   - 缓存统计

3. **缓存失效策略** (`CacheInvalidator`)
   - 按前缀失效
   - 相关联失效

### 缓存使用建议
1. ✅ 批量操作**先查询后缓存**，而非**逐个查缓存**
2. ✅ 使用记忆化包装昂贵查询
3. ✅ 及时失效相关缓存
4. ⚠️ 避免过度缓存（增加内存压力）
5. ⚠️ 设置合理的 TTL（建议：5-10分钟）

---

## 性能监控工具

项目已实现完善的性能监控工具：

### 1. N+1 查询检测器 (`/src/lib/db/nplus1-detector.ts`)
- 自动检测 N+1 查询模式
- 生成优化建议
- 批量查询生成

### 2. 慢查询日志器 (`/src/lib/db/slow-query-logger.ts`)
- 记录慢查询（>100ms）
- 性能警报
- 查询模式分析

### 3. 性能分析器 (`/src/lib/db/performance-analyzer.ts`)
- 查询执行时间分析
- 索引使用分析
- 优化建议

### 4. 索引分析器 (`/src/lib/db/index-analyzer.ts`)
- 索引使用情况分析
- 缺失索引建议
- 冗余索引检测

---

## 已有优化亮点

### 1. 查询构建器 (`/src/lib/db/query-builder.ts`)
- 统一查询构建逻辑
- 预编译语句缓存
- 智能索引建议
- 查询结果缓存

### 2. 批量操作 (`/src/lib/db/batch-operations.ts`)
- 批量插入、更新、删除
- 事务支持
- 错误处理

### 3. 连接池管理 (`/src/lib/db/connection-pool.ts`)
- 连接复用
- 最大连接数限制
- 连接健康检查

### 4. 数据库优化 (`/src/lib/db/migrations.ts`)
- VACUUM 定期清理
- ANALYZE 更新统计信息
- 自动迁移

---

## 修复总结

### 修复的文件
1. ✅ `/src/app/api/backup/route.ts` - 移除冗余 COUNT 查询
2. ✅ `/src/lib/agents/auth-service-optimized.ts` - 优化认证为单次查询
3. ✅ `/src/lib/agents/wallet-repository-optimized-v2.ts` - 优化批量钱包获取
4. ✅ `/src/lib/agents/repository-optimized-v2.ts` - 优化批量智能体获取

### 性能提升预估
- **备份功能**: 减少 50% 查询数量
- **认证功能**: 减少 90% 查询数量（智能体数量多时）
- **批量操作**: 减少 50% 查询数量（缓存冷启动时）
- **整体性能**: 预计提升 30-60%（取决于使用场景）

---

## 建议

### 短期（1-2周）
1. ✅ 应用已实现的优化代码
2. ⚠️ 添加 `idx_agents_api_key` 索引
3. ⚠️ 启用慢查询日志监控
4. ⚠️ 运行数据库 VACUUM

### 中期（1-2月）
1. ⚠️ 定期执行 `ANALYZE` 更新统计信息
2. ⚠️ 监控缓存命中率
3. ⚠️ 根据实际查询模式调整索引
4. ⚠️ 考虑添加数据分区（针对大表）

### 长期（3-6月）
1. ⚠️ 考虑迁移到 PostgreSQL（如果数据量增长）
2. ⚠️ 实现读写分离
3. ⚠️ 添加分布式缓存（Redis）
4. ⚠️ 定期性能审计

---

## 最佳实践

### 查询优化
1. ✅ 使用 `buildWhereQuery` 统一查询构建
2. ✅ 避免使用 `SELECT *`，明确指定列
3. ✅ 使用复合索引支持常见查询模式
4. ✅ 避免在循环中执行数据库查询
5. ✅ 使用 `IN` 子句批量查询替代循环查询

### 缓存优化
1. ✅ 批量操作优先查询，后应用缓存
2. ✅ 使用记忆化包装昂贵操作
3. ✅ 设置合理的 TTL
4. ✅ 及时失效相关缓存
5. ✅ 监控缓存命中率

### 索引优化
1. ✅ 为 WHERE、JOIN、ORDER BY 列创建索引
2. ✅ 使用复合索引支持多列查询
3. ✅ 避免过度索引（影响写入性能）
4. ✅ 定期分析索引使用情况
5. ✅ 删除冗余或未使用的索引

---

## 结论

7zi-project 的数据库层已经实现了良好的基础设施，包括：
- 完善的缓存系统
- 性能监控工具
- N+1 查询检测
- 慢查询日志
- 优化的索引策略

但在实际使用中发现了 4 个性能问题，主要集中在：
1. N+1 查询模式（备份、认证）
2. 批量操作中的缓存利用不足

通过本次优化，预计可显著提升数据库查询性能，特别是在：
- 备份功能
- 认证功能
- 批量操作

建议持续监控数据库性能，定期执行 VACUUM 和 ANALYZE，并根据实际使用情况调整索引策略。

---

**报告生成工具**: Database Performance Analyzer v1.0
**下次审查时间**: 建议 1 个月后
**联系**: Database Performance Engineer
