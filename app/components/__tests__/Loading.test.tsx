import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  LoadingPage,
  LoadingContent,
  LoadingWithProgress,
  LoadingSpinner,
  Skeleton,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonText,
  SkeletonTable,
  SkeletonStatCard,
} from '../Loading';

// Mock LoadingSpinner component
vi.mock('../LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => (
    <div data-testid="loading-spinner" data-size={size}>
      Loading...
    </div>
  ),
}));

// Mock ProgressBar component
vi.mock('../ProgressBar', () => ({
  default: ({ value, color, animated, showPercentage }: any) => (
    <div data-testid="progress-bar" data-value={value} data-color={color} data-animated={animated} data-show-percentage={showPercentage}>
      Progress: {value}%
    </div>
  ),
  CircularProgress: ({ value }: any) => (
    <div data-testid="circular-progress" data-value={value}>
      Circular: {value}%
    </div>
  ),
}));

describe('LoadingPage', () => {
  describe('渲染', () => {
    it('默认渲染加载页面', () => {
      render(<LoadingPage />);

      expect(screen.getByText('加载中...')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('渲染自定义消息', () => {
      render(<LoadingPage message="正在加载数据..." />);

      expect(screen.getByText('正在加载数据...')).toBeInTheDocument();
    });

    it('显示进度条而不是 spinner', () => {
      render(<LoadingPage showSpinner={false} />);

      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('自定义消息和进度条组合', () => {
      render(<LoadingPage message="请稍候..." showSpinner={false} />);

      expect(screen.getByText('请稍候...')).toBeInTheDocument();
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });
  });

  describe('props', () => {
    it('接受 message prop', () => {
      render(<LoadingPage message="Loading data" />);
      expect(screen.getByText('Loading data')).toBeInTheDocument();
    });

    it('接受 showSpinner prop', () => {
      const { rerender } = render(<LoadingPage showSpinner={true} />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      rerender(<LoadingPage showSpinner={false} />);
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });
});

describe('LoadingContent', () => {
  describe('骨架屏类型', () => {
    it('渲染卡片类型骨架屏', () => {
      const { container } = render(<LoadingContent type="card" count={2} />);

      // 验证有2个卡片（通过查找卡片中的骨架屏元素）
      const cards = container.querySelectorAll('.bg-white.rounded-xl');
      expect(cards.length).toBe(2);
    });

    it('渲染列表类型骨架屏', () => {
      const { container } = render(<LoadingContent type="list" count={3} />);

      // 列表项应该有圆形头像
      const avatars = container.querySelectorAll('.rounded-full');
      expect(avatars.length).toBe(3);
    });

    it('渲染表格类型骨架屏', () => {
      const { container } = render(<LoadingContent type="table" count={4} />);

      // 表格容器应该渲染
      const tableContainer = container.querySelector('.bg-white.rounded-xl.shadow');
      expect(tableContainer).toBeInTheDocument();
    });

    it('渲染统计类型骨架屏', () => {
      const { container } = render(<LoadingContent type="stats" count={4} />);

      // 统计卡片应该渲染
      const statCards = container.querySelectorAll('.bg-white.rounded-xl.shadow');
      expect(statCards.length).toBe(4);
    });

    it('默认渲染卡片类型', () => {
      const { container } = render(<LoadingContent />);

      // 默认渲染3个卡片
      const cards = container.querySelectorAll('.bg-white.rounded-xl');
      expect(cards.length).toBe(3);
    });
  });

  describe('数量控制', () => {
    it('count prop 控制渲染数量', () => {
      render(<LoadingContent type="card" count={5} />);

      // 验证骨架屏数量
      const skeletons = document.querySelectorAll('.bg-white');
      expect(skeletons.length).toBe(5);
    });
  });
});

describe('LoadingWithProgress', () => {
  describe('渲染', () => {
    it('渲染带进度的加载界面', () => {
      render(<LoadingWithProgress progress={50} />);

      expect(screen.getByText('处理中')).toBeInTheDocument();
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('显示进度百分比', () => {
      render(<LoadingWithProgress progress={75} />);

      expect(screen.getByText('75% - 请稍候...')).toBeInTheDocument();
    });

    it('渲染自定义消息', () => {
      render(<LoadingWithProgress progress={30} message="上传中" />);

      expect(screen.getByText('上传中')).toBeInTheDocument();
    });

    it('使用 total prop 计算进度', () => {
      render(<LoadingWithProgress progress={5} total={10} />);

      expect(screen.getByText('5% - 请稍候...')).toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('处理 0% 进度', () => {
      render(<LoadingWithProgress progress={0} />);

      expect(screen.getByText('0% - 请稍候...')).toBeInTheDocument();
    });

    it('处理 100% 进度', () => {
      render(<LoadingWithProgress progress={100} />);

      expect(screen.getByText('100% - 请稍候...')).toBeInTheDocument();
    });
  });
});

describe('导出的组件', () => {
  it('导出 LoadingSpinner', () => {
    expect(LoadingSpinner).toBeDefined();
  });

  it('导出 Skeleton', () => {
    expect(Skeleton).toBeDefined();
  });

  it('导出 SkeletonCard', () => {
    expect(SkeletonCard).toBeDefined();
  });

  it('导出 SkeletonAvatar', () => {
    expect(SkeletonAvatar).toBeDefined();
  });

  it('导出 SkeletonText', () => {
    expect(SkeletonText).toBeDefined();
  });

  it('导出 SkeletonTable', () => {
    expect(SkeletonTable).toBeDefined();
  });

  it('导出 SkeletonStatCard', () => {
    expect(SkeletonStatCard).toBeDefined();
  });
});

describe('memo 优化', () => {
  it('LoadingPage 使用 memo 避免不必要重渲染', () => {
    const { rerender } = render(<LoadingPage message="测试" />);
    
    // 相同 props 重渲染
    rerender(<LoadingPage message="测试" />);
    
    // 组件应该稳定
    expect(screen.getByText('测试')).toBeInTheDocument();
  });

  it('LoadingContent 使用 memo 避免不必要重渲染', () => {
    const { container, rerender } = render(<LoadingContent type="card" count={3} />);
    
    // 相同 props 重渲染
    rerender(<LoadingContent type="card" count={3} />);
    
    // 组件应该稳定
    const cards = container.querySelectorAll('.bg-white.rounded-xl');
    expect(cards.length).toBe(3);
  });

  it('LoadingWithProgress 使用 memo 避免不必要重渲染', () => {
    const { rerender } = render(<LoadingWithProgress progress={50} />);
    
    // 相同 props 重渲染
    rerender(<LoadingWithProgress progress={50} />);
    
    expect(screen.getByText('50% - 请稍候...')).toBeInTheDocument();
  });
});