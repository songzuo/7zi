/**
 * 工作流执行器类型定义测试
 *
 * 测试覆盖:
 * 1. createExecutionContext - 创建执行上下文
 * 2. addLog - 添加日志
 * 3. calculateDuration - 计算执行时长
 */

import { describe, it, expect } from 'vitest'
import {
  createExecutionContext,
  addLog,
  calculateDuration,
  ExecutionContext,
  LogEntry,
} from '@/lib/workflow/types'
import { WorkflowNode, NodeType } from '@/types/workflow'

describe('createExecutionContext', () => {
  it('应该创建基本的执行上下文', () => {
    const node: WorkflowNode = {
      id: 'test-node',
      type: NodeType.AGENT,
      name: '测试节点',
      position: { x: 0, y: 0 },
    }

    const context = createExecutionContext('instance-1', 'workflow-1', node, {}, {})

    expect(context.instanceId).toBe('instance-1')
    expect(context.workflowId).toBe('workflow-1')
    expect(context.node).toEqual(node)
    expect(context.variables).toEqual({})
    expect(context.inputs).toEqual({})
    expect(context.outputs).toEqual({})
    expect(context.logs).toEqual([])
  })

  it('应该正确设置变量', () => {
    const node: WorkflowNode = {
      id: 'test-node',
      type: NodeType.AGENT,
      name: '测试节点',
      position: { x: 0, y: 0 },
    }

    const variables = { var1: 'value1', var2: 123 }
    const context = createExecutionContext('instance-1', 'workflow-1', node, variables, {})

    expect(context.variables).toEqual(variables)
  })

  it('应该正确设置输入', () => {
    const node: WorkflowNode = {
      id: 'test-node',
      type: NodeType.AGENT,
      name: '测试节点',
      position: { x: 0, y: 0 },
    }

    const inputs = { input1: 'value1', input2: [1, 2, 3] }
    const context = createExecutionContext('instance-1', 'workflow-1', node, {}, inputs)

    expect(context.inputs).toEqual(inputs)
  })

  it('应该正确设置输出', () => {
    const node: WorkflowNode = {
      id: 'test-node',
      type: NodeType.AGENT,
      name: '测试节点',
      position: { x: 0, y: 0 },
    }

    const outputs = { result: 'success', data: { key: 'value' } }
    const context = createExecutionContext('instance-1', 'workflow-1', node, {}, {}, outputs)

    expect(context.outputs).toEqual(outputs)
  })

  it('默认输出应该为空对象', () => {
    const node: WorkflowNode = {
      id: 'test-node',
      type: NodeType.AGENT,
      name: '测试节点',
      position: { x: 0, y: 0 },
    }

    const context = createExecutionContext('instance-1', 'workflow-1', node, {}, {})

    expect(context.outputs).toEqual({})
  })

  it('应该初始化空日志数组', () => {
    const node: WorkflowNode = {
      id: 'test-node',
      type: NodeType.AGENT,
      name: '测试节点',
      position: { x: 0, y: 0 },
    }

    const context = createExecutionContext('instance-1', 'workflow-1', node, {}, {})

    expect(Array.isArray(context.logs)).toBe(true)
    expect(context.logs).toHaveLength(0)
  })
})

describe('addLog', () => {
  it('应该添加 info 级别日志', () => {
    const context: ExecutionContext = {
      instanceId: 'instance-1',
      workflowId: 'workflow-1',
      node: {
        id: 'test-node',
        type: NodeType.AGENT,
        name: '测试节点',
        position: { x: 0, y: 0 },
      },
      variables: {},
      inputs: {},
      outputs: {},
      logs: [],
    }

    addLog(context, 'info', '测试信息日志')

    expect(context.logs).toHaveLength(1)
    expect(context.logs[0].level).toBe('info')
    expect(context.logs[0].message).toBe('测试信息日志')
    expect(context.logs[0].timestamp).toBeDefined()
  })

  it('应该添加 warn 级别日志', () => {
    const context: ExecutionContext = {
      instanceId: 'instance-1',
      workflowId: 'workflow-1',
      node: {
        id: 'test-node',
        type: NodeType.AGENT,
        name: '测试节点',
        position: { x: 0, y: 0 },
      },
      variables: {},
      inputs: {},
      outputs: {},
      logs: [],
    }

    addLog(context, 'warn', '测试警告日志')

    expect(context.logs).toHaveLength(1)
    expect(context.logs[0].level).toBe('warn')
  })

  it('应该添加 error 级别日志', () => {
    const context: ExecutionContext = {
      instanceId: 'instance-1',
      workflowId: 'workflow-1',
      node: {
        id: 'test-node',
        type: NodeType.AGENT,
        name: '测试节点',
        position: { x: 0, y: 0 },
      },
      variables: {},
      inputs: {},
      outputs: {},
      logs: [],
    }

    addLog(context, 'error', '测试错误日志')

    expect(context.logs).toHaveLength(1)
    expect(context.logs[0].level).toBe('error')
  })

  it('应该添加多条日志', () => {
    const context: ExecutionContext = {
      instanceId: 'instance-1',
      workflowId: 'workflow-1',
      node: {
        id: 'test-node',
        type: NodeType.AGENT,
        name: '测试节点',
        position: { x: 0, y: 0 },
      },
      variables: {},
      inputs: {},
      outputs: {},
      logs: [],
    }

    addLog(context, 'info', '日志1')
    addLog(context, 'warn', '日志2')
    addLog(context, 'error', '日志3')

    expect(context.logs).toHaveLength(3)
    expect(context.logs[0].message).toBe('日志1')
    expect(context.logs[1].message).toBe('日志2')
    expect(context.logs[2].message).toBe('日志3')
  })

  it('日志时间戳应该是有效的 ISO 字符串', () => {
    const context: ExecutionContext = {
      instanceId: 'instance-1',
      workflowId: 'workflow-1',
      node: {
        id: 'test-node',
        type: NodeType.AGENT,
        name: '测试节点',
        position: { x: 0, y: 0 },
      },
      variables: {},
      inputs: {},
      outputs: {},
      logs: [],
    }

    addLog(context, 'info', '测试日志')

    const timestamp = context.logs[0].timestamp
    const date = new Date(timestamp)
    expect(date.toISOString()).toBe(timestamp)
  })
})

describe('calculateDuration', () => {
  it('应该计算两个日期字符串之间的时长', () => {
    const startTime = '2024-01-01T10:00:00.000Z'
    const endTime = '2024-01-01T10:00:01.000Z'

    const duration = calculateDuration(startTime, endTime)

    expect(duration).toBe(1000) // 1 秒 = 1000 毫秒
  })

  it('应该计算两个 Date 对象之间的时长', () => {
    const startTime = new Date('2024-01-01T10:00:00.000Z')
    const endTime = new Date('2024-01-01T10:00:05.000Z')

    const duration = calculateDuration(startTime, endTime)

    expect(duration).toBe(5000) // 5 秒 = 5000 毫秒
  })

  it('应该支持混合类型输入', () => {
    const startTime = '2024-01-01T10:00:00.000Z'
    const endTime = new Date('2024-01-01T10:00:02.000Z')

    const duration = calculateDuration(startTime, endTime)

    expect(duration).toBe(2000)
  })

  it('应该返回毫秒精度', () => {
    const startTime = '2024-01-01T10:00:00.000Z'
    const endTime = '2024-01-01T10:00:00.500Z'

    const duration = calculateDuration(startTime, endTime)

    expect(duration).toBe(500) // 500 毫秒
  })

  it('开始时间晚于结束时间应该返回负数', () => {
    const startTime = '2024-01-01T10:00:01.000Z'
    const endTime = '2024-01-01T10:00:00.000Z'

    const duration = calculateDuration(startTime, endTime)

    expect(duration).toBe(-1000)
  })

  it('相同时间应该返回 0', () => {
    const time = '2024-01-01T10:00:00.000Z'

    const duration = calculateDuration(time, time)

    expect(duration).toBe(0)
  })
})

describe('ExecutionContext 类型测试', () => {
  it('应该包含所有必需字段', () => {
    const context: ExecutionContext = {
      instanceId: 'test-instance',
      workflowId: 'test-workflow',
      node: {
        id: 'node-1',
        type: NodeType.AGENT,
        name: '测试节点',
        position: { x: 0, y: 0 },
      },
      variables: { key: 'value' },
      inputs: { input: 'data' },
      outputs: { output: 'result' },
      logs: [],
    }

    expect(context.instanceId).toBeDefined()
    expect(context.workflowId).toBeDefined()
    expect(context.node).toBeDefined()
    expect(context.variables).toBeDefined()
    expect(context.inputs).toBeDefined()
    expect(context.outputs).toBeDefined()
    expect(context.logs).toBeDefined()
  })
})

describe('LogEntry 类型测试', () => {
  it('应该支持 info 级别', () => {
    const entry: LogEntry = {
      level: 'info',
      message: '测试信息',
      timestamp: new Date().toISOString(),
    }

    expect(entry.level).toBe('info')
  })

  it('应该支持 warn 级别', () => {
    const entry: LogEntry = {
      level: 'warn',
      message: '测试警告',
      timestamp: new Date().toISOString(),
    }

    expect(entry.level).toBe('warn')
  })

  it('应该支持 error 级别', () => {
    const entry: LogEntry = {
      level: 'error',
      message: '测试错误',
      timestamp: new Date().toISOString(),
    }

    expect(entry.level).toBe('error')
  })
})
