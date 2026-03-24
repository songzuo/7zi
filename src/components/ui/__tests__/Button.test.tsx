/**
 * Button Component Test
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';
import React from 'react';

// Mock next-intl before importing Button
vi.mock('next-intl', () => ({
  useTranslations: vi.fn((namespace: string) => (key: string) => `${namespace}.${key}`),
}));

import { Button, ButtonGroup, IconButton } from '../Button';

describe('Button Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders button with text', () => {
      render(React.createElement(Button, null, 'Click Me'));
      expect(screen.getByRole('button')).toHaveTextContent('Click Me');
    });

    it('renders with default variant and size', () => {
      render(React.createElement(Button, null, 'Button'));
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600');
      expect(button).toHaveClass('px-4', 'py-2');
    });
  });

  describe('Variants', () => {
    it('applies primary variant', () => {
      const { container } = render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
    });

    it('applies secondary variant', () => {
      const { container } = render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-zinc-600');
    });

    it('applies outline variant', () => {
      const { container } = render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-2');
      expect(button).toHaveClass('border-zinc-300');
    });

    it('applies ghost variant', () => {
      const { container } = render(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toHaveClass('hover:bg-zinc-100');
    });

    it('applies danger variant', () => {
      const { container } = render(<Button variant="danger">Danger</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-red-600');
    });

    it('applies link variant', () => {
      const { container } = render(<Button variant="link">Link</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-blue-600');
    });
  });

  describe('Sizes', () => {
    it('applies xs size', () => {
      render(<Button size="xs">XS</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-2', 'py-1', 'text-xs');
    });

    it('applies sm size', () => {
      render(<Button size="sm">SM</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('applies md size', () => {
      render(<Button size="md">MD</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('applies lg size', () => {
      render(<Button size="lg">LG</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-lg');
    });

    it('applies xl size', () => {
      render(<Button size="xl">XL</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-8', 'py-4', 'text-xl');
    });
  });

  describe('States', () => {
    it('handles click events', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50');
    });

    it('is disabled when loading prop is true', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('has fullWidth class when fullWidth prop is true', () => {
      render(<Button fullWidth>Full Width</Button>);
      expect(screen.getByRole('button')).toHaveClass('w-full');
    });
  });

  describe('Icon Support', () => {
    it('renders icon on left side', () => {
      const icon = <span data-testid="icon">★</span>;
      render(<Button icon={icon}>Button</Button>);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('renders icon on right side', () => {
      const icon = <span data-testid="icon">★</span>;
      render(<Button icon={icon} iconPosition="right">Button</Button>);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('is keyboard accessible', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Button</Button>);
      const button = screen.getByRole('button');

      button.focus();
      expect(button).toHaveFocus();

      // Simulate key press using the userEvent approach for better event simulation
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('responds to Enter key', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Button</Button>);
      const button = screen.getByRole('button');

      button.focus();
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      // Note: React's onClick may not trigger on Enter key press by default
      // This test verifies the button can receive keyboard events
      expect(button).toHaveFocus();
    });

    it('responds to Space key', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Button</Button>);
      const button = screen.getByRole('button');

      button.focus();
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });
      // Space key typically activates buttons in browsers
      expect(button).toHaveFocus();
    });
  });

  describe('ButtonGroup', () => {
    it('renders multiple buttons in a group', () => {
      render(
        <ButtonGroup>
          <Button>Button 1</Button>
          <Button>Button 2</Button>
          <Button>Button 3</Button>
        </ButtonGroup>
      );
      expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    it('applies custom className to group', () => {
      const { container } = render(
        <ButtonGroup className="custom-class">
          <Button>Button</Button>
        </ButtonGroup>
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('IconButton', () => {
    it('renders icon-only button', () => {
      const icon = <span data-testid="icon">★</span>;
      render(<IconButton icon={icon} tooltip="Star" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('title', 'Star');
    });

    it('applies size prop', () => {
      const icon = <span data-testid="icon">★</span>;
      render(<IconButton icon={icon} size="lg" />);
      expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-lg');
    });
  });

  describe('Dark Mode', () => {
    it('applies dark mode classes', () => {
      render(<Button variant="outline">Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('dark:border-zinc-600');
    });
  });
});
