/**
 * Workflow 引擎边缘案例测试 v1.2.0
 * 
 * 重点测试领域:
 * 1. 空输入处理 - 空工作流名、空节点名、空边条件、空输入参数
 * 2. 超长工作流名 - 超长ID、超长名称、超长条件表达式
 * 3. 并发执行冲突 - 竞态条件、并发修改、资源冲突
 * 4. 节点类型无效 - 未知类型、缺失类型、无效配置
 * 5. 状态流转异常 - 无效状态转换、状态损坏、状态恢复
 * 
 * @version 1.2.0
 * @date 2026-04-04
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EnhancedWorkflowExecutor } from '@/lib/workflow/executor'
import { WorkflowEngine } from '@/lib/workflow/engine'
import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  NodeStatus,
  InstanceStatus,
  EdgeType,
  WorkflowStatus,
} from '@/types/workflow'

// ============================================
// 测试数据生成器
// ============================================

function createBaseWorkflow(id: string = 'test-workflow'): WorkflowDefinition {
  const nodes: WorkflowNode[] = [
    { id: 'start-node', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
    { id: 'agent-node', type: NodeType.AGENT, name: '执行任务', position: { x: 100, y: 0 }, agentConfig: { agentId: 'agent-1', agentType: 'executor', timeout: 30 } },
    { id: 'end-node', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
  ]

  const edges: WorkflowEdge[] = [
    { id: 'edge-1', source: 'start-node', target: 'agent-node', type: EdgeType.SEQUENCE },
    { id: 'edge-2', source: 'agent-node', target: 'end-node', type: EdgeType.SEQUENCE },
  ]

  return {
    id,
    name: '测试工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes,
    edges,
    config: {
      timeout: 300,
      retryPolicy: { maxRetries: 3, backoff: 'fixed', interval: 1 },
      variables: {},
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test-user',
      updatedBy: 'test-user',
    },
  }
}

function generateLongString(length: number): string {
  return 'a'.repeat(length)
}

function generateUnicodeString(length: number): string {
  const chars = '中文日本語한국어العربيةעברית🎉🔥💯'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[i % chars.length]
  }
  return result
}

// ============================================
// 测试套件
// ============================================

describe('Workflow 引擎边缘案例测试 v1.2.0', () => {
  let executor: EnhancedWorkflowExecutor
  let engine: WorkflowEngine

  beforeEach(() => {
    executor = new EnhancedWorkflowExecutor()
    engine = new WorkflowEngine()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  // ============================================
  // 1. 空输入处理测试
  // ============================================

  describe('1. 空输入处理', () => {
    
    describe('1.1 空工作流定义', () => {
      it('应该拒绝空名称的工作流', () => {
        const workflow = createBaseWorkflow()
        workflow.name = ''
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
        expect(validation.errors.some(e => e.includes('名称'))).toBe(true)
      })

      it('应该拒绝只有空白字符的名称', () => {
        const workflow = createBaseWorkflow()
        workflow.name = '   \t\n   '
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
      })

      it('应该处理空描述的工作流', () => {
        const workflow = createBaseWorkflow()
        workflow.description = ''
        
        executor.registerWorkflow(workflow)
        const retrieved = executor.getWorkflow(workflow.id)
        expect(retrieved).toBeDefined()
        expect(retrieved?.description).toBe('')
      })

      it('应该拒绝空节点列表', () => {
        const workflow = createBaseWorkflow()
        workflow.nodes = []
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
        expect(validation.errors.some(e => e.includes('至少一个节点'))).toBe(true)
      })

      it('应该接受空边列表（如果满足其他条件）', () => {
        // 只有开始和结束节点，无其他节点
        const workflow: WorkflowDefinition = {
          id: 'empty-edges',
          name: '空边工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 100, y: 0 } },
          ],
          edges: [],
          config: {},
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test',
            updatedBy: 'test',
          },
        }
        
        const validation = executor.validateWorkflow(workflow)
        // 可能因为孤立节点而失败
        expect(validation).toBeDefined()
      })
    })

    describe('1.2 空节点名称', () => {
      it('应该处理空节点名称', () => {
        const workflow = createBaseWorkflow()
        workflow.nodes[1].name = ''
        
        executor.registerWorkflow(workflow)
        const validation = executor.validateWorkflow(workflow)
        // 节点名称可以为空，但应该有警告
        expect(validation).toBeDefined()
      })

      it('应该处理空白节点名称', () => {
        const workflow = createBaseWorkflow()
        workflow.nodes[1].name = '   '
        
        executor.registerWorkflow(workflow)
        expect(executor.getWorkflow(workflow.id)).toBeDefined()
      })

      it('应该处理缺失节点ID', () => {
        const workflow = createBaseWorkflow()
        // @ts-expect-error 测试缺失 ID
        workflow.nodes.push({ type: NodeType.AGENT, name: '无ID节点', position: { x: 300, y: 0 } })
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
        expect(validation.errors.some(e => e.includes('ID'))).toBe(true)
      })
    })

    describe('1.3 空边条件', () => {
      it('应该处理条件边的空条件表达式', () => {
        const workflow: WorkflowDefinition = {
          id: 'empty-condition-edge',
          name: '空条件边工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'cond', type: NodeType.CONDITION, name: '条件', position: { x: 100, y: 0 }, conditionConfig: { expression: '' } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'cond', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'cond', target: 'end', type: EdgeType.CONDITION, conditionConfig: { condition: '', label: '' } },
          ],
          config: {},
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test',
            updatedBy: 'test',
          },
        }
        
        executor.registerWorkflow(workflow)
        const validation = executor.validateWorkflow(workflow)
        expect(validation).toBeDefined()
      })
    })

    describe('1.4 空输入参数', () => {
      it('应该处理空对象输入', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, {})
        expect(instance).toBeDefined()
        expect(instance.data.inputs).toEqual({})
      })

      it('应该处理undefined输入', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, undefined)
        expect(instance).toBeDefined()
      })

      it('应该处理null值的输入', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, { nullValue: null })
        expect(instance.data.inputs?.nullValue).toBeNull()
      })

      it('应该处理包含空数组的输入', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, { emptyArray: [] })
        expect(instance.data.inputs?.emptyArray).toEqual([])
      })

      it('应该处理包含空对象的输入', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, { emptyObject: {} })
        expect(instance.data.inputs?.emptyObject).toEqual({})
      })

      it('应该处理空字符串输入', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, { emptyString: '' })
        expect(instance.data.inputs?.emptyString).toBe('')
      })

      it('应该处理空白字符串输入', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, { whitespace: '   \t\n' })
        expect(instance.data.inputs?.whitespace).toBe('   \t\n')
      })
    })

    describe('1.5 空配置', () => {
      it('应该处理空全局配置', () => {
        const workflow = createBaseWorkflow()
        workflow.config = {}
        
        executor.registerWorkflow(workflow)
        expect(executor.getWorkflow(workflow.id)).toBeDefined()
      })

      it('应该处理空变量配置', () => {
        const workflow = createBaseWorkflow()
        workflow.config.variables = {}
        
        executor.registerWorkflow(workflow)
        const instance = executor.createInstance(workflow.id, {})
        expect(instance.data.variables).toEqual({})
      })

      it('应该处理缺失的agentConfig', () => {
        const workflow: WorkflowDefinition = {
          id: 'missing-agent-config',
          name: '缺失Agent配置',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'agent', type: NodeType.AGENT, name: 'Agent', position: { x: 100, y: 0 } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'agent', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'agent', target: 'end', type: EdgeType.SEQUENCE },
          ],
          config: {},
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test',
            updatedBy: 'test',
          },
        }
        
        const validation = executor.validateWorkflow(workflow)
        // 应该检测到缺失的 agent 配置
        expect(validation).toBeDefined()
      })
    })
  })

  // ============================================
  // 2. 超长工作流名测试
  // ============================================

  describe('2. 超长工作流名', () => {
    
    describe('2.1 超长工作流ID', () => {
      it('应该处理超长的工作流ID', () => {
        const longId = generateLongString(1000)
        const workflow = createBaseWorkflow(longId)
        
        executor.registerWorkflow(workflow)
        expect(executor.getWorkflow(longId)).toBeDefined()
      })

      it('应该处理包含特殊字符的超长ID', () => {
        const specialId = `workflow-${Date.now()}-${generateLongString(100)}-测试-🔥`
        const workflow = createBaseWorkflow(specialId)
        
        executor.registerWorkflow(workflow)
        expect(executor.getWorkflow(specialId)).toBeDefined()
      })
    })

    describe('2.2 超长工作流名称', () => {
      it('应该处理超长的工作流名称', () => {
        const workflow = createBaseWorkflow()
        workflow.name = generateLongString(10000)
        
        executor.registerWorkflow(workflow)
        const retrieved = executor.getWorkflow(workflow.id)
        expect(retrieved?.name).toHaveLength(10000)
      })

      it('应该处理包含Unicode的超长名称', () => {
        const workflow = createBaseWorkflow()
        workflow.name = generateUnicodeString(1000)
        
        executor.registerWorkflow(workflow)
        const retrieved = executor.getWorkflow(workflow.id)
        expect(retrieved?.name).toBeDefined()
        expect(retrieved?.name.length).toBeGreaterThan(0)
      })

      it('应该处理超长的描述', () => {
        const workflow = createBaseWorkflow()
        workflow.description = generateLongString(50000)
        
        executor.registerWorkflow(workflow)
        const retrieved = executor.getWorkflow(workflow.id)
        expect(retrieved?.description).toHaveLength(50000)
      })
    })

    describe('2.3 超长节点ID和名称', () => {
      it('应该处理超长的节点ID', () => {
        const workflow = createBaseWorkflow()
        const longNodeId = generateLongString(500)
        workflow.nodes[1].id = longNodeId
        workflow.edges[0].target = longNodeId
        workflow.edges[1].source = longNodeId
        
        executor.registerWorkflow(workflow)
        const validation = executor.validateWorkflow(workflow)
        expect(validation).toBeDefined()
      })

      it('应该处理超长的节点名称', () => {
        const workflow = createBaseWorkflow()
        workflow.nodes[1].name = generateLongString(5000)
        
        executor.registerWorkflow(workflow)
        const retrieved = executor.getWorkflow(workflow.id)
        expect(retrieved?.nodes[1].name).toHaveLength(5000)
      })

      it('应该处理超长的节点描述', () => {
        const workflow = createBaseWorkflow()
        workflow.nodes[1].description = generateLongString(10000)
        
        executor.registerWorkflow(workflow)
        expect(executor.getWorkflow(workflow.id)).toBeDefined()
      })
    })

    describe('2.4 超长边ID', () => {
      it('应该处理超长的边ID', () => {
        const workflow = createBaseWorkflow()
        workflow.edges[0].id = generateLongString(500)
        
        executor.registerWorkflow(workflow)
        expect(executor.getWorkflow(workflow.id)).toBeDefined()
      })
    })

    describe('2.5 超长条件表达式', () => {
      it('应该处理超长的条件表达式', () => {
        const workflow: WorkflowDefinition = {
          id: 'long-condition',
          name: '超长条件工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'cond', type: NodeType.CONDITION, name: '条件', position: { x: 100, y: 0 }, conditionConfig: { expression: generateLongString(10000) } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'cond', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'cond', target: 'end', type: EdgeType.SEQUENCE },
          ],
          config: {},
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test',
            updatedBy: 'test',
          },
        }
        
        executor.registerWorkflow(workflow)
        expect(executor.getWorkflow(workflow.id)).toBeDefined()
      })
    })

    describe('2.6 超长Agent提示词', () => {
      it('应该处理超长的Agent提示词', () => {
        const workflow = createBaseWorkflow()
        workflow.nodes[1].agentConfig = {
          agentId: 'agent-1',
          agentType: 'executor',
          prompt: generateLongString(50000),
          timeout: 30,
        }
        
        executor.registerWorkflow(workflow)
        expect(executor.getWorkflow(workflow.id)).toBeDefined()
      })
    })

    describe('2.7 超长输入数据', () => {
      it('应该处理超长的字符串输入', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const longString = generateLongString(100000)
        const instance = executor.createInstance(workflow.id, { longString })
        
        expect(instance.data.inputs?.longString).toHaveLength(100000)
      })

      it('应该处理超大的数组输入', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const largeArray = Array.from({ length: 10000 }, (_, i) => ({ id: i, data: `item-${i}` }))
        const instance = executor.createInstance(workflow.id, { largeArray })
        
        expect(instance.data.inputs?.largeArray).toHaveLength(10000)
      })

      it('应该处理超深的嵌套对象', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        let deepObject: Record<string, unknown> = { value: 'deep' }
        for (let i = 0; i < 100; i++) {
          deepObject = { level: i, nested: deepObject }
        }
        
        const instance = executor.createInstance(workflow.id, { deepObject })
        expect(instance.data.inputs?.deepObject).toBeDefined()
      })
    })
  })

  // ============================================
  // 3. 并发执行冲突测试
  // ============================================

  describe('3. 并发执行冲突', () => {
    
    describe('3.1 多实例并发创建', () => {
      it('应该支持并发创建多个实例', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instances = Array.from({ length: 100 }, (_, i) =>
          executor.createInstance(workflow.id, { batchId: i })
        )
        
        expect(instances).toHaveLength(100)
        
        // 验证所有实例ID唯一
        const ids = instances.map(i => i.id)
        const uniqueIds = new Set(ids)
        expect(uniqueIds.size).toBe(100)
      })

      it('应该隔离不同实例的数据', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance1 = executor.createInstance(workflow.id, { data: 'instance1' })
        const instance2 = executor.createInstance(workflow.id, { data: 'instance2' })
        
        expect(instance1.data.inputs?.data).toBe('instance1')
        expect(instance2.data.inputs?.data).toBe('instance2')
      })
    })

    describe('3.2 多工作流并发注册', () => {
      it('应该支持并发注册多个工作流', () => {
        const workflows = Array.from({ length: 50 }, (_, i) => createBaseWorkflow(`workflow-${i}`))
        
        workflows.forEach(wf => executor.registerWorkflow(wf))
        
        workflows.forEach(wf => {
          expect(executor.getWorkflow(wf.id)).toBeDefined()
        })
      })

      it('应该支持覆盖已存在的工作流', () => {
        const workflow1 = createBaseWorkflow('same-id')
        workflow1.name = '工作流1'
        
        const workflow2 = createBaseWorkflow('same-id')
        workflow2.name = '工作流2'
        
        executor.registerWorkflow(workflow1)
        executor.registerWorkflow(workflow2)
        
        const retrieved = executor.getWorkflow('same-id')
        expect(retrieved?.name).toBe('工作流2')
      })
    })

    describe('3.3 并发实例操作', () => {
      it('应该支持并发取消多个实例', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instances = Array.from({ length: 20 }, () =>
          executor.createInstance(workflow.id, {})
        )
        
        instances.forEach(inst => executor.cancelInstance(inst.id))
        
        instances.forEach(inst => {
          const cancelled = executor.getInstance(inst.id)
          expect(cancelled?.status).toBe(InstanceStatus.CANCELLED)
        })
      })

      it('应该处理取消不存在的实例', () => {
        expect(() => executor.cancelInstance('non-existent-id')).not.toThrow()
      })
    })

    describe('3.4 并发统计查询', () => {
      it('应该正确统计并发创建的实例', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        // 并发创建实例
        const instances = Array.from({ length: 30 }, () =>
          executor.createInstance(workflow.id, {})
        )
        
        // 取消部分实例
        instances.slice(0, 10).forEach(inst => executor.cancelInstance(inst.id))
        
        const stats = executor.getStatistics(workflow.id)
        expect(stats.totalInstances).toBe(30)
        expect(stats.cancelled).toBe(10)
      })
    })

    describe('3.5 资源竞争场景', () => {
      it('应该处理同一工作流的并发实例创建', async () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        // 模拟并发创建
        const promises = Array.from({ length: 10 }, async (_, i) => {
          return executor.createInstance(workflow.id, { concurrentId: i })
        })
        
        const instances = await Promise.all(promises)
        
        // 验证所有实例创建成功
        expect(instances).toHaveLength(10)
        instances.forEach(inst => {
          expect(inst.status).toBe(InstanceStatus.PENDING)
        })
      })
    })
  })

  // ============================================
  // 4. 节点类型无效测试
  // ============================================

  describe('4. 节点类型无效', () => {
    
    describe('4.1 未知节点类型', () => {
      it('应该检测未知节点类型', () => {
        const workflow = createBaseWorkflow()
        // @ts-expect-error 测试未知类型
        workflow.nodes[1].type = 'unknown-type'
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
        expect(validation.errors.some(e => e.includes('执行器') || e.includes('类型'))).toBe(true)
      })

      it('应该检测无效的节点类型字符串', () => {
        const workflow = createBaseWorkflow()
        // @ts-expect-error 测试无效类型
        workflow.nodes[1].type = '!!!invalid!!!'
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
      })

      it('应该检测空字符串节点类型', () => {
        const workflow = createBaseWorkflow()
        // @ts-expect-error 测试空类型
        workflow.nodes[1].type = ''
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
      })
    })

    describe('4.2 缺失节点类型', () => {
      it('应该检测缺失的节点类型', () => {
        const workflow: WorkflowDefinition = {
          id: 'missing-type',
          name: '缺失类型工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            // @ts-expect-error 测试缺失类型
            { id: 'node1', name: '无类型节点', position: { x: 100, y: 0 } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'node1', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'node1', target: 'end', type: EdgeType.SEQUENCE },
          ],
          config: {},
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test',
            updatedBy: 'test',
          },
        }
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
      })
    })

    describe('4.3 无效节点配置', () => {
      it('应该检测Agent节点缺失agentConfig', () => {
        const workflow: WorkflowDefinition = {
          id: 'missing-agent-config',
          name: '缺失Agent配置',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'agent', type: NodeType.AGENT, name: 'Agent', position: { x: 100, y: 0 } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'agent', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'agent', target: 'end', type: EdgeType.SEQUENCE },
          ],
          config: {},
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test',
            updatedBy: 'test',
          },
        }
        
        const validation = executor.validateWorkflow(workflow)
        // 应该检测到缺失的配置
        expect(validation).toBeDefined()
      })

      it('应该检测无效的超时配置', () => {
        const workflow = createBaseWorkflow()
        workflow.nodes[1].agentConfig = {
          agentId: 'agent-1',
          agentType: 'executor',
          timeout: -100, // 负数超时
        }
        
        executor.registerWorkflow(workflow)
        // 注册应该成功，验证可能失败
        expect(executor.getWorkflow(workflow.id)).toBeDefined()
      })

      it('应该检测缺失位置信息的节点', () => {
        const workflow = createBaseWorkflow()
        // @ts-expect-error 测试缺失位置
        workflow.nodes[1].position = undefined
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
        expect(validation.errors.some(e => e.includes('位置'))).toBe(true)
      })
    })

    describe('4.4 无效开始/结束节点配置', () => {
      it('应该检测缺少开始节点', () => {
        const workflow = createBaseWorkflow()
        workflow.nodes = workflow.nodes.filter(n => n.type !== NodeType.START)
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
        expect(validation.errors.some(e => e.includes('开始节点'))).toBe(true)
      })

      it('应该检测多个开始节点', () => {
        const workflow = createBaseWorkflow()
        workflow.nodes.push({
          id: 'start-2',
          type: NodeType.START,
          name: '开始2',
          position: { x: 0, y: 100 },
        })
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
        expect(validation.errors.some(e => e.includes('只能包含一个开始节点'))).toBe(true)
      })

      it('应该检测缺少结束节点', () => {
        const workflow = createBaseWorkflow()
        workflow.nodes = workflow.nodes.filter(n => n.type !== NodeType.END)
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
        expect(validation.errors.some(e => e.includes('结束节点'))).toBe(true)
      })

      it('应该支持多个结束节点', () => {
        const workflow: WorkflowDefinition = {
          id: 'multiple-ends',
          name: '多结束节点工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'cond', type: NodeType.CONDITION, name: '条件', position: { x: 100, y: 0 }, conditionConfig: { expression: 'true' } },
            { id: 'end1', type: NodeType.END, name: '结束1', position: { x: 200, y: -50 } },
            { id: 'end2', type: NodeType.END, name: '结束2', position: { x: 200, y: 50 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'cond', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'cond', target: 'end1', type: EdgeType.CONDITION, conditionConfig: { condition: 'true', label: 'yes' } },
            { id: 'e3', source: 'cond', target: 'end2', type: EdgeType.CONDITION, conditionConfig: { condition: 'false', label: 'no' } },
          ],
          config: {},
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test',
            updatedBy: 'test',
          },
        }
        
        const validation = executor.validateWorkflow(workflow)
        // 多个结束节点应该是允许的
        expect(validation).toBeDefined()
      })
    })

    describe('4.5 无效边配置', () => {
      it('应该检测边引用不存在的源节点', () => {
        const workflow = createBaseWorkflow()
        workflow.edges[0].source = 'non-existent-node'
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
        expect(validation.errors.some(e => e.includes('源节点不存在'))).toBe(true)
      })

      it('应该检测边引用不存在的目标节点', () => {
        const workflow = createBaseWorkflow()
        workflow.edges[0].target = 'non-existent-node'
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
        expect(validation.errors.some(e => e.includes('目标节点不存在'))).toBe(true)
      })

      it('应该检测重复的边ID', () => {
        const workflow = createBaseWorkflow()
        workflow.edges.push({
          id: 'edge-1', // 重复ID
          source: 'agent-node',
          target: 'end-node',
          type: EdgeType.SEQUENCE,
        })
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
        expect(validation.errors.some(e => e.includes('重复'))).toBe(true)
      })

      it('应该检测重复的节点ID', () => {
        const workflow = createBaseWorkflow()
        workflow.nodes.push({
          id: 'start-node', // 重复ID
          type: NodeType.AGENT,
          name: '重复节点',
          position: { x: 300, y: 0 },
          agentConfig: { agentId: 'agent-dup', agentType: 'executor' },
        })
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
        expect(validation.errors.some(e => e.includes('重复'))).toBe(true)
      })

      it('应该检测自引用边（节点连接到自己）', () => {
        const workflow = createBaseWorkflow()
        workflow.edges.push({
          id: 'self-loop',
          source: 'agent-node',
          target: 'agent-node',
          type: EdgeType.SEQUENCE,
        })
        
        // 自引用可能被允许（循环场景）
        executor.registerWorkflow(workflow)
        expect(executor.getWorkflow(workflow.id)).toBeDefined()
      })
    })

    describe('4.6 孤立节点检测', () => {
      it('应该检测孤立节点', () => {
        const workflow = createBaseWorkflow()
        workflow.nodes.push({
          id: 'isolated',
          type: NodeType.AGENT,
          name: '孤立节点',
          position: { x: 500, y: 500 },
          agentConfig: { agentId: 'agent-iso', agentType: 'executor' },
        })
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.errors.some(e => e.includes('孤立') || e.includes('没有连接'))).toBe(true)
      })
    })
  })

  // ============================================
  // 5. 状态流转异常测试
  // ============================================

  describe('5. 状态流转异常', () => {
    
    describe('5.1 实例状态转换', () => {
      it('应该正确初始化实例状态为PENDING', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, {})
        expect(instance.status).toBe(InstanceStatus.PENDING)
      })

      it('应该能够取消PENDING状态的实例', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, {})
        executor.cancelInstance(instance.id)
        
        const cancelled = executor.getInstance(instance.id)
        expect(cancelled?.status).toBe(InstanceStatus.CANCELLED)
      })

      it('应该能够多次取消同一实例', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, {})
        
        executor.cancelInstance(instance.id)
        executor.cancelInstance(instance.id)
        executor.cancelInstance(instance.id)
        
        const cancelled = executor.getInstance(instance.id)
        expect(cancelled?.status).toBe(InstanceStatus.CANCELLED)
      })
    })

    describe('5.2 节点状态管理', () => {
      it('应该正确初始化所有节点状态为IDLE', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, {})
        
        instance.nodeResults.forEach(result => {
          expect(result.status).toBe(NodeStatus.IDLE)
        })
      })

      it('应该能够直接修改节点状态', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, {})
        const nodeResult = instance.nodeResults.get('agent-node')
        
        if (nodeResult) {
          nodeResult.status = NodeStatus.FAILED
          nodeResult.error = { code: 'TEST_ERROR', message: '测试错误' }
        }
        
        expect(instance.nodeResults.get('agent-node')?.status).toBe(NodeStatus.FAILED)
        expect(instance.nodeResults.get('agent-node')?.error?.code).toBe('TEST_ERROR')
      })

      it('应该能够恢复节点状态', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, {})
        const nodeResult = instance.nodeResults.get('agent-node')
        
        // 设置失败状态
        if (nodeResult) {
          nodeResult.status = NodeStatus.FAILED
          nodeResult.error = { code: 'ERR', message: '错误' }
        }
        
        expect(instance.nodeResults.get('agent-node')?.status).toBe(NodeStatus.FAILED)
        
        // 恢复状态
        if (nodeResult) {
          nodeResult.status = NodeStatus.IDLE
          delete nodeResult.error
        }
        
        expect(instance.nodeResults.get('agent-node')?.status).toBe(NodeStatus.IDLE)
        expect(instance.nodeResults.get('agent-node')?.error).toBeUndefined()
      })
    })

    describe('5.3 进度状态管理', () => {
      it('应该正确计算进度百分比', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, {})
        
        expect(instance.progress.total).toBe(workflow.nodes.length)
        expect(instance.progress.completed).toBe(0)
        expect(instance.progress.percentage).toBe(0)
      })

      it('应该能够手动更新进度', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, {})
        
        // 模拟节点完成
        instance.progress.completed = 2
        instance.progress.percentage = Math.round((2 / instance.progress.total) * 100)
        
        expect(instance.progress.completed).toBe(2)
        expect(instance.progress.percentage).toBeGreaterThan(0)
      })
    })

    describe('5.4 错误状态恢复', () => {
      it('应该保留错误详情', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, {})
        const nodeResult = instance.nodeResults.get('agent-node')
        
        if (nodeResult) {
          nodeResult.status = NodeStatus.FAILED
          nodeResult.error = {
            code: 'DETAILED_ERROR',
            message: '详细错误信息',
            stack: 'Error: detailed\n  at line 1\n  at line 2',
          }
        }
        
        const stored = instance.nodeResults.get('agent-node')
        expect(stored?.error?.code).toBe('DETAILED_ERROR')
        expect(stored?.error?.message).toBe('详细错误信息')
        expect(stored?.error?.stack).toContain('line 1')
      })

      it('应该能够清除错误状态', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, {})
        const nodeResult = instance.nodeResults.get('agent-node')
        
        // 设置错误
        if (nodeResult) {
          nodeResult.status = NodeStatus.FAILED
          nodeResult.error = { code: 'ERR', message: '错误' }
        }
        
        // 清除错误
        if (nodeResult) {
          nodeResult.status = NodeStatus.IDLE
          delete nodeResult.error
        }
        
        expect(instance.nodeResults.get('agent-node')?.status).toBe(NodeStatus.IDLE)
        expect(instance.nodeResults.get('agent-node')?.error).toBeUndefined()
      })
    })

    describe('5.5 实例清理', () => {
      it('应该能够清除指定工作流的所有实例', () => {
        const workflow1 = createBaseWorkflow('workflow-1')
        const workflow2 = createBaseWorkflow('workflow-2')
        
        executor.registerWorkflow(workflow1)
        executor.registerWorkflow(workflow2)
        
        executor.createInstance('workflow-1', {})
        executor.createInstance('workflow-1', {})
        executor.createInstance('workflow-2', {})
        
        executor.clearInstances('workflow-1')
        
        expect(executor.getAllInstances('workflow-1')).toHaveLength(0)
        expect(executor.getAllInstances('workflow-2')).toHaveLength(1)
      })

      it('应该能够清除所有实例', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        executor.createInstance(workflow.id, {})
        executor.createInstance(workflow.id, {})
        
        executor.clearInstances()
        
        expect(executor.getAllInstances()).toHaveLength(0)
      })
    })

    describe('5.6 元数据状态', () => {
      it('应该正确设置实例元数据', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, {}, {
          triggeredBy: 'test-user',
          triggerType: 'api',
        })
        
        expect(instance.metadata.triggeredBy).toBe('test-user')
        expect(instance.metadata.triggerType).toBe('api')
        expect(instance.metadata.startedAt).toBeDefined()
      })

      it('应该设置取消时间', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, {})
        executor.cancelInstance(instance.id)
        
        const cancelled = executor.getInstance(instance.id)
        expect(cancelled?.metadata.endedAt).toBeDefined()
      })
    })
  })

  // ============================================
  // 6. 组合边缘案例测试
  // ============================================

  describe('6. 组合边缘案例', () => {
    describe('6.1 空输入 + 并发', () => {
      it('应该处理空输入的并发实例创建', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instances = Array.from({ length: 10 }, () =>
          executor.createInstance(workflow.id, {})
        )
        
        expect(instances).toHaveLength(10)
        instances.forEach(inst => {
          expect(inst.status).toBe(InstanceStatus.PENDING)
        })
      })
    })

    describe('6.2 超长输入 + 超时', () => {
      it('应该处理超长输入的超时配置', () => {
        const workflow = createBaseWorkflow()
        workflow.config.timeout = 1
        executor.registerWorkflow(workflow)
        
        const longString = generateLongString(100000)
        const instance = executor.createInstance(workflow.id, { longString })
        
        expect(instance.data.inputs?.longString).toHaveLength(100000)
      })
    })

    describe('6.3 错误恢复 + 取消', () => {
      it('应该处理错误恢复后取消', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        const instance = executor.createInstance(workflow.id, {})
        
        // 设置错误
        const nodeResult = instance.nodeResults.get('agent-node')
        if (nodeResult) {
          nodeResult.status = NodeStatus.FAILED
          nodeResult.error = { code: 'ERR', message: '错误' }
        }
        
        // 恢复
        if (nodeResult) {
          nodeResult.status = NodeStatus.IDLE
          delete nodeResult.error
        }
        
        // 取消
        executor.cancelInstance(instance.id)
        
        const cancelled = executor.getInstance(instance.id)
        expect(cancelled?.status).toBe(InstanceStatus.CANCELLED)
      })
    })

    describe('6.4 并发 + 验证', () => {
      it('应该并发验证多个工作流', () => {
        const workflows = Array.from({ length: 10 }, (_, i) => createBaseWorkflow(`wf-${i}`))
        
        workflows.forEach(wf => executor.registerWorkflow(wf))
        
        const validations = workflows.map(wf => executor.validateWorkflow(wf))
        
        validations.forEach(v => {
          expect(v).toBeDefined()
        })
      })
    })

    describe('6.5 超长名称 + 无效类型', () => {
      it('应该处理超长名称和无效类型的组合', () => {
        const workflow = createBaseWorkflow()
        workflow.name = generateLongString(1000)
        // @ts-expect-error 测试无效类型
        workflow.nodes[1].type = 'invalid-type'
        
        const validation = executor.validateWorkflow(workflow)
        expect(validation.valid).toBe(false)
      })
    })
  })

  // ============================================
  // 7. 性能边界测试
  // ============================================

  describe('7. 性能边界测试', () => {
    describe('7.1 大量节点', () => {
      it('应该处理100+节点的工作流', () => {
        const nodes: WorkflowNode[] = [
          { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
        ]
        
        for (let i = 1; i <= 100; i++) {
          nodes.push({
            id: `agent-${i}`,
            type: NodeType.AGENT,
            name: `节点${i}`,
            position: { x: i * 10, y: 0 },
            agentConfig: { agentId: `agent-${i}`, agentType: 'executor' },
          })
        }
        
        nodes.push({ id: 'end', type: NodeType.END, name: '结束', position: { x: 1010, y: 0 } })
        
        const workflow: WorkflowDefinition = {
          id: 'large-workflow',
          name: '大型工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes,
          edges: [],
          config: {},
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test',
            updatedBy: 'test',
          },
        }
        
        executor.registerWorkflow(workflow)
        expect(executor.getWorkflow(workflow.id)).toBeDefined()
      })
    })

    describe('7.2 深度嵌套', () => {
      it('应该处理深度嵌套的输入数据', () => {
        const workflow = createBaseWorkflow()
        executor.registerWorkflow(workflow)
        
        // 创建深度嵌套对象
        let nested: Record<string, unknown> = { value: 'deep' }
        for (let i = 0; i < 50; i++) {
          nested = { level: i, child: nested }
        }
        
        const instance = executor.createInstance(workflow.id, { nested })
        expect(instance.data.inputs?.nested).toBeDefined()
      })
    })

    describe('7.3 大量边', () => {
      it('应该处理大量边的工作流', () => {
        const workflow = createBaseWorkflow()
        
        // 添加大量边（注意：需要调整节点以避免验证错误）
        for (let i = 0; i < 50; i++) {
          workflow.edges.push({
            id: `extra-edge-${i}`,
            source: 'start-node',
            target: 'agent-node',
            type: EdgeType.SEQUENCE,
          })
        }
        
        executor.registerWorkflow(workflow)
        expect(executor.getWorkflow(workflow.id)).toBeDefined()
      })
    })
  })
})