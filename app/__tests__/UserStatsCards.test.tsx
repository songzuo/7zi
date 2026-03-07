/**
 * UserStatsCards 组件测试
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserStatsCards from '@/components/dashboard/UserStatsCards';

describe('UserStatsCards', () => {
  const mockStats = {
    totalTasks: 156,
    completedTasks: 98,
    inProgressTasks: 42,
    overdueTasks: 3,
    contributionScore: 2450,
    ranking: 3,
    totalMembers: 11,
    streak: 7,
    achievements: 4,
  };

  it('should render all stat cards', () => {
    render(<UserStatsCards stats={mockStats} />);

    expect(screen.getByText('总任务')).toBeTruthy();
    expect(screen.getByText('已完成')).toBeTruthy();
    expect(screen.getByText('进行中')).toBeTruthy();
    expect(screen.getByText('已逾期')).toBeTruthy();
    expect(screen.getByText('贡献积分')).toBeTruthy();
    expect(screen.getByText('排名')).toBeTruthy();
    expect(screen.getByText('连续活跃')).toBeTruthy();
    expect(screen.getByText('成就')).toBeTruthy();
  });

  it('should display correct values', () => {
    render(<UserStatsCards stats={mockStats} />);

    expect(screen.getByText('156')).toBeTruthy();
    expect(screen.getByText('98')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('2,450')).toBeTruthy();
    expect(screen.getByText(/#3/)).toBeTruthy();
    expect(screen.getByText('7 天')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('should handle zero values', () => {
    render(<UserStatsCards stats={{
      ...mockStats,
      totalTasks: 0,
      completedTasks: 0,
    }} />);

    expect(screen.getByText('0')).toBeTruthy();
  });

  it('should format ranking correctly', () => {
    render(<UserStatsCards stats={mockStats} />);

    // 排名显示为 #3 / 11
    const rankingText = screen.getByText(/#3.*11/);
    expect(rankingText).toBeTruthy();
  });
});