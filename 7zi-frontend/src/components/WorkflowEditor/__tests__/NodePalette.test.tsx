/**
 * NodePalette 组件测试
 *
 * 🧪 测试员: Tester
 * 创建日期: 2026-04-03
 *
 * 测试覆盖：
 * - 组件渲染测试
 * - 搜索功能测试
 * - 拖拽功能测试
 * - 类别展开/折叠测试
 * - 禁用状态测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// Mock constants
vi.mock('../constants', () => ({
  NODE_TEMPLATES: {
    start: { label: '开始', icon: '🚀', description: '工作流起点', category: 'basic' },
    end: { label: '结束', icon: '🏁', description: '工作流终点', category: 'basic' },
    agent: { label: '智能体', icon: '🤖', description: 'AI智能体节点', category: 'agent' },
    condition: { label: '条件', icon: '🔀', description: '条件分支', category: 'logic' },
    loop: { label: '循环', icon: '🔄', description: '循环节点', category: 'logic' },
    parallel: { label: '并行', icon: '⚡', description: '并行执行', category: 'logic' },
    wait: { label: '等待', icon: '⏳', description: '等待节点', category: 'flow' },
    humanInput: { label: '人工输入', icon: '👤', description: '人工交互', category: 'flow' },
    subworkflow: { label: '子工作流', icon: '📦', description: '嵌套工作流', category: 'flow' },
    transform: { label: '转换', icon: '🔧', description: '数据转换', category: 'flow' },
  },
  NODE_CATEGORY_LABELS: {
    basic: '基础节点',
    agent: '智能体',
    logic: '逻辑控制',
    flow: '流程控制',
    custom: '自定义',
  },
}))

// 导入组件（在 mock 之后）
import { NodePalette } from '../NodePalette'

describe('NodePalette', () => {
  const mockOnNodeDragStart = vi.fn()
  
  const defaultProps = {
    onNodeDragStart: mockOnNodeDragStart,
    disabled: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('组件渲染测试', () => {
    it('应该正确渲染节点面板', () => {
      render(React.createElement(NodePalette, defaultProps))

      expect(screen.getByText('节点面板')).toBeInTheDocument()
    })

    it('应该渲染搜索框', () => {
      render(React.createElement(NodePalette, defaultProps))

      expect(screen.getByPlaceholderText('搜索节点...')).toBeInTheDocument()
    })

    it('应该渲染所有类别标题', () => {
      render(React.createElement(NodePalette, defaultProps))

      // 使用 getAllByText 因为 "智能体" 同时作为类别名和节点名出现
      expect(screen.getAllByText('基础节点').length).toBeGreaterThan(0)
      expect(screen.getAllByText('智能体').length).toBeGreaterThan(0)
      expect(screen.getAllByText('逻辑控制').length).toBeGreaterThan(0)
      expect(screen.getAllByText('流程控制').length).toBeGreaterThan(0)
    })

    it('应该渲染基础节点', () => {
      render(React.createElement(NodePalette, defaultProps))

      expect(screen.getByText('开始')).toBeInTheDocument()
      expect(screen.getByText('结束')).toBeInTheDocument()
    })

    it('应该渲染节点图标', () => {
      render(React.createElement(NodePalette, defaultProps))

      expect(screen.getByText('🚀')).toBeInTheDocument() // Start
      expect(screen.getByText('🤖')).toBeInTheDocument() // Agent
    })

    it('应该显示节点描述', () => {
      render(React.createElement(NodePalette, defaultProps))

      expect(screen.getByText('工作流起点')).toBeInTheDocument()
      expect(screen.getByText('AI智能体节点')).toBeInTheDocument()
    })
  })

  describe('搜索功能测试', () => {
    it('应该能输入搜索关键词', async () => {
      render(React.createElement(NodePalette, defaultProps))

      const searchInput = screen.getByPlaceholderText('搜索节点...')
      await userEvent.type(searchInput, '智能')

      expect(searchInput).toHaveValue('智能')
    })

    it('搜索时应该过滤节点', async () => {
      render(React.createElement(NodePalette, defaultProps))

      const searchInput = screen.getByPlaceholderText('搜索节点...')
      await userEvent.type(searchInput, '智能')

      // 应该显示智能体节点 - 使用 getAllByText
      const agentElements = screen.getAllByText('智能体')
      expect(agentElements.length).toBeGreaterThan(0)
    })

    it('搜索无结果时应显示提示', async () => {
      render(React.createElement(NodePalette, defaultProps))

      const searchInput = screen.getByPlaceholderText('搜索节点...')
      await userEvent.type(searchInput, '不存在的节点类型')

      expect(screen.getByText('未找到匹配的节点')).toBeInTheDocument()
    })

    it('清空搜索时应恢复所有节点', async () => {
      render(React.createElement(NodePalette, defaultProps))

      const searchInput = screen.getByPlaceholderText('搜索节点...')
      await userEvent.type(searchInput, '智能')
      
      // 清空搜索
      await userEvent.clear(searchInput)

      // 所有节点应该可见
      expect(screen.getByText('开始')).toBeInTheDocument()
      expect(screen.getByText('结束')).toBeInTheDocument()
    })
  })

  describe('拖拽功能测试', () => {
    it('节点应该可拖拽', () => {
      render(React.createElement(NodePalette, defaultProps))

      const startNode = screen.getByText('开始').closest('[draggable="true"]')
      expect(startNode).toBeInTheDocument()
    })

    it('拖拽开始时应调用 onNodeDragStart', () => {
      render(React.createElement(NodePalette, defaultProps))

      const startNode = screen.getByText('开始').closest('[draggable="true"]')
      if (startNode) {
        fireEvent.dragStart(startNode)
      }

      expect(mockOnNodeDragStart).toHaveBeenCalled()
    })

    it('禁用状态下节点不可拖拽', () => {
      render(React.createElement(NodePalette, { ...defaultProps, disabled: true }))

      const startNode = screen.getByText('开始').closest('[draggable="false"]')
      expect(startNode).toBeInTheDocument()
    })
  })

  describe('类别展开/折叠测试', () => {
    it('默认应该展开基础类别', () => {
      render(React.createElement(NodePalette, defaultProps))

      // 开始节点应该默认可见
      expect(screen.getByText('开始')).toBeInTheDocument()
    })

    it('点击类别标题应该折叠类别', async () => {
      render(React.createElement(NodePalette, defaultProps))

      // 点击基础节点类别
      const basicCategory = screen.getAllByText('基础节点')[0]
      await userEvent.click(basicCategory)

      // 类别应该被折叠 - 节点消失
      expect(screen.queryByText('开始')).not.toBeInTheDocument()
    })

    it('再次点击折叠的类别应该展开', async () => {
      render(React.createElement(NodePalette, defaultProps))

      // 折叠
      const basicCategory = screen.getAllByText('基础节点')[0]
      await userEvent.click(basicCategory)
      
      // 展开
      await userEvent.click(basicCategory)

      expect(screen.getByText('开始')).toBeInTheDocument()
    })
  })

  describe('禁用状态测试', () => {
    it('禁用状态应该显示禁用样式', () => {
      render(React.createElement(NodePalette, { ...defaultProps, disabled: true }))

      const startNodeText = screen.getByText('开始')
      const nodeContainer = startNodeText.closest('.cursor-not-allowed')
      expect(nodeContainer).toBeInTheDocument()
    })

    it('禁用状态下节点应该有 opacity-50 类', () => {
      render(React.createElement(NodePalette, { ...defaultProps, disabled: true }))

      const startNodeText = screen.getByText('开始')
      const nodeContainer = startNodeText.closest('.opacity-50')
      expect(nodeContainer).toBeInTheDocument()
    })
  })

  describe('提示信息测试', () => {
    it('应该显示使用提示', () => {
      render(React.createElement(NodePalette, defaultProps))

      expect(screen.getByText('💡 提示')).toBeInTheDocument()
      expect(screen.getByText('拖拽节点到画布上创建工作流')).toBeInTheDocument()
    })
  })
})
