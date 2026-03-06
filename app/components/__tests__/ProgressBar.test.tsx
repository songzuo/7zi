import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ProgressBar, { CircularProgress, MultiProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('渲染', () => {
    it('渲染默认进度条', () => {
      render(<ProgressBar value={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('显示百分比', () => {
      render(<ProgressBar value={75} showPercentage />);

      expect(screen.getByText('75.0%')).toBeInTheDocument();
    });

    it('显示标签', () => {
      render(<ProgressBar value={50} label="加载进度" />);

      expect(screen.getByText('加载进度')).toBeInTheDocument();
    });

    it('同时显示标签和百分比', () => {
      render(
        <ProgressBar value={60} label="上传" showPercentage />
      );

      expect(screen.getByText('上传')).toBeInTheDocument();
      expect(screen.getByText('60.0%')).toBeInTheDocument();
    });
  });

  describe('props', () => {
    it('接受不同的 max 值', () => {
      render(<ProgressBar value={75} max={200} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuemax', '200');
    });

    it('接受不同的颜色', () => {
      const { rerender } = render(<ProgressBar value={50} color="blue" />);

      // 蓝色
      const bar = document.querySelector('.bg-blue-500');
      expect(bar).toBeInTheDocument();

      // 绿色
      rerender(<ProgressBar value={50} color="green" />);
      const greenBar = document.querySelector('.bg-green-500');
      expect(greenBar).toBeInTheDocument();

      // 红色
      rerender(<ProgressBar value={50} color="red" />);
      const redBar = document.querySelector('.bg-red-500');
      expect(redBar).toBeInTheDocument();

      // 渐变
      rerender(<ProgressBar value={50} color="gradient" />);
      const gradientBar = document.querySelector('.bg-gradient-to-r');
      expect(gradientBar).toBeInTheDocument();
    });

    it('接受不同的尺寸', () => {
      const { rerender } = render(<ProgressBar value={50} size="sm" />);

      // 小尺寸
      const smallBar = document.querySelector('.h-2');
      expect(smallBar).toBeInTheDocument();

      // 中尺寸
      rerender(<ProgressBar value={50} size="md" />);
      const mediumBar = document.querySelector('.h-3');
      expect(mediumBar).toBeInTheDocument();

      // 大尺寸
      rerender(<ProgressBar value={50} size="lg" />);
      const largeBar = document.querySelector('.h-4');
      expect(largeBar).toBeInTheDocument();
    });

    it('控制动画开关', () => {
      const { container } = render(<ProgressBar value={50} animated={false} />);

      // 不动画时立即显示最终值
      const bar = container.querySelector('[style*="width: 50%"]');
      expect(bar).toBeInTheDocument();
    });

    it('支持条纹样式', () => {
      const { container } = render(<ProgressBar value={50} striped />);

      const stripedBar = container.querySelector('.bg-stripes');
      expect(stripedBar).toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('处理 0 值', () => {
      render(<ProgressBar value={0} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    });

    it('处理超过 max 的值', () => {
      render(<ProgressBar value={150} />);

      // 应该限制在 100%
      const bar = document.querySelector('[style*="width: 100%"]');
      expect(bar).toBeInTheDocument();
    });

    it('处理负值', () => {
      render(<ProgressBar value={-10} />);

      // 应该限制在 0%
      const bar = document.querySelector('[style*="width: 0%"]');
      expect(bar).toBeInTheDocument();
    });
  });

  describe('动画', () => {
    it('动画效果渐进显示', () => {
      const { container } = render(<ProgressBar value={100} />);

      // 初始应该小于 100%
      vi.advanceTimersByTime(100);
      const initialBar = container.querySelector('[style]');
      const initialWidth = initialBar?.style.width;
      expect(parseFloat(initialWidth || '0')).toBeLessThan(100);

      // 最终应该达到 100%
      vi.advanceTimersByTime(500);
      const finalBar = container.querySelector('[style]');
      const finalWidth = finalBar?.style.width;
      expect(parseFloat(finalWidth || '0')).toBeGreaterThanOrEqual(100);
    });
  });
});

describe('CircularProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('渲染', () => {
    it('渲染环形进度条', () => {
      render(<CircularProgress value={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
    });

    it('显示百分比数值', () => {
      render(<CircularProgress value={75} />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('显示标签', () => {
      render(<CircularProgress value={50} label="完成" />);

      expect(screen.getByText('完成')).toBeInTheDocument();
    });
  });

  describe('props', () => {
    it('接受不同的尺寸', () => {
      const { container } = render(<CircularProgress value={50} size={150} />);

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('150');
      expect(svg?.getAttribute('height')).toBe('150');
    });

    it('接受不同的描边宽度', () => {
      const { container } = render(<CircularProgress value={50} strokeWidth={12} />);

      const circles = container.querySelectorAll('circle');
      circles.forEach(circle => {
        expect(circle.getAttribute('strokeWidth')).toBe('12');
      });
    });

    it('接受不同的颜色', () => {
      const { container } = render(<CircularProgress value={50} color="green" />);

      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle?.getAttribute('stroke')).toBe('#10b981');
    });

    it('隐藏数值显示', () => {
      render(<CircularProgress value={50} showValue={false} />);

      expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('处理 0 值', () => {
      render(<CircularProgress value={0} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('处理 100 值', () => {
      render(<CircularProgress value={100} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('处理超过 100 的值', () => {
      render(<CircularProgress value={150} />);

      // 应该限制在 100%
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('动画', () => {
    it('动画效果渐进显示', () => {
      const { container } = render(<CircularProgress value={100} />);

      // 初始应该小于 100%
      vi.advanceTimersByTime(100);
      const initialText = screen.getByText(/\d+%/);
      const initialValue = parseInt(initialText.textContent || '0');
      expect(initialValue).toBeLessThan(100);

      // 最终应该达到 100%
      vi.advanceTimersByTime(500);
      const finalText = screen.getByText(/\d+%/);
      const finalValue = parseInt(finalText.textContent || '0');
      expect(finalValue).toBe(100);
    });
  });
});

describe('MultiProgressBar', () => {
  describe('渲染', () => {
    it('渲染多段进度条', () => {
      const segments = [
        { value: 30, color: 'blue' as const, label: '蓝色' },
        { value: 20, color: 'green' as const, label: '绿色' },
        { value: 50, color: 'red' as const, label: '红色' },
      ];

      render(<MultiProgressBar segments={segments} />);

      // 应该有3个段
      const bars = document.querySelectorAll('.bg-blue-500, .bg-green-500, .bg-red-500');
      expect(bars.length).toBe(3);
    });

    it('显示所有标签', () => {
      const segments = [
        { value: 30, color: 'blue' as const, label: '上传' },
        { value: 20, color: 'green' as const, label: '处理' },
      ];

      render(<MultiProgressBar segments={segments} />);

      expect(screen.getByText('上传: 30')).toBeInTheDocument();
      expect(screen.getByText('处理: 20')).toBeInTheDocument();
    });

    it('不显示无标签的段', () => {
      const segments = [
        { value: 50, color: 'blue' as const },
        { value: 30, color: 'green' as const, label: '绿色' },
      ];

      render(<MultiProgressBar segments={segments} />);

      expect(screen.queryByText('绿色: 30')).toBeInTheDocument();
      expect(screen.queryByText(': 50')).not.toBeInTheDocument();
    });
  });

  describe('props', () => {
    it('接受不同的尺寸', () => {
      const segments = [{ value: 100, color: 'blue' as const }];

      const { container } = render(<MultiProgressBar segments={segments} size="lg" />);

      const bar = container.querySelector('.h-4');
      expect(bar).toBeInTheDocument();
    });

    it('正确计算每段的宽度', () => {
      const segments = [
        { value: 25, color: 'blue' as const },
        { value: 25, color: 'green' as const },
        { value: 50, color: 'red' as const },
      ];

      const { container } = render(<MultiProgressBar segments={segments} />);

      const bars = container.querySelectorAll('[style*="width"]');
      expect(bars[0]?.style.width).toBe('25%');
      expect(bars[1]?.style.width).toBe('25%');
      expect(bars[2]?.style.width).toBe('50%');
    });
  });

  describe('无障碍性', () => {
    it('每个段都有正确的 ARIA 属性', () => {
      const segments = [
        { value: 30, color: 'blue' as const, label: '测试' },
      ];

      render(<MultiProgressBar segments={segments} />);

      const progressbar = screen.getByRole('progressbar', { name: '测试' });
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '30');
    });
  });
});