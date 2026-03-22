/**
 * @fileoverview TaskBoard 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskBoard } from '../TaskBoard';
import { GitHubIssue } from '@/types';

const mockIssues: GitHubIssue[] = [
  {
    number: 1,
    title: '实现用户登录功能',
    state: 'open',
    labels: [{ name: 'feature', color: 'blue' }],
    assignee: { login: 'executor', avatar_url: 'https://example.com/avatar.png' },
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-06T10:00:00Z',
    html_url: 'https://github.com/test/repo/issues/1',
  },
  {
    number: 2,
    title: '修复导航栏样式问题',
    state: 'closed',
    labels: [{ name: 'bug', color: 'red' }, { name: 'ui', color: 'green' }],
    assignee: null,
    created_at: '2024-03-02T10:00:00Z',
    updated_at: '2024-03-05T10:00:00Z',
    html_url: 'https://github.com/test/repo/issues/2',
  },
  {
    number: 3,
    title: '添加暗色模式支持',
    state: 'open',
    labels: [],
    assignee: { login: 'designer', avatar_url: 'https://example.com/avatar2.png' },
    created_at: '2024-03-03T10:00:00Z',
    updated_at: '2024-03-06T09:00:00Z',
    html_url: 'https://github.com/test/repo/issues/3',
  },
];

describe('TaskBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Next.js Image component
    vi.mock('next/image', () => ({
      __esModule: true,
      default: ({ src, alt, className, unoptimized }: { src: string; alt?: string; className?: string; unoptimized?: boolean }) => (
        <img src={src} alt={alt} className={className} data-unoptimized={unoptimized} />
      ),
    }));

    // Mock shared components
    vi.mock('@/components/shared', () => ({
      ProgressBar: ({ progress, showLabel }: { progress: number; showLabel?: boolean }) => (
        <div className="progress-bar" data-progress={progress} data-show-label={showLabel}>
          {showLabel && `${progress}%`}
        </div>
      ),
      Card: ({ children, padding, className }: { children: React.ReactNode; padding?: string; className?: string }) => (
        <div className={`card ${padding === 'none' ? 'no-padding' : ''} ${className || ''}`}>
          {children}
        </div>
      ),
      EmptyState: ({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) => (
        <div className="empty-state">
          <div className="icon">{icon}</div>
          <div className="title">{title}</div>
          <div className="description">{description}</div>
        </div>
      ),
    }));

    // Mock date utility
    vi.mock('@/lib/date', () => ({
      formatTimeAgo: vi.fn((date) => {
        const now = new Date();
        const then = new Date(date);
        const diff = Math.floor((now.getTime() - then.getTime()) / (1000 * 60));
        return `${diff}分钟前`;
      }),
    }));
  });

  describe('渲染', () => {
    it('应该显示看板头部', () => {
      render(<TaskBoard issues={mockIssues} />);

      expect(screen.getByText(/GitHub 任务/)).toBeInTheDocument();
    });

    it('应该显示所有任务编号', () => {
      render(<TaskBoard issues={mockIssues} />);

      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();
    });

    it('应该显示任务标题', () => {
      render(<TaskBoard issues={mockIssues} />);

      expect(screen.getByText('实现用户登录功能')).toBeInTheDocument();
      expect(screen.getByText('修复导航栏样式问题')).toBeInTheDocument();
      expect(screen.getByText('添加暗色模式支持')).toBeInTheDocument();
    });
  });

  describe('进度计算', () => {
    it('应该显示正确的进度百分比', () => {
      render(<TaskBoard issues={mockIssues} />);

      // 1 closed out of 3 total = 33%
      expect(screen.getByText('33%')).toBeInTheDocument();
    });

    it('没有任务时应该显示 0% 进度', () => {
      render(<TaskBoard issues={[]} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('应该显示进行中和已完成任务数量', () => {
      render(<TaskBoard issues={mockIssues} />);

      expect(screen.getByText(/2.*进行中/)).toBeInTheDocument();
      expect(screen.getByText(/1.*已完成/)).toBeInTheDocument();
    });

    it('所有任务完成时应该显示 100% 进度', () => {
      const allClosedIssues = mockIssues.map(issue => ({ ...issue, state: 'closed' as const }));
      render(<TaskBoard issues={allClosedIssues} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('过滤功能', () => {
    it('默认应该过滤显示进行中的任务', () => {
      render(<TaskBoard issues={mockIssues} />);

      // 应该显示进行中的任务
      expect(screen.getByText('实现用户登录功能')).toBeInTheDocument();
      expect(screen.getByText('添加暗色模式支持')).toBeInTheDocument();
      // 已完成的任务不应该可见
      expect(screen.queryByText('修复导航栏样式问题')).not.toBeInTheDocument();
    });

    it('选择"全部"应该显示所有任务', () => {
      render(<TaskBoard issues={mockIssues} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'all' } });

      expect(screen.getByText('实现用户登录功能')).toBeInTheDocument();
      expect(screen.getByText('修复导航栏样式问题')).toBeInTheDocument();
      expect(screen.getByText('添加暗色模式支持')).toBeInTheDocument();
    });

    it('选择"已完成"应该只显示已完成的任务', () => {
      render(<TaskBoard issues={mockIssues} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'closed' } });

      expect(screen.queryByText('实现用户登录功能')).not.toBeInTheDocument();
      expect(screen.getByText('修复导航栏样式问题')).toBeInTheDocument();
      expect(screen.queryByText('添加暗色模式支持')).not.toBeInTheDocument();
    });

    it('切换过滤器应该更新任务列表', () => {
      render(<TaskBoard issues={mockIssues} />);

      const select = screen.getByRole('combobox');

      // 切换到"已完成"
      fireEvent.change(select, { target: { value: 'closed' } });
      expect(screen.queryByText('实现用户登录功能')).not.toBeInTheDocument();

      // 切换到"全部"
      fireEvent.change(select, { target: { value: 'all' } });
      expect(screen.getByText('实现用户登录功能')).toBeInTheDocument();

      // 切换回"进行中"
      fireEvent.change(select, { target: { value: 'open' } });
      expect(screen.getByText('实现用户登录功能')).toBeInTheDocument();
      expect(screen.queryByText('修复导航栏样式问题')).not.toBeInTheDocument();
    });
  });

  describe('空状态', () => {
    it('没有任务时应该显示空状态', () => {
      render(<TaskBoard issues={[]} />);

      expect(screen.getByText('暂无任务')).toBeInTheDocument();
      expect(screen.getByText('还没有 GitHub Issues')).toBeInTheDocument();
    });

    it('所有任务都已完成时切换到进行中应该显示空状态', () => {
      const allClosedIssues = mockIssues.map(issue => ({ ...issue, state: 'closed' as const }));
      render(<TaskBoard issues={allClosedIssues} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'open' } });

      expect(screen.getByText('暂无任务')).toBeInTheDocument();
      expect(screen.getByText('所有任务都已完成！')).toBeInTheDocument();
    });
  });

  describe('任务数量', () => {
    it('应该在底部显示正确的任务数量', () => {
      render(<TaskBoard issues={mockIssues} />);

      // 默认过滤器是"进行中"，显示 2/3
      expect(screen.getByText(/显示.*2.*\/.*3.*个任务/)).toBeInTheDocument();
    });

    it('切换过滤器后应该更新任务数量', () => {
      render(<TaskBoard issues={mockIssues} />);

      const select = screen.getByRole('combobox');

      // 切换到"已完成"
      fireEvent.change(select, { target: { value: 'closed' } });
      expect(screen.getByText(/显示.*1.*\/.*3.*个任务/)).toBeInTheDocument();

      // 切换到"全部"
      fireEvent.change(select, { target: { value: 'all' } });
      expect(screen.getByText(/显示.*3.*\/.*3.*个任务/)).toBeInTheDocument();
    });
  });

  describe('任务卡片', () => {
    it('应该显示任务标签', () => {
      render(<TaskBoard issues={mockIssues} />);

      expect(screen.getByText('feature')).toBeInTheDocument();
    });

    it('应该显示多个标签', () => {
      render(<TaskBoard issues={mockIssues} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'all' } });

      expect(screen.getByText('bug')).toBeInTheDocument();
      expect(screen.getByText('ui')).toBeInTheDocument();
    });

    it('应该显示分配给该任务的用户', () => {
      render(<TaskBoard issues={mockIssues} />);

      expect(screen.getByText('executor')).toBeInTheDocument();
    });

    it('没有分配用户的任务应该正常显示', () => {
      render(<TaskBoard issues={mockIssues} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'all' } });

      // Issue #2 没有分配用户
      expect(screen.queryByText('修复导航栏样式问题')).toBeInTheDocument();
    });

    it('应该显示 GitHub 链接', () => {
      render(<TaskBoard issues={mockIssues} />);

      const links = screen.getAllByRole('link');
      expect(links.some(link => link.getAttribute('href') === mockIssues[0].html_url)).toBe(true);
    });
  });

  describe('状态显示', () => {
    it('进行中的任务应该显示绿色状态', () => {
      render(<TaskBoard issues={mockIssues} />);

      const statusBadges = screen.getAllByText(/进行中/);
      expect(statusBadges.length).toBeGreaterThan(0);
    });

    it('已完成的任务应该显示灰色状态', () => {
      render(<TaskBoard issues={mockIssues} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'closed' } });

      const statusBadges = screen.getAllByText(/已完成/);
      expect(statusBadges.length).toBeGreaterThan(0);
    });
  });

  describe('时间和更新信息', () => {
    it('应该显示任务更新时间', () => {
      render(<TaskBoard issues={mockIssues} />);

      expect(screen.getByText(/更新于/)).toBeInTheDocument();
      expect(screen.getByText(/分钟前/)).toBeInTheDocument();
    });
  });

  describe('交互效果', () => {
    it('任务卡片应该有 hover 效果', () => {
      const { container } = render(<TaskBoard issues={mockIssues} />);

      const hoverElements = container.querySelectorAll('.hover\\:bg-zinc-50');
      expect(hoverElements.length).toBeGreaterThan(0);
    });

    it('任务卡片在 hover 时应该显示链接', () => {
      render(<TaskBoard issues={mockIssues} />);

      // 在初始状态下，链接应该是不可见的（opacity-0）
      const links = screen.getAllByRole('link');
      const taskLinks = links.filter(link => link.getAttribute('href')?.includes('github.com'));
      expect(taskLinks.length).toBeGreaterThan(0);
    });
  });

  describe('标签限制', () => {
    it('应该限制显示的标签数量', () => {
      const issueWithManyLabels: GitHubIssue = {
        ...mockIssues[0],
        labels: [
          { name: 'feature', color: 'blue' },
          { name: 'bug', color: 'red' },
          { name: 'ui', color: 'green' },
          { name: 'enhancement', color: 'purple' },
          { name: 'documentation', color: 'yellow' },
          { name: 'priority', color: 'orange' },
          { name: 'breaking', color: 'black' },
        ],
      };
      render(<TaskBoard issues={[issueWithManyLabels]} />);

      // 应该显示前5个标签
      expect(screen.getByText('feature')).toBeInTheDocument();
      expect(screen.getByText('bug')).toBeInTheDocument();
      expect(screen.getByText('ui')).toBeInTheDocument();
      expect(screen.getByText('enhancement')).toBeInTheDocument();
      expect(screen.getByText('documentation')).toBeInTheDocument();

      // 应该显示"+n"表示还有更多标签
      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  describe('滚动容器', () => {
    it('任务列表应该有最大高度限制', () => {
      const { container } = render(<TaskBoard issues={mockIssues} />);

      const listContainer = container.querySelector('.max-h-\\[600px\\]');
      expect(listContainer).toBeInTheDocument();
    });

    it('任务列表应该支持垂直滚动', () => {
      const { container } = render(<TaskBoard issues={mockIssues} />);

      const listContainer = container.querySelector('.overflow-y-auto');
      expect(listContainer).toBeInTheDocument();
    });
  });
});
