/**
 * Input Component Tests
 *
 * 测试 Input 组件的各种功能和状态
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Input, Textarea } from './Input'

describe('Input Component', () => {
  describe('基本渲染', () => {
    it('应该正确渲染输入框', () => {
      render(<Input data-testid="test-input" />)
      const input = screen.getByTestId('test-input')
      expect(input).toBeInTheDocument()
    })

    it('应该支持自定义 id', () => {
      render(<Input id="custom-id" />)
      const input = document.getElementById('custom-id')
      expect(input).toBeInTheDocument()
    })

    it('应该渲染带标签的输入框', () => {
      render(<Input label="用户名" id="username" />)
      expect(screen.getByText('用户名')).toBeInTheDocument()
    })

    it('应该渲染禁用状态的输入框', () => {
      render(<Input disabled />)
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })
  })

  describe('密码输入框', () => {
    it('应该渲染密码输入框', () => {
      render(<Input type="password" data-testid="password-input" />)
      const input = screen.getByTestId('password-input')
      expect(input).toHaveAttribute('type', 'password')
    })

    it('密码可见性切换应该正常工作', async () => {
      render(<Input type="password" data-testid="password-input" />)
      const input = screen.getByTestId('password-input')

      // 初始状态应该是密码类型
      expect(input).toHaveAttribute('type', 'password')

      // 点击切换按钮（查找可见性图标按钮）
      const toggleButton = screen.getByRole('button', { hidden: true })
      fireEvent.click(toggleButton)

      // 切换后应该是文本类型
      expect(input).toHaveAttribute('type', 'text')
    })

    it('密码切换按钮应该在密码输入时显示', () => {
      render(<Input type="password" />)
      const toggleButton = screen.getByRole('button', { hidden: true })
      expect(toggleButton).toBeInTheDocument()
    })
  })

  describe('验证状态', () => {
    it('应该显示错误状态', () => {
      render(<Input error="这是一个错误" data-testid="error-input" />)
      expect(screen.getByText('这是一个错误')).toBeInTheDocument()
      expect(screen.getByTestId('error-input')).toHaveAttribute('aria-invalid', 'true')
    })

    it('应该显示成功状态', () => {
      render(<Input success="验证成功" data-testid="success-input" />)
      expect(screen.getByText('验证成功')).toBeInTheDocument()
    })

    it('应该显示警告状态', () => {
      render(<Input warning="这是一个警告" data-testid="warning-input" />)
      expect(screen.getByText('这是一个警告')).toBeInTheDocument()
    })

    it('应该显示帮助文本', () => {
      render(<Input helperText="请输入用户名" data-testid="helper-input" />)
      expect(screen.getByText('请输入用户名')).toBeInTheDocument()
    })

    it('错误状态优先级最高', () => {
      render(
        <Input
          error="错误信息"
          success="成功信息"
          warning="警告信息"
          helperText="帮助文本"
        />
      )
      expect(screen.getByText('错误信息')).toBeInTheDocument()
    })
  })

  describe('用户交互', () => {
    it('应该响应 onChange 事件', () => {
      const handleChange = vi.fn()
      render(<Input onChange={handleChange} data-testid="input" />)
      const input = screen.getByTestId('input')

      fireEvent.change(input, { target: { value: 'test' } })
      expect(handleChange).toHaveBeenCalled()
    })

    it('应该支持受控值', () => {
      render(<Input value="controlled" data-testid="controlled-input" readOnly />)
      const input = screen.getByTestId('controlled-input')
      expect(input).toHaveValue('controlled')
    })

    it('聚焦状态应该更新样式', () => {
      render(<Input label="聚焦测试" data-testid="focus-input" />)
      const input = screen.getByTestId('focus-input')
      const label = screen.getByText('聚焦测试')

      // 初始聚焦状态为 false，标签颜色不是 blue
      expect(label).toHaveClass('text-gray-700')

      fireEvent.focus(input)
      expect(label).toHaveClass('text-blue-600')

      fireEvent.blur(input)
      expect(label).toHaveClass('text-gray-700')
    })
  })

  describe('前缀和后缀', () => {
    it('应该渲染前缀', () => {
      render(<Input prefix={<span data-testid="prefix">🔍</span>} data-testid="prefix-input" />)
      expect(screen.getByTestId('prefix')).toBeInTheDocument()
    })

    it('应该渲染后缀', () => {
      render(<Input suffix={<span data-testid="suffix">💡</span>} data-testid="suffix-input" />)
      expect(screen.getByTestId('suffix')).toBeInTheDocument()
    })
  })

  describe('尺寸变体', () => {
    it('应该渲染小尺寸输入框', () => {
      render(<Input size="sm" data-testid="sm-input" />)
      const input = screen.getByTestId('sm-input')
      expect(input).toHaveClass('px-3', 'py-1.5', 'text-sm')
    })

    it('应该渲染中等尺寸输入框', () => {
      render(<Input size="md" data-testid="md-input" />)
      const input = screen.getByTestId('md-input')
      expect(input).toHaveClass('px-4', 'py-2', 'text-base')
    })

    it('应该渲染大尺寸输入框', () => {
      render(<Input size="lg" data-testid="lg-input" />)
      const input = screen.getByTestId('lg-input')
      expect(input).toHaveClass('px-5', 'py-3', 'text-lg')
    })
  })
})

describe('Textarea Component', () => {
  describe('基本渲染', () => {
    it('应该正确渲染文本域', () => {
      render(<Textarea data-testid="textarea" />)
      expect(screen.getByTestId('textarea')).toBeInTheDocument()
    })

    it('应该渲染带标签的文本域', () => {
      render(<Textarea label="评论" id="comment" />)
      expect(screen.getByText('评论')).toBeInTheDocument()
    })
  })

  describe('字符计数', () => {
    it('应该显示字符计数', () => {
      render(<Textarea showCount maxLength={100} data-testid="count-textarea" />)
      const count = screen.getByText(/0 \/ 100/)
      expect(count).toBeInTheDocument()
    })

    it('应该更新字符计数', () => {
      render(<Textarea showCount maxLength={100} defaultValue="test" data-testid="count-textarea" />)
      const count = screen.getByText(/4 \/ 100/)
      expect(count).toBeInTheDocument()
    })

    it('超过限制应该显示错误', () => {
      render(<Textarea showCount maxLength={5} defaultValue="这是一个很长的文本" data-testid="count-textarea" />)
      const count = screen.getByText(/9 \/ 5/)
      expect(count).toHaveClass('text-red-600')
    })
  })

  describe('验证', () => {
    it('应该显示错误状态', () => {
      render(<Textarea error="评论不能为空" data-testid="error-textarea" />)
      expect(screen.getByText('评论不能为空')).toBeInTheDocument()
    })

    it('错误状态应该设置 aria-invalid', () => {
      render(<Textarea error="错误" data-testid="error-textarea" />)
      expect(screen.getByTestId('error-textarea')).toHaveAttribute('aria-invalid', 'true')
    })
  })
})
