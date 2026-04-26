/**
 * MultiStepFeedbackForm - 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MultiStepFeedbackForm from '../MultiStepFeedbackForm'
import type { Feedback } from '@/lib/db/feedback-types'
import type { ButtonProps } from '@/components/ui/Button'
import type { InputProps } from '@/components/ui/Input'

// Mock i18n - returns key stripped of 'feedback.' prefix
vi.mock('@/lib/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string) => key.replace(/^feedback\./, ''),
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
  Input: ({ label, id, error, success, warning, helperText, prefix, suffix, size, fullWidth, validationState, showValidationIcon, animated, ...inputProps }: InputProps) => (
    <div>
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} {...inputProps as React.InputHTMLAttributes<HTMLInputElement>} />
    </div>
  ),
}))

// Mock sub-components - both named and default exports
vi.mock('../ScreenshotAnnotation', () => ({
  ScreenshotAnnotation: () => <div data-testid="screenshot-annotation">ScreenshotAnnotation</div>,
  default: () => <div data-testid="screenshot-annotation">ScreenshotAnnotation</div>,
}))

vi.mock('../EmotionSelector', () => ({
  EmotionSelector: ({ value, onChange }: { value: string; onChange: (val: string) => void }) => (
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
    cleanup()
  })

  describe('Initial Render', () => {
    it('should render first step (type selection)', () => {
      render(
        <MultiStepFeedbackForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText(/steps\.type\.title/i)).toBeInTheDocument()
      expect(screen.getByText(/steps\.type\.subtitle/i)).toBeInTheDocument()
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

    it('should pre-fill contact info when currentUser is provided', async () => {
      const user = userEvent.setup()
      render(
        <MultiStepFeedbackForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          currentUser={mockCurrentUser}
        />
      )

      // Click through steps 1-3 (type → description → attachments)
      await user.click(screen.getByText(/actions\.next/i)) // step 1 → 2 (type has no validation blocking)
      // Step 2 requires title + description (≥10 chars), so Next is disabled
      // Fill description step to proceed
      const titleInput = screen.getByLabelText(/steps\.description\.title/i)
      await user.type(titleInput, 'Test Title')
      const descInput = screen.getByLabelText(/steps\.description\.description/i)
      await user.type(descInput, 'This is enough description text')
      await user.click(screen.getByText(/actions\.next/i)) // step 2 → 3
      await user.click(screen.getByText(/actions\.next/i)) // step 3 → 4 (contact)

      // Check pre-filled values on contact step
      const nameInput = screen.getByLabelText(/steps\.contact\.name/i) as HTMLInputElement
      const emailInput = screen.getByLabelText(/steps\.contact\.email/i) as HTMLInputElement

      expect(nameInput.value).toBe('Test User')
      expect(emailInput.value).toBe('test@example.com')
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

      // Step 1 has no blocking validation, so Next should be enabled
      await user.click(screen.getByText(/actions\.next/i))

      // Verify step 2 description content appears (check for description-specific text)
      const descLabel = screen.getByText(/steps\.description\.description/i)
      expect(descLabel).toBeInTheDocument()
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
      await user.click(screen.getByText(/actions\.next/i))

      // Go back to step 1
      await user.click(screen.getByText(/actions\.previous/i))

      expect(screen.getByText(/steps\.type\.subtitle/i)).toBeInTheDocument()
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
      await user.click(screen.getByText(/actions\.next/i))

      const nextButton = screen.getByText(/actions\.next/i)

      // Button should be disabled initially (no title/description filled)
      expect(nextButton).toBeDisabled()

      // Enter valid title and description
      const titleInput = screen.getByLabelText(/steps\.description\.title/i)
      const descriptionInput = screen.getByLabelText(/steps\.description\.description/i)

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
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <MultiStepFeedbackForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          currentUser={mockCurrentUser}
        />
      )

      // Step 1: Type (already filled with defaults) → click next
      await user.click(screen.getByText(/actions\.next/i))

      // Step 2: Description
      const titleInput = screen.getByLabelText(/steps\.description\.title/i)
      const descriptionInput = screen.getByLabelText(/steps\.description\.description/i)

      await user.type(titleInput, 'Bug Report Title')
      await user.type(descriptionInput, 'This is a detailed bug report with enough characters')

      await user.click(screen.getByText(/actions\.next/i))

      // Step 3: Attachments (skip - mock ScreenshotAnnotation has no blocking UI)
      await user.click(screen.getByText(/actions\.next/i))

      // Step 4: Contact (pre-filled with mockCurrentUser)
      await user.click(screen.getByText(/actions\.next/i))

      // Step 5: Review
      expect(screen.getByText(/steps\.review\.summary/i)).toBeInTheDocument()

      await user.click(screen.getByText(/actions\.submit/i))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedData = mockOnSubmit.mock.calls[0][0] as Feedback
      expect(submittedData.title).toBe('Bug Report Title')
      expect(submittedData.description).toContain('detailed bug report')
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

      // Go to description step and fill title to trigger draft save
      await user.click(screen.getByText(/actions\.next/i))
      const titleInput = screen.getByLabelText(/steps\.description\.title/i)
      await user.type(titleInput, 'Test Title')

      // Wait for auto-save debounce to fire (2 seconds)
      await waitFor(() => {
        expect(localStorage.getItem('feedback-draft')).toBeTruthy()
      }, { timeout: 3000 })

      // Complete remaining steps
      const descInput = screen.getByLabelText(/steps\.description\.description/i)
      await user.type(descInput, 'This is enough description text')
      await user.click(screen.getByText(/actions\.next/i)) // step 3
      await user.click(screen.getByText(/actions\.next/i)) // step 4
      await user.click(screen.getByText(/actions\.next/i)) // step 5

      // Submit
      await user.click(screen.getByText(/actions\.submit/i))

      // Wait for onSubmit to resolve and draft to be cleared
      await waitFor(() => {
        expect(mockResolvedOnSubmit).toHaveBeenCalled()
      })
      await waitFor(() => {
        expect(localStorage.getItem('feedback-draft')).toBeNull()
      }, { timeout: 3000 })
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

      // Navigate to description step
      await user.click(screen.getByText(/actions\.next/i))

      // Fill in title to trigger draft save
      const titleInput = screen.getByLabelText(/steps\.description\.title/i)
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
      fireEvent.click(screen.getByText(/actions\.next/i))

      const titleInput = screen.getByLabelText(/steps\.description\.title/i) as HTMLInputElement
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

      await user.click(screen.getByText(/actions\.cancel/i))

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })
})
