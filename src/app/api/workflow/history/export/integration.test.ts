/**
 * Workflow History Export API — Integration Tests
 *
 * Unlike `route.test.ts` (fully mocked service), this suite exercises the
 * REAL `workflowHistoryService` implementation on top of a REAL in-memory
 * SQLite database, so the route contract is validated end to end:
 * - CSV export payload shape (header row + escaped fields)
 * - JSON export payload shape (exportedAt / totalRecords / entries / summary)
 * - Filter propagation (workflowId / operation / userId / success)
 * - Empty-result export (zero record count)
 *
 * The database connection module reads DATABASE_PATH lazily on first use, so
 * the env var is set before the module graph is imported.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

process.env.DATABASE_PATH = ':memory:'

// The global test setup replaces `@/lib/db/connection` with a hand written
// in-memory table stub. That stub only understands a very small subset of SQL
// (its WHERE-clause parameter binding is not faithful), which makes it useless
// for validating the real aggregation / CSV-escaping behaviour of
// `workflowHistoryService`. Restore the real implementation here so the route
// is exercised against actual SQLite.
vi.mock('@/lib/db/connection', async () => {
  return await vi.importActual<typeof import('@/lib/db/connection')>('@/lib/db/connection')
})

import { getDatabaseAsync } from '@/lib/db/connection'
import { workflowHistoryService } from '@/lib/workflow/history'
import { POST } from './route'

const WORKFLOW_ID = 'wf_export_it'

function createRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('/api/workflow/history/export', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function resetTable() {
  const db = await getDatabaseAsync()
  db.exec('DELETE FROM workflow_history')
}

async function seedEntries() {
  await workflowHistoryService.recordOperation({
    workflowId: WORKFLOW_ID,
    operation: 'create',
    description: 'Created "quoted" workflow',
    userId: 'user_a',
    userName: 'Alice',
    details: { workflowName: 'Quoted, workflow' },
    success: true,
    duration: 100,
  })
  await workflowHistoryService.recordOperation({
    workflowId: WORKFLOW_ID,
    operation: 'execute',
    description: 'Executed workflow',
    userId: 'user_b',
    userName: 'Bob',
    details: {},
    success: false,
    errorCode: 'EXECUTION_FAILED',
    errorMessage: 'boom',
    duration: 200,
  })
  await workflowHistoryService.recordOperation({
    workflowId: 'other_workflow',
    operation: 'update',
    description: 'Unrelated workflow',
    userId: 'user_a',
    details: {},
    success: true,
  })
}

describe('POST /api/workflow/history/export (integration with real history service)', () => {
  beforeAll(async () => {
    const db = await getDatabaseAsync()
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_history (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        description TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT,
        ip_address TEXT,
        user_agent TEXT,
        details TEXT NOT NULL DEFAULT '{}',
        success INTEGER NOT NULL DEFAULT 1,
        error_code TEXT,
        error_message TEXT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        duration INTEGER,
        related_version_id TEXT,
        related_instance_id TEXT,
        related_node_id TEXT
      )
    `)
  })

  beforeEach(async () => {
    await resetTable()
    await seedEntries()
  })

  afterAll(async () => {
    await resetTable()
  })

  it('should export CSV rows only for the filtered workflow', async () => {
    const response = await POST(createRequest({ format: 'csv', filter: { workflowId: WORKFLOW_ID } }))
    const csv = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/csv')
    expect(response.headers.get('X-Record-Count')).toBe('2')
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="workflow_history_.*\.csv"$/
    )

    const lines = csv.split('\n')
    expect(lines[0]).toBe(
      'Timestamp,Workflow ID,Operation,Description,User ID,User Name,IP Address,Success,Error Code,Error Message,Duration (ms),Related Version ID,Related Instance ID,Related Node ID'
    )
    expect(lines).toHaveLength(3)
    expect(csv).toContain(WORKFLOW_ID)
    expect(csv).not.toContain('other_workflow')
  })

  it('should escape double quotes in the CSV description column', async () => {
    const response = await POST(createRequest({ format: 'csv', filter: { workflowId: WORKFLOW_ID } }))
    const csv = await response.text()

    expect(csv).toContain('"Created ""quoted"" workflow"')
  })

  it('should export JSON with the full audit payload shape', async () => {
    const response = await POST(createRequest({ format: 'json', filter: { workflowId: WORKFLOW_ID } }))
    const payload = JSON.parse(await response.text())

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(response.headers.get('X-Record-Count')).toBe('2')
    expect(payload.totalRecords).toBe(2)
    expect(payload.entries).toHaveLength(2)
    expect(typeof payload.exportedAt).toBe('string')
    expect(payload.summary.byUser).toEqual({ user_a: 1, user_b: 1 })
    expect(payload.summary.successRate).toBe(0.5)
    expect(payload.summary.avgDuration).toBe(150)
    expect(payload.entries.every((e: { workflowId: string }) => e.workflowId === WORKFLOW_ID)).toBe(true)
  })

  it('should honour the success filter', async () => {
    const response = await POST(
      createRequest({ format: 'json', filter: { workflowId: WORKFLOW_ID, success: false } })
    )
    const payload = JSON.parse(await response.text())

    expect(response.status).toBe(200)
    expect(payload.totalRecords).toBe(1)
    expect(payload.entries[0].operation).toBe('execute')
    expect(payload.entries[0].errorCode).toBe('EXECUTION_FAILED')
    expect(payload.entries[0].errorMessage).toBe('boom')
  })

  it('should honour the operation and userId filters', async () => {
    const response = await POST(
      createRequest({
        format: 'json',
        filter: { workflowId: WORKFLOW_ID, operation: 'create', userId: 'user_a' },
      })
    )
    const payload = JSON.parse(await response.text())

    expect(response.status).toBe(200)
    expect(payload.totalRecords).toBe(1)
    expect(payload.entries[0].operation).toBe('create')
    expect(payload.summary.byOperation).toEqual({ create: 1 })
  })

  it('should export every entry when no filter is provided', async () => {
    const response = await POST(createRequest({ format: 'json' }))
    const payload = JSON.parse(await response.text())

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Record-Count')).toBe('3')
    expect(payload.totalRecords).toBe(3)
  })

  it('should return an empty export when nothing matches the filter', async () => {
    const response = await POST(
      createRequest({ format: 'csv', filter: { workflowId: 'workflow_that_does_not_exist' } })
    )
    const csv = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Record-Count')).toBe('0')
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="workflow_history_empty.csv"'
    )
    expect(csv).toBe('')
  })
})
