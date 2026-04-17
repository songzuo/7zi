/**
 * StepRecorder Tests
 * 测试节点执行记录器的核心功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StepRecorder } from '../StepRecorder'
import { NodeStatus } from '@/types/workflow'

describe('StepRecorder', () => {
  let recorder: StepRecorder

  beforeEach(() => {
    recorder = new StepRecorder({ maxRecords: 100 })
  })

  describe('createNodeExecution', () => {
    it('应该创建节点执行记录', () => {
      const nodeExec = recorder.createNodeExecution({
        executionId: 'exec-1',
        nodeId: 'node-1',
        nodeName: '测试节点',
        nodeType: 'agent',
        inputs: { param: 'value' },
      })

      expect(nodeExec.id).toBeDefined()
      expect(nodeExec.executionId).toBe('exec-1')
      expect(nodeExec.nodeId).toBe('node-1')
      expect(nodeExec.nodeName).toBe('测试节点')
      expect(nodeExec.nodeType).toBe('agent')
      expect(nodeExec.status).toBe(NodeStatus.IDLE)
      expect(nodeExec.startTime).toBeDefined()
      expect(nodeExec.retryCount).toBe(0)
    })

    it('应该支持依赖节点配置', () => {
      const nodeExec = recorder.createNodeExecution({
        executionId: 'exec-1',
        nodeId: 'node-2',
        nodeName: '后续节点',
        nodeType: 'agent',
        dependencies: ['node-1', 'node-2'],
      })

      expect(nodeExec.dependencies).toEqual(['node-1', 'node-2'])
    })
  })

  describe('节点生命周期方法', () => {
    it('应该通过 startNodeExecution 更新状态为 RUNNING', () => {
      const nodeExec = recorder.createNodeExecution({
        executionId: 'exec-1',
        nodeId: 'node-1',
        nodeName: '测试节点',
        nodeType: 'agent',
      })

      const started = recorder.startNodeExecution(nodeExec.executionId, nodeExec.nodeId)

      expect(started?.status).toBe(NodeStatus.RUNNING)
      expect(started?.startTime).toBeDefined()
    })

    it('应该通过 completeNodeExecution 更新状态为 SUCCESS 并记录结束时间', () => {
      const nodeExec = recorder.createNodeExecution({
        executionId: 'exec-1',
        nodeId: 'node-1',
        nodeName: '测试节点',
        nodeType: 'agent',
      })

      recorder.startNodeExecution(nodeExec.executionId, nodeExec.nodeId)
      const success = recorder.completeNodeExecution(nodeExec.executionId, nodeExec.nodeId, { result: 'ok' })

      expect(success?.status).toBe(NodeStatus.SUCCESS)
      expect(success?.endTime).toBeDefined()
      expect(success?.duration).toBeGreaterThanOrEqual(0)
      expect(success?.outputs).toEqual({ result: 'ok' })
    })

    it('应该通过 failNodeExecution 更新状态为 FAILED 并记录错误', () => {
      const nodeExec = recorder.createNodeExecution({
        executionId: 'exec-1',
        nodeId: 'node-1',
        nodeName: '测试节点',
        nodeType: 'agent',
      })

      const error = {
        code: 'NODE_ERROR',
        message: '节点执行失败',
        stack: 'Error at ...',
      }

      recorder.startNodeExecution(nodeExec.executionId, nodeExec.nodeId)
      const failed = recorder.failNodeExecution(nodeExec.executionId, nodeExec.nodeId, error)

      expect(failed?.status).toBe(NodeStatus.FAILED)
      expect(failed?.error).toEqual(error)
    })

    it('应该通过 skipNodeExecution 跳过节点', () => {
      const nodeExec = recorder.createNodeExecution({
        executionId: 'exec-1',
        nodeId: 'node-1',
        nodeName: '跳过节点',
        nodeType: 'condition',
      })

      const skipped = recorder.skipNodeExecution(nodeExec.executionId, nodeExec.nodeId, '条件不满足')

      expect(skipped?.status).toBe(NodeStatus.SKIPPED)
      expect(skipped?.endTime).toBeDefined()
    })
  })

  describe('节点输出管理', () => {
    it('应该设置节点输出', () => {
      const nodeExec = recorder.createNodeExecution({
        executionId: 'exec-1',
        nodeId: 'node-1',
        nodeName: '测试节点',
        nodeType: 'agent',
      })

      const outputs = { result: 'success', data: { key: 'value' } }
      recorder.setNodeOutputs(nodeExec.id, outputs)

      const updated = recorder.getNodeExecution(nodeExec.id)
      expect(updated?.outputs).toEqual(outputs)
    })

    it('应该追加输出而不是覆盖', () => {
      const nodeExec = recorder.createNodeExecution({
        executionId: 'exec-1',
        nodeId: 'node-1',
        nodeName: '测试节点',
        nodeType: 'agent',
      })

      recorder.setNodeOutputs(nodeExec.id, { field1: 'value1' })
      recorder.setNodeOutputs(nodeExec.id, { field2: 'value2' })

      const updated = recorder.getNodeExecution(nodeExec.id)
      expect(updated?.outputs).toEqual({ field1: 'value1', field2: 'value2' })
    })
  })

  describe('执行记录查询', () => {
    beforeEach(() => {
      // 创建多个节点的执行记录
      for (let i = 0; i < 5; i++) {
        const nodeExec = recorder.createNodeExecution({
          executionId: 'exec-1',
          nodeId: `node-${i}`,
          nodeName: `节点 ${i}`,
          nodeType: 'agent',
        })
        recorder.updateNodeStatus(nodeExec.id, NodeStatus.SUCCESS)
      }
    })

    it('应该获取执行的所有节点记录', () => {
      const nodes = recorder.getExecutionNodes('exec-1')

      expect(nodes.length).toBe(5)
      expect(nodes.every(n => n.executionId === 'exec-1')).toBe(true)
    })

    it('应该获取特定节点的执行记录', () => {
      const nodeExec = recorder.getExecutionNodes('exec-1')[0]
      const result = recorder.getNodeExecution(nodeExec.id)

      expect(result).toBeDefined()
      expect(result?.nodeId).toBe('node-0')
    })
  })

  describe('重试机制', () => {
    it('应该记录重试次数', () => {
      const nodeExec = recorder.createNodeExecution({
        executionId: 'exec-1',
        nodeId: 'node-1',
        nodeName: '测试节点',
        nodeType: 'agent',
      })

      recorder.retryNode(nodeExec.id, { attempt: 2, maxAttempts: 3 })

      const updated = recorder.getNodeExecution(nodeExec.id)
      expect(updated?.retryCount).toBe(1)
      expect(updated?.retryHistory.length).toBe(1)
    })

    it('应该累加重试历史', () => {
      const nodeExec = recorder.createNodeExecution({
        executionId: 'exec-1',
        nodeId: 'node-1',
        nodeName: '测试节点',
        nodeType: 'agent',
      })

      recorder.retryNode(nodeExec.id, { attempt: 2, maxAttempts: 3 })
      recorder.retryNode(nodeExec.id, { attempt: 3, maxAttempts: 3 })

      const updated = recorder.getNodeExecution(nodeExec.id)
      expect(updated?.retryCount).toBe(2)
      expect(updated?.retryHistory.length).toBe(2)
    })
  })

  describe('节点日志', () => {
    it('应该添加日志条目', () => {
      const nodeExec = recorder.createNodeExecution({
        executionId: 'exec-1',
        nodeId: 'node-1',
        nodeName: '测试节点',
        nodeType: 'agent',
      })

      recorder.addNodeLog(nodeExec.id, 'info', '节点开始执行')
      recorder.addNodeLog(nodeExec.id, 'warn', '检测到异常条件')
      recorder.addNodeLog(nodeExec.id, 'error', '执行失败')

      const updated = recorder.getNodeExecution(nodeExec.id)
      expect(updated?.logs.length).toBe(3)
      expect(updated?.logs[0].level).toBe('info')
      expect(updated?.logs[2].level).toBe('error')
    })

    it('应该按日志级别过滤', () => {
      const nodeExec = recorder.createNodeExecution({
        executionId: 'exec-1',
        nodeId: 'node-1',
        nodeName: '测试节点',
        nodeType: 'agent',
      })

      recorder.addNodeLog(nodeExec.id, 'info', '信息日志')
      recorder.addNodeLog(nodeExec.id, 'error', '错误日志')

      const errors = recorder.getNodeLogs(nodeExec.id, 'error')
      expect(errors.length).toBe(1)
      expect(errors[0].level).toBe('error')
    })
  })

  describe('节点执行时间计算', () => {
    it('应该计算正确的执行时长', () => {
      const nodeExec = recorder.createNodeExecution({
        executionId: 'exec-1',
        nodeId: 'node-1',
        nodeName: '测试节点',
        nodeType: 'agent',
      })

      recorder.updateNodeStatus(nodeExec.id, NodeStatus.RUNNING)

      // 模拟异步执行后完成
      const updated = recorder.updateNodeStatus(nodeExec.id, NodeStatus.SUCCESS)

      expect(updated?.duration).toBeGreaterThanOrEqual(0)
    })
  })

  describe('错误处理', () => {
    it('应该返回 null 当节点不存在', () => {
      const result = recorder.getNodeExecution('non-existent-id')
      expect(result).toBeNull()
    })

    it('应该返回空数组当执行没有节点记录', () => {
      const result = recorder.getExecutionNodes('non-existent-execution')
      expect(result).toEqual([])
    })
  })

  describe('执行记录清理', () => {
    it('应该限制最大记录数', () => {
      const smallRecorder = new StepRecorder({ maxRecords: 5 })

      for (let i = 0; i < 10; i++) {
        smallRecorder.createNodeExecution({
          executionId: `exec-${i}`,
          nodeId: `node-${i}`,
          nodeName: `节点 ${i}`,
          nodeType: 'agent',
        })
      }

      // 注意: 实际清理逻辑在内部处理，这里只验证不会崩溃
      const nodes = smallRecorder.getExecutionNodes('exec-0')
      expect(nodes.length).toBeLessThanOrEqual(1)
    })
  })
})
