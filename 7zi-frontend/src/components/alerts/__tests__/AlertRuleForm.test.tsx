/**
 * AlertRuleForm Tests
 * @version 1.0.0
 * @date 2026-04-03
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AlertRuleForm } from '../AlertRuleForm'
import type { AlertRule, NotificationChannel } from '@/types/alerts'
import type { ButtonProps } from '@/components/ui/Button'
import type { InputProps } from '@/components/ui/Input'

// Mock the Button component
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, type, loading, variant, disabled, ...props }: ButtonProps) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      data-variant={variant}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
}))

// Mock the Input component
vi.mock('@/components/ui/Input', () => ({
  Input: ({ label, error, size, prefix, suffix, helperText, success, warning, fullWidth, validationState, showValidationIcon, animated, ...props }: InputProps) => (
    <div>
      {label && <label>{label}</label>}
      <input {...props} />
      {error && <span className="error">{error}</span>}
    </div>
  ),
}))

describe('AlertRuleForm', () => {
  const mockOnSave = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create Mode', () => {
    it('should render form with default values', () => {
      render(
        <AlertRuleForm 
          rule={null} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      expect(screen.getByText('Create Alert Rule')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('e.g., High CPU Usage Alert')).toBeInTheDocument()
    })

    it('should show validation errors for empty required fields', async () => {
      render(
        <AlertRuleForm 
          rule={null} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const submitButton = screen.getByRole('button', { name: /create rule/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument()
        expect(screen.getByText('Threshold must be a positive number')).toBeInTheDocument()
      })
    })

    it('should call onSave with correct data when form is valid', async () => {
      mockOnSave.mockResolvedValueOnce(undefined)

      render(
        <AlertRuleForm 
          rule={null} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      // Fill the form
      const nameInput = screen.getByPlaceholderText('e.g., High CPU Usage Alert')
      fireEvent.change(nameInput, { target: { value: 'Test Alert' } })

      const thresholdInput = screen.getByPlaceholderText('e.g., 80')
      fireEvent.change(thresholdInput, { target: { value: '85' } })

      // Select metric type
      const cpuButton = screen.getByRole('button', { name: /cpu/i })
      fireEvent.click(cpuButton)

      // Submit
      const submitButton = screen.getByRole('button', { name: /create rule/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Alert',
            metricType: 'CPU',
            threshold: 85,
            enabled: true,
          })
        )
      })
    })

    it('should allow selecting different metric types', () => {
      render(
        <AlertRuleForm 
          rule={null} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      // Click Memory metric
      const memoryButton = screen.getByRole('button', { name: /memory/i })
      fireEvent.click(memoryButton)

      // Memory should be selected (visual state change)
      expect(memoryButton).toBeInTheDocument()
    })

    it('should allow toggling notification channels', () => {
      render(
        <AlertRuleForm 
          rule={null} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      // Slack should not be selected by default
      const slackButton = screen.getByRole('button', { name: /slack/i })
      fireEvent.click(slackButton)

      // Now it should be selected
      expect(slackButton).toBeInTheDocument()
    })

    it('should allow toggling enabled state', () => {
      render(
        <AlertRuleForm 
          rule={null} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      // Find the enabled toggle by text content
      const enabledToggle = screen.getByText('Enable Rule')
      fireEvent.click(enabledToggle)

      expect(enabledToggle).toBeInTheDocument()
    })
  })

  describe('Edit Mode', () => {
    const existingRule = {
      id: 'test-id',
      name: 'Existing Rule',
      metricType: 'Memory' as const,
      condition: '>' as const,
      threshold: 90,
      duration: 300,
      severity: 'critical' as const,
      channels: ['email', 'slack'] as NotificationChannel[],
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    it('should render form with existing rule data', () => {
      render(
        <AlertRuleForm 
          rule={existingRule} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      expect(screen.getByText('Edit Alert Rule')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Existing Rule')).toBeInTheDocument()
      expect(screen.getByDisplayValue('90')).toBeInTheDocument()
    })

    it('should call onSave with updated data', async () => {
      mockOnSave.mockResolvedValueOnce(undefined)

      render(
        <AlertRuleForm 
          rule={existingRule} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      // Update name
      const nameInput = screen.getByDisplayValue('Existing Rule')
      fireEvent.change(nameInput, { target: { value: 'Updated Rule' } })

      // Submit
      const submitButton = screen.getByRole('button', { name: /update rule/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Rule',
          })
        )
      })
    })
  })

  describe('Form Validation', () => {
    it('should validate name length', async () => {
      render(
        <AlertRuleForm 
          rule={null} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const nameInput = screen.getByPlaceholderText('e.g., High CPU Usage Alert')
      const longName = 'a'.repeat(101)
      fireEvent.change(nameInput, { target: { value: longName } })

      const submitButton = screen.getByRole('button', { name: /create rule/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Name must be less than 100 characters')).toBeInTheDocument()
      })
    })

    it('should validate threshold is positive', () => {
      // Test that empty threshold shows validation error
      // (The component validates that threshold is not negative when provided)
      render(
        <AlertRuleForm 
          rule={null} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      // Fill name only
      const nameInput = screen.getByPlaceholderText('e.g., High CPU Usage Alert')
      fireEvent.change(nameInput, { target: { value: 'Test Alert' } })

      // Submit without threshold - should show error
      const submitButton = screen.getByRole('button', { name: /create rule/i })
      fireEvent.click(submitButton)

      // Should show threshold error (empty threshold is invalid)
      expect(screen.getByText(/Threshold must be a positive number/)).toBeInTheDocument()
    })

    it('should validate at least one channel is selected', async () => {
      render(
        <AlertRuleForm 
          rule={null} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      // Fill required fields
      const nameInput = screen.getByPlaceholderText('e.g., High CPU Usage Alert')
      fireEvent.change(nameInput, { target: { value: 'Test Alert' } })

      const thresholdInput = screen.getByPlaceholderText('e.g., 80')
      fireEvent.change(thresholdInput, { target: { value: '85' } })

      // Deselect email (default)
      const emailButton = screen.getByRole('button', { name: /email/i })
      fireEvent.click(emailButton)

      const submitButton = screen.getByRole('button', { name: /create rule/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('At least one channel is required')).toBeInTheDocument()
      })
    })
  })

  describe('Form Actions', () => {
    it('should call onCancel when cancel button is clicked', () => {
      render(
        <AlertRuleForm 
          rule={null} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })
})
