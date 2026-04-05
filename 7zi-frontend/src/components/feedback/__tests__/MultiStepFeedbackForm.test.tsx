/**
 * MultiStepFeedbackForm - 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MultiStepFeedbackForm from '../MultiStepFeedbackForm'
import type { FeedbackData } from '@/lib/db/feedback-types'
import type { ButtonProps } from '@/components/ui/Button'
import type { InputProps } from '@/components/ui/Input'

// Mock i18n
vi.mock('@/lib/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock UI components
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: ButtonProps) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/Input', () => ({
  Input: (props: InputProps) => <input {...props} />,
}))

// Mock sub-components
vi.mock('../ScreenshotAnnotation', () => ({
  default: () => <div data-testid="screenshot-annotation">ScreenshotAnnotation</div>,
}))

vi.mock('../EmotionSelector', () => ({
  default: ({ value, onChange }: { value: string; onChange: (val: string) => void }) => (
    <div data-testid="emotion-selector" data-value={value} onClick={() => onChange('satisfied')}>
      EmotionSelector
    </div>
  ),
}))

describe('MultiStepFeedbackForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()
  const mockCurrentUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Initial Render', () => {
    it('should render first step (type selection)', () => {
      render(
        <MultiStepFeedbackForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText(/feedback\.steps\.type\.title/i)).toBeInTheDocument()
      expect(screen.getByText(/feedback\.steps\.type\.subtitle/i)).toBeInTheDocument()
    })

    it('should render all 5 steps in progress indicator', () => {
      render(
        <MultiStepFeedbackForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should pre-fill contact info when currentUser is provided', () => {
      render(
        <MultiStepFeedbackForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          currentUser={mockCurrentUser}
        />
      )

      // Navigate to contact step
      fireEvent.click(screen.getByText(/feedback\.actions\.next/i))
      fireEvent.click(screen.getByText(/feedback\.actions\.next/i))
      fireEvent.click(screen.getByText(/feedback\.actions\.next/i))

      // Check pre-filled values
      const nameInput = screen.getByLabelText(/feedback\.steps\.contact\.name/i)
      const emailInput = screen.getByLabelText(/feedback\.steps\.contact\.email/i)

      expect(nameInput).toHaveValue('Test User')
      expect(emailInput).toHaveValue('test@example.com')
    })
  })

  describe('Step Navigation', () => {
    it('should move to next step when clicking next', async () => {
      const user = userEvent.setup()
      render(
        <MultiStepFeedbackForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      const nextButton = screen.getByText(/feedback\.actions\.next/i)

      await user.click(nextButton)

      expect(screen.getByText(/feedback\.steps\.description\.subtitle/i)).toBeInTheDocument()
    })

    it('should move to previous step when clicking previous', async () => {
      const user = userEvent.setup()
      render(
        <MultiStepFeedbackForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Go to step 2
      await user.click(screen.getByText(/feedback\.actions\.next/i))

      // Go back to step 1
      await user.click(screen.getByText(/feedback\.actions\.previous/i))

      expect(screen.getByText(/feedback\.steps\.type\.subtitle/i)).toBeInTheDocument()
    })

    it('should disable next button when validation fails', async () => {
      const user = userEvent.setup()
      render(
        <MultiStepFeedbackForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Go to step 2 (description)
      await user.click(screen.getByText(/feedback\.actions\.next/i))

      const nextButton = screen.getByText(/feedback\.actions\.next/i)

      // Button should be disabled initially
      expect(nextButton).toBeDisabled()

      // Enter valid title and description
      const titleInput = screen.getByLabelText(/feedback\.steps\.description\.title/i)
      const descriptionInput = screen.getByLabelText(/feedback\.steps\.description\.description/i)

      await user.type(titleInput, 'Test Title')
      await user.type(descriptionInput, 'This is a test description that is at least 10 characters long')

      // Button should be enabled
      await waitFor(() => {
        expect(nextButton).not.toBeDisabled()
      })
    })
  })

  describe('Form Submission', () => {
    it('should submit feedback with all steps completed', async () => {
      const user = userEvent.setup()
      render(
        <MultiStepFeedbackForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          currentUser={mockCurrentUser}
        />
      )

      // Step 1: Type (already filled with defaults)
      await user.click(screen.getByText(/feedback\.actions\.next/i))

      // Step 2: Description
      const titleInput = screen.getByLabelText(/feedback\.steps\.description\.title/i)
      const descriptionInput = screen.getByLabelText(/feedback\.steps\.description\.description/i)

      await user.type(titleInput, 'Bug Report Title')
      await user.type(descriptionInput, 'This is a detailed bug report with enough characters')

      await user.click(screen.getByText(/feedback\.actions\.next/i))

      // Step 3: Attachments (skip)
      await user.click(screen.getByText(/feedback\.actions\.next/i))

      // Step 4: Contact (pre-filled)
      await user.click(screen.getByText(/feedback\.actions\.next/i))

      // Step 5: Review
      expect(screen.getByText(/feedback\.steps\.review\.summary/i)).toBeInTheDocument()

      await user.click(screen.getByText(/feedback\.actions\.submit/i))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedData = mockOnSubmit.mock.calls[0][0] as FeedbackData
      expect(submittedData.title).toBe('Bug Report Title')
      expect(submittedData.description).toContain('detailed bug report')
      expect(submittedData.tags).toContain('satisfied')
    })

    it('should clear draft after successful submission', async () => {
      const user = userEvent.setup()
      const mockResolvedOnSubmit = vi.fn().mockResolvedValue(undefined)

      render(
        <MultiStepFeedbackForm
          onSubmit={mockResolvedOnSubmit}
          onCancel={mockOnCancel}
          currentUser={mockCurrentUser}
        />
      )

      // Save draft first
      const titleInput = screen.getByLabelText(/feedback\.steps\.description\.title/i)
      await user.type(titleInput, 'Test Title')

      await waitFor(() => {
        expect(localStorage.getItem('feedback-draft')).toBeTruthy()
      })

      // Navigate through all steps
      for (let i = 0; i < 4; i++) {
        await user.click(screen.getByText(/feedback\.actions\.next/i))
      }

      // Submit
      await user.click(screen.getByText(/feedback\.actions\.submit/i))

      await waitFor(() => {
        expect(localStorage.getItem('feedback-draft')).toBeNull()
      })
    })
  })

  describe('Draft Saving', () => {
    it('should save draft to localStorage', async () => {
      const user = userEvent.setup()
      render(
        <MultiStepFeedbackForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Fill in some data
      const titleInput = screen.getByLabelText(/feedback\.steps\.description\.title/i)
      await user.type(titleInput, 'Test Title')

      // Wait for auto-save (2 second debounce)
      await waitFor(
        () => {
          const draft = localStorage.getItem('feedback-draft')
          expect(draft).toBeTruthy()
          const parsed = JSON.parse(draft!)
          expect(parsed.feedback.title).toBe('Test Title')
        },
        { timeout: 3000 }
      )
    })

    it('should load draft from localStorage on mount', () => {
      const draftData = {
        feedback: {
          type: 'feature',
          priority: 'high',
          title: 'Draft Title',
          description: 'Draft Description',
          attachments: [],
          tags: [],
        },
        contactInfo: {
          name: 'Draft User',
          email: 'draft@example.com',
          phone: '',
        },
        emotion: 'satisfied',
      }

      localStorage.setItem('feedback-draft', JSON.stringify(draftData))

      render(
        <MultiStepFeedbackForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Navigate to description step to check loaded values
      fireEvent.click(screen.getByText(/feedback\.actions\.next/i))

      const titleInput = screen.getByLabelText(/feedback\.steps\.description\.title/i) as HTMLInputElement
      expect(titleInput.value).toBe('Draft Title')
    })
  })

  describe('Cancel', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <MultiStepFeedbackForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      await user.click(screen.getByText(/feedback\.actions\.cancel/i))

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })
})
