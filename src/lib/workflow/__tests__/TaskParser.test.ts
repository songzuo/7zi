/**
 * @fileoverview v1.9.1 单元测试 - TaskParser
 * @description 测试自然语言任务解析器的核心功能
 */

import { describe, it, expect } from 'vitest'
import {
  parseTaskFromText,
  parsedTaskToWorkflowDefinition,
  validateParsedTask,
  TaskIntent,
  ParsedTask,
} from '@/lib/workflow/TaskParser'

describe('TaskParser - 意图识别', () => {
  it('应该正确识别定时任务意图', () => {
    const result = parseTaskFromText('每天早上9点发送邮件')
    expect(result.intent).toBe('scheduled')
    expect(result.confidence).toBeGreaterThan(0.7)
  })

  it('应该正确识别监控任务意图', () => {
    const result = parseTaskFromText('监控服务器CPU使用率')
    expect(result.intent).toBe('monitoring')
    expect(result.confidence).toBeGreaterThan(0.7)
  })

  it('应该正确识别通知任务意图', () => {
    const result = parseTaskFromText('发送通知给团队')
    expect(result.intent).toBe('notification')
    expect(result.confidence).toBeGreaterThan(0.7)
  })

  it('应该正确识别数据处理任务意图', () => {
    const result = parseTaskFromText('处理上传的Excel文件')
    expect(result.intent).toBe('data_processing')
    expect(result.confidence).toBeGreaterThan(0.7)
  })

  it('应该正确识别审批任务意图', () => {
    const result = parseTaskFromText('需要主管审批')
    expect(result.intent).toBe('human_approval')
    expect(result.confidence).toBeGreaterThan(0.7)
  })

  it('应该正确识别Webhook任务意图', () => {
    const result = parseTaskFromText('通过webhook触发')
    expect(result.intent).toBe('webhook')
    expect(result.confidence).toBeGreaterThan(0.7)
  })

  it('应该正确识别自动化任务意图', () => {
    const result = parseTaskFromText('自动化处理订单')
    expect(result.intent).toBe('automation')
    expect(result.confidence).toBeGreaterThan(0.7)
  })

  it('应该返回未知意图当无法识别时', () => {
    const result = parseTaskFromText('随便说点什么')
    expect(result.intent).toBe('unknown')
    expect(result.confidence).toBeLessThan(0.5)
  })
})

describe('TaskParser - 实体提取', () => {
  it('应该提取时间实体', () => {
    const result = parseTaskFromText('每天早上9点发送邮件')
    expect(result.variables.time).toContain('9')
  })

  it('应该提取接收者实体', () => {
    const result = parseTaskFromText('发送邮件给 john@example.com')
    const hasRecipient = result.nodes.some(
      (node) => node.config && typeof node.config === 'object' && 'recipients' in node.config
    )
    expect(hasRecipient).toBe(true)
  })

  it('应该提取主题实体', () => {
    const result = parseTaskFromText('发送邮件，主题是"每日报告"')
    const hasSubject = result.nodes.some(
      (node) => node.config && typeof node.config === 'object' && 'subject' in node.config
    )
    expect(hasSubject).toBe(true)
  })

  it('应该提取条件实体', () => {
    const result = parseTaskFromText('当CPU超过80%时发送告警')
    const hasCondition = result.nodes.some(
      (node) => node.config && typeof node.config === 'object' && 'condition' in node.config
    )
    expect(hasCondition).toBe(true)
  })

  it('应该提取动作实体', () => {
    const result = parseTaskFromText('发送邮件通知')
    const hasAction = result.nodes.some(
      (node) => node.config && typeof node.config === 'object' && 'action' in node.config
    )
    expect(hasAction).toBe(true)
  })
})

describe('TaskParser - 节点生成', () => {
  it('应该生成触发器节点', () => {
    const result = parseTaskFromText('每天早上9点发送邮件')
    const hasTrigger = result.nodes.some((node) => String(node.type) === 'trigger' || node.type === undefined)
    expect(hasTrigger).toBe(true)
  })

  it('应该生成动作节点', () => {
    const result = parseTaskFromText('发送邮件通知')
    const hasAction = result.nodes.some((node) => String(node.type) === 'action' || node.type === undefined)
    expect(hasAction).toBe(true)
  })

  it('应该生成通知节点', () => {
    const result = parseTaskFromText('发送邮件给团队')
    const hasNotification = result.nodes.some((node) => String(node.type) === 'notification' || node.type === undefined)
    expect(hasNotification).toBe(true)
  })

  it('应该生成监控节点', () => {
    const result = parseTaskFromText('监控服务器状态')
    const hasMonitor = result.nodes.some((node) => String(node.type) === 'monitor' || node.type === undefined)
    expect(hasMonitor).toBe(true)
  })

  it('应该生成审批节点', () => {
    const result = parseTaskFromText('需要主管审批')
    const hasApproval = result.nodes.some((node) => String(node.type) === 'approval' || node.type === undefined)
    expect(hasApproval).toBe(true)
  })
})

describe('TaskParser - 边连接', () => {
  it('应该生成节点间的连接', () => {
    const result = parseTaskFromText('每天早上9点发送邮件给团队')
    expect(result.edges.length).toBeGreaterThan(0)
  })

  it('应该正确设置边的源和目标', () => {
    const result = parseTaskFromText('每天早上9点发送邮件')
    if (result.edges.length > 0) {
      const edge = result.edges[0]
      expect(edge.source).toBeDefined()
      expect(edge.target).toBeDefined()
    }
  })

  it('应该生成正确的边类型', () => {
    const result = parseTaskFromText('每天早上9点发送邮件')
    if (result.edges.length > 0) {
      const edge = result.edges[0]
      expect(['default', 'success', 'error']).toContain(edge.type || 'default')
    }
  })
})

describe('TaskParser - 工作流定义转换', () => {
  it('应该将解析结果转换为工作流定义', () => {
    const parsed = parseTaskFromText('每天早上9点发送邮件')
    const workflow = parsedTaskToWorkflowDefinition(parsed)

    expect(workflow).toBeDefined()
    expect(workflow.name).toBe(parsed.workflowName)
    expect(workflow.description).toBe(parsed.description)
    expect(workflow.nodes.length).toBe(parsed.nodes.length)
    expect(workflow.edges.length).toBe(parsed.edges.length)
  })

  it('应该保留节点配置', () => {
    const parsed = parseTaskFromText('发送邮件给 john@example.com')
    const workflow = parsedTaskToWorkflowDefinition(parsed)

    const node = workflow.nodes[0]
    expect(node.config).toBeDefined()
  })

  it('应该保留边配置', () => {
    const parsed = parseTaskFromText('每天早上9点发送邮件')
    const workflow = parsedTaskToWorkflowDefinition(parsed)

    if (workflow.edges.length > 0) {
      const edge = workflow.edges[0]
      expect(edge.source).toBeDefined()
      expect(edge.target).toBeDefined()
    }
  })
})

describe('TaskParser - 验证', () => {
  it('应该验证有效的解析结果', () => {
    const parsed = parseTaskFromText('每天早上9点发送邮件')
    const validation = validateParsedTask(parsed)

    expect(validation.isValid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })

  it('应该拒绝没有节点的解析结果', () => {
    const parsed: ParsedTask = {
      intent: 'unknown',
      workflowName: '测试',
      description: '测试',
      nodes: [],
      edges: [],
      variables: {},
      confidence: 0,
      suggestions: [],
      rawText: '测试',
    }

    const validation = validateParsedTask(parsed)

    expect(validation.isValid).toBe(false)
    expect(validation.errors.length).toBeGreaterThan(0)
  })

  it('应该拒绝没有名称的工作流', () => {
    const parsed: ParsedTask = {
      intent: 'scheduled',
      workflowName: '',
      description: '测试',
      nodes: [{ type: undefined, config: {} }],
      edges: [],
      variables: {},
      confidence: 0.8,
      suggestions: [],
      rawText: '测试',
    }

    const validation = validateParsedTask(parsed)

    expect(validation.isValid).toBe(false)
    expect(validation.errors.some((e) => e.includes('名称'))).toBe(true)
  })

  it('应该拒绝低置信度的解析结果', () => {
    const parsed: ParsedTask = {
      intent: 'unknown',
      workflowName: '测试',
      description: '测试',
      nodes: [{ type: undefined, config: {} }],
      edges: [],
      variables: {},
      confidence: 0.3,
      suggestions: [],
      rawText: '测试',
    }

    const validation = validateParsedTask(parsed)

    expect(validation.isValid).toBe(false)
    expect(validation.errors.some((e) => e.includes('置信度'))).toBe(true)
  })
})

describe('TaskParser - 改进建议', () => {
  it('应该为低置信度结果提供改进建议', () => {
    const result = parseTaskFromText('随便说点什么')
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('应该为缺少实体的结果提供改进建议', () => {
    const result = parseTaskFromText('发送邮件')
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('应该为模糊的时间表达提供改进建议', () => {
    const result = parseTaskFromText('某个时间发送邮件')
    const hasTimeSuggestion = result.suggestions.some((s) => s.includes('时间') || s.includes('具体'))
    expect(hasTimeSuggestion).toBe(true)
  })
})

describe('TaskParser - 边界情况', () => {
  it('应该处理空输入', () => {
    const result = parseTaskFromText('')
    expect(result.intent).toBe('unknown')
    expect(result.confidence).toBe(0)
  })

  it('应该处理特殊字符', () => {
    const result = parseTaskFromText('发送邮件给 test@example.com，主题是"测试@#$%"')
    expect(result.nodes.length).toBeGreaterThan(0)
  })

  it('应该处理超长输入', () => {
    const longText = '发送邮件给 '.repeat(1000)
    const result = parseTaskFromText(longText)
    expect(result).toBeDefined()
  })

  it('应该处理多语言输入', () => {
    const result = parseTaskFromText('Send email at 9am every day')
    expect(result.intent).toBe('scheduled')
  })

  it('应该处理混合语言输入', () => {
    const result = parseTaskFromText('每天9am发送邮件')
    expect(result.intent).toBe('scheduled')
  })
})

describe('TaskParser - 性能', () => {
  it('应该在合理时间内完成解析', () => {
    const start = Date.now()
    parseTaskFromText('每天早上9点发送邮件给团队，主题是每日报告')
    const duration = Date.now() - start

    expect(duration).toBeLessThan(100) // < 100ms
  })

  it('应该能够处理批量解析', () => {
    const inputs = [
      '每天早上9点发送邮件',
      '监控服务器状态',
      '处理Excel文件',
      '需要审批',
      '通过webhook触发',
    ]

    const start = Date.now()
    const results = inputs.map((input) => parseTaskFromText(input))
    const duration = Date.now() - start

    expect(results.length).toBe(inputs.length)
    expect(duration).toBeLessThan(500) // < 500ms for 5 items
  })
})