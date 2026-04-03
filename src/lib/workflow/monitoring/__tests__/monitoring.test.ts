/**
 * 工作流执行监控系统测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExecutionTracker } from '../ExecutionTracker'
import { StepRecorder } from '../StepRecorder'
import { MetricsCollector } from '../MetricsCollector'
import { AlertManager } from '../AlertManager'
import { WorkflowMonitoring } from '../index'
import { WorkflowExecutionStatus, AlertLevel, AlertType } from '../types'
import { NodeStatus } from '@/types/workflow'

describe('ExecutionTracker', () => {
  let tracker: ExecutionTracker

  beforeEach(() => {
    tracker = new ExecutionTracker()
  })

  it('should create execution record', () => {
    const execution = tracker.createExecution({
      workflowId: 'wf_1',
      workflowName: 'Test Workflow',
      workflowVersion: 1,
      triggeredBy: 'user_1',
      triggerType: 'manual',
      nodeCount: 5,
    })

    expect(execution.id).toBeDefined()
    expect(execution.workflowId).toBe('wf_1')
    expect(execution.status).toBe(WorkflowExecutionStatus.PENDING)
    expect(execution.nodeCount).toBe(5)
  })

  it('should update execution status', () => {
    const execution = tracker.createExecution({
      workflowId: 'wf_1',
      workflowName: 'Test Workflow',
      workflowVersion: 1,
      triggeredBy: 'user_1',
      triggerType: 'manual',
      nodeCount: 5,
    })

    const updated = tracker.updateStatus(execution.id, WorkflowExecutionStatus.RUNNING)
    expect(updated?.status).toBe(WorkflowExecutionStatus.RUNNING)

    const completed = tracker.updateStatus(execution.id, WorkflowExecutionStatus.COMPLETED)
    expect(completed?.status).toBe(WorkflowExecutionStatus.COMPLETED)
    expect(completed?.endTime).toBeDefined()
    expect(completed?.duration).toBeDefined()
  })

  it('should update execution progress', () => {
    const execution = tracker.createExecution({
      workflowId: 'wf_1',
      workflowName: 'Test Workflow',
      workflowVersion: 1,
      triggeredBy: 'user_1',
      triggerType: 'manual',
      nodeCount: 5,
    })

    tracker.updateProgress(execution.id, { completed: 2, failed: 1 })
    const updated = tracker.getExecution(execution.id)
    
    expect(updated?.completedNodes).toBe(2)
    expect(updated?.failedNodes).toBe(1)
  })

  it('should get executions with filters', () => {
    // 创建多个执行
    tracker.createExecution({
      workflowId: 'wf_1',
      workflowName: 'Test 1',
      workflowVersion: 1,
      triggeredBy: 'user_1',
      triggerType: 'manual',
      nodeCount: 3,
    })

    tracker.createExecution({
      workflowId: 'wf_1',
      workflowName: 'Test 1',
      workflowVersion: 1,
      triggeredBy: 'user_1',
      triggerType: 'api',
      nodeCount: 3,
    })

    const result = tracker.getExecutions({ workflowId: 'wf_1' })
    expect(result.total).toBe(2)

    const filtered = tracker.getExecutions({ workflowId: 'wf_1', triggerType: 'api' })
    expect(filtered.total).toBe(1)
  })

  it('should get execution summary', () => {
    const exec1 = tracker.createExecution({
      workflowId: 'wf_1',
      workflowName: 'Test',
      workflowVersion: 1,
      triggeredBy: 'user_1',
      triggerType: 'manual',
      nodeCount: 3,
    })

    const exec2 = tracker.createExecution({
      workflowId: 'wf_1',
      workflowName: 'Test',
      workflowVersion: 1,
      triggeredBy: 'user_1',
      triggerType: 'manual',
      nodeCount: 3,
    })

    tracker.updateStatus(exec1.id, WorkflowExecutionStatus.COMPLETED)
    tracker.updateStatus(exec2.id, WorkflowExecutionStatus.FAILED, {
      code: 'TEST_ERROR',
      message: 'Test error',
    })

    const summary = tracker.getSummary('wf_1')
    expect(summary.totalExecutions).toBe(2)
    expect(summary.successCount).toBe(1)
    expect(summary.failureCount).toBe(1)
    expect(summary.successRate).toBe(50)
  })
})

describe('StepRecorder', () => {
  let recorder: StepRecorder

  beforeEach(() => {
    recorder = new StepRecorder()
  })

  it('should create node execution record', () => {
    const nodeExec = recorder.createNodeExecution({
      executionId: 'exec_1',
      nodeId: 'node_1',
      nodeName: 'Start Node',
      nodeType: 'start',
      inputs: { input: 'value' },
    })

    expect(nodeExec.id).toBeDefined()
    expect(nodeExec.nodeId).toBe('node_1')
    expect(nodeExec.status).toBe(NodeStatus.IDLE)
    expect(nodeExec.inputs).toEqual({ input: 'value' })
  })

  it('should track node execution lifecycle', () => {
    recorder.createNodeExecution({
      executionId: 'exec_1',
      nodeId: 'node_1',
      nodeName: 'Test Node',
      nodeType: 'agent',
    })

    // 开始执行
    const started = recorder.startNodeExecution('exec_1', 'node_1')
    expect(started?.status).toBe(NodeStatus.RUNNING)

    // 完成执行
    const completed = recorder.completeNodeExecution(
      'exec_1',
      'node_1',
      { output: 'result' },
      { cpuTime: 100 }
    )
    expect(completed?.status).toBe(NodeStatus.SUCCESS)
    expect(completed?.outputs).toEqual({ output: 'result' })
    expect(completed?.metrics?.cpuTime).toBe(100)
    expect(completed?.duration).toBeDefined()
  })

  it('should handle node failures', () => {
    recorder.createNodeExecution({
      executionId: 'exec_1',
      nodeId: 'node_1',
      nodeName: 'Test Node',
      nodeType: 'agent',
    })

    const failed = recorder.failNodeExecution('exec_1', 'node_1', {
      code: 'EXEC_ERROR',
      message: 'Execution failed',
    })

    expect(failed?.status).toBe(NodeStatus.FAILED)
    expect(failed?.error?.code).toBe('EXEC_ERROR')
  })

  it('should record retries', () => {
    recorder.createNodeExecution({
      executionId: 'exec_1',
      nodeId: 'node_1',
      nodeName: 'Test Node',
      nodeType: 'agent',
    })

    recorder.recordRetry('exec_1', 'node_1', 'First error')
    recorder.recordRetry('exec_1', 'node_1', 'Second error')

    const nodeExec = recorder.findNodeExecution('exec_1', 'node_1')
    expect(nodeExec?.retryCount).toBe(2)
    expect(nodeExec?.retryHistory).toHaveLength(2)
  })

  it('should get node execution stats', () => {
    recorder.createNodeExecution({
      executionId: 'exec_1',
      nodeId: 'node_1',
      nodeName: 'Node 1',
      nodeType: 'start',
    })
    recorder.startNodeExecution('exec_1', 'node_1')
    recorder.completeNodeExecution('exec_1', 'node_1')

    recorder.createNodeExecution({
      executionId: 'exec_1',
      nodeId: 'node_2',
      nodeName: 'Node 2',
      nodeType: 'agent',
    })
    recorder.startNodeExecution('exec_1', 'node_2')
    recorder.failNodeExecution('exec_1', 'node_2', {
      code: 'ERROR',
      message: 'Failed',
    })

    const stats = recorder.getNodeStats('exec_1')
    expect(stats.total).toBe(2)
    expect(stats.completed).toBe(1)
    expect(stats.failed).toBe(1)
  })
})

describe('MetricsCollector', () => {
  let tracker: ExecutionTracker
  let recorder: StepRecorder
  let collector: MetricsCollector

  beforeEach(() => {
    tracker = new ExecutionTracker()
    recorder = new StepRecorder()
    collector = new MetricsCollector(tracker, recorder)
  })

  it('should calculate execution metrics', () => {
    const execution = tracker.createExecution({
      workflowId: 'wf_1',
      workflowName: 'Test',
      workflowVersion: 1,
      triggeredBy: 'user_1',
      triggerType: 'manual',
      nodeCount: 2,
    })

    // 更新执行状态
    tracker.updateStatus(execution.id, WorkflowExecutionStatus.COMPLETED)

    // 创建节点执行记录
    const node1 = recorder.createNodeExecution({
      executionId: execution.id,
      nodeId: 'node_1',
      nodeName: 'Node 1',
      nodeType: 'start',
    })
    recorder.startNodeExecution(execution.id, 'node_1')
    recorder.completeNodeExecution(execution.id, 'node_1', { output: 'result' }, { cpuTime: 100 })

    const node2 = recorder.createNodeExecution({
      executionId: execution.id,
      nodeId: 'node_2',
      nodeName: 'Node 2',
      nodeType: 'end',
    })
    recorder.startNodeExecution(execution.id, 'node_2')
    recorder.completeNodeExecution(execution.id, 'node_2', {}, { cpuTime: 200 })

    const metrics = collector.getExecutionMetrics('wf_1', execution.id)
    
    expect(metrics).toBeDefined()
    expect(metrics?.successRate).toBe(100)
    expect(metrics?.nodeMetrics).toHaveLength(2)
    expect(metrics?.totalCpuTime).toBe(300)
  })

  it('should get workflow metrics', () => {
    // 创建多个执行
    const exec1 = tracker.createExecution({
      workflowId: 'wf_1',
      workflowName: 'Test',
      workflowVersion: 1,
      triggeredBy: 'user_1',
      triggerType: 'manual',
      nodeCount: 1,
    })
    tracker.updateStatus(exec1.id, WorkflowExecutionStatus.COMPLETED)

    recorder.createNodeExecution({
      executionId: exec1.id,
      nodeId: 'node_1',
      nodeName: 'Node 1',
      nodeType: 'start',
    })
    recorder.startNodeExecution(exec1.id, 'node_1')
    recorder.completeNodeExecution(exec1.id, 'node_1', {}, { cpuTime: 100 })

    const metrics = collector.getWorkflowMetrics('wf_1')
    
    expect(metrics.totalExecutions).toBe(1)
    expect(metrics.nodeMetrics).toHaveLength(1)
  })
})

describe('AlertManager', () => {
  let manager: AlertManager

  beforeEach(() => {
    manager = new AlertManager()
  })

  it('should create and resolve alerts', () => {
    const alert = manager.createAlert({
      executionId: 'exec_1',
      type: AlertType.NODE_FAILURE,
      level: AlertLevel.ERROR,
      message: 'Node failed',
      details: { nodeId: 'node_1' },
    })

    expect(alert.id).toBeDefined()
    expect(alert.status).toBe('active')

    manager.resolveAlert(alert.id)
    const resolved = manager.getAlert(alert.id)
    expect(resolved?.status).toBe('resolved')
  })

  it('should detect node failures', () => {
    const nodeExec = {
      id: 'ne_1',
      executionId: 'exec_1',
      nodeId: 'node_1',
      nodeName: 'Test Node',
      nodeType: 'agent',
      status: NodeStatus.FAILED,
      startTime: new Date().toISOString(),
      retryCount: 0,
      retryHistory: [],
      logs: [],
      dependencies: [],
      error: {
        code: 'EXEC_ERROR',
        message: 'Execution failed',
      },
    }

    const alert = manager.checkNodeFailure(nodeExec as any)
    expect(alert).toBeDefined()
    expect(alert?.type).toBe(AlertType.NODE_FAILURE)
  })

  it('should detect circular dependencies', () => {
    const nodes = [
      { id: 'A', dependencies: ['B'] },
      { id: 'B', dependencies: ['C'] },
      { id: 'C', dependencies: ['A'] }, // 循环: A -> B -> C -> A
    ]

    const cycles = manager.checkWorkflowDependencies(nodes)
    expect(cycles.length).toBeGreaterThan(0)
  })

  it('should check thresholds', () => {
    const breached = manager.checkThreshold(
      'exec_1',
      'duration',
      5000,
      { value: 3000, operator: 'gt' }
    )
    expect(breached).toBe(true)

    const alerts = manager.getExecutionAlerts('exec_1')
    expect(alerts.length).toBeGreaterThan(0)
  })

  it('should get alert stats', () => {
    manager.createAlert({
      executionId: 'exec_1',
      type: AlertType.NODE_FAILURE,
      level: AlertLevel.ERROR,
      message: 'Error 1',
    })

    manager.createAlert({
      executionId: 'exec_1',
      type: AlertType.EXECUTION_TIMEOUT,
      level: AlertLevel.WARNING,
      message: 'Warning 1',
    })

    const stats = manager.getAlertStats()
    expect(stats.total).toBe(2)
    expect(stats.active).toBe(2)
    expect(stats.byLevel[AlertLevel.ERROR]).toBe(1)
    expect(stats.byLevel[AlertLevel.WARNING]).toBe(1)
  })
})

describe('WorkflowMonitoring', () => {
  let monitoring: WorkflowMonitoring

  beforeEach(() => {
    monitoring = new WorkflowMonitoring()
  })

  it('should track complete execution lifecycle', async () => {
    // 开始执行
    const execution = monitoring.startExecution({
      workflowId: 'wf_1',
      workflowName: 'Test Workflow',
      workflowVersion: 1,
      triggeredBy: 'user_1',
      triggerType: 'manual',
      nodeCount: 2,
    })

    expect(execution.status).toBe(WorkflowExecutionStatus.PENDING)

    // 更新状态为运行中
    monitoring.updateExecutionStatus(execution.id, WorkflowExecutionStatus.RUNNING)

    // 开始节点执行
    monitoring.startNode(execution.id, 'node_1', 'Start', 'start')
    
    // 完成节点
    monitoring.completeNode(execution.id, 'node_1', { result: 'ok' })

    // 开始第二个节点
    monitoring.startNode(execution.id, 'node_2', 'End', 'end', { input: 'data' })
    monitoring.completeNode(execution.id, 'node_2')

    // 完成执行
    monitoring.updateExecutionStatus(execution.id, WorkflowExecutionStatus.COMPLETED)

    // 验证结果
    const details = monitoring.getExecutionDetails(execution.id)
    expect(details.execution?.status).toBe(WorkflowExecutionStatus.COMPLETED)
    expect(details.nodes).toHaveLength(2)
    expect(details.metrics).toBeDefined()
  })

  it('should handle failed executions', () => {
    const execution = monitoring.startExecution({
      workflowId: 'wf_1',
      workflowName: 'Test',
      workflowVersion: 1,
      triggeredBy: 'user_1',
      triggerType: 'manual',
      nodeCount: 1,
    })

    monitoring.updateExecutionStatus(execution.id, WorkflowExecutionStatus.RUNNING)
    monitoring.startNode(execution.id, 'node_1', 'Node', 'agent')
    monitoring.failNode(execution.id, 'node_1', {
      code: 'ERROR',
      message: 'Failed',
    })

    monitoring.updateExecutionStatus(execution.id, WorkflowExecutionStatus.FAILED, {
      nodeId: 'node_1',
      code: 'ERROR',
      message: 'Failed',
    })

    const details = monitoring.getExecutionDetails(execution.id)
    expect(details.execution?.status).toBe(WorkflowExecutionStatus.FAILED)
    expect(details.alerts.length).toBeGreaterThan(0)
  })

  it('should support event listeners', () => {
    const eventHandler = vi.fn()
    monitoring.on('started', eventHandler)

    monitoring.startExecution({
      workflowId: 'wf_1',
      workflowName: 'Test',
      workflowVersion: 1,
      triggeredBy: 'user_1',
      triggerType: 'manual',
      nodeCount: 1,
    })

    expect(eventHandler).toHaveBeenCalled()
  })

  it('should cancel execution', () => {
    const execution = monitoring.startExecution({
      workflowId: 'wf_1',
      workflowName: 'Test',
      workflowVersion: 1,
      triggeredBy: 'user_1',
      triggerType: 'manual',
      nodeCount: 1,
    })

    const cancelled = monitoring.cancelExecution(execution.id)
    expect(cancelled?.status).toBe(WorkflowExecutionStatus.CANCELLED)
  })
})