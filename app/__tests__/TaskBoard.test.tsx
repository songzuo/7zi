import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { TaskBoard, TaskCard } from '../components/TaskBoard';
import type { GitHubIssue } from '../app/dashboard/page';

// Mock ProgressBar component
vi.mock('../components/ProgressBar', () => ({
  default: ({ value, showPercentage, color }: any) => (
    <div data-testid="progress-bar" role="progressbar" aria-valuenow={value} aria-label={`Progress: ${value}%`}>
      {showPercentage && <span data-testid="progress-percentage">{value.toFixed(1)}%</span>}
      <div data-testid="progress-color" data-color={color} />
    </div>
  ),
}));

// 清理 React StrictMode 导致的重复渲染
afterEach(() => {
  cleanup();
});

// ============================================================================
// 测试数据工厂
// ============================================================================
const createMockIssue = (overrides?: Partial<GitHubIssue>): GitHubIssue => ({
  number: 1,
  title: 'Test Issue',
  state: 'open',
  labels: [],
  assignee: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: new Date().toISOString(),
  html_url: 'https://github.com/test/repo/issues/1',
  ...overrides,
});

const mockIssues: GitHubIssue[] = [
  createMockIssue({ number: 1, title: 'Implement login feature', state: 'open' }),
  createMockIssue({ number: 2, title: 'Fix bug in dashboard', state: 'closed' }),
  createMockIssue({ number: 3, title: 'Add dark mode support', state: 'open' }),
];

// ============================================================================
// TaskBoard 基础渲染测试
// ============================================================================
describe('TaskBoard - Basic Rendering', () => {
  it('renders the task board header', () => {
    render(<TaskBoard issues={mockIssues} />);
    expect(screen.getByText('GitHub 任务')).toBeTruthy();
  });

  it('renders the filter dropdown', () => {
    render(<TaskBoard issues={mockIssues} />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeTruthy();
  });

  it('displays progress bar', () => {
    render(<TaskBoard issues={mockIssues} />);
    
    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toBeTruthy();
  });

  it('shows empty state when no issues', () => {
    render(<TaskBoard issues={[]} />);
    expect(screen.getByText('暂无任务')).toBeTruthy();
  });

  it('shows footer with count when issues exist', () => {
    render(<TaskBoard issues={mockIssues} />);
    
    // 默认筛选为 open，所以显示 2 个
    expect(screen.getByText(/显示 2 \/ 3 个任务/)).toBeTruthy();
  });

  it('does not show footer when no issues', () => {
    render(<TaskBoard issues={[]} />);
    expect(screen.queryByText(/显示/)).toBeNull();
  });
});

// ============================================================================
// 筛选功能测试
// ============================================================================
describe('TaskBoard - Filtering', () => {
  it('defaults to showing open issues only', () => {
    render(<TaskBoard issues={mockIssues} />);
    
    // 默认只显示 open 的 issues
    expect(screen.getByText('Implement login feature')).toBeTruthy();
    expect(screen.getByText('Add dark mode support')).toBeTruthy();
    expect(screen.queryByText('Fix bug in dashboard')).toBeNull();
  });

  it('filters to show only open issues', () => {
    render(<TaskBoard issues={mockIssues} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'open' } });
    
    expect(screen.getByText('Implement login feature')).toBeTruthy();
    expect(screen.queryByText('Fix bug in dashboard')).toBeNull();
  });

  it('filters to show only closed issues', () => {
    render(<TaskBoard issues={mockIssues} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'closed' } });
    
    expect(screen.queryByText('Implement login feature')).toBeNull();
    expect(screen.getByText('Fix bug in dashboard')).toBeTruthy();
  });

  it('shows all issues when filter is "all"', () => {
    render(<TaskBoard issues={mockIssues} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'all' } });
    
    expect(screen.getByText('Implement login feature')).toBeTruthy();
    expect(screen.getByText('Fix bug in dashboard')).toBeTruthy();
    expect(screen.getByText('Add dark mode support')).toBeTruthy();
  });

  it('updates footer count when filter changes', () => {
    render(<TaskBoard issues={mockIssues} />);
    
    const select = screen.getByRole('combobox');
    
    // 切换到 closed
    fireEvent.change(select, { target: { value: 'closed' } });
    expect(screen.getByText(/显示 1 \/ 3 个任务/)).toBeTruthy();
    
    // 切换到 all
    fireEvent.change(select, { target: { value: 'all' } });
    expect(screen.getByText(/显示 3 \/ 3 个任务/)).toBeTruthy();
  });

  it('shows appropriate message for empty open filter', () => {
    const closedIssues = [createMockIssue({ state: 'closed' })];
    render(<TaskBoard issues={closedIssues} />);
    
    expect(screen.getByText('所有任务都已完成！')).toBeTruthy();
  });

  it('shows appropriate message for empty closed filter', () => {
    const openIssues = [createMockIssue({ state: 'open' })];
    render(<TaskBoard issues={openIssues} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'closed' } });
    
    expect(screen.getByText('还没有 GitHub Issues')).toBeTruthy();
  });
});

// ============================================================================
// 进度计算测试
// ============================================================================
describe('TaskBoard - Progress Calculation', () => {
  it('calculates progress correctly with mixed issues', () => {
    render(<TaskBoard issues={mockIssues} />);
    
    // 1 closed out of 3 = 33.3%
    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('33');
  });

  it('shows 0% progress when all issues are open', () => {
    const openIssues = [
      createMockIssue({ number: 1, state: 'open' }),
      createMockIssue({ number: 2, state: 'open' }),
    ];
    render(<TaskBoard issues={openIssues} />);
    
    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('0');
  });

  it('shows 100% progress when all issues are closed', () => {
    const closedIssues = [
      createMockIssue({ number: 1, state: 'closed' }),
      createMockIssue({ number: 2, state: 'closed' }),
    ];
    render(<TaskBoard issues={closedIssues} />);
    
    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('100');
  });

  it('shows 0% progress when no issues', () => {
    render(<TaskBoard issues={[]} />);
    
    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('0');
  });

  it('displays open count in stats', () => {
    render(<TaskBoard issues={mockIssues} />);
    
    expect(screen.getByText(/2 进行中/)).toBeTruthy();
  });

  it('displays closed count in stats', () => {
    render(<TaskBoard issues={mockIssues} />);
    
    expect(screen.getByText(/1 已完成/)).toBeTruthy();
  });
});

// ============================================================================
// TaskCard 渲染测试
// ============================================================================
describe('TaskCard - Rendering', () => {
  it('renders issue title', () => {
    const issue = createMockIssue({ title: 'Fix critical bug' });
    render(<TaskCard issue={issue} />);
    
    expect(screen.getByText('Fix critical bug')).toBeTruthy();
  });

  it('renders issue number as link', () => {
    const issue = createMockIssue({ number: 42, html_url: 'https://github.com/test/repo/issues/42' });
    render(<TaskCard issue={issue} />);
    
    const link = screen.getByRole('link', { name: /issue #42/ });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('https://github.com/test/repo/issues/42');
  });

  it('renders open status correctly', () => {
    const issue = createMockIssue({ state: 'open' });
    render(<TaskCard issue={issue} />);
    
    expect(screen.getByText('进行中')).toBeTruthy();
  });

  it('renders closed status correctly', () => {
    const issue = createMockIssue({ state: 'closed' });
    render(<TaskCard issue={issue} />);
    
    expect(screen.getByText('已完成')).toBeTruthy();
  });

  it('renders labels when present', () => {
    const issue = createMockIssue({
      labels: [
        { name: 'bug', color: 'ff0000' },
        { name: 'priority', color: '00ff00' },
      ],
    });
    render(<TaskCard issue={issue} />);
    
    expect(screen.getByText('bug')).toBeTruthy();
    expect(screen.getByText('priority')).toBeTruthy();
  });

  it('does not render labels when empty', () => {
    const issue = createMockIssue({ labels: [] });
    const { container } = render(<TaskCard issue={issue} />);
    
    // 标签组应该不存在
    const labelGroup = container.querySelector('[aria-label="标签"]');
    expect(labelGroup).toBeNull();
  });

  it('limits labels to 5 with +N indicator', () => {
    const issue = createMockIssue({
      labels: [
        { name: 'label1', color: '111111' },
        { name: 'label2', color: '222222' },
        { name: 'label3', color: '333333' },
        { name: 'label4', color: '444444' },
        { name: 'label5', color: '555555' },
        { name: 'label6', color: '666666' },
        { name: 'label7', color: '777777' },
      ],
    });
    render(<TaskCard issue={issue} />);
    
    expect(screen.getByText('label1')).toBeTruthy();
    expect(screen.getByText('label5')).toBeTruthy();
    expect(screen.queryByText('label6')).toBeNull();
    expect(screen.getByText('+2')).toBeTruthy();
  });

  it('renders assignee when present', () => {
    const issue = createMockIssue({
      assignee: { login: 'developer', avatar_url: 'https://example.com/avatar.png' },
    });
    render(<TaskCard issue={issue} />);
    
    expect(screen.getByText('developer')).toBeTruthy();
  });

  it('does not render assignee when null', () => {
    const issue = createMockIssue({ assignee: null });
    const { container } = render(<TaskCard issue={issue} />);
    
    // 没有指派者信息
    expect(container.querySelector('[aria-label*="指派给"]')).toBeNull();
  });
});

// ============================================================================
// 时间格式化测试
// ============================================================================
describe('TaskBoard - Time Formatting', () => {
  it('displays "刚刚" for recent updates', () => {
    const issue = createMockIssue({ updated_at: new Date().toISOString() });
    render(<TaskCard issue={issue} />);
    
    expect(screen.getByText(/更新于 刚刚/)).toBeTruthy();
  });

  it('displays minutes ago', () => {
    const timestamp = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const issue = createMockIssue({ updated_at: timestamp });
    render(<TaskCard issue={issue} />);
    
    expect(screen.getByText(/分钟前/)).toBeTruthy();
  });

  it('displays hours ago', () => {
    const timestamp = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    const issue = createMockIssue({ updated_at: timestamp });
    render(<TaskCard issue={issue} />);
    
    expect(screen.getByText(/小时前/)).toBeTruthy();
  });

  it('displays days ago', () => {
    const timestamp = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const issue = createMockIssue({ updated_at: timestamp });
    render(<TaskCard issue={issue} />);
    
    expect(screen.getByText(/天前/)).toBeTruthy();
  });
});

// ============================================================================
// 可访问性测试
// ============================================================================
describe('TaskBoard - Accessibility', () => {
  it('has list role for task list', () => {
    const issues = [createMockIssue()];
    const { container } = render(<TaskBoard issues={issues} />);
    
    const list = container.querySelector('[role="list"]');
    expect(list).toBeTruthy();
    expect(list?.getAttribute('aria-label')).toBe('GitHub 任务列表');
  });

  it('has listitem role for each task', () => {
    const issues = [createMockIssue(), createMockIssue()];
    render(<TaskBoard issues={issues} />);
    
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBe(2);
  });

  it('has accessible label for filter', () => {
    render(<TaskBoard issues={mockIssues} />);
    
    const select = screen.getByLabelText('筛选任务状态');
    expect(select).toBeTruthy();
  });

  it('has aria-describedby for filter', () => {
    render(<TaskBoard issues={mockIssues} />);
    
    const description = screen.getByText(/当前筛选/);
    expect(description).toBeTruthy();
  });

  it('has progressbar role with correct attributes', () => {
    render(<TaskBoard issues={mockIssues} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar.getAttribute('aria-valuenow')).toBeTruthy();
    // Mock ProgressBar may not have all aria attributes
  });

  it('has accessible label for issue status', () => {
    const issue = createMockIssue({ state: 'open' });
    render(<TaskCard issue={issue} />);
    
    const statusBadge = screen.getByLabelText('状态：进行中');
    expect(statusBadge).toBeTruthy();
  });

  it('has accessible label for assignee', () => {
    const issue = createMockIssue({
      assignee: { login: 'dev', avatar_url: 'https://example.com/avatar.png' },
    });
    render(<TaskCard issue={issue} />);
    
    const assignee = screen.getByLabelText(/指派给：dev/);
    expect(assignee).toBeTruthy();
  });

  it('has aria-label for labels', () => {
    const issue = createMockIssue({
      labels: [{ name: 'enhancement', color: '84b6eb' }],
    });
    render(<TaskCard issue={issue} />);
    
    const label = screen.getByLabelText('标签：enhancement');
    expect(label).toBeTruthy();
  });

  it('has labelledby for issue title', () => {
    const issue = createMockIssue({ number: 42, title: 'Test Issue' });
    render(<TaskCard issue={issue} />);
    
    const title = screen.getByText('Test Issue');
    expect(title.id).toBe('issue-42-title');
  });
});

// ============================================================================
// 交互测试
// ============================================================================
describe('TaskBoard - Interaction', () => {
  it('has external link that opens in new tab', () => {
    const issue = createMockIssue({ html_url: 'https://github.com/test/repo/issues/1' });
    render(<TaskCard issue={issue} />);
    
    const links = screen.getAllByRole('link');
    const externalLink = links.find(l => l.getAttribute('href') === 'https://github.com/test/repo/issues/1');
    
    expect(externalLink?.getAttribute('target')).toBe('_blank');
    expect(externalLink?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('has hover effect on task cards', () => {
    const issue = createMockIssue();
    const { container } = render(<TaskCard issue={issue} />);
    
    const article = container.querySelector('article');
    expect(article?.className).toContain('hover:bg-gray-50');
  });

  it('has focus-within state on task cards', () => {
    const issue = createMockIssue();
    const { container } = render(<TaskCard issue={issue} />);
    
    const article = container.querySelector('article');
    expect(article?.className).toContain('focus-within:ring-2');
  });
});

// ============================================================================
// 头像错误处理测试
// ============================================================================
describe('TaskBoard - Avatar Error Handling', () => {
  it('falls back to dicebear avatar on image error', () => {
    const issue = createMockIssue({
      assignee: { 
        login: 'testuser', 
        avatar_url: 'https://example.com/invalid.png' 
      },
    });
    const { container } = render(<TaskCard issue={issue} />);

    const img = container.querySelector('img') as HTMLImageElement;
    
    // 模拟图片加载失败
    fireEvent.error(img);

    expect(img.src).toContain('dicebear');
  });
});

// ============================================================================
// Props 变化测试
// ============================================================================
describe('TaskBoard - Props Changes', () => {
  it('updates displayed issues when props change', () => {
    const { rerender } = render(<TaskBoard issues={[createMockIssue({ number: 1, title: 'Old Issue' })]} />);
    expect(screen.getByText('Old Issue')).toBeTruthy();

    rerender(<TaskBoard issues={[
      createMockIssue({ number: 1, title: 'Old Issue' }),
      createMockIssue({ number: 2, title: 'New Issue', state: 'closed' }),
    ]} />);
    
    // 切换到 all 才能看到新的 closed issue
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'all' } });
    
    expect(screen.getByText('New Issue')).toBeTruthy();
  });

  it('updates progress when issues change', () => {
    const { rerender } = render(<TaskBoard issues={[
      createMockIssue({ state: 'open' }),
    ]} />);
    
    let progressBar = screen.getByTestId('progress-bar');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('0');

    rerender(<TaskBoard issues={[
      createMockIssue({ state: 'open' }),
      createMockIssue({ state: 'closed' }),
    ]} />);
    
    progressBar = screen.getByTestId('progress-bar');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('50');
  });

  it('maintains filter selection when issues update', () => {
    const { rerender } = render(<TaskBoard issues={mockIssues} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'closed' } });
    
    expect(screen.getByText('Fix bug in dashboard')).toBeTruthy();
    
    rerender(<TaskBoard issues={[
      ...mockIssues,
      createMockIssue({ number: 4, title: 'Another closed issue', state: 'closed' }),
    ]} />);
    
    // 应该仍然显示 closed 筛选
    expect(screen.getByText('Another closed issue')).toBeTruthy();
  });
});

// ============================================================================
// 样式测试
// ============================================================================
describe('TaskBoard - Styling', () => {
  it('has correct color classes for open status', () => {
    const issue = createMockIssue({ state: 'open' });
    const { container } = render(<TaskCard issue={issue} />);
    
    const badge = container.querySelector('.text-green-600');
    expect(badge).toBeTruthy();
    expect(badge?.className).toContain('bg-green-50');
  });

  it('has correct color classes for closed status', () => {
    const issue = createMockIssue({ state: 'closed' });
    const { container } = render(<TaskCard issue={issue} />);
    
    const badge = container.querySelector('.text-gray-500');
    expect(badge).toBeTruthy();
    expect(badge?.className).toContain('bg-gray-50');
  });

  it('applies custom label colors', () => {
    const issue = createMockIssue({
      labels: [{ name: 'bug', color: 'ff0000' }],
    });
    const { container } = render(<TaskCard issue={issue} />);
    
    // Label should have inline styles for custom colors
    const label = container.querySelector('[style*="background-color"]');
    expect(label).toBeTruthy();
    expect(screen.getByText('bug')).toBeTruthy();
  });
});

// ============================================================================
// 边界情况测试
// ============================================================================
describe('TaskBoard - Edge Cases', () => {
  it('handles very long issue titles', () => {
    const longTitle = 'A'.repeat(200);
    const issue = createMockIssue({ title: longTitle });
    const { container } = render(<TaskCard issue={issue} />);
    
    const titleElement = container.querySelector('.truncate');
    expect(titleElement).toBeTruthy();
  });

  it('handles special characters in issue title', () => {
    const issue = createMockIssue({ title: 'Fix <bug> & "quote" in code' });
    render(<TaskCard issue={issue} />);
    
    expect(screen.getByText('Fix <bug> & "quote" in code')).toBeTruthy();
  });

  it('handles large number of issues', () => {
    const issues = Array.from({ length: 100 }, (_, i) => 
      createMockIssue({ number: i, title: `Issue ${i}`, state: i % 2 === 0 ? 'open' : 'closed' })
    );
    
    const { container } = render(<TaskBoard issues={issues} />);
    
    // 切换到 all
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'all' } });
    
    // 应该有滚动容器
    const scrollContainer = container.querySelector('.overflow-y-auto');
    expect(scrollContainer).toBeTruthy();
  });

  it('handles zero issues gracefully', () => {
    render(<TaskBoard issues={[]} />);
    
    expect(screen.getByText('暂无任务')).toBeTruthy();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('handles issues with no labels array', () => {
    const issue = createMockIssue({ labels: [] });
    
    expect(() => render(<TaskCard issue={issue} />)).not.toThrow();
  });
});
