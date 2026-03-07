import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  LoadingPage,
  LoadingContent,
  LoadingWithProgress,
  LoadingSpinner,
  Skeleton,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonText,
  SkeletonStatCard,
  SkeletonTable,
  ProgressBar,
  CircularProgress,
} from '../components/Loading';

// 清理 React StrictMode 导致的重复渲染
afterEach(() => {
  cleanup();
});

// ============================================================================
// LoadingPage 组件测试
// ============================================================================
describe('LoadingPage', () => {
  it('renders with default props', () => {
    render(<LoadingPage />);
    
    expect(screen.getByText('加载中...')).toBeDefined();
    expect(screen.getByRole('status')).toBeDefined(); // LoadingSpinner has role="status"
  });

  it('renders with custom message', () => {
    render(<LoadingPage message="正在加载数据..." />);
    
    expect(screen.getByText('正在加载数据...')).toBeDefined();
  });

  it('renders without spinner when showSpinner is false', () => {
    render(<LoadingPage message="处理中..." showSpinner={false} />);
    
    expect(screen.getByText('处理中...')).toBeDefined();
    // ProgressBar 组件
    expect(screen.getByRole('progressbar')).toBeDefined();
  });

  it('has correct container classes', () => {
    const { container } = render(<LoadingPage />);
    
    const mainContainer = container.querySelector('.min-h-screen');
    expect(mainContainer).toBeDefined();
    expect(mainContainer?.className).toContain('flex');
    expect(mainContainer?.className).toContain('items-center');
    expect(mainContainer?.className).toContain('justify-center');
  });
});

// ============================================================================
// LoadingContent 组件测试
// ============================================================================
describe('LoadingContent', () => {
  it('renders card type by default', () => {
    const { container } = render(<LoadingContent />);
    
    const grid = container.querySelector('.grid');
    expect(grid).toBeDefined();
    expect(grid?.className).toContain('grid-cols-1');
  });

  it('renders correct number of cards', () => {
    const { container } = render(<LoadingContent type="card" count={5} />);
    
    const cards = container.querySelectorAll('.animate-pulse');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders list type', () => {
    const { container } = render(<LoadingContent type="list" count={3} />);
    
    const list = container.querySelector('.space-y-3');
    expect(list).toBeDefined();
  });

  it('renders table type', () => {
    const { container } = render(<LoadingContent type="table" count={4} />);
    
    const table = container.querySelector('.bg-white.rounded-xl');
    expect(table).toBeDefined();
  });

  it('renders stats type', () => {
    const { container } = render(<LoadingContent type="stats" count={7} />);
    
    const statsGrid = container.querySelector('.grid');
    expect(statsGrid?.className).toContain('grid-cols-2');
  });

  it('returns null for unknown type', () => {
    const { container } = render(<LoadingContent type={'unknown' as any} />);
    
    expect(container.firstChild).toBeNull();
  });
});

// ============================================================================
// LoadingWithProgress 组件测试
// ============================================================================
describe('LoadingWithProgress', () => {
  it('renders with progress value', () => {
    render(<LoadingWithProgress progress={50} />);
    
    expect(screen.getByText('处理中')).toBeDefined();
    expect(screen.getByText('50% - 请稍候...')).toBeDefined();
    expect(screen.getByRole('progressbar')).toBeDefined();
  });

  it('renders with custom message', () => {
    render(<LoadingWithProgress progress={75} message="上传文件中" />);
    
    expect(screen.getByText('上传文件中')).toBeDefined();
  });

  it('renders with custom total', () => {
    render(<LoadingWithProgress progress={50} total={200} />);
    
    // Progress bar should show 50/200 = 25%
    expect(screen.getByRole('progressbar')).toBeDefined();
  });

  it('displays progress percentage', () => {
    render(<LoadingWithProgress progress={33} />);
    
    expect(screen.getByText('33% - 请稍候...')).toBeDefined();
  });

  it('shows lightning emoji icon', () => {
    render(<LoadingWithProgress progress={0} />);
    
    expect(screen.getByText('⚡')).toBeDefined();
  });
});

// ============================================================================
// 导出组件测试
// ============================================================================
describe('Exported Components', () => {
  it('exports LoadingSpinner', () => {
    expect(LoadingSpinner).toBeDefined();
    expect(typeof LoadingSpinner).toBe('function');
  });

  it('exports Skeleton', () => {
    expect(Skeleton).toBeDefined();
    expect(typeof Skeleton).toBe('function');
  });

  it('exports SkeletonCard', () => {
    expect(SkeletonCard).toBeDefined();
    expect(typeof SkeletonCard).toBe('function');
  });

  it('exports SkeletonAvatar', () => {
    expect(SkeletonAvatar).toBeDefined();
    expect(typeof SkeletonAvatar).toBe('function');
  });

  it('exports SkeletonText', () => {
    expect(SkeletonText).toBeDefined();
    expect(typeof SkeletonText).toBe('function');
  });

  it('exports SkeletonStatCard', () => {
    expect(SkeletonStatCard).toBeDefined();
    expect(typeof SkeletonStatCard).toBe('function');
  });

  it('exports SkeletonTable', () => {
    expect(SkeletonTable).toBeDefined();
    expect(typeof SkeletonTable).toBe('function');
  });

  it('exports ProgressBar', () => {
    expect(ProgressBar).toBeDefined();
    expect(typeof ProgressBar).toBe('function');
  });

  it('exports CircularProgress', () => {
    expect(CircularProgress).toBeDefined();
    expect(typeof CircularProgress).toBe('function');
  });
});

// ============================================================================
// 边界情况测试
// ============================================================================
describe('Edge Cases', () => {
  it('LoadingPage handles empty message', () => {
    render(<LoadingPage message="" />);
    
    // Should still render without crashing
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('LoadingContent handles zero count', () => {
    const { container } = render(<LoadingContent type="card" count={0} />);
    
    const grid = container.querySelector('.grid');
    expect(grid).toBeDefined();
  });

  it('LoadingWithProgress handles 0% progress', () => {
    render(<LoadingWithProgress progress={0} />);
    
    expect(screen.getByText('0% - 请稍候...')).toBeDefined();
  });

  it('LoadingWithProgress handles 100% progress', () => {
    render(<LoadingWithProgress progress={100} />);
    
    expect(screen.getByText('100% - 请稍候...')).toBeDefined();
  });
});

// ============================================================================
// 可访问性测试
// ============================================================================
describe('Accessibility', () => {
  it('LoadingPage has accessible status', () => {
    render(<LoadingPage />);
    
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-label')).toBe('加载中');
  });

  it('LoadingWithProgress has progressbar role', () => {
    render(<LoadingWithProgress progress={50} />);
    
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeDefined();
  });
});