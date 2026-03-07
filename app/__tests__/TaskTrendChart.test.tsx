/**
 * TaskTrendChart 组件测试
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaskTrendChart from '@/components/dashboard/TaskTrendChart';

describe('TaskTrendChart', () => {
  const mockTrendData = [
    { date: '2024-01-01', completed: 5, created: 3 },
    { date: '2024-01-02', completed: 8, created: 2 },
    { date: '2024-01-03', completed: 6, created: 4 },
    { date: '2024-01-04', completed: 10, created: 5 },
    { date: '2024-01-05', completed: 7, created: 3 },
  ];

  it('should render chart with data', () => {
    render(<TaskTrendChart data={mockTrendData} />);

    expect(screen.getByText('📈 任务趋势')).toBeTruthy();
    expect(screen.getByText(/近 5 天/)).toBeTruthy();
  });

  it('should show total completed and created', () => {
    render(<TaskTrendChart data={mockTrendData} />);

    // 总完成: 5+8+6+10+7 = 36
    expect(screen.getByText(/完成: 36/)).toBeTruthy();
    // 总创建: 3+2+4+5+3 = 17
    expect(screen.getByText(/创建: 17/)).toBeTruthy();
  });

  it('should show empty state when no data', () => {
    render(<TaskTrendChart data={[]} />);

    expect(screen.getByText('暂无数据')).toBeTruthy();
  });

  it('should display date labels for small datasets', () => {
    render(<TaskTrendChart data={mockTrendData.slice(0, 5)} />);

    // 对于小数据集，显示每个日期
    expect(screen.getByText('1/1')).toBeTruthy();
  });

  it('should handle single data point', () => {
    render(<TaskTrendChart data={[{ date: '2024-01-01', completed: 5, created: 3 }]} />);

    expect(screen.getByText('📈 任务趋势')).toBeTruthy();
    expect(screen.getByText(/近 1 天/)).toBeTruthy();
  });

  it('should have correct legend colors', () => {
    const { container } = render(<TaskTrendChart data={mockTrendData} />);

    const greenDot = container.querySelector('.bg-green-500');
    const blueDot = container.querySelector('.bg-blue-500');

    expect(greenDot).toBeTruthy();
    expect(blueDot).toBeTruthy();
  });
});