/**
 * 高级工作流节点单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AdvancedConditionNodeExecutor, AdvancedConditionConfig } from '../ConditionNode'
import { LoopNodeExecutor, LoopType, LoopConfig as LoopConfigLocal } from '../LoopNode'
import { ParallelNodeExecutor, FailureStrategy, AggregationStrategy, ParallelConfig, ParallelBranch } from '../ParallelNode'
import { SubWorkflowNodeExecutor } from '../SubWorkflowNode'
import { AIAgentNodeExecutor, AIProvider, AIAgentConfig as AIAgentConfigLocal } from '../AIAgentNode'
import { AdvancedNodeRegistry, advancedNodeRegistry } from '../NodeRegistry'
import { DSLParser, dslParser } from '../../DSLParser'
import { NodeType, WorkflowNode } from '@/types/workflow'
import { ExecutionContext, createExecutionContext } from '@/lib/workflow/types'

describe('AdvancedConditionNodeExecutor', () => {
  let executor: AdvancedConditionNodeExecutor

  beforeEach(() => {
    executor = new AdvancedConditionNodeExecutor()
  })

  it('should handle condition node type', () => {
    expect(executor.canHandle(NodeType.CONDITION)).toBe(true)
    expect(executor.canHandle(NodeType.AGENT)).toBe(false)
  })

  it('should validate simple condition node', () => {
    const node: WorkflowNode = {
      id: 'condition_1',
      type: NodeType.CONDITION,
      name: '条件节点',
      position: { x: 100, y: 100 },
      conditionConfig: {
        expression: 'inputs.value > 10',
        trueLabel: '大于',
        falseLabel: '小于等于',
      },
    }

    const result = executor.validate(node)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should validate advanced condition node', () => {
    const node: WorkflowNode = {
      id: 'condition_2',
      type: NodeType.CONDITION,
      name: '高级条件节点',
      position: { x: 100, y: 100 },
      config: {
        advancedCondition: {
          branches: [
            { expression: 'value > 100', label: '高' },
            { expression: 'value > 50', label: '中' },
          ],
          defaultBranch: '低',
        } as unknown as import('@/types/workflow').AdvancedCondition,
      },
    }

    const result = executor.validate(node)
    expect(result.valid).toBe(true)
  })

  it('should reject unsafe expressions', () => {
    const node: WorkflowNode = {
      id: 'condition_3',
      type: NodeType.CONDITION,
      name: '危险条件',
      position: { x: 100, y: 100 },
      conditionConfig: {
        expression: 'eval("console.log(1)")',
        trueLabel: '是',
        falseLabel: '否',
      },
    }

    const result = executor.validate(node)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('不安全'))).toBe(true)
  })

  it('should execute simple condition', async () => {
    const node: WorkflowNode = {
      id: 'condition_4',
      type: NodeType.CONDITION,
      name: '测试条件',
      position: { x: 100, y: 100 },
      conditionConfig: {
        expression: 'data.value > 10',
        trueLabel: '大',
        falseLabel: '小',
      },
    }

    const context = createExecutionContext(
      'instance_1',
      'workflow_1',
      node,
      {},
      { value: 20 },
      {}
    )

    const result = await executor.execute(context)
    expect(result.status).toBe('success')
    expect(result.output?.branchLabel).toBe('大')
    expect(result.output?.matched).toBe(true)
  })

  it('should execute advanced condition with multiple branches', async () => {
    const node: WorkflowNode = {
      id: 'condition_5',
      type: NodeType.CONDITION,
      name: '多分支条件',
      position: { x: 100, y: 100 },
      config: {
        advancedCondition: {
          branches: [
            { expression: 'score >= 90', label: '优秀' },
            { expression: 'score >= 60', label: '及格' },
          ],
          defaultBranch: '不及格',
        } as unknown as import('@/types/workflow').AdvancedCondition,
      },
    }

    const context = createExecutionContext(
      'instance_2',
      'workflow_1',
      node,
      {},
      { score: 75 },
      {}
    )

    const result = await executor.execute(context)
    expect(result.status).toBe('success')
    expect(result.output?.branchLabel).toBe('及格')
  })
})

describe('LoopNodeExecutor', () => {
  let executor: LoopNodeExecutor

  beforeEach(() => {
    executor = new LoopNodeExecutor()
  })

  it('should handle loop node type', () => {
    expect(executor.canHandle('loop')).toBe(true)
    expect(executor.canHandle('condition')).toBe(false)
  })

  it('should validate fixed loop', () => {
    const node: WorkflowNode = {
      id: 'loop_1',
      type: 'loop' as any,
      name: '固定循环',
      position: { x: 100, y: 100 },
      loopConfig: {
        type: LoopType.FIXED,
        iterations: 5,
      } as unknown as import('@/types/workflow').LoopConfig,
    }

    const result = executor.validate(node)
    expect(result.valid).toBe(true)
  })

  it('should reject invalid iterations', () => {
    const node: WorkflowNode = {
      id: 'loop_2',
      type: 'loop' as any,
      name: '无效循环',
      position: { x: 100, y: 100 },
      loopConfig: {
        type: LoopType.FIXED,
        iterations: -1,
      } as unknown as import('@/types/workflow').LoopConfig,
    }

    const result = executor.validate(node)
    expect(result.valid).toBe(false)
  })

  it('should validate while loop', () => {
    const node: WorkflowNode = {
      id: 'loop_3',
      type: 'loop' as any,
      name: '条件循环',
      position: { x: 100, y: 100 },
      loopConfig: {
        type: LoopType.WHILE,
        condition: 'count < 10',
        maxIterations: 100,
      } as unknown as import('@/types/workflow').LoopConfig,
    }

    const result = executor.validate(node)
    expect(result.valid).toBe(true)
  })

  it('should validate forEach loop', () => {
    const node: WorkflowNode = {
      id: 'loop_4',
      type: 'loop' as any,
      name: '迭代循环',
      position: { x: 100, y: 100 },
      loopConfig: {
        type: LoopType.FOR_EACH,
        collection: 'items',
        itemVariable: 'item',
      } as unknown as import('@/types/workflow').LoopConfig,
    }

    const result = executor.validate(node)
    expect(result.valid).toBe(true)
  })

  it('should execute fixed loop', async () => {
    const node: WorkflowNode = {
      id: 'loop_5',
      type: 'loop' as any,
      name: '测试循环',
      position: { x: 100, y: 100 },
      loopConfig: {
        type: LoopType.FIXED,
        iterations: 3,
      } as unknown as import('@/types/workflow').LoopConfig,
    }

    const context = createExecutionContext(
      'instance_1',
      'workflow_1',
      node,
      {},
      {},
      {}
    )

    const result = await executor.execute(context)
    expect(result.status).toBe('success')
    expect(result.output?.iterations).toBe(3)
    expect(result.output?.brokeOut).toBe(false)
  })

  it('should execute while loop', async () => {
    const node: WorkflowNode = {
      id: 'loop_6',
      type: 'loop' as any,
      name: '条件循环',
      position: { x: 100, y: 100 },
      loopConfig: {
        type: LoopType.WHILE,
        condition: 'index < 3',
        maxIterations: 10,
      } as unknown as import('@/types/workflow').LoopConfig,
    }

    const context = createExecutionContext(
      'instance_2',
      'workflow_1',
      node,
      { index: 0 },
      {},
      {}
    )

    const result = await executor.execute(context)
    expect(result.status).toBe('success')
    expect(result.output?.iterations).toBeGreaterThan(0)
  })

  it('should handle break condition', async () => {
    const node: WorkflowNode = {
      id: 'loop_7',
      type: 'loop' as any,
      name: '中断循环',
      position: { x: 100, y: 100 },
      loopConfig: {
        type: LoopType.FIXED,
        iterations: 10,
        breakCondition: 'index >= 3',
      } as unknown as import('@/types/workflow').LoopConfig,
    }

    const context = createExecutionContext(
      'instance_3',
      'workflow_1',
      node,
      {},
      {},
      {}
    )

    const result = await executor.execute(context)
    expect(result.status).toBe('success')
    expect(result.output?.brokeOut).toBe(true)
    expect(result.output?.brokeAt).toBe(3)
  })
})

describe('ParallelNodeExecutor', () => {
  let executor: ParallelNodeExecutor

  beforeEach(() => {
    executor = new ParallelNodeExecutor()
  })

  it('should handle parallel node type', () => {
    expect(executor.canHandle(NodeType.PARALLEL)).toBe(true)
  })

  it('should validate parallel node', () => {
    const node: WorkflowNode = {
      id: 'parallel_1',
      type: NodeType.PARALLEL,
      name: '并行节点',
      position: { x: 100, y: 100 },
    }

    const result = executor.validate(node)
    expect(result.valid).toBe(true)
  })

  it('should validate advanced parallel config', () => {
    const node: WorkflowNode = {
      id: 'parallel_2',
      type: NodeType.PARALLEL,
      name: '高级并行',
      position: { x: 100, y: 100 },
      config: {
        parallel: {
          branches: [
            { id: 'b1', name: '分支1' },
            { id: 'b2', name: '分支2' },
          ],
          failureStrategy: FailureStrategy.CONTINUE_ON_ERROR,
          aggregationStrategy: AggregationStrategy.ALL,
        },
      } as unknown as ParallelConfig,
    }

    const result = executor.validate(node)
    expect(result.valid).toBe(true)
  })

  it('should execute parallel branches', async () => {
    const node: WorkflowNode = {
      id: 'parallel_3',
      type: NodeType.PARALLEL,
      name: '测试并行',
      position: { x: 100, y: 100 },
      config: {
        parallel: {
          branches: [
            { id: 'b1', name: '分支A' },
            { id: 'b2', name: '分支B' },
            { id: 'b3', name: '分支C' },
          ],
          failureStrategy: FailureStrategy.CONTINUE_ON_ERROR,
          aggregationStrategy: AggregationStrategy.ALL,
        },
      } as unknown as ParallelConfig,
    }

    const context = createExecutionContext(
      'instance_1',
      'workflow_1',
      node,
      {},
      {},
      {}
    )

    const result = await executor.execute(context)
    expect(result.status).toBe('success')
    expect(result.output?.totalBranches).toBe(3)
    expect(result.output?.completedBranches).toBe(3)
    expect(result.output?.failedBranches).toBe(0)
  })

  it('should respect max concurrency', async () => {
    const node: WorkflowNode = {
      id: 'parallel_4',
      type: NodeType.PARALLEL,
      name: '限流并行',
      position: { x: 100, y: 100 },
      config: {
        parallel: {
          branches: [
            { id: 'b1', name: '分支1' },
            { id: 'b2', name: '分支2' },
            { id: 'b3', name: '分支3' },
            { id: 'b4', name: '分支4' },
          ],
          maxConcurrency: 2,
          failureStrategy: FailureStrategy.CONTINUE_ON_ERROR,
          aggregationStrategy: AggregationStrategy.ALL,
        },
      } as unknown as ParallelConfig,
    }

    const context = createExecutionContext(
      'instance_2',
      'workflow_1',
      node,
      {},
      {},
      {}
    )

    const result = await executor.execute(context)
    expect(result.status).toBe('success')
    expect(result.output?.totalBranches).toBe(4)
  })
})

describe('SubWorkflowNodeExecutor', () => {
  let executor: SubWorkflowNodeExecutor

  beforeEach(() => {
    executor = new SubWorkflowNodeExecutor()
  })

  it('should handle subworkflow node type', () => {
    expect(executor.canHandle('subworkflow')).toBe(true)
  })

  it('should validate subworkflow config', () => {
    const node: WorkflowNode = {
      id: 'sub_1',
      type: 'subworkflow' as any,
      name: '子工作流',
      position: { x: 100, y: 100 },
      subWorkflowConfig: {
        subWorkflowId: 'child_workflow_1',
        timeout: 30,
      },
    }

    const result = executor.validate(node)
    expect(result.valid).toBe(true)
  })

  it('should validate input mapping', () => {
    const node: WorkflowNode = {
      id: 'sub_2',
      type: 'subworkflow' as any,
      name: '带映射子工作流',
      position: { x: 100, y: 100 },
      subWorkflowConfig: {
        subWorkflowId: 'child_workflow_2',
        inputs: {
          targetParam: 'sourceVar',
        },
        outputMapping: {
          resultVar: 'output',
        },
      },
    }

    const result = executor.validate(node)
    expect(result.valid).toBe(true)
  })

  it('should execute subworkflow', async () => {
    const node: WorkflowNode = {
      id: 'sub_3',
      type: 'subworkflow' as any,
      name: '测试子工作流',
      position: { x: 100, y: 100 },
      subWorkflowConfig: {
        subWorkflowId: 'child_workflow_test',
        inputs: {
          data: 'inputs.data',
        },
      },
    }

    const context = createExecutionContext(
      'instance_1',
      'workflow_1',
      node,
      {},
      { data: { value: 123 } },
      {}
    )

    const result = await executor.execute(context)
    expect(result.status).toBe('success')
    expect(result.output?.workflowId).toBe('child_workflow_test')
    expect(result.output?.instanceId).toBeDefined()
  })
})

describe('AIAgentNodeExecutor', () => {
  let executor: AIAgentNodeExecutor

  beforeEach(() => {
    executor = new AIAgentNodeExecutor()
  })

  it('should handle agent node type', () => {
    expect(executor.canHandle(NodeType.AGENT)).toBe(true)
  })

  it('should validate agent config', () => {
    const node: WorkflowNode = {
      id: 'agent_1',
      type: NodeType.AGENT,
      name: 'AI Agent',
      position: { x: 100, y: 100 },
      agentConfig: {
        agentId: 'agent_001',
        agentType: 'chat',
        model: 'gpt-4',
      },
    }

    const result = executor.validate(node)
    expect(result.valid).toBe(true)
  })

  it('should validate advanced agent config', () => {
    const node: WorkflowNode = {
      id: 'agent_2',
      type: NodeType.AGENT,
      name: '高级AI Agent',
      position: { x: 100, y: 100 },
      config: {
        aiAgent: {
          provider: AIProvider.OPENAI,
          model: 'gpt-4',
          temperature: 0.8,
          maxTokens: 1000,
        } as unknown as import('@/types/workflow').AIAgentConfig,
      },
    }

    const result = executor.validate(node)
    expect(result.valid).toBe(true)
  })

  it('should reject invalid temperature', () => {
    const node: WorkflowNode = {
      id: 'agent_3',
      type: NodeType.AGENT,
      name: '无效温度',
      position: { x: 100, y: 100 },
      config: {
        aiAgent: {
          provider: AIProvider.OPENAI,
          model: 'gpt-4',
          temperature: 5.0, // 无效：超出范围
        } as unknown as import('@/types/workflow').AIAgentConfig,
      },
    }

    const result = executor.validate(node)
    expect(result.valid).toBe(false)
  })

  it('should execute AI call', async () => {
    const node: WorkflowNode = {
      id: 'agent_4',
      type: NodeType.AGENT,
      name: '测试AI',
      position: { x: 100, y: 100 },
      config: {
        aiAgent: {
          provider: AIProvider.OPENAI,
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 500,
          timeout: 10,
        } as unknown as import('@/types/workflow').AIAgentConfig,
      },
    }

    const context = createExecutionContext(
      'instance_1',
      'workflow_1',
      node,
      {},
      { prompt: '你好' },
      {}
    )

    const result = await executor.execute(context)
    expect(result.status).toBe('success')
    expect(result.output?.provider).toBe(AIProvider.OPENAI)
    expect(result.output?.model).toBe('gpt-4')
    expect(result.output?.duration).toBeDefined()
  })

  it('should interpolate prompt template', async () => {
    const node: WorkflowNode = {
      id: 'agent_5',
      type: NodeType.AGENT,
      name: '模板测试',
      position: { x: 100, y: 100 },
      config: {
        aiAgent: {
          provider: AIProvider.OPENAI,
          model: 'gpt-4',
          promptTemplate: '请处理用户 {{user.name}} 的请求: {{user.request}}',
        } as unknown as import('@/types/workflow').AIAgentConfig,
      },
    }

    const context = createExecutionContext(
      'instance_2',
      'workflow_1',
      node,
      {},
      { user: { name: '张三', request: '查询订单' } },
      {}
    )

    const result = await executor.execute(context)
    expect(result.status).toBe('success')
  })
})

describe('AdvancedNodeRegistry', () => {
  it('should have all executors registered', () => {
    const registry = AdvancedNodeRegistry.getInstance()

    expect(registry.has(NodeType.CONDITION)).toBe(true)
    expect(registry.has('loop')).toBe(true)
    expect(registry.has(NodeType.PARALLEL)).toBe(true)
    expect(registry.has('subworkflow')).toBe(true)
    expect(registry.has(NodeType.AGENT)).toBe(true)
  })

  it('should get registered types', () => {
    const types = advancedNodeRegistry.getRegisteredTypes()
    expect(types.length).toBeGreaterThan(0)
  })

  it('should get executor info', () => {
    const info = advancedNodeRegistry.getExecutorInfo()
    expect(info.length).toBeGreaterThan(0)
    expect(info.every(i => i.hasExecutor)).toBe(true)
  })
})

describe('DSLParser', () => {
  it('should parse JSON workflow', () => {
    const json = JSON.stringify({
      name: '测试工作流',
      nodes: [
        { id: 'start', type: 'start', name: '开始' },
        { id: 'agent', type: 'agent', name: 'AI任务' },
        { id: 'end', type: 'end', name: '结束' },
      ],
      edges: [
        { id: 'e1', from: 'start', to: 'agent' },
        { id: 'e2', from: 'agent', to: 'end' },
      ],
    })

    const result = dslParser.parseJSON(json)
    expect(result.success).toBe(true)
    expect(result.workflow).toBeDefined()
    expect(result.workflow?.nodes).toHaveLength(3)
  })

  it('should parse connection syntax', () => {
    const dsl = {
      name: '连线工作流',
      nodes: [
        { id: 'n1', type: 'start', name: '开始' },
        { id: 'n2', type: 'agent', name: '任务' },
        { id: 'n3', type: 'end', name: '结束' },
      ],
      connections: ['n1 -> n2 -> n3'],
    }

    const result = dslParser.parseDSL(dsl)
    expect(result.success).toBe(true)
    expect(result.workflow?.edges).toHaveLength(2)
  })

  it('should parse condition node', () => {
    const dsl = {
      name: '条件工作流',
      nodes: [
        { id: 'start', type: 'start', name: '开始' },
        {
          id: 'check',
          type: 'condition',
          expression: 'value > 10',
          trueLabel: '大于',
          falseLabel: '小于等于',
        },
        { id: 'end', type: 'end', name: '结束' },
      ],
      connections: ['start -> check -> end'],
    }

    const result = dslParser.parseDSL(dsl)
    expect(result.success).toBe(true)
    const conditionNode = result.workflow?.nodes.find(n => n.id === 'check')
    expect(conditionNode?.conditionConfig?.expression).toBe('value > 10')
  })

  it('should parse loop node', () => {
    const dsl = {
      name: '循环工作流',
      nodes: [
        { id: 'start', type: 'start', name: '开始' },
        {
          id: 'loop',
          type: 'loop',
          loopType: 'forEach',
          collection: 'items',
          item: 'item',
        },
        { id: 'end', type: 'end', name: '结束' },
      ],
      connections: ['start -> loop -> end'],
    }

    const result = dslParser.parseDSL(dsl)
    expect(result.success).toBe(true)
    const loopNode = result.workflow?.nodes.find(n => n.id === 'loop')
    expect(loopNode?.loopConfig).toBeDefined()
  })

  it('should parse parallel node', () => {
    const dsl = {
      name: '并行工作流',
      nodes: [
        { id: 'start', type: 'start', name: '开始' },
        {
          id: 'parallel',
          type: 'parallel',
          branches: [
            { id: 'b1', name: '分支A' },
            { id: 'b2', name: '分支B' },
          ],
        },
        { id: 'end', type: 'end', name: '结束' },
      ],
    }

    const result = dslParser.parseDSL(dsl)
    expect(result.success).toBe(true)
  })

  it('should reject invalid workflow', () => {
    const dsl = {
      name: '', // 无效名称
      nodes: [], // 无节点
    }

    const result = dslParser.parseDSL(dsl)
    expect(result.success).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})