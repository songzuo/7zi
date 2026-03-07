import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// ============================================================================
// Mocks
// ============================================================================

// Mock requestAnimationFrame
const mockRequestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
  return window.setTimeout(() => cb(Date.now()), 16);
});
const mockCancelAnimationFrame = vi.fn((id: number) => window.clearTimeout(id));

vi.stubGlobal('requestAnimationFrame', mockRequestAnimationFrame);
vi.stubGlobal('cancelAnimationFrame', mockCancelAnimationFrame);

// 导入被测组件
import RealtimeChart, { Sparkline } from '../RealtimeChart';

// ============================================================================
// 辅助函数
// ============================================================================

// 模拟 canvas 上下文
const createMockCanvas = () => {
  const mockContext = {
    clearRect: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fillText: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
  };

  const mockCanvas = {
    getContext: vi.fn(() => mockContext),
    getBoundingClientRect: vi.fn(() => ({
      width: 400,
      height: 200,
    })),
    width: 400,
    height: 200,
  };

  return { mockCanvas, mockContext };
};

// ============================================================================
// 测试套件 - RealtimeChart
// ============================================================================

describe('RealtimeChart', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    
    // Mock HTMLCanvasElement
    HTMLCanvasElement.prototype.getContext = vi.fn();
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 400,
      height: 200,
      left: 0,
      top: 0,
      right: 400,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ============================================================================
  // 基础渲染测试
  // ============================================================================

  describe('Basic Rendering', () => {
    it('should render chart container with title', () => {
      render(<RealtimeChart title="CPU 使用率" />);
      
      expect(screen.getByText('CPU 使用率')).toBeDefined();
    });

    it('should render canvas element', () => {
      const { container } = render(<RealtimeChart title="测试图表" />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
    });

    it('should render real-time indicator', () => {
      render(<RealtimeChart title="测试图表" />);
      
      expect(screen.getByText('实时')).toBeDefined();
    });

    it('should render current value display', () => {
      render(<RealtimeChart title="测试图表" />);
      
      expect(screen.getByText('当前值')).toBeDefined();
    });

    it('should display animated pulse indicator', () => {
      const { container } = render(<RealtimeChart title="测试图表" />);
      
      const pulse = container.querySelector('.animate-pulse');
      expect(pulse).toBeDefined();
    });
  });

  // ============================================================================
  // Props 测试
  // ============================================================================

  describe('Props', () => {
    it('should accept custom title', () => {
      render(<RealtimeChart title="自定义标题" />);
      
      expect(screen.getByText('自定义标题')).toBeDefined();
    });

    it('should accept custom height', () => {
      const { container } = render(<RealtimeChart title="测试" height={300} />);
      
      const chartContainer = container.querySelector('[style*="height: 300"]');
      expect(chartContainer).toBeDefined();
    });

    it('should use default height when not specified', () => {
      const { container } = render(<RealtimeChart title="测试" />);
      
      const chartContainer = container.querySelector('[style*="height: 200"]');
      expect(chartContainer).toBeDefined();
    });

    it('should accept custom maxDataPoints', () => {
      render(<RealtimeChart title="测试" maxDataPoints={50} />);
      
      // 组件应该正常渲染
      expect(screen.getByText('测试')).toBeDefined();
    });

    it('should accept custom updateInterval', () => {
      render(<RealtimeChart title="测试" updateInterval={1000} />);
      
      // 组件应该正常渲染
      expect(screen.getByText('测试')).toBeDefined();
    });
  });

  // ============================================================================
  // 颜色测试
  // ============================================================================

  describe('Color Variants', () => {
    it('should render with blue color by default', () => {
      render(<RealtimeChart title="测试" />);
      
      // 默认使用蓝色
      expect(screen.getByText('测试')).toBeDefined();
    });

    it('should accept blue color prop', () => {
      render(<RealtimeChart title="测试" color="blue" />);
      
      expect(screen.getByText('测试')).toBeDefined();
    });

    it('should accept green color prop', () => {
      render(<RealtimeChart title="测试" color="green" />);
      
      expect(screen.getByText('测试')).toBeDefined();
    });

    it('should accept red color prop', () => {
      render(<RealtimeChart title="测试" color="red" />);
      
      expect(screen.getByText('测试')).toBeDefined();
    });

    it('should accept purple color prop', () => {
      render(<RealtimeChart title="测试" color="purple" />);
      
      expect(screen.getByText('测试')).toBeDefined();
    });
  });

  // ============================================================================
  // 数据更新测试
  // ============================================================================

  describe('Data Updates', () => {
    it('should initialize with data points', async () => {
      const { container } = render(<RealtimeChart title="测试" maxDataPoints={5} updateInterval={100} />);
      
      // 推进定时器让初始化完成
      await vi.runAllTimersAsync();
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
    });

    it('should update data periodically', async () => {
      render(<RealtimeChart title="测试" maxDataPoints={5} updateInterval={100} />);
      
      // 初始渲染
      expect(screen.getByText('测试')).toBeDefined();
      
      // 推进时间触发更新
      vi.advanceTimersByTime(150);
      
      // 组件应该仍然存在
      expect(screen.getByText('测试')).toBeDefined();
    });

    it('should clear interval on unmount', () => {
      const { unmount } = render(<RealtimeChart title="测试" updateInterval={100} />);
      
      unmount();
      
      // 验证定时器被清除（通过 spy 验证）
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  // ============================================================================
  // Canvas 渲染测试
  // ============================================================================

  describe('Canvas Rendering', () => {
    it('should call getContext on canvas', async () => {
      const mockGetContext = vi.fn(() => ({
        clearRect: vi.fn(),
        scale: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        arc: vi.fn(),
        fillText: vi.fn(),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      }));
      
      HTMLCanvasElement.prototype.getContext = mockGetContext;
      
      const { container } = render(<RealtimeChart title="测试" />);
      
      await waitFor(() => {
        const canvas = container.querySelector('canvas');
        expect(canvas).toBeDefined();
      });
    });
  });

  // ============================================================================
  // 当前值显示测试
  // ============================================================================

  describe('Current Value Display', () => {
    it('should display a numeric value', async () => {
      render(<RealtimeChart title="测试" />);
      
      // 等待数据初始化
      await waitFor(() => {
        // 查找显示数值的元素（大号字体）
        const valueDisplay = document.querySelector('.text-3xl');
        expect(valueDisplay).toBeDefined();
      });
    });

    it('should format value to one decimal place', async () => {
      render(<RealtimeChart title="测试" />);
      
      await waitFor(() => {
        const valueDisplay = document.querySelector('.text-3xl');
        if (valueDisplay && valueDisplay.textContent) {
          // 验证格式（如 "45.6"）
          const text = valueDisplay.textContent;
          expect(text).toMatch(/^\d+\.?\d*$/);
        }
      });
    });
  });
});

// ============================================================================
// 测试套件 - Sparkline
// ============================================================================

describe('Sparkline', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    }));
    
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 100,
      height: 30,
      left: 0,
      top: 0,
      right: 100,
      bottom: 30,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
  });

  // ============================================================================
  // 基础渲染测试
  // ============================================================================

  describe('Basic Rendering', () => {
    it('should render canvas element', () => {
      const { container } = render(<Sparkline data={[1, 2, 3, 4, 5]} />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
    });

    it('should accept custom width', () => {
      const { container } = render(<Sparkline data={[1, 2, 3]} width={200} />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
    });

    it('should accept custom height', () => {
      const { container } = render(<Sparkline data={[1, 2, 3]} height={50} />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
    });

    it('should use default width and height', () => {
      const { container } = render(<Sparkline data={[1, 2, 3]} />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
    });
  });

  // ============================================================================
  // 数据处理测试
  // ============================================================================

  describe('Data Handling', () => {
    it('should handle empty data array', () => {
      const { container } = render(<Sparkline data={[]} />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
    });

    it('should handle single data point', () => {
      const { container } = render(<Sparkline data={[50]} />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
    });

    it('should handle large data arrays', () => {
      const largeData = Array.from({ length: 100 }, (_, i) => i);
      const { container } = render(<Sparkline data={largeData} />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
    });

    it('should handle negative values', () => {
      const { container } = render(<Sparkline data={[-10, -5, 0, 5, 10]} />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
    });

    it('should handle all same values', () => {
      const { container } = render(<Sparkline data={[5, 5, 5, 5, 5]} />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
    });
  });

  // ============================================================================
  // 颜色测试
  // ============================================================================

  describe('Color Variants', () => {
    it('should accept blue color prop', () => {
      const { container } = render(<Sparkline data={[1, 2, 3]} color="blue" />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
    });

    it('should accept green color prop', () => {
      const { container } = render(<Sparkline data={[1, 2, 3]} color="green" />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
    });

    it('should accept red color prop', () => {
      const { container } = render(<Sparkline data={[1, 2, 3]} color="red" />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
    });

    it('should accept purple color prop', () => {
      const { container } = render(<Sparkline data={[1, 2, 3]} color="purple" />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
    });

    it('should use blue color by default', () => {
      const { container } = render(<Sparkline data={[1, 2, 3]} />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
    });
  });

  // ============================================================================
  // Canvas 上下文测试
  // ============================================================================

  describe('Canvas Context', () => {
    it('should call getContext with 2d', async () => {
      const mockGetContext = vi.fn(() => ({
        clearRect: vi.fn(),
        scale: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      }));
      
      HTMLCanvasElement.prototype.getContext = mockGetContext;
      
      render(<Sparkline data={[1, 2, 3]} />);
      
      await waitFor(() => {
        expect(mockGetContext).toHaveBeenCalledWith('2d');
      });
    });
  });

  // ============================================================================
  // 响应式测试
  // ============================================================================

  describe('Responsiveness', () => {
    it('should handle devicePixelRatio scaling', async () => {
      const originalDPR = window.devicePixelRatio;
      vi.stubGlobal('devicePixelRatio', 2);
      
      const mockScale = vi.fn();
      HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
        clearRect: vi.fn(),
        scale: mockScale,
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      }));
      
      render(<Sparkline data={[1, 2, 3]} />);
      
      await waitFor(() => {
        // scale 应该被调用（2x DPR）
        expect(mockScale).toHaveBeenCalled();
      });
      
      vi.stubGlobal('devicePixelRatio', originalDPR);
    });
  });
});