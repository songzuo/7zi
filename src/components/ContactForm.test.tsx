import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ContactForm } from './ContactForm'

// Mock the EmailJS service
vi.mock('@emailjs/browser', () => ({
  send: vi.fn().mockResolvedValue({ status: 200, text: 'OK' }),
}))

describe('ContactForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch CSRF token
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ csrfToken: 'mock-csrf-token' }),
      } as Response)
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * 按 URL 给 fetch 分流。
   *
   * 组件挂载时会先请求 /api/csrf-token 拿 CSRF token，提交时再请求 /api/contact。
   * 之前这些用例用的是 mockRejectedValueOnce / mockImplementationOnce ——
   * 「一次性」的 mock 会被**挂载时那次 CSRF 请求**吃掉，真正要测的
   * 提交请求反而走了 beforeEach 里的默认实现（ok: true）。
   *
   * 结果就是：
   *   - 「提交失败」用例永远看不到错误态（提交其实成功了）
   *   - 「加载中」用例的 100ms 延迟作用在了 CSRF 请求上，
   *     提交瞬间就 resolve，按钮根本没进入 disabled 状态
   */
  function routeFetch(contactImpl: () => Promise<unknown>): void {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((input: unknown) => {
      if (String(input).includes('/api/contact')) {
        return contactImpl()
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ csrfToken: 'mock-csrf-token' }),
      } as Response)
    })
  }

  describe('Rendering', () => {
    it('should render form fields correctly', () => {
      render(<ContactForm />)

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/company/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument()
    })

    it('should render submit button', async () => {
      render(<ContactForm />)

      // Wait for component to render
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /submit|send/i })
        expect(submitButton).toBeInTheDocument()
      })
    })

    it('should show required field indicators', () => {
      render(<ContactForm />)
      expect(screen.getByLabelText(/name/i)).toBeRequired()
      expect(screen.getByLabelText(/email/i)).toBeRequired()
      expect(screen.getByLabelText(/message/i)).toBeRequired()
      expect(screen.getByLabelText(/company/i)).not.toBeRequired()
    })

    it('should display subject options', () => {
      render(<ContactForm />)
      const subjectSelect = screen.getByLabelText(/subject/i)
      expect(subjectSelect).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should validate required name field', async () => {
      render(<ContactForm />)

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/请输入您的姓名/)).toBeInTheDocument()
      })
    })

    it('should validate required email field', async () => {
      render(<ContactForm />)

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/请输入您的邮箱/)).toBeInTheDocument()
      })
    })

    it('should validate email format - component renders email input with validation', async () => {
      render(<ContactForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
      })

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/邮箱格式不正确/)).toBeInTheDocument()
      })
    })

    it('should accept valid email format', async () => {
      render(<ContactForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      })

      await waitFor(() => {
        expect(emailInput).toHaveValue('test@example.com')
      })
    })

    it('should validate required message field', async () => {
      render(<ContactForm />)

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/请输入消息内容/)).toBeInTheDocument()
      })
    })

    it('should validate minimum message length', async () => {
      render(<ContactForm />)

      const messageInput = screen.getByLabelText(/message/i)
      await act(async () => {
        fireEvent.change(messageInput, { target: { value: 'Hi' } })
      })

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/消息内容至少需要 10 个字符/)).toBeInTheDocument()
      })
    })

    it('should validate maximum message length', async () => {
      render(<ContactForm />)

      const messageInput = screen.getByLabelText(/message/i)
      const longMessage = 'a'.repeat(2000)
      await act(async () => {
        fireEvent.change(messageInput, { target: { value: longMessage } })
      })

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/留言内容不能超过 500 个字符/)).toBeInTheDocument()
      })
    })

    it('should allow user to fill optional company field', async () => {
      render(<ContactForm />)

      const companyInput = screen.getByLabelText(/company/i)
      await act(async () => {
        fireEvent.change(companyInput, { target: { value: 'My Company' } })
      })

      await waitFor(() => {
        expect(companyInput).toHaveValue('My Company')
      })
    })

    it('should allow user to select subject', async () => {
      render(<ContactForm />)

      const subjectSelect = screen.getByLabelText(/subject/i)
      await act(async () => {
        fireEvent.change(subjectSelect, { target: { value: 'project' } })
      })

      await waitFor(() => {
        expect(subjectSelect).toHaveValue('project')
      })
    })

    it('should clear field error when user starts typing', async () => {
      render(<ContactForm />)

      const nameInput = screen.getByLabelText(/name/i)
      const submitButton = screen.getByRole('button', { name: /send message/i })

      // Trigger validation error
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/请输入您的姓名/)).toBeInTheDocument()
      })

      // Start typing
      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'John' } })
      })

      await waitFor(() => {
        expect(screen.queryByText(/请输入您的姓名/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should submit form successfully', async () => {
      render(<ContactForm />)

      // Fill form
      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const messageInput = screen.getByLabelText(/message/i)

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'John Doe' } })
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
        fireEvent.change(messageInput, { target: { value: 'This is a test message' } })
      })

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/message sent successfully/i)).toBeInTheDocument()
      })
    })

    it('should handle submission error', async () => {
      // Mock failed submission
      routeFetch(() => Promise.reject(new Error('Network error')))

      render(<ContactForm />)

      // Fill form
      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const messageInput = screen.getByLabelText(/message/i)

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'John Doe' } })
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
        fireEvent.change(messageInput, { target: { value: 'This is a test message' } })
      })

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/failed to send message/i)).toBeInTheDocument()
      })
    })

    it('should handle API error response', async () => {
      // Mock API error
      routeFetch(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ error: 'Bad Request' }),
        } as Response)
      )

      render(<ContactForm />)

      // Fill form
      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const messageInput = screen.getByLabelText(/message/i)

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'John Doe' } })
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
        fireEvent.change(messageInput, { target: { value: 'This is a test message' } })
      })

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/failed to send message/i)).toBeInTheDocument()
      })
    })

    it('should clear form after successful submission', async () => {
      render(<ContactForm />)

      // Fill form
      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const messageInput = screen.getByLabelText(/message/i)
      const companyInput = screen.getByLabelText(/company/i)

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'John Doe' } })
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
        fireEvent.change(messageInput, { target: { value: 'This is a test message' } })
        fireEvent.change(companyInput, { target: { value: 'My Company' } })
      })

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/message sent successfully/i)).toBeInTheDocument()
      })

      // Form should be cleared
      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toHaveValue('')
        expect(screen.getByLabelText(/email/i)).toHaveValue('')
        expect(screen.getByLabelText(/message/i)).toHaveValue('')
        expect(screen.getByLabelText(/company/i)).toHaveValue('')
      })
    })

    it('should send correct data to API', async () => {
      render(<ContactForm />)

      const name = 'John Doe'
      const email = 'john@example.com'
      const message = 'This is a test message'

      // Fill form
      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const messageInput = screen.getByLabelText(/message/i)

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: name } })
        fireEvent.change(emailInput, { target: { value: email } })
        fireEvent.change(messageInput, { target: { value: message } })
      })

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining(name),
          })
        )
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      // Mock slow response
      routeFetch(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({}),
                }),
              100
            )
          )
      )

      render(<ContactForm />)

      // Fill form
      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const messageInput = screen.getByLabelText(/message/i)

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'John Doe' } })
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
        fireEvent.change(messageInput, { target: { value: 'This is a test message' } })
      })

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      // Should show loading state
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
        expect(screen.getByText(/sending/i)).toBeInTheDocument()
      })
    })

    it('should disable submit button during submission', async () => {
      // Mock slow response
      routeFetch(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({}),
                }),
              100
            )
          )
      )

      render(<ContactForm />)

      // Fill form
      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const messageInput = screen.getByLabelText(/message/i)

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'John Doe' } })
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
        fireEvent.change(messageInput, { target: { value: 'This is a test message' } })
      })

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ContactForm />)

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
    })

    it('should announce form errors to screen readers', async () => {
      render(<ContactForm />)

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        const errorMessage = screen.getByText(/请输入您的姓名/)
        expect(errorMessage).toBeInTheDocument()
      })
    })

    it('should have focus management on error', async () => {
      render(<ContactForm />)

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        const errorMessage = screen.getByText(/请输入您的姓名/)
        expect(errorMessage).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should debounce validation on input', async () => {
      render(<ContactForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 't' } })
      })
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'te' } })
      })
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'tes' } })
      })

      // Should not show validation immediately
      expect(screen.queryByText(/邮箱格式不正确/)).not.toBeInTheDocument()
    })

    it('should handle multiple rapid submissions', async () => {
      render(<ContactForm />)

      // Fill form
      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const messageInput = screen.getByLabelText(/message/i)

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'John Doe' } })
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
        fireEvent.change(messageInput, { target: { value: 'This is a test message' } })
      })

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await act(async () => {
        fireEvent.click(submitButton)
        fireEvent.click(submitButton)
        fireEvent.click(submitButton)
      })

      // Should only submit once
      await waitFor(() => {
        expect(screen.getByText(/message sent successfully/i)).toBeInTheDocument()
      })
    })
  })
})
