import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ToggleSwitch from '@/components/UserSettings/ToggleSwitch';

describe('ToggleSwitch', () => {
  const mockOnChange = vi.fn();

  it('renders in unchecked state by default', () => {
    render(<ToggleSwitch checked={false} onChange={mockOnChange} />);
    const switchButton = screen.getByRole('switch');
    expect(switchButton).not.toHaveClass('bg-cyan-500');
    expect(switchButton).toHaveAttribute('aria-checked', 'false');
  });

  it('renders in checked state when checked is true', () => {
    render(<ToggleSwitch checked={true} onChange={mockOnChange} />);
    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveClass('bg-cyan-500');
    expect(switchButton).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange when clicked and not disabled', () => {
    render(<ToggleSwitch checked={false} onChange={mockOnChange} />);
    const switchButton = screen.getByRole('switch');
    fireEvent.click(switchButton);
    expect(mockOnChange).toHaveBeenCalledWith(true);
  });

  it('does not call onChange when disabled', () => {
    render(<ToggleSwitch checked={false} onChange={mockOnChange} disabled={true} />);
    const switchButton = screen.getByRole('switch');
    fireEvent.click(switchButton);
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('has correct visual state when disabled', () => {
    render(<ToggleSwitch checked={true} onChange={mockOnChange} disabled={true} />);
    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveClass('opacity-50');
    expect(switchButton).toHaveClass('cursor-not-allowed');
  });

  it('applies aria-label when provided', () => {
    render(<ToggleSwitch checked={false} onChange={mockOnChange} label="Test Label" />);
    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveAttribute('aria-label', 'Test Label');
  });
});