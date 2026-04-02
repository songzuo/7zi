# v1.8.0 数据库迁移方案

**Version:** 1.8.0
**Status:** Design Phase
**Target Release:** 2026-05-15
**Current Version:** v1.6.0 (Migration Version: 6)
**Architect:** 🏗️ 架构师
**Date:** 2026-04-02

---

## 📋 执行摘要

本文档为 7zi 项目 v1.8.0 版本设计完整的数据库迁移方案，支持零停机迁移、多版本 API 共存和完整的回滚策略。本次迁移主要服务于三大核心功能升级：

1. **智能体学习系统 2.0** - 特征存储、模型版本管理、在线学习数据
2. **智能调度算法 2.0** - 任务图数据、GNN 调度状态、强化学习策略
3. **A2A Protocol v3.0** - 安全认证、版本协商、流量控制

---

## 🔍 现有 Schema 分析

### 当前数据库概览

**数据库类型**: SQLite
**当前迁移版本**: 6
**表总数**: 23 张
**总索引数**: 50+ 个

### 现有表结构

#### 核心业务表

| 表名 | 用途 | 记录数估计 | 关键索引 |
|------|------|-----------|---------|
| **agents** | 智能体主表 | ~1000 | idx_agents_status, idx_agents_provider |
| **agent_tokens** | 智能体令牌 | ~5000 | idx_agent_tokens_expires |
| **agent_data_access** | 数据访问日志 | ~100000+ | idx_agent_data_access_agent_timestamp |
| **agent_wallets** | 智能体钱包 | ~1000 | idx_agent_wallets_agent_id |
| **wallet_transactions** | 钱包交易 | ~50000+ | idx_wallet_transactions_wallet_status |

#### 用户与权限表

| 表名 | 用途 | 记录数估计 | 关键索引 |
|------|------|-----------|---------|
| **users** | 用户账户 | ~10000+ | 主键 id |
| **user_tokens** | 用户令牌 | ~20000+ | idx_user_tokens_user_expires |
| **roles** | 角色定义 | ~20 | idx_roles_name |
| **role_permissions** | 角色权限关联 | ~200 | 外键索引 |
| **user_roles** | 用户角色关联 | ~10000+ | 外键索引 |

#### 用户偏好表

| 表名 | 用途 | 记录数估计 | 关键索引 |
|------|------|-----------|---------|
| **user_preferences** | 用户偏好设置 | ~10000+ | idx_user_preferences_locale |
| **user_notification_preferences** | 通知偏好 | ~10000+ | 外键索引 |

#### 通知系统表

| 表名 | 用途 | 记录数估计 | 关键索引 |
|------|------|-----------|---------|
| **notifications** | 通知消息 | ~100000+ | 外键索引 |
| **notification_preferences** | 通知偏好规则 | ~100 | 外键索引 |
| **notification_delivery_log** | 投递日志 | ~500000+ | 外键索引 |

#### 反馈与评分表

| 表名 | 用途 | 记录数估计 | 关键索引 |
|------|------|-----------|---------|
| **feedbacks** | 用户反馈 | ~5000+ | idx_feedbacks_status_created |
| **feedback_attachments** | 反馈附件 | ~1000 | 外键索引 |
| **feedback_notifications** | 反馈通知 | ~5000+ | 外键索引 |
| **ratings** | 评分记录 | ~10000+ | idx_ratings_target_type_id |
| **helpful_votes** | 有用投票 | ~20000+ | idx_helpful_votes_rating_user |
| **spam_detection_logs** | 垃圾邮件检测日志 | ~50000+ | 无 |

#### 系统表

| 表名 | 用途 | 记录数估计 | 关键索引 |
|------|------|-----------|---------|
| **audit_logs** | 审计日志 | ~1000000+ | 7 个复合索引 |
| **password_reset_tokens** | 密码重置令牌 | ~1000 | 外键索引 |
| **web_vitals** | 网页性能指标 | ~100000+ | 无 |
| **migrations** | 迁移版本记录 | ~6 | 主键 key |

### 现有迁移历史

```typescript
// Migration 1: initial_schema
// - 创建基础表 (agents, agent_tokens, agent_data_access, agent_wallets, wallet_transactions)

// Migration 2: add_composite_indexes
// - 添加复合索引提升查询性能
// - idx_agents_status_provider, idx_agents_status_type, idx_agents_last_active
// - idx_agent_tokens_expires, idx_agent_data_access_agent_timestamp, etc.

// Migration 3: add_critical_indexes
// - 添加关键性能索引
// - idx_agent_tokens_agent_expires, idx_user_tokens_user_expires
// - idx_roles_name, idx_roles_is_system, idx_agent_wallets_currency, etc.

// Migration 4: add_user_preferences
// - 创建 user_preferences 表
// - 添加本地化、主题、通知设置支持

// Migration 5: add_audit_logs
// - 创建 audit_logs 表
// - 支持 7 个审计索引，覆盖所有常见查询模式

// Migration 6: add_feedback_ratings_indexes
// - 添加 feedbacks 和 ratings 表的 11 个复合索引
// - 支持按状态、类型、用户、评分等维度查询
```

### 性能瓶颈分析

#### 慢查询风险点

1. **agent_data_access 表**
   - 问题：数据量大（10万+），索引不足
   - 风险查询：按 resource_type + resource_id 查询
   - 建议：添加 idx_agent_data_access_resource 复合索引（已在 Migration 2）

2. **audit_logs 表**
   - 问题：数据量大（100万+），写入频繁
   - 风险查询：复杂条件组合查询
   - 建议：已有 7 个索引，但需要考虑分区或归档

3. **wallet_transactions 表**
   - 问题：并发写入可能导致锁争用
   - 风险操作：批量转账交易
   - 建议：考虑事务隔离级别优化

#### 存储优化空间

| 表名 | 当前大小 | 优化潜力 | 建议 |
|------|---------|---------|------|
| audit_logs | ~500MB | 高 | 归档 90 天以上数据 |
| agent_data_access | ~200MB | 中 | 清理 30 天以上数据 |
| web_vitals | ~100MB | 中 | 聚合保留统计数据 |
| notifications | ~150MB | 低 | 保留即可 |
| wallet_transactions | ~100MB | 低 | 保留用于审计 |

---

## 🎯 v1.8.0 迁移需求

### 新功能表设计

#### 1. 智能体学习系统 2.0 (Agent Learning System)

**需求概述**: 支持特征工程、模型版本管理、在线学习和异常检测。

##### 1.1 特征存储表 (agent_features)

```sql
CREATE TABLE IF NOT EXISTS agent_features (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  feature_type TEXT NOT NULL, -- 'task', 'context', 'behavior'
  feature_key TEXT NOT NULL,
  feature_value TEXT NOT NULL, -- JSON encoded
  embedding BLOB, -- Optional: 768-dim vector for semantic features
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  UNIQUE(agent_id, feature_type, feature_key, version)
);

-- Indexes for fast feature lookup
CREATE INDEX IF NOT EXISTS idx_agent_features_agent_type ON agent_features(agent_id, feature_type);
CREATE INDEX IF NOT EXISTS idx_agent_features_key ON agent_features(feature_key);
CREATE INDEX IF NOT EXISTS idx_agent_features_updated ON agent_features(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_features_agent_updated ON agent_features(agent_id, updated_at DESC);
```

**用途**:
- 存储智能体的多维度特征
- 支持特征版本管理
- 支持语义特征嵌入（embedding）

**记录数估计**: ~100,000/月
**索引优先级**: P0（核心查询依赖）

##### 1.2 模型存储表 (agent_models)

```sql
CREATE TABLE IF NOT EXISTS agent_models (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'time_prediction', 'success_prediction', 'anomaly_detection'
  model_name TEXT NOT NULL,
  version TEXT NOT NULL, -- Semantic versioning
  model_data BLOB, -- ONNX model binary
  model_size INTEGER, -- Size in bytes
  training_data_id TEXT,
  training_metrics TEXT, -- JSON: {mae, auc, f1_score, ...}
  performance_metrics TEXT, -- JSON: {inference_latency, accuracy, ...}
  status TEXT NOT NULL DEFAULT 'training', -- 'training', 'trained', 'deployed', 'deprecated'
  is_active INTEGER NOT NULL DEFAULT 0, -- Only one active model per agent+type
  created_at TEXT NOT NULL,
  trained_at TEXT,
  deployed_at TEXT,
  deprecated_at TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  UNIQUE(agent_id, model_type, version)
);

-- Indexes for model management
CREATE INDEX IF NOT EXISTS idx_agent_models_agent_type ON agent_models(agent_id, model_type);
CREATE INDEX IF NOT EXISTS idx_agent_models_status ON agent_models(status);
CREATE INDEX IF NOT EXISTS idx_agent_models_active ON agent_models(agent_id, model_type, is_active);
CREATE INDEX IF NOT EXISTS idx_agent_models_deployed ON agent_models(deployed_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_models_version ON agent_models(model_type, version);
```

**用途**:
- 存储训练好的机器学习模型
- 支持模型版本管理
- 支持模型部署和回滚

**记录数估计**: ~500
**索引优先级**: P0

##### 1.3 在线学习记录表 (agent_learning_observations)

```sql
CREATE TABLE IF NOT EXISTS agent_learning_observations (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  observation_type TEXT NOT NULL, -- 'task_completion', 'performance', 'anomaly'
  features TEXT NOT NULL, -- JSON: input features
  target TEXT, -- JSON: actual outcome (if available)
  prediction TEXT, -- JSON: model prediction
  prediction_error REAL, -- Difference between prediction and target
  timestamp TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0, -- Whether this observation has been used for training
  created_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (model_id) REFERENCES agent_models(id) ON DELETE CASCADE
);

-- Indexes for observation management
CREATE INDEX IF NOT EXISTS idx_learning_observations_agent ON agent_learning_observations(agent_id);
CREATE INDEX IF NOT EXISTS idx_learning_observations_model ON agent_learning_observations(model_id);
CREATE INDEX IF NOT EXISTS idx_learning_observations_processed ON agent_learning_observations(processed);
CREATE INDEX IF NOT EXISTS idx_learning_observations_timestamp ON agent_learning_observations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_learning_observations_model_processed ON agent_learning_observations(model_id, processed);
```

**用途**:
- 存储在线学习观测数据
- 支持增量训练
- 支持学习数据追溯

**记录数估计**: ~1,000,000/月
**索引优先级**: P1

##### 1.4 异常检测记录表 (agent_anomalies)

```sql
CREATE TABLE IF NOT EXISTS agent_anomalies (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  anomaly_type TEXT NOT NULL, -- 'performance', 'behavior', 'resource'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  metrics TEXT NOT NULL, -- JSON: current metrics
  baseline TEXT, -- JSON: expected baseline metrics
  explanation TEXT, -- Human-readable explanation
  resolved INTEGER NOT NULL DEFAULT 0,
  resolved_at TEXT,
  resolved_by TEXT, -- User or system that resolved
  created_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Indexes for anomaly tracking
CREATE INDEX IF NOT EXISTS idx_anomalies_agent ON agent_anomalies(agent_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_type ON agent_anomalies(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON agent_anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_anomalies_resolved ON agent_anomalies(resolved);
CREATE INDEX IF NOT EXISTS idx_anomalies_created ON agent_anomalies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_agent_unresolved ON agent_anomalies(agent_id, resolved);
```

**用途**:
- 记录检测到的智能体异常
- 支持异常跟踪和解决
- 支持异常趋势分析

**记录数估计**: ~10,000/月
**索引优先级**: P1

#### 2. 智能调度算法 2.0 (Smart Scheduling)

**需求概述**: 支持任务图、GNN 调度、强化学习和动态重调度。

##### 2.1 任务图表 (task_graphs)

```sql
CREATE TABLE IF NOT EXISTS task_graphs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  root_task_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  total_tasks INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  failed_tasks INTEGER NOT NULL DEFAULT 0,
  critical_path_length INTEGER,
  max_parallel_tasks INTEGER,
  estimated_completion_time TEXT,
  actual_completion_time TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  metadata TEXT DEFAULT '{}'
);

-- Indexes for task graph queries
CREATE INDEX IF NOT EXISTS idx_task_graphs_status ON task_graphs(status);
CREATE INDEX IF NOT EXISTS idx_task_graphs_created ON task_graphs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_graphs_started ON task_graphs(started_at DESC);
```

**用途**:
- 存储任务依赖图
- 支持任务图级别的状态跟踪

**记录数估计**: ~10,000/月
**索引优先级**: P0

##### 2.2 任务节点表 (task_nodes)

```sql
CREATE TABLE IF NOT EXISTS task_nodes (
  id TEXT PRIMARY KEY,
  task_graph_id TEXT NOT NULL,
  parent_id TEXT, -- Parent task in the graph
  task_id TEXT NOT NULL, -- Reference to actual task
  node_type TEXT NOT NULL DEFAULT 'task', -- 'task', 'milestone', 'checkpoint'
  level INTEGER NOT NULL DEFAULT 0, -- Topological sort level
  in_degree INTEGER NOT NULL DEFAULT 0, -- Number of dependencies
  out_degree INTEGER NOT NULL DEFAULT 0, -- Number of dependents
  critical_path_index INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'ready', 'running', 'completed', 'failed', 'skipped'
  assigned_agent_id TEXT,
  started_at TEXT,
  completed_at TEXT,
  estimated_duration INTEGER, -- Seconds
  actual_duration INTEGER, -- Seconds
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES task_nodes(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

-- Indexes for task node queries
CREATE INDEX IF NOT EXISTS idx_task_nodes_graph ON task_nodes(task_graph_id);
CREATE INDEX IF NOT EXISTS idx_task_nodes_parent ON task_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_task_nodes_status ON task_nodes(status);
CREATE INDEX IF NOT EXISTS idx_task_nodes_level ON task_nodes(level);
CREATE INDEX IF NOT EXISTS idx_task_nodes_assigned ON task_nodes(assigned_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_task_nodes_graph_level ON task_nodes(task_graph_id, level);
```

**用途**:
- 存储任务图的节点
- 支持任务依赖关系
- 支持任务调度状态跟踪

**记录数估计**: ~100,000/月
**索引优先级**: P0

##### 2.3 任务依赖表 (task_edges)

```sql
CREATE TABLE IF NOT EXISTS task_edges (
  id TEXT PRIMARY KEY,
  task_graph_id TEXT NOT NULL,
  from_task_node_id TEXT NOT NULL,
  to_task_node_id TEXT NOT NULL,
  edge_type TEXT NOT NULL DEFAULT 'dependency', -- 'dependency', 'preference', 'conflict'
  constraint_type TEXT, -- 'finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (from_task_node_id) REFERENCES task_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (to_task_node_id) REFERENCES task_nodes(id) ON DELETE CASCADE,
  UNIQUE(from_task_node_id, to_task_node_id)
);

-- Indexes for edge traversal
CREATE INDEX IF NOT EXISTS idx_task_edges_graph ON task_edges(task_graph_id);
CREATE INDEX IF NOT EXISTS idx_task_edges_from ON task_edges(from_task_node_id);
CREATE INDEX IF NOT EXISTS idx_task_edges_to ON task_edges(to_task_node_id);
CREATE INDEX IF NOT EXISTS idx_task_edges_type ON task_edges(edge_type);
```

**用途**:
- 存储任务间的依赖关系
- 支持图遍历和拓扑排序

**记录数估计**: ~200,000/月
**索引优先级**: P1

##### 2.4 GNN 调度状态表 (gnn_scheduler_states)

```sql
CREATE TABLE IF NOT EXISTS gnn_scheduler_states (
  id TEXT PRIMARY KEY,
  task_graph_id TEXT NOT NULL,
  model_version TEXT NOT NULL,
  node_embeddings BLOB, -- Node embeddings (encoded)
  agent_embeddings BLOB, -- Agent embeddings (encoded)
  adjacency_matrix BLOB, -- Graph adjacency (encoded)
  assignment_matrix BLOB, -- Task-agent assignments (encoded)
  scheduler_state TEXT, -- JSON: internal state
  confidence REAL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE
);

-- Indexes for scheduler state queries
CREATE INDEX IF NOT EXISTS idx_gnn_states_graph ON gnn_scheduler_states(task_graph_id);
CREATE INDEX IF NOT EXISTS idx_gnn_states_model ON gnn_scheduler_states(model_version);
CREATE INDEX IF NOT EXISTS idx_gnn_states_created ON gnn_scheduler_states(created_at DESC);
```

**用途**:
- 存储 GNN 调度器的中间状态
- 支持调试和分析
- 支持调度策略对比

**记录数估计**: ~10,000/月
**索引优先级**: P2

##### 2.5 强化学习策略表 (rl_policies)

```sql
CREATE TABLE IF NOT EXISTS rl_policies (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  version TEXT NOT NULL,
  algorithm TEXT NOT NULL, -- 'ppo', 'dqn', 'a2c', etc.
  policy_data BLOB, -- Trained policy network
  value_network BLOB, -- Value function network
  training_stats TEXT, -- JSON: {reward, loss, episodes, ...}
  performance_metrics TEXT, -- JSON: {success_rate, avg_reward, ...}
  status TEXT NOT NULL DEFAULT 'training', -- 'training', 'evaluating', 'deployed', 'deprecated'
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  trained_at TEXT,
  deployed_at TEXT,
  deprecated_at TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  UNIQUE(agent_id, policy_name, version)
);

-- Indexes for policy management
CREATE INDEX IF NOT EXISTS idx_rl_policies_agent ON rl_policies(agent_id);
CREATE INDEX IF NOT EXISTS idx_rl_policies_status ON rl_policies(status);
CREATE INDEX IF NOT EXISTS idx_rl_policies_active ON rl_policies(agent_id, policy_name, is_active);
CREATE INDEX IF NOT EXISTS idx_rl_policies_deployed ON rl_policies(deployed_at DESC);
```

**用途**:
- 存储强化学习策略
- 支持策略版本管理
- 支持 A/B 测试

**记录数估计**: ~100
**索引优先级**: P1

##### 2.6 RL 经验回放表 (rl_experience_replay)

```sql
CREATE TABLE IF NOT EXISTS rl_experience_replay (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL,
  episode_id TEXT NOT NULL,
  step INTEGER NOT NULL,
  state TEXT NOT NULL, -- JSON: observation state
  action TEXT NOT NULL, -- JSON: action taken
  reward REAL NOT NULL,
  next_state TEXT, -- JSON: next observation state
  done INTEGER NOT NULL DEFAULT 0,
  timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (policy_id) REFERENCES rl_policies(id) ON DELETE CASCADE
);

-- Indexes for experience replay
CREATE INDEX IF NOT EXISTS idx_rl_replay_policy ON rl_experience_replay(policy_id);
CREATE INDEX IF NOT EXISTS idx_rl_replay_episode ON rl_experience_replay(episode_id);
CREATE INDEX IF NOT EXISTS idx_rl_replay_timestamp ON rl_experience_replay(timestamp DESC);
```

**用途**:
- 存储 RL 训练经验
- 支持经验回放
- 支持训练数据追溯

**记录数估计**: ~10,000,000
**索引优先级**: P2（性能考虑）

##### 2.7 重调度记录表 (reschedule_logs)

```sql
CREATE TABLE IF NOT EXISTS reschedule_logs (
  id TEXT PRIMARY KEY,
  task_graph_id TEXT,
  task_node_id TEXT,
  trigger_type TEXT NOT NULL, -- 'agent_failure', 'task_timeout', 'slo_violation', 'new_task', 'resource_change'
  trigger_reason TEXT,
  old_schedule TEXT, -- JSON: old assignments
  new_schedule TEXT, -- JSON: new assignments
  affected_tasks TEXT, -- JSON: list of affected task IDs
  strategy TEXT, -- 'local', 'global', 'incremental'
  impact_score REAL, -- 0-1, measure of disruption
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (task_node_id) REFERENCES task_nodes(id) ON DELETE SET NULL
);

-- Indexes for reschedule tracking
CREATE INDEX IF NOT EXISTS idx_reschedule_graph ON reschedule_logs(task_graph_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_trigger ON reschedule_logs(trigger_type);
CREATE INDEX IF NOT EXISTS idx_reschedule_created ON reschedule_logs(created_at DESC);
```

**用途**:
- 记录重调度事件
- 支持调度稳定性分析
- 支持策略优化

**记录数估计**: ~50,000/月
**索引优先级**: P1

#### 3. A2A Protocol v3.0 (Agent-to-Agent Protocol)

**需求概述**: 支持安全认证、版本协商、流量控制和分布式协调。

##### 3.1 A2A 消息表 (a2a_messages)

```sql
CREATE TABLE IF NOT EXISTS a2a_messages (
  id TEXT PRIMARY KEY,
  message_id TEXT UNIQUE NOT NULL,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  message_type TEXT NOT NULL, -- 'delegate', 'collaborate', 'aggregate', 'orchestrate', 'negotiate', 'sync', 'health_check'
  protocol_version TEXT NOT NULL, -- '2.1', '3.0'
  payload TEXT NOT NULL, -- JSON: message payload
  payload_encrypted INTEGER NOT NULL DEFAULT 0,
  signature TEXT, -- Ed25519 signature
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'processed', 'failed', 'expired'
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  ttl INTEGER, -- Time to live in seconds
  expires_at TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT,
  delivered_at TEXT,
  processed_at TEXT,
  failed_at TEXT,
  FOREIGN KEY (from_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (to_agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Indexes for message queries
CREATE INDEX IF NOT EXISTS idx_a2a_from_to ON a2a_messages(from_agent_id, to_agent_id);
CREATE INDEX IF NOT EXISTS idx_a2a_to_status ON a2a_messages(to_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_a2a_type_status ON a2a_messages(message_type, status);
CREATE INDEX IF NOT EXISTS idx_a2a_protocol_version ON a2a_messages(protocol_version);
CREATE INDEX IF NOT EXISTS idx_a2a_priority_status ON a2a_messages(priority, status);
CREATE INDEX IF NOT EXISTS idx_a2a_expires ON a2a_messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_a2a_created ON a2a_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_a2a_message_id ON a2a_messages(message_id);
```

**用途**:
- 存储 A2A 协议消息
- 支持消息路由和追踪
- 支持重试和错误处理

**记录数估计**: ~1,000,000/月
**索引优先级**: P0（核心业务表）

##### 3.2 A2A 版本协商表 (a2a_negotiations)

```sql
CREATE TABLE IF NOT EXISTS a2a_negotiations (
  id TEXT PRIMARY KEY,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  negotiated_version TEXT NOT NULL,
  from_capabilities TEXT, -- JSON: from agent's capabilities
  to_capabilities TEXT, -- JSON: to agent's capabilities
  supported_message_types TEXT, -- JSON: intersection of capabilities
  features TEXT, -- JSON: enabled features
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'deprecated'
  created_at TEXT NOT NULL,
  FOREIGN KEY (from_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (to_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  UNIQUE(from_agent_id, to_agent_id)
);

-- Indexes for negotiation lookups
CREATE INDEX IF NOT EXISTS idx_a2a_negotiation_pair ON a2a_negotiations(from_agent_id, to_agent_id);
CREATE INDEX IF NOT EXISTS idx_a2a_negotiation_version ON a2a_negotiations(negotiated_version);
CREATE INDEX IF NOT EXISTS idx_a2a_negotiation_status ON a2a_negotiations(status);
CREATE INDEX IF NOT EXISTS idx_a2a_negotiation_expires ON a2a_negotiations(expires_at);
```

**用途**:
- 存储版本协商结果
- 支持协议版本兼容性管理

**记录数估计**: ~10,000
**索引优先级**: P1

##### 3.3 A2A 流量控制表 (a2a_flow_control)

```sql
CREATE TABLE IF NOT EXISTS a2a_flow_control (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  peer_agent_id TEXT NOT NULL,
  bucket_capacity INTEGER NOT NULL, -- Token bucket capacity
  bucket_tokens REAL NOT NULL, -- Current tokens
  refill_rate REAL NOT NULL, -- Tokens per second
  last_refill_at TEXT NOT NULL,
  window_size INTEGER, -- Sliding window size
  window_count INTEGER NOT NULL DEFAULT 0, -- Current window count
  backpressure_level TEXT NOT NULL DEFAULT 'none', -- 'none', 'low', 'medium', 'high', 'critical'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (peer_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  UNIQUE(agent_id, peer_agent_id)
);

-- Indexes for flow control lookups
CREATE INDEX IF NOT EXISTS idx_a2a_flow_agent_peer ON a2a_flow_control(agent_id, peer_agent_id);
CREATE INDEX IF NOT EXISTS idx_a2a_flow_backpressure ON a2a_flow_control(backpressure_level);
CREATE INDEX IF NOT EXISTS idx_a2a_flow_updated ON a2a_flow_control(updated_at DESC);
```

**用途**:
- 存储流量控制状态
- 支持背压管理
- 支持速率限制

**记录数估计**: ~5,000
**索引优先级**: P1

##### 3.4 A2A 安全证书表 (a2a_certificates)

```sql
CREATE TABLE IF NOT EXISTS a2a_certificates (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  certificate_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL, -- Ed25519 public key
  private_key_encrypted TEXT, -- Encrypted private key
  certificate_chain TEXT, -- JSON: certificate chain
  issuer TEXT,
  subject TEXT,
  valid_from TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'revoked', 'expired'
  revoked_at TEXT,
  revoked_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Indexes for certificate lookups
CREATE INDEX IF NOT EXISTS idx_a2a_cert_agent ON a2a_certificates(agent_id);
CREATE INDEX IF NOT EXISTS idx_a2a_cert_id ON a2a_certificates(certificate_id);
CREATE INDEX IF NOT EXISTS idx_a2a_cert_status ON a2a_certificates(status);
CREATE INDEX IF NOT EXISTS idx_a2a_cert_valid ON a2a_certificates(valid_until);
```

**用途**:
- 存储 A2A 安全证书
- 支持证书轮换
- 支持证书撤销

**记录数估计**: ~1,000
**索引优先级**: P0（安全关键）

##### 3.5 A2A 死信队列表 (a2a_dead_letter)

```sql
CREATE TABLE IF NOT EXISTS a2a_dead_letter (
  id TEXT PRIMARY KEY,
  original_message_id TEXT NOT NULL,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  message_type TEXT,
  payload TEXT,
  error_type TEXT, -- 'timeout', 'max_retries', 'processing_error', 'validation_error'
  error_message TEXT,
  stack_trace TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (from_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (to_agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Indexes for dead letter management
CREATE INDEX IF NOT EXISTS idx_a2a_dl_to_agent ON a2a_dead_letter(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_a2a_dl_error_type ON a2a_dead_letter(error_type);
CREATE INDEX IF NOT EXISTS idx_a2a_dl_created ON a2a_dead_letter(created_at DESC);
```

**用途**:
- 存储投递失败的消息
- 支持失败分析和重试
- 支持监控和告警

**记录数估计**: ~10,000/月
**索引优先级**: P1

#### 4. 性能优化辅助表

##### 4.1 任务执行缓存表 (task_execution_cache)

```sql
CREATE TABLE IF NOT EXISTS task_execution_cache (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  task_hash TEXT NOT NULL, -- Hash of task input parameters
  result TEXT NOT NULL, -- JSON: cached result
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at TEXT,
  FOREIGN KEY (task_id) REFERENCES agents(id) ON DELETE CASCADE,
  UNIQUE(task_id, task_hash)
);

-- Indexes for cache lookups
CREATE INDEX IF NOT EXISTS idx_task_cache_task_hash ON task_execution_cache(task_id, task_hash);
CREATE INDEX IF NOT EXISTS idx_task_cache_expires ON task_execution_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_task_cache_hit_count ON task_execution_cache(hit_count DESC);
```

**用途**:
- 缓存任务执行结果
- 支持幂等性保证
- 提升重复任务性能

**记录数估计**: ~50,000
**索引优先级**: P2

##### 4.2 批量操作日志表 (batch_operations_log)

```sql
CREATE TABLE IF NOT EXISTS batch_operations_log (
  id TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL, -- 'insert', 'update', 'delete', 'migrate'
  table_name TEXT NOT NULL,
  batch_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  processed_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

-- Indexes for batch operation tracking
CREATE INDEX IF NOT EXISTS idx_batch_log_status ON batch_operations_log(status);
CREATE INDEX IF NOT EXISTS idx_batch_log_table ON batch_operations_log(table_name);
CREATE INDEX IF NOT EXISTS idx_batch_log_created ON batch_operations_log(created_at DESC);
```

**用途**:
- 记录批量操作
- 支持进度跟踪
- 支持失败恢复

**记录数估计**: ~1,000/月
**索引优先级**: P2

---

## 📋 迁移脚本设计

### Migration 7: Learning System Infrastructure

```typescript
export const migration7: Migration = {
  version: 7,
  name: "learning_system_infrastructure",
  up: async () => {
    const db = await getDatabaseAsync();

    // Create agent_features table
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_features (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        feature_type TEXT NOT NULL,
        feature_key TEXT NOT NULL,
        feature_value TEXT NOT NULL,
        embedding BLOB,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        UNIQUE(agent_id, feature_type, feature_key, version)
      );
    `);

    // Create agent_models table
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_models (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        model_type TEXT NOT NULL,
        model_name TEXT NOT NULL,
        version TEXT NOT NULL,
        model_data BLOB,
        model_size INTEGER,
        training_data_id TEXT,
        training_metrics TEXT,
        performance_metrics TEXT,
        status TEXT NOT NULL DEFAULT 'training',
        is_active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        trained_at TEXT,
        deployed_at TEXT,
        deprecated_at TEXT,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        UNIQUE(agent_id, model_type, version)
      );
    `);

    // Create agent_learning_observations table
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_learning_observations (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        observation_type TEXT NOT NULL,
        features TEXT NOT NULL,
        target TEXT,
        prediction TEXT,
        prediction_error REAL,
        timestamp TEXT NOT NULL,
        processed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (model_id) REFERENCES agent_models(id) ON DELETE CASCADE
      );
    `);

    // Create agent_anomalies table
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_anomalies (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        anomaly_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        metrics TEXT NOT NULL,
        baseline TEXT,
        explanation TEXT,
        resolved INTEGER NOT NULL DEFAULT 0,
        resolved_at TEXT,
        resolved_by TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );
    `);

    // Create indexes
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_agent_features_agent_type ON agent_features(agent_id, feature_type)",
      "CREATE INDEX IF NOT EXISTS idx_agent_features_key ON agent_features(feature_key)",
      "CREATE INDEX IF NOT EXISTS idx_agent_features_updated ON agent_features(updated_at DESC)",
      "CREATE INDEX IF NOT EXISTS idx_agent_models_agent_type ON agent_models(agent_id, model_type)",
      "CREATE INDEX IF NOT EXISTS idx_agent_models_status ON agent_models(status)",
      "CREATE INDEX IF NOT EXISTS idx_agent_models_active ON agent_models(agent_id, model_type, is_active)",
      "CREATE INDEX IF NOT EXISTS idx_learning_observations_agent ON agent_learning_observations(agent_id)",
      "CREATE INDEX IF NOT EXISTS idx_learning_observations_processed ON agent_learning_observations(processed)",
      "CREATE INDEX IF NOT EXISTS idx_anomalies_agent ON agent_anomalies(agent_id)",
      "CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON agent_anomalies(severity)",
    ];

    for (const indexSql of indexes) {
      db.exec(indexSql);
    }

    logger.info("Migration 7: Learning system tables created", { category: "db" });
  },
  down: async () => {
    const db = await getDatabaseAsync();

    db.exec("DROP TABLE IF EXISTS agent_anomalies");
    db.exec("DROP TABLE IF EXISTS agent_learning_observations");
    db.exec("DROP TABLE IF EXISTS agent_models");
    db.exec("DROP TABLE IF EXISTS agent_features");

    logger.info("Migration 7 down: Learning system tables dropped", { category: "db" });
  },
};
```

### Migration 8: Smart Scheduling Infrastructure

```typescript
export const migration8: Migration = {
  version: 8,
  name: "smart_scheduling_infrastructure",
  up: async () => {
    const db = await getDatabaseAsync();

    // Create task_graphs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_graphs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        root_task_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        total_tasks INTEGER NOT NULL DEFAULT 0,
        completed_tasks INTEGER NOT NULL DEFAULT 0,
        failed_tasks INTEGER NOT NULL DEFAULT 0,
        critical_path_length INTEGER,
        max_parallel_tasks INTEGER,
        estimated_completion_time TEXT,
        actual_completion_time TEXT,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        metadata TEXT DEFAULT '{}'
      );
    `);

    // Create task_nodes table
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_nodes (
        id TEXT PRIMARY KEY,
        task_graph_id TEXT NOT NULL,
        parent_id TEXT,
        task_id TEXT NOT NULL,
        node_type TEXT NOT NULL DEFAULT 'task',
        level INTEGER NOT NULL DEFAULT 0,
        in_degree INTEGER NOT NULL DEFAULT 0,
        out_degree INTEGER NOT NULL DEFAULT 0,
        critical_path_index INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        assigned_agent_id TEXT,
        started_at TEXT,
        completed_at TEXT,
        estimated_duration INTEGER,
        actual_duration INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES task_nodes(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_agent_id) REFERENCES agents(id) ON DELETE SET NULL
      );
    `);

    // Create task_edges table
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_edges (
        id TEXT PRIMARY KEY,
        task_graph_id TEXT NOT NULL,
        from_task_node_id TEXT NOT NULL,
        to_task_node_id TEXT NOT NULL,
        edge_type TEXT NOT NULL DEFAULT 'dependency',
        constraint_type TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
        FOREIGN KEY (from_task_node_id) REFERENCES task_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (to_task_node_id) REFERENCES task_nodes(id) ON DELETE CASCADE,
        UNIQUE(from_task_node_id, to_task_node_id)
      );
    `);

    // Create gnn_scheduler_states table
    db.exec(`
      CREATE TABLE IF NOT EXISTS gnn_scheduler_states (
        id TEXT PRIMARY KEY,
        task_graph_id TEXT NOT NULL,
        model_version TEXT NOT NULL,
        node_embeddings BLOB,
        agent_embeddings BLOB,
        adjacency_matrix BLOB,
        assignment_matrix BLOB,
        scheduler_state TEXT,
        confidence REAL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE
      );
    `);

    // Create rl_policies table
    db.exec(`
      CREATE TABLE IF NOT EXISTS rl_policies (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        policy_name TEXT NOT NULL,
        version TEXT NOT NULL,
        algorithm TEXT NOT NULL,
        policy_data BLOB,
        value_network BLOB,
        training_stats TEXT,
        performance_metrics TEXT,
        status TEXT NOT NULL DEFAULT 'training',
        is_active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        trained_at TEXT,
        deployed_at TEXT,
        deprecated_at TEXT,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        UNIQUE(agent_id, policy_name, version)
      );
    `);

    // Create reschedule_logs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS reschedule_logs (
        id TEXT PRIMARY KEY,
        task_graph_id TEXT,
        task_node_id TEXT,
        trigger_type TEXT NOT NULL,
        trigger_reason TEXT,
        old_schedule TEXT,
        new_schedule TEXT,
        affected_tasks TEXT,
        strategy TEXT,
        impact_score REAL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
        FOREIGN KEY (task_node_id) REFERENCES task_nodes(id) ON DELETE SET NULL
      );
    `);

    // Create indexes
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_task_graphs_status ON task_graphs(status)",
      "CREATE INDEX IF NOT EXISTS idx_task_nodes_graph ON task_nodes(task_graph_id)",
      "CREATE INDEX IF NOT EXISTS idx_task_nodes_status ON task_nodes(status)",
      "CREATE INDEX IF NOT EXISTS idx_task_nodes_assigned ON task_nodes(assigned_agent_id, status)",
      "CREATE INDEX IF NOT EXISTS idx_task_edges_graph ON task_edges(task_graph_id)",
      "CREATE INDEX IF NOT EXISTS idx_task_edges_from ON task_edges(from_task_node_id)",
      "CREATE INDEX IF NOT EXISTS idx_rl_policies_agent ON rl_policies(agent_id)",
      "CREATE INDEX IF NOT EXISTS idx_rl_policies_active ON rl_policies(agent_id, policy_name, is_active)",
      "CREATE INDEX IF NOT EXISTS idx_reschedule_graph ON reschedule_logs(task_graph_id)",
    ];

    for (const indexSql of indexes) {
      db.exec(indexSql);
    }

    logger.info("Migration 8: Smart scheduling tables created", { category: "db" });
  },
  down: async () => {
    const db = await getDatabaseAsync();

    db.exec("DROP TABLE IF EXISTS reschedule_logs");
    db.exec("DROP TABLE IF EXISTS rl_experience_replay");
    db.exec("DROP TABLE IF EXISTS rl_policies");
    db.exec("DROP TABLE IF EXISTS gnn_scheduler_states");
    db.exec("DROP TABLE IF EXISTS task_edges");
    db.exec("DROP TABLE IF EXISTS task_nodes");
    db.exec("DROP TABLE IF EXISTS task_graphs");

    logger.info("Migration 8 down: Smart scheduling tables dropped", { category: "db" });
  },
};
```

### Migration 9: A2A Protocol v3.0 Infrastructure

```typescript
export const migration9: Migration = {
  version: 9,
  name: "a2a_protocol_v3_infrastructure",
  up: async () => {
    const db = await getDatabaseAsync();

    // Create a2a_messages table
    db.exec(`
      CREATE TABLE IF NOT EXISTS a2a_messages (
        id TEXT PRIMARY KEY,
        message_id TEXT UNIQUE NOT NULL,
        from_agent_id TEXT NOT NULL,
        to_agent_id TEXT NOT NULL,
        message_type TEXT NOT NULL,
        protocol_version TEXT NOT NULL,
        payload TEXT NOT NULL,
        payload_encrypted INTEGER NOT NULL DEFAULT 0,
        signature TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        priority TEXT NOT NULL DEFAULT 'normal',
        ttl INTEGER,
        expires_at TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        error_message TEXT,
        created_at TEXT NOT NULL,
        sent_at TEXT,
        delivered_at TEXT,
        processed_at TEXT,
        failed_at TEXT,
        FOREIGN KEY (from_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (to_agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );
    `);

    // Create a2a_negotiations table
    db.exec(`
      CREATE TABLE IF NOT EXISTS a2a_negotiations (
        id TEXT PRIMARY KEY,
        from_agent_id TEXT NOT NULL,
        to_agent_id TEXT NOT NULL,
        negotiated_version TEXT NOT NULL,
        from_capabilities TEXT,
        to_capabilities TEXT,
        supported_message_types TEXT,
        features TEXT,
        expires_at TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        FOREIGN KEY (from_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (to_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        UNIQUE(from_agent_id, to_agent_id)
      );
    `);

    // Create a2a_flow_control table
    db.exec(`
      CREATE TABLE IF NOT EXISTS a2a_flow_control (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        peer_agent_id TEXT NOT NULL,
        bucket_capacity INTEGER NOT NULL,
        bucket_tokens REAL NOT NULL,
        refill_rate REAL NOT NULL,
        last_refill_at TEXT NOT NULL,
        window_size INTEGER,
        window_count INTEGER NOT NULL DEFAULT 0,
        backpressure_level TEXT NOT NULL DEFAULT 'none',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (peer_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        UNIQUE(agent_id, peer_agent_id)
      );
    `);

    // Create a2a_certificates table
    db.exec(`
      CREATE TABLE IF NOT EXISTS a2a_certificates (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        certificate_id TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        private_key_encrypted TEXT,
        certificate_chain TEXT,
        issuer TEXT,
        subject TEXT,
        valid_from TEXT NOT NULL,
        valid_until TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        revoked_at TEXT,
        revoked_reason TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );
    `);

    // Create a2a_dead_letter table
    db.exec(`
      CREATE TABLE IF NOT EXISTS a2a_dead_letter (
        id TEXT PRIMARY KEY,
        original_message_id TEXT NOT NULL,
        from_agent_id TEXT NOT NULL,
        to_agent_id TEXT NOT NULL,
        message_type TEXT,
        payload TEXT,
        error_type TEXT,
        error_message TEXT,
        stack_trace TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (from_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (to_agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );
    `);

    // Create indexes
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_a2a_from_to ON a2a_messages(from_agent_id, to_agent_id)",
      "CREATE INDEX IF NOT EXISTS idx_a2a_to_status ON a2a_messages(to_agent_id, status)",
      "CREATE INDEX IF NOT EXISTS idx_a2a_message_id ON a2a_messages(message_id)",
      "CREATE INDEX IF NOT EXISTS idx_a2a_negotiation_pair ON a2a_negotiations(from_agent_id, to_agent_id)",
      "CREATE INDEX IF NOT EXISTS idx_a2a_flow_agent_peer ON a2a_flow_control(agent_id, peer_agent_id)",
      "CREATE INDEX IF NOT EXISTS idx_a2a_cert_agent ON a2a_certificates(agent_id)",
      "CREATE INDEX IF NOT EXISTS idx_a2a_cert_status ON a2a_certificates(status)",
      "CREATE INDEX IF NOT EXISTS idx_a2a_dl_to_agent ON a2a_dead_letter(to_agent_id)",
    ];

    for (const indexSql of indexes) {
      db.exec(indexSql);
    }

    logger.info("Migration 9: A2A Protocol v3.0 tables created", { category: "db" });
  },
  down: async () => {
    const db = await getDatabaseAsync();

    db.exec("DROP TABLE IF EXISTS a2a_dead_letter");
    db.exec("DROP TABLE IF EXISTS a2a_certificates");
    db.exec("DROP TABLE IF EXISTS a2a_flow_control");
    db.exec("DROP TABLE IF EXISTS a2a_negotiations");
    db.exec("DROP TABLE IF EXISTS a2a_messages");

    logger.info("Migration 9 down: A2A Protocol v3.0 tables dropped", { category: "db" });
  },
};
```

### Migration 10: Performance Optimization Tables

```typescript
export const migration10: Migration = {
  version: 10,
  name: "performance_optimization",
  up: async () => {
    const db = await getDatabaseAsync();

    // Create task_execution_cache table
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_execution_cache (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        task_hash TEXT NOT NULL,
        result TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        hit_count INTEGER NOT NULL DEFAULT 0,
        last_hit_at TEXT,
        FOREIGN KEY (task_id) REFERENCES agents(id) ON DELETE CASCADE,
        UNIQUE(task_id, task_hash)
      );
    `);

    // Create batch_operations_log table
    db.exec(`
      CREATE TABLE IF NOT EXISTS batch_operations_log (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL,
        table_name TEXT NOT NULL,
        batch_size INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        processed_rows INTEGER NOT NULL DEFAULT 0,
        failed_rows INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // Create indexes
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_task_cache_task_hash ON task_execution_cache(task_id, task_hash)",
      "CREATE INDEX IF NOT EXISTS idx_task_cache_expires ON task_execution_cache(expires_at)",
      "CREATE INDEX IF NOT EXISTS idx_batch_log_status ON batch_operations_log(status)",
    ];

    for (const indexSql of indexes) {
      db.exec(indexSql);
    }

    logger.info("Migration 10: Performance optimization tables created", { category: "db" });
  },
  down: async () => {
    const db = await getDatabaseAsync();

    db.exec("DROP TABLE IF EXISTS batch_operations_log");
    db.exec("DROP TABLE IF EXISTS task_execution_cache");

    logger.info("Migration 10 down: Performance optimization tables dropped", { category: "db" });
  },
};
```

---

## 🔄 零停机迁移策略

### 总体原则

1. **向后兼容**: 新 Schema 必须兼容旧代码
2. **渐进式迁移**: 分阶段迁移，避免一次性大变更
3. **可回滚**: 每个迁移步骤都可独立回滚
4. **数据一致性**: 确保迁移过程中数据完整性
5. **监控可见**: 迁移进度和状态实时可见

### 迁移阶段设计

#### Phase 1: Schema 扩展 (Migration 7-8)

**目标**: 添加新表，不影响现有功能

**步骤**:
1. 创建新表（无外键约束冲突）
2. 创建索引（使用 `IF NOT EXISTS` 避免重复）
3. 验证新表可访问
4. 部署新代码（Feature Flag 关闭状态）

**零停机保证**:
- 新表独立，不依赖旧表数据
- 旧代码不访问新表
- Feature Flag 控制新功能启用

**回滚策略**:
```bash
# 如果迁移失败，回滚 Migration 7-8
sqlite3 database.db "DROP TABLE IF EXISTS agent_features;"
sqlite3 database.db "DROP TABLE IF EXISTS agent_models;"
# ... 其他表
```

#### Phase 2: 数据迁移 (Migration 7-8 完成后)

**目标**: 迁移现有数据到新结构

**步骤**:
1. **双写阶段**: 新数据同时写入新旧表
   ```typescript
   // 示例：双写 agent 特征
   await db.exec("INSERT INTO agents (...) VALUES (...)");
   await db.exec("INSERT INTO agent_features (...) VALUES (...)");
   ```

2. **回填阶段**: 迁移历史数据
   ```sql
   -- 分批迁移，避免锁表
   INSERT INTO agent_features (id, agent_id, feature_type, feature_key, feature_value, created_at, updated_at)
   SELECT 
     'feat_' || id || '_initial',
     id,
     'metadata',
     'initial_config',
     json_object('provider', provider, 'model', model),
     created_at,
     updated_at
   FROM agents
   WHERE id NOT IN (SELECT agent_id FROM agent_features);
   ```

3. **验证阶段**: 数据一致性检查
   ```sql
   -- 检查数据完整性
   SELECT COUNT(*) FROM agents WHERE id NOT IN (SELECT agent_id FROM agent_features);
   ```

4. **切换阶段**: Feature Flag 开启新功能

**零停机保证**:
- 分批迁移，每次处理 1000 条记录
- 迁移过程可暂停和恢复
- 双写保证数据不丢失

#### Phase 3: Schema 收缩 (Migration 9-10)

**目标**: 移除冗余字段，优化 Schema

**步骤**:
1. 确认所有代码已迁移到新字段
2. 创建备份
3. 删除旧字段（谨慎操作）
   ```sql
   -- SQLite 不支持 DROP COLUMN，需要重建表
   -- 创建新表
   CREATE TABLE agents_new (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     -- 只保留必要字段
   );
   
   -- 迁移数据
   INSERT INTO agents_new SELECT id, name FROM agents;
   
   -- 重命名
   DROP TABLE agents;
   ALTER TABLE agents_new RENAME TO agents;
   
   -- 重建索引
   CREATE INDEX idx_agents_status ON agents(status);
   ```

**零停机保证**:
- 在维护窗口执行
- 提前通知用户
- 准备快速回滚脚本

### 并发控制策略

#### 乐观锁

```sql
-- 添加版本字段
ALTER TABLE agents ADD COLUMN version INTEGER DEFAULT 1;

-- 更新时检查版本
UPDATE agents 
SET name = ?, version = version + 1, updated_at = ?
WHERE id = ? AND version = ?;
```

#### 悲观锁

```sql
-- 事务级锁
BEGIN EXCLUSIVE TRANSACTION;
-- 执行迁移操作
COMMIT;
```

#### 批量操作优化

```typescript
// 分批处理，避免长时间锁表
async function migrateInBatches(batchSize = 1000) {
  let offset = 0;
  while (true) {
    const batch = await db.query(`
      SELECT * FROM agents 
      ORDER BY id 
      LIMIT ? OFFSET ?
    `, [batchSize, offset]);
    
    if (batch.length === 0) break;
    
    await db.transaction(async () => {
      for (const row of batch) {
        // 处理每条记录
      }
    });
    
    offset += batchSize;
    
    // 短暂休息，释放锁
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

---

## ⏪ 回滚策略

### 回滚分级

| 级别 | 触发条件 | 操作 | 影响时间 |
|------|---------|------|---------|
| **P0** | 迁移脚本执行失败 | 自动回滚当前 Migration | < 1 分钟 |
| **P1** | 数据不一致检测 | 人工触发回滚 | < 10 分钟 |
| **P2** | 生产环境严重问题 | 完整回滚到上一版本 | < 30 分钟 |
| **P3** | 性能问题 | 回滚到优化前状态 | < 1 小时 |

### 回滚脚本库

#### 快速回滚脚本

```bash
#!/bin/bash
# scripts/rollback-migration.sh

VERSION=${1:-"6"}  # 默认回滚到版本 6

echo "Rolling back to migration version $VERSION..."

# 备份当前数据库
cp database.db "database.db.backup.$(date +%Y%m%d_%H%M%S)"

# 执行回滚
sqlite3 database.db <<EOF
-- Migration 10 Rollback
DROP TABLE IF EXISTS batch_operations_log;
DROP TABLE IF EXISTS task_execution_cache;

-- Migration 9 Rollback
DROP TABLE IF EXISTS a2a_dead_letter;
DROP TABLE IF EXISTS a2a_certificates;
DROP TABLE IF EXISTS a2a_flow_control;
DROP TABLE IF EXISTS a2a_negotiations;
DROP TABLE IF EXISTS a2a_messages;

-- Migration 8 Rollback
DROP TABLE IF EXISTS reschedule_logs;
DROP TABLE IF EXISTS rl_experience_replay;
DROP TABLE IF EXISTS rl_policies;
DROP TABLE IF EXISTS gnn_scheduler_states;
DROP TABLE IF EXISTS task_edges;
DROP TABLE IF EXISTS task_nodes;
DROP TABLE IF EXISTS task_graphs;

-- Migration 7 Rollback
DROP TABLE IF EXISTS agent_anomalies;
DROP TABLE IF EXISTS agent_learning_observations;
DROP TABLE IF EXISTS agent_models;
DROP TABLE IF EXISTS agent_features;

-- Reset migration version
UPDATE migrations SET value = '$VERSION' WHERE key = 'version';

EOF

echo "Rollback completed. Current version: $VERSION"
```

#### 数据恢复脚本

```bash
#!/bin/bash
# scripts/restore-backup.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore-backup.sh <backup-file>"
  echo "Available backups:"
  ls -la database.db.backup.*
  exit 1
fi

echo "Restoring from $BACKUP_FILE..."

# 停止应用
pm2 stop all

# 恢复数据库
cp "$BACKUP_FILE" database.db

# 验证数据库
sqlite3 database.db "PRAGMA integrity_check;"

# 重启应用
pm2 start all

echo "Restore completed."
```

### 回滚决策矩阵

| 场景 | 数据丢失风险 | 回滚方案 | 验证步骤 |
|------|------------|---------|---------|
| 新表创建失败 | 无 | 删除新表 | 检查旧功能正常 |
| 索引创建失败 | 无 | 删除索引 | 检查查询性能 |
| 数据迁移部分失败 | 低 | 重新运行迁移 | 数据完整性检查 |
| 数据迁移完全失败 | 中 | 从备份恢复 | 全量数据验证 |
| Schema 不兼容 | 高 | 完整回滚 | 功能回归测试 |

---

## 🔀 多版本 API 共存方案

### API 版本管理策略

#### 版本号规范

```
API Version Format: v{MAJOR}.{MINOR}

- MAJOR: 破坏性变更（不兼容旧 API）
- MINOR: 新增功能（向后兼容）

Examples:
- v1.0 -> v1.1: 新增字段，兼容 v1.0
- v1.1 -> v2.0: 删除字段，不兼容 v1.x
```

#### 数据库字段版本标记

```sql
-- 添加 API 版本字段
ALTER TABLE agents ADD COLUMN api_version TEXT DEFAULT 'v1.0';

-- 创建版本索引
CREATE INDEX idx_agents_api_version ON agents(api_version);
```

### 共存架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway / Router                          │
│  - Header: X-API-Version: v1.0 | v1.8                           │
│  - URL Path: /api/v1/... | /api/v1.8/...                       │
└─────────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   API v1.0   │    │   API v1.8   │    │   Future     │
│  (Legacy)    │    │  (Current)   │    │   Versions   │
└──────────────┘    └──────────────┘    └──────────────┘
         ↓                    ↓                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Data Access Layer                             │
│  - Schema Adapter: 转换不同版本的数据格式                       │
│  - Version Detector: 自动检测数据版本                           │
│  - Compatibility Layer: 填充默认值，转换字段名                  │
└─────────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Database (Unified Schema)                     │
│  - 所有版本共用一个 Schema                                      │
│  - 使用 NULL/DEFAULT 处理可选字段                               │
│  - 使用 JSON 字段存储扩展数据                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Schema Adapter 实现

```typescript
// src/lib/db/schema-adapter.ts

export interface SchemaAdapter {
  toInternal(data: ExternalData, version: string): InternalData;
  toExternal(data: InternalData, version: string): ExternalData;
}

export class AgentSchemaAdapter implements SchemaAdapter {
  // 外部数据 -> 内部数据
  toExternal(agent: Agent, version: string): Record<string, unknown> {
    switch (version) {
      case 'v1.0':
        return this.toV10(agent);
      case 'v1.8':
        return this.toV18(agent);
      default:
        throw new Error(`Unsupported API version: ${version}`);
    }
  }

  private toV10(agent: Agent): Record<string, unknown> {
    // v1.0 只返回基础字段
    return {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      provider: agent.provider,
      created_at: agent.created_at,
    };
  }

  private toV18(agent: Agent): Record<string, unknown> {
    // v1.8 返回完整字段 + 学习系统数据
    return {
      ...agent,
      features: agent.features, // 新增
      learning_status: agent.learning_status, // 新增
      model_version: agent.model_version, // 新增
    };
  }
}
```

### 版本路由实现

```typescript
// src/app/api/v1/agents/route.ts (Legacy)
import { AgentSchemaAdapter } from '@/lib/db/schema-adapter';

export async function GET(request: Request) {
  const agents = await getAgents();
  const adapter = new AgentSchemaAdapter();
  
  // 转换为 v1.0 格式
  const legacyAgents = agents.map(a => adapter.toExternal(a, 'v1.0'));
  
  return Response.json({ agents: legacyAgents });
}

// src/app/api/v1.8/agents/route.ts (Current)
export async function GET(request: Request) {
  const agents = await getAgents();
  const adapter = new AgentSchemaAdapter();
  
  // 转换为 v1.8 格式
  const currentAgents = agents.map(a => adapter.toExternal(a, 'v1.8'));
  
  return Response.json({ agents: currentAgents });
}
```

### 数据兼容性策略

#### 向后兼容（Backward Compatibility）

```sql
-- 新增字段必须有默认值
ALTER TABLE agents ADD COLUMN learning_status TEXT DEFAULT 'inactive';

-- 使用 COALESCE 处理 NULL
SELECT 
  id, 
  name, 
  COALESCE(learning_status, 'inactive') as learning_status
FROM agents;
```

#### 向前兼容（Forward Compatibility）

```sql
-- 使用 JSON 字段存储未知扩展
ALTER TABLE agents ADD COLUMN extensions TEXT DEFAULT '{}';

-- 应用层处理
INSERT INTO agents (id, name, extensions) 
VALUES (?, ?, json_set('{}', '$.new_field', ?));
```

#### 版本检测中间件

```typescript
// src/middleware/api-version.ts

export function apiVersionMiddleware(handler: Function) {
  return async (request: Request) => {
    const version = request.headers.get('X-API-Version') || 'v1.0';
    
    // 验证版本
    if (!['v1.0', 'v1.8'].includes(version)) {
      return Response.json(
        { error: 'Unsupported API version' },
        { status: 400 }
      );
    }
    
    // 注入版本信息
    request.apiVersion = version;
    
    return handler(request);
  };
}
```

### 数据迁移兼容性

#### 双格式存储

```sql
-- 同时存储新旧格式
CREATE TABLE agent_data_v2 (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  
  -- v1.0 格式（兼容）
  legacy_data TEXT,
  
  -- v1.8 格式（新）
  current_data TEXT,
  
  -- 版本标记
  data_version TEXT DEFAULT 'v1.8',
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### 触发器自动转换

```sql
-- 写入时自动填充两种格式
CREATE TRIGGER trg_agent_data_insert
AFTER INSERT ON agent_data_v2
BEGIN
  UPDATE agent_data_v2 
  SET legacy_data = json_extract(current_data, '$.legacy')
  WHERE id = NEW.id;
END;
```

---

## 📊 迁移验证计划

### 验证检查清单

#### Schema 验证

- [ ] 所有新表创建成功
- [ ] 所有索引创建成功
- [ ] 外键约束正确
- [ ] 触发器正常工作

#### 数据验证

- [ ] 数据完整性检查
  ```sql
  -- 检查外键完整性
  PRAGMA foreign_key_check;
  
  -- 检查数据一致性
  SELECT COUNT(*) FROM agents WHERE id NOT IN (SELECT agent_id FROM agent_features WHERE feature_type = 'metadata');
  ```

- [ ] 数据量统计
  ```sql
  -- 对比迁移前后数据量
  SELECT 'agents' as table_name, COUNT(*) as count FROM agents
  UNION ALL
  SELECT 'agent_features', COUNT(*) FROM agent_features;
  ```

#### 性能验证

- [ ] 关键查询性能测试
  ```sql
  -- 查询执行计划
  EXPLAIN QUERY PLAN SELECT * FROM agent_features WHERE agent_id = ?;
  ```

- [ ] 索引使用率检查
  ```sql
  -- 检查索引是否被使用
  EXPLAIN QUERY PLAN SELECT * FROM a2a_messages WHERE to_agent_id = ? AND status = 'pending';
  ```

#### 功能验证

- [ ] 所有 API 端点响应正常
- [ ] Feature Flag 开关正常
- [ ] 版本路由正常
- [ ] 回滚功能可用

### 自动化验证脚本

```typescript
// scripts/validate-migration.ts

import { getDatabaseAsync } from '@/lib/db';

async function validateMigration() {
  const db = await getDatabaseAsync();
  const errors: string[] = [];

  // 1. 检查表存在性
  const requiredTables = [
    'agent_features', 'agent_models', 'agent_learning_observations', 'agent_anomalies',
    'task_graphs', 'task_nodes', 'task_edges', 'rl_policies', 'reschedule_logs',
    'a2a_messages', 'a2a_negotiations', 'a2a_flow_control', 'a2a_certificates', 'a2a_dead_letter',
    'task_execution_cache', 'batch_operations_log'
  ];

  for (const table of requiredTables) {
    const result = db.query(`
      SELECT name FROM sqlite_master WHERE type='table' AND name=?
    `, [table]);
    if (result.length === 0) {
      errors.push(`Missing table: ${table}`);
    }
  }

  // 2. 检查迁移版本
  const versionStmt = db.prepare("SELECT value FROM migrations WHERE key = 'version'");
  const versionRow = versionStmt.get() as { value: string } | undefined;
  if (!versionRow || parseInt(versionRow.value) < 10) {
    errors.push(`Migration version is ${versionRow?.value || 'unknown'}, expected >= 10`);
  }

  // 3. 检查外键约束
  const fkCheck = db.query("PRAGMA foreign_key_check");
  if (fkCheck.length > 0) {
    errors.push(`Foreign key violations: ${fkCheck.length}`);
  }

  // 4. 性能测试
  const startTime = Date.now();
  db.query("SELECT * FROM agent_features LIMIT 100");
  const queryTime = Date.now() - startTime;
  if (queryTime > 100) {
    errors.push(`Slow query detected: ${queryTime}ms`);
  }

  // 输出结果
  if (errors.length > 0) {
    console.error('❌ Migration validation failed:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  } else {
    console.log('✅ Migration validation passed');
  }
}

validateMigration();
```

---

## 📅 迁移时间表

### 预生产环境迁移

| 阶段 | 时间 | 操作 | 预计耗时 |
|------|------|------|---------|
| 备份 | T+0 | 数据库完整备份 | 10 分钟 |
| Migration 7 | T+10 | 学习系统表 | 5 分钟 |
| 验证 7 | T+15 | 完整性检查 | 5 分钟 |
| Migration 8 | T+20 | 调度系统表 | 5 分钟 |
| 验证 8 | T+25 | 完整性检查 | 5 分钟 |
| Migration 9 | T+30 | A2A 协议表 | 5 分钟 |
| 验证 9 | T+35 | 完整性检查 | 5 分钟 |
| Migration 10 | T+40 | 性能优化表 | 3 分钟 |
| 验证 10 | T+43 | 完整性检查 | 5 分钟 |
| 功能测试 | T+48 | E2E 测试 | 20 分钟 |
| **总计** | | | **~70 分钟** |

### 生产环境迁移

| 阶段 | 时间窗口 | 操作 | 回滚预案 |
|------|---------|------|---------|
| 准备 | 22:00 | 数据备份、公告发布 | - |
| Migration 7-8 | 22:10 | 学习+调度表创建 | 自动回滚 |
| 验证 | 22:20 | 自动化验证 | 手动回滚 |
| Migration 9-10 | 22:30 | A2A+优化表创建 | 自动回滚 |
| 验证 | 22:35 | 自动化验证 | 手动回滚 |
| 数据迁移 | 22:40 | 分批数据迁移 | 从备份恢复 |
| 最终验证 | 23:00 | 全量功能测试 | 完整回滚 |
| 监控期 | 23:30-06:00 | 持续监控 | 随时可回滚 |
| 完成 | 06:00 | 发布完成通知 | - |

---

## 📚 相关文档

- [ARCHITECTURE_UPGRADE_v180.md](./ARCHITECTURE_UPGRADE_v180.md) - v1.8.0 架构升级方案
- [CHANGELOG.md](./CHANGELOG.md) - 版本变更日志
- [README.md](./README.md) - 项目介绍
- [AGENT_REGISTRY_DATA_MODEL_20260401.md](./AGENT_REGISTRY_DATA_MODEL_20260401.md) - Agent Registry 数据模型
- [src/lib/db/migrations.ts](./src/lib/db/migrations.ts) - 现有迁移代码

---

## 📊 迁移影响评估

### 存储空间预估

| 新表 | 预计记录数/月 | 单条大小 | 月增长 | 年增长 |
|------|--------------|---------|-------|-------|
| agent_features | 100,000 | 1KB | 100MB | 1.2GB |
| agent_models | 50 | 10MB | 500MB | 6GB |
| agent_learning_observations | 1,000,000 | 500B | 500MB | 6GB |
| task_graphs | 10,000 | 2KB | 20MB | 240MB |
| task_nodes | 100,000 | 1KB | 100MB | 1.2GB |
| task_edges | 200,000 | 200B | 40MB | 480MB |
| a2a_messages | 1,000,000 | 1KB | 1GB | 12GB |
| **总计** | | | **~2.3GB** | **~28GB** |

### 性能影响评估

| 操作 | 迁移前 | 迁移后 | 变化 |
|------|--------|--------|------|
| Agent 创建 | ~5ms | ~8ms | +60% |
| Agent 查询 | ~2ms | ~2ms | 无变化 |
| 任务调度 | ~10ms | ~5ms | -50% (优化) |
| A2A 消息发送 | ~3ms | ~5ms | +67% |
| 学习数据写入 | N/A | ~3ms | 新增 |

### 风险评估矩阵

| 风险项 | 概率 | 影响 | 缓解措施 | 负责人 |
|--------|-----|------|---------|--------|
| 迁移脚本执行失败 | 低 | 高 | 自动回滚 + 备份恢复 | 🛡️ 系统管理员 |
| 数据不一致 | 中 | 高 | 双写 + 校验 + 分批迁移 | 🏗️ 架构师 |
| 性能下降 | 中 | 中 | 索引优化 + 缓存 | ⚡ Executor |
| 存储空间不足 | 低 | 高 | 定期清理 + 归档 | 🛡️ 系统管理员 |
| API 兼容性问题 | 低 | 高 | Schema Adapter + 测试 | 🧪 测试员 |

---

## ✅ 完成检查清单

### 迁移前准备

- [ ] 数据库完整备份
- [ ] 备份验证可恢复
- [ ] 迁移脚本代码审查
- [ ] 预生产环境测试通过
- [ ] 回滚脚本准备就绪
- [ ] 团队成员待命
- [ ] 用户通知发布

### 迁移执行

- [ ] Migration 7 执行成功
- [ ] Migration 8 执行成功
- [ ] Migration 9 执行成功
- [ ] Migration 10 执行成功
- [ ] 数据迁移完成
- [ ] 所有验证通过

### 迁移后验证

- [ ] 所有 API 端点正常
- [ ] 关键功能测试通过
- [ ] 性能指标符合预期
- [ ] 监控告警正常
- [ ] 用户反馈正常
- [ ] 文档更新完成

---

**Document Version:** 1.0
**Last Updated:** 2026-04-02
**Maintainer:** 🏗️ 架构师
**Review Cycle:** Per Release
**Next Review:** 2026-04-15

---

*此迁移方案将根据实际测试结果动态调整，确保零停机和数据完整性。*
