/**
 * ActivityTimelineView 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityTimelineView } from '../ActivityTimelineView';
import type { UserActivity } from '../../lib/user-activity/types';

// 模拟活动数据
const mockActivities: UserActivity[] = [
  {
    id: 'act-1',
    userId: 'user-1',
    type: 'login',
    title: '用户登录',
    source: 'web',
    severity: 'info',
    timestamp: new Date(),
    createdAt: new Date(),
    metadata: {},
  },
  {
    id: 'act-2',
    userId: 'user-1',
    type: 'task_create',
    title: '创建任务',
    source: 'web',
    severity: 'success',
    timestamp: new Date(Date.now() - 3600000),
    createdAt: new Date(Date.now() - 3600000),
    metadata: {},
  },
  {
    id: 'act-3',
    userId: 'user-1',
    type: 'error',
    title: '发生错误',
    source: 'web',
    severity: 'error',
    timestamp: new Date(Date.now() - 7200000),
    createdAt: new Date(Date.now() - 7200000),
    metadata: {},
  },
];

describe('ActivityTimelineView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('渲染', () => {
    it('应该渲染时间线标题', () => {
      render(<ActivityTimelineView activities={mockActivities} />);
      
      expect(screen.getByText('🕐 活动时间线')).toBeInTheDocument();
    });

    it('应该渲染今日统计', () => {
      render(<ActivityTimelineView activities={mockActivities} />);
      
      expect(screen.getByText(/今日/)).toBeInTheDocument();
    });

    it('应该显示错误数量', () => {
      render(<ActivityTimelineView activities={mockActivities} />);
      
      expect(screen.getByText(/错误/)).toBeInTheDocument();
    });

    it('应该渲染视图切换按钮', () => {
      render(<ActivityTimelineView activities={mockActivities} />);
      
      expect(screen.getByText(/时间线/)).toBeInTheDocument();
      expect(screen.getByText(/日历/)).toBeInTheDocument();
      expect(screen.getByText(/统计/)).toBeInTheDocument();
    });

    it('应该显示空状态', () => {
      render(<ActivityTimelineView activities={[]} />);
      
      expect(screen.getByText('暂无活动记录')).toBeInTheDocument();
    });
  });

  describe('时间线视图', () => {
    it('应该显示活动项', () => {
      render(<ActivityTimelineView activities={mockActivities} />);
      
      expect(screen.getByText('用户登录')).toBeInTheDocument();
      expect(screen.getByText('创建任务')).toBeInTheDocument();
    });

    it('应该按日期分组', () => {
      render(<ActivityTimelineView activities={mockActivities} />);
      
      expect(screen.getByText('今天')).toBeInTheDocument();
    });

    it('应该显示活动类型标签', () => {
      render(<ActivityTimelineView activities={mockActivities} />);
      
      expect(screen.getByText('登录')).toBeInTheDocument();
    });

    it('应该触发点击事件', () => {
      const handleClick = vi.fn();
      render(<ActivityTimelineView activities={mockActivities} onActivityClick={handleClick} />);
      
      const activityTitle = screen.getByText('用户登录');
      fireEvent.click(activityTitle);
      
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('视图切换', () => {
    it('应该切换到日历视图', () => {
      render(<ActivityTimelineView activities={mockActivities} />);
      
      const calendarButton = screen.getByText(/日历/);
      fireEvent.click(calendarButton);
      
      // 日历视图应该显示周几
      expect(screen.getByText(/周日|周一|周二/)).toBeInTheDocument();
    });

    it('应该切换到统计视图', () => {
      render(<ActivityTimelineView activities={mockActivities} />);
      
      const statsButton = screen.getByText(/统计/);
      fireEvent.click(statsButton);
      
      expect(screen.getByText('总览')).toBeInTheDocument();
      expect(screen.getByText('活动类型分布')).toBeInTheDocument();
    });

    it('统计视图应显示总活动数', () => {
      render(<ActivityTimelineView activities={mockActivities} />);
      
      const statsButton = screen.getByText(/统计/);
      fireEvent.click(statsButton);
      
      expect(screen.getByText('总活动')).toBeInTheDocument();
    });

    it('统计视图应显示峰值时段', () => {
      render(<ActivityTimelineView activities={mockActivities} />);
      
      const statsButton = screen.getByText(/统计/);
      fireEvent.click(statsButton);
      
      expect(screen.getByText('峰值时段')).toBeInTheDocument();
    });
  });

  describe('紧凑模式', () => {
    it('应该渲染紧凑模式', () => {
      render(<ActivityTimelineView activities={mockActivities} compact />);
      
      expect(screen.getByText('用户登录')).toBeInTheDocument();
    });
  });

  describe('限制数量', () => {
    it('应该限制显示的活动数量', () => {
      const manyActivities: UserActivity[] = Array.from({ length: 20 }, (_, i) => ({
        id: `act-${i}`,
        userId: 'user-1',
        type: 'login' as const,
        title: `活动 ${i}`,
        source: 'web' as const,
        severity: 'info' as const,
        timestamp: new Date(Date.now() - i * 1000),
        createdAt: new Date(),
        metadata: {},
      }));

      render(<ActivityTimelineView activities={manyActivities} limit={3} />);
      
      // 只显示前3个活动
      expect(screen.getByText('活动 0')).toBeInTheDocument();
      expect(screen.queryByText('活动 10')).not.toBeInTheDocument();
    });
  });

  describe('日历视图', () => {
    it('应该显示当前周', () => {
      render(<ActivityTimelineView activities={mockActivities} />);
      
      const calendarButton = screen.getByText(/日历/);
      fireEvent.click(calendarButton);
      
      // 应该显示7天
      const dayLabels = screen.getAllByText(/周日|周一|周二|周三|周四|周五|周六/);
      expect(dayLabels.length).toBe(7);
    });

    it('应该高亮今天', () => {
      render(<ActivityTimelineView activities={mockActivities} />);
      
      const calendarButton = screen.getByText(/日历/);
      fireEvent.click(calendarButton);
      
      // 今天应该有特殊样式
      const today = new Date();
      expect(screen.getByText(today.getDate().toString())).toBeInTheDocument();
    });
  });
});