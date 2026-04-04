/**
 * Unit tests for ShortcutTooltip component
 */

import { render, screen } from '@testing-library/react';
import ShortcutTooltip, { ShortcutBadge, KeyboardKey } from '../ShortcutTooltip';

describe('ShortcutTooltip', () => {
  it('renders shortcut with default props', () => {
    render(<ShortcutTooltip shortcut="cmd+k" />);
    expect(screen.getByText('⌘')).toBeInTheDocument();
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('renders shortcut with description', () => {
    render(<ShortcutTooltip shortcut="cmd+s" description="Save" />);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    const { rerender } = render(<ShortcutTooltip shortcut="cmd+k" size="sm" />);
    expect(screen.getByText('⌘')).toHaveClass('text-xs');

    rerender(<ShortcutTooltip shortcut="cmd+k" size="lg" />);
    expect(screen.getByText('⌘')).toHaveClass('text-base');
  });

  it('formats modifier keys correctly', () => {
    render(<ShortcutTooltip shortcut="ctrl+shift+alt+k" />);
    expect(screen.getByText('Ctrl')).toBeInTheDocument();
    expect(screen.getByText('⇧')).toBeInTheDocument();
    expect(screen.getByText('⌥')).toBeInTheDocument();
  });

  it('renders without icon when showIcon is false', () => {
    render(<ShortcutTooltip shortcut="cmd+k" showIcon={false} />);
    const icons = screen.queryAllByRole('img');
    expect(icons.length).toBe(0);
  });
});

describe('ShortcutBadge', () => {
  it('renders compact badge', () => {
    render(<ShortcutBadge shortcut="cmd+k" />);
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    const { container } = render(<ShortcutBadge shortcut="cmd+k" size="md" />);
    expect(container.firstChild).toHaveClass('text-xs');
  });
});

describe('KeyboardKey', () => {
  it('renders keyboard key', () => {
    render(<KeyboardKey keyDisplay="K" />);
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('shows pressed state', () => {
    const { container } = render(<KeyboardKey keyDisplay="K" pressed={true} />);
    expect(container.firstChild).toHaveClass('bg-blue-500');
  });

  it('formats special keys', () => {
    render(<KeyboardKey keyDisplay="enter" />);
    expect(screen.getByText('↵')).toBeInTheDocument();
  });
});