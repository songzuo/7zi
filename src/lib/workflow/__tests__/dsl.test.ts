/**
 * 工作流 DSL 解析器测试
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { WorkflowDSLParser, DSLFormat, createExampleWorkflowDSL } from '../dsl'
import { WorkflowStatus, NodeType, EdgeType } from '@/types/workflow'

describe('WorkflowDSLParser', () => {
  let parser: WorkflowDSLParser

  beforeEach(() => {
    parser = new WorkflowDSLParser()
  })

  describe('JSON 解析', () => {
    it('应该成功解析有效的 JSON DSL', () => {
      const jsonContent = JSON.stringify(createExampleWorkflowDSL(), null, 2)
      const result = parser.parse(jsonContent, DSLFormat.JSON)

      expect(result.success).toBe(true)
      expect(result.workflow).toBeDefined()
      expect(result.errors).toHaveLength(0)
      expect(result.workflow?.id).toBe('example-workflow')
      expect(result.workflow?.name).toBe('示例工作流')
    })

    it('应该拒绝无效的 JSON', () => {
      const result = parser.parse('{ invalid json }', DSLFormat.JSON)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('应该验证必需字段', () => {
      const invalidDSL = {
        // 缺少 id
        name: 'test',
        version: 1,
        nodes: [],
        edges: [],
      }

      const result = parser.parse(JSON.stringify(invalidDSL), DSLFormat.JSON)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('工作流 ID 不能为空')
    })
  })

  describe('YAML 解析', () => {
    it('应该成功解析有效的 YAML DSL', () => {
      const yamlContent = `
id: test-workflow
name: 测试工作流
description: YAML 测试
version: 1
status: active
nodes:
  - id: start
    type: start
    name: 开始
    position:
      x: 100
      y: 100
  - id: end
    type: end
    name: 结束
    position:
      x: 300
      y: 100
edges:
  - id: edge1
    source: start
    target: end
    type: sequence
`

      const result = parser.parse(yamlContent, DSLFormat.YAML)

      expect(result.success).toBe(true)
      expect(result.workflow).toBeDefined()
      expect(result.workflow?.id).toBe('test-workflow')
      expect(result.workflow?.name).toBe('测试工作流')
    })

    it('应该验证节点类型', () => {
      const yamlContent = `
id: test-workflow
name: 测试工作流
version: 1
nodes:
  - id: start
    type: invalid_type
    name: 开始
    position:
      x: 100
      y: 100
  - id: end
    type: end
    name: 结束
    position:
      x: 300
      y: 100
edges:
  - id: edge1
    source: start
    target: end
`

      const result = parser.parse(yamlContent, DSLFormat.YAML)

      expect(result.success).toBe(true) // 仍然成功，但会警告
      expect(result.warnings).toContain('节点 start 使用了未知的类型: invalid_type')
    })
  })

  describe('节点验证', () => {
    it('应该要求有开始节点', () => {
      const dsl = {
        id: 'test',
        name: 'test',
        version: 1,
        nodes: [
          {
            id: 'end',
            type: NodeType.END,
            name: '结束',
            position: { x: 100, y: 100 },
          },
        ],
        edges: [],
      }

      const result = parser.parse(JSON.stringify(dsl), DSLFormat.JSON)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('工作流必须包含至少一个开始节点')
    })

    it('应该要求有结束节点', () => {
      const dsl = {
        id: 'test',
        name: 'test',
        version: 1,
        nodes: [
          {
            id: 'start',
            type: NodeType.START,
            name: '开始',
            position: { x: 100, y: 100 },
          },
        ],
        edges: [],
      }

      const result = parser.parse(JSON.stringify(dsl), DSLFormat.JSON)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('工作流必须包含至少一个结束节点')
    })

    it('应该检测重复的节点 ID', () => {
      const dsl = {
        id: 'test',
        name: 'test',
        version: 1,
        nodes: [
          {
            id: 'duplicate',
            type: NodeType.START,
            name: '开始',
            position: { x: 100, y: 100 },
          },
          {
            id: 'duplicate',
            type: NodeType.END,
            name: '结束',
            position: { x: 300, y: 100 },
          },
        ],
        edges: [],
      }

      const result = parser.parse(JSON.stringify(dsl), DSLFormat.JSON)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('节点 ID 重复: duplicate')
    })
  })

  describe('边验证', () => {
    it('应该验证边连接到存在的节点', () => {
      const dsl = {
        id: 'test',
        name: 'test',
        version: 1,
        nodes: [
          {
            id: 'start',
            type: NodeType.START,
            name: '开始',
            position: { x: 100, y: 100 },
          },
        ],
        edges: [
          {
            id: 'edge1',
            source: 'start',
            target: 'nonexistent', // 不存在的节点
          },
        ],
      }

      const result = parser.parse(JSON.stringify(dsl), DSLFormat.JSON)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('边的目标节点不存在: nonexistent')
    })

    it('应该检测重复的边 ID', () => {
      const dsl = {
        id: 'test',
        name: 'test',
        version: 1,
        nodes: [
          {
            id: 'start',
            type: NodeType.START,
            name: '开始',
            position: { x: 100, y: 100 },
          },
          {
            id: 'end',
            type: NodeType.END,
            name: '结束',
            position: { x: 300, y: 100 },
          },
        ],
        edges: [
          {
            id: 'duplicate',
            source: 'start',
            target: 'end',
          },
          {
            id: 'duplicate',
            source: 'end',
            target: 'start',
          },
        ],
      }

      const result = parser.parse(JSON.stringify(dsl), DSLFormat.JSON)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('边 ID 重复: duplicate')
    })
  })

  describe('序列化', () => {
    it('应该能够序列化为 JSON', () => {
      const dsl = createExampleWorkflowDSL()
      const workflow = parser.parse(JSON.stringify(dsl), DSLFormat.JSON)

      expect(workflow.success).toBe(true)
      const json = parser.serialize(workflow.workflow!, DSLFormat.JSON)

      const parsed = JSON.parse(json)
      expect(parsed.id).toBe(dsl.id)
      expect(parsed.name).toBe(dsl.name)
      expect(parsed.nodes).toHaveLength(dsl.nodes.length)
      expect(parsed.edges).toHaveLength(dsl.edges.length)
    })

    it('应该能够序列化为 YAML', () => {
      const dsl = createExampleWorkflowDSL()
      const workflow = parser.parse(JSON.stringify(dsl), DSLFormat.JSON)

      expect(workflow.success).toBe(true)
      const yaml = parser.serialize(workflow.workflow!, DSLFormat.YAML)

      expect(yaml).toContain('id: example-workflow')
      expect(yaml).toContain('name: 示例工作流')
    })
  })

  describe('工作流定义转换', () => {
    it('应该正确转换节点配置', () => {
      const dsl = {
        id: 'test',
        name: 'test',
        version: 1,
        nodes: [
          {
            id: 'agent1',
            type: NodeType.AGENT,
            name: 'Agent 节点',
            position: { x: 100, y: 100 },
            config: {
              agentId: 'test-agent',
              agentType: 'task',
              prompt: '测试提示',
              timeout: 60,
            },
          },
          {
            id: 'condition1',
            type: NodeType.CONDITION,
            name: '条件节点',
            position: { x: 300, y: 100 },
            config: {
              expression: '${result.success}',
              trueLabel: '是',
              falseLabel: '否',
            },
          },
          {
            id: 'wait1',
            type: NodeType.WAIT,
            name: '等待节点',
            position: { x: 500, y: 100 },
            config: {
              duration: 10,
            },
          },
        ],
        edges: [],
      }

      const result = parser.parse(JSON.stringify(dsl), DSLFormat.JSON)

      expect(result.success).toBe(true)
      const workflow = result.workflow!

      // 验证 Agent 配置
      const agentNode = workflow.nodes.find(n => n.id === 'agent1')
      expect(agentNode?.agentConfig).toEqual({
        agentId: 'test-agent',
        agentType: 'task',
        prompt: '测试提示',
        timeout: 60,
      })

      // 验证条件配置
      const conditionNode = workflow.nodes.find(n => n.id === 'condition1')
      expect(conditionNode?.conditionConfig).toEqual({
        expression: '${result.success}',
        trueLabel: '是',
        falseLabel: '否',
      })

      // 验证等待配置
      const waitNode = workflow.nodes.find(n => n.id === 'wait1')
      expect(waitNode?.waitConfig).toEqual({
        duration: 10,
      })
    })
  })

  describe('示例工作流', () => {
    it('应该创建有效的示例工作流', () => {
      const dsl = createExampleWorkflowDSL()
      const result = parser.parse(JSON.stringify(dsl), DSLFormat.JSON)

      expect(result.success).toBe(true)
      expect(result.workflow).toBeDefined()
      expect(result.workflow?.nodes.length).toBeGreaterThan(0)
      expect(result.workflow?.edges.length).toBeGreaterThan(0)

      // 验证有开始和结束节点
      expect(result.workflow?.nodes.some(n => n.type === NodeType.START)).toBe(true)
      expect(result.workflow?.nodes.some(n => n.type === NodeType.END)).toBe(true)
    })
  })
})
