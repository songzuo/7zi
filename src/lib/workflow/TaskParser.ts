/**
 * @fileoverview 自然语言任务解析器
 * @description 将用户的自然语言描述转换为工作流节点和边的结构
 */

'use client'

import { WorkflowNode, WorkflowEdge, NodeType, EdgeType, WorkflowDefinition, WorkflowStatus } from '@/types/workflow'

// Re-export for convenience
export type { WorkflowDefinition }

/**
 * 意图类型
 */
export type TaskIntent =
  | 'automation' // 自动化任务
  | 'notification' // 通知任务
  | 'data_processing' // 数据处理
  | 'monitoring' // 监控任务
  | 'integration' // 集成任务
  | 'scheduled' // 定时任务
  | 'webhook' // Webhook 触发
  | 'human_approval' // 人工审批
  | 'unknown' // 未知意图

/**
 * 解析结果
 */
export interface ParsedTask {
  intent: TaskIntent
  workflowName: string
  description: string
  nodes: Partial<WorkflowNode>[]
  edges: Partial<WorkflowEdge>[]
  variables: Record<string, unknown>
  confidence: number // 解析置信度 0-1
  suggestions: string[] // 改进建议
  rawText: string // 原始输入
}

/**
 * 关键词匹配规则
 */
interface KeywordRule {
  keywords: string[]
  intent: TaskIntent
  weight: number
}

/**
 * 意图识别规则
 */
const INTENT_RULES: KeywordRule[] = [
  {
    keywords: ['自动化', '自动', '定时', 'schedule', 'cron', '每天', '每周', '定期'],
    intent: 'scheduled',
    weight: 1.0,
  },
  {
    keywords: ['监控', 'monitor', '检查', '健康', 'heartbeat', '状态'],
    intent: 'monitoring',
    weight: 0.9,
  },
  {
    keywords: ['通知', '提醒', 'alert', '邮件', 'email', 'telegram', 'slack', '发送'],
    intent: 'notification',
    weight: 0.95,
  },
  {
    keywords: ['审批', 'approve', 'review', '人工', 'human', '确认'],
    intent: 'human_approval',
    weight: 1.0,
  },
  {
    keywords: ['webhook', '触发', 'trigger', '回调', '接收'],
    intent: 'webhook',
    weight: 1.0,
  },
  {
    keywords: ['处理', 'process', '转换', 'transform', '清洗', '清洗数据', 'ETL'],
    intent: 'data_processing',
    weight: 0.85,
  },
  {
    keywords: ['集成', 'integrate', '连接', 'connect', '同步', 'sync'],
    intent: 'integration',
    weight: 0.8,
  },
  {
    keywords: ['任务', 'task', '执行', 'run', '处理'],
    intent: 'automation',
    weight: 0.5,
  },
]

/**
 * 动作模式匹配规则
 */
interface ActionPattern {
  pattern: RegExp
  nodeType: NodeType
  extractFields: string[]
}

const ACTION_PATTERNS: ActionPattern[] = [
  {
    pattern: /发送(邮件|通知|消息|alert)(给|到)\s*(\S+)/i,
    nodeType: NodeType.AGENT,
    extractFields: ['recipient', 'content'],
  },
  {
    pattern: /检查|监控|monitor|检查\s*(\S+)/i,
    nodeType: NodeType.CONDITION,
    extractFields: ['target', 'condition'],
  },
  {
    pattern: /等待|wait|延迟\s*(\d+)\s*(秒|分钟|小时)/i,
    nodeType: NodeType.WAIT,
    extractFields: ['duration'],
  },
  {
    pattern: /如果|条件|when|if\s*(\S+)/i,
    nodeType: NodeType.CONDITION,
    extractFields: ['condition', 'trueAction', 'falseAction'],
  },
  {
    pattern: /并行|同时|parallel|并发/i,
    nodeType: NodeType.PARALLEL,
    extractFields: ['branches'],
  },
  {
    pattern: /等待确认|等待审批|人工|human|approval/i,
    nodeType: NodeType.HUMAN_INPUT,
    extractFields: ['approver', 'formSchema'],
  },
]

/**
 * 实体提取结果
 */
interface ExtractedEntities {
  timeExpressions: string[]
  recipients: string[]
  conditions: string[]
  actions: string[]
  targets: string[]
  agents: string[]
}

/**
 * 时间表达式解析
 */
function parseTimeExpression(text: string): string[] {
  const timeExpressions: string[] = []
  const patterns = [
    /(\d+)\s*(秒|分钟|小时|天|周|月)/gi,
    /(每天|每日|每周|每月|每时|每刻)/gi,
    /(凌晨|上午|下午|晚上|中午)/gi,
    /(\d{1,2}:\d{2})/gi,
  ]

  patterns.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches) {
      timeExpressions.push(...matches)
    }
  })

  return timeExpressions
}

/**
 * 接收者提取
 */
function extractRecipients(text: string): string[] {
  const recipients: string[] = []
  const patterns = [
    /给\s*(\S+)/gi,
    /发送至\s*(\S+)/gi,
    /通知\s*(\S+)/gi,
    /(?:to|cc|bcc):\s*(\S+)/gi,
  ]

  patterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      recipients.push(match[1])
    }
  })

  return recipients
}

/**
 * 条件表达式提取
 */
function extractConditions(text: string): string[] {
  const conditions: string[] = []
  const patterns = [
    /如果\s*(.+?)(?:那么|否则)/gi,
    /when\s+(.+?)(?:then|else)/gi,
    /当\s*(.+?)(?:时)/gi,
    /如果\s*(.+?)\s*成立/gi,
  ]

  patterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      conditions.push(match[1].trim())
    }
  })

  return conditions
}

/**
 * 动作提取
 */
function extractActions(text: string): string[] {
  const actions: string[] = []
  const verbPatterns = [
    /(发送|执行|运行|处理|创建|更新|删除|获取|检查)/g,
    /(send|execute|run|process|create|update|delete|get|check)/gi,
  ]

  verbPatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      actions.push(match[1])
    }
  })

  return actions
}

/**
 * 目标提取
 */
function extractTargets(text: string): string[] {
  const targets: string[] = []
  const patterns = [
    /对\s*(\S+)/gi,
    /目标\s*(\S+)/gi,
    /(?:on|to|for)\s+(\S+)/gi,
  ]

  patterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      targets.push(match[1])
    }
  })

  return targets
}

/**
 * Agent/工具提取
 */
function extractAgents(text: string): string[] {
  const agents: string[] = []
  const knownAgents = [
    'gpt',
    'claude',
    'gemini',
    'email',
    'slack',
    'telegram',
    'webhook',
    'http',
    'api',
    'database',
    'sql',
    'rest',
    'graphql',
  ]

  const lowerText = text.toLowerCase()
  knownAgents.forEach(agent => {
    if (lowerText.includes(agent)) {
      agents.push(agent)
    }
  })

  return agents
}

/**
 * 意图识别
 */
function recognizeIntent(text: string): { intent: TaskIntent; confidence: number } {
  const lowerText = text.toLowerCase()
  let bestIntent: TaskIntent = 'unknown'
  let bestScore = 0

  INTENT_RULES.forEach(rule => {
    const matches = rule.keywords.filter(keyword => lowerText.includes(keyword.toLowerCase()))
    const score = (matches.length / rule.keywords.length) * rule.weight

    if (score > bestScore) {
      bestScore = score
      bestIntent = rule.intent
    }
  })

  // 如果没有匹配到任何意图，默认是自动化任务
  if (bestScore === 0) {
    bestIntent = 'automation'
    bestScore = 0.5
  }

  return { intent: bestIntent, confidence: Math.min(bestScore + 0.2, 1.0) }
}

/**
 * 从文本生成工作流节点
 */
function generateNodesFromText(
  text: string,
  intent: TaskIntent,
  entities: ExtractedEntities
): Partial<WorkflowNode>[] {
  const nodes: Partial<WorkflowNode>[] = []

  // 开始节点
  nodes.push({
    id: 'start_node',
    type: NodeType.START,
    name: '开始',
    position: { x: 100, y: 100 },
  })

  // 根据意图生成中间节点
  switch (intent) {
    case 'scheduled':
      nodes.push({
        id: 'trigger_node',
        type: NodeType.START,
        name: '定时触发',
        position: { x: 250, y: 100 },
        config: {
          timeout: 300,
          inputs: {
            schedule: entities.timeExpressions[0] || '0 0 * * *',
          },
        },
      })
      break

    case 'webhook':
      nodes.push({
        id: 'trigger_node',
        type: NodeType.START,
        name: 'Webhook 触发',
        position: { x: 250, y: 100 },
        config: {
          inputs: {
            webhookPath: '/webhook/' + Date.now(),
          },
        },
      })
      break

    case 'notification':
      nodes.push({
        id: 'action_node',
        type: NodeType.AGENT,
        name: '发送通知',
        position: { x: 250, y: 100 },
        agentConfig: {
          agentId: 'notification-agent',
          agentType: 'notification',
          prompt: `向以下接收者发送通知: ${entities.recipients.join(', ')}`,
        },
      })
      break

    case 'monitoring':
      nodes.push({
        id: 'check_node',
        type: NodeType.CONDITION,
        name: '健康检查',
        position: { x: 250, y: 100 },
        conditionConfig: {
          expression: entities.conditions[0] || 'status == "healthy"',
          trueLabel: '正常',
          falseLabel: '异常',
        },
      })
      break

    case 'human_approval':
      nodes.push({
        id: 'approval_node',
        type: NodeType.HUMAN_INPUT,
        name: '人工审批',
        position: { x: 250, y: 100 },
        humanInputConfig: {
          formSchema: {
            fields: [
              { name: 'approved', type: 'boolean', label: '是否批准' },
              { name: 'comment', type: 'text', label: '审批意见' },
            ],
          },
          requiredApprovals: 1,
        },
      })
      break

    case 'data_processing':
      nodes.push({
        id: 'process_node',
        type: NodeType.AGENT,
        name: '数据处理',
        position: { x: 250, y: 100 },
        agentConfig: {
          agentId: 'data-processing-agent',
          agentType: 'data-processing',
          prompt: `处理数据: ${text}`,
        },
      })
      break

    case 'integration':
      nodes.push({
        id: 'integration_node',
        type: NodeType.AGENT,
        name: '数据同步',
        position: { x: 250, y: 100 },
        agentConfig: {
          agentId: 'integration-agent',
          agentType: 'integration',
          prompt: `执行集成任务: ${text}`,
        },
      })
      break

    default:
      // 默认自动化任务
      nodes.push({
        id: 'task_node',
        type: NodeType.AGENT,
        name: '执行任务',
        position: { x: 250, y: 100 },
        agentConfig: {
          agentId: 'task-agent',
          agentType: 'general',
          prompt: text,
        },
      })
  }

  // 结束节点
  nodes.push({
    id: 'end_node',
    type: NodeType.END,
    name: '结束',
    position: { x: 400, y: 100 },
  })

  return nodes
}

/**
 * 生成节点之间的边
 */
function generateEdges(nodes: Partial<WorkflowNode>[]): Partial<WorkflowEdge>[] {
  const edges: Partial<WorkflowEdge>[] = []

  for (let i = 0; i < nodes.length - 1; i++) {
    const sourceNode = nodes[i]
    const targetNode = nodes[i + 1]

    if (sourceNode.id && targetNode.id) {
      edges.push({
        id: `edge_${sourceNode.id}_${targetNode.id}`,
        source: sourceNode.id,
        target: targetNode.id,
        type: EdgeType.SEQUENCE,
      })
    }
  }

  return edges
}

/**
 * 生成改进建议
 */
function generateSuggestions(text: string, intent: TaskIntent): string[] {
  const suggestions: string[] = []

  if (!text.includes('如果') && !text.includes('条件')) {
    suggestions.push('建议添加条件分支来处理不同情况')
  }

  if (!text.includes('等待') && !text.includes('延迟')) {
    suggestions.push('可以考虑添加延迟节点来控制执行节奏')
  }

  if (!text.includes('错误') && !text.includes('失败')) {
    suggestions.push('建议添加错误处理节点来提高鲁棒性')
  }

  if (intent === 'notification' && !text.includes('模板')) {
    suggestions.push('建议定义消息模板以保持一致性')
  }

  if (intent === 'scheduled' && !text.includes('重试')) {
    suggestions.push('建议添加重试策略来处理执行失败')
  }

  return suggestions.slice(0, 3) // 最多返回3条建议
}

/**
 * 从文本提取工作流名称
 */
function extractWorkflowName(text: string): string {
  // 尝试从文本中提取动词短语作为工作流名称
  const patterns = [
    /(?:创建|新建|执行)\s*(\S+)/i,
    /(\S+)\s*(?:任务|自动化)/i,
    /(?:自动|智能)\s*(\S+)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1] + '自动化'
    }
  }

  // 默认生成名称
  const keywords = text.split(/[,，、]/).slice(0, 3)
  return keywords.join('_') + '_任务'
}

/**
 * 主解析函数
 * @param text 用户输入的自然语言文本
 * @returns 解析后的任务结构
 */
export function parseTaskFromText(text: string): ParsedTask {
  // 1. 实体提取
  const entities: ExtractedEntities = {
    timeExpressions: parseTimeExpression(text),
    recipients: extractRecipients(text),
    conditions: extractConditions(text),
    actions: extractActions(text),
    targets: extractTargets(text),
    agents: extractAgents(text),
  }

  // 2. 意图识别
  const { intent, confidence } = recognizeIntent(text)

  // 3. 生成节点
  const nodes = generateNodesFromText(text, intent, entities)

  // 4. 生成边
  const edges = generateEdges(nodes)

  // 5. 生成建议
  const suggestions = generateSuggestions(text, intent)

  // 6. 提取工作流名称
  const workflowName = extractWorkflowName(text)

  return {
    intent,
    workflowName,
    description: text,
    nodes,
    edges,
    variables: {
      ...entities,
      originalText: text,
    },
    confidence,
    suggestions,
    rawText: text,
  }
}

/**
 * 将解析结果转换为完整的工作流定义
 */
export function parsedTaskToWorkflowDefinition(parsed: ParsedTask): WorkflowDefinition {
  const now = new Date().toISOString()

  // 生成唯一的节点ID
  const nodeIdMap = new Map<string, string>()
  const newNodes: WorkflowNode[] = parsed.nodes
    .filter((n): n is Partial<WorkflowNode> => !!n.id)
    .map(n => {
      const newId = `node_${Math.random().toString(36).substr(2, 9)}`
      nodeIdMap.set(n.id!, newId)
      return {
        id: newId,
        type: n.type || NodeType.AGENT,
        name: n.name || '未命名节点',
        position: n.position || { x: 100, y: 100 },
        description: n.description,
        agentConfig: n.agentConfig,
        conditionConfig: n.conditionConfig,
        waitConfig: n.waitConfig,
        humanInputConfig: n.humanInputConfig,
        config: n.config,
      }
    })

  // 更新边的引用
  const newEdges: WorkflowEdge[] = parsed.edges
    .filter((e): e is Partial<WorkflowEdge> => !!e.source && !!e.target)
    .map(e => ({
      id: `edge_${Math.random().toString(36).substr(2, 9)}`,
      source: nodeIdMap.get(e.source!) || e.source!,
      target: nodeIdMap.get(e.target!) || e.target!,
      type: e.type || EdgeType.SEQUENCE,
      conditionConfig: e.conditionConfig,
      style: e.style,
    }))

  return {
    id: `workflow_${Date.now()}`,
    name: parsed.workflowName,
    description: parsed.description,
    version: 1,
    status: WorkflowStatus.DRAFT,
    nodes: newNodes,
    edges: newEdges,
    config: {
      variables: parsed.variables,
    },
    metadata: {
      createdAt: now,
      updatedAt: now,
      createdBy: 'ai-parser',
      updatedBy: 'ai-parser',
    },
  }
}

/**
 * 验证解析结果
 */
export function validateParsedTask(parsed: ParsedTask): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!parsed.workflowName || parsed.workflowName.trim() === '') {
    errors.push('工作流名称不能为空')
  }

  if (parsed.nodes.length < 2) {
    errors.push('至少需要开始和结束节点')
  }

  if (parsed.confidence < 0.3) {
    errors.push('解析置信度较低，建议提供更多细节')
  }

  // 检查节点类型覆盖
  const nodeTypes = new Set(parsed.nodes.map(n => n.type))
  if (!nodeTypes.has(NodeType.START)) {
    errors.push('缺少开始节点')
  }
  if (!nodeTypes.has(NodeType.END)) {
    errors.push('缺少结束节点')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export type { ExtractedEntities }
