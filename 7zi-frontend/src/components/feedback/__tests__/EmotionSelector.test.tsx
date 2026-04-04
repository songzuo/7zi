/**
 * EmotionSelector - 单元测试
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmotionSelector, SatisfactionRating, FeedbackSatisfactionModal } from '../EmotionSelector'
import { Modal } from '@/components/ui/Modal'

// Mock i18n
vi.mock('@/lib/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock Modal component
vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, onClose, children, title }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null,
}))

describe('EmotionSelector', () => {
  describe('Basic Rendering', () => {
    it('should render all 5 emotion options', () => {
      render(
        <EmotionSelector
          value="neutral"
          onChange={() => {}}
        />
      )

      expect(screen.getByText('😠')).toBeInTheDocument()
      expect(screen.getByText('😕')).toBeInTheDocument()
      expect(screen.getByText('😐')).toBeInTheDocument()
      expect(screen.getByText('🙂')).toBeInTheDocument()
      expect(screen.getByText('😄')).toBeInTheDocument()
    })

    it('should highlight selected emotion', () => {
      render(
        <EmotionSelector
          value="satisfied"
          onChange={() => {}}
        />
      )

      const satisfiedButton = screen.getByText('🙂').closest('button')
      expect(satisfiedButton).toHaveClass('bg-lime-500')
    })

    it('should show labels when showLabel is true', () => {
      render(
        <EmotionSelector
          value="neutral"
          onChange={() => {}}
          showLabel={true}
        />
      )

      expect(screen.getByText(/feedback\.emotions\.selectPrompt/i)).toBeInTheDocument()
    })
  })

  describe('User Interaction', () => {
    it('should call onChange when emotion is clicked', () => {
      const handleChange = vi.fn()

      render(
        <EmotionSelector
          value="neutral"
          onChange={handleChange}
        />
      )

      const satisfiedButton = screen.getByText('🙂').closest('button')
      fireEvent.click(satisfiedButton!)

      expect(handleChange).toHaveBeenCalledWith('satisfied')
    })

    it('should not call onChange when disabled', () => {
      const handleChange = vi.fn()

      render(
        <EmotionSelector
          value="neutral"
          onChange={handleChange}
          disabled={true}
        />
      )

      const satisfiedButton = screen.getByText('🙂').closest('button')
      fireEvent.click(satisfiedButton!)

      expect(handleChange).not.toHaveBeenCalled()
    })
  })

  describe('Size Variants', () => {
    it('should render small size correctly', () => {
      const { container } = render(
        <EmotionSelector
          value="neutral"
          onChange={() => {}}
          size="sm"
        />
      )

      const buttons = container.querySelectorAll('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('text-2xl')
      })
    })

    it('should render large size correctly', () => {
      const { container } = render(
        <EmotionSelector
          value="neutral"
          onChange={() => {}}
          size="lg"
        />
      )

      const buttons = container.querySelectorAll('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('text-4xl')
      })
    })
  })
})

describe('SatisfactionRating', () => {
  describe('Basic Rendering', () => {
    it('should render 5 stars by default', () => {
      render(
        <SatisfactionRating
          value={0}
          onChange={() => {}}
        />
      )

      const stars = screen.getAllByRole('button')
      expect(stars).toHaveLength(5)
    })

    it('should render custom number of stars', () => {
      render(
        <SatisfactionRating
          value={0}
          onChange={() => {}}
          maxStars={3}
        />
      )

      const stars = screen.getAllByRole('button')
      expect(stars).toHaveLength(3)
    })

    it('should fill stars up to the rating value', () => {
      render(
        <SatisfactionRating
          value={3}
          onChange={() => {}}
        />
      )

      const stars = screen.getAllByRole('button')

      // First 3 stars should be filled (yellow)
      for (let i = 0; i < 3; i++) {
        expect(stars[i].querySelector('svg')).toHaveClass('text-yellow-400')
      }

      // Last 2 stars should be empty (gray)
      for (let i = 3; i < 5; i++) {
        expect(stars[i].querySelector('svg')).toHaveClass('text-gray-300')
      }
    })

    it('should show rating text when rating > 0', () => {
      render(
        <SatisfactionRating
          value={4}
          onChange={() => {}}
        />
      )

      expect(screen.getByText('4 / 5')).toBeInTheDocument()
    })
  })

  describe('User Interaction', () => {
    it('should set rating when star is clicked', () => {
      const handleChange = vi.fn()

      render(
        <SatisfactionRating
          value={0}
          onChange={handleChange}
        />
      )

      const stars = screen.getAllByRole('button')
      fireEvent.click(stars[3])

      expect(handleChange).toHaveBeenCalledWith(4)
    })

    it('should toggle off when same star is clicked', () => {
      const handleChange = vi.fn()

      render(
        <SatisfactionRating
          value={3}
          onChange={handleChange}
        />
      )

      const stars = screen.getAllByRole('button')
      fireEvent.click(stars[2])

      expect(handleChange).toHaveBeenCalledWith(0)
    })
  })
})

describe('FeedbackSatisfactionModal', () => {
  const mockOnSubmit = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <FeedbackSatisfactionModal
          isOpen={false}
          feedbackId="test-123"
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
        />
      )

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    })

    it('should render when isOpen is true', () => {
      render(
        <FeedbackSatisfactionModal
          isOpen={true}
          feedbackId="test-123"
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByTestId('modal')).toBeInTheDocument()
      expect(screen.getByText(/feedback\.satisfaction\.title/i)).toBeInTheDocument()
      expect(screen.getByText(/feedback\.satisfaction\.prompt/i)).toBeInTheDocument()
    })
  })

  describe('Submission', () => {
    it('should submit satisfaction rating', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <FeedbackSatisfactionModal
          isOpen={true}
          feedbackId="test-123"
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
        />
      )

      // Select rating
      const stars = screen.getAllByRole('button')
      await user.click(stars[4])

      // Select emotion
      const emotionButtons = screen.getAllByText(/😠|😕|😐|🙂|😄/)
      await user.click(emotionButtons[3]) // satisfied

      // Submit
      const submitButton = screen.getByText(/feedback\.satisfaction\.submit/i)
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          rating: 5,
          emotion: 'satisfied',
          comment: '',
        })
      })
    })

    it('should show thank you message after submission', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <FeedbackSatisfactionModal
          isOpen={true}
          feedbackId="test-123"
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
        />
      )

      // Submit (no rating)
      const submitButton = screen.getByText(/feedback\.satisfaction\.submit/i)
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/feedback\.satisfaction\.thankYou/i)).toBeInTheDocument()
      })
    })
  })

  describe('Cancel/Skip', () => {
    it('should call onClose when skip button is clicked', () => {
      render(
        <FeedbackSatisfactionModal
          isOpen={true}
          feedbackId="test-123"
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
        />
      )

      const skipButton = screen.getByText(/feedback\.satisfaction\.skip/i)
      fireEvent.click(skipButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Comment Input', () => {
    it('should allow typing comment', async () => {
      const user = userEvent.setup()

      render(
        <FeedbackSatisfactionModal
          isOpen={true}
          feedbackId="test-123"
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
        />
      )

      const textarea = screen.getByPlaceholderText(/feedback\.satisfaction\.commentPlaceholder/i)
      await user.type(textarea, 'This is a test comment')

      expect(textarea).toHaveValue('This is a test comment')
    })
  })
})
