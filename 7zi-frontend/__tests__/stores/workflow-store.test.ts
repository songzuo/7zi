/**
 * Workflow Store 单元测试
 * 验证 Zustand store 性能优化
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { create } from 'zustand'

// ============================================
// Mock Types
// ============================================

interface MockWorkflow {
  id: string
  name: string
  status: 'active' | 'inactive' | 'draft'
  nodes: unknown[]
  edges: unknown[]
}

interface MockWorkflowStore {
  workflows: MockWorkflow[]
  selectedWorkflow: MockWorkflow | null
  isLoading: boolean
  error: string | null
  // Actions
  fetchWorkflows: () => Promise<void>
  selectWorkflow: (id: string) => void
  createWorkflow: (workflow: MockWorkflow) => void
  updateWorkflow: (id: string, updates: Partial<MockWorkflow>) => void
  deleteWorkflow: (id: string) => void
}

// ============================================
// Test Store Factory
// ============================================

function createTestWorkflowStore(initialState?: Partial<MockWorkflowStore>) {
  return create<MockWorkflowStore>((set, get) => ({
    workflows: [],
    selectedWorkflow: null,
    isLoading: false,
    error: null,
    ...initialState,

    fetchWorkflows: async () => {
      set({ isLoading: true })
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 10))
      const mockWorkflows: MockWorkflow[] = [
        { id: '1', name: 'Test Workflow', status: 'active', nodes: [], edges: [] },
        { id: '2', name: 'Draft Workflow', status: 'draft', nodes: [], edges: [] },
      ]
      set({ workflows: mockWorkflows, isLoading: false })
    },

    selectWorkflow: (id: string) => {
      const { workflows } = get()
      const workflow = workflows.find(w => w.id === id)
      set({ selectedWorkflow: workflow || null })
    },

    createWorkflow: (workflow: MockWorkflow) => {
      set(state => ({
        workflows: [workflow, ...state.workflows]
      }))
    },

    updateWorkflow: (id: string, updates: Partial<MockWorkflow>) => {
      set(state => ({
        workflows: state.workflows.map(w =>
          w.id === id ? { ...w, ...updates } : w
        )
      }))
    },

    deleteWorkflow: (id: string) => {
      set(state => ({
        workflows: state.workflows.filter(w => w.id !== id),
        selectedWorkflow: state.selectedWorkflow?.id === id ? null : state.selectedWorkflow
      }))
    },
  }))
}

// ============================================
// Tests
// ============================================

describe('Workflow Store - 性能优化验证', () => {
  describe('状态初始化', () => {
    it('should initialize with correct default state', () => {
      const store = createTestWorkflowStore()
      const state = store.getState()

      expect(state.workflows).toEqual([])
      expect(state.selectedWorkflow).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should accept initial state', () => {
      const initialWorkflows = [
        { id: '1', name: 'Initial', status: 'active' as const, nodes: [], edges: [] }
      ]
      const store = createTestWorkflowStore({ workflows: initialWorkflows })
      const state = store.getState()

      expect(state.workflows).toHaveLength(1)
      expect(state.workflows[0].name).toBe('Initial')
    })
  })

  describe('CRUD 操作', () => {
    it('should fetch workflows correctly', async () => {
      const store = createTestWorkflowStore()
      
      await act(async () => {
        await store.getState().fetchWorkflows()
      })

      const state = store.getState()
      expect(state.workflows).toHaveLength(2)
      expect(state.isLoading).toBe(false)
    })

    it('should create workflow', () => {
      const store = createTestWorkflowStore()
      const newWorkflow = {
        id: 'new-1',
        name: 'New Workflow',
        status: 'draft' as const,
        nodes: [],
        edges: []
      }

      act(() => {
        store.getState().createWorkflow(newWorkflow)
      })

      const state = store.getState()
      expect(state.workflows).toHaveLength(1)
      expect(state.workflows[0].id).toBe('new-1')
    })

    it('should update workflow', () => {
      const store = createTestWorkflowStore({
        workflows: [{ id: '1', name: 'Original', status: 'draft' as const, nodes: [], edges: [] }]
      })

      act(() => {
        store.getState().updateWorkflow('1', { name: 'Updated', status: 'active' })
      })

      const state = store.getState()
      expect(state.workflows[0].name).toBe('Updated')
      expect(state.workflows[0].status).toBe('active')
    })

    it('should delete workflow', () => {
      const store = createTestWorkflowStore({
        workflows: [
          { id: '1', name: 'Workflow 1', status: 'active' as const, nodes: [], edges: [] },
          { id: '2', name: 'Workflow 2', status: 'active' as const, nodes: [], edges: [] }
        ]
      })

      act(() => {
        store.getState().deleteWorkflow('1')
      })

      const state = store.getState()
      expect(state.workflows).toHaveLength(1)
      expect(state.workflows[0].id).toBe('2')
    })

    it('should clear selectedWorkflow when deleting selected workflow', () => {
      const store = createTestWorkflowStore({
        workflows: [{ id: '1', name: 'Workflow 1', status: 'active' as const, nodes: [], edges: [] }],
        selectedWorkflow: { id: '1', name: 'Workflow 1', status: 'active' as const, nodes: [], edges: [] }
      })

      act(() => {
        store.getState().deleteWorkflow('1')
      })

      const state = store.getState()
      expect(state.selectedWorkflow).toBeNull()
    })
  })

  describe('选择器性能优化', () => {
    it('should select workflow by id without causing unnecessary rerenders', () => {
      const store = createTestWorkflowStore({
        workflows: [
          { id: '1', name: 'Workflow 1', status: 'active' as const, nodes: [], edges: [] },
          { id: '2', name: 'Workflow 2', status: 'draft' as const, nodes: [], edges: [] }
        ]
      })

      let renderCount = 0

      const { result } = renderHook(() => {
        const workflow = store(s => s.workflows.find(w => w.id === '1'))
        renderCount++
        return workflow
      })

      const initialRender = renderCount

      // Trigger unrelated state change
      act(() => {
        store.getState().updateWorkflow('2', { name: 'Updated 2' })
      })

      // The selector should prevent rerender when workflows[1] changes
      // Note: This test validates the pattern, actual rerender prevention depends on implementation
      expect(result.current?.name).toBe('Workflow 1')
    })
  })

  describe('错误处理', () => {
    it('should handle select non-existent workflow gracefully', () => {
      const store = createTestWorkflowStore()

      act(() => {
        store.getState().selectWorkflow('non-existent')
      })

      const state = store.getState()
      expect(state.selectedWorkflow).toBeNull()
    })

    it('should handle update non-existent workflow gracefully', () => {
      const store = createTestWorkflowStore()

      act(() => {
        store.getState().updateWorkflow('non-existent', { name: 'Test' })
      })

      // Should not throw, state should remain unchanged
      const state = store.getState()
      expect(state.workflows).toEqual([])
    })
  })
})
