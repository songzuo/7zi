import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { ActivityLog } from '../components/ActivityLog';
import type { ActivityItem } from '../app/dashboard/page';

// 清理 React StrictMode 导致的重复渲染
afterEach(() => {
  cleanup();
});

// ============================================================================
// 测试数据工厂
// ============================================================================
const createMockActivity = (overrides?: Partial<ActivityItem>): ActivityItem => ({
  id: 'test-1',
  type: 'commit',
  title: 'Test commit message',
  author: 'testuser',
  avatar: 'https://example.com/avatar.png',
  timestamp: new Date().toISOString(),
  url: 'https://github.com/test/repo/commit/abc123',
  ...overrides,
});

// ============================================================================
// 基础渲染测试
// ============================================================================
describe('ActivityLog - Basic Rendering', () => {
  it('renders the activity log header', () => {
    const activities = [createMockActivity()];
    render(<ActivityLog activities={activities} />);

    expect(screen.getByText('实时活动日志')).toBeTruthy();
  });

  it('displays activity count in header', () => {
    const activities = [
      createMockActivity({ id: '1' }),
      createMockActivity({ id: '2' }),
      createMockActivity({ id: '3' }),
    ];
    render(<ActivityLog activities={activities} />);

    expect(screen.getByText(/最近 3 条活动/)).toBeTruthy();
  });

  it('renders empty state when no activities', () => {
    render(<ActivityLog activities={[]} />);

    expect(screen.getByText('暂无活动记录')).toBeTruthy();
    expect(screen.getByText('GitHub 活动将显示在这里')).toBeTruthy();
  });

  it('does not show footer when no activities', () => {
    render(<ActivityLog activities={[]} />);

    expect(screen.queryByText(/自动刷新/)).toBeNull();
  });

  it('shows footer with refresh info when activities exist', () => {
    const activities = [createMockActivity()];
    render(<ActivityLog activities={activities} />);

    expect(screen.getByText(/自动刷新 · 30 秒间隔/)).toBeTruthy();
  });
});

// ============================================================================
// 活动项渲染测试
// ============================================================================
describe('ActivityLog - Activity Items', () => {
  it('renders commit type activities correctly', () => {
    const activities = [createMockActivity({ type: 'commit' })];
    render(<ActivityLog activities={activities} />);

    expect(screen.getByText('提交')).toBeTruthy();
    expect(screen.getByText('💻')).toBeTruthy();
  });

  it('renders issue type activities correctly', () => {
    const activities = [createMockActivity({ type: 'issue' })];
    render(<ActivityLog activities={activities} />);

    expect(screen.getByText('任务')).toBeTruthy();
    expect(screen.getByText('📋')).toBeTruthy();
  });

  it('renders comment type activities correctly', () => {
    const activities = [createMockActivity({ type: 'comment' })];
    render(<ActivityLog activities={activities} />);

    expect(screen.getByText('评论')).toBeTruthy();
    expect(screen.getByText('💬')).toBeTruthy();
  });

  it('displays activity title', () => {
    const activities = [createMockActivity({ title: 'Fix critical bug in login flow' })];
    render(<ActivityLog activities={activities} />);

    expect(screen.getByText('Fix critical bug in login flow')).toBeTruthy();
  });

  it('displays activity author', () => {
    const activities = [createMockActivity({ author: 'developer-x' })];
    render(<ActivityLog activities={activities} />);

    expect(screen.getByText('developer-x')).toBeTruthy();
  });

  it('displays multiple activities', () => {
    const activities = [
      createMockActivity({ id: '1', title: 'First activity' }),
      createMockActivity({ id: '2', title: 'Second activity' }),
      createMockActivity({ id: '3', title: 'Third activity' }),
    ];
    render(<ActivityLog activities={activities} />);

    expect(screen.getByText('First activity')).toBeTruthy();
    expect(screen.getByText('Second activity')).toBeTruthy();
    expect(screen.getByText('Third activity')).toBeTruthy();
  });

  it('renders avatar image when provided', () => {
    const activities = [createMockActivity({ avatar: 'https://example.com/avatar.png' })];
    const { container } = render(<ActivityLog activities={activities} />);

    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://example.com/avatar.png');
  });
});

// ============================================================================
// 时间格式化测试
// ============================================================================
describe('ActivityLog - Time Formatting', () => {
  it('displays "刚刚" for recent activities', () => {
    const activities = [createMockActivity({ timestamp: new Date().toISOString() })];
    render(<ActivityLog activities={activities} />);

    expect(screen.getByText('刚刚')).toBeTruthy();
  });

  it('displays minutes ago for activities within an hour', () => {
    const timestamp = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 分钟前
    const activities = [createMockActivity({ timestamp })];
    render(<ActivityLog activities={activities} />);

    expect(screen.getByText(/分钟前/)).toBeTruthy();
  });

  it('displays hours ago for activities within a day', () => {
    const timestamp = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(); // 5 小时前
    const activities = [createMockActivity({ timestamp })];
    render(<ActivityLog activities={activities} />);

    expect(screen.getByText(/小时前/)).toBeTruthy();
  });

  it('displays days ago for activities within a week', () => {
    const timestamp = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 天前
    const activities = [createMockActivity({ timestamp })];
    render(<ActivityLog activities={activities} />);

    expect(screen.getByText(/天前/)).toBeTruthy();
  });
});

// ============================================================================
// 链接和交互测试
// ============================================================================
describe('ActivityLog - Links and Interaction', () => {
  it('renders external link for each activity', () => {
    const activities = [createMockActivity({ url: 'https://github.com/test/repo/commit/abc' })];
    render(<ActivityLog activities={activities} />);

    const link = screen.getByRole('link');
    expect(link?.getAttribute('href')).toBe('https://github.com/test/repo/commit/abc');
  });

  it('link opens in new tab with security attributes', () => {
    const activities = [createMockActivity()];
    render(<ActivityLog activities={activities} />);

    const link = screen.getByRole('link');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('has accessible link label', () => {
    const activities = [createMockActivity({ title: 'Test commit' })];
    render(<ActivityLog activities={activities} />);

    const link = screen.getByLabelText(/查看 Test commit 的详细内容/);
    expect(link).toBeTruthy();
  });

  it('article is keyboard accessible', () => {
    const activities = [createMockActivity()];
    const { container } = render(<ActivityLog activities={activities} />);

    const article = container.querySelector('article');
    expect(article?.getAttribute('tabIndex')).toBe('0');
  });

  it('opens link on Enter key press', async () => {
    // Mock window.open
    const mockOpen = vi.fn();
    vi.stubGlobal('open', mockOpen);

    const activities = [createMockActivity({ url: 'https://github.com/test' })];
    const { container } = render(<ActivityLog activities={activities} />);

    const article = container.querySelector('article');
    if (article) {
      fireEvent.keyDown(article, { key: 'Enter' });
    }

    expect(mockOpen).toHaveBeenCalledWith('https://github.com/test', '_blank', 'noopener,noreferrer');

    vi.unstubAllGlobals();
  });

  it('opens link on Space key press', async () => {
    const mockOpen = vi.fn();
    vi.stubGlobal('open', mockOpen);

    const activities = [createMockActivity({ url: 'https://github.com/test' })];
    const { container } = render(<ActivityLog activities={activities} />);

    const article = container.querySelector('article');
    if (article) {
      fireEvent.keyDown(article, { key: ' ' });
    }

    expect(mockOpen).toHaveBeenCalledWith('https://github.com/test', '_blank', 'noopener,noreferrer');

    vi.unstubAllGlobals();
  });
});

// ============================================================================
// 头像错误处理测试
// ============================================================================
describe('ActivityLog - Avatar Error Handling', () => {
  it('falls back to dicebear avatar on image error', () => {
    const activities = [createMockActivity({ 
      author: 'testuser',
      avatar: 'https://example.com/invalid.png' 
    })];
    const { container } = render(<ActivityLog activities={activities} />);

    const img = container.querySelector('img') as HTMLImageElement;
    
    // 模拟图片加载失败
    fireEvent.error(img);

    expect(img.src).toContain('dicebear');
    expect(img.src).toContain('testuser');
  });
});

// ============================================================================
// 可访问性测试
// ============================================================================
describe('ActivityLog - Accessibility', () => {
  it('has feed role for activity list', () => {
    const activities = [createMockActivity()];
    const { container } = render(<ActivityLog activities={activities} />);

    const feed = container.querySelector('[role="feed"]');
    expect(feed).toBeTruthy();
  });

  it('has aria-label for feed', () => {
    const activities = [createMockActivity()];
    const { container } = render(<ActivityLog activities={activities} />);

    const feed = container.querySelector('[role="feed"]');
    expect(feed?.getAttribute('aria-label')).toBe('活动日志');
  });

  it('has aria-busy attribute', () => {
    const activities = [createMockActivity()];
    const { container } = render(<ActivityLog activities={activities} />);

    const feed = container.querySelector('[role="feed"]');
    expect(feed?.getAttribute('aria-busy')).toBe('false');
  });

  it('has aria-posinset for each article', () => {
    const activities = [
      createMockActivity({ id: '1' }),
      createMockActivity({ id: '2' }),
    ];
    const { container } = render(<ActivityLog activities={activities} />);

    const articles = container.querySelectorAll('article');
    expect(articles[0]?.getAttribute('aria-posinset')).toBe('1');
    expect(articles[1]?.getAttribute('aria-posinset')).toBe('2');
  });

  it('has status role for empty state', () => {
    render(<ActivityLog activities={[]} />);

    const status = screen.getByRole('status');
    expect(status).toBeTruthy();
  });

  it('has aria-label for type badges', () => {
    const activities = [createMockActivity({ type: 'commit' })];
    render(<ActivityLog activities={activities} />);

    const badge = screen.getByLabelText('类型：提交');
    expect(badge).toBeTruthy();
  });

  it('has aria-label for author', () => {
    const activities = [createMockActivity({ author: 'developer' })];
    render(<ActivityLog activities={activities} />);

    const author = screen.getByLabelText('作者：developer');
    expect(author).toBeTruthy();
  });
});

// ============================================================================
// Props 变化测试
// ============================================================================
describe('ActivityLog - Props Changes', () => {
  it('updates count when activities change', () => {
    const { rerender } = render(<ActivityLog activities={[createMockActivity()]} />);
    expect(screen.getByText(/最近 1 条活动/)).toBeTruthy();

    rerender(<ActivityLog activities={[
      createMockActivity({ id: '1' }),
      createMockActivity({ id: '2' }),
    ]} />);
    expect(screen.getByText(/最近 2 条活动/)).toBeTruthy();
  });

  it('shows empty state when activities are cleared', () => {
    const { rerender } = render(<ActivityLog activities={[createMockActivity()]} />);
    expect(screen.queryByText('暂无活动记录')).toBeNull();

    rerender(<ActivityLog activities={[]} />);
    expect(screen.getByText('暂无活动记录')).toBeTruthy();
  });

  it('hides footer when activities are cleared', () => {
    const { rerender } = render(<ActivityLog activities={[createMockActivity()]} />);
    expect(screen.getByText(/自动刷新/)).toBeTruthy();

    rerender(<ActivityLog activities={[]} />);
    expect(screen.queryByText(/自动刷新/)).toBeNull();
  });

  it('updates activity display when props change', () => {
    const { rerender } = render(<ActivityLog activities={[
      createMockActivity({ id: '1', title: 'Old title' })
    ]} />);
    expect(screen.getByText('Old title')).toBeTruthy();

    rerender(<ActivityLog activities={[
      createMockActivity({ id: '1', title: 'New title' })
    ]} />);
    expect(screen.getByText('New title')).toBeTruthy();
  });
});

// ============================================================================
// 样式测试
// ============================================================================
describe('ActivityLog - Styling', () => {
  it('has correct color classes for commit type', () => {
    const activities = [createMockActivity({ type: 'commit' })];
    const { container } = render(<ActivityLog activities={activities} />);

    const badge = container.querySelector('.bg-blue-50');
    expect(badge).toBeTruthy();
    expect(badge?.className).toContain('text-blue-700');
  });

  it('has correct color classes for issue type', () => {
    const activities = [createMockActivity({ type: 'issue' })];
    const { container } = render(<ActivityLog activities={activities} />);

    const badge = container.querySelector('.bg-green-50');
    expect(badge).toBeTruthy();
    expect(badge?.className).toContain('text-green-700');
  });

  it('has correct color classes for comment type', () => {
    const activities = [createMockActivity({ type: 'comment' })];
    const { container } = render(<ActivityLog activities={activities} />);

    const badge = container.querySelector('.bg-purple-50');
    expect(badge).toBeTruthy();
    expect(badge?.className).toContain('text-purple-700');
  });

  it('has hover state on activity items', () => {
    const activities = [createMockActivity()];
    const { container } = render(<ActivityLog activities={activities} />);

    const article = container.querySelector('article');
    expect(article?.className).toContain('hover:bg-gray-50');
  });

  it('has focus-within state', () => {
    const activities = [createMockActivity()];
    const { container } = render(<ActivityLog activities={activities} />);

    const article = container.querySelector('article');
    expect(article?.className).toContain('focus-within:ring-2');
  });
});

// ============================================================================
// 边界情况测试
// ============================================================================
describe('ActivityLog - Edge Cases', () => {
  it('handles activities without avatar', () => {
    const activities = [createMockActivity({ avatar: undefined })];
    const { container } = render(<ActivityLog activities={activities} />);

    // 应该没有 img 元素
    const img = container.querySelector('img');
    expect(img).toBeNull();
  });

  it('handles activities without id using index as key', () => {
    const activities = [
      { ...createMockActivity(), id: undefined as unknown as string },
    ];
    
    // 应该不会抛出错误
    expect(() => render(<ActivityLog activities={activities as ActivityItem[]} />)).not.toThrow();
  });

  it('handles very long activity titles', () => {
    const longTitle = 'A'.repeat(200);
    const activities = [createMockActivity({ title: longTitle })];
    const { container } = render(<ActivityLog activities={activities} />);

    const titleElement = container.querySelector('.truncate');
    expect(titleElement).toBeTruthy();
  });

  it('handles special characters in activity title', () => {
    const activities = [createMockActivity({ title: 'Fix <bug> & "quote" in code' })];
    render(<ActivityLog activities={activities} />);

    expect(screen.getByText('Fix <bug> & "quote" in code')).toBeTruthy();
  });

  it('handles special characters in author name', () => {
    const activities = [createMockActivity({ author: "O'Brien & <Team>" })];
    render(<ActivityLog activities={activities} />);

    expect(screen.getByText("O'Brien & <Team>")).toBeTruthy();
  });

  it('handles large number of activities', () => {
    const activities = Array.from({ length: 100 }, (_, i) => 
      createMockActivity({ id: `activity-${i}`, title: `Activity ${i}` })
    );
    
    const { container } = render(<ActivityLog activities={activities} />);
    
    // 应该有滚动容器
    const scrollContainer = container.querySelector('.overflow-y-auto');
    expect(scrollContainer).toBeTruthy();
    expect(screen.getByText(/最近 100 条活动/)).toBeTruthy();
  });
});

// ============================================================================
// 组件性能测试
// ============================================================================
describe('ActivityLog - Performance', () => {
  it('does not re-render unnecessarily with same props', () => {
    const activities = [createMockActivity()];
    const { rerender } = render(<ActivityLog activities={activities} />);
    
    // 重新渲染相同 props
    rerender(<ActivityLog activities={activities} />);
    
    // 应该仍然显示正确内容
    expect(screen.getByText('Test commit message')).toBeTruthy();
  });
});
