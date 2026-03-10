/**
 * @fileoverview 共享 UI 组件测试
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  StatusBadge,
  ProgressBar,
  Avatar,
  Card,
  EmptyState,
  StatCard,
  TimeAgo,
} from '@/components/shared/ui';

// ============================================================================
// StatusBadge Tests
// ============================================================================

describe('StatusBadge', () => {
  it('renders with correct status label', () => {
    render(<StatusBadge status="online" />);
    expect(screen.getByText('在线')).toBeInTheDocument();
  });

  it('renders with status dot by default', () => {
    const { container } = render(<StatusBadge status="working" />);
    // The dot should be present
    const dot = container.querySelector('.bg-green-500');
    expect(dot).toBeInTheDocument();
  });

  it('hides status dot when showDot is false', () => {
    const { container } = render(<StatusBadge status="online" showDot={false} />);
    // No dot should be visible
    expect(container.querySelector('.bg-green-500.w-2.h-2')).not.toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { container, rerender } = render(<StatusBadge status="online" size="sm" />);
    const badge = container.querySelector('.px-2');
    expect(badge).toBeInTheDocument();

    rerender(<StatusBadge status="online" size="md" />);
    const mdBadge = container.querySelector('.px-3');
    expect(mdBadge).toBeInTheDocument();
  });

  it('displays correct labels for all statuses', () => {
    const statuses = [
      { status: 'online' as const, label: '在线' },
      { status: 'working' as const, label: '工作中' },
      { status: 'busy' as const, label: '忙碌' },
      { status: 'idle' as const, label: '空闲' },
      { status: 'offline' as const, label: '离线' },
    ];

    statuses.forEach(({ status, label }) => {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });
});

// ============================================================================
// ProgressBar Tests
// ============================================================================

describe('ProgressBar', () => {
  it('renders with correct progress width', () => {
    const { container } = render(<ProgressBar progress={50} />);
    const bar = container.querySelector('[style*="width: 50%"]');
    expect(bar).toBeInTheDocument();
  });

  it('shows label when showLabel is true', () => {
    render(<ProgressBar progress={75} showLabel />);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('进度')).toBeInTheDocument();
  });

  it('hides label by default', () => {
    render(<ProgressBar progress={75} />);
    expect(screen.queryByText('75%')).not.toBeInTheDocument();
  });

  it('clamps progress to 0-100 range', () => {
    const { container, rerender } = render(<ProgressBar progress={150} />);
    expect(container.querySelector('[style*="width: 100%"]')).toBeInTheDocument();

    rerender(<ProgressBar progress={-20} />);
    expect(container.querySelector('[style*="width: 0%"]')).toBeInTheDocument();
  });

  it('applies correct color classes', () => {
    const { container, rerender } = render(<ProgressBar progress={50} color="default" />);
    expect(container.querySelector('.from-cyan-500')).toBeInTheDocument();

    rerender(<ProgressBar progress={50} color="success" />);
    expect(container.querySelector('.from-blue-500')).toBeInTheDocument();

    rerender(<ProgressBar progress={50} color="warning" />);
    expect(container.querySelector('.from-yellow-500')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { container, rerender } = render(<ProgressBar progress={50} size="sm" />);
    expect(container.querySelector('.h-1\\.5')).toBeInTheDocument();

    rerender(<ProgressBar progress={50} size="md" />);
    expect(container.querySelector('.h-2')).toBeInTheDocument();

    rerender(<ProgressBar progress={50} size="lg" />);
    expect(container.querySelector('.h-3')).toBeInTheDocument();
  });
});

// ============================================================================
// Avatar Tests
// ============================================================================

describe('Avatar', () => {
  it('renders initials when no src provided', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('capitalizes first letter of name', () => {
    render(<Avatar name="alice" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('shows question mark for empty name', () => {
    render(<Avatar name="" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { container, rerender } = render(<Avatar name="Test" size="sm" />);
    const avatar = container.querySelector('[style*="width: 32px"]');
    expect(avatar).toBeInTheDocument();

    rerender(<Avatar name="Test" size="md" />);
    expect(container.querySelector('[style*="width: 40px"]')).toBeInTheDocument();

    rerender(<Avatar name="Test" size="lg" />);
    expect(container.querySelector('[style*="width: 48px"]')).toBeInTheDocument();

    rerender(<Avatar name="Test" size="xl" />);
    expect(container.querySelector('[style*="width: 64px"]')).toBeInTheDocument();
  });

  it('shows status indicator when showStatus is true', () => {
    const { container, rerender } = render(<Avatar name="Test" status="online" showStatus={false} />);
    // Status indicator should not be visible
    expect(container.querySelector('.absolute.bottom-0.right-0')).not.toBeInTheDocument();

    rerender(<Avatar name="Test" status="online" showStatus />);
    // Status indicator should be visible
    expect(container.querySelector('.absolute.bottom-0.right-0')).toBeInTheDocument();
  });
});

// ============================================================================
// Card Tests
// ============================================================================

describe('Card', () => {
  it('renders children correctly', () => {
    render(<Card>Test Content</Card>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('applies hover class when hover is true', () => {
    const { container } = render(<Card hover>Content</Card>);
    expect(container.querySelector('.hover\\:shadow-xl')).toBeInTheDocument();
  });

  it('applies correct padding classes', () => {
    const { container, rerender } = render(<Card padding="none">Content</Card>);
    expect(container.querySelector('.p-3, .p-4, .p-6')).not.toBeInTheDocument();

    rerender(<Card padding="sm">Content</Card>);
    expect(container.querySelector('.p-3')).toBeInTheDocument();

    rerender(<Card padding="md">Content</Card>);
    expect(container.querySelector('.p-4')).toBeInTheDocument();

    rerender(<Card padding="lg">Content</Card>);
    expect(container.querySelector('.p-6')).toBeInTheDocument();
  });
});

// ============================================================================
// EmptyState Tests
// ============================================================================

describe('EmptyState', () => {
  it('renders title correctly', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="There are no items to display" />);
    expect(screen.getByText('There are no items to display')).toBeInTheDocument();
  });

  it('hides description when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByText('There are no items')).not.toBeInTheDocument();
  });

  it('renders default icon', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.getByText('📭')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    render(<EmptyState title="Empty" icon="🔍" />);
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    render(
      <EmptyState
        title="Empty"
        action={<button>Add Item</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
  });
});

// ============================================================================
// StatCard Tests
// ============================================================================

describe('StatCard', () => {
  it('renders value and label correctly', () => {
    render(<StatCard value={42} label="Total Tasks" />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Total Tasks')).toBeInTheDocument();
  });

  it('renders with icon prefix', () => {
    render(<StatCard value={10} label="Tasks" icon="📋" />);
    expect(screen.getByText(/📋/)).toBeInTheDocument();
    expect(screen.getByText(/10/)).toBeInTheDocument();
  });

  it('renders string values', () => {
    render(<StatCard value="99%" label="Completion Rate" />);
    expect(screen.getByText('99%')).toBeInTheDocument();
  });

  it('applies correct color gradients', () => {
    const { container, rerender } = render(<StatCard value={1} label="Test" color="cyan" />);
    expect(container.querySelector('.from-cyan-400')).toBeInTheDocument();

    rerender(<StatCard value={1} label="Test" color="purple" />);
    expect(container.querySelector('.from-purple-400')).toBeInTheDocument();

    rerender(<StatCard value={1} label="Test" color="green" />);
    expect(container.querySelector('.from-green-400')).toBeInTheDocument();

    rerender(<StatCard value={1} label="Test" color="pink" />);
    expect(container.querySelector('.from-pink-400')).toBeInTheDocument();

    rerender(<StatCard value={1} label="Test" color="orange" />);
    expect(container.querySelector('.from-orange-400')).toBeInTheDocument();
  });
});

// ============================================================================
// TimeAgo Tests
// ============================================================================

describe('TimeAgo', () => {
  it('formats recent time as "刚刚"', () => {
    const now = new Date();
    render(<TimeAgo date={now} />);
    expect(screen.getByText('刚刚')).toBeInTheDocument();
  });

  it('formats minutes ago correctly', () => {
    const date = new Date(Date.now() - 30 * 60 * 1000);
    render(<TimeAgo date={date} />);
    expect(screen.getByText('30分钟前')).toBeInTheDocument();
  });

  it('formats hours ago correctly', () => {
    const date = new Date(Date.now() - 5 * 60 * 60 * 1000);
    render(<TimeAgo date={date} />);
    expect(screen.getByText('5小时前')).toBeInTheDocument();
  });

  it('accepts string date', () => {
    const dateStr = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    render(<TimeAgo date={dateStr} />);
    expect(screen.getByText('2分钟前')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<TimeAgo date={new Date()} className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
