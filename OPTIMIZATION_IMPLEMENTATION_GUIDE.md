# 数据库优化实施指南

**日期**: 2026-03-18
**基于报告**: DB_OPTIMIZATION_REPORT.md

---

## 快速开始

### 步骤 1: 备份当前代码

```bash
cd /root/.openclaw/workspace/7zi-project
git add .
git commit -m "Backup before database optimization"
```

### 步骤 2: 应用优化

#### 选项 A: 完全切换到优化版本（推荐）

```bash
# 1. 备份原始文件
cp src/lib/agents/auth-service.ts src/lib/agents/auth-service.backup.ts
cp src/lib/agents/index.ts src/lib/agents/index.backup.ts

# 2. 使用优化版本替换
cp src/lib/agents/auth-service-optimized.ts src/lib/agents/auth-service.ts
cp src/lib/agents/index-optimized.ts src/lib/agents/index.ts

# 3. 测试
npm test
```

#### 选项 B: 逐步迁移（更安全）

保持原始文件不变，通过配置开关使用优化版本：

```typescript
// src/lib/agents/config.ts
export const USE_OPTIMIZED_REPOSITORY = process.env.USE_OPTIMIZED_REPOSITORY === 'true';

// src/lib/agents/index.ts
export * from USE_OPTIMIZED_REPOSITORY
  ? './repository-optimized'
  : './repository';

export * from USE_OPTIMIZED_REPOSITORY
  ? './auth-service-optimized'
  : './auth-service';
```

### 步骤 3: 添加缺失的索引

编辑 `src/lib/agents/repository-optimized.ts`，在 `initializeAgentTables()` 函数中添加：

```typescript
-- 在 agents 表索引部分添加
CREATE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key);

-- 在 agent_tokens 表索引部分添加
CREATE INDEX IF NOT EXISTS idx_agent_tokens_refresh_token ON agent_tokens(refresh_token);

-- 在 wallet_transactions 表索引部分添加
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at_status ON wallet_transactions(created_at DESC, status);

-- 在 agent_data_access 表索引部分添加
CREATE INDEX IF NOT EXISTS idx_agent_data_access_resource_timestamp ON agent_data_access(resource_type, timestamp DESC);
```

### 步骤 4: 测试优化效果

```bash
# 启动应用
npm run dev

# 访问数据库优化报告 API
curl http://localhost:3000/api/database/optimize

# 或者使用浏览器
open http://localhost:3000/api/database/optimize
```

### 步骤 5: 运行数据库优化（可选）

```bash
# 运行所有优化
curl -X POST http://localhost:3000/api/database/optimize \
  -H "Content-Type: application/json" \
  -d '{"actions": ["migrate", "add-indexes", "cleanup", "vacuum", "analyze"]}'

# 或者运行特定优化
curl -X POST http://localhost:3000/api/database/optimize \
  -H "Content-Type: application/json" \
  -d '{"actions": ["add-indexes"]}'
```

---

## 详细优化说明

### 优化 1: 修复认证服务 N+1 查询

**问题**: `authenticateAgent()` 函数遍历所有智能体验证 API Key，导致 1 + N 次查询。

**解决方案**: 使用 SQL 直接查询匹配的智能体。

**性能提升**: 90%+（取决于智能体数量）

**影响范围**:
- `src/lib/agents/auth-service.ts` - `authenticateAgent()` 函数

**测试建议**:
```typescript
// 测试认证性能
const start = Date.now();
await authenticateAgent({ apiKey: 'test-api-key' });
const duration = Date.now() - start;
console.log(`认证耗时: ${duration}ms`);
```

### 优化 2: 启用缓存

**问题**: 优化版本的 repository 未被使用，缓存未生效。

**解决方案**: 使用优化版本的 repository。

**性能提升**: 70-90%（缓存命中时）

**影响范围**:
- `src/lib/agents/repository.ts` → `src/lib/agents/repository-optimized.ts`
- `src/lib/agents/wallet-repository.ts` → `src/lib/agents/wallet-repository-optimized.ts`

**缓存策略**:
- 智能体查询: 5 分钟 TTL
- 智能体列表: 3 分钟 TTL
- 统计信息: 5 分钟 TTL
- 钱包查询: 5 分钟 TTL
- 交易记录: 3 分钟 TTL

### 优化 3: 添加缺失索引

**问题**: 某些查询缺少索引，导致全表扫描。

**解决方案**: 添加推荐的索引。

**性能提升**: 30-50%（取决于查询模式）

**推荐添加的索引**:
```sql
-- 认证查询优化
CREATE INDEX idx_agents_api_key ON agents(api_key);

-- 令牌刷新优化
CREATE INDEX idx_agent_tokens_refresh_token ON agent_tokens(refresh_token);

-- 交易日期范围查询优化
CREATE INDEX idx_wallet_transactions_created_at_status ON wallet_transactions(created_at DESC, status);

-- 数据访问资源+时间查询优化
CREATE INDEX idx_agent_data_access_resource_timestamp ON agent_data_access(resource_type, timestamp DESC);
```

---

## 监控和验证

### 监控指标

#### 1. 查询性能

使用性能分析器 API:

```bash
curl http://localhost:3000/api/performance/report
```

#### 2. 缓存命中率

```bash
curl http://localhost:3000/api/database/optimize | jq '.cache'
```

目标: >80%

#### 3. 慢查询数量

```bash
curl http://localhost:3000/api/database/optimize | jq '.slowQueries | length'
```

目标: 0

### 性能基准

优化前后的预期性能对比：

| 操作 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 认证 | 100-500ms | <10ms | 90%+ |
| 智能体查询 | 2-5ms | <1ms（缓存） | 80%+ |
| 列表查询 | 50-100ms | <10ms（缓存） | 90%+ |
| 统计查询 | 100-200ms | <20ms（缓存） | 90%+ |

### 回滚方案

如果优化出现问题，可以：

#### 方案 A: 恢复原始文件

```bash
# 恢复备份
cp src/lib/agents/auth-service.backup.ts src/lib/agents/auth-service.ts
cp src/lib/agents/index.backup.ts src/lib/agents/index.ts
```

#### 方案 B: 禁用优化版本

```bash
# 设置环境变量
export USE_OPTIMIZED_REPOSITORY=false
```

#### 方案 C: 删除新添加的索引

```sql
DROP INDEX IF EXISTS idx_agents_api_key;
DROP INDEX IF EXISTS idx_agent_tokens_refresh_token;
DROP INDEX IF EXISTS idx_wallet_transactions_created_at_status;
DROP INDEX IF EXISTS idx_agent_data_access_resource_timestamp;
```

---

## 维护任务

### 日常维护（每日）

```bash
# 检查慢查询
curl http://localhost:3000/api/database/optimize | jq '.slowQueries'

# 检查缓存命中率
curl http://localhost:3000/api/database/optimize | jq '.cache.hitRatePercent'
```

### 周期维护（每周）

```bash
# 运行 ANALYZE 更新统计信息
curl -X POST http://localhost:3000/api/database/optimize \
  -H "Content-Type: application/json" \
  -d '{"actions": ["analyze"]}'
```

### 深度维护（每月）

```bash
# 运行 VACUUM 压缩数据库
curl -X POST http://localhost:3000/api/database/optimize \
  -H "Content-Type: application/json" \
  -d '{"actions": ["vacuum"]}'

# 清理旧数据（保留90天）
curl -X POST http://localhost:3000/api/database/optimize \
  -H "Content-Type: application/json" \
  -d '{"actions": ["cleanup"], "daysToKeep": 90}'
```

---

## 故障排查

### 问题 1: 认证失败

**症状**: 认证请求返回 401 或 500 错误

**排查步骤**:
1. 检查 API Key 格式: `sk_agent_` + 43 个字符
2. 检查数据库中是否存在 `api_key` 索引
3. 查看日志中的详细错误信息

```bash
# 检查索引
sqlite3 /tmp/7zi-database.sqlite "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%api_key%'"
```

### 问题 2: 缓存未生效

**症状**: 查询性能没有提升

**排查步骤**:
1. 确认使用的是优化版本的 repository
2. 检查缓存命中率
3. 查看日志中的缓存命中信息

```bash
# 检查缓存统计
curl http://localhost:3000/api/database/optimize | jq '.cache'
```

### 问题 3: 数据库大小增长过快

**症状**: 数据库文件持续增长

**排查步骤**:
1. 检查碎片率
2. 运行 VACUUM
3. 清理旧数据

```bash
# 检查碎片率
curl http://localhost:3000/api/database/optimize | jq '.databaseSize.fragmentationPercent'

# 运行优化
curl -X POST http://localhost:3000/api/database/optimize \
  -H "Content-Type: application/json" \
  -d '{"actions": ["vacuum", "cleanup"]}'
```

---

## 附录

### A. 环境变量

```bash
# 数据库路径
DATABASE_PATH=/tmp/7zi-database.sqlite

# JWT 密钥（用于认证）
JWT_SECRET=your-jwt-secret-here

# Agent 加密密钥（用于 API Key 加密）
AGENT_ENCRYPTION_SECRET=your-encryption-secret-here

# 启用数据库性能日志
ENABLE_DB_PERFORMANCE_LOGGING=true

# 使用优化版本的 repository（可选）
USE_OPTIMIZED_REPOSITORY=true
```

### B. 相关文件

- 优化报告: `DB_OPTIMIZATION_REPORT.md`
- 优化后的认证服务: `src/lib/agents/auth-service-optimized.ts`
- 优化后的模块导出: `src/lib/agents/index-optimized.ts`
- 性能分析器: `src/lib/db/performance-analyzer.ts`
- 缓存系统: `src/lib/db/cache.ts`
- 数据库优化 API: `src/app/api/database/optimize/route.ts`

### C. 测试命令

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- agents

# 运行性能测试
npm run test:performance

# 检查代码质量
npm run lint
```

---

## 联系支持

如果遇到问题，请参考：

1. `DATABASE_OPTIMIZATION.md` - 完整的数据库优化文档
2. `DB_OPTIMIZATION_REPORT.md` - 本次优化的详细报告
3. 项目 GitHub Issues

---

**实施指南结束**

生成时间: 2026-03-18 23:45:00 GMT+1
