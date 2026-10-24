'use strict'

const { test, describe, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert')
const WorkflowEngine = require('../src/engine/WorkflowEngine')

// ── Mock executors ─────────────────────────────────────────────────────────────

function makeMockExecutor(output = {}) {
  return {
    type: 'mock',
    execute: async (_node, _execution, _input) => output,
  }
}

function makeFailingExecutor(errorMsg = 'mock error') {
  return {
    type: 'mock',
    execute: async (_node, _execution, _input) => {
      throw new Error(errorMsg)
    },
  }
}

// ── Workflow fixture ────────────────────────────────────────────────────────────

function validWorkflow(overrides = {}) {
  return {
    id: 'wf_test_1',
    name: 'Test Workflow',
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
// WorkflowEngine
// ============================================================================

describe('WorkflowEngine', () => {
  let engine

  beforeEach(() => {
    engine = new WorkflowEngine({
      maxParallelTasks: 10,
      checkpointInterval: 5000,
      defaultTimeout: 3600,
    })
  })

  afterEach(() => {
    engine.removeAllListeners()
  })

  // ── registerExecutor ───────────────────────────────────────────────────

  test('registerExecutor stores executor and emits event', () => {
    const executor = makeMockExecutor()
    let received = null
    engine.on('executor:registered', ({ nodeType, executor: ex }) => {
      received = { nodeType, executor: ex }
    })
    engine.registerExecutor('task', executor)
    assert.strictEqual(received.nodeType, 'task')
    assert.strictEqual(received.executor, executor)
  })

  // ── registerWorkflow — valid ───────────────────────────────────────────

  test('registerWorkflow accepts valid workflow and returns id', () => {
    const wf = validWorkflow()
    const id = engine.registerWorkflow(wf)
    assert.strictEqual(id, 'wf_test_1')
    assert.strictEqual(engine.workflows.get('wf_test_1'), wf)
  })

  test('registerWorkflow emits workflow:registered event', () => {
    const wf = validWorkflow()
    let received = null
    engine.on('workflow:registered', (w) => { received = w })
    engine.registerWorkflow(wf)
    assert.strictEqual(received.id, wf.id)
  })

  // ── registerWorkflow — validation errors ───────────────────────────────

  test('registerWorkflow rejects workflow missing id', () => {
    const wf = validWorkflow({ id: undefined })
    assert.throws(() => engine.registerWorkflow(wf), /missing required fields/)
  })

  test('registerWorkflow rejects workflow missing name', () => {
    const wf = validWorkflow({ name: undefined })
    assert.throws(() => engine.registerWorkflow(wf), /missing required fields/)
  })

  test('registerWorkflow rejects workflow missing version', () => {
    const wf = validWorkflow({ version: undefined })
    assert.throws(() => engine.registerWorkflow(wf), /missing required fields/)
  })

  test('registerWorkflow rejects workflow with no nodes', () => {
    const wf = validWorkflow({ nodes: [] })
    assert.throws(() => engine.registerWorkflow(wf), /no nodes defined/)
  })

  test('registerWorkflow rejects workflow with no start node', () => {
    const wf = validWorkflow({
      nodes: [
        { id: 'task_1', type: 'task', name: 'Do Something' },
        { id: 'end_1', type: 'end', name: 'End' },
      ],
    })
    assert.throws(() => engine.registerWorkflow(wf), /no start node/)
  })

  // ── validateWorkflow ──────────────────────────────────────────────────

  test('validateWorkflow returns true for valid workflow', () => {
    assert.strictEqual(engine.validateWorkflow(validWorkflow()), true)
  })

  test('validateWorkflow throws for missing required fields', () => {
    assert.throws(() => engine.validateWorkflow({}), /missing required fields/)
  })

  test('validateWorkflow throws for empty nodes', () => {
    assert.throws(
      () => engine.validateWorkflow({ id: 'x', name: 'x', version: '1.0.0', nodes: [] }),
      /no nodes defined/
    )
  })

  test('validateWorkflow throws for missing start node', () => {
    assert.throws(
      () => engine.validateWorkflow({ id: 'x', name: 'x', version: '1.0.0', nodes: [{ id: 't', type: 'task' }] }),
      /no start node/
    )
  })

  // ── execute — not found ────────────────────────────────────────────────

  test('execute throws when workflow not found', async () => {
    await assert.rejects(
      () => engine.execute('nonexistent', {}),
      /Workflow not found/
    )
  })

  // ── execute — success path ─────────────────────────────────────────────

  test('execute creates execution and runs to completion', async () => {
    const wf = validWorkflow()
    engine.registerWorkflow(wf)
    engine.registerExecutor('start', makeMockExecutor({ started: true }))
    engine.registerExecutor('task', makeMockExecutor({ result: 'ok' }))
    engine.registerExecutor('end', makeMockExecutor({ completed: true }))

    const execution = await engine.execute(wf.id, { myVar: 123 })

    assert.strictEqual(execution.workflowId, wf.id)
    assert.strictEqual(execution.status, 'completed')
    assert.deepStrictEqual(execution.variables, { myVar: 123 })
    assert.ok(execution.startTime)
    assert.ok(execution.endTime)
    assert.ok(Array.isArray(execution.nodeExecutions))
  })

  test('execute emits execution:started then execution:completed', async () => {
    const wf = validWorkflow()
    engine.registerWorkflow(wf)
    engine.registerExecutor('start', makeMockExecutor({ started: true }))
    engine.registerExecutor('task', makeMockExecutor({ result: 'ok' }))
    engine.registerExecutor('end', makeMockExecutor({ completed: true }))

    const events = []
    engine.on('execution:started', (e) => events.push(['started', e.id]))
    engine.on('execution:completed', (e) => events.push(['completed', e.id]))
    engine.on('execution:failed', () => events.push(['failed']))

    const execution = await engine.execute(wf.id)

    assert.deepStrictEqual(events, [
      ['started', execution.id],
      ['completed', execution.id],
    ])
  })

  // ── execute — node failure ─────────────────────────────────────────────

  test('execute fails when node executor throws', async () => {
    const wf = validWorkflow()
    engine.registerWorkflow(wf)
    engine.registerExecutor('start', makeMockExecutor({ started: true }))
    engine.registerExecutor('task', makeFailingExecutor('task failed'))
    engine.registerExecutor('end', makeMockExecutor())

    const execution = await engine.execute(wf.id)

    assert.strictEqual(execution.status, 'failed')
    assert.strictEqual(execution.error.message, 'task failed')
    assert.ok(execution.nodeExecutions.some((n) => n.status === 'failed'))
  })

  test('execute emits execution:failed on node error', async () => {
    const wf = validWorkflow()
    engine.registerWorkflow(wf)
    engine.registerExecutor('start', makeMockExecutor())
    engine.registerExecutor('task', makeFailingExecutor('boom'))
    engine.registerExecutor('end', makeMockExecutor())

    let failedArgs = null
    engine.on('execution:failed', ({ execution, error }) => {
      failedArgs = [execution.id, error.message]
    })

    await engine.execute(wf.id)

    assert.ok(failedArgs !== null)
    assert.strictEqual(failedArgs[1], 'boom')
  })

  // ── execute — retry ───────────────────────────────────────────────────

  test('node retries on failure when retry config is set and eventually succeeds', async () => {
    const wf = validWorkflow({
      nodes: [
        { id: 'start_1', type: 'start', name: 'Start', position: { x: 0, y: 0 } },
        {
          id: 'task_1', type: 'task', name: 'Do Something', position: { x: 100, y: 0 },
          data: { action: 'test', params: {} },
          retry: { maxAttempts: 3, backoffStrategy: 'exponential', initialDelay: 10, maxDelay: 100 },
        },
        { id: 'end_1', type: 'end', name: 'End', position: { x: 200, y: 0 } },
      ],
    })
    engine.registerWorkflow(wf)

    let attempt = 0
    engine.registerExecutor('start', makeMockExecutor())
    engine.registerExecutor('task', {
      execute: async () => {
        attempt++
        if (attempt < 3) throw new Error('attempt ' + attempt + ' failed')
        return { result: 'ok' }
      },
    })
    engine.registerExecutor('end', makeMockExecutor())

    const execution = await engine.execute(wf.id)

    assert.strictEqual(execution.status, 'completed')
    assert.strictEqual(attempt, 3)
  })

  test('node fails permanently when retry attempts exhausted', async () => {
    const wf = validWorkflow({
      nodes: [
        { id: 'start_1', type: 'start', name: 'Start' },
        {
          id: 'task_1', type: 'task', name: 'Do Something',
          data: { action: 'test', params: {} },
          retry: { maxAttempts: 2, backoffStrategy: 'fixed', initialDelay: 5, maxDelay: 10 },
        },
        { id: 'end_1', type: 'end', name: 'End' },
      ],
    })
    engine.registerWorkflow(wf)
    engine.registerExecutor('start', makeMockExecutor())
    engine.registerExecutor('task', makeFailingExecutor('always fails'))
    engine.registerExecutor('end', makeMockExecutor())

    const execution = await engine.execute(wf.id)

    assert.strictEqual(execution.status, 'failed')
  })

  // ── execute — missing executor ────────────────────────────────────────

  test('execute fails when no executor registered for node type', async () => {
    const wf = validWorkflow()
    engine.registerWorkflow(wf)
    engine.registerExecutor('start', makeMockExecutor())
    engine.registerExecutor('end', makeMockExecutor())
    // task executor NOT registered

    const execution = await engine.execute(wf.id)

    assert.strictEqual(execution.status, 'failed')
    assert.ok(execution.error.message.includes('No executor for node type'))
  })

  // ── executeNode — node not found ──────────────────────────────────────

  test('executeNode throws when node not found', async () => {
    const wf = validWorkflow()
    engine.registerWorkflow(wf)
    engine.registerExecutor('start', makeMockExecutor())
    engine.registerExecutor('task', makeMockExecutor())
    engine.registerExecutor('end', makeMockExecutor())

    const execution = await engine.execute(wf.id)

    await assert.rejects(
      () => engine.executeNode(execution, 'ghost_node'),
      /Node not found/
    )
  })

  // ── executeNextNodes — sequential ──────────────────────────────────────

  test('executeNextNodes follows edges sequentially', async () => {
    const execOrder = []
    const wf = {
      id: 'wf_seq',
      name: 'Sequential',
      version: '1.0.0',
      nodes: [
        { id: 'start_1', type: 'start' },
        { id: 'mid_1', type: 'task', name: 'First', data: {} },
        { id: 'mid_2', type: 'task', name: 'Second', data: {} },
        { id: 'end_1', type: 'end' },
      ],
      edges: [
        { id: 'e1', source: 'start_1', target: 'mid_1' },
        { id: 'e2', source: 'mid_1', target: 'mid_2' },
        { id: 'e3', source: 'mid_2', target: 'end_1' },
      ],
    }
    engine.registerWorkflow(wf)
    engine.registerExecutor('start', makeMockExecutor())
    engine.registerExecutor('task', {
      execute: async (node) => {
        execOrder.push(node.name)
        return {}
      },
    })
    engine.registerExecutor('end', makeMockExecutor())

    await engine.execute(wf.id)

    assert.deepStrictEqual(execOrder, ['First', 'Second'])
  })

  // ── executeNextNodes — parallel ────────────────────────────────────────

  test('executeNextNodes executes in parallel when output.parallel is true', async () => {
    let running = 0, maxRunning = 0
    const done = []

    const wf = {
      id: 'wf_parallel',
      name: 'Parallel',
      version: '1.0.0',
      nodes: [
        { id: 'start_1', type: 'start' },
        { id: 'fork', type: 'task', name: 'Fork', data: {} },
        { id: 'branch_a', type: 'task', name: 'A', data: {} },
        { id: 'branch_b', type: 'task', name: 'B', data: {} },
        { id: 'end_1', type: 'end' },
      ],
      edges: [
        { id: 'e1', source: 'start_1', target: 'fork' },
        { id: 'e2', source: 'fork', target: 'branch_a' },
        { id: 'e3', source: 'fork', target: 'branch_b' },
        { id: 'e4', source: 'branch_a', target: 'end_1' },
        { id: 'e5', source: 'branch_b', target: 'end_1' },
      ],
    }
    engine.registerWorkflow(wf)
    engine.registerExecutor('start', makeMockExecutor())
    engine.registerExecutor('task', {
      execute: async (node) => {
        // fork 节点必须返回 { parallel: true } 才会走并行分支
        // （与 executors/index.js 的 ParallelExecutor 行为一致）
        if (node.id === 'fork') return { parallel: true, branches: ['branch_a', 'branch_b'] }
        running++
        maxRunning = Math.max(maxRunning, running)
        await new Promise((r) => setTimeout(r, 20))
        running--
        done.push(node.name)
        return {}
      },
    })
    engine.registerExecutor('end', makeMockExecutor())

    await engine.execute(wf.id)

    assert.ok(maxRunning >= 2, 'Expected parallel execution, maxRunning=' + maxRunning)
  })

  // ── condition evaluation ────────────────────────────────────────────────

  test('evaluateCondition returns true when no condition', () => {
    assert.strictEqual(engine.evaluateCondition(null, {}, {}), true)
    assert.strictEqual(engine.evaluateCondition(undefined, {}, {}), true)
  })

  test('evaluateCondition evaluates simple comparison', () => {
    const execution = { variables: { count: 5 }, output: {} }
    assert.strictEqual(engine.evaluateCondition('${count} > 3', execution, {}), true)
    assert.strictEqual(engine.evaluateCondition('${count} < 3', execution, {}), false)
  })

  test('evaluateCondition returns false on evaluation error', () => {
    const execution = { variables: {}, output: {} }
    let errorEvent = null
    engine.on('condition:error', (e) => { errorEvent = e })
    const result = engine.evaluateCondition('${invalid..path}', execution, {})
    assert.strictEqual(result, false)
    assert.ok(errorEvent !== null)
  })

  // ── resolvePath ────────────────────────────────────────────────────────

  test('resolvePath resolves nested paths', () => {
    const context = { variables: { user: { name: 'Alice' } }, output: { score: 42 } }
    assert.strictEqual(engine.resolvePath('variables.user.name', context), 'Alice')
    assert.strictEqual(engine.resolvePath('output.score', context), 42)
  })

  test('resolvePath returns undefined for missing paths', () => {
    assert.strictEqual(engine.resolvePath('nonexistent', {}), undefined)
    assert.strictEqual(engine.resolvePath('a.b.c', { a: {} }), undefined)
  })

  // ── safeEval ───────────────────────────────────────────────────────────

  test('safeEval resolves ${} placeholders', () => {
    const context = { variables: { x: 5 }, output: {} }
    assert.strictEqual(engine.safeEval('${x} == 5', context), true)
    assert.strictEqual(engine.safeEval('${x} == 10', context), false)
  })

  test('safeEval handles boolean resolved values', () => {
    const context = { variables: { flag: true }, output: {} }
    assert.strictEqual(engine.safeEval('${flag}', context), true)
  })

  // ── calculateBackoff ───────────────────────────────────────────────────

  test('calculateBackoff exponential', () => {
    assert.strictEqual(engine.calculateBackoff({ backoffStrategy: 'exponential', initialDelay: 100, maxDelay: 1000 }, 1), 100)
    assert.strictEqual(engine.calculateBackoff({ backoffStrategy: 'exponential', initialDelay: 100, maxDelay: 1000 }, 2), 200)
    assert.strictEqual(engine.calculateBackoff({ backoffStrategy: 'exponential', initialDelay: 100, maxDelay: 1000 }, 3), 400)
    assert.strictEqual(engine.calculateBackoff({ backoffStrategy: 'exponential', initialDelay: 100, maxDelay: 100 }, 5), 100)
  })

  test('calculateBackoff fixed', () => {
    assert.strictEqual(engine.calculateBackoff({ backoffStrategy: 'fixed', initialDelay: 200, maxDelay: 500 }, 1), 200)
    assert.strictEqual(engine.calculateBackoff({ backoffStrategy: 'fixed', initialDelay: 200, maxDelay: 500 }, 3), 200)
  })

  test('calculateBackoff linear', () => {
    assert.strictEqual(engine.calculateBackoff({ backoffStrategy: 'linear', initialDelay: 100, maxDelay: 500 }, 1), 100)
    assert.strictEqual(engine.calculateBackoff({ backoffStrategy: 'linear', initialDelay: 100, maxDelay: 500 }, 3), 300)
    assert.strictEqual(engine.calculateBackoff({ backoffStrategy: 'linear', initialDelay: 100, maxDelay: 500 }, 10), 500)
  })

  test('calculateBackoff defaults to exponential', () => {
    assert.strictEqual(engine.calculateBackoff({ initialDelay: 100, maxDelay: 1000 }, 3), 400)
  })

  // ── getExecution / getAllExecutions ────────────────────────────────────

  test('getExecution returns execution by id', async () => {
    const wf = validWorkflow()
    engine.registerWorkflow(wf)
    engine.registerExecutor('start', makeMockExecutor())
    engine.registerExecutor('task', makeMockExecutor())
    engine.registerExecutor('end', makeMockExecutor())
    const created = await engine.execute(wf.id)
    const found = engine.getExecution(created.id)
    assert.strictEqual(found.id, created.id)
  })

  test('getExecution returns undefined for unknown id', () => {
    assert.strictEqual(engine.getExecution('unknown'), undefined)
  })

  test('getAllExecutions returns all executions', async () => {
    engine.registerWorkflow(validWorkflow({ id: 'wf_a' }))
    engine.registerWorkflow(validWorkflow({ id: 'wf_b' }))
    engine.registerExecutor('start', makeMockExecutor())
    engine.registerExecutor('task', makeMockExecutor())
    engine.registerExecutor('end', makeMockExecutor())
    await engine.execute('wf_a')
    await engine.execute('wf_b')
    const all = engine.getAllExecutions()
    assert.strictEqual(all.length, 2)
  })

  // ── pauseExecution ─────────────────────────────────────────────────────

  test('pauseExecution sets status to paused and creates checkpoint', () => {
    const execution = {
      id: 'exec_pause',
      workflowId: 'wf_pause',
      status: 'running',
      variables: { x: 1 },
      nodeExecutions: [{ nodeId: 'n1', status: 'completed' }],
      checkpoints: [],
    }
    engine.executions.set(execution.id, execution)

    const paused = engine.pauseExecution(execution.id)

    assert.strictEqual(paused.status, 'paused')
    assert.ok(paused.checkpoints.length > 0)
    assert.strictEqual(paused.checkpoints[0].nodeId, 'n1')
  })

  test('pauseExecution throws for unknown execution', () => {
    assert.throws(() => engine.pauseExecution('ghost'), /Execution not found/)
  })

  // ── cancelExecution ────────────────────────────────────────────────────

  test('cancelExecution sets status to cancelled', async () => {
    const wf = validWorkflow()
    engine.registerWorkflow(wf)
    engine.registerExecutor('start', makeMockExecutor())
    engine.registerExecutor('task', makeMockExecutor())
    engine.registerExecutor('end', makeMockExecutor())
    const execution = await engine.execute(wf.id)
    const cancelled = engine.cancelExecution(execution.id)
    assert.strictEqual(cancelled.status, 'cancelled')
    assert.ok(cancelled.endTime)
  })

  test('cancelExecution throws for unknown execution', () => {
    assert.throws(() => engine.cancelExecution('ghost'), /Execution not found/)
  })

  // ── createCheckpoint ───────────────────────────────────────────────────

  test('createCheckpoint adds checkpoint to execution and engine', () => {
    const execution = {
      id: 'exec_1',
      variables: { x: 1 },
      nodeExecutions: [{ nodeId: 'n1', status: 'completed' }],
      checkpoints: [],
    }
    const cp = engine.createCheckpoint(execution)
    assert.ok(cp.id)
    assert.ok(cp.timestamp)
    assert.strictEqual(cp.nodeId, 'n1')
    assert.strictEqual(execution.checkpoints.length, 1)
    assert.strictEqual(engine.checkpoints.get(cp.id), cp)
  })

  // ── resumeFromCheckpoint ───────────────────────────────────────────────

  test('resumeFromCheckpoint throws when checkpoint not found', async () => {
    await assert.rejects(
      () => engine.resumeFromCheckpoint('ghost'),
      /Checkpoint not found/
    )
  })

  test('resumeFromCheckpoint throws when execution not found for checkpoint', async () => {
    const { v4: uuidv4 } = require('uuid')
    const cpId = uuidv4()
    engine.checkpoints.set(cpId, {
      id: cpId,
      executionId: 'ghost-exec',
      timestamp: new Date().toISOString(),
      nodeId: 'n1',
      state: { variables: {}, nodeExecutions: [] },
    })
    await assert.rejects(
      () => engine.resumeFromCheckpoint(cpId),
      /Execution not found/
    )
  })

  // ── delay ──────────────────────────────────────────────────────────────

  test('delay waits for specified milliseconds', async () => {
    const start = Date.now()
    await engine.delay(30)
    const elapsed = Date.now() - start
    assert.ok(elapsed >= 25, 'Expected ~30ms, got ' + elapsed + 'ms')
  })

  // ── runExecution — no start node ───────────────────────────────────────

  test('runExecution throws when workflow has no start node', async () => {
    const wf = {
      id: 'wf_no_start',
      name: 'No Start',
      version: '1.0.0',
      nodes: [{ id: 'task_1', type: 'task', data: {} }],
      edges: [],
    }
    // registerWorkflow 会先跑 validateWorkflow，对缺 start 节点的工作流直接抛错。
    // 本用例要验证的是 runExecution 自身的防御性检查，
    // 所以绕过注册校验，直接塞进 workflows 表。
    engine.workflows.set(wf.id, wf)
    engine.registerExecutor('task', makeMockExecutor())

    const { v4: uuidv4 } = require('uuid')
    const execution = {
      id: uuidv4(),
      workflowId: wf.id,
      status: 'running',
      variables: {},
      nodeExecutions: [],
      checkpoints: [],
    }
    engine.executions.set(execution.id, execution)

    await assert.rejects(
      () => engine.runExecution(execution),
      /No start node found/
    )
  })

  // ── node events ───────────────────────────────────────────────────────

  test('node:started, node:completed, node:failed events are emitted', async () => {
    const wf = validWorkflow()
    engine.registerWorkflow(wf)
    engine.registerExecutor('start', makeMockExecutor())
    engine.registerExecutor('task', makeFailingExecutor('node error'))
    engine.registerExecutor('end', makeMockExecutor())

    const events = []
    engine.on('node:started', ({ node }) => events.push(['started', node.id]))
    engine.on('node:completed', ({ node }) => events.push(['completed', node.id]))
    engine.on('node:failed', ({ node, error }) => events.push(['failed', node.id, error.message]))

    await engine.execute(wf.id)

    assert.ok(events.some((e) => e[0] === 'started' && e[1] === 'start_1'))
    assert.ok(events.some((e) => e[0] === 'completed' && e[1] === 'start_1'))
    assert.ok(events.some((e) => e[0] === 'failed' && e[1] === 'task_1'))
  })

  // ── edge condition false skips node ───────────────────────────────────

  test('edges with false conditions are skipped', async () => {
    const execOrder = []
    const wf = {
      id: 'wf_cond_skip',
      name: 'Condition Skip',
      version: '1.0.0',
      nodes: [
        { id: 'start_1', type: 'start' },
        { id: 'task_1', type: 'task', data: {} },
        { id: 'skip_me', type: 'task', data: {} },
        { id: 'end_1', type: 'end' },
      ],
      edges: [
        { id: 'e1', source: 'start_1', target: 'task_1' },
        { id: 'e2', source: 'task_1', target: 'skip_me', condition: '${false}' },
        { id: 'e3', source: 'task_1', target: 'end_1' },
      ],
    }
    engine.registerWorkflow(wf)
    engine.registerExecutor('start', makeMockExecutor())
    engine.registerExecutor('task', {
      execute: async (node) => {
        execOrder.push(node.id)
        return {}
      },
    })
    engine.registerExecutor('end', makeMockExecutor())

    await engine.execute(wf.id)

    assert.deepStrictEqual(execOrder, ['task_1'])
    assert.ok(!execOrder.includes('skip_me'))
  })

  // ── duplicate workflow id ─────────────────────────────────────────────

  test('registering same workflow id twice overwrites', () => {
    const wf1 = validWorkflow({ id: 'wf_dup', name: 'First' })
    const wf2 = validWorkflow({ id: 'wf_dup', name: 'Second' })
    engine.registerWorkflow(wf1)
    engine.registerWorkflow(wf2)
    assert.strictEqual(engine.workflows.get('wf_dup').name, 'Second')
  })
})
