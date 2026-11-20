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
    keywords: [
      // 只放**时间/周期**线索。
      //
      // 「自动化」「自动」原本在这里，但它们是**通用词** ——
      // "自动化处理订单" 应该是 automation 而非 scheduled。
      // 留着它会让 weight 1.0 的 scheduled 压过命中数更多的 automation。
      '定时', 'schedule', 'cron', '每天', '每周', '定期', '周期',
      // 注意：不要用单个「点」—— "随便说点什么" 也会命中它。
      '早上', '上午', '中午', '下午', '晚上', '凌晨', '点钟', '小时', '分钟',
      // 英文周期表达 —— "Send email at 9am every day" 这类混合输入很常见。
      'every day', 'everyday', 'every week', 'every month', 'daily', 'weekly', 'monthly',
    ],
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
    keywords: ['任务', 'task', '执行', 'run', '处理', '自动化', '自动'],
    intent: 'automation',
    weight: 0.8,
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

const _ACTION_PATTERNS: ActionPattern[] = [
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
  subjects: string[]
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
 * 主题提取
 *
 * 「发送邮件，主题是"每日报告"」这类表达里的主题 —— 通知任务的重要实体。
 * 支持中文（主题/标题）和英文（subject/title），引号可省略。
 */
function extractSubjects(text: string): string[] {
  const subjects: string[] = []
  const patterns = [
    /主题(?:是|为|[:：])\s*["'“”]?([^"'“”，。\n]+)["'“”]?/g,
    /标题(?:是|为|[:：])\s*["'“”]?([^"'“”，。\n]+)["'“”]?/g,
    /subject\s*[:：]\s*["'“”]?([^"'“”，。\n]+)["'“”]?/gi,
    /title\s*[:：]\s*["'“”]?([^"'“”，。\n]+)["'“”]?/gi,
  ]

  patterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const value = match[1]?.trim()
      if (value) {
        subjects.push(value)
      }
    }
  })

  return subjects
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
    if (matches.length === 0) {
      return
    }

    // 打分：命中**任一**关键词即拿满该规则的基础分，
    // 命中更多关键词只做小幅加成。
    //
    // 之前用的是 (命中数 / 关键词总数) × weight —— 那会把分数按命中率
    // 平均掉：一条规则有 8 个关键词，只命中 1 个也只有 0.125 的分数，
    // 置信度算出来 0.325，远低于实际把握（"每天早上9点发送邮件" 明显是
    // 定时任务）。关键词匹配是**或**关系，不是**比例**关系。
    //
    // 打分：命中**数量**体现具体程度，权重体现意图的典型性。
    //
    //   score = weight × (1 + 0.05 × (命中数 - 1))
    //
    // 两条关键用例说明这个组合为什么必要：
    //   "每天早上9点发送邮件" → scheduled 命中「每天/早上/点」3 个，
    //     notification 命中「发送/邮件」2 个 → scheduled 胜（有时间线索）
    //   "自动化处理订单" → automation 命中「自动化/处理」2 个，
    //     scheduled 只命中「自动化」1 个 → automation 胜
    //
    // 命中数相同则比权重（data_processing 0.85 > automation 0.5）。
    const bonus = Math.min((matches.length - 1) * 0.05, 0.2)
    const score = rule.weight * (1 + bonus)

    if (score > bestScore) {
      bestScore = score
      bestIntent = rule.intent
    }
  })

  // 没有匹配到任何关键词 → 意图未知。
  // （之前这里硬返回 'automation' + 0.5，但 TaskIntent 里明明有
  // 'unknown'，且解析结果里也有 unknown 分支 —— 属于实现与类型定义不一致。）
  if (bestScore === 0) {
    bestIntent = 'unknown'
    bestScore = 0.2
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
              { name: 'approved', type: 'checkbox', label: '是否批准' },
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

  // 模糊的时间表达是最需要提示的场景之一 ——
  // 但原来所有建议都排在它前面，再被 slice(0, 3) 一截，
  // 它永远出现在不了。所以时间建议**优先**入列。
  const vagueTime =
    (text.includes('某个时间') ||
      text.includes('某时') ||
      text.includes('某个时候') ||
      text.includes(' sometime') ||
      text.includes('at some point')) &&
    !/\d{1,2}[:：]\d{2}/.test(text) &&
    !/\d+\s*(秒|分钟|小时|天|周)/.test(text)

  if (vagueTime) {
    suggestions.push('建议指定具体时间，例如「每天早上9点」')
  }

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
  // 空输入 —— 置信度为 0（不是 unknown 分支的 0.4）。
  // 空文本没有任何信息可提取，给一个非零置信度会误导调用方。
  if (!text || text.trim().length === 0) {
    return {
      intent: 'unknown',
      workflowName: '未命名工作流',
      description: text,
      nodes: [],
      edges: [],
      variables: { originalText: text },
      confidence: 0,
      suggestions: [],
      rawText: text,
    }
  }

  // 1. 实体提取
  const entities: ExtractedEntities = {
    timeExpressions: parseTimeExpression(text),
    recipients: extractRecipients(text),
    subjects: extractSubjects(text),
    conditions: extractConditions(text),
    actions: extractActions(text),
    targets: extractTargets(text),
    agents: extractAgents(text),
  }

  // 2. 意图识别
  const { intent, confidence } = recognizeIntent(text)

  // 3. 生成节点
  const nodes = generateNodesFromText(text, intent, entities)

  // 3.5 条件实体如果被提取到了，但意图不是 monitoring（因而没生成
  // CONDITION 节点），那这条条件就凭空丢了 —— 挂在业务节点的
  // conditionConfig 上，别让提取到的信息白费。
  if (entities.conditions.length > 0) {
    const hasConditionNode = nodes.some((node) => node.conditionConfig)
    if (!hasConditionNode) {
      const businessNode = nodes.find((node) => node.agentConfig)
      if (businessNode) {
        businessNode.conditionConfig = {
          expression: entities.conditions[0],
          trueLabel: '满足条件',
          falseLabel: '不满足条件',
        }
      }
    }
  }

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
