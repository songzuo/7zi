/**
 * SimplePerformanceDashboard 组件测试
 * 
 * @version 1.0.0
 * @date 2026-03-30
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SimplePerformanceDashboard } from '@/features/monitoring/components/SimplePerformanceDashboard';

// ============================================
// Mock monitoring module
// ============================================

const mockGetAggregatedMetrics = vi.fn();
const mockGetAlarms = vi.fn();
const mockClearAllData = vi.fn();

vi.mock('@/lib/monitoring', () => ({
  monitor: {
    getAggregatedMetrics: () => mockGetAggregatedMetrics(),
    getAlarms: () => mockGetAlarms(),
    clearAllData: () => mockClearAllData(),
  },
}));

// ============================================
// Mock 数据
// ============================================

const mockMetrics = {
  apiMetrics: {
    totalRequests: 1000,
    averageResponseTime: 150,
    successRate: 0.98,
    errorRate: 0.02,
  },
  operationMetrics: {
    totalOperations: 500,
    averageDuration: 200,
    successRate: 0.95,
  },
  errorMetrics: {
    totalErrors: 20,
    errorsByType: {
      NetworkError: 10,
      TimeoutError: 5,
      ValidationError: 5,
    },
  },
};

const mockAlarms = [
  {
    id: 'alarm-1',
    message: 'High CPU usage detected',
    severity: 'critical',
    timestamp: Date.now(),
  },
  {
    id: 'alarm-2',
    message: 'Memory usage warning',
    severity: 'high',
    timestamp: Date.now(),
  },
  {
    id: 'alarm-3',
    message: 'Low disk space',
    severity: 'medium',
    timestamp: Date.now(),
  },
];

// ============================================
// 辅助函数
// ============================================

async function renderAndWaitForLoad(ui: React.ReactElement) {
  const result = render(ui);
  
  // 等待数据加载完成
  await act(async () => {
    await vi.waitFor(() => {
      expect(mockGetAggregatedMetrics).toHaveBeenCalled();
    });
  });
  
  return result;
}

// ============================================
// 测试套件
// ============================================

describe('SimplePerformanceDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 默认返回成功结果
    mockGetAggregatedMetrics.mockResolvedValue(mockMetrics);
    mockGetAlarms.mockResolvedValue(mockAlarms);
    mockClearAllData.mockResolvedValue(undefined);
    
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基础渲染', () => {
    it('应该渲染组件标题', async () => {
      await renderAndWaitForLoad(<SimplePerformanceDashboard />);

      expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
    });

    it('应该显示 API 请求指标', async () => {
      await renderAndWaitForLoad(<SimplePerformanceDashboard />);

      expect(screen.getByText('API Requests')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
      expect(screen.getByText('150.00ms')).toBeInTheDocument();
      expect(screen.getByText('98.00%')).toBeInTheDocument();
    });

    it('应该显示 Operations 指标', async () => {
      await renderAndWaitForLoad(<SimplePerformanceDashboard />);

      expect(screen.getByText('Operations')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('200.00ms')).toBeInTheDocument();
    });

    it('应该显示 Errors 指标', async () => {
      await renderAndWaitForLoad(<SimplePerformanceDashboard />);

      expect(screen.getByText('Errors')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  describe('加载状态', () => {
    it('应该显示加载状态', async () => {
      // 创建一个慢速 promise
      mockGetAggregatedMetrics.mockImplementation(() => new Promise(() => {}));

      render(<SimplePerformanceDashboard />);

      // 在数据加载前检查加载状态
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('加载完成后应该隐藏加载状态', async () => {
      await renderAndWaitForLoad(<SimplePerformanceDashboard />);

      // 检查内容已加载
      expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
    });
  });

  describe('告警显示', () => {
    it('应该显示活跃告警', async () => {
      await renderAndWaitForLoad(<SimplePerformanceDashboard showAlarms={true} />);

      expect(screen.getByText('Active Alarms')).toBeInTheDocument();
      expect(screen.getByText('High CPU usage detected')).toBeInTheDocument();
      expect(screen.getByText('Memory usage warning')).toBeInTheDocument();
    });

    it('showAlarms=false 不应该显示告警', async () => {
      await renderAndWaitForLoad(<SimplePerformanceDashboard showAlarms={false} />);

      expect(screen.queryByText('Active Alarms')).not.toBeInTheDocument();
    });

    it('没有告警时不应该显示告警区域', async () => {
      mockGetAlarms.mockResolvedValue([]);

      await renderAndWaitForLoad(<SimplePerformanceDashboard showAlarms={true} />);

      expect(screen.queryByText('Active Alarms')).not.toBeInTheDocument();
    });

    it('应该显示告警数量徽章', async () => {
      await renderAndWaitForLoad(<SimplePerformanceDashboard showAlarms={true} />);

      // 有 2 个 critical/high 告警
      expect(screen.getByText('2 Alarms')).toBeInTheDocument();
    });
  });

  describe('错误率显示', () => {
    it('错误率高于 5% 应该显示红色', async () => {
      mockGetAggregatedMetrics.mockResolvedValue({
        ...mockMetrics,
        apiMetrics: {
          ...mockMetrics.apiMetrics,
          errorRate: 0.08, // 8%
        },
      });

      await renderAndWaitForLoad(<SimplePerformanceDashboard />);

      const errorRateElement = screen.getByText('8.00%');
      expect(errorRateElement.className).toContain('text-red');
    });

    it('错误率低于 5% 应该显示正常颜色', async () => {
      await renderAndWaitForLoad(<SimplePerformanceDashboard />);

      const errorRateElement = screen.getByText('2.00%');
      expect(errorRateElement.className).not.toContain('text-red');
    });
  });

  describe('清理数据', () => {
    it('点击清理按钮应该触发确认对话框', async () => {
      await renderAndWaitForLoad(<SimplePerformanceDashboard />);

      const clearButton = screen.getByRole('button', { name: '' }); // Trash icon button
      fireEvent.click(clearButton);

      expect(window.confirm).toHaveBeenCalledWith('Clear all monitoring data?');
    });

    it('确认后应该清理数据并刷新', async () => {
      await renderAndWaitForLoad(<SimplePerformanceDashboard />);

      const clearButton = screen.getByRole('button', { name: '' });
      fireEvent.click(clearButton);

      expect(mockClearAllData).toHaveBeenCalledTimes(1);
    });

    it('取消确认不应该清理数据', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      await renderAndWaitForLoad(<SimplePerformanceDashboard />);

      const clearButton = screen.getByRole('button', { name: '' });
      fireEvent.click(clearButton);

      expect(mockClearAllData).not.toHaveBeenCalled();
    });
  });

  describe('自动刷新', () => {
    it('应该按照指定间隔刷新数据', async () => {
      vi.useFakeTimers();

      await act(async () => {
        render(<SimplePerformanceDashboard refreshInterval={5000} />);
      });

      // 初始加载调用一次
      expect(mockGetAggregatedMetrics).toHaveBeenCalledTimes(1);

      // 快进 5 秒
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // 应该再次调用
      expect(mockGetAggregatedMetrics).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('组件卸载应该取消自动刷新', async () => {
      vi.useFakeTimers();

      const { unmount } = render(
        <SimplePerformanceDashboard refreshInterval={5000} />
      );

      // 等待初始加载
      await act(async () => {
        await vi.waitFor(() => {
          expect(mockGetAggregatedMetrics).toHaveBeenCalledTimes(1);
        });
      });

      unmount();

      // 快进 10 秒
      vi.advanceTimersByTime(10000);

      // 不应该再调用
      expect(mockGetAggregatedMetrics).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe('错误处理', () => {
    it('加载失败应该记录错误', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetAggregatedMetrics.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        render(<SimplePerformanceDashboard />);
      });

      // 等待错误被捕获
      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to load metrics:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('自定义类名', () => {
    it('应该应用自定义类名', async () => {
      await renderAndWaitForLoad(<SimplePerformanceDashboard className="custom-class" />);

      const container = screen.getByText('Performance Monitor').closest('div');
      expect(container?.className).toContain('custom-class');
    });
  });

  describe('时间窗口显示', () => {
    it('应该显示时间窗口信息', async () => {
      await renderAndWaitForLoad(<SimplePerformanceDashboard />);

      expect(screen.getByText('Time window: 5 minutes')).toBeInTheDocument();
    });
  });
});
