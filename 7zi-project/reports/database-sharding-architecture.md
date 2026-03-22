# 数据库分片和读写分离架构设计文档

**项目**: 7zi-Project
**版本**: v1.0.8
**设计人**: 🏗️ 架构师
**日期**: 2026-03-22

---

## 📋 执行摘要

本文档为 7zi-Project 提供数据库分片和读写分离的架构设计方案。当前项目使用 **SQLite 单库架构**，在小规模场景下表现良好，但随着业务增长面临扩展性瓶颈。本方案提出从 SQLite 迁移到 **PostgreSQL**，并逐步实施读写分离和分库分表的渐进式演进路线。

### 核心建议

| 策略 | 优先级 | 实施阶段 | 预期收益 |
|------|--------|----------|----------|
| **迁移到 PostgreSQL** | 🔴 P0 | Phase 1 (0-2个月) | 解锁主从复制、扩展能力 |
| **读写分离** | 🟡 P1 | Phase 2 (2-4个月) | 读性能提升 3-5x |
| **按用户ID分片** | 🟡 P1 | Phase 3 (4-6个月) | 水平扩展能力 |
| **按时间分片** | 🟢 P2 | Phase 4 (6-9个月) | 历史数据归档 |
| **缓存层增强** | 🟡 P1 | Phase 2 (2-4个月) | 读性能提升 10x+ |

### 成本评估

- **Phase 1 (迁移)**: 开发成本 3-4 人周，硬件成本无增加
- **Phase 2 (读写分离)**: 开发成本 2-3 人周，硬件成本增加 1 台从库（$20-50/月）
- **Phase 3 (分库分表)**: 开发成本 4-6 人周，硬件成本增加 2-3 台分片节点（$60-150/月）
- **Phase 4 (时间分片)**: 开发成本 2-3 人周，存储成本优化 50%+

---

## 1. 当前数据库架构分析

### 1.1 当前架构概览

```
┌─────────────────────────────────────────────────────────┐
│                  Next.js 应用层                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  API Routes / Server Components                    │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────┐  │
│  │  better-sqlite3 (同步 API)                         │  │
│  │  - 单文件数据库: data/app.db (220KB)              │  │
│  │  - WAL 模式: 已启用                                 │  │
│  │  - 外键约束: 已启用                                 │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Redis 缓存 (可选)                                 │  │
│  │  - ioredis 5.10.1                                  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 1.2 数据模型推断

基于代码分析，当前数据库主要包含以下表结构：

```sql
-- 用户表（推断）
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  permissions TEXT, -- JSON
  custom_permissions TEXT, -- JSON
  metadata TEXT, -- JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

-- 任务表（推断）
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  assigned_to TEXT REFERENCES users(id),
  created_by TEXT REFERENCES users(id),
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tags TEXT, -- JSON
  metadata TEXT -- JSON
);

-- 可能存在的其他表：
-- - projects (项目表)
-- - accounts (账户表)
-- - transactions (交易表)
-- - sessions (会话表)
-- - audit_logs (审计日志)
```

### 1.3 当前架构瓶颈分析

| 瓶颈类型 | 具体问题 | 严重程度 | 影响 |
|---------|---------|---------|------|
| **扩展性瓶颈** | SQLite 不支持主从复制、读写分离 | 🔴 高 | 无法扩展读性能 |
| **并发瓶颈** | SQLite 写锁是全局的，并发写入受限 | 🔴 高 | 高并发写性能差 |
| **容量瓶颈** | 单文件数据库，备份、恢复复杂 | 🟡 中 | 运维复杂度高 |
| **功能瓶颈** | 缺少分区、索引优化、JSONB 等高级特性 | 🟡 中 | 查询性能受限 |
| **部署瓶颈** | 单机部署，无法水平扩展 | 🔴 高 | 无法应对增长 |
| **数据迁移** | 无原生迁移工具 | 🟢 低 | 需要自定义实现 |

### 1.4 性能指标评估

基于 220KB 的数据库大小，当前处于**早期阶段**：

| 指标 | 当前值 | 告警阈值 | 评估 |
|------|--------|---------|------|
| 数据库大小 | 220KB | 10GB | ✅ 健康 |
| 表数量 | 推测 5-10 个 | 100 个 | ✅ 健康 |
| 单表最大行数 | 未知 | 1M 行 | ⚠️ 需监控 |
| 查询延迟 | <10ms | >100ms | ✅ 良好 |
| 并发连接数 | 未知 | 100 | ⚠️ 需监控 |
| 慢查询数 | 未知 | >10/day | ⚠️ 需监控 |

---

## 2. 读写分离方案设计

### 2.1 主从复制架构（PostgreSQL）

#### 2.1.1 架构图

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 应用层                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │  数据库路由层 (lib/db/router.ts)                  │  │
│  │  - 写操作 → 主库 (Master)                         │  │
│  │  - 读操作 → 从库 (Replica)                        │  │
│  │  - 事务操作 → 主库 (强制)                         │  │
│  └───────────────────────────────────────────────────┘  │
└───────────┬─────────────────────────┬─────────────────────┘
            │ 写操作                  │ 读操作
┌───────────▼──────────────────┐  ┌──▼────────────────────────┐
│  ┌──────────────────────────┐ │  │ ┌──────────────────────┐ │
│  │  PostgreSQL 主库         │ │  │ │  PostgreSQL 从库      │ │
│  │  - 7zi.com:5432         │ │  │ │  - replica.7zi.com   │ │
│  │  - 接收所有写操作       │ │  │ │  - 只读查询          │ │
│  │  - WAL 日志同步         │ │  │ │  - 从主库同步数据    │ │
│  └──────────────────────────┘ │  │ └──────────────────────┘ │
│                              │  │                         │
│  WAL 复制 (Streaming)        │◄─┘                         │
└──────────────────────────────┘                             │
                                                             │
┌────────────────────────────────────────────────────────────┘
│                    Redis 缓存层                            │
│  - 缓存热点数据 (session, 用户信息)                       │
│  - 缓存查询结果 (dashboard 统计)                          │
└────────────────────────────────────────────────────────────┘
```

#### 2.1.2 PostgreSQL 配置

**主库配置** (`postgresql.conf`):

```ini
# 连接设置
max_connections = 200
shared_buffers = 256MB

# WAL 配置（用于流复制）
wal_level = replica
max_wal_senders = 5
wal_keep_size = 1GB

# 复制槽配置
max_replication_slots = 5

# 性能优化
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB

# 日志
log_min_duration_statement = 1000  # 记录慢查询 (>1s)
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

**主库配置** (`pg_hba.conf`):

```ini
# 允许从库连接复制
host    replication     replicator      10.0.0.0/8          scram-sha-256
host    replication     replicator      165.99.43.61/32    scram-sha-256

# 允许应用连接
host    all             all             10.0.0.0/8          scram-sha-256
host    all             all             165.99.43.61/32    scram-sha-256
```

**从库配置** (`recovery.conf` 或 `standby.signal`):

```ini
standby_mode = on
primary_conninfo = 'host=165.99.43.61 port=5432 user=replicator password=replicator_password application_name=replica1'
primary_slot_name = replica1_slot
```

#### 2.1.3 数据库路由层实现

**TypeScript 路由器** (`src/lib/db/router.ts`):

```typescript
/**
 * Database Router with Read/Write Splitting
 * 数据库路由器 - 读写分离实现
 */

import pg from 'pg';
const { Pool } = pg;

// ============================================================================
// Configuration
// ============================================================================

const MASTER_CONFIG = {
  host: process.env.DB_MASTER_HOST || 'localhost',
  port: parseInt(process.env.DB_MASTER_PORT || '5432'),
  database: process.env.DB_NAME || '7zi',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // 主库连接池大小
  idleTimeoutMillis: 30000,
};

const REPLICA_CONFIG = {
  host: process.env.DB_REPLICA_HOST || 'localhost',
  port: parseInt(process.env.DB_REPLICA_PORT || '5433'),
  database: process.env.DB_NAME || '7zi',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 50, // 从库连接池大小（读多写少场景）
  idleTimeoutMillis: 30000,
};

// ============================================================================
// Connection Pools
// ============================================================================

const masterPool = new Pool(MASTER_CONFIG);
const replicaPool = new Pool(REPLICA_CONFIG);

// ============================================================================
// Query Router
// ============================================================================

export enum QueryType {
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  TRANSACTION = 'TRANSACTION',
}

/**
 * Determine query type from SQL
 */
function getQueryType(sql: string): QueryType {
  const trimmed = sql.trim().toUpperCase();

  if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
    return QueryType.SELECT;
  }
  if (trimmed.startsWith('INSERT')) {
    return QueryType.INSERT;
  }
  if (trimmed.startsWith('UPDATE')) {
    return QueryType.UPDATE;
  }
  if (trimmed.startsWith('DELETE')) {
    return QueryType.DELETE;
  }

  return QueryType.SELECT; // Default to read
}

/**
 * Execute query with automatic routing
 */
export async function query(
  sql: string,
  params: any[] = [],
  forceMaster: boolean = false
): Promise<any> {
  const queryType = getQueryType(sql);

  // Determine target pool
  const pool = forceMaster
    ? masterPool
    : queryType === QueryType.SELECT
    ? replicaPool
    : masterPool;

  try {
    const start = Date.now();
    const result = await pool.query(sql, params);
    const duration = Date.now() - start;

    // Log slow queries
    if (duration > 1000) {
      console.warn(`[Slow Query] ${duration}ms: ${sql}`);
    }

    return result;
  } catch (error) {
    console.error('[Database Query Error]', error);
    throw error;
  }
}

/**
 * Execute transaction (always on master)
 */
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await masterPool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Health check for both pools
 */
export async function healthCheck(): Promise<{
  master: boolean;
  replica: boolean;
  lag?: number;
}> {
  try {
    // Check master
    await masterPool.query('SELECT 1');

    // Check replica
    const replicaResult = await replicaPool.query(`
      SELECT CASE WHEN pg_is_in_recovery()
        THEN (SELECT pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()))
        ELSE 0
      END as lag_bytes
    `);

    return {
      master: true,
      replica: true,
      lag: replicaResult.rows[0]?.lag_bytes || 0,
    };
  } catch (error) {
    console.error('[Health Check Failed]', error);
    return {
      master: false,
      replica: false,
    };
  }
}

// ============================================================================
// Migration Support
// ============================================================================

/**
 * Run migration on master only
 */
export async function migrate(sql: string): Promise<void> {
  await masterPool.query(sql);
}

// ============================================================================
// Shutdown
// ============================================================================

export async function shutdown(): Promise<void> {
  await Promise.all([
    masterPool.end(),
    replicaPool.end(),
  ]);
}
```

#### 2.1.4 读写分离策略

| 读操作 | 目标 | 说明 |
|--------|------|------|
| 列表查询 | 从库 | `SELECT * FROM tasks WHERE ...` |
| 详情查询 | 从库 | `SELECT * FROM users WHERE id = ?` |
| 统计查询 | 从库 | `SELECT COUNT(*) FROM tasks` |
| 搜索查询 | 从库 | `SELECT * FROM tasks WHERE title LIKE ?` |
| 实时数据查询 | 主库 | 刚写入后立即需要读取的数据 |

| 写操作 | 目标 | 说明 |
|--------|------|------|
| INSERT | 主库 | `INSERT INTO users ...` |
| UPDATE | 主库 | `UPDATE tasks SET ...` |
| DELETE | 主库 | `DELETE FROM sessions WHERE ...` |
| 事务 | 主库 | 多个写操作必须在一个事务中 |

#### 2.1.5 环境变量配置

```env
# .env.production

# 数据库主库
DB_MASTER_HOST=165.99.43.61
DB_MASTER_PORT=5432
DB_NAME=7zi
DB_USER=7zi_app
DB_PASSWORD=your_secure_password

# 数据库从库
DB_REPLICA_HOST=165.99.43.61
DB_REPLICA_PORT=5433
DB_SLAVE_LAG_THRESHOLD_MS=1000  # 延迟阈值

# Redis 缓存
REDIS_URL=redis://localhost:6379
REDIS_CACHE_TTL=3600

# 连接池配置
DB_MASTER_POOL_SIZE=20
DB_REPLICA_POOL_SIZE=50
```

### 2.2 性能优化建议

#### 2.2.1 索引策略

```sql
-- 用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 任务表索引
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_tags ON tasks USING GIN(tags); -- JSONB GIN 索引

-- 复合索引（常见查询组合）
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX idx_tasks_assigned_status ON tasks(assigned_to, status);
```

#### 2.2.2 查询优化示例

**优化前** (全表扫描):
```sql
SELECT * FROM tasks
WHERE title LIKE '%keyword%'
  AND status = 'active'
  AND assigned_to = 'user123';
```

**优化后** (使用全文搜索):
```sql
-- 创建全文搜索索引
CREATE INDEX idx_tasks_title_fts ON tasks USING GIN(to_tsvector('english', title));

-- 使用全文搜索
SELECT * FROM tasks
WHERE to_tsvector('english', title) @@ to_tsquery('english', 'keyword')
  AND status = 'active'
  AND assigned_to = 'user123';
```

#### 2.2.3 分区表策略（预准备）

```sql
-- 按月分区审计日志表
CREATE TABLE audit_logs (
  id BIGSERIAL,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- 创建分区
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE audit_logs_2025_02 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- 自动创建分区的函数
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
  start_date date;
  end_date date;
  partition_name text;
BEGIN
  start_date := date_trunc('month', CURRENT_DATE);
  end_date := start_date + interval '1 month';
  partition_name := 'audit_logs_' || to_char(start_date, 'YYYY_MM');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    start_date,
    end_date
  );
END;
$$ LANGUAGE plpgsql;
```

---

## 3. 分库分表方案设计

### 3.1 分片策略对比

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **垂直分片** | 按业务拆分，架构清晰 | 跨库 JOIN 困难 | 业务模块清晰 |
| **水平分片（按用户ID）** | 数据均匀分布，查询简单 | 扩容需要迁移数据 | 用户为中心的场景 |
| **水平分片（按时间）** | 历史数据归档方便 | 热点数据可能集中 | 时间序列数据 |
| **一致性哈希** | 扩容平滑，数据迁移少 | 实现复杂 | 大规模分布式系统 |

### 3.2 推荐方案：混合分片策略

#### 3.2.1 阶段化演进

**Phase 1: 垂直分片（微服务准备）**
```
7zi 主库
├── users_db (用户服务)
│   ├── users
│   ├── roles
│   └── permissions
├── tasks_db (任务服务)
│   ├── tasks
│   ├── task_assignments
│   └── task_comments
├── collaboration_db (协作服务)
│   ├── projects
│   ├── project_members
│   └── rooms
└── analytics_db (分析服务)
    ├── metrics
    └── audit_logs
```

**Phase 2: 水平分片（按用户ID）**
```
tasks_db (水平分片)
├── tasks_shard_0 (user_id % 4 = 0)
├── tasks_shard_1 (user_id % 4 = 1)
├── tasks_shard_2 (user_id % 4 = 2)
└── tasks_shard_3 (user_id % 4 = 3)
```

**Phase 3: 时间分片（历史数据）**
```
audit_logs_db (按月分区)
├── audit_logs_2025_01
├── audit_logs_2025_02
├── audit_logs_2025_03
└── ...
```

### 3.3 按用户ID分片实现

#### 3.3.1 分片路由器

```typescript
/**
 * Shard Router - User-based Sharding
 * 按用户ID分片的路由器
 */

interface ShardConfig {
  id: number;
  host: string;
  port: number;
  database: string;
}

const SHARD_CONFIGS: ShardConfig[] = [
  { id: 0, host: 'shard0.7zi.com', port: 5432, database: '7zi_tasks_0' },
  { id: 1, host: 'shard1.7zi.com', port: 5432, database: '7zi_tasks_1' },
  { id: 2, host: 'shard2.7zi.com', port: 5432, database: '7zi_tasks_2' },
  { id: 3, host: 'shard3.7zi.com', port: 5432, database: '7zi_tasks_3' },
];

const shardPools: Map<number, pg.Pool> = new Map();

// Initialize shard pools
SHARD_CONFIGS.forEach(config => {
  const pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
  });
  shardPools.set(config.id, pool);
});

/**
 * Get shard ID for a user
 */
function getShardId(userId: string): number {
  // 简单的取模分片
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % SHARD_CONFIGS.length;
}

/**
 * Query on specific shard
 */
export async function queryOnShard(
  userId: string,
  sql: string,
  params: any[] = []
): Promise<any> {
  const shardId = getShardId(userId);
  const pool = shardPools.get(shardId);

  if (!pool) {
    throw new Error(`Shard ${shardId} not found`);
  }

  return pool.query(sql, params);
}

/**
 * Query across all shards (聚合查询)
 */
export async function queryAllShards(
  sql: string,
  params: any[] = []
): Promise<any[]> {
  const promises = Array.from(shardPools.values()).map(pool =>
    pool.query(sql, params)
  );

  const results = await Promise.all(promises);
  return results.flatMap(r => r.rows);
}

/**
 * Broadcast query across all shards
 */
export async function broadcastQuery(
  sql: string,
  params: any[] = []
): Promise<void> {
  const promises = Array.from(shardPools.values()).map(pool =>
    pool.query(sql, params)
  );

  await Promise.all(promises);
}
```

#### 3.3.2 分布式事务（Saga 模式）

```typescript
/**
 * Distributed Transaction Manager (Saga Pattern)
 * 分布式事务管理器
 */

type SagaStep = {
  name: string;
  execute: () => Promise<void>;
  compensate: () => Promise<void>;
};

export async function executeSaga(steps: SagaStep[]): Promise<void> {
  const executedSteps: SagaStep[] = [];

  try {
    for (const step of steps) {
      await step.execute();
      executedSteps.push(step);
    }
  } catch (error) {
    // Compensate executed steps in reverse order
    for (const step of [...executedSteps].reverse()) {
      try {
        await step.compensate();
      } catch (compensateError) {
        console.error(`Compensation failed for ${step.name}`, compensateError);
      }
    }
    throw error;
  }
}

// Example: Cross-shard task assignment
export async function assignTaskCrossShard(
  taskId: string,
  fromUserId: string,
  toUserId: string
): Promise<void> {
  const fromShardId = getShardId(fromUserId);
  const toShardId = getShardId(toUserId);

  await executeSaga([
    {
      name: 'remove_task_from_user',
      execute: async () => {
        await queryOnShard(fromUserId, `
          UPDATE user_tasks SET user_id = NULL
          WHERE task_id = $1 AND user_id = $2
        `, [taskId, fromUserId]);
      },
      compensate: async () => {
        await queryOnShard(fromUserId, `
          UPDATE user_tasks SET user_id = $1
          WHERE task_id = $2 AND user_id IS NULL
        `, [fromUserId, taskId]);
      },
    },
    {
      name: 'add_task_to_user',
      execute: async () => {
        await queryOnShard(toUserId, `
          UPDATE user_tasks SET user_id = $1
          WHERE task_id = $2 AND user_id IS NULL
        `, [toUserId, taskId]);
      },
      compensate: async () => {
        await queryOnShard(toUserId, `
          UPDATE user_tasks SET user_id = NULL
          WHERE task_id = $2 AND user_id = $1
        `, [toUserId, taskId]);
      },
    },
  ]);
}
```

### 3.4 分库分表 vs 单表对比

| 维度 | 单表 | 分库分表 |
|------|------|---------|
| **查询复杂度** | 低 | 高（跨分片查询） |
| **事务一致性** | ACID | BASE（最终一致） |
| **扩展能力** | 垂直扩展 | 水平扩展 |
| **运维成本** | 低 | 高 |
| **开发成本** | 低 | 高 |
| **适用场景** | < 1000万行 | > 1000万行 |

---

## 4. ORM 配置建议

### 4.1 ORM 选择对比

| ORM | 优点 | 缺点 | 推荐度 |
|-----|------|------|--------|
| **Prisma** | 类型安全、迁移工具优秀、性能好 | 学习曲线中等 | ⭐⭐⭐⭐⭐ |
| **Drizzle** | 轻量级、SQL-like、性能极佳 | 生态较小 | ⭐⭐⭐⭐ |
| **TypeORM** | 成熟、装饰器语法 | 性能一般、复杂查询难写 | ⭐⭐⭐ |
| **Knex.js** | 原生 SQL、灵活 | 无类型安全 | ⭐⭐ |

### 4.2 推荐方案：Prisma ORM

#### 4.2.1 安装配置

```bash
npm install prisma @prisma/client
npx prisma init
```

#### 4.2.2 Schema 设计

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== Users Schema ====================

model User {
  id              String    @id @default(cuid())
  username        String    @unique
  email           String    @unique
  passwordHash    String    @map("password_hash")
  name            String?
  avatar          String?
  role            UserRole  @default(USER)
  status          UserStatus @default(ACTIVE)
  permissions     Json?
  customPermissions Json?   @map("custom_permissions")
  metadata        Json?
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  lastLoginAt     DateTime? @map("last_login_at")

  // Relations
  createdTasks    Task[]    @relation("CreatedBy")
  assignedTasks   Task[]    @relation("AssignedTo")
  sessions        Session[]
  auditLogs       AuditLog[]
  projectMembers  ProjectMember[]

  @@map("users")
  @@index([email])
  @@index([status])
  @@index([role])
}

// ==================== Tasks Schema ====================

model Task {
  id          String      @id @default(cuid())
  title       String
  description String?
  status      TaskStatus  @default(PENDING)
  priority    TaskPriority @default(MEDIUM)
  assignedTo  String?     @map("assigned_to")
  createdBy   String      @map("created_by")
  dueDate     DateTime?   @map("due_date")
  tags        Json?
  metadata    Json?
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  // Relations
  assignedUser User?      @relation("AssignedTo", fields: [assignedTo], references: [id], onDelete: SetNull)
  createdByUser User      @relation("CreatedBy", fields: [createdBy], references: [id])
  comments    TaskComment[]
  attachments TaskAttachment[]

  @@map("tasks")
  @@index([status])
  @@index([priority])
  @@index([assignedTo])
  @@index([dueDate])
  @@index([createdBy])
  @@index([status, priority])
  @@index([assignedTo, status])
}

// ==================== Sessions Schema ====================

model Session {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
  @@index([userId])
  @@index([token])
  @@index([expiresAt])
}

// ==================== Audit Logs Schema ====================

model AuditLog {
  id          BigInt    @id @default(autoincrement())
  userId      String    @map("user_id")
  action      String
  entityType  String?   @map("entity_type")
  entityId    String?   @map("entity_id")
  oldValues   Json?     @map("old_values")
  newValues   Json?     @map("new_values")
  createdAt   DateTime  @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id])

  @@map("audit_logs")
  @@index([userId])
  @@index([createdAt])
  @@index([entityType, entityId])
}

// ==================== Enums ====================

enum UserRole {
  ADMIN
  MANAGER
  MODERATOR
  MEMBER
  USER
  GUEST
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  PENDING
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  REVIEW
  COMPLETED
  CANCELLED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

#### 4.2.3 读写分离客户端

```typescript
/**
 * Prisma Client with Read/Write Splitting
 */

import { PrismaClient } from '@prisma/client';

const prismaWrite = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_MASTER,
    },
  },
});

const prismaRead = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_REPLICA,
    },
  },
});

// Proxy that automatically routes queries
const prisma = new Proxy(prismaWrite, {
  get(target, prop) {
    if (prop === '$transaction') {
      return target.$transaction.bind(target);
    }

    const value = target[prop];
    if (typeof value !== 'function') {
      return value;
    }

    return (...args: any[]) => {
      const operation = getOperationType(args);
      return operation === 'read'
        ? (prismaRead as any)[prop](...args)
        : (value as Function).apply(target, args);
    };
  },
});

function getOperationType(args: any[]): 'read' | 'write' {
  // Simple heuristic - can be improved
  const firstArg = args[0];
  if (typeof firstArg === 'string') {
    return firstArg.startsWith('find') || firstArg.startsWith('count')
      ? 'read'
      : 'write';
  }
  return 'read';
}

export default prisma;
```

#### 4.2.4 使用示例

```typescript
// 查询操作（自动路由到从库）
const tasks = await prisma.task.findMany({
  where: {
    status: 'PENDING',
    assignedTo: userId,
  },
  include: {
    assignedUser: true,
  },
});

// 写操作（自动路由到主库）
const task = await prisma.task.create({
  data: {
    title: 'New Task',
    description: 'Task description',
    status: 'PENDING',
    priority: 'HIGH',
    createdBy: userId,
  },
});

// 事务操作（在主库执行）
await prisma.$transaction([
  prisma.task.update({
    where: { id: taskId },
    data: { status: 'COMPLETED' },
  }),
  prisma.auditLog.create({
    data: {
      userId,
      action: 'UPDATE',
      entityType: 'Task',
      entityId: taskId,
      newValues: { status: 'COMPLETED' },
    },
  }),
]);
```

---

## 5. 成本和复杂度评估

### 5.1 成本分析

| 阶段 | 开发成本 | 硬件成本 | 运维成本 | 总计 |
|------|---------|---------|---------|------|
| **Phase 1: PostgreSQL 迁移** | 3-4 人周 | $0 | +5% | 🟡 中 |
| **Phase 2: 读写分离** | 2-3 人周 | $20-50/月 | +10% | 🟡 中 |
| **Phase 3: 按用户分片** | 4-6 人周 | $60-150/月 | +20% | 🟠 高 |
| **Phase 4: 时间分片** | 2-3 人周 | -20% 存储 | +5% | 🟢 低 |

### 5.2 复杂度评估

| 维度 | SQLite 当前 | 读写分离 | 分库分表 | 备注 |
|------|------------|---------|---------|------|
| **开发复杂度** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 跨分片事务最复杂 |
| **运维复杂度** | ⭐ | ⭐⭐ | ⭐⭐⭐⭐ | 需要专业 DBA |
| **故障排查** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 分布式问题难定位 |
| **性能优化** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 分片后需全局优化 |
| **迁移风险** | N/A | 🟡 中 | 🔴 高 | 数据迁移风险大 |

### 5.3 ROI 分析

假设场景：
- 用户数：10,000 → 100,000 (10x 增长)
- 日活跃用户：1,000 → 10,000 (10x 增长)
- 数据量：220KB → 100GB (约 500,000x 增长)

| 方案 | 成本 | 性能提升 | 可扩展性 | ROI |
|------|------|---------|---------|-----|
| **保持 SQLite** | $0 | 0x | ❌ 无 | ❌ - |
| **读写分离** | $50/月 + 2人周 | 3-5x | ⭐⭐ | ⭐⭐⭐⭐ |
| **分库分表** | $150/月 + 4人周 | 5-10x | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 6. 实施路线图

### 6.1 总体规划

```
现在 ──────────┬────────── Phase 1 (0-2月) ─────────┬──────── Phase 2 (2-4月) ──────┬───── Phase 3 (4-6月) ────────┬──── Phase 4 (6-9月) ─────►
                │                                    │                            │                               │
           SQLite →                           读写分离实施                   按用户分片                    时间分片 & 归档
        PostgreSQL                            + 增强缓存                    + 垂直分片                    + 完整监控
         (基础迁移)                           (读性能 3-5x)                (水平扩展)                    (运维优化)
                │                                    │                            │                               │
            🟢 P0                                🟡 P1                        🟡 P1                          🟢 P2
```

### 6.2 Phase 1: PostgreSQL 迁移 (0-2个月)

#### 目标
- ✅ 完成 SQLite → PostgreSQL 迁移
- ✅ 验证数据完整性和性能
- ✅ 建立 CI/CD 数据库迁移流程

#### 任务清单

| ID | 任务 | 优先级 | 负责人 | 预估时间 | 状态 |
|----|------|--------|--------|---------|------|
| P1-1 | 安装 PostgreSQL (主库) | P0 | 架构师 | 0.5天 | ⬜ 待开始 |
| P1-2 | 设计 PostgreSQL Schema | P0 | 架构师 | 1天 | ⬜ 待开始 |
| P1-3 | 编写数据迁移脚本 | P0 | 开发 | 2天 | ⬜ 待开始 |
| P1-4 | 执行数据迁移 & 验证 | P0 | 开发 | 1天 | ⬜ 待开始 |
| P1-5 | 更新应用代码使用 PostgreSQL | P0 | 开发 | 2天 | ⬜ 待开始 |
| P1-6 | 集成测试和性能测试 | P0 | 测试 | 2天 | ⬜ 待开始 |
| P1-7 | 部署到生产环境 | P0 | 运维 | 0.5天 | ⬜ 待开始 |
| P1-8 | 文档更新 | P1 | 架构师 | 0.5天 | ⬜ 待开始 |

#### 数据迁移脚本示例

```typescript
/**
 * SQLite to PostgreSQL Migration Script
 * 数据迁移脚本
 */

import Database from 'better-sqlite3';
import pg from 'pg';
const { Pool } = pg;

const sqliteDb = new Database('./data/app.db');
const pgPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: '7zi',
  user: 'postgres',
  password: 'password',
});

async function migrateUsers() {
  const users = sqliteDb.prepare('SELECT * FROM users').all();

  for (const user of users) {
    await pgPool.query(`
      INSERT INTO users (id, username, email, password_hash, name, avatar, role, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        updated_at = NOW()
    `, [
      user.id,
      user.username,
      user.email,
      user.password_hash,
      user.name,
      user.avatar,
      user.role || 'USER',
      user.status || 'ACTIVE',
      user.created_at,
      user.updated_at,
    ]);
  }

  console.log(`✅ Migrated ${users.length} users`);
}

async function migrateTasks() {
  const tasks = sqliteDb.prepare('SELECT * FROM tasks').all();

  for (const task of tasks) {
    await pgPool.query(`
      INSERT INTO tasks (id, title, description, status, priority, assigned_to, created_by, due_date, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        updated_at = NOW()
    `, [
      task.id,
      task.title,
      task.description,
      task.status || 'PENDING',
      task.priority || 'MEDIUM',
      task.assigned_to,
      task.created_by,
      task.due_date,
      task.created_at,
      task.updated_at,
    ]);
  }

  console.log(`✅ Migrated ${tasks.length} tasks`);
}

async function main() {
  try {
    console.log('🚀 Starting migration...');

    await migrateUsers();
    await migrateTasks();

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    sqliteDb.close();
    await pgPool.end();
  }
}

main();
```

### 6.3 Phase 2: 读写分离 (2-4个月)

#### 目标
- ✅ 配置 PostgreSQL 主从复制
- ✅ 实现数据库读写路由
- ✅ 增强 Redis 缓存层
- ✅ 读性能提升 3-5x

#### 任务清单

| ID | 任务 | 优先级 | 负责人 | 预估时间 | 状态 |
|----|------|--------|--------|---------|------|
| P2-1 | 配置 PostgreSQL 主从复制 | P0 | 架构师 | 1天 | ⬜ 待开始 |
| P2-2 | 实现数据库读写路由器 | P0 | 开发 | 2天 | ⬜ 待开始 |
| P2-3 | 更新所有数据库调用 | P0 | 开发 | 3天 | ⬜ 待开始 |
| P2-4 | 增强 Redis 缓存策略 | P1 | 开发 | 2天 | ⬜ 待开始 |
| P2-5 | 实现复制延迟监控 | P1 | 运维 | 1天 | ⬜ 待开始 |
| P2-6 | 性能测试和调优 | P1 | 测试 | 2天 | ⬜ 待开始 |
| P2-7 | 生产环境部署 | P0 | 运维 | 0.5天 | ⬜ 待开始 |

#### 复制延迟监控

```typescript
/**
 * Replication Lag Monitor
 * 主从复制延迟监控
 */

export class ReplicationMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  private alerts: number = 0;
  private readonly MAX_ALERTS = 10;
  private readonly ALERT_THRESHOLD_MS = parseInt(
    process.env.DB_SLAVE_LAG_THRESHOLD_MS || '1000'
  );

  async getLag(): Promise<number> {
    const result = await query(`
      SELECT CASE WHEN pg_is_in_recovery()
        THEN EXTRACT(EPOCH FROM (pg_last_xact_replay_timestamp() - now())) * 1000
        ELSE 0
      END as lag_ms
    `);

    return result.rows[0]?.lag_ms || 0;
  }

  async checkLag(): Promise<void> {
    const lag = await this.getLag();

    if (lag > this.ALERT_THRESHOLD_MS) {
      this.alerts++;
      console.error(`⚠️ Replication lag: ${lag}ms (threshold: ${this.ALERT_THRESHOLD_MS}ms)`);

      if (this.alerts >= this.MAX_ALERTS) {
        console.error('🚨 CRITICAL: Replication lag exceeded alert threshold!');
        // Send alert to monitoring system
      }
    } else {
      this.alerts = 0;
    }
  }

  start(intervalMs: number = 10000): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this.checkLag().catch(console.error);
    }, intervalMs);

    console.log(`✅ Replication monitor started (interval: ${intervalMs}ms)`);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Usage
const monitor = new ReplicationMonitor();
monitor.start();
```

### 6.4 Phase 3: 分库分表 (4-6个月)

#### 目标
- ✅ 按用户ID水平分片
- ✅ 垂直分库（微服务准备）
- ✅ 实现分布式事务
- ✅ 支持跨分片查询

#### 任务清单

| ID | 任务 | 优先级 | 负责人 | 预估时间 | 状态 |
|----|------|--------|--------|---------|------|
| P3-1 | 设计分片策略和方案 | P0 | 架构师 | 2天 | ⬜ 待开始 |
| P3-2 | 实现分片路由器 | P0 | 开发 | 3天 | ⬜ 待开始 |
| P3-3 | 数据迁移到分片 | P0 | 开发 | 5天 | ⬜ 待开始 |
| P3-4 | 实现跨分片查询 | P1 | 开发 | 3天 | ⬜ 待开始 |
| P3-5 | 实现分布式事务(Saga) | P1 | 开发 | 4天 | ⬜ 待开始 |
| P3-6 | 性能测试和调优 | P1 | 测试 | 3天 | ⬜ 待开始 |
| P3-7 | 灰度发布和监控 | P0 | 运维 | 2天 | ⬜ 待开始 |

#### 数据迁移到分片

```typescript
/**
 * Data Migration to Shards
 * 数据迁移到分片
 */

export async function migrateToShards(): Promise<void> {
  const batchSize = 1000;
  let offset = 0;
  let totalMigrated = 0;

  console.log('🚀 Starting data migration to shards...');

  while (true) {
    // Fetch batch from source
    const tasks = await query(`
      SELECT * FROM tasks
      ORDER BY id
      LIMIT $1 OFFSET $2
    `, [batchSize, offset]);

    if (tasks.rows.length === 0) break;

    // Distribute to shards
    for (const task of tasks.rows) {
      const shardId = getShardId(task.assigned_to || task.created_by);

      // Insert into shard
      await queryOnShard(task.assigned_to || task.created_by, `
        INSERT INTO tasks (id, title, description, status, priority, assigned_to, created_by, due_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, [
        task.id,
        task.title,
        task.description,
        task.status,
        task.priority,
        task.assigned_to,
        task.created_by,
        task.due_date,
        task.created_at,
        task.updated_at,
      ]);

      totalMigrated++;
    }

    offset += batchSize;
    console.log(`✅ Migrated ${totalMigrated} tasks...`);
  }

  console.log(`✅ Migration completed! Total: ${totalMigrated} tasks`);
}
```

### 6.5 Phase 4: 时间分片和归档 (6-9个月)

#### 目标
- ✅ 按时间分区历史数据
- ✅ 实现自动归档机制
- ✅ 建立完整监控体系
- ✅ 存储成本优化 50%+

#### 任务清单

| ID | 任务 | 优先级 | 负责人 | 预估时间 | 状态 |
|----|------|--------|--------|---------|------|
| P4-1 | 设计时间分区策略 | P1 | 架构师 | 1天 | ⬜ 待开始 |
| P4-2 | 实现自动分区创建 | P1 | 开发 | 2天 | ⬜ 待开始 |
| P4-3 | 实现数据归档机制 | P1 | 开发 | 3天 | ⬜ 待开始 |
| P4-4 | 建立监控和告警系统 | P1 | 运维 | 3天 | ⬜ 待开始 |
| P4-5 | 性能优化和调优 | P2 | 架构师 | 2天 | ⬜ 待开始 |

#### 自动归档脚本

```typescript
/**
 * Data Archive Script
 * 数据归档脚本
 */

export async function archiveOldTasks(daysOld: number = 90): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  console.log(`🗄️  Archiving tasks completed before ${cutoffDate.toISOString()}...`);

  // Move to archive table
  const result = await query(`
    INSERT INTO tasks_archive
    SELECT * FROM tasks
    WHERE status = 'COMPLETED'
      AND updated_at < $1
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `, [cutoffDate]);

  // Delete from main table
  await query(`
    DELETE FROM tasks
    WHERE id = ANY($1)
  `, [result.rows.map(r => r.id)]);

  console.log(`✅ Archived ${result.rows.length} tasks`);
}
```

---

## 7. 监控和告警

### 7.1 关键指标

| 指标 | 告警阈值 | 说明 |
|------|---------|------|
| **主库 CPU 使用率** | > 80% | 性能瓶颈 |
| **主库连接数** | > 80% max_connections | 连接池满 |
| **从库复制延迟** | > 1s | 数据不一致风险 |
| **慢查询数** | > 10/hour | 需要优化 |
| **分片负载不均** | > 30% 差异 | 需要重新分片 |
| **查询平均延迟** | > 100ms | 性能下降 |
| **数据库大小** | > 500GB | 需要归档 |

### 7.2 Prometheus 配置

```yaml
# prometheus.yml

global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'postgres-master'
    static_configs:
      - targets: ['165.99.43.61:9187']
    metrics_path: /metrics

  - job_name: 'postgres-replica'
    static_configs:
      - targets: ['165.99.43.61:9188']
    metrics_path: /metrics

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:6379']
```

### 7.3 Grafana 面板建议

建议创建以下面板：

1. **数据库性能概览**
   - CPU/内存/磁盘使用率
   - 连接数趋势
   - QPS (每秒查询数)

2. **读写分离监控**
   - 主从复制延迟
   - 读写比例
   - 慢查询统计

3. **分片健康度**
   - 各分片 QPS
   - 分片数据分布
   - 跨分片查询次数

4. **缓存命中率**
   - Redis 命中率
   - 缓存失效统计
   - 热点数据识别

---

## 8. 回滚方案

### 8.1 各阶段回滚策略

| 阶段 | 回滚方案 | 预计时间 | 风险等级 |
|------|---------|---------|---------|
| **Phase 1** | 切换回 SQLite + 恢复备份 | 30 分钟 | 🟢 低 |
| **Phase 2** | 禁用从库，全部读主库 | 5 分钟 | 🟢 低 |
| **Phase 3** | 数据迁移回单库 | 2-4 小时 | 🟡 中 |
| **Phase 4** | 删除归档分区，恢复数据 | 1-2 小时 | 🟢 低 |

### 8.2 回滚脚本

```bash
#!/bin/bash
# rollback-phase2.sh - Phase 2 回滚脚本

echo "⚠️  Rolling back Phase 2 (Read/Write Split)..."

# 1. Update environment to read from master only
export DB_REPLICA_HOST=$DB_MASTER_HOST
export DB_REPLICA_PORT=$DB_MASTER_PORT

# 2. Restart application
pm2 restart 7zi-frontend

# 3. Stop replica (optional)
# pg_ctl stop -D /var/lib/postgresql/replica -m fast

echo "✅ Rollback completed!"
```

---

## 9. 总结和建议

### 9.1 核心建议

#### 🎯 立即行动 (P0 - Phase 1)

1. **迁移到 PostgreSQL**
   - 解锁主从复制能力
   - 为未来扩展奠定基础
   - 预估成本：3-4 人周

#### 📈 短期计划 (P1 - Phase 2)

2. **实施读写分离**
   - 读性能提升 3-5x
   - 配置主从复制和路由器
   - 预估成本：2-3 人周 + $20-50/月

3. **增强缓存层**
   - 读性能提升 10x+
   - 使用 Redis 缓存热点数据
   - 预估成本：2 人周

#### 🚀 中期计划 (P1 - Phase 3)

4. **按用户ID分片**
   - 获得水平扩展能力
   - 支持更大规模用户
   - 预估成本：4-6 人周 + $60-150/月

#### 📊 长期优化 (P2 - Phase 4)

5. **时间分片和归档**
   - 存储成本优化 50%+
   - 历史数据归档
   - 预估成本：2-3 人周

### 9.2 风险提示

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| **数据迁移失败** | 🟡 中 | 🔴 高 | 充分测试 + 备份 + 灰度发布 |
| **主从延迟过高** | 🟢 低 | 🟡 中 | 监控 + 自动降级到主库 |
| **分片数据倾斜** | 🟡 中 | 🟡 中 | 动态分片 + 定期rebalance |
| **跨分片事务失败** | 🟡 中 | 🔴 高 | Saga模式 + 重试机制 |
| **团队技能不足** | 🟡 中 | 🟡 中 | 培训 + 引入专家 |

### 9.3 替代方案

如果不想投入过多资源，可以考虑以下替代方案：

#### 方案 A：云数据库服务 (RDS)

- **优点**: 托管服务，减少运维成本
- **缺点**: 成本较高 ($50-200/月)
- **适用**: 预算充足，团队规模小

```bash
# AWS RDS PostgreSQL
aws rds create-db-instance \
  --db-instance-identifier 7zi-production \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 16.1 \
  --allocated-storage 20 \
  --multi-az \
  --publicly-accessible \
  --master-username admin \
  --master-user-password your-password
```

#### 方案 B：TiDB (分布式数据库)

- **优点**: 原生分布式，自动分片
- **缺点**: 学习成本高，生态不如PostgreSQL
- **适用**: 对分布式有强需求

#### 方案 C：保持 SQLite + 外部服务

- **优点**: 零迁移成本
- **缺点**: 扩展性仍然受限
- **适用**: 用户规模 < 10,000

---

## 10. 附录

### 10.1 相关文档

- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [Prisma ORM 文档](https://www.prisma.io/docs)
- [数据库分片最佳实践](https://www.youtube.com/watch?v=wR1jJk-5xj4)

### 10.2 参考资料

- [Database Sharding at Scale](https://eng.uber.com/database-sharding-at-uber/)
- [PostgreSQL Replication](https://www.postgresql.org/docs/current/warm-standby.html)
- [Read-Write Splitting Patterns](https://martinfowler.com/bliki/ReadWriteSplitting.html)

### 10.3 联系人

| 角色 | 负责人 | 联系方式 |
|------|--------|---------|
| 架构设计 | 🏗️ 架构师 | - |
| 开发实施 | ⚡ Executor | - |
| 运维支持 | 🛡️ 系统管理员 | - |

---

**文档版本**: 1.0
**最后更新**: 2026-03-22
**审核状态**: ⬜ 待审核