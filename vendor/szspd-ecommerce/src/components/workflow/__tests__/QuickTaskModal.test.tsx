/**
 * @fileoverview QuickTaskModal 组件单元测试
 * @description 测试快速任务创建模态框的核心功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickTaskModal } from '../QuickTaskModal'

// Mock TaskParser 模块
vi.mock('@/lib/workflow/TaskParser', () => ({
  parseTaskFromText: vi.fn((text: string) => ({
    intent: text.includes('监控') ? 'monitoring' : text.includes('通知') ? 'notification' : 'scheduled',
    workflowName: `工作流-${text.slice(0, 10)}`,
    description: text,
    nodes: [
      { id: 'start', type: 'start', name: '开始', position: { x: 0, y: 0 } },
      { id: 'task', type: 'task', name: '执行任务', position: { x: 100, y: 0 } },
      { id: 'end', type: 'end', name: '结束', position: { x: 200, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'task' },
      { id: 'e2', source: 'task', target: 'end' },
    ],
    variables: { timeExpressions: ['每天'] },
    confidence: 0.85,
    suggestions: ['建议添加错误处理'],
    rawText: text,
  })),
  parsedTaskToWorkflowDefinition: vi.fn((parsed) => ({
    id: 'workflow-' + Date.now(),
    name: parsed.workflowName,
    nodes: parsed.nodes,
    edges: parsed.edges,
    status: 'draft' as const,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'ai-parser',
    },
  })),
  validateParsedTask: vi.fn(() => ({
    isValid: true,
    errors: [],
    warnings: [],
  })),
}))

// Mock cn 工具函数
vi.mock('@/lib/utils', () => ({
  cn: vi.fn((...args) => args.filter(Boolean).join(' ')),
}))

describe('QuickTaskModal 组件', () => {
  // 默认的 mock 回调函数
  const mockOnCreate = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('组件初始渲染', () => {
    it('isOpen=false 时不应该渲染', () => {
      const { container } = render(
        <QuickTaskModal isOpen={false} onClose={mockOnClose} onCreate={mockOnCreate} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('isOpen=true 时应该渲染模态框', () => {
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByText('AI 任务创建助手')).toBeInTheDocument()
    })

    it('应该渲染标题和描述', () => {
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByText('AI 任务创建助手')).toBeInTheDocument()
      expect(screen.getByText('用自然语言描述你想要创建的任务')).toBeInTheDocument()
    })

    it('应该渲染输入框', () => {
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      expect(textarea).toBeInTheDocument()
    })

    it('应该渲染示例提示', () => {
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByText('💡 示例描述')).toBeInTheDocument()
      expect(screen.getByText('每天凌晨2点备份数据库并发送邮件通知')).toBeInTheDocument()
      expect(screen.getByText('监控服务器CPU使用率，超过80%时发送告警到Slack')).toBeInTheDocument()
      expect(screen.getByText('当收到新订单时，自动发送确认邮件并更新库存')).toBeInTheDocument()
    })

    it('应该渲染取消和解析按钮', () => {
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByText('取消')).toBeInTheDocument()
      expect(screen.getByText('解析并预览')).toBeInTheDocument()
    })

    it('应该渲染关闭按钮', () => {
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const closeButton = screen.getByText('✕')
      expect(closeButton).toBeInTheDocument()
    })

    it('应该应用自定义类名', () => {
      const { container } = render(
        <QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} className="custom-class" />
      )

      const modalContent = container.querySelector('.custom-class')
      expect(modalContent).toBeInTheDocument()
    })
  })

  describe('用户输入处理', () => {
    it('应该更新输入值', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '每天凌晨2点备份数据库')

      expect(textarea).toHaveValue('每天凌晨2点备份数据库')
    })

    it('空输入时应该显示错误', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText('请输入任务描述')).toBeInTheDocument()
      })
    })

    it('点击示例应该填充输入框', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const exampleButton = screen.getByText('每天凌晨2点备份数据库并发送邮件通知')
      await user.click(exampleButton)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      expect(textarea).toHaveValue('每天凌晨2点备份数据库并发送邮件通知')
    })
  })

  describe('解析功能', () => {
    it('点击解析按钮应该解析输入', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '每天备份')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText('任务预览')).toBeInTheDocument()
      })
    })

    it('解析后应该显示任务概览', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '每天备份')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText(/工作流-每天备份/)).toBeInTheDocument()
      })
    })

    it('解析后应该显示意图标签', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '每天备份')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText('定时任务')).toBeInTheDocument()
      })
    })

    it('解析后应该显示置信度', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '每天备份')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText(/85% 置信度/)).toBeInTheDocument()
      })
    })

    it('解析后应该显示节点数', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '每天备份')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText(/3 节点/)).toBeInTheDocument()
      })
    })

    it('解析后应该显示节点列表', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '每天备份')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText('工作流节点')).toBeInTheDocument()
        expect(screen.getByText('开始')).toBeInTheDocument()
        expect(screen.getByText('执行任务')).toBeInTheDocument()
        expect(screen.getByText('结束')).toBeInTheDocument()
      })
    })

    it('解析后应该显示原始描述', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '每天备份')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText(/原始描述:/)).toBeInTheDocument()
        expect(screen.getByText('每天备份')).toBeInTheDocument()
      })
    })

    it('解析后应该显示改进建议', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '每天备份')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText('💡 改进建议')).toBeInTheDocument()
        expect(screen.getByText('建议添加错误处理')).toBeInTheDocument()
      })
    })

    it('解析中应该显示加载状态', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '每天备份')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      // 按钮应该显示"解析中..."
      expect(screen.getByText('解析中...')).toBeInTheDocument()
    })
  })

  describe('创建任务', () => {
    it('点击创建任务应该调用 onCreate 回调', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '每天备份')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText('✅ 创建任务')).toBeInTheDocument()
      })

      const createButton = screen.getByText('✅ 创建任务')
      await user.click(createButton)

      expect(mockOnCreate).toHaveBeenCalled()
    })

    it('创建任务后应该调用 onClose', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '每天备份')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText('✅ 创建任务')).toBeInTheDocument()
      })

      const createButton = screen.getByText('✅ 创建任务')
      await user.click(createButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('返回修改', () => {
    it('点击返回修改应该回到输入步骤', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '每天备份')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText('任务预览')).toBeInTheDocument()
      })

      const backButton = screen.getByText('← 返回修改')
      await user.click(backButton)

      await waitFor(() => {
        expect(screen.getByText('AI 任务创建助手')).toBeInTheDocument()
      })
    })

    it('返回修改后应该保留输入值', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '每天备份')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText('任务预览')).toBeInTheDocument()
      })

      const backButton = screen.getByText('← 返回修改')
      await user.click(backButton)

      await waitFor(() => {
        expect(textarea).toHaveValue('每天备份')
      })
    })
  })

  describe('关闭模态框', () => {
    it('点击取消按钮应该调用 onClose', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const cancelButton = screen.getByText('取消')
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('点击关闭按钮应该调用 onClose', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const closeButton = screen.getByText('✕')
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('点击背景遮罩应该调用 onClose', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const backdrop = document.querySelector('.bg-black\\/50')
      expect(backdrop).toBeInTheDocument()

      if (backdrop) {
        await user.click(backdrop)
        expect(mockOnClose).toHaveBeenCalled()
      }
    })

    it('按 ESC 键应该调用 onClose', async () => {
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('错误处理', () => {
    it('解析失败时应该显示错误消息', async () => {
      const { parseTaskFromText } = require('@/lib/workflow/TaskParser')
      parseTaskFromText.mockImplementationOnce(() => {
        throw new Error('解析失败')
      })

      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '无效输入')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText('解析失败，请重试')).toBeInTheDocument()
      })
    })

    it('解析失败后应该允许重新输入', async () => {
      const { parseTaskFromText } = require('@/lib/workflow/TaskParser')
      parseTaskFromText.mockImplementationOnce(() => {
        throw new Error('解析失败')
      })

      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '无效输入')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText('解析失败，请重试')).toBeInTheDocument()
      })

      // 清空错误并重新输入
      await user.clear(textarea)
      await user.type(textarea, '有效输入')

      expect(textarea).toHaveValue('有效输入')
    })
  })

  describe('状态重置', () => {
    it('关闭后应该重置状态', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />
      )

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '每天备份')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText('任务预览')).toBeInTheDocument()
      })

      // 关闭模态框
      rerender(<QuickTaskModal isOpen={false} onClose={mockOnClose} onCreate={mockOnCreate} />)

      // 重新打开
      rerender(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      // 应该回到初始状态
      expect(screen.getByText('AI 任务创建助手')).toBeInTheDocument()
      expect(textarea).toHaveValue('')
    })
  })

  describe('边界情况', () => {
    it('应该处理极长的输入', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const longText = 'a'.repeat(1000)
      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, longText)

      expect(textarea).toHaveValue(longText)
    })

    it('应该处理特殊字符输入', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const specialChars = '测试@#$任务'
      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, specialChars)

      expect(textarea).toHaveValue(specialChars)
    })

    it('应该处理 Unicode 字符', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const unicodeText = '你好世界 🌍 مرحبا мир'
      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, unicodeText)

      expect(textarea).toHaveValue(unicodeText)
    })

    it('置信度为 0 时应该正确显示', async () => {
      const { parseTaskFromText } = require('@/lib/workflow/TaskParser')
      parseTaskFromText.mockReturnValueOnce({
        intent: 'scheduled',
        workflowName: '测试工作流',
        description: '测试描述',
        nodes: [],
        edges: [],
        variables: {},
        confidence: 0,
        suggestions: [],
        rawText: '测试',
      })

      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '测试')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText(/0% 置信度/)).toBeInTheDocument()
      })
    })

    it('置信度为 1 时应该正确显示', async () => {
      const { parseTaskFromText } = require('@/lib/workflow/TaskParser')
      parseTaskFromText.mockReturnValueOnce({
        intent: 'scheduled',
        workflowName: '测试工作流',
        description: '测试描述',
        nodes: [],
        edges: [],
        variables: {},
        confidence: 1,
        suggestions: [],
        rawText: '测试',
      })

      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '测试')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText(/100% 置信度/)).toBeInTheDocument()
      })
    })

    it('节点数为 0 时应该正确显示', async () => {
      const { parseTaskFromText } = require('@/lib/workflow/TaskParser')
      parseTaskFromText.mockReturnValueOnce({
        intent: 'scheduled',
        workflowName: '测试工作流',
        description: '测试描述',
        nodes: [],
        edges: [],
        variables: {},
        confidence: 0.85,
        suggestions: [],
        rawText: '测试',
      })

      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '测试')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText(/0 节点/)).toBeInTheDocument()
      })
    })

    it('建议数组为空时不应该显示建议', async () => {
      const { parseTaskFromText } = require('@/lib/workflow/TaskParser')
      parseTaskFromText.mockReturnValueOnce({
        intent: 'scheduled',
        workflowName: '测试工作流',
        description: '测试描述',
        nodes: [],
        edges: [],
        variables: {},
        confidence: 0.85,
        suggestions: [],
        rawText: '测试',
      })

      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '测试')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.queryByText('💡 改进建议')).not.toBeInTheDocument()
      })
    })
  })

  describe('不同意图类型', () => {
    it('应该正确显示监控任务意图', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '监控服务器')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText('监控任务')).toBeInTheDocument()
      })
    })

    it('应该正确显示通知任务意图', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '发送通知')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText('通知任务')).toBeInTheDocument()
      })
    })
  })

  describe('可访问性', () => {
    it('输入框应该有 placeholder', () => {
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      expect(textarea).toBeInTheDocument()
    })

    it('按钮应该有清晰的文本标签', () => {
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByText('取消')).toBeInTheDocument()
      expect(screen.getByText('解析并预览')).toBeInTheDocument()
    })

    it('处理中时按钮应该被禁用', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '测试')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      // 按钮应该被禁用
      expect(parseButton).toBeDisabled()
    })
  })

  describe('焦点管理', () => {
    it('打开模态框时应该聚焦输入框', () => {
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      expect(textarea).toHaveFocus()
    })
  })
})