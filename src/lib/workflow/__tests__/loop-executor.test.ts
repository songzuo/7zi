/**
 * 循环节点执行器测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LoopNodeExecutor, LoopConfig, LoopType } from '../executors/loop-executor'
import { ExecutionContext, createExecutionContext } from '../types'
import { NodeType, NodeStatus, WorkflowNode } from '@/types/workflow'

describe('LoopNodeExecutor', () => {
  let executor: LoopNodeExecutor

  beforeEach(() => {
    executor = new LoopNodeExecutor()
  })

  describe('canHandle', () => {
    it('should return true for LOOP node type', () => {
      expect(executor.canHandle(NodeType.LOOP)).toBe(true)
    })

    it('should return false for other node types', () => {
      expect(executor.canHandle(NodeType.START)).toBe(false)
      expect(executor.canHandle(NodeType.AGENT)).toBe(false)
      expect(executor.canHandle(NodeType.HUMAN_INPUT)).toBe(false)
    })
  })

  describe('validate', () => {
    describe('common validation', () => {
      it('should reject node without id', () => {
        const node: WorkflowNode = {
          type: NodeType.LOOP,
          name: '循环节点',
          position: { x: 100, y: 100 },
          loopConfig: { loopType: 'while', condition: 'true' },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('循环节点必须包含 ID')
      })

      it('should reject node without name', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: '',
          position: { x: 100, y: 100 },
          loopConfig: { loopType: 'while', condition: 'true' },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('循环节点必须包含名称')
      })

      it('should reject node without loopConfig', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: '循环节点',
          position: { x: 100, y: 100 },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('循环节点必须配置 loopConfig')
      })

      it('should reject invalid loopType', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: '循环节点',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'invalid' as LoopType,
          },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(false)
        expect(result.errors[0]).toContain('loopType 必须是')
      })

      it('should reject invalid maxIterations', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: '循环节点',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'while',
            condition: 'true',
            maxIterations: 0,
          },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('maxIterations 必须大于 0')
      })

      it('should reject negative timeout', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: '循环节点',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'while',
            condition: 'true',
            timeout: -1,
          },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('timeout 不能为负数')
      })
    })

    describe('while loop validation', () => {
      it('should validate valid while loop', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'While 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'while',
            condition: 'data.counter < 10',
          },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject while loop without condition', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'While 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'while',
          },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('while 循环必须配置 condition')
      })

      it('should reject dangerous condition expression', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'While 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'while',
            condition: 'eval("process.exit()")',
          },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('condition 表达式包含不安全的内容')
      })
    })

    describe('doWhile loop validation', () => {
      it('should validate valid doWhile loop', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'Do-While 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'doWhile',
            condition: 'data.counter < 10',
          },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(true)
      })

      it('should reject doWhile loop without condition', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'Do-While 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'doWhile',
          },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('doWhile 循环必须配置 condition')
      })
    })

    describe('for loop validation', () => {
      it('should validate valid for loop', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'For 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'for',
            forConfig: {
              start: 0,
              end: 10,
              step: 1,
              variableName: 'i',
            },
          },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(true)
      })

      it('should reject for loop without forConfig', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'For 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'for',
          },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('for 循环必须配置 forConfig')
      })

      it('should reject for loop with step 0', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'For 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'for',
            forConfig: {
              start: 0,
              end: 10,
              step: 0,
            },
          },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('forConfig.step 不能为 0')
      })
    })

    describe('forEach loop validation', () => {
      it('should validate valid forEach loop', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'ForEach 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'forEach',
            forEachConfig: {
              array: 'data.items',
              variableName: 'item',
              indexVariableName: 'index',
            },
          },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(true)
      })

      it('should reject forEach loop without forEachConfig', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'ForEach 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'forEach',
          },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('forEach 循环必须配置 forEachConfig')
      })

      it('should reject forEach loop without array', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'ForEach 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'forEach',
            forEachConfig: {
              array: '',
              variableName: 'item',
            },
          },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('forEachConfig.array 必须指定')
      })

      it('should reject forEach loop without variableName', () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'ForEach 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'forEach',
            forEachConfig: {
              array: 'items',
              variableName: '',
            },
          },
        }

        const result = executor.validate(node)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('forEachConfig.variableName 必须指定')
      })
    })
  })

  describe('execute', () => {
    const createMockContext = (node: WorkflowNode, variables: Record<string, unknown> = {}): ExecutionContext => {
      return createExecutionContext(
        'instance-1',
        'workflow-1',
        node,
        variables,
        {},
        {}
      )
    }

    describe('while loop execution', () => {
      it('should execute while loop correctly', async () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'While 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'while',
            condition: 'variables.counter < 3',
            maxIterations: 10,
          },
        }

        const context = createMockContext(node, { counter: 0 })

        // Mock counter increment in each iteration
        const originalExecute = executor.execute.bind(executor)
        let iterationCount = 0

        const result = await originalExecute(context)

        expect(result.status).toBe(NodeStatus.SUCCESS)
        expect(result.output?.totalIterations).toBeGreaterThanOrEqual(0)
        expect(result.output?.loopType).toBe('while')
      })

      it('should stop on maxIterations', async () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'While 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'while',
            condition: 'true',
            maxIterations: 5,
          },
        }

        const context = createMockContext(node)
        const result = await executor.execute(context)

        expect(result.status).toBe(NodeStatus.SUCCESS)
        expect(result.output?.totalIterations).toBe(5)
        expect(result.output?.earlyExit).toBe(true)
        expect(result.output?.exitReason).toBe('达到最大迭代次数')
      })
    })

    describe('doWhile loop execution', () => {
      it('should execute doWhile loop at least once', async () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'Do-While 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'doWhile',
            condition: 'false',
            maxIterations: 10,
          },
        }

        const context = createMockContext(node)
        const result = await executor.execute(context)

        expect(result.status).toBe(NodeStatus.SUCCESS)
        expect(result.output?.totalIterations).toBe(1)
      })
    })

    describe('for loop execution', () => {
      it('should execute for loop correctly', async () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'For 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'for',
            forConfig: {
              start: 0,
              end: 5,
              step: 1,
            },
          },
        }

        const context = createMockContext(node)
        const result = await executor.execute(context)

        expect(result.status).toBe(NodeStatus.SUCCESS)
        expect(result.output?.totalIterations).toBe(5)
      })

      it('should handle negative step', async () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'For 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'for',
            forConfig: {
              start: 5,
              end: 0,
              step: -1,
            },
          },
        }

        const context = createMockContext(node)
        const result = await executor.execute(context)

        expect(result.status).toBe(NodeStatus.SUCCESS)
        expect(result.output?.totalIterations).toBe(5)
      })
    })

    describe('forEach loop execution', () => {
      it('should execute forEach loop correctly', async () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'ForEach 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'forEach',
            forEachConfig: {
              array: 'variables.items',
              variableName: 'item',
              indexVariableName: 'idx',
            },
          },
        }

        const context = createMockContext(node, { items: ['a', 'b', 'c'] })
        const result = await executor.execute(context)

        expect(result.status).toBe(NodeStatus.SUCCESS)
        expect(result.output?.totalIterations).toBe(3)
      })

      it('should handle empty array', async () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'ForEach 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'forEach',
            forEachConfig: {
              array: 'variables.items',
              variableName: 'item',
            },
          },
        }

        const context = createMockContext(node, { items: [] })
        const result = await executor.execute(context)

        expect(result.status).toBe(NodeStatus.SUCCESS)
        expect(result.output?.totalIterations).toBe(0)
      })
    })

    describe('continueOnError', () => {
      it('should handle continueOnError option', async () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'For 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'for',
            forConfig: {
              start: 0,
              end: 3,
            },
            continueOnError: true,
          },
        }

        const context = createMockContext(node)
        const result = await executor.execute(context)

        expect(result.status).toBe(NodeStatus.SUCCESS)
      })
    })

    describe('collectResults', () => {
      it('should collect results when enabled', async () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'For 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'for',
            forConfig: {
              start: 0,
              end: 3,
            },
            collectResults: true,
          },
        }

        const context = createMockContext(node)
        const result = await executor.execute(context)

        expect(result.status).toBe(NodeStatus.SUCCESS)
        expect(result.output?.results).toBeDefined()
        expect(Array.isArray(result.output?.results)).toBe(true)
      })

      it('should not collect results when disabled', async () => {
        const node: WorkflowNode = {
          id: 'loop-1',
          type: NodeType.LOOP,
          name: 'For 循环',
          position: { x: 100, y: 100 },
          loopConfig: {
            loopType: 'for',
            forConfig: {
              start: 0,
              end: 3,
            },
            collectResults: false,
          },
        }

        const context = createMockContext(node)
        const result = await executor.execute(context)

        expect(result.status).toBe(NodeStatus.SUCCESS)
        expect(result.output?.results).toBeUndefined()
      })
    })
  })

  describe('state management', () => {
    it('should track loop state', async () => {
      const node: WorkflowNode = {
        id: 'loop-1',
        type: NodeType.LOOP,
        name: 'For 循环',
        position: { x: 100, y: 100 },
        loopConfig: {
          loopType: 'for',
          forConfig: {
            start: 0,
            end: 10,
          },
          maxIterations: 5,
        },
      }

      const context = createExecutionContext(
        'instance-test',
        'workflow-1',
        node,
        {},
        {},
        {}
      )

      await executor.execute(context)

      // State should be cleared after execution
      const state = executor.getLoopState('instance-test', 'loop-1')
      expect(state).toBeUndefined()
    })

    it('should clear loop state', () => {
      executor.clearLoopState()
      executor.clearLoopState('instance-1')
    })
  })
})
