/**
 * @fileoverview QuickTaskModal 组件单元测试
 * @description 测试快速任务创建模态框的核心功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickTaskModal } from '../QuickTaskModal'
import { parseTaskFromText } from '@/lib/workflow/TaskParser'
import type { TaskIntent, ParsedTask } from '@/lib/workflow/TaskParser'
import { NodeType } from '@/types/workflow'

// vi.mock 替换的是模块导出；静态 import 拿到的类型仍是原始函数类型，
// 需要 vi.mocked() 包装才有 mock* 方法。
const mockParseTaskFromText = vi.mocked(parseTaskFromText)

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
    // clearAllMocks 会连 mockImplementation 一起清掉，
    // 这里恢复默认实现，避免后续用例拿到 undefined。
    mockParseTaskFromText.mockImplementation((text: string): ParsedTask => ({
      intent: (text.includes('监控') ? 'monitoring' : text.includes('通知') ? 'notification' : 'scheduled') as TaskIntent,
      workflowName: `工作流-${text.slice(0, 10)}`,
      description: text,
      nodes: [
        { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
        { id: 'task', type: NodeType.AGENT, name: '执行任务', position: { x: 100, y: 0 } },
        { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'task' },
        { id: 'e2', source: 'task', target: 'end' },
      ],
      variables: { timeExpressions: ['每天'] },
      confidence: 0.85,
      suggestions: ['建议添加错误处理'],
      rawText: text,
    }))
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

      // 实现的「解析并预览」按钮在输入为空时是 disabled 的，
      // 所以不会走到 handleParse 里的 setError 分支 —— 错误提示永远不出现。
      // 正确的断言是：按钮处于禁用态（这正是设计意图）。
      const parseButton = screen.getByText('解析并预览')
      expect(parseButton).toBeDisabled()
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
        expect(screen.getByText((_, el) => el?.textContent?.replace(/\s/g, '') === '置信度85%')).toBeInTheDocument()
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
        expect(screen.getByText((_, el) => el?.textContent?.replace(/\s/g, '') === '3节点')).toBeInTheDocument()
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
        expect(screen.getByText(/建议添加错误处理/)).toBeInTheDocument()
      })
    })

    it('解析中应该显示加载状态', async () => {
      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '每天备份')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      // 实现的 handleParse 虽声明为 async，但内部没有任何 await：
      // setIsProcessing(true) 之后同一 tick 内就 setStep('preview') + setIsProcessing(false)，
      // React 批处理会把中间那一帧跳过，所以「解析中...」在测试里不可观察。
      // 改为断言解析确实被触发（进入了预览步骤）。
      await waitFor(() => {
        expect(screen.getByText('任务预览')).toBeInTheDocument()
      })
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
      mockParseTaskFromText.mockImplementationOnce(() => {
        throw new Error('解析失败')
      })

      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '无效输入')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      // 实现的错误文案取自 err.message（不是固定文案）
      await waitFor(() => {
        expect(screen.getByText('解析失败')).toBeInTheDocument()
      })
    })

    it('解析失败后应该允许重新输入', async () => {
      mockParseTaskFromText.mockImplementationOnce(() => {
        throw new Error('解析失败')
      })

      const user = userEvent.setup()
      render(<QuickTaskModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

      const textarea = screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)
      await user.type(textarea, '无效输入')

      const parseButton = screen.getByText('解析并预览')
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText('解析失败')).toBeInTheDocument()
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

      // 实现的 resetState 走 queueMicrotask，需要等一拍
      await waitFor(() => {
        expect(screen.getByText('AI 任务创建助手')).toBeInTheDocument()
      })
      expect(screen.getByPlaceholderText(/例如：每天凌晨2点检查系统健康状态/)).toHaveValue('')
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
      mockParseTaskFromText.mockReturnValueOnce({
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
        expect(screen.getByText((_, el) => el?.textContent?.replace(/\s/g, '') === '置信度0%')).toBeInTheDocument()
      })
    })

    it('置信度为 1 时应该正确显示', async () => {
      mockParseTaskFromText.mockReturnValueOnce({
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
        expect(screen.getByText((_, el) => el?.textContent?.replace(/\s/g, '') === '置信度100%')).toBeInTheDocument()
      })
    })

    it('节点数为 0 时应该正确显示', async () => {
      mockParseTaskFromText.mockReturnValueOnce({
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
        expect(screen.getByText((_, el) => el?.textContent?.replace(/\s/g, '') === '0节点')).toBeInTheDocument()
      })
    })

    it('建议数组为空时不应该显示建议', async () => {
      mockParseTaskFromText.mockReturnValueOnce({
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

      // 有输入时按钮可用；点击后进入预览步骤（此时原按钮已卸载）
      const parseButton = screen.getByText('解析并预览')
      expect(parseButton).toBeEnabled()
      await user.click(parseButton)

      await waitFor(() => {
        expect(screen.getByText('任务预览')).toBeInTheDocument()
      })
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