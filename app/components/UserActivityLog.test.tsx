/**
 * UserActivityLog 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserActivityLog } from '../UserActivityLog';
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
    title: '创建新任务',
    description: '实现用户活动日志功能',
    source: 'web',
    severity: 'success',
    timestamp: new Date(Date.now() - 3600000),
    createdAt: new Date(Date.now() - 3600000),
    metadata: { taskId: 'task-1' },
  },
  {
    id: 'act-3',
    userId: 'user-1',
    type: 'error',
    title: '页面加载错误',
    description: '网络超时',
    source: 'web',
    severity: 'error',
    timestamp: new Date(Date.now() - 7200000),
    createdAt: new Date(Date.now() - 7200000),
    metadata: { code: 'TIMEOUT' },
  },
];

describe('UserActivityLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('渲染', () => {
    it('应该渲染活动日志标题', () => {
      render(<UserActivityLog activities={mockActivities} />);
      
      expect(screen.getByText('📋 用户活动日志')).toBeInTheDocument();
    });

    it('应该渲染统计信息', () => {
      render(<UserActivityLog activities={mockActivities} showStats />);
      
      expect(screen.getByText(/总计:/)).toBeInTheDocument();
      expect(screen.getByText(/今日:/)).toBeInTheDocument();
    });

    it('应该渲染所有活动', () => {
      render(<UserActivityLog activities={mockActivities} />);
      
      expect(screen.getByText('用户登录')).toBeInTheDocument();
      expect(screen.getByText('创建新任务')).toBeInTheDocument();
      expect(screen.getByText('页面加载错误')).toBeInTheDocument();
    });

    it('应该显示空状态', () => {
      render(<UserActivityLog activities={[]} />);
      
      expect(screen.getByText('暂无活动记录')).toBeInTheDocument();
    });

    it('应该渲染活动描述', () => {
      render(<UserActivityLog activities={mockActivities} />);
      
      expect(screen.getByText('实现用户活动日志功能')).toBeInTheDocument();
    });

    it('应该渲染元数据标签', () => {
      render(<UserActivityLog activities={mockActivities} />);
      
      expect(screen.getByText(/taskId:/)).toBeInTheDocument();
    });
  });

  describe('过滤器', () => {
    it('应该显示过滤器', () => {
      render(<UserActivityLog activities={mockActivities} showFilters />);
      
      expect(screen.getByPlaceholderText('搜索活动...')).toBeInTheDocument();
    });

    it('应该按类型过滤', () => {
      render(<UserActivityLog activities={mockActivities} showFilters />);
      
      const typeSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(typeSelect, { target: { value: 'login' } });
      
      // 应该只显示登录活动
      expect(screen.getByText('用户登录')).toBeInTheDocument();
    });

    it('应该按严重程度过滤', () => {
      render(<UserActivityLog activities={mockActivities} showFilters />);
      
      const severitySelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(severitySelect, { target: { value: 'error' } });
      
      // 应该只显示错误活动
      expect(screen.getByText('页面加载错误')).toBeInTheDocument();
    });

    it('应该按搜索词过滤', () => {
      render(<UserActivityLog activities={mockActivities} showFilters />);
      
      const searchInput = screen.getByPlaceholderText('搜索活动...');
      fireEvent.change(searchInput, { target: { value: '任务' } });
      
      expect(screen.getByText('创建新任务')).toBeInTheDocument();
    });

    it('应该清除过滤器', () => {
      render(<UserActivityLog activities={mockActivities} showFilters />);
      
      // 先设置过滤器
      const searchInput = screen.getByPlaceholderText('搜索活动...');
      fireEvent.change(searchInput, { target: { value: 'xyz' } });
      
      // 清除
      const clearButton = screen.getByText('清除筛选');
      fireEvent.click(clearButton);
      
      // 应该显示所有活动
      expect(screen.getByText('用户登录')).toBeInTheDocument();
    });
  });

  describe('交互', () => {
    it('应该触发点击事件', () => {
      const handleClick = vi.fn();
      render(<UserActivityLog activities={mockActivities} onActivityClick={handleClick} />);
      
      const activityItem = screen.getByText('用户登录').closest('article');
      fireEvent.click(activityItem!);
      
      expect(handleClick).toHaveBeenCalledWith(expect.objectContaining({
        id: 'act-1',
      }));
    });

    it('应该支持键盘导航', () => {
      const handleClick = vi.fn();
      render(<UserActivityLog activities={mockActivities} onActivityClick={handleClick} />);
      
      const activityItem = screen.getByText('用户登录').closest('article');
      fireEvent.keyDown(activityItem!, { key: 'Enter' });
      
      expect(handleClick).toHaveBeenCalled();
    });

    it('应该显示删除按钮', () => {
      const handleDelete = vi.fn();
      render(<UserActivityLog activities={mockActivities} onDeleteActivity={handleDelete} />);
      
      const deleteButtons = screen.getAllByLabelText('删除此活动记录');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('应该触发删除事件', () => {
      const handleDelete = vi.fn();
      render(<UserActivityLog activities={mockActivities} onDeleteActivity={handleDelete} />);
      
      const deleteButton = screen.getAllByLabelText('删除此活动记录')[0];
      fireEvent.click(deleteButton);
      
      expect(handleDelete).toHaveBeenCalledWith('act-1');
    });
  });

  describe('日期分组', () => {
    it('应该按日期分组活动', () => {
      const activities: UserActivity[] = [
        {
          id: 'today',
          userId: 'user-1',
          type: 'login',
          title: '今天的活动',
          source: 'web',
          severity: 'info',
          timestamp: new Date(),
          createdAt: new Date(),
          metadata: {},
        },
        {
          id: 'yesterday',
          userId: 'user-1',
          type: 'login',
          title: '昨天的活动',
          source: 'web',
          severity: 'info',
          timestamp: new Date(Date.now() - 86400000),
          createdAt: new Date(Date.now() - 86400000),
          metadata: {},
        },
      ];

      render(<UserActivityLog activities={activities} />);
      
      expect(screen.getByText('今天')).toBeInTheDocument();
      expect(screen.getByText('昨天')).toBeInTheDocument();
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

      render(<UserActivityLog activities={manyActivities} limit={5} />);
      
      const displayedActivities = screen.getAllByRole('article');
      expect(displayedActivities.length).toBeLessThanOrEqual(5);
    });
  });
});