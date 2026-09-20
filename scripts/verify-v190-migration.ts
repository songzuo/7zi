#!/usr/bin/env tsx
/**
 * Migration Verification Script for v1.9.0
 *
 * This script verifies that the v1.9.0 migration was successful
 * by checking table existence, indexes, and basic functionality.
 */

import { getDatabaseAsync } from '../src/lib/db/connection'
import { getCurrentVersion } from '../src/lib/db/migrations'
import { logger } from '../src/lib/logger'

interface VerificationResult {
  success: boolean
  migrationVersion: number
  tables: {
    expected: string[]
    existing: string[]
    missing: string[]
  }
  indexes: {
    expected: number
    existing: number
  }
  tests: Array<{
    name: string
    passed: boolean
    error?: string
  }>
}

async function verifyMigration(): Promise<VerificationResult> {
  const db = await getDatabaseAsync()
  const result: VerificationResult = {
    success: false,
    migrationVersion: 0,
    tables: {
      expected: [
        'agent_features',
        'agent_models',
        'task_graphs',
        'a2a_sessions',
        'audit_log_archive',
      ],
      existing: [],
      missing: [],
    },
    indexes: {
      expected: 15,
      existing: 0,
    },
    tests: [],
  }

  // Test 1: Check migration version
  try {
    result.migrationVersion = await getCurrentVersion()
    const passed = result.migrationVersion >= 7
    result.tests.push({
      name: 'Migration version >= 7',
      passed,
      error: passed ? undefined : `Current version: ${result.migrationVersion}`,
    })
  } catch (error) {
    result.tests.push({
      name: 'Migration version check',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 2: Check table existence
  try {
    const tables = db.queryRows(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    const existingTables = tables.map(r => r.name as string)
    result.tables.existing = existingTables.filter(t => result.tables.expected.includes(t))
    result.tables.missing = result.tables.expected.filter(t => !existingTables.includes(t))

    const passed = result.tables.missing.length === 0
    result.tests.push({
      name: 'All 5 tables exist',
      passed,
      error: passed ? undefined : `Missing: ${result.tables.missing.join(', ')}`,
    })
  } catch (error) {
    result.tests.push({
      name: 'Table existence check',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 3: Check indexes
  try {
    const indexes = db.queryRows(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
    )
    result.indexes.existing = indexes.length

    const passed = result.indexes.existing >= result.indexes.expected
    result.tests.push({
      name: `At least ${result.indexes.expected} indexes exist`,
      passed,
      error: passed
        ? undefined
        : `Found: ${result.indexes.existing}, Expected: ${result.indexes.expected}`,
    })
  } catch (error) {
    result.tests.push({
      name: 'Index count check',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 4: Test INSERT into agent_features
  try {
    const testId = 'test-agent-001'
    db.exec(`
      INSERT INTO agent_features (id, agent_id, success_rate, reliability)
      VALUES ('${testId}', '${testId}', 0.95, 0.98)
    `)

    const row = db.queryRows(`SELECT * FROM agent_features WHERE agent_id = '${testId}'`)

    const passed = row.length === 1
    result.tests.push({
      name: 'INSERT/SELECT on agent_features',
      passed,
      error: passed ? undefined : `Expected 1 row, got ${row.length}`,
    })

    // Cleanup
    db.exec(`DELETE FROM agent_features WHERE agent_id = '${testId}'`)
  } catch (error) {
    result.tests.push({
      name: 'INSERT/SELECT on agent_features',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 5: Test INSERT into agent_models
  try {
    const testId = 'test-model-001'
    db.exec(`
      INSERT INTO agent_models (id, model_name, model_type, is_active)
      VALUES ('${testId}', 'test_model', 'time_prediction', 1)
    `)

    const row = db.queryRows(`SELECT * FROM agent_models WHERE id = '${testId}'`)

    const passed = row.length === 1
    result.tests.push({
      name: 'INSERT/SELECT on agent_models',
      passed,
      error: passed ? undefined : `Expected 1 row, got ${row.length}`,
    })

    // Cleanup
    db.exec(`DELETE FROM agent_models WHERE id = '${testId}'`)
  } catch (error) {
    result.tests.push({
      name: 'INSERT/SELECT on agent_models',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 6: Test INSERT into task_graphs
  try {
    const testId = 'test-graph-001'
    db.exec(`
      INSERT INTO task_graphs (id, workflow_id, graph_data, node_count, edge_count)
      VALUES ('${testId}', 'workflow-001', '{"nodes": [], "edges": []}', 0, 0)
    `)

    const row = db.queryRows(`SELECT * FROM task_graphs WHERE id = '${testId}'`)

    const passed = row.length === 1
    result.tests.push({
      name: 'INSERT/SELECT on task_graphs',
      passed,
      error: passed ? undefined : `Expected 1 row, got ${row.length}`,
    })

    // Cleanup
    db.exec(`DELETE FROM task_graphs WHERE id = '${testId}'`)
  } catch (error) {
    result.tests.push({
      name: 'INSERT/SELECT on task_graphs',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 7: Test INSERT into a2a_sessions
  try {
    const testId = 'test-session-001'
    db.exec(`
      INSERT INTO a2a_sessions (id, session_id, agent_a, agent_b, status)
      VALUES ('${testId}', '${testId}', 'agent-001', 'agent-002', 'active')
    `)

    const row = db.queryRows(`SELECT * FROM a2a_sessions WHERE session_id = '${testId}'`)

    const passed = row.length === 1
    result.tests.push({
      name: 'INSERT/SELECT on a2a_sessions',
      passed,
      error: passed ? undefined : `Expected 1 row, got ${row.length}`,
    })

    // Cleanup
    db.exec(`DELETE FROM a2a_sessions WHERE session_id = '${testId}'`)
  } catch (error) {
    result.tests.push({
      name: 'INSERT/SELECT on a2a_sessions',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 8: Test INSERT into audit_log_archive
  try {
    const testId = 'test-audit-001'
    db.exec(`
      INSERT INTO audit_log_archive (id, event_type, actor_id, action)
      VALUES ('${testId}', 'test_event', 'user-001', 'test_action')
    `)

    const row = db.queryRows(`SELECT * FROM audit_log_archive WHERE id = '${testId}'`)

    const passed = row.length === 1
    result.tests.push({
      name: 'INSERT/SELECT on audit_log_archive',
      passed,
      error: passed ? undefined : `Expected 1 row, got ${row.length}`,
    })

    // Cleanup
    db.exec(`DELETE FROM audit_log_archive WHERE id = '${testId}'`)
  } catch (error) {
    result.tests.push({
      name: 'INSERT/SELECT on audit_log_archive',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Overall success
  result.success = result.tests.every(t => t.passed)

  return result
}

async function main() {
  console.log('🔍 Verifying v1.9.0 Migration...\n')

  const result = await verifyMigration()

  // Print results
  console.log('📊 Migration Version:', result.migrationVersion)
  console.log(
    '📋 Tables:',
    `${result.tables.existing.length}/${result.tables.expected.length} exist`
  )
  console.log('🔑 Indexes:', `${result.indexes.existing}/${result.indexes.expected} exist`)
  console.log('\n🧪 Test Results:')

  for (const test of result.tests) {
    const icon = test.passed ? '✅' : '❌'
    console.log(`  ${icon} ${test.name}`)
    if (test.error) {
      console.log(`     Error: ${test.error}`)
    }
  }

  console.log('\n' + '='.repeat(50))
  if (result.success) {
    console.log('✅ Migration verification PASSED')
    console.log('='.repeat(50))
    process.exit(0)
  } else {
    console.log('❌ Migration verification FAILED')
    console.log('='.repeat(50))
    process.exit(1)
  }
}

main().catch(error => {
  console.error('❌ Verification script error:', error)
  process.exit(1)
})
