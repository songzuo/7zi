/**
 * @fileoverview Shared UI components tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  StatusBadge,
  ProgressBar,
  Avatar,
  Card,
  EmptyState,
  StatCard,
  TimeAgo,
} from '@/components/shared/ui';
import { MemberStatus } from '@/types';

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, width, height, className, unoptimized }: {
    src: string; alt: string; width: number; height: number; className?: string; unoptimized?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      data-unoptimized={unoptimized ? 'true' : undefined}
    />
  ),
}));

// Mock date lib
vi.mock('@/lib/date', () => ({
  formatTimeAgo: vi.fn((date: string | Date) => `formatted-${date}`),
}));

// Mock STATUS_CONFIG
vi.mock('@/types', () => ({
  MemberStatus: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    BUSY: 'busy',
    AWAY: 'away',
  },
  STATUS_CONFIG: {
    online: { label: '在线', color: 'bg-green-500', bgColor: 'bg-green-100 dark:bg-green-900/30' },
    offline: { label: '离线', color: 'bg-zinc-400', bgColor: 'bg-zinc-100 dark:bg-zinc-800' },
    busy: { label: '忙碌', color: 'bg-red-500', bgColor: 'bg-red-100 dark:bg-red-900/30' },
    away: { label: '离开', color: 'bg-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  },
}));

describe('StatusBadge', () => {
  it('renders with status', () => {
    render(<StatusBadge status={'online' as MemberStatus} />);
    expect(screen.getByText('在线')).toBeInTheDocument();
  });

  it('shows dot by default', () => {
    const { container } = render(<StatusBadge status={'online' as MemberStatus} />);
    const dot = container.querySelector('.bg-green-500');
    expect(dot).toBeInTheDocument();
  });

  it('hides dot when showDot is false', () => {
    const { container } = render(<StatusBadge status={'online' as MemberStatus} showDot={false} />);
    const dot = container.querySelector('.bg-green-500');
    expect(dot).not.toBeInTheDocument();
  });

  it('applies small size class', () => {
    const { container } = render(<StatusBadge status={'online' as MemberStatus} size="sm" />);
    expect(container.querySelector('.text-xs')).toBeInTheDocument();
  });

  it('applies medium size class', () => {
    const { container } = render(<StatusBadge status={'online' as MemberStatus} size="md" />);
    expect(container.querySelector('.text-sm')).toBeInTheDocument();
  });

  it('renders different statuses', () => {
    const { rerender } = render(<StatusBadge status={'online' as MemberStatus} />);
    expect(screen.getByText('在线')).toBeInTheDocument();

    rerender(<StatusBadge status={'offline' as MemberStatus} />);
    expect(screen.getByText('离线')).toBeInTheDocument();

    rerender(<StatusBadge status={'busy' as MemberStatus} />);
    expect(screen.getByText('忙碌')).toBeInTheDocument();

    rerender(<StatusBadge status={'away' as MemberStatus} />);
    expect(screen.getByText('离开')).toBeInTheDocument();
  });
});

describe('ProgressBar', () => {
  it('renders progress bar', () => {
    const { container } = render(<ProgressBar progress={50} />);
    const bar = container.querySelector('.bg-gradient-to-r');
    expect(bar).toBeInTheDocument();
  });

  it('applies progress width', () => {
    const { container } = render(<ProgressBar progress={75} />);
    const bar = container.querySelector('[style*="width: 75%"]');
    expect(bar).toBeInTheDocument();
  });

  it('clamps progress to 0-100', () => {
    const { container, rerender } = render(<ProgressBar progress={150} />);
    let bar = container.querySelector('[style*="width: 100%"]');
    expect(bar).toBeInTheDocument();

    rerender(<ProgressBar progress={-10} />);
    bar = container.querySelector('[style*="width: 0%"]');
    expect(bar).toBeInTheDocument();
  });

  it('shows label when showLabel is true', () => {
    render(<ProgressBar progress={50} showLabel />);
    expect(screen.getByText('进度')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('hides label by default', () => {
    render(<ProgressBar progress={50} />);
    expect(screen.queryByText('进度')).not.toBeInTheDocument();
  });

  it('applies different colors', () => {
    const { container, rerender } = render(<ProgressBar progress={50} color="default" />);
    expect(container.querySelector('.from-cyan-500')).toBeInTheDocument();

    rerender(<ProgressBar progress={50} color="success" />);
    expect(container.querySelector('.from-blue-500')).toBeInTheDocument();

    rerender(<ProgressBar progress={50} color="warning" />);
    expect(container.querySelector('.from-yellow-500')).toBeInTheDocument();
  });

  it('applies different sizes', () => {
    const { container, rerender } = render(<ProgressBar progress={50} size="sm" />);
    expect(container.querySelector('.h-1\\.5')).toBeInTheDocument();

    rerender(<ProgressBar progress={50} size="md" />);
    expect(container.querySelector('.h-2')).toBeInTheDocument();

    rerender(<ProgressBar progress={50} size="lg" />);
    expect(container.querySelector('.h-3')).toBeInTheDocument();
  });

  it('applies animated class by default', () => {
    const { container } = render(<ProgressBar progress={50} />);
    expect(container.querySelector('.transition-all')).toBeInTheDocument();
  });

  it('removes animated class when animated is false', () => {
    const { container } = render(<ProgressBar progress={50} animated={false} />);
    expect(container.querySelector('.transition-all')).not.toBeInTheDocument();
  });
});

describe('Avatar', () => {
  it('renders with image src', () => {
    render(<Avatar src="/test.jpg" name="Test User" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/test.jpg');
    expect(img).toHaveAttribute('alt', 'Test User');
  });

  it('renders fallback with first letter of name', () => {
    const { container } = render(<Avatar name="John Doe" />);
    expect(screen.getByText('J')).toBeInTheDocument();
    expect(container.querySelector('.rounded-full')).toBeInTheDocument();
  });

  it('renders ? for empty name', () => {
    render(<Avatar name="" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('applies different sizes', () => {
    const { container, rerender } = render(<Avatar name="Test" size="sm" />);
    let avatar = container.querySelector('[style*="width: 32px"]');
    expect(avatar).toBeInTheDocument();

    rerender(<Avatar name="Test" size="md" />);
    avatar = container.querySelector('[style*="width: 40px"]');
    expect(avatar).toBeInTheDocument();

    rerender(<Avatar name="Test" size="lg" />);
    avatar = container.querySelector('[style*="width: 48px"]');
    expect(avatar).toBeInTheDocument();

    rerender(<Avatar name="Test" size="xl" />);
    avatar = container.querySelector('[style*="width: 64px"]');
    expect(avatar).toBeInTheDocument();
  });

  it('shows status indicator when showStatus is true', () => {
    const { container } = render(
      <Avatar name="Test" status={'online' as MemberStatus} showStatus />
    );
    const statusDot = container.querySelector('.bg-green-500');
    expect(statusDot).toBeInTheDocument();
  });

  it('hides status indicator by default', () => {
    const { container } = render(
      <Avatar name="Test" status={'online' as MemberStatus} />
    );
    const statusDot = container.querySelector('.absolute.bottom-0');
    expect(statusDot).not.toBeInTheDocument();
  });
});

describe('Card', () => {
  it('renders children', () => {
    render(
      <Card>
        <div>Card content</div>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('applies hover class when hover is true', () => {
    const { container } = render(<Card hover>Content</Card>);
    expect(container.querySelector('.hover\\:shadow-xl')).toBeInTheDocument();
  });

  it('applies different padding sizes', () => {
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

describe('EmptyState', () => {
  it('renders with title', () => {
    render(<EmptyState title="No items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders default icon', () => {
    render(<EmptyState title="No items" />);
    expect(screen.getByText('📭')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    render(<EmptyState title="No items" icon="🔍" />);
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="No items" description="Add some items to get started" />);
    expect(screen.getByText('Add some items to get started')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(
      <EmptyState
        title="No items"
        action={<button>Add Item</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
  });
});

describe('StatCard', () => {
  it('renders value and label', () => {
    render(<StatCard value={42} label="Total items" />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Total items')).toBeInTheDocument();
  });

  it('renders string value', () => {
    render(<StatCard value="100+" label="Users" />);
    expect(screen.getByText('100+')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<StatCard value={42} label="Items" icon="📦" />);
    expect(screen.getByText((content) => content.includes('📦'))).toBeInTheDocument();
  });

  it('applies different colors', () => {
    const { container, rerender } = render(<StatCard value={42} label="Items" color="cyan" />);
    expect(container.querySelector('.from-cyan-400')).toBeInTheDocument();

    rerender(<StatCard value={42} label="Items" color="purple" />);
    expect(container.querySelector('.from-purple-400')).toBeInTheDocument();

    rerender(<StatCard value={42} label="Items" color="green" />);
    expect(container.querySelector('.from-green-400')).toBeInTheDocument();

    rerender(<StatCard value={42} label="Items" color="pink" />);
    expect(container.querySelector('.from-pink-400')).toBeInTheDocument();

    rerender(<StatCard value={42} label="Items" color="orange" />);
    expect(container.querySelector('.from-orange-400')).toBeInTheDocument();
  });
});

describe('TimeAgo', () => {
  it('renders formatted time', () => {
    render(<TimeAgo date="2024-01-01" />);
    expect(screen.getByText('formatted-2024-01-01')).toBeInTheDocument();
  });

  it('accepts Date object', () => {
    const date = new Date('2024-06-15');
    render(<TimeAgo date={date} />);
    expect(screen.getByText(`formatted-${date}`)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<TimeAgo date="2024-01-01" className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});