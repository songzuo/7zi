/**
 * Execution State Persistence Examples (v1.12.2)
 *
 * 使用示例和最佳实践
 */

import type {
  ExecutionStateData,
  NodeState,
  ExecutionProgress,
} from './execution-storage'
import {
  saveExecutionState,
  loadExecutionState,
  updateExecutionProgress,
  updateNodeState,
  completeExecution,
  failExecution,
  pauseExecution,
  resumeExecution,
  cancelExecution,
  addExecutionLog,
  updateVariables,
  listExecutions,
  deleteExecution,
  clearExpiredExecutions,
} from './execution-storage'

// ============================================
// 示例 1: 基本使用 - 保存和加载执行状态
// ============================================

export async function example1_BasicUsage() {
  console.log('=== Example 1: Basic Usage ===')

  // 创建初始执行状态
  const initialState: ExecutionStateData = {
    workflowId: 'workflow-123',
    workflowName: '数据清洗工作流',
    instanceId: '', // 将由系统生成
    status: 'pending',
    nodeStates: {},
    progress: {
      totalNodes: 5,
      completedNodes: 0,
      failedNodes: 0,
      skippedNodes: 0,
      percentage: 0,
    },
    inputs: {
      dataSource: 'api',
      batchSize: 100,
    },
    outputs: {},
    variables: {
      counter: 0,
    },
    logs: [],
    startTime: Date.now(),
  }

  // 保存执行状态
  const executionId = await saveExecutionState(initialState)
  console.log('Saved execution:', executionId)

  // 加载执行状态
  const loadedState = await loadExecutionState(executionId)
  console.log('Loaded state:', loadedState?.status)

  return executionId
}

// ============================================
// 示例 2: 更新执行进度
// ============================================

export async function example2_UpdateProgress(executionId: string) {
  console.log('=== Example 2: Update Progress ===')

  // 更新进度
  await updateExecutionProgress(executionId, {
    completedNodes: 2,
    failedNodes: 0,
  })

  // 加载并检查
  const state = await loadExecutionState(executionId)
  console.log('Progress:', state?.progress.percentage, '%')
}

// ============================================
// 示例 3: 更新节点状态
// ============================================

export async function example3_UpdateNodeState(executionId: string) {
  console.log('=== Example 3: Update Node State ===')

  // 更新节点状态
  const nodeState: NodeState = {
    nodeId: 'node-1',
    status: 'completed',
    result: {
      success: true,
      data: { processed: 100 },
      duration: 1500,
      startTime: Date.now() - 1500,
      endTime: Date.now(),
    },
  }

  await updateNodeState(executionId, 'node-1', nodeState)

  // 加载并检查
  const state = await loadExecutionState(executionId)
  console.log('Node state:', state?.nodeStates['node-1'])
}

// ============================================
// 示例 4: 标记完成
// ============================================

export async function example4_CompleteExecution(executionId: string) {
  console.log('=== Example 4: Complete Execution ===')

  // 标记完成
  const outputs = {
    result: 'success',
    processedRecords: 500,
  }

  await completeExecution(executionId, outputs)

  // 加载并检查
  const state = await loadExecutionState(executionId)
  console.log('Execution status:', state?.status)
  console.log('Execution outputs:', state?.outputs)
}

// ============================================
// 示例 5: 标记失败
// ============================================

export async function example5_FailExecution(executionId: string) {
  console.log('=== Example 5: Fail Execution ===')

  // 标记失败
  await failExecution(executionId, 'API timeout after 30 seconds')

  // 加载并检查
  const state = await loadExecutionState(executionId)
  console.log('Execution status:', state?.status)
  console.log('Error:', state?.error)
}

// ============================================
// 示例 6: 暂停和恢复
// ============================================

export async function example6_PauseAndResume(executionId: string) {
  console.log('=== Example 6: Pause and Resume ===')

  // 暂停执行
  await pauseExecution(executionId)

  // 加载并检查
  const state = await loadExecutionState(executionId)
  console.log('Paused status:', state?.status)

  // 恢复执行
  const resumeResult = await resumeExecution(executionId)
  console.log('Can resume:', resumeResult.canResume)
  console.log('Resume reason:', resumeResult.reason)
}

// ============================================
// 示例 7: 添加日志
// ============================================

export async function example7_AddLogs(executionId: string) {
  console.log('=== Example 7: Add Logs ===')

  // 添加日志
  await addExecutionLog(executionId, 'info', 'Execution started')
  await addExecutionLog(executionId, 'info', 'Processing node-1', 'node-1')
  await addExecutionLog(executionId, 'warn', 'Slow response from API', 'node-2')
  await addExecutionLog(executionId, 'error', 'Connection timeout', 'node-3')

  // 加载并检查
  const state = await loadExecutionState(executionId)
  console.log('Logs count:', state?.logs.length)
  console.log('Last log:', state?.logs[state!.logs.length - 1])
}

// ============================================
// 示例 8: 更新变量
// ============================================

export async function example8_UpdateVariables(executionId: string) {
  console.log('=== Example 8: Update Variables ===')

  // 更新变量
  await updateVariables(executionId, {
    counter: 10,
    processedItems: 500,
    lastProcessedAt: Date.now(),
  })

  // 加载并检查
  const state = await loadExecutionState(executionId)
  console.log('Variables:', state?.variables)
}

// ============================================
// 示例 9: 列出执行
// ============================================

export async function example9_ListExecutions() {
  console.log('=== Example 9: List Executions ===')

  // 列出所有执行
  const allExecutions = await listExecutions()
  console.log('All executions:', allExecutions.length)

  // 列出特定工作流的执行
  const workflowExecutions = await listExecutions('workflow-123')
  console.log('Workflow executions:', workflowExecutions.length)
}

// ============================================
// 示例 10: 删除和清理
// ============================================

export async function example10_DeleteAndCleanup(executionId: string) {
  console.log('=== Example 10: Delete and Cleanup ===')

  // 删除特定执行
  await deleteExecution(executionId)
  console.log('Deleted execution:', executionId)

  // 清理过期执行
  const clearedCount = await clearExpiredExecutions()
  console.log('Cleared expired executions:', clearedCount)
}

// ============================================
// 示例 11: 完整工作流执行流程
// ============================================

export async function example11_CompleteWorkflow() {
  console.log('=== Example 11: Complete Workflow ===')

  // 1. 初始化执行
  const initialState: ExecutionStateData = {
    workflowId: 'workflow-data-processing',
    workflowName: '数据处理工作流',
    instanceId: '',
    status: 'pending',
    nodeStates: {},
    progress: {
      totalNodes: 3,
      completedNodes: 0,
      failedNodes: 0,
      skippedNodes: 0,
      percentage: 0,
    },
    inputs: {
      source: 'database',
      target: 'api',
    },
    outputs: {},
    variables: {},
    logs: [],
    startTime: Date.now(),
  }

  const executionId = await saveExecutionState(initialState)
  console.log('Step 1: Initialized execution:', executionId)

  // 2. 开始执行
  await addExecutionLog(executionId, 'info', 'Workflow execution started')

  // 3. 执行节点 1
  await addExecutionLog(executionId, 'info', 'Executing node-1', 'node-1')
  await updateNodeState(executionId, 'node-1', {
    nodeId: 'node-1',
    status: 'running',
    startTime: Date.now(),
  })

  // 模拟节点执行
  await new Promise(resolve => setTimeout(resolve, 1000))

  await updateNodeState(executionId, 'node-1', {
    nodeId: 'node-1',
    status: 'completed',
    result: {
      success: true,
      data: { records: 100 },
      duration: 1000,
    },
    endTime: Date.now(),
  })

  // 4. 执行节点 2
  await addExecutionLog(executionId, 'info', 'Executing node-2', 'node-2')
  await updateNodeState(executionId, 'node-2', {
    nodeId: 'node-2',
    status: 'running',
    startTime: Date.now(),
  })

  await new Promise(resolve => setTimeout(resolve, 1000))

  await updateNodeState(executionId, 'node-2', {
    nodeId: 'node-2',
    status: 'completed',
    result: {
      success: true,
      data: { transformed: 100 },
      duration: 1000,
    },
    endTime: Date.now(),
  })

  // 5. 执行节点 3
  await addExecutionLog(executionId, 'info', 'Executing node-3', 'node-3')
  await updateNodeState(executionId, 'node-3', {
    nodeId: 'node-3',
    status: 'running',
    startTime: Date.now(),
  })

  await new Promise(resolve => setTimeout(resolve, 1000))

  await updateNodeState(executionId, 'node-3', {
    nodeId: 'node-3',
    status: 'completed',
    result: {
      success: true,
      data: { exported: 100 },
      duration: 1000,
    },
    endTime: Date.now(),
  })

  // 6. 完成执行
  await completeExecution(executionId, {
    totalRecords: 100,
    status: 'success',
  })

  console.log('Step 6: Execution completed')

  // 7. 验证结果
  const finalState = await loadExecutionState(executionId)
  console.log('Final status:', finalState?.status)
  console.log('Final progress:', finalState?.progress)

  return executionId
}

// ============================================
// 示例 12: 错误处理和恢复
// ============================================

export async function example12_ErrorHandlingAndRecovery() {
  console.log('=== Example 12: Error Handling and Recovery ===')

  // 1. 初始化执行
  const initialState: ExecutionStateData = {
    workflowId: 'workflow-error-test',
    workflowName: '错误测试工作流',
    instanceId: '',
    status: 'pending',
    nodeStates: {},
    progress: {
      totalNodes: 3,
      completedNodes: 0,
      failedNodes: 0,
      skippedNodes: 0,
      percentage: 0,
    },
    inputs: {},
    outputs: {},
    variables: {},
    logs: [],
    startTime: Date.now(),
  }

  const executionId = await saveExecutionState(initialState)
  console.log('Step 1: Initialized execution:', executionId)

  // 2. 执行节点 1（成功）
  await updateNodeState(executionId, 'node-1', {
    nodeId: 'node-1',
    status: 'completed',
    result: { success: true, data: {} },
  })

  // 3. 执行节点 2（失败）
  await updateNodeState(executionId, 'node-2', {
    nodeId: 'node-2',
    status: 'running',
    startTime: Date.now(),
  })

  await addExecutionLog(executionId, 'error', 'API timeout', 'node-2')

  await updateNodeState(executionId, 'node-2', {
    nodeId: 'node-2',
    status: 'failed',
    result: {
      success: false,
      error: 'API timeout after 30 seconds',
      duration: 30000,
    },
    endTime: Date.now(),
  })

  // 4. 标记失败
  await failExecution(executionId, 'Node-2 failed: API timeout')

  console.log('Step 4: Execution failed')

  // 5. 尝试恢复
  const resumeResult = await resumeExecution(executionId)
  console.log('Can resume:', resumeResult.canResume)
  console.log('Resume reason:', resumeResult.reason)

  // 6. 修复后重新执行
  if (!resumeResult.canResume) {
    console.log('Cannot resume, creating new execution...')

    // 创建新执行，跳过已完成的节点
    const newState: ExecutionStateData = {
      ...initialState,
      instanceId: '',
      nodeStates: {
        'node-1': {
          nodeId: 'node-1',
          status: 'completed',
          result: { success: true, data: {} },
        },
      },
      progress: {
        totalNodes: 3,
        completedNodes: 1,
        failedNodes: 0,
        skippedNodes: 0,
        percentage: 33,
      },
    }

    const newExecutionId = await saveExecutionState(newState)
    console.log('Created new execution:', newExecutionId)

    return newExecutionId
  }

  return executionId
}

// ============================================
// 运行所有示例
// ============================================

export async function runAllExamples() {
  console.log('Running all examples...\n')

  try {
    // 示例 1: 基本使用
    const executionId = await example1_BasicUsage()
    console.log()

    // 示例 2: 更新进度
    await example2_UpdateProgress(executionId)
    console.log()

    // 示例 3: 更新节点状态
    await example3_UpdateNodeState(executionId)
    console.log()

    // 示例 7: 添加日志
    await example7_AddLogs(executionId)
    console.log()

    // 示例 8: 更新变量
    await example8_UpdateVariables(executionId)
    console.log()

    // 示例 9: 列出执行
    await example9_ListExecutions()
    console.log()

    // 示例 11: 完整工作流
    const workflowId = await example11_CompleteWorkflow()
    console.log()

    // 示例 12: 错误处理
    await example12_ErrorHandlingAndRecovery()
    console.log()

    // 示例 10: 清理
    await example10_DeleteAndCleanup(executionId)
    await example10_DeleteAndCleanup(workflowId)
    console.log()

    console.log('All examples completed successfully!')
  } catch (error) {
    console.error('Example failed:', error)
  }
}