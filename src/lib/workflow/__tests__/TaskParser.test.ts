/**
 * @fileoverview 自然语言任务解析器测试
 * @description 测试任务解析功能
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  parseTaskFromText,
  parsedTaskToWorkflowDefinition,
  validateParsedTask,
  TaskIntent,
} from '../TaskParser'

describe('TaskParser', () => {
  describe('parseTaskFromText', () => {
    it('应该正确识别定时任务意图', () => {
      const text = '每天凌晨2点检查系统健康状态'
      const result = parseTaskFromText(text)

      expect(result.intent).toBe('scheduled')
      expect(result.confidence).toBeGreaterThan(0.5)
      expect(result.nodes.length).toBeGreaterThan(0)
    })

    it('应该正确识别通知任务意图', () => {
      const text = '发送邮件通知给运维团队'
      const result = parseTaskFromText(text)

      expect(result.intent).toBe('notification')
      expect(result.workflowName).toBeTruthy()
    })

    it('应该正确识别监控任务意图', () => {
      const text = '监控服务器CPU使用率'
      const result = parseTaskFromText(text)

      expect(result.intent).toBe('monitoring')
    })

    it('应该正确识别人工审批任务意图', () => {
      const text = '等待审批后执行操作'
      const result = parseTaskFromText(text)

      expect(result.intent).toBe('human_approval')
    })

    it('应该正确识别Webhook任务意图', () => {
      const text = '通过webhook触发任务执行'
      const result = parseTaskFromText(text)

      expect(result.intent).toBe('webhook')
    })

    it('应该生成正确数量的节点', () => {
      const text = '每天备份数据库'
      const result = parseTaskFromText(text)

      // 至少应该有开始和结束节点
      expect(result.nodes.length).toBeGreaterThanOrEqual(2)
    })

    it('应该生成正确的边连接', () => {
      const text = '检查状态并发送通知'
      const result = parseTaskFromText(text)

      // 如果有节点，边数应该是节点数-1
      if (result.nodes.length >= 2) {
        expect(result.edges.length).toBeGreaterThanOrEqual(1)
      }
    })

    it('应该正确提取时间表达式', () => {
      const text = '每天凌晨2点执行备份'
      const result = parseTaskFromText(text)

      const timeExpressions = result.variables.timeExpressions as string[]
      expect(timeExpressions).toBeDefined()
      expect(timeExpressions.length).toBeGreaterThan(0)
    })

    it('应该生成改进建议', () => {
      const text = '执行任务'
      const result = parseTaskFromText(text)

      expect(result.suggestions).toBeDefined()
      expect(Array.isArray(result.suggestions)).toBe(true)
    })

    it('应该处理复杂的任务描述', () => {
      const text = '每天凌晨2点检查系统健康状态，如果发现异常发送通知给运维团队，否则记录正常日志'
      const result = parseTaskFromText(text)

      expect(result.intent).toBeDefined()
      expect(result.nodes.length).toBeGreaterThan(0)
      expect(result.workflowName).toBeTruthy()
    })
  })

  describe('parsedTaskToWorkflowDefinition', () => {
    it('应该生成有效的工作流定义', () => {
      const text = '每天备份数据库'
      const parsed = parseTaskFromText(text)
      const workflow = parsedTaskToWorkflowDefinition(parsed)

      expect(workflow.id).toBeTruthy()
      expect(workflow.name).toBe(parsed.workflowName)
      expect(workflow.nodes.length).toBe(parsed.nodes.length)
      expect(workflow.edges.length).toBe(parsed.edges.length)
      expect(workflow.status).toBe('draft')
    })

    it('应该生成唯一的节点ID', () => {
      const text = '执行任务'
      const parsed = parseTaskFromText(text)
      const workflow = parsedTaskToWorkflowDefinition(parsed)

      const nodeIds = workflow.nodes.map(n => n.id)
      const uniqueIds = new Set(nodeIds)
      expect(uniqueIds.size).toBe(nodeIds.length)
    })

    it('应该正确设置元数据', () => {
      const text = '测试任务'
      const parsed = parseTaskFromText(text)
      const workflow = parsedTaskToWorkflowDefinition(parsed)

      expect(workflow.metadata.createdAt).toBeTruthy()
      expect(workflow.metadata.updatedAt).toBeTruthy()
      expect(workflow.metadata.createdBy).toBe('ai-parser')
    })
  })

  describe('validateParsedTask', () => {
    it('应该验证有效的解析结果', () => {
      const text = '每天备份数据库并发送通知'
      const parsed = parseTaskFromText(text)
      const validation = validateParsedTask(parsed)

      expect(validation.isValid).toBe(true)
      expect(validation.errors.length).toBe(0)
    })

    it('应该检测缺少的节点', () => {
      const parsed = {
        intent: 'unknown' as TaskIntent,
        workflowName: '',
        description: '',
        nodes: [],
        edges: [],
        variables: {},
        confidence: 0.1,
        suggestions: [],
        rawText: '',
      }

      const validation = validateParsedTask(parsed)
      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('应该检测低置信度', () => {
      const parsed = {
        intent: 'unknown' as TaskIntent,
        workflowName: '测试',
        description: '测试',
        nodes: [
          { id: 'start', type: 'start', name: '开始', position: { x: 0, y: 0 } },
          { id: 'end', type: 'end', name: '结束', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'e1', source: 'start', target: 'end' }],
        variables: {},
        confidence: 0.1,
        suggestions: [],
        rawText: '测试',
      }

      const validation = validateParsedTask(parsed)
      expect(validation.errors.some(e => e.includes('置信度'))).toBe(true)
    })
  })

  describe('边界情况', () => {
    it('应该处理空输入', () => {
      const result = parseTaskFromText('')
      expect(result).toBeDefined()
      expect(result.intent).toBeDefined()
    })

    it('应该处理非常长的输入', () => {
      const text = '执行任务 '.repeat(100)
      const result = parseTaskFromText(text)
      expect(result).toBeDefined()
    })

    it('应该处理特殊字符', () => {
      const text = '任务：<特殊> & "字符" 测试'
      const result = parseTaskFromText(text)
      expect(result).toBeDefined()
    })

    it('应该处理中英文混合', () => {
      const text = '每天execute task并发送email notification'
      const result = parseTaskFromText(text)
      expect(result).toBeDefined()
      expect(result.variables.agents).toBeDefined()
    })
  })
})
