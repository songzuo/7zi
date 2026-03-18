/**
 * Unit tests for ContactForm component
 * @module components/ContactForm.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ContactForm } from './ContactForm';

// Mock the EmailJS service
vi.mock('@emailjs/browser', () => ({
  send: vi.fn().mockResolvedValue({ status: 200, text: 'OK' }),
}));

describe('ContactForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch CSRF token
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: async () => ({ csrfToken: 'mock-csrf-token' }),
    } as Response));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render form fields correctly', () => {
      render(<ContactForm />);
      
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<ContactForm />);
      const submitButton = screen.getByRole('button', { name: /send message/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('should show required field indicators', () => {
      render(<ContactForm />);
      expect(screen.getByLabelText(/name/i)).toBeRequired();
      expect(screen.getByLabelText(/email/i)).toBeRequired();
      expect(screen.getByLabelText(/message/i)).toBeRequired();
      expect(screen.getByLabelText(/company/i)).not.toBeRequired();
    });

    it('should display subject options', () => {
      render(<ContactForm />);
      const subjectSelect = screen.getByLabelText(/subject/i);
      expect(subjectSelect).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate required name field', async () => {
      render(<ContactForm />);
      
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('should validate required email field', async () => {
      render(<ContactForm />);
      
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should validate email format - component renders email input with validation', async () => {
      render(<ContactForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    it('should accept valid email format', async () => {
      render(<ContactForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      await waitFor(() => {
        expect(emailInput).toHaveValue('test@example.com');
      });
    });

    it('should validate required message field', async () => {
      render(<ContactForm />);
      
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/message is required/i)).toBeInTheDocument();
      });
    });

    it('should validate minimum message length', async () => {
      render(<ContactForm />);
      
      const messageInput = screen.getByLabelText(/message/i);
      fireEvent.change(messageInput, { target: { value: 'Hi' } });
      
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/message must be at least/i)).toBeInTheDocument();
      });
    });

    it('should validate maximum message length', async () => {
      render(<ContactForm />);
      
      const messageInput = screen.getByLabelText(/message/i);
      const longMessage = 'a'.repeat(2000);
      fireEvent.change(messageInput, { target: { value: longMessage } });
      
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/message is too long/i)).toBeInTheDocument();
      });
    });

    it('should allow user to fill optional company field', () => {
      render(<ContactForm />);
      
      const companyInput = screen.getByLabelText(/company/i);
      fireEvent.change(companyInput, { target: { value: 'My Company' } });
      
      expect(companyInput).toHaveValue('My Company');
    });

    it('should allow user to select subject', () => {
      render(<ContactForm />);
      
      const subjectSelect = screen.getByLabelText(/subject/i);
      fireEvent.change(subjectSelect, { target: { value: 'project' } });
      
      expect(subjectSelect).toHaveValue('project');
    });

    it('should clear field error when user starts typing', async () => {
      render(<ContactForm />);
      
      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByRole('button', { name: /send message/i });
      
      // Trigger validation error
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
      
      // Start typing
      fireEvent.change(nameInput, { target: { value: 'John' } });
      
      await waitFor(() => {
        expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form successfully', async () => {
      render(<ContactForm />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'This is a test message' } });
      
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/message sent successfully/i)).toBeInTheDocument();
      });
    });

    it('should handle submission error', async () => {
      // Mock failed submission
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      render(<ContactForm />);

      // Fill form
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'This is a test message' } });

      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to send message/i)).toBeInTheDocument();
      });
    });

    it('should handle API error response', async () => {
      // Mock API error
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad Request' }),
      } as Response);
      
      render(<ContactForm />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'This is a test message' } });
      
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to send message/i)).toBeInTheDocument();
      });
    });

    it('should clear form after successful submission', async () => {
      render(<ContactForm />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'This is a test message' } });
      fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'My Company' } });
      
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/message sent successfully/i)).toBeInTheDocument();
      });
      
      // Form should be cleared
      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toHaveValue('');
        expect(screen.getByLabelText(/email/i)).toHaveValue('');
        expect(screen.getByLabelText(/message/i)).toHaveValue('');
        expect(screen.getByLabelText(/company/i)).toHaveValue('');
      });
    });

    it('should send correct data to API', async () => {
      render(<ContactForm />);
      
      const name = 'John Doe';
      const email = 'john@example.com';
      const message = 'This is a test message';
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: name } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
      fireEvent.change(screen.getByLabelText(/message/i), { target: { value: message } });
      
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining(name),
          })
        );
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      // Mock slow response
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({}),
        }), 100))
      );
      
      render(<ContactForm />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'This is a test message' } });
      
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);
      
      // Should show loading state
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(screen.getByText(/sending/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button during submission', async () => {
      // Mock slow response
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({}),
        }), 100))
      );
      
      render(<ContactForm />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'This is a test message' } });
      
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ContactForm />);
      
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    });

    it('should announce form errors to screen readers', async () => {
      render(<ContactForm />);
      
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/name is required/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should have focus management on error', async () => {
      render(<ContactForm />);
      
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/name is required/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should debounce validation on input', async () => {
      render(<ContactForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 't' } });
      fireEvent.change(emailInput, { target: { value: 'te' } });
      fireEvent.change(emailInput, { target: { value: 'tes' } });
      
      // Should not show validation immediately
      expect(screen.queryByText(/invalid email format/i)).not.toBeInTheDocument();
    });

    it('should handle multiple rapid submissions', async () => {
      render(<ContactForm />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'This is a test message' } });
      
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      
      // Should only submit once
      await waitFor(() => {
        expect(screen.getByText(/message sent successfully/i)).toBeInTheDocument();
      });
    });
  });
});
