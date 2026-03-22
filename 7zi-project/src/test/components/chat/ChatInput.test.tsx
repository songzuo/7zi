import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInput } from '@/components/chat/ChatInput'

describe('ChatInput', () => {
  const mockOnChange = vi.fn()
  const mockOnSend = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
    mockOnSend.mockClear()
  })

  it('renders input field with placeholder', () => {
    render(<ChatInput value="" onChange={mockOnChange} onSend={mockOnSend} />)
    
    expect(screen.getByPlaceholderText('输入消息...')).toBeInTheDocument()
  })

  it('displays current value', () => {
    render(<ChatInput value="测试输入" onChange={mockOnChange} onSend={mockOnSend} />)
    
    expect(screen.getByDisplayValue('测试输入')).toBeInTheDocument()
  })

  it('calls onChange when input changes', () => {
    render(<ChatInput value="" onChange={mockOnChange} onSend={mockOnSend} />)
    
    const input = screen.getByPlaceholderText('输入消息...')
    fireEvent.change(input, { target: { value: '新消息' } })
    
    expect(mockOnChange).toHaveBeenCalledWith('新消息')
  })

  it('calls onSend when send button is clicked', () => {
    render(<ChatInput value="测试消息" onChange={mockOnChange} onSend={mockOnSend} />)
    
    const sendButton = screen.getByRole('button', { name: '发送消息' })
    fireEvent.click(sendButton)
    
    expect(mockOnSend).toHaveBeenCalledTimes(1)
  })

  it('disables send button when value is empty', () => {
    render(<ChatInput value="" onChange={mockOnChange} onSend={mockOnSend} />)
    
    const sendButton = screen.getByRole('button', { name: '发送消息' })
    expect(sendButton).toBeDisabled()
  })

  it('disables send button when value is only whitespace', () => {
    render(<ChatInput value="   " onChange={mockOnChange} onSend={mockOnSend} />)
    
    const sendButton = screen.getByRole('button', { name: '发送消息' })
    expect(sendButton).toBeDisabled()
  })

  it('enables send button when value has content', () => {
    render(<ChatInput value="有效内容" onChange={mockOnChange} onSend={mockOnSend} />)
    
    const sendButton = screen.getByRole('button', { name: '发送消息' })
    expect(sendButton).not.toBeDisabled()
  })

  it('calls onSend when Enter key is pressed', () => {
    render(<ChatInput value="测试消息" onChange={mockOnChange} onSend={mockOnSend} />)
    
    const input = screen.getByPlaceholderText('输入消息...')
    fireEvent.keyPress(input, { key: 'Enter', charCode: 13 })
    
    expect(mockOnSend).toHaveBeenCalledTimes(1)
  })

  it('does not call onSend for other keys', () => {
    render(<ChatInput value="测试消息" onChange={mockOnChange} onSend={mockOnSend} />)
    
    const input = screen.getByPlaceholderText('输入消息...')
    fireEvent.keyPress(input, { key: 'a', charCode: 97 })
    
    expect(mockOnSend).not.toHaveBeenCalled()
  })

  it('forwards ref to input element', () => {
    const ref = { current: null as HTMLInputElement | null }
    render(<ChatInput ref={ref} value="" onChange={mockOnChange} onSend={mockOnSend} />)
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })
})