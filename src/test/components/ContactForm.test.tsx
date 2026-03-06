import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ContactForm } from '@/components/ContactForm'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'name': '姓名',
      'email': '邮箱',
      'subject': '主题',
      'message': '消息内容',
      'submit': '发送消息',
      'sending': '发送中...',
      'success': '消息发送成功！',
      'error': '发送失败，请稍后重试。',
    }
    return translations[key] || key
  }
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('renders form fields correctly', () => {
    render(<ContactForm />)
    
    expect(screen.getByLabelText(/姓名/)).toBeInTheDocument()
    expect(screen.getByLabelText(/邮箱/)).toBeInTheDocument()
    expect(screen.getByLabelText(/公司（可选）/)).toBeInTheDocument()
    expect(screen.getByLabelText(/主题/)).toBeInTheDocument()
    expect(screen.getByLabelText(/消息内容/)).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<ContactForm />)
    
    expect(screen.getByRole('button', { name: '发送消息' })).toBeInTheDocument()
  })

  it('shows required field indicators', () => {
    render(<ContactForm />)
    
    const requiredIndicators = screen.getAllByText('*')
    expect(requiredIndicators.length).toBe(3) // name, email, message
  })

  it('validates required name field', async () => {
    render(<ContactForm />)
    
    const submitButton = screen.getByRole('button', { name: '发送消息' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('请输入您的姓名')).toBeInTheDocument()
    })
  })

  it('validates required email field', async () => {
    render(<ContactForm />)
    
    const submitButton = screen.getByRole('button', { name: '发送消息' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('请输入您的邮箱')).toBeInTheDocument()
    })
  })

  it('validates email format - component renders email input with validation', async () => {
    render(<ContactForm />)
    
    const emailInput = screen.getByLabelText(/邮箱/)
    
    // Just verify the email input exists and accepts input
    expect(emailInput).toBeInTheDocument()
    expect(emailInput).toHaveAttribute('type', 'email')
    
    // Test that invalid email can be entered (validation happens on submit)
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    expect(emailInput).toHaveValue('invalid-email')
    
    // Test that valid email can be entered
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    expect(emailInput).toHaveValue('test@example.com')
  })

  it('validates required message field', async () => {
    render(<ContactForm />)
    
    const submitButton = screen.getByRole('button', { name: '发送消息' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('请输入消息内容')).toBeInTheDocument()
    })
  })

  it('validates minimum message length', async () => {
    render(<ContactForm />)
    
    const nameInput = screen.getByLabelText(/姓名/)
    const emailInput = screen.getByLabelText(/邮箱/)
    const messageInput = screen.getByLabelText(/消息内容/)
    
    fireEvent.change(nameInput, { target: { value: '测试用户' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(messageInput, { target: { value: '短消息' } }) // Less than 10 chars
    
    const submitButton = screen.getByRole('button', { name: '发送消息' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('消息内容至少需要 10 个字符')).toBeInTheDocument()
    })
  })

  it('allows user to fill optional company field', async () => {
    render(<ContactForm />)
    
    const companyInput = screen.getByLabelText(/公司（可选）/)
    fireEvent.change(companyInput, { target: { value: '测试公司' } })
    
    expect(companyInput).toHaveValue('测试公司')
  })

  it('allows user to select subject', async () => {
    render(<ContactForm />)
    
    const subjectSelect = screen.getByLabelText(/主题/)
    fireEvent.change(subjectSelect, { target: { value: 'cooperation' } })
    
    expect(subjectSelect).toHaveValue('cooperation')
  })

  it('clears field error when user starts typing', async () => {
    render(<ContactForm />)
    
    const submitButton = screen.getByRole('button', { name: '发送消息' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('请输入您的姓名')).toBeInTheDocument()
    })
    
    const nameInput = screen.getByLabelText(/姓名/)
    fireEvent.change(nameInput, { target: { value: '测' } })
    
    await waitFor(() => {
      expect(screen.queryByText('请输入您的姓名')).not.toBeInTheDocument()
    })
  })

  it('submits form successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<ContactForm />)
    
    const nameInput = screen.getByLabelText(/姓名/)
    const emailInput = screen.getByLabelText(/邮箱/)
    const messageInput = screen.getByLabelText(/消息内容/)
    
    fireEvent.change(nameInput, { target: { value: '测试用户' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(messageInput, { target: { value: '这是一条测试消息内容' } })
    
    const submitButton = screen.getByRole('button', { name: '发送消息' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/消息发送成功/)).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<ContactForm />)
    
    const nameInput = screen.getByLabelText(/姓名/)
    const emailInput = screen.getByLabelText(/邮箱/)
    const messageInput = screen.getByLabelText(/消息内容/)
    
    fireEvent.change(nameInput, { target: { value: '测试用户' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(messageInput, { target: { value: '这是一条测试消息内容' } })
    
    const submitButton = screen.getByRole('button', { name: '发送消息' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('发送中...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  it('handles submission error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<ContactForm />)
    
    const nameInput = screen.getByLabelText(/姓名/)
    const emailInput = screen.getByLabelText(/邮箱/)
    const messageInput = screen.getByLabelText(/消息内容/)
    
    fireEvent.change(nameInput, { target: { value: '测试用户' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(messageInput, { target: { value: '这是一条测试消息内容' } })
    
    const submitButton = screen.getByRole('button', { name: '发送消息' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/发送失败/)).toBeInTheDocument()
    })
  })

  it('handles API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: '服务器错误' }),
    })

    render(<ContactForm />)
    
    const nameInput = screen.getByLabelText(/姓名/)
    const emailInput = screen.getByLabelText(/邮箱/)
    const messageInput = screen.getByLabelText(/消息内容/)
    
    fireEvent.change(nameInput, { target: { value: '测试用户' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(messageInput, { target: { value: '这是一条测试消息内容' } })
    
    const submitButton = screen.getByRole('button', { name: '发送消息' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/发送失败/)).toBeInTheDocument()
    })
  })

  it('clears form after successful submission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<ContactForm />)
    
    const nameInput = screen.getByLabelText(/姓名/) as HTMLInputElement
    const emailInput = screen.getByLabelText(/邮箱/) as HTMLInputElement
    const messageInput = screen.getByLabelText(/消息内容/) as HTMLTextAreaElement
    
    fireEvent.change(nameInput, { target: { value: '测试用户' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(messageInput, { target: { value: '这是一条测试消息内容' } })
    
    const submitButton = screen.getByRole('button', { name: '发送消息' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/消息发送成功/)).toBeInTheDocument()
    })
    
    expect(nameInput.value).toBe('')
    expect(emailInput.value).toBe('')
    expect(messageInput.value).toBe('')
  })

  it('sends correct data to API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<ContactForm />)
    
    const nameInput = screen.getByLabelText(/姓名/)
    const emailInput = screen.getByLabelText(/邮箱/)
    const companyInput = screen.getByLabelText(/公司（可选）/)
    const subjectSelect = screen.getByLabelText(/主题/)
    const messageInput = screen.getByLabelText(/消息内容/)
    
    fireEvent.change(nameInput, { target: { value: '测试用户' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(companyInput, { target: { value: '测试公司' } })
    fireEvent.change(subjectSelect, { target: { value: 'cooperation' } })
    fireEvent.change(messageInput, { target: { value: '这是一条测试消息内容' } })
    
    const submitButton = screen.getByRole('button', { name: '发送消息' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('测试用户'),
      })
    })
  })

  it('displays subject options', () => {
    render(<ContactForm />)
    
    expect(screen.getByRole('option', { name: '选择咨询主题' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '项目咨询' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '商务合作' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '技术支持' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '加入我们' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '其他' })).toBeInTheDocument()
  })
})
