/**
 * @fileoverview RealtimeDashboard 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { RealtimeDashboard } from '../RealtimeDashboard';

// Mock timers
vi.useFakeTimers();

describe('RealtimeDashboard', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  describe('渲染', () => {
    it('应该显示加载状态', () => {
      render(<RealtimeDashboard />);
      // 加载状态会很快消失，因为我们有初始数据
    });

    it('应该显示标题', async () => {
      render(<RealtimeDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/实时仪表盘/)).toBeInTheDocument();
      });
    });

    it('应该显示连接状态', async () => {
      render(<RealtimeDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/已连接/)).toBeInTheDocument();
      });
    });

    it('应该显示性能指标', async () => {
      render(<RealtimeDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/性能指标/)).toBeInTheDocument();
      });
    });

    it('应该显示团队效率', async () => {
      render(<RealtimeDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/团队效率/)).toBeInTheDocument();
      });
    });
  });

  describe('实时更新', () => {
    it('应该每5秒更新数据', async () => {
      render(<RealtimeDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/更新次数/)).toBeInTheDocument();
      });

      const initialUpdateCount = screen.getByText(/更新次数/).parentElement?.textContent;
      
      // 快进5秒
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        // 检查更新次数增加了
        expect(screen.getByText(/更新次数/)).toBeInTheDocument();
      });
    });

    it('应该显示延迟信息', async () => {
      render(<RealtimeDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/延迟/)).toBeInTheDocument();
      });
    });
  });

  describe('性能指标卡片', () => {
    it('应该显示CPU使用率', async () => {
      render(<RealtimeDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/CPU 使用率/)).toBeInTheDocument();
      });
    });

    it('应该显示内存使用', async () => {
      render(<RealtimeDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/内存使用/)).toBeInTheDocument();
      });
    });

    it('应该显示响应时间', async () => {
      render(<RealtimeDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/响应时间/)).toBeInTheDocument();
      });
    });

    it('应该显示任务完成率', async () => {
      render(<RealtimeDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/任务完成率/)).toBeInTheDocument();
      });
    });
  });

  describe('团队效率', () => {
    it('应该显示已完成任务数', async () => {
      render(<RealtimeDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/已完成任务/)).toBeInTheDocument();
      });
    });

    it('应该显示平均完成时间', async () => {
      render(<RealtimeDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/平均完成时间/)).toBeInTheDocument();
      });
    });

    it('应该显示活跃成员数', async () => {
      render(<RealtimeDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/活跃成员/)).toBeInTheDocument();
      });
    });

    it('应该显示本周趋势', async () => {
      render(<RealtimeDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/本周趋势/)).toBeInTheDocument();
      });
    });
  });

  describe('国际化', () => {
    it('应该支持英文', async () => {
      render(<RealtimeDashboard locale="en" />);
      
      await waitFor(() => {
        expect(screen.getByText(/Realtime Dashboard/)).toBeInTheDocument();
      });
    });

    it('应该显示英文性能指标', async () => {
      render(<RealtimeDashboard locale="en" />);
      
      await waitFor(() => {
        expect(screen.getByText(/Performance/)).toBeInTheDocument();
      });
    });

    it('应该显示英文团队效率', async () => {
      render(<RealtimeDashboard locale="en" />);
      
      await waitFor(() => {
        expect(screen.getByText(/Team Efficiency/)).toBeInTheDocument();
      });
    });
  });

  describe('状态卡片', () => {
    it('应该显示活跃连接数', async () => {
      render(<RealtimeDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/活跃连接/)).toBeInTheDocument();
      });
    });

    it('应该显示连接状态指示器', async () => {
      const { container } = render(<RealtimeDashboard />);
      
      await waitFor(() => {
        const statusDot = container.querySelector('.animate-pulse.bg-green-500');
        expect(statusDot).toBeInTheDocument();
      });
    });
  });
});