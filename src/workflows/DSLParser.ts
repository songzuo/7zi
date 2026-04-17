/**
 * 工作流 DSL 解析器
 * 支持 JSON 和 YAML 格式的工作流定义
 */

import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  WorkflowStatus,
  EdgeType,
  LoopConfig,
  SubWorkflowConfig,
} from '@/types/workflow'

/**
 * DSL 解析结果
 */
export interface DSLParseResult {
  success: boolean
  workflow?: WorkflowDefinition
  errors: string[]
  warnings: string[]
}

/**
 * DSL 节点定义（简化格式）
 */
export interface DSLNodeDefinition {
  id: string
  type: string | NodeType
  name?: string
  description?: string
  position?: { x: number; y: number }
  config?: Record<string, unknown>
  // 快捷配置
  [key: string]: unknown
}

/**
 * DSL 边定义（简化格式）
 */
export interface DSLEdgeDefinition {
  id: string
  from: string
  to: string
  type?: string
  condition?: string
  label?: string
}

/**
 * DSL 工作流定义（简化格式）
 */
export interface DSLWorkflowDefinition {
  id?: string
  name: string
  description?: string
  version?: number
  variables?: Record<string, unknown>
  nodes: DSLNodeDefinition[]
  edges?: DSLEdgeDefinition[]
  // 快捷方式：使用连线语法
  connections?: string[]
}

/**
 * DSL 解析器
 */
export class DSLParser {
  /**
   * 解析 JSON 格式的工作流定义
   */
  parseJSON(json: string): DSLParseResult {
    try {
      const dsl = JSON.parse(json)
      return this.parseDSL(dsl)
    } catch (error) {
      return {
        success: false,
        errors: [`JSON 解析失败: ${error instanceof Error ? error.message : '未知错误'}`],
        warnings: [],
      }
    }
  }

  /**
   * 解析 YAML 格式的工作流定义
   */
  parseYAML(yaml: string): DSLParseResult {
    try {
      const dsl = this.parseYAMLString(yaml)
      return this.parseDSL(dsl)
    } catch (error) {
      return {
        success: false,
        errors: [`YAML 解析失败: ${error instanceof Error ? error.message : '未知错误'}`],
        warnings: [],
      }
    }
  }

  /**
   * 解析 DSL 对象
   */
  parseDSL(dsl: DSLWorkflowDefinition): DSLParseResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 验证基本字段
    if (!dsl.name) {
      errors.push('工作流名称不能为空')
    }

    if (!dsl.nodes || dsl.nodes.length === 0) {
      errors.push('工作流必须包含至少一个节点')
    }

    if (errors.length > 0) {
      return { success: false, errors, warnings }
    }

    // 转换节点
    const nodes: WorkflowNode[] = dsl.nodes.map((node, index) =>
      this.convertNode(node, index, warnings)
    )

    // 转换边
    const edges: WorkflowEdge[] = []

    // 从 edges 字段转换
    if (dsl.edges) {
      edges.push(...dsl.edges.map(edge => this.convertEdge(edge)))
    }

    // 从 connections 快捷语法转换
    if (dsl.connections) {
      edges.push(...this.parseConnections(dsl.connections))
    }

    // 构建工作流定义
    const workflow: WorkflowDefinition = {
      id: dsl.id || `workflow_${Date.now()}`,
      name: dsl.name,
      description: dsl.description,
      version: dsl.version || 1,
      status: WorkflowStatus.DRAFT,
      nodes,
      edges,
      config: {
        variables: dsl.variables || {},
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'dsl_parser',
        updatedBy: 'dsl_parser',
      },
    }

    // 验证工作流
    const validation = this.validateWorkflow(workflow)
    errors.push(...validation.errors)
    warnings.push(...validation.warnings)

    return {
      success: errors.length === 0,
      workflow: errors.length === 0 ? workflow : undefined,
      errors,
      warnings,
    }
  }

  /**
   * 转换节点定义
   */
  private convertNode(
    node: DSLNodeDefinition,
    index: number,
    warnings: string[]
  ): WorkflowNode {
    const workflowNode: WorkflowNode = {
      id: node.id || `node_${index}`,
      type: this.normalizeNodeType(node.type),
      name: node.name || node.type || `节点 ${index + 1}`,
      description: node.description,
      position: node.position || { x: 100, y: index * 100 },
      config: node.config || {},
    }

    // 处理特殊节点类型的配置
    switch (workflowNode.type) {
      case NodeType.AGENT:
        workflowNode.agentConfig = this.extractAgentConfig(node, warnings)
        break

      case NodeType.CONDITION:
        workflowNode.conditionConfig = this.extractConditionConfig(node, warnings)
        if (node.branches) {
          // Cast to avoid type mismatch with AdvancedCondition which doesn't have branches
          ;(workflowNode.config as Record<string, unknown>).advancedCondition = {
            branches: node.branches,
            defaultBranch: node.defaultBranch,
          }
        }
        break

      case NodeType.WAIT:
        workflowNode.waitConfig = this.extractWaitConfig(node, warnings)
        break

      case NodeType.LOOP:
        workflowNode.loopConfig = this.extractLoopConfig(node, warnings) as unknown as LoopConfig
        break

      case NodeType.SUBWORKFLOW:
        workflowNode.subWorkflowConfig = this.extractSubWorkflowConfig(node, warnings) as unknown as SubWorkflowConfig
        break

      case NodeType.PARALLEL:
        if (node.branches) {
          // Cast to avoid type mismatch with ParallelConfig which doesn't have branches
          ;(workflowNode.config as Record<string, unknown>).parallel = {
            branches: node.branches,
            failureStrategy: node.failureStrategy || 'continue_on_error',
            aggregationStrategy: node.aggregationStrategy || 'all',
          }
        }
        break
    }

    return workflowNode
  }

  /**
   * 转换边定义
   */
  private convertEdge(edge: DSLEdgeDefinition): WorkflowEdge {
    // Convert string type to EdgeType enum, default to SEQUENCE
    let edgeType: EdgeType
    if (edge.type && Object.values(EdgeType).includes(edge.type as EdgeType)) {
      edgeType = edge.type as EdgeType
    } else if (edge.type) {
      // Try to find matching enum value by string comparison
      const upperType = edge.type.toUpperCase()
      const matchedType = Object.values(EdgeType).find(
        (et) => et.toString() === upperType
      )
      edgeType = matchedType || EdgeType.SEQUENCE
    } else {
      edgeType = EdgeType.SEQUENCE
    }

    return {
      id: edge.id || `edge_${edge.from}_${edge.to}`,
      source: edge.from,
      target: edge.to,
      type: edgeType,
      conditionConfig: edge.condition
        ? {
            condition: edge.condition,
            label: edge.label,
          }
        : undefined,
    }
  }

  /**
   * 解析连线快捷语法
   * 支持格式: "node1 -> node2 -> node3" 或 "node1 --[condition]--> node2"
   */
  private parseConnections(connections: string[]): WorkflowEdge[] {
    const edges: WorkflowEdge[] = []
    let edgeIndex = 0

    for (const conn of connections) {
      // 解析连线语法
      const parsed = this.parseConnectionSyntax(conn)
      for (const edge of parsed) {
        // Convert string type to EdgeType enum, default to SEQUENCE
        let edgeType: EdgeType
        if (edge.type && Object.values(EdgeType).includes(edge.type as EdgeType)) {
          edgeType = edge.type as EdgeType
        } else if (edge.type) {
          const upperType = edge.type.toUpperCase()
          const matchedType = Object.values(EdgeType).find(
            (et) => et.toString() === upperType
          )
          edgeType = matchedType || EdgeType.SEQUENCE
        } else {
          edgeType = EdgeType.SEQUENCE
        }

        edges.push({
          id: `edge_${edgeIndex++}`,
          source: edge.from,
          target: edge.to,
          type: edgeType,
          conditionConfig: edge.condition
            ? {
                condition: edge.condition,
                label: edge.label,
              }
            : undefined,
        })
      }
    }

    return edges
  }

  /**
   * 解析单个连线语法
   */
  private parseConnectionSyntax(
    conn: string
  ): Array<{ from: string; to: string; type?: string; condition?: string; label?: string }> {
    const results: Array<{
      from: string
      to: string
      type?: string
      condition?: string
      label?: string
    }> = []

    // 简单解析: "node1 -> node2"
    const parts = conn.split(/\s*->\s*/)
    for (let i = 0; i < parts.length - 1; i++) {
      let from = parts[i].trim()
      const to = parts[i + 1].trim()
      let condition: string | undefined
      let label: string | undefined

      // 检查条件语法: "node1 --[condition]--> node2"
      const condMatch = from.match(/^(.+?)\s*--\[(.+?)\]--$/)
      if (condMatch) {
        from = condMatch[1].trim()
        condition = condMatch[2].trim()
        label = condition
      }

      results.push({ from, to, condition, label })
    }

    return results
  }

  /**
   * 规范化节点类型
   */
  private normalizeNodeType(type: string | NodeType): NodeType {
    const typeMap: Record<string, NodeType> = {
      start: NodeType.START,
      end: NodeType.END,
      agent: NodeType.AGENT,
      ai: NodeType.AGENT,
      condition: NodeType.CONDITION,
      if: NodeType.CONDITION,
      parallel: NodeType.PARALLEL,
      wait: NodeType.WAIT,
      delay: NodeType.WAIT,
      loop: NodeType.LOOP as unknown as NodeType,
      foreach: NodeType.LOOP as unknown as NodeType,
      subworkflow: NodeType.SUBWORKFLOW as unknown as NodeType,
      call: NodeType.SUBWORKFLOW as unknown as NodeType,
      human_input: NodeType.HUMAN_INPUT,
      human: NodeType.HUMAN_INPUT,
    }

    return typeMap[type.toLowerCase()] || (type as NodeType)
  }

  /**
   * 提取 Agent 配置
   */
  private extractAgentConfig(
    node: DSLNodeDefinition,
    _warnings: string[]
  ): WorkflowNode['agentConfig'] {
    return {
      agentId: node.agentId as string,
      agentType: node.agentType as string,
      prompt: node.prompt as string,
      model: node.model as string,
      timeout: node.timeout as number,
      retryCount: node.retryCount as number,
    }
  }

  /**
   * 提取条件配置
   */
  private extractConditionConfig(
    node: DSLNodeDefinition,
    _warnings: string[]
  ): WorkflowNode['conditionConfig'] {
    return {
      expression: node.expression as string || node.condition as string,
      trueLabel: node.trueLabel as string || 'true',
      falseLabel: node.falseLabel as string || 'false',
    }
  }

  /**
   * 提取等待配置
   */
  private extractWaitConfig(
    node: DSLNodeDefinition,
    _warnings: string[]
  ): WorkflowNode['waitConfig'] {
    return {
      duration: node.duration as number || node.wait as number,
      waitForEvent: node.event as string,
    }
  }

  /**
   * 提取循环配置
   */
  private extractLoopConfig(
    node: DSLNodeDefinition,
    _warnings: string[]
  ): Record<string, unknown> {
    return {
      type: node.loopType || 'fixed',
      iterations: node.iterations as number,
      condition: node.loopCondition as string,
      collection: node.collection as string,
      itemVariable: node.item as string || 'item',
      indexVariable: node.index as string || 'index',
      maxIterations: node.maxIterations as number,
    }
  }

  /**
   * 提取子工作流配置
   */
  private extractSubWorkflowConfig(
    node: DSLNodeDefinition,
    _warnings: string[]
  ): Record<string, unknown> {
    return {
      workflowId: node.workflowId as string || node.targetWorkflow as string,
      workflowVersion: node.version as number,
      inputMapping: node.inputMapping as Record<string, string>,
      outputMapping: node.outputMapping as Record<string, string>,
      timeout: node.timeout as number,
      async: node.async as boolean,
    }
  }

  /**
   * 验证工作流
   */
  private validateWorkflow(
    workflow: WorkflowDefinition
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    // 检查开始和结束节点
    const startNodes = workflow.nodes.filter(n => n.type === NodeType.START)
    const endNodes = workflow.nodes.filter(n => n.type === NodeType.END)

    if (startNodes.length === 0) {
      warnings.push('工作流没有开始节点')
    } else if (startNodes.length > 1) {
      warnings.push('工作流有多个开始节点，将使用第一个')
    }

    if (endNodes.length === 0) {
      warnings.push('工作流没有结束节点')
    }

    // 检查孤立节点
    const connectedNodes = new Set<string>()
    workflow.edges.forEach(edge => {
      connectedNodes.add(edge.source)
      connectedNodes.add(edge.target)
    })

    workflow.nodes.forEach(node => {
      if (
        node.type !== NodeType.START &&
        node.type !== NodeType.END &&
        !connectedNodes.has(node.id)
      ) {
        warnings.push(`节点 ${node.id} 是孤立节点`)
      }
    })

    // 检查边的引用
    const nodeIds = new Set(workflow.nodes.map(n => n.id))
    workflow.edges.forEach(edge => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`边的源节点不存在: ${edge.source}`)
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`边的目标节点不存在: ${edge.target}`)
      }
    })

    return { errors, warnings }
  }

  /**
   * 简单的 YAML 解析器
   * 仅支持基础格式，复杂 YAML 建议使用第三方库
   */
  private parseYAMLString(yaml: string): DSLWorkflowDefinition {
    const lines = yaml.split('\n')
    const result: DSLWorkflowDefinition = {
      name: '',
      nodes: [],
    }

    let currentSection = ''
    let currentNode: DSLNodeDefinition | null = null
    const indent = 0

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const currentIndent = line.search(/\S/)

      // 顶级字段
      if (currentIndent === 0) {
        if (trimmed.endsWith(':')) {
          currentSection = trimmed.slice(0, -1)
          continue
        }

        const [key, ...valueParts] = trimmed.split(':')
        const value = valueParts.join(':').trim()

        switch (key.trim()) {
          case 'id':
            result.id = value
            break
          case 'name':
            result.name = value
            break
          case 'description':
            result.description = value
            break
          case 'version':
            result.version = parseInt(value, 10)
            break
        }
        continue
      }

      // 节点部分
      if (currentSection === 'nodes') {
        if (currentIndent === 2 && trimmed.startsWith('-')) {
          // 新节点
          if (currentNode) {
            result.nodes.push(currentNode)
          }
          currentNode = {
            id: '',
            type: 'agent',
          }
          const nodeDef = trimmed.slice(1).trim()
          if (nodeDef.includes(':')) {
            // Dynamic property assignment for DSL parsing
            const colonIdx = nodeDef.indexOf(':')
            const propKey = nodeDef.substring(0, colonIdx).trim()
            const propVal = nodeDef.substring(colonIdx + 1).trim()
            ;(currentNode as Record<string, unknown>)[propKey] = propVal
          }
        } else if (currentNode && currentIndent >= 4) {
          // 节点属性
          const colonIdx = trimmed.indexOf(':')
          const propKey = trimmed.substring(0, colonIdx).trim()
          const propVal = this.parseYAMLValue(trimmed.substring(colonIdx + 1).trim())
          // Dynamic property assignment for DSL parsing
          ;(currentNode as Record<string, unknown>)[propKey] = propVal
        }
      }

      // 变量部分
      if (currentSection === 'variables') {
        if (!result.variables) result.variables = {}
        const colonIdx = trimmed.indexOf(':')
        const varKey = trimmed.substring(0, colonIdx).trim()
        const varVal = this.parseYAMLValue(trimmed.substring(colonIdx + 1).trim())
        result.variables[varKey] = varVal
      }
    }

    // 添加最后一个节点
    if (currentNode) {
      result.nodes.push(currentNode)
    }

    return result
  }

  /**
   * 解析 YAML 值
   */
  private parseYAMLValue(value: string): unknown {
    if (!value) return null

    // 字符串
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1)
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1)
    }

    // 数字
    const num = Number(value)
    if (!isNaN(num)) {
      return num
    }

    // 布尔
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false

    // 数组
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }

    // 对象
    if (value.startsWith('{') && value.endsWith('}')) {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }

    return value
  }
}

// 导出单例实例
export const dslParser = new DSLParser()