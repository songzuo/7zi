/**
 * Execution State Storage Tests
 *
 * 测试执行状态持久化功能
 *
 * @package 7zi-frontend
 * @version 1.12.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { executionStateStorage, type PersistentExecutionState } from '@/lib/storage/execution-state-storage'

describe('Execution State Storage', () => {
  beforeEach(() => {
    // 清除 sessionStorage
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  describe('基本功能', () => {
    it('应该保存和加载执行状态', async () => {
      const state: PersistentExecutionState = {
        executionId: 'exec-123',
        workflowId: 'workflow-456',
        currentNodeId: 'node-1',
        nodeStates: {
          'node-1': {
            status: 'running',
            timestamp: new Date().toISOString(),
          },
          'node-2': {
            status: 'completed',
            result: { success: true, data: 'test' },
            timestamp: new Date().toISOString(),
          },
        },
        variables: {
          var1: 'value1',
          var2: 42,
        },
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const saved = await executionStateStorage.saveExecutionState(state)
      expect(saved).toBe(true)

      const loaded = await executionStateStorage.loadExecutionState()
      expect(loaded).not.toBeNull()
      expect(loaded?.executionId).toBe('exec-123')
      expect(loaded?.workflowId).toBe('workflow-456')
      expect(loaded?.currentNodeId).toBe('node-1')
      expect(loaded?.nodeStates['node-1'].status).toBe('running')
      expect(loaded?.nodeStates['node-2'].status).toBe('completed')
      expect(loaded?.variables.var1).toBe('value1')
      expect(loaded?.variables.var2).toBe(42)
    })

    it('应该清除执行状态', async () => {
      const state: PersistentExecutionState = {
        executionId: 'exec-123',
        workflowId: 'workflow-456',
        currentNodeId: null,
        nodeStates: {},
        variables: {},
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await executionStateStorage.saveExecutionState(state)
      expect(await executionStateStorage.hasExecutionState()).toBe(true)

      const cleared = await executionStateStorage.clearExecutionState()
      expect(cleared).toBe(true)
      expect(await executionStateStorage.hasExecutionState()).toBe(false)
    })

    it('应该检查是否存在执行状态', async () => {
      expect(await executionStateStorage.hasExecutionState()).toBe(false)

      const state: PersistentExecutionState = {
        executionId: 'exec-123',
        workflowId: 'workflow-456',
        currentNodeId: null,
        nodeStates: {},
        variables: {},
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await executionStateStorage.saveExecutionState(state)
      expect(await executionStateStorage.hasExecutionState()).toBe(true)
    })
  })

  describe('节点状态更新', () => {
    it('应该更新节点状态', async () => {
      const state: PersistentExecutionState = {
        executionId: 'exec-123',
        workflowId: 'workflow-456',
        currentNodeId: null,
        nodeStates: {},
        variables: {},
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await executionStateStorage.saveExecutionState(state)

      const updated = await executionStateStorage.updateNodeState('node-1', 'running')
      expect(updated).toBe(true)

      const loaded = await executionStateStorage.loadExecutionState()
      expect(loaded?.nodeStates['node-1'].status).toBe('running')
      expect(loaded?.currentNodeId).toBe('node-1')
    })

    it('应该更新节点状态并包含结果', async () => {
      const state: PersistentExecutionState = {
        executionId: 'exec-123',
        workflowId: 'workflow-456',
        currentNodeId: null,
        nodeStates: {},
        variables: {},
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await executionStateStorage.saveExecutionState(state)

      const result = { success: true, data: 'test result' }
      const updated = await executionStateStorage.updateNodeState('node-1', 'completed', result)
      expect(updated).toBe(true)

      const loaded = await executionStateStorage.loadExecutionState()
      expect(loaded?.nodeStates['node-1'].status).toBe('completed')
      expect(loaded?.nodeStates['node-1'].result).toEqual(result)
      expect(loaded?.currentNodeId).toBeNull()
    })
  })

  describe('变量更新', () => {
    it('应该更新变量', async () => {
      const state: PersistentExecutionState = {
        executionId: 'exec-123',
        workflowId: 'workflow-456',
        currentNodeId: null,
        nodeStates: {},
        variables: {
          var1: 'value1',
        },
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await executionStateStorage.saveExecutionState(state)

      const updated = await executionStateStorage.updateVariables({
        var2: 'value2',
        var3: 42,
      })
      expect(updated).toBe(true)

      const loaded = await executionStateStorage.loadExecutionState()
      expect(loaded?.variables.var1).toBe('value1')
      expect(loaded?.variables.var2).toBe('value2')
      expect(loaded?.variables.var3).toBe(42)
    })
  })

  describe('暂停和恢复', () => {
    it('应该暂停执行', async () => {
      const state: PersistentExecutionState = {
        executionId: 'exec-123',
        workflowId: 'workflow-456',
        currentNodeId: 'node-1',
        nodeStates: {
          'node-1': { status: 'running' },
        },
        variables: {},
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await executionStateStorage.saveExecutionState(state)

      const paused = await executionStateStorage.pauseExecution()
      expect(paused).toBe(true)

      const loaded = await executionStateStorage.loadExecutionState()
      expect(loaded?.pausedAt).toBeDefined()
    })

    it('应该恢复执行', async () => {
      const state: PersistentExecutionState = {
        executionId: 'exec-123',
        workflowId: 'workflow-456',
        currentNodeId: 'node-1',
        nodeStates: {
          'node-1': { status: 'running' },
        },
        variables: {},
        startedAt: new Date().toISOString(),
        pausedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await executionStateStorage.saveExecutionState(state)

      const resumed = await executionStateStorage.resumeExecution()
      expect(resumed).toBe(true)

      const loaded = await executionStateStorage.loadExecutionState()
      expect(loaded?.pausedAt).toBeUndefined()
    })
  })

  describe('执行摘要', () => {
    it('应该返回执行摘要', async () => {
      const state: PersistentExecutionState = {
        executionId: 'exec-123',
        workflowId: 'workflow-456',
        currentNodeId: 'node-3',
        nodeStates: {
          'node-1': { status: 'completed' },
          'node-2': { status: 'completed' },
          'node-3': { status: 'running' },
          'node-4': { status: 'failed' },
        },
        variables: {},
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await executionStateStorage.saveExecutionState(state)

      const summary = await executionStateStorage.getExecutionSummary()
      expect(summary.hasState).toBe(true)
      expect(summary.executionId).toBe('exec-123')
      expect(summary.workflowId).toBe('workflow-456')
      expect(summary.isPaused).toBe(false)
      expect(summary.totalNodes).toBe(4)
      expect(summary.completedNodes).toBe(2)
      expect(summary.runningNodes).toBe(1)
      expect(summary.failedNodes).toBe(1)
    })

    it('应该返回空摘要当没有状态时', async () => {
      const summary = await executionStateStorage.getExecutionSummary()
      expect(summary.hasState).toBe(false)
      expect(summary.totalNodes).toBe(0)
      expect(summary.completedNodes).toBe(0)
      expect(summary.runningNodes).toBe(0)
      expect(summary.failedNodes).toBe(0)
    })
  })

  describe('错误处理', () => {
    it('应该处理无效数据', async () => {
      // 保存无效数据
      sessionStorage.setItem('7zi_workflow_execution_state', 'invalid json')

      const loaded = await executionStateStorage.loadExecutionState()
      expect(loaded).toBeNull()
    })

    it('应该处理缺少必要字段的数据', async () => {
      // 保存缺少必要字段的数据
      sessionStorage.setItem(
        '7zi_workflow_execution_state',
        JSON.stringify({
          executionId: 'exec-123',
          // 缺少 workflowId
        })
      )

      const loaded = await executionStateStorage.loadExecutionState()
      expect(loaded).toBeNull()
    })
  })

  describe('创建持久化状态', () => {
    it('应该从执行实例创建持久化状态', () => {
      const instance = {
        id: 'exec-123',
        workflowId: 'workflow-456',
        status: 'running' as const,
        startTime: Date.now(),
        progress: {
          total: 3,
          completed: 1,
          failed: 0,
        },
        variables: [
          { name: 'var1', value: 'value1', type: 'string' },
          { name: 'var2', defaultValue: 42, type: 'number' },
        ],
      }

      const nodeStates = {
        'node-1': { status: 'completed' as const },
        'node-2': { status: 'running' as const },
      }

      const state = executionStateStorage.createPersistentState(
        'exec-123',
        'workflow-456',
        instance,
        'node-2',
        nodeStates
      )

      expect(state.executionId).toBe('exec-123')
      expect(state.workflowId).toBe('workflow-456')
      expect(state.currentNodeId).toBe('node-2')
      expect(state.nodeStates).toEqual(nodeStates)
      expect(state.variables.var1).toBe('value1')
      expect(state.variables.var2).toBe(42)
      expect(state.startedAt).toBeDefined()
      expect(state.updatedAt).toBeDefined()
    })
  })
})