# Rollback Strategy: v1.9.0 Agent Learning System Tables

**Version**: 1.9.0  
**Date**: 2024-04-02  
**Purpose**: Define rollback procedures for v1.9.0 migration

---

## Rollback Scenarios

### Scenario 1: Migration Fails During Execution

**Symptoms**: Migration process crashes or errors before completion

**Impact**: Partial table creation, inconsistent state

**Recovery**: Auto-rollback by migration system

```typescript
// From migrations.ts - automatic rollback on failure
try {
  await migration.up()
  await setVersion(migration.version)
} catch (error) {
  await migration.down() // Automatic rollback
  throw error
}
```

### Scenario 2: Post-Migration Issues (Rollback Required)

**Symptoms**:

- Data integrity issues discovered
- Performance degradation
- Application errors after deployment
- Feature needs to be pulled

**Impact**: Feature unavailable, data loss in new tables

**Recovery**: Manual rollback required

---

## Rollback Execution

### Option 1: Via Migration System

```bash
# Rollback to version 6 (before v1.9.0)
npx tsx -e "
import { rollback } from './src/lib/db/migrations';
rollback(6).then(() => console.log('Rollback complete')).catch(console.error);
"
```

### Option 2: Direct Execution

```bash
# Execute rollback SQL directly
npx tsx -e "
import { getDatabaseAsync } from './src/lib/db/connection';

const db = await getDatabaseAsync();

// Drop tables
const tables = [
  'audit_log_archive',
  'a2a_sessions',
  'task_graphs',
  'agent_models',
  'agent_features',
];

for (const table of tables) {
  db.exec(\`DROP TABLE IF EXISTS \${table}\`);
}

console.log('Rollback complete');
"
```

### Option 3: Manual SQL

```sql
-- Drop in reverse order (foreign key dependencies)
DROP TABLE IF EXISTS audit_log_archive;
DROP TABLE IF EXISTS a2a_sessions;
DROP TABLE IF EXISTS task_graphs;
DROP TABLE IF EXISTS agent_models;
DROP TABLE IF EXISTS agent_features;

-- Drop indexes
DROP INDEX IF EXISTS idx_agent_features_agent_id;
DROP INDEX IF EXISTS idx_agent_features_reliability;
DROP INDEX IF EXISTS idx_agent_features_load;
DROP INDEX IF EXISTS idx_agent_models_type;
DROP INDEX IF EXISTS idx_agent_models_active;
DROP INDEX IF EXISTS idx_agent_models_name;
DROP INDEX IF EXISTS idx_task_graphs_workflow;
DROP INDEX IF EXISTS idx_task_graphs_created;
DROP INDEX IF EXISTS idx_a2a_sessions_session;
DROP INDEX IF EXISTS idx_a2a_sessions_status;
DROP INDEX IF EXISTS idx_a2a_sessions_agents;
DROP INDEX IF EXISTS idx_a2a_sessions_started;
DROP INDEX IF EXISTS idx_audit_log_archive_type;
DROP INDEX IF EXISTS idx_audit_log_archive_actor;
DROP INDEX IF EXISTS idx_audit_log_archive_created;
DROP INDEX IF EXISTS idx_audit_log_archive_target;

-- Update migrations version
UPDATE migrations SET value = '6', updated_at = datetime('now') WHERE key = 'version';
```

---

## Data Considerations

### What Will Be Lost

| Data Type         | Impact | Recovery                                      |
| ----------------- | ------ | --------------------------------------------- |
| agent_features    | Lost   | Can be regenerated after agent tasks          |
| agent_models      | Lost   | Need to redeploy/re-train models              |
| task_graphs       | Lost   | Regenerated from workflow executions          |
| a2a_sessions      | Lost   | Not critical, session history only            |
| audit_log_archive | Lost   | Only if archive was populated from audit_logs |

### What Remains Intact

- All existing tables (agents, wallets, tokens, etc.)
- All existing data in existing tables
- All previous migrations

---

## Verification After Rollback

```sql
-- Verify tables dropped
SELECT name FROM sqlite_master WHERE type='table'
  AND name IN ('agent_features', 'agent_models', 'task_graphs', 'a2a_sessions', 'audit_log_archive');

-- Expected: 0 rows (all dropped)

-- Verify migration version
SELECT value FROM migrations WHERE key = 'version';

-- Expected: '6'

-- Verify existing tables still work
SELECT COUNT(*) FROM agents;
SELECT COUNT(*) FROM audit_logs;
```

---

## Emergency Rollback Checklist

- [ ] Stop application deployment
- [ ] Backup database (if possible)
- [ ] Execute rollback via preferred method
- [ ] Verify all 5 tables dropped
- [ ] Verify migration version = 6
- [ ] Verify existing tables accessible
- [ ] Redeploy previous version (v1.8.x)
- [ ] Monitor for errors
- [ ] Document rollback reason

---

## Prevention: Pre-Launch Checks

Before deploying v1.9.0 to production:

- [ ] Run migration on staging first
- [ ] Test application with new tables
- [ ] Verify backup strategy works
- [ ] Document rollback procedure
- [ ] Have database access credentials ready
- [ ] Prepare communication to users

---

## Related Documents

- Migration: `docs/MIGRATION_v190_NEW_TABLES.md`
- Changelog: `CHANGELOG.md`
- Database Schema: `src/lib/db/schema.prisma` (update after migration)

---

## Contact

For rollback assistance:

- Database Team: [contact]
- On-Call: [contact]
