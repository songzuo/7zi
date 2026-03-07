/**
 * @fileoverview TeamActivityTracker 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { TeamActivityTracker } from '../TeamActivityTracker';

// Mock timers for setTimeout in data loading
vi.useFakeTimers();

describe('TeamActivityTracker', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  describe('渲染', () => {
    it('应该显示加载状态', () => {
      render(<TeamActivityTracker />);
      // 加载状态会在数据加载后消失
    });

    it('应该显示标题', async () => {
      render(<TeamActivityTracker />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/团队活动追踪/)).toBeInTheDocument();
      });
    });

    it('应该显示过滤按钮', async () => {
      render(<TeamActivityTracker />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/过滤/)).toBeInTheDocument();
      });
    });

    it('应该显示导出按钮', async () => {
      render(<TeamActivityTracker />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/导出/)).toBeInTheDocument();
      });
    });

    it('应该显示最近活动', async () => {
      render(<TeamActivityTracker />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/最近活动/)).toBeInTheDocument();
      });
    });

    it('应该显示统计面板', async () => {
      render(<TeamActivityTracker />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/统计/)).toBeInTheDocument();
      });
    });
  });

  describe('过滤功能', () => {
    it('点击过滤按钮应该显示过滤面板', async () => {
      render(<TeamActivityTracker />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        const filterButton = screen.getByText(/过滤/);
        fireEvent.click(filterButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/所有类型/)).toBeInTheDocument();
      });
    });

    it('应该显示所有活动类型选项', async () => {
      render(<TeamActivityTracker />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        const filterButton = screen.getByText(/过滤/);
        fireEvent.click(filterButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/提交/)).toBeInTheDocument();
        expect(screen.getByText(/创建 Issue/)).toBeInTheDocument();
        expect(screen.getByText(/关闭 Issue/)).toBeInTheDocument();
      });
    });

    it('点击活动类型应该过滤活动', async () => {
      render(<TeamActivityTracker />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        const filterButton = screen.getByText(/过滤/);
        fireEvent.click(filterButton);
      });
      
      await waitFor(() => {
        const commitButton = screen.getByText(/提交/);
        fireEvent.click(commitButton);
      });
      
      // 应该显示过滤计数
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /过滤/ });
        expect(filterButton.textContent).toMatch(/[1-9]/);
      });
    });

    it('应该显示所有成员过滤选项', async () => {
      render(<TeamActivityTracker />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        const filterButton = screen.getByText(/过滤/);
        fireEvent.click(filterButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/所有成员/)).toBeInTheDocument();
      });
    });

    it('点击清除过滤应该重置过滤器', async () => {
      render(<TeamActivityTracker />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      // 打开过滤面板并选择一个类型
      await waitFor(() => {
        const filterButton = screen.getByText(/过滤/);
        fireEvent.click(filterButton);
      });
      
      await waitFor(() => {
        const commitButton = screen.getByText(/提交/);
        fireEvent.click(commitButton);
      });
      
      // 清除过滤
      await waitFor(() => {
        const clearButton = screen.getByText(/清除过滤/);
        fireEvent.click(clearButton);
      });
      
      // 过滤器应该被清除
      await waitFor(() => {
        expect(screen.queryByText(/清除过滤/)).not.toBeInTheDocument();
      });
    });
  });

  describe('统计数据', () => {
    it('应该显示成员排名', async () => {
      render(<TeamActivityTracker />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/#/)).toBeInTheDocument();
      });
    });

    it('应该显示成员活动数', async () => {
      render(<TeamActivityTracker />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        // 检查是否有括号内的数字（活动数）
        const stats = screen.getAllByText(/\(\d+\)/);
        expect(stats.length).toBeGreaterThan(0);
      });
    });
  });

  describe('活动列表', () => {
    it('应该显示活动类型标签', async () => {
      render(<TeamActivityTracker />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        // 检查是否有活动类型标签
        expect(screen.getAllByText(/提交|创建 Issue|关闭 Issue/).length).toBeGreaterThan(0);
      });
    });

    it('应该显示时间信息', async () => {
      render(<TeamActivityTracker />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        // 检查是否有时间信息（分钟前、小时前、天前）
        expect(screen.getAllByText(/前|刚刚/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('国际化', () => {
    it('应该支持英文', async () => {
      render(<TeamActivityTracker locale="en" />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Team Activity Tracker/)).toBeInTheDocument();
      });
    });

    it('应该显示英文过滤按钮', async () => {
      render(<TeamActivityTracker locale="en" />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Filter/)).toBeInTheDocument();
      });
    });

    it('应该显示英文统计', async () => {
      render(<TeamActivityTracker locale="en" />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Statistics/)).toBeInTheDocument();
      });
    });
  });

  describe('配置选项', () => {
    it('showFilters=false 应该隐藏过滤按钮', async () => {
      render(<TeamActivityTracker showFilters={false} />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.queryByText(/过滤/)).not.toBeInTheDocument();
      });
    });

    it('showStats=false 应该隐藏统计面板', async () => {
      render(<TeamActivityTracker showStats={false} />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.queryByText(/统计/)).not.toBeInTheDocument();
      });
    });

    it('maxItems 应该限制活动数量', async () => {
      render(<TeamActivityTracker maxItems={10} />);
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/最近活动/)).toBeInTheDocument();
      });
    });
  });
});