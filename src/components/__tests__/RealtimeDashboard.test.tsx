/**
 * @fileoverview RealtimeDashboard 组件测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { RealtimeDashboard } from '../RealtimeDashboard';

describe('RealtimeDashboard', () => {
  let originalSetInterval: typeof global.setInterval;
  let originalClearInterval: typeof global.clearInterval;
  let mockIntervals: NodeJS.Timeout[] = [];

  beforeEach(() => {
    // Store original timers
    originalSetInterval = global.setInterval;
    originalClearInterval = global.clearInterval;
    mockIntervals = [];

    // Mock setInterval to track and control it
    global.setInterval = vi.fn((callback: () => void, delay: number) => {
      const id = originalSetInterval(callback, delay);
      mockIntervals.push(id);
      return id;
    }) as any;

    // Mock clearInterval to track it
    global.clearInterval = vi.fn((id: NodeJS.Timeout) => {
      const index = mockIntervals.indexOf(id);
      if (index > -1) {
        mockIntervals.splice(index, 1);
      }
      return originalClearInterval(id);
    }) as any;
  });

  afterEach(() => {
    // Clear all mock intervals
    mockIntervals.forEach(id => originalClearInterval(id));
    mockIntervals = [];

    // Restore original timers
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;

    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('渲染', () => {
    it('应该显示标题', async () => {
      render(<RealtimeDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/实时仪表盘/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示连接状态', async () => {
      render(<RealtimeDashboard />);

      // "已连接" appears twice: in header and status card
      await waitFor(() => {
        expect(screen.getAllByText(/已连接/).length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('应该显示性能指标', async () => {
      render(<RealtimeDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/性能指标/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示团队效率', async () => {
      render(<RealtimeDashboard />);

      // "团队效率" appears twice: in heading and label
      await waitFor(() => {
        expect(screen.getAllByText(/团队效率/).length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('实时更新', () => {
    it('应该建立定时器用于数据更新', async () => {
      render(<RealtimeDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/实时仪表盘/)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify that setInterval was called
      expect(global.setInterval).toHaveBeenCalled();

      // Verify the delay is 5000ms (5 seconds)
      expect(global.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        5000
      );
    });

    it('应该显示延迟信息', async () => {
      render(<RealtimeDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/延迟/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('性能指标卡片', () => {
    it('应该显示CPU使用率', async () => {
      render(<RealtimeDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/CPU 使用率/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示内存使用', async () => {
      render(<RealtimeDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/内存使用/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示响应时间', async () => {
      render(<RealtimeDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/响应时间/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示任务完成率', async () => {
      render(<RealtimeDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/任务完成率/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('团队效率', () => {
    it('应该显示已完成任务数', async () => {
      render(<RealtimeDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/已完成任务/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示平均完成时间', async () => {
      render(<RealtimeDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/平均完成时间/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示活跃成员数', async () => {
      render(<RealtimeDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/活跃成员/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示本周趋势', async () => {
      render(<RealtimeDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/本周趋势/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('国际化', () => {
    it('应该支持英文', async () => {
      render(<RealtimeDashboard locale="en" />);

      await waitFor(() => {
        expect(screen.getByText(/Realtime Dashboard/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示英文性能指标', async () => {
      render(<RealtimeDashboard locale="en" />);

      await waitFor(() => {
        expect(screen.getByText(/Performance/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示英文团队效率', async () => {
      render(<RealtimeDashboard locale="en" />);

      // There are multiple "Team Efficiency" texts, so use getAllByText
      await waitFor(() => {
        expect(screen.getAllByText(/Team Efficiency/).length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('状态卡片', () => {
    it('应该显示活跃连接数', async () => {
      render(<RealtimeDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/活跃连接/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示连接状态指示器', async () => {
      const { container } = render(<RealtimeDashboard />);

      await waitFor(() => {
        const statusDot = container.querySelector('.animate-pulse.bg-green-500');
        expect(statusDot).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('组件卸载', () => {
    it('应该清理定时器', async () => {
      const { unmount } = render(<RealtimeDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/实时仪表盘/)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Unmount the component
      unmount();

      // ClearInterval should have been called
      expect(global.clearInterval).toHaveBeenCalled();
    });
  });
});
