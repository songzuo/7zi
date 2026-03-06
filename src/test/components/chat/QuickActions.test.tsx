import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuickActions } from '@/components/chat/QuickActions'

const mockActions = ['快速操作1', '快速操作2', '快速操作3']

describe('QuickActions', () => {
  const mockOnAction = vi.fn()

  beforeEach(() => {
    mockOnAction.mockClear()
  })

  it('renders all quick actions', () => {
    render(<QuickActions actions={mockActions} onAction={mockOnAction} />)
    
    expect(screen.getByText('快速操作1')).toBeInTheDocument()
    expect(screen.getByText('快速操作2')).toBeInTheDocument()
    expect(screen.getByText('快速操作3')).toBeInTheDocument()
  })

  it('calls onAction with correct action when clicked', () => {
    render(<QuickActions actions={mockActions} onAction={mockOnAction} />)
    
    fireEvent.click(screen.getByText('快速操作1'))
    
    expect(mockOnAction).toHaveBeenCalledWith('快速操作1')
  })

  it('calls onAction for each action', () => {
    render(<QuickActions actions={mockActions} onAction={mockOnAction} />)
    
    fireEvent.click(screen.getByText('快速操作2'))
    expect(mockOnAction).toHaveBeenCalledWith('快速操作2')
    
    fireEvent.click(screen.getByText('快速操作3'))
    expect(mockOnAction).toHaveBeenCalledWith('快速操作3')
  })

  it('renders empty state when no actions', () => {
    render(<QuickActions actions={[]} onAction={mockOnAction} />)
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})