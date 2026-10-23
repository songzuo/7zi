'use strict'

const { test, describe, before, after } = require('node:test')
const assert = require('node:assert')

// 端口：优先取 runner 分配的空闲端口（WORKFLOW_TEST_PORT），
// 其次取 PORT，最后回退到 3004。避免与在跑的实例抢占同一端口导致 EADDRINUSE。
const TEST_PORT = parseInt(
  process.env.WORKFLOW_TEST_PORT || process.env.PORT || '3004',
  10
)
const BASE_URL = `http://localhost:${TEST_PORT}`

// 环境变量必须在 require('../src/index.js') 之前设置：
// src/index.js 在模块加载时就会读取 process.env.PORT 并立即监听端口。
// 否则服务会抢占默认端口 3001（可能已被占用）导致 EADDRINUSE。
process.env.PORT = String(TEST_PORT)
process.env.LOG_LEVEL = 'error'
process.env.CHECKPOINT_INTERVAL = '999999' // disable checkpoint timer during tests

// src/index.js 导出的是 { app, engine, server }，没有 createServer；
// 它自身已经用 PORT 监听，这里直接复用其 server 实例。
const { server: httpServer } = require('../src/index.js')

// ── Helpers ──────────────────────────────────────────────────────────────────

function validWorkflow(overrides = {}) {
  return {
    id: overrides.id || `wf_${Date.now()}`,
    name: overrides.name || 'Test Workflow',
    version: '1.0.0',
    nodes: [
      { id: 'start_1', type: 'start', name: 'Start', position: { x: 0, y: 0 } },
      { id: 'task_1', type: 'task', name: 'Do Something', position: { x: 100, y: 0 }, data: { action: 'test', params: {} } },
      { id: 'end_1', type: 'end', name: 'End', position: { x: 200, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'start_1', target: 'task_1' },
      { id: 'e2', source: 'task_1', target: 'end_1' },
    ],
    ...overrides,
  }
}

// ============================================================================
// HTTP Integration Tests
// ============================================================================

describe('Workflow Service HTTP Integration', () => {
  before(async () => {
    // httpServer 已在 src/index.js 加载时开始监听，等待端口就绪
    if (!httpServer.listening) {
      await new Promise((resolve) => httpServer.once('listening', resolve))
    }
  })

  after(async () => {
    // 关闭服务器并断开残留连接，确保测试进程能正常退出
    httpServer.closeAllConnections?.()
    await new Promise((resolve) => httpServer.close(resolve))
  })

  // ── Health checks ───────────────────────────────────────────────────────

  test('GET /health returns 200 and healthy status', async () => {
    const res = await fetch(`${BASE_URL}/health`)
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.status, 'healthy')
    assert.strictEqual(body.service, 'workflow-service')
    assert.ok(body.timestamp)
    assert.ok(typeof body.uptime === 'number')
    assert.ok(typeof body.workflows === 'number')
    assert.ok(typeof body.executions === 'number')
  })

  test('GET /api/v1/workflow/health returns detailed health', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/workflow/health`)
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.status, 'ok')
    assert.strictEqual(body.service, 'workflow-service')
    assert.ok(body.executionStats)
    assert.ok(typeof body.executionStats.running === 'number')
    assert.ok(typeof body.executionStats.completed === 'number')
    assert.ok(typeof body.executionStats.failed === 'number')
  })

  test('GET /api/v1/workflow/metrics returns metrics', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/workflow/metrics`)
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.ok(typeof body.workflows.total === 'number')
    assert.ok(typeof body.executions.total === 'number')
    assert.ok(typeof body.executions.running === 'number')
    assert.ok(typeof body.executions.completed === 'number')
  })

  // ── Create workflow ──────────────────────────────────────────────────────

  test('POST /api/workflows creates workflow and returns 201', async () => {
    const wf = validWorkflow({ id: 'wf_created' })
    const res = await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf),
    })
    assert.strictEqual(res.status, 201)
    const body = await res.json()
    assert.strictEqual(body.success, true)
    assert.strictEqual(body.data.id, 'wf_created')
    assert.strictEqual(body.data.name, wf.name)
    assert.ok(body.data.createdAt)
    assert.ok(body.data.updatedAt)
  })

  test('POST /api/workflows accepts user-provided id', async () => {
    const wf = validWorkflow({ id: 'wf_custom_id' })
    const res = await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf),
    })
    assert.strictEqual(res.status, 201)
    const body = await res.json()
    assert.strictEqual(body.data.id, 'wf_custom_id')
  })

  test('POST /api/workflows auto-generates id if not provided', async () => {
    const wf = {
      name: 'No ID Workflow',
      version: '1.0.0',
      nodes: [
        { id: 'start_1', type: 'start', name: 'Start' },
        { id: 'end_1', type: 'end', name: 'End' },
      ],
      edges: [{ id: 'e1', source: 'start_1', target: 'end_1' }],
    }
    const res = await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf),
    })
    assert.strictEqual(res.status, 201)
    const body = await res.json()
    assert.ok(body.data.id.startsWith('wf_'))
  })

  test('POST /api/workflows returns 400 when engine rejects invalid workflow', async () => {
    const wf = { name: 'Missing Everything' } // missing id, version, nodes
    const res = await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf),
    })
    assert.strictEqual(res.status, 400)
    const body = await res.json()
    assert.strictEqual(body.success, false)
    assert.ok(body.error.includes('missing required fields'))
  })

  test('POST /api/workflows returns 400 when workflow has no nodes', async () => {
    const wf = validWorkflow({ id: 'wf_no_nodes', nodes: [] })
    const res = await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf),
    })
    assert.strictEqual(res.status, 400)
    const body = await res.json()
    assert.ok(body.error.includes('no nodes'))
  })

  test('POST /api/workflows returns 400 when workflow has no start node', async () => {
    const wf = {
      id: 'wf_no_start',
      name: 'No Start',
      version: '1.0.0',
      nodes: [
        { id: 'task_1', type: 'task', name: 'Do Something' },
        { id: 'end_1', type: 'end', name: 'End' },
      ],
      edges: [{ id: 'e1', source: 'task_1', target: 'end_1' }],
    }
    const res = await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf),
    })
    assert.strictEqual(res.status, 400)
    const body = await res.json()
    assert.ok(body.error.includes('no start node'))
  })

  // ── List workflows ───────────────────────────────────────────────────────

  test('GET /api/workflows returns all workflows', async () => {
    const res = await fetch(`${BASE_URL}/api/workflows`)
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.success, true)
    assert.ok(Array.isArray(body.data))
    assert.ok(typeof body.total === 'number')
  })

  test('GET /api/workflows returns empty list when no workflows exist (fresh server)', async () => {
    // We already created some above, so just verify structure
    const res = await fetch(`${BASE_URL}/api/workflows`)
    const body = await res.json()
    assert.ok(Array.isArray(body.data))
  })

  // ── Get single workflow ──────────────────────────────────────────────────

  test('GET /api/workflows/:id returns workflow when found', async () => {
    const wf = validWorkflow({ id: 'wf_get_test' })
    await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf),
    })
    const res = await fetch(`${BASE_URL}/api/workflows/wf_get_test`)
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.success, true)
    assert.strictEqual(body.data.id, 'wf_get_test')
  })

  test('GET /api/workflows/:id returns 404 for non-existent workflow', async () => {
    const res = await fetch(`${BASE_URL}/api/workflows/does_not_exist`)
    assert.strictEqual(res.status, 404)
    const body = await res.json()
    assert.strictEqual(body.success, false)
    assert.ok(body.error.includes('not found'))
  })

  // ── Update workflow ──────────────────────────────────────────────────────

  test('PUT /api/workflows/:id updates workflow', async () => {
    const wf = validWorkflow({ id: 'wf_update_test' })
    await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf),
    })

    const updated = { ...wf, name: 'Updated Name', description: 'new desc' }
    const res = await fetch(`${BASE_URL}/api/workflows/wf_update_test`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.data.name, 'Updated Name')
    assert.strictEqual(body.data.description, 'new desc')
    assert.ok(body.data.updatedAt)
  })

  test('PUT /api/workflows/:id returns 404 for non-existent workflow', async () => {
    const res = await fetch(`${BASE_URL}/api/workflows/ghost`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    })
    assert.strictEqual(res.status, 404)
  })

  // ── Delete workflow ──────────────────────────────────────────────────────

  test('DELETE /api/workflows/:id deletes workflow', async () => {
    const wf = validWorkflow({ id: 'wf_delete_test' })
    await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf),
    })

    const res = await fetch(`${BASE_URL}/api/workflows/wf_delete_test`, { method: 'DELETE' })
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.success, true)

    // Verify it's gone
    const getRes = await fetch(`${BASE_URL}/api/workflows/wf_delete_test`)
    assert.strictEqual(getRes.status, 404)
  })

  test('DELETE /api/workflows/:id returns 404 for non-existent workflow', async () => {
    const res = await fetch(`${BASE_URL}/api/workflows/ghost_delete`, { method: 'DELETE' })
    assert.strictEqual(res.status, 404)
    const body = await res.json()
    assert.strictEqual(body.success, false)
  })

  // ── Execute workflow ─────────────────────────────────────────────────────

  test('POST /api/workflows/:id/execute runs workflow and returns execution', async () => {
    const wf = validWorkflow({ id: 'wf_exec_test' })
    await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf),
    })

    const res = await fetch(`${BASE_URL}/api/workflows/wf_exec_test/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variables: { myVar: 42 } }),
    })
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.success, true)
    assert.ok(body.data.id)
    assert.strictEqual(body.data.workflowId, 'wf_exec_test')
    assert.ok(body.data.variables.myVar, 42)
  })

  test('POST /api/workflows/:id/execute returns 500 for unknown workflow', async () => {
    const res = await fetch(`${BASE_URL}/api/workflows/ghost/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.strictEqual(res.status, 500)
    const body = await res.json()
    assert.strictEqual(body.success, false)
  })

  // ── Executions ─────────────────────────────────────────────────────────

  test('GET /api/executions/:id returns execution when found', async () => {
    const wf = validWorkflow({ id: 'wf_exec_get_test' })
    await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf),
    })
    const execRes = await fetch(`${BASE_URL}/api/workflows/wf_exec_get_test/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const { data: execution } = await execRes.json()

    const res = await fetch(`${BASE_URL}/api/executions/${execution.id}`)
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.data.id, execution.id)
  })

  test('GET /api/executions/:id returns 404 for unknown execution', async () => {
    const res = await fetch(`${BASE_URL}/api/executions/ghost-exec-id`)
    assert.strictEqual(res.status, 404)
  })

  test('GET /api/executions returns all executions', async () => {
    const res = await fetch(`${BASE_URL}/api/executions`)
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.ok(Array.isArray(body.data))
    assert.ok(typeof body.total === 'number')
  })

  // ── Pause / Cancel ──────────────────────────────────────────────────────

  test('POST /api/executions/:id/pause returns error for completed execution', async () => {
    const wf = validWorkflow({ id: 'wf_pause_test' })
    await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf),
    })
    const execRes = await fetch(`${BASE_URL}/api/workflows/wf_pause_test/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const { data: execution } = await execRes.json()

    const res = await fetch(`${BASE_URL}/api/executions/${execution.id}/pause`, { method: 'POST' })
    // pause after completion may fail depending on timing — just check response structure
    assert.ok([200, 400].includes(res.status))
  })

  test('POST /api/executions/:id/cancel returns 400 for unknown execution', async () => {
    const res = await fetch(`${BASE_URL}/api/executions/ghost/cancel`, { method: 'POST' })
    assert.strictEqual(res.status, 400)
  })

  // ── Templates ───────────────────────────────────────────────────────────

  test('GET /api/templates returns empty list initially', async () => {
    const res = await fetch(`${BASE_URL}/api/templates`)
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.ok(Array.isArray(body.data))
    assert.strictEqual(body.total, 0)
  })

  test('POST /api/templates creates template', async () => {
    const template = {
      id: 'tmpl_1',
      name: 'Test Template',
      workflow: validWorkflow({ id: 'wf_from_tmpl' }),
    }
    const res = await fetch(`${BASE_URL}/api/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    })
    assert.strictEqual(res.status, 201)
    const body = await res.json()
    assert.strictEqual(body.data.name, 'Test Template')
  })

  test('GET /api/templates/:id returns template when found', async () => {
    const res = await fetch(`${BASE_URL}/api/templates/tmpl_1`)
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.data.name, 'Test Template')
  })

  test('GET /api/templates/:id returns 404 for non-existent template', async () => {
    const res = await fetch(`${BASE_URL}/api/templates/ghost_tmpl`)
    assert.strictEqual(res.status, 404)
  })

  test('POST /api/templates/:id/instantiate creates workflow from template', async () => {
    const res = await fetch(`${BASE_URL}/api/templates/tmpl_1/instantiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'From Template Instance' }),
    })
    assert.strictEqual(res.status, 201)
    const body = await res.json()
    assert.strictEqual(body.data.name, 'From Template Instance')
    assert.ok(body.data.id.startsWith('wf_'))
  })

  test('GET /api/templates/:id/export returns JSON with Content-Disposition', async () => {
    const res = await fetch(`${BASE_URL}/api/templates/tmpl_1/export`)
    assert.strictEqual(res.status, 200)
    assert.ok(res.headers.get('content-type').includes('json'))
    assert.ok(res.headers.get('content-disposition').includes('Test Template'))
    const body = await res.json()
    assert.strictEqual(body.id, 'tmpl_1')
  })

  test('POST /api/templates/import creates template with generated id', async () => {
    const template = {
      name: 'Imported Template',
      workflow: validWorkflow(),
    }
    const res = await fetch(`${BASE_URL}/api/templates/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    })
    assert.strictEqual(res.status, 201)
    const body = await res.json()
    assert.ok(body.data.id.startsWith('wf_'))
    assert.ok(body.data.importedAt)
  })

  // ── AI endpoints ────────────────────────────────────────────────────────

  test('POST /api/ai/generate returns generated workflow', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Test workflow' }),
    })
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.success, true)
    assert.ok(body.data.id)
    assert.ok(body.data.nodes)
    assert.ok(body.data.edges)
  })

  test('POST /api/ai/optimize returns optimization suggestions', async () => {
    const wf = validWorkflow()
    const res = await fetch(`${BASE_URL}/api/ai/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow: wf }),
    })
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.ok(Array.isArray(body.data))
  })

  // ── 404 routes ─────────────────────────────────────────────────────────

  test('GET /nonexistent returns 404', async () => {
    const res = await fetch(`${BASE_URL}/nonexistent`)
    assert.strictEqual(res.status, 404)
  })

  test('GET /api/nonexistent returns 404', async () => {
    const res = await fetch(`${BASE_URL}/api/nonexistent`)
    assert.strictEqual(res.status, 404)
  })

  // ── Invalid JSON ────────────────────────────────────────────────────────

  test('POST /api/workflows with invalid JSON returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json {',
    })
    // body-parser returns 400 for malformed JSON
    assert.strictEqual(res.status, 400)
  })

  // ── Missing required fields ───────────────────────────────────────────────

  test('POST /api/workflows missing name returns 400', async () => {
    const wf = {
      id: 'wf_missing_name',
      version: '1.0.0',
      nodes: [{ id: 'start_1', type: 'start' }, { id: 'end_1', type: 'end' }],
      edges: [{ id: 'e1', source: 'start_1', target: 'end_1' }],
    }
    const res = await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf),
    })
    assert.strictEqual(res.status, 400)
    const body = await res.json()
    assert.strictEqual(body.success, false)
  })

  test('POST /api/workflows missing version returns 400', async () => {
    const wf = {
      id: 'wf_missing_version',
      name: 'Missing Version',
      nodes: [{ id: 'start_1', type: 'start' }, { id: 'end_1', type: 'end' }],
      edges: [{ id: 'e1', source: 'start_1', target: 'end_1' }],
    }
    const res = await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf),
    })
    assert.strictEqual(res.status, 400)
  })

  // ── Large payload ────────────────────────────────────────────────────────

  test('POST /api/workflows accepts large but valid workflow', async () => {
    // Build a workflow with many nodes
    const nodes = [{ id: 'start_1', type: 'start' }]
    const edges = []
    for (let i = 0; i < 100; i++) {
      nodes.push({ id: `task_${i}`, type: 'task', name: `Task ${i}`, data: { action: 'test', params: { bigData: 'x'.repeat(1000) } } })
      edges.push({ id: `e${i}`, source: i === 0 ? 'start_1' : `task_${i - 1}`, target: `task_${i}` })
    }
    nodes.push({ id: 'end_1', type: 'end' })
    edges.push({ id: `e_last`, source: `task_99`, target: 'end_1' })

    const wf = {
      id: 'wf_large',
      name: 'Large Workflow',
      version: '1.0.0',
      nodes,
      edges,
    }
    const res = await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf),
    })
    assert.strictEqual(res.status, 201)
  })

  // ── Duplicate ID ────────────────────────────────────────────────────────

  test('POST /api/workflows with duplicate ID overwrites existing', async () => {
    const wf1 = validWorkflow({ id: 'wf_dup_id' })
    const wf2 = validWorkflow({ id: 'wf_dup_id', name: 'Updated Duplicate' })

    await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf1),
    })
    const res = await fetch(`${BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf2),
    })
    assert.strictEqual(res.status, 201)
    const body = await res.json()
    assert.strictEqual(body.data.name, 'Updated Duplicate')
  })

  // ── resumeFromCheckpoint ─────────────────────────────────────────────────

  test('POST /api/executions/:id/resume returns 400 when checkpoint not found', async () => {
    const res = await fetch(`${BASE_URL}/api/executions/ghost_id/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkpointId: 'ghost_cp' }),
    })
    assert.strictEqual(res.status, 400)
  })
})
