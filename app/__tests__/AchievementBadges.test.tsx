/**
 * AchievementBadges 组件测试
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AchievementBadges from '@/components/dashboard/AchievementBadges';

describe('AchievementBadges', () => {
  const mockAchievements = [
    {
      id: 'first_task',
      name: '初出茅庐',
      description: '完成第一个任务',
      icon: '🌟',
      progress: 1,
      total: 1,
      earnedAt: new Date().toISOString(),
    },
    {
      id: 'task_master',
      name: '任务大师',
      description: '完成 100 个任务',
      icon: '🎯',
      progress: 98,
      total: 100,
    },
    {
      id: 'streak_7',
      name: '连续活跃',
      description: '连续 7 天活跃',
      icon: '🔥',
      progress: 7,
      total: 7,
      earnedAt: new Date().toISOString(),
    },
  ];

  it('should render achievement badges', () => {
    render(<AchievementBadges achievements={mockAchievements} />);

    expect(screen.getByText('🏅 成就徽章')).toBeTruthy();
    expect(screen.getByText('初出茅庐')).toBeTruthy();
    expect(screen.getByText('任务大师')).toBeTruthy();
    expect(screen.getByText('连续活跃')).toBeTruthy();
  });

  it('should show earned count', () => {
    render(<AchievementBadges achievements={mockAchievements} />);

    // 2 个已获得 + 默认成就中的一些
    const countBadge = screen.getByText(/2.*\//);
    expect(countBadge).toBeTruthy();
  });

  it('should display progress for incomplete achievements', () => {
    render(<AchievementBadges achievements={mockAchievements} />);

    // 任务大师: 98/100
    expect(screen.getByText('98 / 100')).toBeTruthy();
  });

  it('should show checkmark for earned achievements', () => {
    const { container } = render(<AchievementBadges achievements={mockAchievements} />);

    // 已获得的成就应该有绿色勾
    const checkmarks = container.querySelectorAll('.bg-green-500');
    expect(checkmarks.length).toBeGreaterThan(0);
  });

  it('should handle empty achievements array', () => {
    render(<AchievementBadges achievements={[]} />);

    // 应该显示默认成就列表
    expect(screen.getByText('初出茅庐')).toBeTruthy();
    expect(screen.getByText('任务大师')).toBeTruthy();
  });

  it('should display all default achievements', () => {
    render(<AchievementBadges achievements={[]} />);

    expect(screen.getByText('初出茅庐')).toBeTruthy();
    expect(screen.getByText('任务大师')).toBeTruthy();
    expect(screen.getByText('连续活跃')).toBeTruthy();
    expect(screen.getByText('团队协作')).toBeTruthy();
    expect(screen.getByText('代码战士')).toBeTruthy();
    expect(screen.getByText('顶级贡献者')).toBeTruthy();
  });

  it('should show achievement icons', () => {
    const { container } = render(<AchievementBadges achievements={mockAchievements} />);

    expect(container.textContent).toContain('🌟');
    expect(container.textContent).toContain('🎯');
    expect(container.textContent).toContain('🔥');
  });
});