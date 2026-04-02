# Migration v1.9.0: Agent Learning System Tables

**Version**: 1.9.0  
**Date**: 2024-04-02  
**Type**: Feature Addition  
**Downtime**: Zero (new tables only, no existing data affected)

## Overview

This migration adds 5 new tables to support the Agent Learning System in v1.9.0:

1. **agent_features** - Agent performance feature storage
2. **agent_models** - ML model registry for predictions
3. **task_graphs** - Task dependency graph storage
4. **a2a_sessions** - A2A communication session tracking
5. **audit_log_archive** - Long-term audit log archival

## Tables

### 1. agent_features

Stores performance metrics and features for each agent.

| Column                | Type        | Description                |
| --------------------- | ----------- | -------------------------- |
| id                    | TEXT (UUID) | Primary key                |
| agent_id              | TEXT        | Agent identifier (unique)  |
| complexity_avg        | REAL        | Average task complexity    |
| duration_avg          | INTEGER     | Average task duration (ms) |
| success_rate          | REAL        | Task success rate (0-1)    |
| reliability           | REAL        | Agent reliability score    |
| capabilities          | TEXT (JSON) | List of capabilities       |
| current_load          | REAL        | Current load percentage    |
| max_concurrent        | INTEGER     | Max concurrent tasks       |
| total_tasks_completed | INTEGER     | Lifetime task count        |
| specialization_scores | TEXT (JSON) | Per-category scores        |
| updated_at            | TEXT        | Last update timestamp      |
| created_at            | TEXT        | Creation timestamp         |

**Indexes**:

- `idx_agent_features_agent_id` - Agent lookup
- `idx_agent_features_reliability` - Top agents by reliability
- `idx_agent_features_load` - Load balancing queries

### 2. agent_models

Registry for ML models used in predictions.

| Column        | Type        | Description                                        |
| ------------- | ----------- | -------------------------------------------------- |
| id            | TEXT (UUID) | Primary key                                        |
| model_name    | TEXT        | Model identifier                                   |
| model_version | TEXT        | Version string                                     |
| model_type    | TEXT        | Type: time_prediction, success_prediction, routing |
| config        | TEXT (JSON) | Model configuration                                |
| metrics       | TEXT (JSON) | Performance metrics                                |
| is_active     | INTEGER     | Active flag (0/1)                                  |
| trained_at    | TEXT        | Training timestamp                                 |
| deployed_at   | TEXT        | Deployment timestamp                               |
| created_at    | TEXT        | Creation timestamp                                 |
| updated_at    | TEXT        | Update timestamp                                   |

**Indexes**:

- `idx_agent_models_type` - Model type queries
- `idx_agent_models_active` - Active model lookup
- `idx_agent_models_name` - Name-based lookup

### 3. task_graphs

Stores task dependency graphs for workflow optimization.

| Column      | Type        | Description         |
| ----------- | ----------- | ------------------- |
| id          | TEXT (UUID) | Primary key         |
| workflow_id | TEXT        | Workflow identifier |
| graph_data  | TEXT (JSON) | Graph structure     |
| node_count  | INTEGER     | Number of nodes     |
| edge_count  | INTEGER     | Number of edges     |
| created_at  | TEXT        | Creation timestamp  |
| updated_at  | TEXT        | Update timestamp    |

**Indexes**:

- `idx_task_graphs_workflow` - Workflow lookup
- `idx_task_graphs_created` - Time-based queries

### 4. a2a_sessions

Tracks A2A (Agent-to-Agent) communication sessions.

| Column     | Type        | Description                   |
| ---------- | ----------- | ----------------------------- |
| id         | TEXT (UUID) | Primary key                   |
| session_id | TEXT        | Session identifier (unique)   |
| agent_a    | TEXT        | First agent ID                |
| agent_b    | TEXT        | Second agent ID               |
| status     | TEXT        | Status: active, ended, failed |
| context    | TEXT (JSON) | Session context               |
| started_at | TEXT        | Start timestamp               |
| ended_at   | TEXT        | End timestamp                 |
| created_at | TEXT        | Creation timestamp            |

**Indexes**:

- `idx_a2a_sessions_session` - Session lookup
- `idx_a2a_sessions_status` - Status filtering
- `idx_a2a_sessions_agents` - Agent pair queries
- `idx_a2a_sessions_started` - Time-based queries

### 5. audit_log_archive

Long-term storage for audit logs (archive from audit_logs).

| Column     | Type        | Description         |
| ---------- | ----------- | ------------------- |
| id         | TEXT (UUID) | Primary key         |
| event_type | TEXT        | Event type          |
| actor_id   | TEXT        | Actor identifier    |
| target_id  | TEXT        | Target identifier   |
| action     | TEXT        | Action performed    |
| metadata   | TEXT (JSON) | Additional metadata |
| ip_address | TEXT        | Source IP           |
| user_agent | TEXT        | User agent string   |
| created_at | TEXT        | Event timestamp     |

**Indexes**:

- `idx_audit_log_archive_type` - Event type filtering
- `idx_audit_log_archive_actor` - Actor queries
- `idx_audit_log_archive_created` - Time-based queries
- `idx_audit_log_archive_target` - Target lookups

## Migration Steps

### Pre-Migration Checklist

- [ ] Verify database backup exists
- [ ] Confirm no active long-running transactions
- [ ] Check available disk space (estimate: +5MB for new tables)

### Execution

```bash
# Option 1: Via migration system
npx tsx -e "import { migrate } from './src/lib/db/migrations'; migrate()"

# Option 2: Direct execution
npx tsx src/lib/db/migrations/v190_agent_learning.ts
```

### Post-Migration Verification

```sql
-- Verify all tables exist
SELECT name FROM sqlite_master WHERE type='table'
  AND name IN ('agent_features', 'agent_models', 'task_graphs', 'a2a_sessions', 'audit_log_archive');

-- Verify indexes
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';

-- Check table counts
SELECT 'agent_features' as tbl, COUNT(*) as cnt FROM agent_features
UNION ALL SELECT 'agent_models', COUNT(*) FROM agent_models
UNION ALL SELECT 'task_graphs', COUNT(*) FROM task_graphs
UNION ALL SELECT 'a2a_sessions', COUNT(*) FROM a2a_sessions
UNION ALL SELECT 'audit_log_archive', COUNT(*) FROM audit_log_archive;
```

## Zero-Downtime Guarantee

This migration is **zero-downtime** because:

1. **New tables only** - No existing tables modified
2. **No data migration** - No data transformation required
3. **Independent tables** - No foreign key dependencies to existing tables
4. **Atomic DDL** - SQLite DDL is transactional

## Performance Impact

| Metric            | Before   | After   | Impact               |
| ----------------- | -------- | ------- | -------------------- |
| DB Size           | ~N MB    | ~N+5 MB | +5 MB (empty tables) |
| Migration Time    | -        | <100ms  | Negligible           |
| Query Performance | Baseline | Same    | No impact            |

## Integration with Existing Migration System

Add to `src/lib/db/migrations.ts`:

```typescript
import { up as v190Up, down as v190Down } from './migrations/v190_agent_learning'

// Add to MIGRATIONS array
{
  version: 7,
  name: 'add_agent_learning_system',
  up: v190Up,
  down: v190Down,
}
```

## Related Files

- Migration: `src/lib/db/migrations/v190_agent_learning.ts`
- Rollback: `docs/ROLLBACK_v190_NEW_TABLES.md`
- Tests: `src/lib/db/__tests__/v190_agent_learning.test.ts` (to be created)

## Changelog

- 2024-04-02: Initial migration design
- 2024-04-02: SQLite adaptation (UUID → TEXT, JSONB → TEXT/JSON)
- 2024-04-02: Added additional indexes for query optimization
