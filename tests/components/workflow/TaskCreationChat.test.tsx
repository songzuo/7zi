/**
 * TaskCreationChat 组件测试
 *
 * 测试覆盖：
 * - 组件渲染和基本功能
 * - 用户交互（输入、按钮、操作）
 * - 状态管理
 * - 与 TaskParser 集成
 * - 与 TaskPreviewPanel 集成
 * - 边界情况和错误处理
 * - 快捷提示功能
 * - 消息列表渲染
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { TaskCreationChat } from '@/components/workflow/TaskCreationChat'
import type { ParsedTask, TaskIntent } from '@/lib/workflow/TaskParser'
import type { WorkflowDefinition } from '@/types/workflow'

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn()

// Mock TaskParser
vi.mock('@/lib/workflow/TaskParser', () => ({
  parseTaskFromText: vi.fn(),
  parsedTaskToWorkflowDefinition: vi.fn(),
  validateParsedTask: vi.fn(),
}))

// Mock TaskPreviewPanel
vi.mock('@/components/workflow/TaskPreviewPanel', () => ({
  TaskPreviewPanel: ({ task, onCreate, onModify, onClose, className }: any) => (
    <div data-testid="task-preview-panel" className={className}>
      <div data-testid="preview-intent">{task?.intent}</div>
      <div data-testid="preview-workflow-name">{task?.workflowName}</div>
      <button onClick={onCreate} data-testid="preview-create-btn">
        创建
      </button>
      <button onClick={onModify} data-testid="preview-modify-btn">
        修改
      </button>
      <button onClick={onClose} data-testid="preview-close-btn">
        关闭
      </button>
    </div>
  ),
}))

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}))

// Import mocked modules
import {
  parseTaskFromText,
  parsedTaskToWorkflowDefinition,
  validateParsedTask,
} from '@/lib/workflow/TaskParser'

describe('TaskCreationChat', () => {
  // Default mock implementations
  const mockParsedTask: ParsedTask = {
    intent: 'scheduled' as TaskIntent,
    workflowName: '测试工作流',
    description: '测试描述',
    nodes: [
      { id: 'node-1', type: 'agent', name: '开始节点' },
      { id: 'node-2', type: 'agent', name: '结束节点' },
    ],
    edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }],
    variables: {},
    confidence: 0.85,
    suggestions: ['建议1', '建议2'],
    rawText: '每天凌晨2点检查系统',
  }

  const mockWorkflow: WorkflowDefinition = {
    id: 'workflow-1',
    name: '测试工作流',
    description: '测试描述',
    version: '1.0.0',
    status: 'draft',
    nodes: [],
    edges: [],
    variables: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const mockOnCreateTask = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock implementations
    vi.mocked(parseTaskFromText).mockReturnValue(mockParsedTask)
    vi.mocked(parsedTaskToWorkflowDefinition).mockReturnValue(mockWorkflow)
    vi.mocked(validateParsedTask).mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    })
  })

  afterEach(() => {
    cleanup()
  })

  // ==================== 基本渲染测试 ====================
  describe('基本渲染', () => {
    it('应该正确渲染欢迎消息', () => {
      render(<TaskCreationChat />)

      // 检查欢迎消息
      expect(screen.getByText(/你好！我是任务创建助手/)).toBeInTheDocument()
      expect(screen.getByText(/请描述你想要创建的自动化任务/)).toBeInTheDocument()
    })

    it('应该渲染输入框和发送按钮', () => {
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      expect(input).toBeInTheDocument()
      expect(input).toHaveValue('')

      const sendButton = screen.getByLabelText('发送')
      expect(sendButton).toBeInTheDocument()
    })

    it('应该渲染快捷提示按钮', () => {
      render(<TaskCreationChat />)

      expect(screen.getByText('每天定时')).toBeInTheDocument()
      expect(screen.getByText('监控告警')).toBeInTheDocument()
      expect(screen.getByText('发送通知')).toBeInTheDocument()
    })

    it('应该渲染"查看示例"按钮', () => {
      render(<TaskCreationChat />)

      expect(screen.getByText('查看示例')).toBeInTheDocument()
    })

    it('应该应用自定义类名', () => {
      const { container } = render(<TaskCreationChat className="custom-class" />)

      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('应该支持初始提示值', () => {
      render(<TaskCreationChat initialPrompt="初始提示文本" />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      expect(input).toHaveValue('初始提示文本')
    })
  })

  // ==================== 用户交互测试 ====================
  describe('用户交互', () => {
    it('应该允许用户在输入框中输入文本', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '每天凌晨2点检查系统')

      expect(input).toHaveValue('每天凌晨2点检查系统')
    })

    it('点击快捷提示按钮应该更新输入值', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const dailyButton = screen.getByText('每天定时')
      await user.click(dailyButton)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      expect(input).toHaveValue('每天')
    })

    it('点击发送按钮应该提交输入', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '每天凌晨2点检查系统')

      const sendButton = screen.getByLabelText('发送')
      await user.click(sendButton)

      // 应该清空输入
      expect(input).toHaveValue('')
    })

    it('按 Enter 键应该提交输入', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '每天凌晨2点检查系统{enter}')

      expect(input).toHaveValue('')
    })

    it('空输入不应该触发提交', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const sendButton = screen.getByLabelText('发送')
      await user.click(sendButton)

      // 不应该调用 parseTaskFromText
      expect(parseTaskFromText).not.toHaveBeenCalled()
    })

    it('提交后应该添加用户消息到消息列表', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务描述{enter}')

      // 检查用户消息
      expect(screen.getByText('测试任务描述')).toBeInTheDocument()
    })
  })

  // ==================== 任务解析测试 ====================
  describe('任务解析', () => {
    it('提交后应该调用 parseTaskFromText', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '每天凌晨2点检查系统{enter}')

      expect(parseTaskFromText).toHaveBeenCalledWith('每天凌晨2点检查系统')
    })

    it('解析后应该显示助手回复', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '每天凌晨2点检查系统{enter}')

      // 等待解析完成
      await waitFor(() => {
        expect(screen.getByText(/我理解你想要创建一个/)).toBeInTheDocument()
      })
    })

    it('解析后应该显示意图标签', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '每天凌晨2点检查系统{enter}')

      await waitFor(() => {
        expect(screen.getByText('定时任务')).toBeInTheDocument()
      })
    })

    it('解析后应该显示置信度', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '每天凌晨2点检查系统{enter}')

      await waitFor(() => {
        expect(screen.getByText(/85% 置信度/)).toBeInTheDocument()
      })
    })

    it('解析后应该显示操作按钮', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '每天凌晨2点检查系统{enter}')

      await waitFor(() => {
        expect(screen.getByText('创建任务')).toBeInTheDocument()
        expect(screen.getByText('修改描述')).toBeInTheDocument()
        expect(screen.getByText('取消')).toBeInTheDocument()
      })
    })

    it('解析后应该显示预览面板', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '每天凌晨2点检查系统{enter}')

      await waitFor(() => {
        expect(screen.getByTestId('task-preview-panel')).toBeInTheDocument()
      })
    })

    it('有验证错误时应该显示错误信息', async () => {
      vi.mocked(validateParsedTask).mockReturnValue({
        isValid: false,
        errors: ['缺少触发条件', '节点配置不完整'],
        warnings: [],
      })

      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        expect(screen.getByText(/需要注意的问题/)).toBeInTheDocument()
      }, { timeout: 3000 })
      
      // Check for errors - they may be in separate elements
      const errorSection = screen.getByText(/需要注意的问题/).closest('div')
      expect(errorSection?.textContent).toContain('缺少触发条件')
      expect(errorSection?.textContent).toContain('节点配置不完整')
    })

    it('有建议时应该显示建议信息', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        expect(screen.getByText(/改进建议/)).toBeInTheDocument()
      }, { timeout: 3000 })
      
      // Check suggestions are rendered - they may be in separate elements
      const suggestionSection = screen.getByText(/改进建议/).closest('div')
      expect(suggestionSection?.textContent).toContain('建议1')
      expect(suggestionSection?.textContent).toContain('建议2')
    })
  })

  // ==================== 操作按钮测试 ====================
  describe('操作按钮', () => {
    it('点击"创建任务"应该调用 onCreateTask', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat onCreateTask={mockOnCreateTask} />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        expect(screen.getByText('创建任务')).toBeInTheDocument()
      })

      const createButton = screen.getByText('创建任务')
      await user.click(createButton)

      expect(parsedTaskToWorkflowDefinition).toHaveBeenCalledWith(mockParsedTask)
      expect(mockOnCreateTask).toHaveBeenCalledWith(mockWorkflow)
    })

    it('点击"创建任务"后应该显示成功消息', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat onCreateTask={mockOnCreateTask} />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        expect(screen.getByText('创建任务')).toBeInTheDocument()
      })

      const createButton = screen.getByText('创建任务')
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/已创建成功/)).toBeInTheDocument()
      })
    })

    it('点击"修改描述"应该填充输入框', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        expect(screen.getByText('修改描述')).toBeInTheDocument()
      })

      const modifyButton = screen.getByText('修改描述')
      await user.click(modifyButton)

      expect(input).toHaveValue(mockParsedTask.rawText)
    })

    it('点击"取消"应该调用 onCancel', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat onCancel={mockOnCancel} />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        expect(screen.getByText('取消')).toBeInTheDocument()
      })

      const cancelButton = screen.getByText('取消')
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('点击"取消"后应该隐藏预览面板', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat onCancel={mockOnCancel} />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        expect(screen.getByTestId('task-preview-panel')).toBeInTheDocument()
      })

      const cancelButton = screen.getByText('取消')
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByTestId('task-preview-panel')).not.toBeInTheDocument()
      })
    })
  })

  // ==================== 示例功能测试 ====================
  describe('示例功能', () => {
    it('点击"查看示例"应该显示示例列表', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const showExamplesButton = screen.getByText('查看示例')
      await user.click(showExamplesButton)

      expect(screen.getByText(/这里有一些示例任务描述/)).toBeInTheDocument()
    })

    it('显示示例后应该有"使用示例"按钮', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const showExamplesButton = screen.getByText('查看示例')
      await user.click(showExamplesButton)

      const useExampleButtons = screen.getAllByText(/使用示例/)
      expect(useExampleButtons.length).toBeGreaterThan(0)
    })
  })

  // ==================== 预览面板交互测试 ====================
  describe('预览面板交互', () => {
    it('预览面板的"创建"按钮应该触发任务创建', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat onCreateTask={mockOnCreateTask} />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        expect(screen.getByTestId('preview-create-btn')).toBeInTheDocument()
      })

      const previewCreateBtn = screen.getByTestId('preview-create-btn')
      await user.click(previewCreateBtn)

      expect(mockOnCreateTask).toHaveBeenCalled()
    })

    it('预览面板的"修改"按钮应该填充输入框', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        expect(screen.getByTestId('preview-modify-btn')).toBeInTheDocument()
      })

      const previewModifyBtn = screen.getByTestId('preview-modify-btn')
      await user.click(previewModifyBtn)

      expect(input).toHaveValue(mockParsedTask.rawText)
    })

    it('预览面板的"关闭"按钮应该隐藏预览', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        expect(screen.getByTestId('preview-close-btn')).toBeInTheDocument()
      })

      const previewCloseBtn = screen.getByTestId('preview-close-btn')
      await user.click(previewCloseBtn)

      await waitFor(() => {
        expect(screen.queryByTestId('task-preview-panel')).not.toBeInTheDocument()
      })
    })
  })

  // ==================== 错误处理测试 ====================
  describe('错误处理', () => {
    it('解析失败时应该显示错误消息', async () => {
      vi.mocked(parseTaskFromText).mockImplementation(() => {
        throw new Error('解析失败')
      })

      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '无效输入{enter}')

      await waitFor(() => {
        expect(screen.getByText(/抱歉，我在解析您的描述时遇到了问题/)).toBeInTheDocument()
      })
    })

    it('解析失败时应该显示"重试"按钮', async () => {
      vi.mocked(parseTaskFromText).mockImplementation(() => {
        throw new Error('解析失败')
      })

      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '无效输入{enter}')

      await waitFor(() => {
        expect(screen.getByText('重试')).toBeInTheDocument()
      })
    })

    it('点击"重试"应该清空输入', async () => {
      vi.mocked(parseTaskFromText).mockImplementation(() => {
        throw new Error('解析失败')
      })

      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '无效输入{enter}')

      await waitFor(() => {
        expect(screen.getByText('重试')).toBeInTheDocument()
      })

      // 重置 mock 以允许后续成功
      vi.mocked(parseTaskFromText).mockReturnValue(mockParsedTask)

      const retryButton = screen.getByText('重试')
      await user.click(retryButton)

      expect(input).toHaveValue('')
    })
  })

  // ==================== 处理状态测试 ====================
  describe('处理状态', () => {
    it('处理中应该禁用发送按钮', async () => {
      // Use a Promise-based mock to properly simulate async behavior
      vi.mocked(parseTaskFromText).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockParsedTask), 100)
        }) as any
      })

      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      
      // Start typing but don't submit yet
      await user.type(input, '测试任务')
      
      // Get the send button and click it
      const sendButton = screen.getByLabelText('发送')
      await user.click(sendButton)

      // Should be disabled immediately after click
      expect(sendButton).toBeDisabled()
    })
  })

  // ==================== 消息列表测试 ====================
  describe('消息列表', () => {
    it('应该显示消息时间戳', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      // 时间戳格式会根据 locale 变化，这里只检查是否渲染
      await waitFor(() => {
        const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/)
        expect(timestamps.length).toBeGreaterThan(0)
      })
    })

    it('应该显示多条消息', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')

      // 提交第一条消息
      await user.type(input, '第一个任务{enter}')
      await waitFor(() => {
        expect(screen.getByText('第一个任务')).toBeInTheDocument()
      })

      // 提交第二条消息
      await user.type(input, '第二个任务{enter}')
      await waitFor(() => {
        expect(screen.getByText('第二个任务')).toBeInTheDocument()
      })

      // 两条消息都应该存在
      expect(screen.getByText('第一个任务')).toBeInTheDocument()
      expect(screen.getByText('第二个任务')).toBeInTheDocument()
    })

    it('用户消息应该在右侧', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        // User messages have the gradient background
        const userMessage = screen.getByText('测试任务')
        // Navigate up to find the container with justify-end
        const container = userMessage.closest('div[class*="flex"]')
        expect(container).toHaveClass('justify-end')
      })
    })

    it('助手消息应该在左侧', async () => {
      // Welcome message is an assistant message and should be on the left
      render(<TaskCreationChat />)

      const welcomeMessage = screen.getByText(/你好！我是任务创建助手/)
      // Navigate up to find the container with justify-start
      const container = welcomeMessage.closest('div[class*="flex"]')
      expect(container).toHaveClass('justify-start')
    })
  })

  // ==================== 边界情况测试 ====================
  describe('边界情况', () => {
    it('空字符串输入不应该触发解析', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '   {enter}') // 只有空格

      expect(parseTaskFromText).not.toHaveBeenCalled()
    })

    it('应该处理极长的输入', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const longText = 'a'.repeat(1000)
      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, longText + '{enter}')

      expect(parseTaskFromText).toHaveBeenCalledWith(longText)
    })

    it('应该处理特殊字符输入', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      // Use a simpler set of special characters that are more reliably typed
      const specialChars = '测试@#$任务'
      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, specialChars + '{enter}')

      expect(parseTaskFromText).toHaveBeenCalled()
    })

    it('应该处理 Unicode 字符', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const unicodeText = '你好世界 🌍 مرحبا мир'
      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, unicodeText + '{enter}')

      expect(parseTaskFromText).toHaveBeenCalledWith(unicodeText)
    })

    it('没有 onCreateTask 回调时创建任务不应报错', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        expect(screen.getByText('创建任务')).toBeInTheDocument()
      })

      const createButton = screen.getByText('创建任务')
      // 不应该抛出错误
      await expect(user.click(createButton)).resolves.not.toThrow()
    })

    it('没有 onCancel 回调时取消不应报错', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        expect(screen.getByText('取消')).toBeInTheDocument()
      })

      const cancelButton = screen.getByText('取消')
      // 不应该抛出错误
      await expect(user.click(cancelButton)).resolves.not.toThrow()
    })

    it('置信度为 0 时应该正确显示', async () => {
      vi.mocked(parseTaskFromText).mockReturnValue({
        ...mockParsedTask,
        confidence: 0,
      })

      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        expect(screen.getByText(/0% 置信度/)).toBeInTheDocument()
      })
    })

    it('置信度为 1 时应该正确显示', async () => {
      vi.mocked(parseTaskFromText).mockReturnValue({
        ...mockParsedTask,
        confidence: 1,
      })

      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        expect(screen.getByText(/100% 置信度/)).toBeInTheDocument()
      })
    })

    it('节点数为 0 时应该正确显示', async () => {
      vi.mocked(parseTaskFromText).mockReturnValue({
        ...mockParsedTask,
        nodes: [],
      })

      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        expect(screen.getByText(/识别节点数.*0 个/)).toBeInTheDocument()
      })
    })

    it('建议数组为空时不应该显示建议', async () => {
      vi.mocked(parseTaskFromText).mockReturnValue({
        ...mockParsedTask,
        suggestions: [],
      })

      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      await waitFor(() => {
        expect(screen.queryByText(/改进建议/)).not.toBeInTheDocument()
      })
    })
  })

  // ==================== 不同意图类型测试 ====================
  describe('不同意图类型', () => {
    const intents: TaskIntent[] = [
      'automation',
      'notification',
      'data_processing',
      'monitoring',
      'integration',
      'scheduled',
      'webhook',
      'human_approval',
      'unknown',
    ]

    intents.forEach((intent) => {
      it(`应该正确显示意图类型: ${intent}`, async () => {
        vi.mocked(parseTaskFromText).mockReturnValue({
          ...mockParsedTask,
          intent,
        })

        const user = userEvent.setup()
        render(<TaskCreationChat />)

        const input = screen.getByPlaceholderText('描述你想要创建的任务...')
        await user.type(input, '测试任务{enter}')

        await waitFor(() => {
          // 检查意图标签是否显示
          const intentLabels: Record<TaskIntent, string> = {
            automation: '自动化任务',
            notification: '通知任务',
            data_processing: '数据处理',
            monitoring: '监控任务',
            integration: '集成任务',
            scheduled: '定时任务',
            webhook: 'Webhook',
            human_approval: '人工审批',
            unknown: '未知类型',
          }
          expect(screen.getByText(intentLabels[intent])).toBeInTheDocument()
        })
      })
    })
  })

  // ==================== 快捷键测试 ====================
  describe('快捷键', () => {
    it('Enter 键应该提交表单', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{enter}')

      expect(parseTaskFromText).toHaveBeenCalledWith('测试任务')
    })

    it('Shift+Enter 不应该提交表单', async () => {
      const user = userEvent.setup()
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      await user.type(input, '测试任务{Shift>}{enter}')

      // Shift+Enter 应该不触发提交（输入值保留）
      expect(parseTaskFromText).not.toHaveBeenCalled()
    })
  })

  // ==================== 可访问性测试 ====================
  describe('可访问性', () => {
    it('发送按钮应该有 aria-label', () => {
      render(<TaskCreationChat />)

      const sendButton = screen.getByLabelText('发送')
      expect(sendButton).toBeInTheDocument()
    })

    it('输入框应该有 placeholder', () => {
      render(<TaskCreationChat />)

      const input = screen.getByPlaceholderText('描述你想要创建的任务...')
      expect(input).toBeInTheDocument()
    })
  })
})
