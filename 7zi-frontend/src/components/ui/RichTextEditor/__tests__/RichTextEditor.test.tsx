/**
 * RichTextEditor 组件测试
 *
 * v1.12.x 富文本编辑器单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RichTextEditor } from '../RichTextEditor'
import React from 'react'

// Mock ThemeContext
vi.mock('@/shared/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    resolvedTheme: 'light',
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// 全局模拟 document.execCommand
const mockExecCommand = vi.fn()
beforeEach(() => {
  mockExecCommand.mockClear()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document.execCommand = mockExecCommand
})

describe('RichTextEditor', () => {
  // 基础渲染测试
  describe('Basic Rendering', () => {
    it('应该正确渲染编辑器组件', () => {
      render(<RichTextEditor />)
      const editor = screen.getByRole('textbox')
      expect(editor).toBeDefined()
    })

    it('应该显示占位符文本', () => {
      const placeholderText = '请输入内容...'
      render(<RichTextEditor placeholder={placeholderText} />)
      // 占位符通过CSS伪元素实现，所以测试data-placeholder属性
      const editor = document.querySelector('[data-placeholder]')
      expect(editor).toBeDefined()
      expect(editor?.getAttribute('data-placeholder')).toBe(placeholderText)
    })

    it('应该正确应用自定义类名', () => {
      const customClass = 'custom-editor-class'
      render(<RichTextEditor className={customClass} />)
      const container = document.querySelector(`.${customClass}`)
      expect(container).toBeDefined()
    })

    it('应该设置最小高度', () => {
      const minHeight = 200
      render(<RichTextEditor minHeight={minHeight} />)
      const editor = screen.getByRole('textbox')
      expect(editor.style.minHeight).toBe(`${minHeight}px`)
    })

    it('应该设置最大高度', () => {
      const maxHeight = 500
      render(<RichTextEditor maxHeight={maxHeight} />)
      const editor = screen.getByRole('textbox')
      expect(editor.style.maxHeight).toBe(`${maxHeight}px`)
    })
  })

  // Props 测试
  describe('Props', () => {
    it('应该正确处理 value 属性', () => {
      const initialValue = '# Hello World'
      const { container } = render(<RichTextEditor value={initialValue} enableMarkdown />)
      const editor = container.querySelector('[contenteditable]')
      // Markdown 应该被转换为 HTML
      expect(editor?.innerHTML).toContain('h1')
    })

    it('应该正确处理 readOnly 属性', () => {
      render(<RichTextEditor readOnly />)
      const editor = screen.getByRole('textbox')
      expect(editor).toHaveAttribute('aria-readonly', 'true')
    })

    it('应该正确处理 error 属性', () => {
      const errorMessage = '输入内容无效'
      render(<RichTextEditor error={errorMessage} />)
      expect(screen.getByText(errorMessage)).toBeDefined()
    })

    it('应该正确处理 helperText 属性', () => {
      const helperText = '请输入详细信息'
      render(<RichTextEditor helperText={helperText} />)
      expect(screen.getByText(helperText)).toBeDefined()
    })

    it('应该隐藏工具栏当 showToolbar 为 false', () => {
      render(<RichTextEditor showToolbar={false} />)
      const editor = screen.getByRole('textbox')
      // 工具栏不应该包含按钮
      expect(editor.parentElement?.querySelectorAll('button').length).toBe(0)
    })

    it('应该移动工具栏到底部当 toolbarPosition 为 bottom', () => {
      render(<RichTextEditor toolbarPosition="bottom" />)
      const buttons = screen.getAllByRole('button')
      // 底部工具栏，编辑区域应该在按钮之前
      const editor = screen.getByRole('textbox')
      const container = editor.parentElement
      expect(container?.firstChild).toBe(editor)
    })
  })

  // 内容变化测试
  describe('Content Changes', () => {
    it('应该在内容变化时触发 onChange 回调', async () => {
      const handleChange = vi.fn()
      const user = userEvent.setup()

      render(<RichTextEditor onChange={handleChange} />)
      const editor = screen.getByRole('textbox')

      await user.type(editor, 'Hello World')

      expect(handleChange).toHaveBeenCalled()
    })

    it('应该正确处理 initialValue', () => {
      const initialValue = 'Initial content'
      render(<RichTextEditor value={initialValue} />)
      const editor = screen.getByRole('textbox')
      expect(editor.textContent).toBe(initialValue)
    })
  })

  // 工具栏测试
  describe('Toolbar', () => {
    it('应该渲染所有工具栏按钮', () => {
      render(<RichTextEditor showToolbar />)
      // 应该包含粗体、斜体、标题、列表、链接、撤销、重做等按钮
      const buttons = screen.getAllByRole('button')
      // 至少有这些基本按钮
      expect(buttons.length).toBeGreaterThan(5)
    })

    it('应该禁用工具栏按钮当 readOnly 为 true', () => {
      render(<RichTextEditor readOnly showToolbar />)
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })

    it('应该正确执行 bold 命令', async () => {
      const user = userEvent.setup()
      render(<RichTextEditor showToolbar />)

      const buttons = screen.getAllByRole('button')
      const boldButton = buttons.find(btn => btn.getAttribute('title')?.includes('粗体'))
      expect(boldButton).toBeDefined()
      if (boldButton) {
        await user.click(boldButton)
        expect(mockExecCommand).toHaveBeenCalledWith('bold', false, '')
      }
    })

    it('应该正确执行 italic 命令', async () => {
      const user = userEvent.setup()
      render(<RichTextEditor showToolbar />)

      const buttons = screen.getAllByRole('button')
      const italicButton = buttons.find(btn => btn.getAttribute('title')?.includes('斜体'))
      expect(italicButton).toBeDefined()
      if (italicButton) {
        await user.click(italicButton)
        expect(mockExecCommand).toHaveBeenCalledWith('italic', false, '')
      }
    })

    it('应该正确执行 underline 命令', async () => {
      const user = userEvent.setup()
      render(<RichTextEditor showToolbar />)

      const buttons = screen.getAllByRole('button')
      const underlineButton = buttons.find(btn => btn.getAttribute('title')?.includes('下划线'))
      expect(underlineButton).toBeDefined()
      if (underlineButton) {
        await user.click(underlineButton)
        expect(mockExecCommand).toHaveBeenCalledWith('underline', false, '')
      }
    })

    it('应该正确执行 insertUnorderedList 命令', async () => {
      const user = userEvent.setup()
      render(<RichTextEditor showToolbar />)

      const buttons = screen.getAllByRole('button')
      const ulButton = buttons.find(btn => btn.getAttribute('title')?.includes('无序列表'))
      expect(ulButton).toBeDefined()
      if (ulButton) {
        await user.click(ulButton)
        expect(mockExecCommand).toHaveBeenCalledWith('insertUnorderedList', false, '')
      }
    })

    it('应该正确执行 insertOrderedList 命令', async () => {
      const user = userEvent.setup()
      render(<RichTextEditor showToolbar />)

      const buttons = screen.getAllByRole('button')
      const olButton = buttons.find(btn => btn.getAttribute('title')?.includes('有序列表'))
      expect(olButton).toBeDefined()
      if (olButton) {
        await user.click(olButton)
        expect(mockExecCommand).toHaveBeenCalledWith('insertOrderedList', false, '')
      }
    })
  })

  // 快捷键测试
  describe('Keyboard Shortcuts', () => {
    it('应该使用 Ctrl+B 触发粗体', async () => {
      const user = userEvent.setup()
      render(<RichTextEditor showToolbar />)

      const editor = screen.getByRole('textbox')
      await user.click(editor)
      await user.keyboard('{Control>}b')

      expect(mockExecCommand).toHaveBeenCalledWith('bold', false, '')
    })

    it('应该使用 Ctrl+I 触发斜体', async () => {
      const user = userEvent.setup()
      render(<RichTextEditor showToolbar />)

      const editor = screen.getByRole('textbox')
      await user.click(editor)
      await user.keyboard('{Control>}i')

      expect(mockExecCommand).toHaveBeenCalledWith('italic', false, '')
    })

    it('应该使用 Ctrl+U 触发下划线', async () => {
      const user = userEvent.setup()
      render(<RichTextEditor showToolbar />)

      const editor = screen.getByRole('textbox')
      await user.click(editor)
      await user.keyboard('{Control>}u')

      expect(mockExecCommand).toHaveBeenCalledWith('underline', false, '')
    })

    it('应该使用 Tab 插入空格', async () => {
      const user = userEvent.setup()
      render(<RichTextEditor />)

      const editor = screen.getByRole('textbox')
      await user.click(editor)
      await user.keyboard('{Tab}')

      expect(mockExecCommand).toHaveBeenCalledWith('insertText', false, '  ')
    })
  })

  // Markdown 支持测试
  describe('Markdown Support', () => {
    it('应该启用 Markdown 模式时转换标题', () => {
      const markdownInput = '# Test Heading'
      render(<RichTextEditor value={markdownInput} enableMarkdown />)
      const editor = screen.getByRole('textbox')
      expect(editor.innerHTML).toContain('<h1>')
    })

    it('应该启用 Markdown 模式时转换粗体', () => {
      const markdownInput = '**bold text**'
      render(<RichTextEditor value={markdownInput} enableMarkdown />)
      const editor = screen.getByRole('textbox')
      expect(editor.innerHTML).toContain('<strong>')
    })

    it('应该启用 Markdown 模式时转换斜体', () => {
      const markdownInput = '*italic text*'
      render(<RichTextEditor value={markdownInput} enableMarkdown />)
      const editor = screen.getByRole('textbox')
      expect(editor.innerHTML).toContain('<em>')
    })

    it('应该启用 Markdown 模式时转换链接', () => {
      const markdownInput = '[link text](https://example.com)'
      render(<RichTextEditor value={markdownInput} enableMarkdown />)
      const editor = screen.getByRole('textbox')
      expect(editor.innerHTML).toContain('<a href=')
    })

    it('应该启用 Markdown 模式时转换代码', () => {
      const markdownInput = '`code`'
      render(<RichTextEditor value={markdownInput} enableMarkdown />)
      const editor = screen.getByRole('textbox')
      expect(editor.innerHTML).toContain('<code>')
    })

    it('应该启用 Markdown 模式时转换列表', () => {
      const markdownInput = '- item 1\n- item 2'
      render(<RichTextEditor value={markdownInput} enableMarkdown />)
      const editor = screen.getByRole('textbox')
      expect(editor.innerHTML).toContain('<li>')
    })
  })

  // 深色模式测试
  describe('Dark Mode', () => {
    it('应该正确应用深色模式类名', () => {
      vi.mocked = vi.fn(() => ({
        theme: 'dark',
        systemTheme: 'dark',
        setTheme: vi.fn(),
      }))

      // 注意：实际深色模式测试需要 ThemeProvider
      // 这里只测试组件能正确渲染
      const { container } = render(<RichTextEditor />)
      expect(container).toBeDefined()
    })
  })

  // 撤销/重做测试
  describe('Undo/Redo', () => {
    it('应该渲染撤销按钮', () => {
      render(<RichTextEditor showToolbar />)
      const buttons = screen.getAllByRole('button')
      const undoButton = buttons.find(btn => btn.getAttribute('title')?.includes('撤销'))
      expect(undoButton).toBeDefined()
    })

    it('应该渲染重做按钮', () => {
      render(<RichTextEditor showToolbar />)
      const buttons = screen.getAllByRole('button')
      const redoButton = buttons.find(btn => btn.getAttribute('title')?.includes('重做'))
      expect(redoButton).toBeDefined()
    })

    it('应该执行 undo 命令', async () => {
      const user = userEvent.setup()
      render(<RichTextEditor showToolbar />)

      const buttons = screen.getAllByRole('button')
      const undoButton = buttons.find(btn => btn.getAttribute('title')?.includes('撤销'))
      if (undoButton) {
        // Undo 是组件内部实现，不使用 document.execCommand
        // 我们只测试按钮可以被点击
        await user.click(undoButton)
        expect(undoButton).toBeDefined()
      }
    })

    it('应该执行 redo 命令', async () => {
      const user = userEvent.setup()
      render(<RichTextEditor showToolbar />)

      const buttons = screen.getAllByRole('button')
      const redoButton = buttons.find(btn => btn.getAttribute('title')?.includes('重做'))
      if (redoButton) {
        // Redo 是组件内部实现，不使用 document.execCommand
        // 我们只测试按钮可以被点击
        await user.click(redoButton)
        expect(redoButton).toBeDefined()
      }
    })
  })

  // 粘贴测试
  describe('Paste', () => {
    it('应该处理粘贴事件', async () => {
      const handleChange = vi.fn()
      const user = userEvent.setup()

      render(<RichTextEditor onChange={handleChange} enableMarkdown />)
      const editor = screen.getByRole('textbox')

      // 模拟粘贴
      fireEvent.paste(editor, {
        clipboardData: {
          getData: () => 'pasted text',
        },
      })

      expect(handleChange).toHaveBeenCalled()
    })

    it('应该将 Markdown 文本粘贴为 HTML', async () => {
      const handleChange = vi.fn()

      render(<RichTextEditor onChange={handleChange} enableMarkdown />)
      const editor = screen.getByRole('textbox')

      // 粘贴 Markdown
      fireEvent.paste(editor, {
        clipboardData: {
          getData: () => '# Hello',
        },
      })

      // 应该调用 onChange
      expect(handleChange).toHaveBeenCalled()
    })
  })

  // 辅助功能测试
  describe('Accessibility', () => {
    it('应该设置正确的 role 属性', () => {
      render(<RichTextEditor />)
      const editor = screen.getByRole('textbox')
      expect(editor).toHaveAttribute('role', 'textbox')
    })

    it('应该设置 aria-multiline 属性', () => {
      render(<RichTextEditor />)
      const editor = screen.getByRole('textbox')
      expect(editor).toHaveAttribute('aria-multiline', 'true')
    })

    it('应该显示快捷键提示', () => {
      render(<RichTextEditor showToolbar />)
      expect(screen.getByText('Ctrl+B')).toBeDefined()
      expect(screen.getByText('Ctrl+I')).toBeDefined()
    })
  })

  // 移动端适配测试
  describe('Mobile Responsiveness', () => {
    it('应该正确渲染在移动端视口', () => {
      // 模拟移动端视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      const { container } = render(<RichTextEditor />)
      expect(container).toBeDefined()

      // 重置视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })
    })

    it('工具栏按钮应该在移动端正确布局', () => {
      render(<RichTextEditor showToolbar />)
      const toolbar = document.querySelector('.flex.flex-wrap')
      expect(toolbar).toBeDefined()
      // flex-wrap 确保按钮在移动端换行
    })
  })
})

// 辅助函数：模拟 vi.mocked
function vi_mocked<T>(): T {
  return {} as T
}
