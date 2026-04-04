/**
 * Workflow 模板系统
 *
 * 版本: v1.12.2
 * 创建日期: 2026-04-04
 *
 * 提供预设工作流模板，让用户快速创建工作流
 */

import type {
  WorkflowDefinition,
  WorkflowNodeData,
  WorkflowEdgeData,
  NodeConfig,
} from './types'

// ============================================
// 模板类型定义
// ============================================

/**
 * 工作流模板
 */
export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'basic' | 'ai' | 'data' | 'logic' | 'advanced'
  icon: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedNodes: number

  // 模板内容
  workflow: Omit<WorkflowDefinition, 'id' | 'name' | 'description'>

  // 预览信息
  preview?: {
    thumbnail?: string
    features: string[]
  }
}

// ============================================
// 预设模板定义
// ============================================

/**
 * 空白模板 - 最小可工作流
 */
const blankTemplate: WorkflowTemplate = {
  id: 'blank',
  name: '空白模板',
  description: '最简单的工作流模板，包含开始和结束节点',
  category: 'basic',
  icon: '📄',
  tags: ['基础', '入门'],
  difficulty: 'beginner',
  estimatedNodes: 2,
  workflow: {
    nodes: [
      {
        id: 'start',
        type: 'start',
        label: '开始',
        description: '工作流起点',
        config: {},
      },
      {
        id: 'end',
        type: 'end',
        label: '结束',
        description: '工作流终点',
        config: {},
      },
    ],
    edges: [
      {
        id: 'start-end',
        source: 'start',
        target: 'end',
      },
    ],
  },
  preview: {
    features: ['开始节点', '结束节点', '基础连接'],
  },
}

/**
 * AI 对话模板 - 简单 AI 对话节点
 */
const aiChatTemplate: WorkflowTemplate = {
  id: 'ai-chat',
  name: 'AI 对话模板',
  description: '包含 AI Agent 节点的简单对话工作流',
  category: 'ai',
  icon: '🤖',
  tags: ['AI', '对话', 'Agent'],
  difficulty: 'beginner',
  estimatedNodes: 3,
  workflow: {
    nodes: [
      {
        id: 'start',
        type: 'start',
        label: '开始',
        description: '接收用户输入',
        config: {},
      },
      {
        id: 'ai-agent',
        type: 'agent',
        label: 'AI Agent',
        description: '处理用户请求',
        config: {
          agentType: 'chat',
          prompt: '请处理用户的请求并提供有帮助的回答',
          inputs: {},
          timeout: 30000,
          maxRetries: 3,
        },
      },
      {
        id: 'end',
        type: 'end',
        label: '结束',
        description: '返回 AI 响应',
        config: {},
      },
    ],
    edges: [
      {
        id: 'start-ai',
        source: 'start',
        target: 'ai-agent',
      },
      {
        id: 'ai-end',
        source: 'ai-agent',
        target: 'end',
      },
    ],
  },
  preview: {
    features: ['开始节点', 'AI Agent', '结束节点', '超时配置', '重试机制'],
  },
}

/**
 * 数据处理模板 - 输入→处理→输出
 */
const dataProcessingTemplate: WorkflowTemplate = {
  id: 'data-processing',
  name: '数据处理模板',
  description: '经典的数据处理流程：输入、转换、输出',
  category: 'data',
  icon: '🔄',
  tags: ['数据处理', '转换', 'ETL'],
  difficulty: 'intermediate',
  estimatedNodes: 4,
  workflow: {
    nodes: [
      {
        id: 'start',
        type: 'start',
        label: '数据输入',
        description: '接收原始数据',
        config: {},
      },
      {
        id: 'transform',
        type: 'transform',
        label: '数据转换',
        description: '转换数据格式',
        config: {
          transformType: 'javascript',
          transformScript: '// 在这里编写转换逻辑\nreturn input;',
          outputFormat: 'json',
        },
      },
      {
        id: 'process',
        type: 'agent',
        label: '数据处理',
        description: '处理转换后的数据',
        config: {
          agentType: 'data',
          prompt: '处理数据并生成结果',
          inputs: {},
        },
      },
      {
        id: 'end',
        type: 'end',
        label: '数据输出',
        description: '输出处理结果',
        config: {},
      },
    ],
    edges: [
      {
        id: 'start-transform',
        source: 'start',
        target: 'transform',
      },
      {
        id: 'transform-process',
        source: 'transform',
        target: 'process',
      },
      {
        id: 'process-end',
        source: 'process',
        target: 'end',
      },
    ],
  },
  preview: {
    features: ['数据输入', 'JavaScript 转换', 'Agent 处理', '数据输出'],
  },
}

/**
 * 条件分支模板 - if/else 逻辑
 */
const conditionalTemplate: WorkflowTemplate = {
  id: 'conditional',
  name: '条件分支模板',
  description: '基于条件的分支逻辑工作流',
  category: 'logic',
  icon: '🔀',
  tags: ['条件', '分支', '逻辑'],
  difficulty: 'intermediate',
  estimatedNodes: 5,
  workflow: {
    nodes: [
      {
        id: 'start',
        type: 'start',
        label: '开始',
        description: '工作流起点',
        config: {},
      },
      {
        id: 'condition',
        type: 'condition',
        label: '条件判断',
        description: '根据条件选择分支',
        config: {
          condition: 'input.value > 0',
          trueBranchLabel: '是',
          falseBranchLabel: '否',
        },
      },
      {
        id: 'true-branch',
        type: 'agent',
        label: '条件为真',
        description: '执行条件为真的逻辑',
        config: {
          agentType: 'task',
          prompt: '执行条件为真的处理逻辑',
          inputs: {},
        },
      },
      {
        id: 'false-branch',
        type: 'agent',
        label: '条件为假',
        description: '执行条件为假的逻辑',
        config: {
          agentType: 'task',
          prompt: '执行条件为假的处理逻辑',
          inputs: {},
        },
      },
      {
        id: 'end',
        type: 'end',
        label: '结束',
        description: '工作流终点',
        config: {},
      },
    ],
    edges: [
      {
        id: 'start-condition',
        source: 'start',
        target: 'condition',
      },
      {
        id: 'condition-true',
        source: 'condition',
        target: 'true-branch',
        conditionConfig: {
          edgeType: 'conditional',
          condition: true,
          label: '是',
        },
      },
      {
        id: 'condition-false',
        source: 'condition',
        target: 'false-branch',
        conditionConfig: {
          edgeType: 'conditional',
          condition: false,
          label: '否',
        },
      },
      {
        id: 'true-end',
        source: 'true-branch',
        target: 'end',
      },
      {
        id: 'false-end',
        source: 'false-branch',
        target: 'end',
      },
    ],
  },
  preview: {
    features: ['条件节点', '双分支逻辑', '条件标签', '分支汇聚'],
  },
}

/**
 * 循环处理模板 - foreach/map 逻辑
 */
const loopTemplate: WorkflowTemplate = {
  id: 'loop',
  name: '循环处理模板',
  description: '遍历数组并对每个元素进行处理',
  category: 'advanced',
  icon: '🔁',
  tags: ['循环', '遍历', '批量处理'],
  difficulty: 'advanced',
  estimatedNodes: 4,
  workflow: {
    nodes: [
      {
        id: 'start',
        type: 'start',
        label: '开始',
        description: '工作流起点',
        config: {},
      },
      {
        id: 'loop',
        type: 'loop',
        label: '循环处理',
        description: '遍历数组元素',
        config: {
          loopType: 'forEach',
          loopArray: 'input.items',
          iterationVariable: 'item',
        },
      },
      {
        id: 'process-item',
        type: 'agent',
        label: '处理元素',
        description: '处理每个数组元素',
        config: {
          agentType: 'task',
          prompt: '处理当前元素: {{item}}',
          inputs: {},
        },
      },
      {
        id: 'end',
        type: 'end',
        label: '结束',
        description: '返回处理结果',
        config: {},
      },
    ],
    edges: [
      {
        id: 'start-loop',
        source: 'start',
        target: 'loop',
      },
      {
        id: 'loop-process',
        source: 'loop',
        target: 'process-item',
      },
      {
        id: 'process-end',
        source: 'process-item',
        target: 'end',
      },
    ],
  },
  preview: {
    features: ['循环节点', 'forEach 遍历', '迭代变量', '批量处理'],
  },
}

// ============================================
// 模板注册表
// ============================================

/**
 * 所有预设模板
 */
export const PRESET_TEMPLATES: WorkflowTemplate[] = [
  blankTemplate,
  aiChatTemplate,
  dataProcessingTemplate,
  conditionalTemplate,
  loopTemplate,
]

// ============================================
// 模板 API
// ============================================

/**
 * 列出所有模板
 */
export function listTemplates(): WorkflowTemplate[] {
  return [...PRESET_TEMPLATES]
}

/**
 * 根据类别筛选模板
 */
export function listTemplatesByCategory(category: WorkflowTemplate['category']): WorkflowTemplate[] {
  return PRESET_TEMPLATES.filter((template) => template.category === category)
}

/**
 * 根据难度筛选模板
 */
export function listTemplatesByDifficulty(difficulty: WorkflowTemplate['difficulty']): WorkflowTemplate[] {
  return PRESET_TEMPLATES.filter((template) => template.difficulty === difficulty)
}

/**
 * 根据标签搜索模板
 */
export function searchTemplatesByTag(tag: string): WorkflowTemplate[] {
  const lowerTag = tag.toLowerCase()
  return PRESET_TEMPLATES.filter((template) =>
    template.tags.some((t) => t.toLowerCase().includes(lowerTag))
  )
}

/**
 * 获取指定模板
 */
export function getTemplate(id: string): WorkflowTemplate | undefined {
  return PRESET_TEMPLATES.find((template) => template.id === id)
}

/**
 * 从模板创建工作流
 */
export function createFromTemplate(
  templateId: string,
  workflowName: string,
  workflowDescription?: string
): WorkflowDefinition | null {
  const template = getTemplate(templateId)
  if (!template) {
    return null
  }

  // 生成唯一的工作流 ID
  const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // 深度复制节点和边，确保每个节点有唯一 ID
  const nodes: WorkflowNodeData[] = template.workflow.nodes.map((node) => ({
    ...node,
    id: `${workflowId}-${node.id}`,
  }))

  const edges = template.workflow.edges.map((edge) => ({
    ...edge,
    id: `${workflowId}-${edge.id}`,
    source: `${workflowId}-${edge.source}`,
    target: `${workflowId}-${edge.target}`,
  }))

  return {
    id: workflowId,
    name: workflowName,
    description: workflowDescription || template.description,
    nodes,
    edges,
    metadata: {
      createdAt: new Date().toISOString(),
      version: '1.12.2',
    },
  }
}

/**
 * 验证模板
 */
export function validateTemplate(template: WorkflowTemplate): boolean {
  // 检查必需字段
  if (!template.id || !template.name || !template.workflow) {
    return false
  }

  // 检查工作流结构
  const { nodes, edges } = template.workflow

  if (!nodes || nodes.length === 0) {
    return false
  }

  // 检查节点 ID 唯一性
  const nodeIds = new Set<string>()
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      return false
    }
    nodeIds.add(node.id)
  }

  // 检查边的引用有效性
  if (edges) {
    for (const edge of edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        return false
      }
    }
  }

  return true
}

/**
 * 获取模板统计信息
 */
export function getTemplateStats(): {
  total: number
  byCategory: Record<string, number>
  byDifficulty: Record<string, number>
} {
  const stats = {
    total: PRESET_TEMPLATES.length,
    byCategory: {} as Record<string, number>,
    byDifficulty: {} as Record<string, number>,
  }

  for (const template of PRESET_TEMPLATES) {
    stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1
    stats.byDifficulty[template.difficulty] = (stats.byDifficulty[template.difficulty] || 0) + 1
  }

  return stats
}