import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ContributionChart from '../components/ContributionChart';
import type { TeamMember } from '../components/Dashboard';

// 清理 React StrictMode 导致的重复渲染
afterEach(() => {
  cleanup();
});

// ============================================================================
// 测试数据工厂
// ============================================================================
const createMockMember = (overrides?: Partial<TeamMember>): TeamMember => ({
  id: 'test-1',
  name: '测试代理',
  role: '测试工程师',
  status: 'active',
  avatar: 'https://example.com/avatar.png',
  currentTask: '测试任务',
  completedTasks: 10,
  contributionScore: 100,
  ...overrides,
});

const mockMembers: TeamMember[] = [
  createMockMember({
    id: 'expert',
    name: '智能体世界专家',
    role: '视角转换/未来布局',
    status: 'active',
    completedTasks: 15,
    contributionScore: 150,
  }),
  createMockMember({
    id: 'architect',
    name: '架构师',
    role: '设计/规划',
    status: 'active',
    completedTasks: 8,
    contributionScore: 80,
  }),
  createMockMember({
    id: 'executor',
    name: 'Executor',
    role: '执行/实现',
    status: 'idle',
    completedTasks: 12,
    contributionScore: 120,
  }),
  createMockMember({
    id: 'tester',
    name: '测试员',
    role: '测试/调试',
    status: 'offline',
    completedTasks: 5,
    contributionScore: 50,
  }),
];

// ============================================================================
// 基础渲染测试
// ============================================================================
describe('ContributionChart - Basic Rendering', () => {
  it('renders contribution statistics section', () => {
    render(<ContributionChart members={mockMembers} />);
    expect(screen.getByText('贡献度排行')).toBeTruthy();
  });

  it('renders status distribution section', () => {
    render(<ContributionChart members={mockMembers} />);
    expect(screen.getByText('状态分布')).toBeTruthy();
  });

  it('renders task completion section', () => {
    render(<ContributionChart members={mockMembers} />);
    expect(screen.getByText('任务完成率')).toBeTruthy();
  });

  it('displays all member names in ranking', () => {
    render(<ContributionChart members={mockMembers} />);
    
    // 使用 getAllByText 因为成员名在多个部分出现
    expect(screen.getAllByText('智能体世界专家').length).toBeGreaterThan(0);
    expect(screen.getAllByText('架构师').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Executor').length).toBeGreaterThan(0);
    expect(screen.getAllByText('测试员').length).toBeGreaterThan(0);
  });

  it('displays member roles', () => {
    render(<ContributionChart members={mockMembers} />);
    
    expect(screen.getByText(/\(视角转换\/未来布局\)/)).toBeTruthy();
    expect(screen.getByText(/\(设计\/规划\)/)).toBeTruthy();
    expect(screen.getByText(/\(执行\/实现\)/)).toBeTruthy();
    expect(screen.getByText(/\(测试\/调试\)/)).toBeTruthy();
  });
});

// ============================================================================
// 统计卡片测试
// ============================================================================
describe('ContributionChart - Stats Cards', () => {
  it('displays total contributions', () => {
    render(<ContributionChart members={mockMembers} />);
    
    const totalContributions = mockMembers.reduce((sum, m) => sum + m.contributionScore, 0);
    expect(screen.getByText(totalContributions.toString())).toBeTruthy();
  });

  it('displays active members count', () => {
    render(<ContributionChart members={mockMembers} />);
    
    const activeCount = mockMembers.filter(m => m.status === 'active').length;
    expect(screen.getByText(activeCount.toString())).toBeTruthy();
    expect(screen.getByText('活跃成员')).toBeTruthy();
  });

  it('displays average contribution', () => {
    render(<ContributionChart members={mockMembers} />);
    
    const totalContributions = mockMembers.reduce((sum, m) => sum + m.contributionScore, 0);
    const avg = Math.round(totalContributions / mockMembers.length);
    expect(screen.getByText(avg.toString())).toBeTruthy();
    expect(screen.getByText('平均贡献')).toBeTruthy();
  });

  it('displays total completed tasks', () => {
    render(<ContributionChart members={mockMembers} />);
    
    const totalTasks = mockMembers.reduce((sum, m) => sum + m.completedTasks, 0);
    expect(screen.getByText(totalTasks.toString())).toBeTruthy();
    expect(screen.getByText('完成任务')).toBeTruthy();
  });

  it('displays correct stat card colors', () => {
    const { container } = render(<ContributionChart members={mockMembers} />);
    
    expect(container.querySelector('.text-blue-600')).toBeTruthy();
    expect(container.querySelector('.text-green-600')).toBeTruthy();
    expect(container.querySelector('.text-purple-600')).toBeTruthy();
    expect(container.querySelector('.text-orange-600')).toBeTruthy();
  });
});

// ============================================================================
// 贡献度排行测试
// ============================================================================
describe('ContributionChart - Contribution Ranking', () => {
  it('sorts members by contribution score (descending)', () => {
    render(<ContributionChart members={mockMembers} />);
    
    const allText = document.body.textContent || '';
    const expertIndex = allText.indexOf('智能体世界专家');
    const executorIndex = allText.indexOf('Executor');
    const architectIndex = allText.indexOf('架构师');
    const testerIndex = allText.indexOf('测试员');
    
    // 排序: expert (150) > executor (120) > architect (80) > tester (50)
    expect(expertIndex).toBeLessThan(executorIndex);
    expect(executorIndex).toBeLessThan(architectIndex);
    expect(architectIndex).toBeLessThan(testerIndex);
  });

  it('displays rank numbers', () => {
    render(<ContributionChart members={mockMembers} />);
    
    expect(screen.getByText('#1')).toBeTruthy();
    expect(screen.getByText('#2')).toBeTruthy();
    expect(screen.getByText('#3')).toBeTruthy();
    expect(screen.getByText('#4')).toBeTruthy();
  });

  it('displays contribution scores', () => {
    render(<ContributionChart members={mockMembers} />);
    
    // 使用 getAllByText 因为分数可能在多处显示
    expect(screen.getAllByText(/150 分/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/120 分/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/80 分/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/50 分/).length).toBeGreaterThan(0);
  });

  it('displays completed tasks count for each member', () => {
    render(<ContributionChart members={mockMembers} />);
    
    expect(screen.getAllByText(/15 任务/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/12 任务/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/8 任务/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/5 任务/).length).toBeGreaterThan(0);
  });

  it('renders progress bars for each member', () => {
    const { container } = render(<ContributionChart members={mockMembers} />);
    
    const progressBars = container.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThanOrEqual(mockMembers.length);
  });

  it('calculates percentage relative to max score', () => {
    render(<ContributionChart members={mockMembers} />);
    
    // 最高分是 150，所以智能体世界专家应该是 100%
    const expertBar = screen.getByLabelText('智能体世界专家 贡献度');
    expect(expertBar.getAttribute('aria-valuenow')).toBe('150');
  });
});

// ============================================================================
// 状态分布饼图测试
// ============================================================================
describe('ContributionChart - Status Pie Chart', () => {
  it('displays status counts correctly', () => {
    render(<ContributionChart members={mockMembers} />);
    
    const activeCount = mockMembers.filter(m => m.status === 'active').length;
    const idleCount = mockMembers.filter(m => m.status === 'idle').length;
    const offlineCount = mockMembers.filter(m => m.status === 'offline').length;
    
    expect(screen.getByText(new RegExp(`活跃: ${activeCount}`))).toBeTruthy();
    expect(screen.getByText(new RegExp(`空闲: ${idleCount}`))).toBeTruthy();
    expect(screen.getByText(new RegExp(`离线: ${offlineCount}`))).toBeTruthy();
  });

  it('calculates status percentages correctly', () => {
    render(<ContributionChart members={mockMembers} />);
    
    const total = mockMembers.length;
    const activePercent = ((mockMembers.filter(m => m.status === 'active').length / total) * 100).toFixed(1);
    
    expect(screen.getByText(new RegExp(`${activePercent}%`))).toBeTruthy();
  });

  it('renders pie chart visual', () => {
    const { container } = render(<ContributionChart members={mockMembers} />);
    
    // 饼图使用 conic-gradient
    const pieChart = container.querySelector('[style*="conic-gradient"]');
    expect(pieChart).toBeTruthy();
  });

  it('has accessible label for pie chart', () => {
    render(<ContributionChart members={mockMembers} />);
    
    const pieChart = screen.getByLabelText('成员状态分布图');
    expect(pieChart).toBeTruthy();
  });

  it('displays legend items with colors', () => {
    const { container } = render(<ContributionChart members={mockMembers} />);
    
    expect(container.querySelector('.bg-green-500')).toBeTruthy(); // 活跃
    expect(container.querySelector('.bg-yellow-500')).toBeTruthy(); // 空闲
    expect(container.querySelector('.bg-gray-500')).toBeTruthy(); // 离线
  });
});

// ============================================================================
// 任务完成率测试
// ============================================================================
describe('ContributionChart - Task Completion Chart', () => {
  it('displays top 5 performers by task completion', () => {
    const manyMembers = [
      ...mockMembers,
      createMockMember({ id: '5', name: '成员5', completedTasks: 20, contributionScore: 200 }),
      createMockMember({ id: '6', name: '成员6', completedTasks: 3, contributionScore: 30 }),
      createMockMember({ id: '7', name: '成员7', completedTasks: 1, contributionScore: 10 }),
    ];
    
    render(<ContributionChart members={manyMembers} />);
    
    // 应该只显示前 5 名
    const taskSection = screen.getByText('任务完成率').closest('div');
    const bars = taskSection?.querySelectorAll('[class*="bg-gradient-to-r"]') || [];
    expect(bars.length).toBeLessThanOrEqual(5);
  });

  it('displays task counts for each performer', () => {
    render(<ContributionChart members={mockMembers} />);
    
    // 智能体世界专家完成 15 个任务
    expect(screen.getByText('15')).toBeTruthy();
  });

  it('uses different gradient colors for different ranks', () => {
    const { container } = render(<ContributionChart members={mockMembers} />);
    
    const gradients = container.querySelectorAll('[class*="from-"]');
    const uniqueGradients = new Set(
      Array.from(gradients).map(el => el.className.match(/from-\w+-\d+/)?.[0])
    );
    
    expect(uniqueGradients.size).toBeGreaterThan(1);
  });
});

// ============================================================================
// 可访问性测试
// ============================================================================
describe('ContributionChart - Accessibility', () => {
  it('has progressbar role with correct attributes', () => {
    const { container } = render(<ContributionChart members={mockMembers} />);
    
    const progressBars = container.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThan(0);
    
    const firstBar = progressBars[0];
    expect(firstBar.getAttribute('aria-valuenow')).toBeTruthy();
    expect(firstBar.getAttribute('aria-valuemin')).toBe('0');
    expect(firstBar.getAttribute('aria-valuemax')).toBeTruthy();
    expect(firstBar.getAttribute('aria-label')).toBeTruthy();
  });

  it('has accessible label for contribution bars', () => {
    render(<ContributionChart members={mockMembers} />);
    
    const bar = screen.getByLabelText('智能体世界专家 贡献度');
    expect(bar).toBeTruthy();
  });

  it('has accessible label for pie chart', () => {
    render(<ContributionChart members={mockMembers} />);
    
    const pie = screen.getByLabelText('成员状态分布图');
    expect(pie.getAttribute('role')).toBe('img');
  });
});

// ============================================================================
// 空状态和边界情况测试
// ============================================================================
describe('ContributionChart - Edge Cases', () => {
  it('handles empty members array', () => {
    render(<ContributionChart members={[]} />);
    
    // 总贡献为 0
    expect(screen.getByText('总贡献点')).toBeTruthy();
    expect(screen.getByText('贡献度排行')).toBeTruthy();
  });

  it('handles members with zero contribution', () => {
    const membersWithZero = [
      createMockMember({ contributionScore: 0, completedTasks: 0 }),
    ];
    
    expect(() => render(<ContributionChart members={membersWithZero} />)).not.toThrow();
    expect(screen.getByText('总贡献点')).toBeTruthy();
  });

  it('handles single member', () => {
    const singleMember = [createMockMember()];
    
    render(<ContributionChart members={singleMember} />);
    
    expect(screen.getAllByText('测试代理').length).toBeGreaterThan(0);
    expect(screen.getByText('#1')).toBeTruthy();
  });

  it('handles members with same contribution score', () => {
    const sameScoreMembers = [
      createMockMember({ id: '1', name: '成员A', contributionScore: 100 }),
      createMockMember({ id: '2', name: '成员B', contributionScore: 100 }),
      createMockMember({ id: '3', name: '成员C', contributionScore: 100 }),
    ];
    
    render(<ContributionChart members={sameScoreMembers} />);
    
    expect(screen.getAllByText('成员A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('成员B').length).toBeGreaterThan(0);
    expect(screen.getAllByText('成员C').length).toBeGreaterThan(0);
  });

  it('handles very long member names', () => {
    const longNameMember = [
      createMockMember({ 
        name: '这是一个非常非常非常非常长的名字用于测试截断效果' 
      }),
    ];
    
    const { container } = render(<ContributionChart members={longNameMember} />);
    
    const nameElement = container.querySelector('.truncate');
    expect(nameElement).toBeTruthy();
  });

  it('handles special characters in member names', () => {
    const specialCharMember = [
      createMockMember({ name: "O'Brien & <Team>" }),
    ];
    
    render(<ContributionChart members={specialCharMember} />);
    
    expect(screen.getAllByText(/O'Brien/).length).toBeGreaterThan(0);
  });

  it('handles large contribution scores', () => {
    const largeScoreMember = [
      createMockMember({ contributionScore: 999999 }),
    ];
    
    render(<ContributionChart members={largeScoreMember} />);
    
    expect(screen.getAllByText('999999').length).toBeGreaterThan(0);
  });

  it('handles large number of members', () => {
    const manyMembers = Array.from({ length: 50 }, (_, i) => 
      createMockMember({ 
        id: `member-${i}`, 
        name: `成员${i}`,
        contributionScore: Math.floor(Math.random() * 100),
        completedTasks: Math.floor(Math.random() * 20),
      })
    );
    
    const { container } = render(<ContributionChart members={manyMembers} />);
    
    // 应该渲染所有成员在排行中
    const progressBars = container.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Props 变化测试
// ============================================================================
describe('ContributionChart - Props Changes', () => {
  it('updates when members change', () => {
    const { rerender } = render(<ContributionChart members={mockMembers} />);
    expect(screen.getAllByText('智能体世界专家').length).toBeGreaterThan(0);

    const newMembers = [
      createMockMember({ id: 'new', name: '新成员', contributionScore: 200 }),
    ];
    rerender(<ContributionChart members={newMembers} />);
    
    expect(screen.getAllByText('新成员').length).toBeGreaterThan(0);
  });

  it('updates statistics when contribution scores change', () => {
    const { rerender } = render(<ContributionChart members={mockMembers} />);
    
    // 初始总贡献
    const initialTotal = mockMembers.reduce((sum, m) => sum + m.contributionScore, 0);
    expect(screen.getByText(initialTotal.toString())).toBeTruthy();
    
    const updatedMembers = mockMembers.map(m => ({
      ...m,
      contributionScore: m.contributionScore * 2,
    }));
    rerender(<ContributionChart members={updatedMembers} />);
    
    const newTotal = updatedMembers.reduce((sum, m) => sum + m.contributionScore, 0);
    expect(screen.getByText(newTotal.toString())).toBeTruthy();
  });

  it('updates ranking order when scores change', () => {
    const { rerender } = render(<ContributionChart members={mockMembers} />);
    
    // 初始第一是智能体世界专家
    expect(screen.getAllByText(/#/)[0].textContent).toBe('#1');
    
    // 改变分数使测试员成为第一
    const updatedMembers = mockMembers.map(m => 
      m.id === 'tester' ? { ...m, contributionScore: 200 } : m
    );
    rerender(<ContributionChart members={updatedMembers} />);
    
    // 现在测试员应该在前面
    const allText = document.body.textContent || '';
    const testerIndex = allText.indexOf('测试员');
    const expertIndex = allText.indexOf('智能体世界专家');
    expect(testerIndex).toBeLessThan(expertIndex);
  });

  it('updates status distribution when member status changes', () => {
    const { rerender } = render(<ContributionChart members={mockMembers} />);
    
    // 初始: 2 active, 1 idle, 1 offline
    expect(screen.getByText(/活跃: 2/)).toBeTruthy();
    
    const updatedMembers = mockMembers.map(m => 
      m.id === 'executor' ? { ...m, status: 'active' as const } : m
    );
    rerender(<ContributionChart members={updatedMembers} />);
    
    // 现在: 3 active, 0 idle, 1 offline
    expect(screen.getByText(/活跃: 3/)).toBeTruthy();
  });
});

// ============================================================================
// 计算准确性测试
// ============================================================================
describe('ContributionChart - Calculations', () => {
  it('calculates percentage correctly', () => {
    const members = [
      createMockMember({ contributionScore: 100 }),
      createMockMember({ contributionScore: 50 }),
    ];
    
    const { container } = render(<ContributionChart members={members} />);
    
    // 第一个成员应该是 100%，第二个应该是 50%
    const progressBars = container.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThanOrEqual(2);
  });

  it('handles zero max score gracefully', () => {
    const zeroScoreMembers = [
      createMockMember({ contributionScore: 0, completedTasks: 0 }),
      createMockMember({ contributionScore: 0, completedTasks: 0 }),
    ];
    
    // 不应该抛出除零错误
    expect(() => render(<ContributionChart members={zeroScoreMembers} />)).not.toThrow();
  });

  it('calculates average contribution correctly', () => {
    const members = [
      createMockMember({ contributionScore: 100 }),
      createMockMember({ contributionScore: 200 }),
      createMockMember({ contributionScore: 300 }),
    ];
    
    render(<ContributionChart members={members} />);
    
    // 平均值 = 600 / 3 = 200
    expect(screen.getByText('200')).toBeTruthy();
    expect(screen.getByText('平均贡献')).toBeTruthy();
  });

  it('rounds average contribution', () => {
    const members = [
      createMockMember({ contributionScore: 100 }),
      createMockMember({ contributionScore: 101 }),
    ];
    
    render(<ContributionChart members={members} />);
    
    // 平均值 = 201 / 2 = 100.5，四舍五入为 101
    expect(screen.getByText('101')).toBeTruthy();
    expect(screen.getByText('平均贡献')).toBeTruthy();
  });
});

// ============================================================================
// 样式测试
// ============================================================================
describe('ContributionChart - Styling', () => {
  it('applies correct stat card colors', () => {
    const { container } = render(<ContributionChart members={mockMembers} />);
    
    // 总贡献 - 蓝色
    expect(container.querySelector('.text-blue-600')).toBeTruthy();
    // 活跃成员 - 绿色
    expect(container.querySelector('.text-green-600')).toBeTruthy();
    // 平均贡献 - 紫色
    expect(container.querySelector('.text-purple-600')).toBeTruthy();
    // 完成任务 - 橙色
    expect(container.querySelector('.text-orange-600')).toBeTruthy();
  });

  it('has transition effects on progress bars', () => {
    const { container } = render(<ContributionChart members={mockMembers} />);
    
    const progressBars = container.querySelectorAll('[class*="transition-all"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('uses gradient backgrounds for progress bars', () => {
    const { container } = render(<ContributionChart members={mockMembers} />);
    
    const gradients = container.querySelectorAll('[class*="bg-gradient-to-r"]');
    expect(gradients.length).toBeGreaterThan(0);
  });
});
