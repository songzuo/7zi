/**
 * 工作流 DSL 解析器
 * 支持 JSON 和 YAML 格式的工作流定义
 */

// @ts-ignore - js-yaml doesn't have types
import yaml from 'js-yaml'
import { WorkflowDefinition, WorkflowNode, WorkflowEdge, NodeType, EdgeType, WorkflowStatus } from '@/types/workflow'

/**
 * DSL 格式
 */
export enum DSLFormat {
  JSON = 'json',
  YAML = 'yaml',
}

/**
 * 工作流 DSL 定义（JSON/YAML 格式）
 */
export interface WorkflowDSL {
  id: string
  name: string
  description?: string
  version: number
  status?: WorkflowStatus

  // 节点定义
  nodes: Array<{
    id: string
    type: NodeType
    name: string
    description?: string
    position: { x: number; y: number }
    config?: Record<string, unknown>
  }>

  // 边定义
  edges: Array<{
    id: string
    source: string
    target: string
    type?: EdgeType
    conditionConfig?: {
      condition?: string
      label?: string
    }
    style?: {
      color?: string
      width?: number
      style?: 'solid' | 'dashed' | 'dotted'
    }
  }>

  // 全局配置
  config?: {
    timeout?: number
    retryPolicy?: {
      maxRetries: number
      backoff: 'fixed' | 'exponential'
      interval: number
    }
    variables?: Record<string, unknown>
  }

  // 元数据
  metadata?: {
    createdAt?: string
    updatedAt?: string
    createdBy?: string
    updatedBy?: string
  }
}

/**
 * 解析结果
 */
export interface ParseResult {
  success: boolean
  workflow?: WorkflowDefinition
  errors: string[]
  warnings: string[]
}

/**
 * 工作流 DSL 解析器
 */
export class WorkflowDSLParser {
  /**
   * 从字符串解析工作流定义
   */
  parse(content: string, format: DSLFormat = DSLFormat.JSON): ParseResult {
    try {
      let dsl: WorkflowDSL

      // 根据格式解析
      switch (format) {
        case DSLFormat.JSON:
          dsl = JSON.parse(content)
          break

        case DSLFormat.YAML:
          dsl = yaml.load(content) as WorkflowDSL
          break

        default:
          return {
            success: false,
            errors: [`不支持的格式: ${format}`],
            warnings: [],
          }
      }

      // 验证 DSL 结构
      const validation = this.validateDSL(dsl)
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        }
      }

      // 转换为工作流定义
      const workflow = this.convertToWorkflowDefinition(dsl)

      return {
        success: true,
        workflow,
        errors: [],
        warnings: validation.warnings,
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : '解析失败'],
        warnings: [],
      }
    }
  }

  /**
   * 从文件解析工作流定义
   */
  parseFile(filePath: string): ParseResult {
    const fs = require('fs')
    const path = require('path')

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const ext = path.extname(filePath).toLowerCase()

      let format: DSLFormat
      switch (ext) {
        case '.json':
          format = DSLFormat.JSON
          break
        case '.yaml':
        case '.yml':
          format = DSLFormat.YAML
          break
        default:
          return {
            success: false,
            errors: [`不支持的文件扩展名: ${ext}`],
            warnings: [],
          }
      }

      return this.parse(content, format)
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : '文件读取失败'],
        warnings: [],
      }
    }
  }

  /**
   * 将工作流定义序列化为字符串
   */
  serialize(workflow: WorkflowDefinition, format: DSLFormat = DSLFormat.JSON): string {
    const dsl = this.convertToDSL(workflow)

    switch (format) {
      case DSLFormat.JSON:
        return JSON.stringify(dsl, null, 2)

      case DSLFormat.YAML:
        return yaml.dump(dsl, { indent: 2, lineWidth: -1 })

      default:
        throw new Error(`不支持的格式: ${format}`)
    }
  }

  /**
   * 将工作流定义保存到文件
   */
  saveToFile(workflow: WorkflowDefinition, filePath: string): void {
    const fs = require('fs')
    const path = require('path')

    const ext = path.extname(filePath).toLowerCase()
    let format: DSLFormat

    switch (ext) {
      case '.json':
        format = DSLFormat.JSON
        break
      case '.yaml':
      case '.yml':
        format = DSLFormat.YAML
        break
      default:
        throw new Error(`不支持的文件扩展名: ${ext}`)
    }

    const content = this.serialize(workflow, format)
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  /**
   * 验证 DSL 结构
   */
  private validateDSL(dsl: WorkflowDSL): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    // 基本字段验证
    if (!dsl.id) {
      errors.push('工作流 ID 不能为空')
    }

    if (!dsl.name) {
      errors.push('工作流名称不能为空')
    }

    if (!dsl.version || dsl.version < 1) {
      errors.push('工作流版本必须大于等于 1')
    }

    // 节点验证
    if (!dsl.nodes || dsl.nodes.length === 0) {
      errors.push('工作流必须包含至少一个节点')
    } else {
      const nodeIds = new Set<string>()
      for (const node of dsl.nodes) {
        if (!node.id) {
          errors.push('存在没有 ID 的节点')
        } else if (nodeIds.has(node.id)) {
          errors.push(`节点 ID 重复: ${node.id}`)
        } else {
          nodeIds.add(node.id)
        }

        if (!node.type) {
          errors.push(`节点 ${node.id} 缺少类型`)
        } else if (!Object.values(NodeType).includes(node.type)) {
          warnings.push(`节点 ${node.id} 使用了未知的类型: ${node.type}`)
        }

        if (!node.name) {
          warnings.push(`节点 ${node.id} 缺少名称`)
        }

        if (!node.position) {
          errors.push(`节点 ${node.id} 缺少位置信息`)
        }
      }

      // 检查开始和结束节点
      const startNodes = dsl.nodes.filter(n => n.type === NodeType.START)
      const endNodes = dsl.nodes.filter(n => n.type === NodeType.END)

      if (startNodes.length === 0) {
        errors.push('工作流必须包含至少一个开始节点')
      } else if (startNodes.length > 1) {
        warnings.push('工作流包含多个开始节点，只有第一个会被使用')
      }

      if (endNodes.length === 0) {
        errors.push('工作流必须包含至少一个结束节点')
      }
    }

    // 边验证
    if (!dsl.edges) {
      warnings.push('工作流没有定义边')
    } else {
      const edgeIds = new Set<string>()
      const nodeIds = new Set(dsl.nodes.map(n => n.id))

      for (const edge of dsl.edges) {
        if (!edge.id) {
          errors.push('存在没有 ID 的边')
        } else if (edgeIds.has(edge.id)) {
          errors.push(`边 ID 重复: ${edge.id}`)
        } else {
          edgeIds.add(edge.id)
        }

        if (!edge.source) {
          errors.push('边缺少源节点')
        } else if (!nodeIds.has(edge.source)) {
          errors.push(`边的源节点不存在: ${edge.source}`)
        }

        if (!edge.target) {
          errors.push('边缺少目标节点')
        } else if (!nodeIds.has(edge.target)) {
          errors.push(`边的目标节点不存在: ${edge.target}`)
        }

        if (edge.type && !Object.values(EdgeType).includes(edge.type)) {
          warnings.push(`边 ${edge.id} 使用了未知的类型: ${edge.type}`)
        }
      }

      // 检查孤立节点
      const connectedNodes = new Set<string>()
      dsl.edges.forEach(edge => {
        connectedNodes.add(edge.source)
        connectedNodes.add(edge.target)
      })

      dsl.nodes.forEach(node => {
        if (node.type !== NodeType.START && node.type !== NodeType.END && !connectedNodes.has(node.id)) {
          warnings.push(`节点 ${node.id} 是孤立节点，没有连接`)
        }
      })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * 将 DSL 转换为工作流定义
   */
  private convertToWorkflowDefinition(dsl: WorkflowDSL): WorkflowDefinition {
    const now = new Date().toISOString()

    // 转换节点
    const nodes: WorkflowNode[] = dsl.nodes.map(node => ({
      id: node.id,
      type: node.type,
      name: node.name,
      description: node.description,
      position: node.position,
      // 将通用配置转换为特定配置
      agentConfig: this.extractAgentConfig(node.config),
      conditionConfig: this.extractConditionConfig(node.config),
      waitConfig: this.extractWaitConfig(node.config),
      humanInputConfig: this.extractHumanInputConfig(node.config),
      loopConfig: this.extractLoopConfig(node.config),
      subWorkflowConfig: this.extractSubWorkflowConfig(node.config),
      config: this.extractGenericConfig(node.config),
    }))

    // 转换边
    const edges: WorkflowEdge[] = (dsl.edges || []).map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type || EdgeType.SEQUENCE,
      conditionConfig: edge.conditionConfig as WorkflowEdge['conditionConfig'],
      style: edge.style,
    }))

    // 构建工作流定义
    const workflow: WorkflowDefinition = {
      id: dsl.id,
      name: dsl.name,
      description: dsl.description,
      version: dsl.version,
      status: dsl.status || WorkflowStatus.DRAFT,
      nodes,
      edges,
      config: {
        timeout: dsl.config?.timeout,
        retryPolicy: dsl.config?.retryPolicy,
        variables: dsl.config?.variables || {},
      },
      metadata: {
        createdAt: dsl.metadata?.createdAt || now,
        updatedAt: dsl.metadata?.updatedAt || now,
        createdBy: dsl.metadata?.createdBy || 'system',
        updatedBy: dsl.metadata?.updatedBy || 'system',
      },
    }

    return workflow
  }

  /**
   * 将工作流定义转换为 DSL
   */
  private convertToDSL(workflow: WorkflowDefinition): WorkflowDSL {
    // 转换节点
    const nodes = workflow.nodes.map(node => ({
      id: node.id,
      type: node.type,
      name: node.name,
      description: node.description,
      position: node.position,
      config: {
        ...node.agentConfig,
        ...node.conditionConfig,
        ...node.waitConfig,
        ...node.humanInputConfig,
        ...node.loopConfig,
        ...node.subWorkflowConfig,
        ...node.config,
      },
    }))

    // 转换边
    const edges = workflow.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      conditionConfig: edge.conditionConfig,
      style: edge.style,
    }))

    // 构建 DSL
    const dsl: WorkflowDSL = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      version: workflow.version,
      status: workflow.status,
      nodes,
      edges,
      config: workflow.config,
      metadata: workflow.metadata,
    }

    return dsl
  }

  /**
   * 提取 Agent 配置
   */
  private extractAgentConfig(config?: Record<string, unknown>): WorkflowNode['agentConfig'] {
    if (!config) return undefined

    const agentKeys = ['agentId', 'agentType', 'prompt', 'model', 'timeout', 'retryCount']
    const agentConfig: Record<string, unknown> = {}

    for (const key of agentKeys) {
      if (key in config) {
        agentConfig[key] = config[key]
      }
    }

    return Object.keys(agentConfig).length > 0 ? (agentConfig as WorkflowNode['agentConfig']) : undefined
  }

  /**
   * 提取条件配置
   */
  private extractConditionConfig(config?: Record<string, unknown>): WorkflowNode['conditionConfig'] {
    if (!config) return undefined

    const conditionKeys = ['expression', 'trueLabel', 'falseLabel']
    const conditionConfig: Record<string, unknown> = {}

    for (const key of conditionKeys) {
      if (key in config) {
        conditionConfig[key] = config[key]
      }
    }

    return Object.keys(conditionConfig).length > 0
      ? (conditionConfig as WorkflowNode['conditionConfig'])
      : undefined
  }

  /**
   * 提取等待配置
   */
  private extractWaitConfig(config?: Record<string, unknown>): WorkflowNode['waitConfig'] {
    if (!config) return undefined

    const waitKeys = ['duration', 'waitForEvent']
    const waitConfig: Record<string, unknown> = {}

    for (const key of waitKeys) {
      if (key in config) {
        waitConfig[key] = config[key]
      }
    }

    return Object.keys(waitConfig).length > 0 ? (waitConfig as WorkflowNode['waitConfig']) : undefined
  }

  /**
   * 提取人工输入配置
   */
  private extractHumanInputConfig(config?: Record<string, unknown>): WorkflowNode['humanInputConfig'] {
    if (!config) return undefined

    const humanInputKeys = ['formSchema', 'requiredApprovals']
    const humanInputConfig: Record<string, unknown> = {}

    for (const key of humanInputKeys) {
      if (key in config) {
        humanInputConfig[key] = config[key]
      }
    }

    return Object.keys(humanInputConfig).length > 0
      ? (humanInputConfig as WorkflowNode['humanInputConfig'])
      : undefined
  }

  /**
   * 提取循环配置
   */
  private extractLoopConfig(config?: Record<string, unknown>): WorkflowNode['loopConfig'] {
    if (!config) return undefined

    const loopKeys = ['loopType', 'iterations', 'condition', 'iterator', 'collection', 'maxIterations']
    const loopConfig: Record<string, unknown> = {}

    for (const key of loopKeys) {
      if (key in config) {
        loopConfig[key] = config[key]
      }
    }

    return Object.keys(loopConfig).length > 0 ? (loopConfig as unknown as WorkflowNode['loopConfig']) : undefined
  }

  /**
   * 提取子工作流配置
   */
  private extractSubWorkflowConfig(config?: Record<string, unknown>): WorkflowNode['subWorkflowConfig'] {
    if (!config) return undefined

    const subWorkflowKeys = ['subWorkflowId', 'inputs', 'outputMapping', 'waitForCompletion', 'timeout']
    const subWorkflowConfig: Record<string, unknown> = {}

    for (const key of subWorkflowKeys) {
      if (key in config) {
        subWorkflowConfig[key] = config[key]
      }
    }

    return Object.keys(subWorkflowConfig).length > 0
      ? (subWorkflowConfig as unknown as WorkflowNode['subWorkflowConfig'])
      : undefined
  }

  /**
   * 提取通用配置
   */
  private extractGenericConfig(config?: Record<string, unknown>): WorkflowNode['config'] {
    if (!config) return undefined

    const genericKeys = ['timeout', 'retryPolicy', 'inputs', 'outputs', 'advancedCondition', 'parallel', 'aiAgent']
    const genericConfig: Record<string, unknown> = {}

    for (const key of genericKeys) {
      if (key in config) {
        genericConfig[key] = config[key]
      }
    }

    return Object.keys(genericConfig).length > 0 ? (genericConfig as WorkflowNode['config']) : undefined
  }
}

// 导出单例实例
export const workflowDSLParser = new WorkflowDSLParser()

/**
 * 创建示例工作流 DSL
 */
export function createExampleWorkflowDSL(): WorkflowDSL {
  return {
    id: 'example-workflow',
    name: '示例工作流',
    description: '一个简单的工作流示例',
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [
      {
        id: 'start',
        type: NodeType.START,
        name: '开始',
        position: { x: 100, y: 100 },
      },
      {
        id: 'agent1',
        type: NodeType.AGENT,
        name: '数据处理',
        description: '使用 Agent 处理数据',
        position: { x: 300, y: 100 },
        config: {
          agentId: 'data-processor',
          agentType: 'task',
          prompt: '处理输入数据',
          model: 'gpt-4',
          timeout: 60,
        },
      },
      {
        id: 'condition1',
        type: NodeType.CONDITION,
        name: '条件判断',
        description: '判断处理结果',
        position: { x: 500, y: 100 },
        config: {
          expression: '${result.success}',
          trueLabel: '成功',
          falseLabel: '失败',
        },
      },
      {
        id: 'agent2',
        type: NodeType.AGENT,
        name: '成功处理',
        description: '处理成功后的操作',
        position: { x: 700, y: 50 },
        config: {
          agentId: 'success-handler',
          agentType: 'task',
          prompt: '处理成功结果',
        },
      },
      {
        id: 'agent3',
        type: NodeType.AGENT,
        name: '失败处理',
        description: '处理失败后的操作',
        position: { x: 700, y: 150 },
        config: {
          agentId: 'error-handler',
          agentType: 'task',
          prompt: '处理错误',
        },
      },
      {
        id: 'end',
        type: NodeType.END,
        name: '结束',
        position: { x: 900, y: 100 },
      },
    ],
    edges: [
      {
        id: 'edge1',
        source: 'start',
        target: 'agent1',
        type: EdgeType.SEQUENCE,
      },
      {
        id: 'edge2',
        source: 'agent1',
        target: 'condition1',
        type: EdgeType.SEQUENCE,
      },
      {
        id: 'edge3',
        source: 'condition1',
        target: 'agent2',
        type: EdgeType.CONDITION,
        conditionConfig: {
          label: '成功',
        },
      },
      {
        id: 'edge4',
        source: 'condition1',
        target: 'agent3',
        type: EdgeType.CONDITION,
        conditionConfig: {
          label: '失败',
        },
      },
      {
        id: 'edge5',
        source: 'agent2',
        target: 'end',
        type: EdgeType.SEQUENCE,
      },
      {
        id: 'edge6',
        source: 'agent3',
        target: 'end',
        type: EdgeType.SEQUENCE,
      },
    ],
    config: {
      timeout: 300,
      retryPolicy: {
        maxRetries: 3,
        backoff: 'exponential',
        interval: 5,
      },
      variables: {
        environment: 'production',
      },
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system',
    },
  }
}