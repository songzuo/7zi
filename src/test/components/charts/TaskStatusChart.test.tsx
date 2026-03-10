/**
 * TaskStatusChart 组件单元测试
 * 测试任务状态饼图组件
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskStatusChart } from '@/components/charts/TaskStatusChart';
import { TaskStatus } from '@/lib/types/task-types';

// Mock Chart.js
vi.mock('chart.js', () => ({
  Chart: vi.fn(),
  register: vi.fn(),
}));

vi.mock('react-chartjs-2', () => ({
  Pie: vi.fn(({ data, options }) => (
    <div data-testid="pie-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      Mocked Pie Chart
    </div>
  )),
}));

describe('TaskStatusChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('渲染测试', () => {
    it('应该正确渲染图表组件', () => {
      const tasks = [
        { status: 'pending' as TaskStatus },
        { status: 'completed' as TaskStatus },
      ];
      
      render(<TaskStatusChart tasks={tasks} />);
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('应该显示图表标题', () => {
      const tasks: { status: TaskStatus }[] = [];
      render(<TaskStatusChart tasks={tasks} />);
      
      const chart = screen.getByTestId('pie-chart');
      const options = JSON.parse(chart.getAttribute('data-chart-options') || '{}');
      expect(options.plugins.title.display).toBe(true);
      expect(options.plugins.title.text).toBe('任务状态分布');
    });
  });

  describe('数据计算测试', () => {
    it('应该正确计算待处理任务数量', () => {
      const tasks = [
        { status: 'pending' as TaskStatus },
        { status: 'pending' as TaskStatus },
        { status: 'pending' as TaskStatus },
        { status: 'completed' as TaskStatus },
      ];
      
      render(<TaskStatusChart tasks={tasks} />);
      
      const chart = screen.getByTestId('pie-chart');
      const data = JSON.parse(chart.getAttribute('data-chart-data') || '{}');
      
      // pending 是第一个数据点
      expect(data.datasets[0].data[0]).toBe(3);
    });

    it('应该正确计算已分配任务数量', () => {
      const tasks = [
        { status: 'assigned' as TaskStatus },
        { status: 'assigned' as TaskStatus },
        { status: 'completed' as TaskStatus },
      ];
      
      render(<TaskStatusChart tasks={tasks} />);
      
      const chart = screen.getByTestId('pie-chart');
      const data = JSON.parse(chart.getAttribute('data-chart-data') || '{}');
      
      // assigned 是第二个数据点
      expect(data.datasets[0].data[1]).toBe(2);
    });

    it('应该正确计算进行中任务数量', () => {
      const tasks = [
        { status: 'in_progress' as TaskStatus },
        { status: 'in_progress' as TaskStatus },
        { status: 'in_progress' as TaskStatus },
        { status: 'in_progress' as TaskStatus },
        { status: 'pending' as TaskStatus },
      ];
      
      render(<TaskStatusChart tasks={tasks} />);
      
      const chart = screen.getByTestId('pie-chart');
      const data = JSON.parse(chart.getAttribute('data-chart-data') || '{}');
      
      // in_progress 是第三个数据点
      expect(data.datasets[0].data[2]).toBe(4);
    });

    it('应该正确计算已完成任务数量', () => {
      const tasks = [
        { status: 'completed' as TaskStatus },
        { status: 'completed' as TaskStatus },
        { status: 'pending' as TaskStatus },
      ];
      
      render(<TaskStatusChart tasks={tasks} />);
      
      const chart = screen.getByTestId('pie-chart');
      const data = JSON.parse(chart.getAttribute('data-chart-data') || '{}');
      
      // completed 是第四个数据点
      expect(data.datasets[0].data[3]).toBe(2);
    });

    it('应该处理空任务列表', () => {
      const tasks: { status: TaskStatus }[] = [];
      
      render(<TaskStatusChart tasks={tasks} />);
      
      const chart = screen.getByTestId('pie-chart');
      const data = JSON.parse(chart.getAttribute('data-chart-data') || '{}');
      
      // 所有状态应该都是 0
      expect(data.datasets[0].data).toEqual([0, 0, 0, 0]);
    });

    it('应该正确计算混合状态任务', () => {
      const tasks = [
        { status: 'pending' as TaskStatus },
        { status: 'assigned' as TaskStatus },
        { status: 'in_progress' as TaskStatus },
        { status: 'completed' as TaskStatus },
        { status: 'completed' as TaskStatus },
        { status: 'pending' as TaskStatus },
      ];
      
      render(<TaskStatusChart tasks={tasks} />);
      
      const chart = screen.getByTestId('pie-chart');
      const data = JSON.parse(chart.getAttribute('data-chart-data') || '{}');
      
      expect(data.datasets[0].data).toEqual([2, 1, 1, 2]);
    });
  });

  describe('图表配置测试', () => {
    it('应该有正确的标签', () => {
      const tasks: { status: TaskStatus }[] = [];
      render(<TaskStatusChart tasks={tasks} />);
      
      const chart = screen.getByTestId('pie-chart');
      const data = JSON.parse(chart.getAttribute('data-chart-data') || '{}');
      
      expect(data.labels).toEqual(['待处理', '已分配', '进行中', '已完成']);
    });

    it('应该使用正确的颜色方案', () => {
      const tasks: { status: TaskStatus }[] = [];
      render(<TaskStatusChart tasks={tasks} />);
      
      const chart = screen.getByTestId('pie-chart');
      const data = JSON.parse(chart.getAttribute('data-chart-data') || '{}');
      
      // amber-500 for pending, blue-500 for assigned, cyan-500 for in_progress, emerald-500 for completed
      expect(data.datasets[0].backgroundColor).toEqual([
        '#f59e0b',
        '#3b82f6',
        '#06b6d4',
        '#10b981',
      ]);
    });

    it('应该设置响应式配置', () => {
      const tasks: { status: TaskStatus }[] = [];
      render(<TaskStatusChart tasks={tasks} />);
      
      const chart = screen.getByTestId('pie-chart');
      const options = JSON.parse(chart.getAttribute('data-chart-options') || '{}');
      
      expect(options.responsive).toBe(true);
      expect(options.maintainAspectRatio).toBe(false);
    });

    it('应该设置图例在底部', () => {
      const tasks: { status: TaskStatus }[] = [];
      render(<TaskStatusChart tasks={tasks} />);
      
      const chart = screen.getByTestId('pie-chart');
      const options = JSON.parse(chart.getAttribute('data-chart-options') || '{}');
      
      expect(options.plugins.legend.position).toBe('bottom');
    });
  });

  describe('边界情况测试', () => {
    it('应该处理只有一种状态的任务', () => {
      const tasks = [
        { status: 'completed' as TaskStatus },
        { status: 'completed' as TaskStatus },
        { status: 'completed' as TaskStatus },
      ];
      
      render(<TaskStatusChart tasks={tasks} />);
      
      const chart = screen.getByTestId('pie-chart');
      const data = JSON.parse(chart.getAttribute('data-chart-data') || '{}');
      
      expect(data.datasets[0].data).toEqual([0, 0, 0, 3]);
    });

    it('应该处理大量任务', () => {
      const tasks = Array.from({ length: 1000 }, (_, i) => ({
        status: ['pending', 'assigned', 'in_progress', 'completed'][i % 4] as TaskStatus,
      }));
      
      render(<TaskStatusChart tasks={tasks} />);
      
      const chart = screen.getByTestId('pie-chart');
      const data = JSON.parse(chart.getAttribute('data-chart-data') || '{}');
      
      // 每种状态应该各有 250 个
      expect(data.datasets[0].data).toEqual([250, 250, 250, 250]);
    });
  });
});