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
import { NodeType, EdgeType } from '@/types/workflow'

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
  // 实体提取的结果放在 result.variables 里，字段是复数形式
  // （timeExpressions / recipients / conditions / actions / targets / agents）——
  // 因为一次输入可能包含多个实体。测试原先断言的是不存在的
  // variables.time 和 node.config.recipients / subject / condition / action，
  // 那些字段在 ExtractedEntities 和 WorkflowNode 的类型定义里都不存在。

  it('应该提取时间实体', () => {
    const result = parseTaskFromText('每天早上9点发送邮件')
    const timeExpressions = result.variables.timeExpressions as string[]
    expect(Array.isArray(timeExpressions)).toBe(true)
    expect(timeExpressions.length).toBeGreaterThan(0)
    expect(timeExpressions.join(' ')).toContain('每天')
  })

  it('应该提取接收者实体', () => {
    const result = parseTaskFromText('发送邮件给 john@example.com')
    const recipients = result.variables.recipients as string[]
    expect(recipients).toContain('john@example.com')
  })

  it('应该把接收者写进通知节点的 prompt', () => {
    const result = parseTaskFromText('发送邮件给 john@example.com')
    const notificationNode = result.nodes.find((node) => node.agentConfig?.agentType === 'notification')
    expect(notificationNode).toBeDefined()
    expect(notificationNode?.agentConfig?.prompt).toContain('john@example.com')
  })

  it('应该提取主题实体', () => {
    const result = parseTaskFromText('发送邮件，主题是"每日报告"')
    const subjects = result.variables.subjects as string[]
    expect(subjects.length).toBeGreaterThan(0)
    expect(subjects.join(' ')).toContain('每日报告')
  })

  it('应该提取条件实体', () => {
    const result = parseTaskFromText('当CPU超过80%时发送告警')
    const conditions = result.variables.conditions as string[]
    expect(conditions.length).toBeGreaterThan(0)
    expect(conditions.join(' ')).toContain('CPU')
  })

  it('应该把条件写进条件节点', () => {
    const result = parseTaskFromText('当CPU超过80%时发送告警')
    const conditionNode = result.nodes.find((node) => node.conditionConfig)
    expect(conditionNode).toBeDefined()
    expect(conditionNode?.conditionConfig?.expression).toBeTruthy()
  })

  it('应该提取动作实体', () => {
    const result = parseTaskFromText('发送邮件通知')
    const actions = result.variables.actions as string[]
    expect(actions.length).toBeGreaterThan(0)
  })
})

describe('TaskParser - 节点生成', () => {
  // 节点类型用的是领域模型 NodeType（start / agent / condition /
  // human_input / end ...），不是测试原先假设的
  // trigger / action / notification / monitor / approval 那套词表。
  // 所以这里按**节点的业务角色**（配置字段）来断言，
  // 而不是按不存在的类型字符串。

  it('应该生成触发器节点', () => {
    const result = parseTaskFromText('每天早上9点发送邮件')
    const triggerNode = result.nodes.find((node) => node.config?.inputs?.schedule !== undefined)
    expect(triggerNode).toBeDefined()
    expect(triggerNode?.type).toBe(NodeType.START)
  })

  it('应该生成动作节点', () => {
    const result = parseTaskFromText('发送邮件通知')
    const actionNode = result.nodes.find((node) => node.agentConfig?.agentType === 'notification')
    expect(actionNode).toBeDefined()
    expect(actionNode?.type).toBe(NodeType.AGENT)
  })

  it('应该生成通知节点', () => {
    const result = parseTaskFromText('发送邮件给团队')
    const notificationNode = result.nodes.find((node) => node.agentConfig?.agentType === 'notification')
    expect(notificationNode).toBeDefined()
    expect(notificationNode?.agentConfig?.prompt).toContain('团队')
  })

  it('应该生成监控节点', () => {
    const result = parseTaskFromText('监控服务器状态')
    const monitorNode = result.nodes.find((node) => node.conditionConfig)
    expect(monitorNode).toBeDefined()
    expect(monitorNode?.type).toBe(NodeType.CONDITION)
  })

  it('应该生成审批节点', () => {
    const result = parseTaskFromText('需要主管审批')
    const approvalNode = result.nodes.find((node) => node.humanInputConfig)
    expect(approvalNode).toBeDefined()
    expect(approvalNode?.type).toBe(NodeType.HUMAN_INPUT)
  })

  it('应该生成开始和结束节点', () => {
    const result = parseTaskFromText('每天早上9点发送邮件')
    expect(result.nodes.some((node) => node.type === NodeType.START)).toBe(true)
    expect(result.nodes.some((node) => node.type === NodeType.END)).toBe(true)
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
      // EdgeType 的真实取值：sequence / condition / parallel / default
      expect(Object.values(EdgeType)).toContain(edge.type)
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

    // nodes[0] 是 start 节点 —— start 节点本来就没有 config。
    // 真正带配置的是业务节点：这里断言通知节点的 agentConfig 被完整保留。
    const notificationNode = workflow.nodes.find(
      (node) => node.agentConfig?.agentType === 'notification'
    )
    expect(notificationNode).toBeDefined()
    expect(notificationNode?.agentConfig?.agentId).toBe('notification-agent')
    expect(notificationNode?.agentConfig?.prompt).toContain('john@example.com')
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
    // 实现的阈值是 confidence < 0.3 即判为低置信度（0.3 本身是可接受的下限）。
    // 这里用 0.2 —— 明确低于阈值。
    const parsed: ParsedTask = {
      intent: 'unknown',
      workflowName: '测试',
      description: '测试',
      nodes: [{ type: undefined, config: {} }],
      edges: [],
      variables: {},
      confidence: 0.2,
      suggestions: [],
      rawText: '测试',
    }

    const validation = validateParsedTask(parsed)

    expect(validation.isValid).toBe(false)
    expect(validation.errors.some((e) => e.includes('置信度'))).toBe(true)
  })

  it('应该报告缺少开始和结束节点', () => {
    const parsed: ParsedTask = {
      intent: 'unknown',
      workflowName: '测试',
      description: '测试',
      nodes: [{ type: undefined, config: {} }],
      edges: [],
      variables: {},
      confidence: 0.9,
      suggestions: [],
      rawText: '测试',
    }

    const validation = validateParsedTask(parsed)

    expect(validation.isValid).toBe(false)
    expect(validation.errors.some((e) => e.includes('开始节点'))).toBe(true)
    expect(validation.errors.some((e) => e.includes('结束节点'))).toBe(true)
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