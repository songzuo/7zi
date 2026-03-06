/**
 * ActivityTimeline 组件测试
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';

describe('ActivityTimeline', () => {
  const mockActivities = [
    {
      id: '1',
      type: 'task_complete' as const,
      title: '完成了任务：用户仪表板设计',
      description: '完成了仪表板的 UI 设计',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'commit' as const,
      title: '提交代码：feat: 添加图表组件',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '3',
      type: 'comment' as const,
      title: '评论了任务：性能优化讨论',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: '4',
      type: 'task_create' as const,
      title: '创建了任务：添加单元测试',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '5',
      type: 'review' as const,
      title: '完成了代码审查：PR #42',
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ];

  it('should render activities list', () => {
    render(<ActivityTimeline activities={mockActivities} />);

    expect(screen.getByText('📜 活动记录')).toBeTruthy();
    expect(screen.getByText('完成了任务：用户仪表板设计')).toBeTruthy();
    expect(screen.getByText('提交代码：feat: 添加图表组件')).toBeTruthy();
  });

  it('should show activity count', () => {
    render(<ActivityTimeline activities={mockActivities} />);

    expect(screen.getByText('5 条')).toBeTruthy();
  });

  it('should show empty state when no activities', () => {
    render(<ActivityTimeline activities={[]} />);

    expect(screen.getByText('暂无活动记录')).toBeTruthy();
  });

  it('should limit displayed activities with maxItems', () => {
    const manyActivities = Array.from({ length: 20 }, (_, i) => ({
      id: `activity-${i}`,
      type: 'task_complete' as const,
      title: `活动 ${i + 1}`,
      timestamp: new Date().toISOString(),
    }));

    render(<ActivityTimeline activities={manyActivities} maxItems={5} />);

    // 应该只显示前 5 条
    expect(screen.getByText('20 条')).toBeTruthy();
    expect(screen.getByText('查看全部 20 条记录')).toBeTruthy();
  });

  it('should display relative time for recent activities', () => {
    const recentActivities = [
      {
        id: '1',
        type: 'task_complete' as const,
        title: '刚刚完成',
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'task_complete' as const,
        title: '一小时前完成',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    render(<ActivityTimeline activities={recentActivities} />);

    expect(screen.getByText('刚刚')).toBeTruthy();
    expect(screen.getByText('1 小时前')).toBeTruthy();
  });

  it('should show activity description if provided', () => {
    render(<ActivityTimeline activities={mockActivities} />);

    expect(screen.getByText('完成了仪表板的 UI 设计')).toBeTruthy();
  });

  it('should display correct icons for activity types', () => {
    const { container } = render(<ActivityTimeline activities={mockActivities} />);

    // 检查各种活动类型的图标
    expect(container.textContent).toContain('✅'); // task_complete
    expect(container.textContent).toContain('💾'); // commit
    expect(container.textContent).toContain('💬'); // comment
    expect(container.textContent).toContain('📝'); // task_create
    expect(container.textContent).toContain('👀'); // review
  });
});