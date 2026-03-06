import { NextRequest, NextResponse } from 'next/server';

/**
 * 团队分析 API
 * GET /api/team-analytics
 * 
 * Query params:
 * - period: 'week' | 'month' | 'quarter'
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period') || 'week';

  // 生成模拟数据（实际应用中从数据库获取）
  const data = generateTeamAnalyticsData(period as 'week' | 'month' | 'quarter');

  return NextResponse.json(data);
}

function generateTeamAnalyticsData(period: 'week' | 'month' | 'quarter') {
  const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;

  // 生成效率趋势数据
  const efficiencyTrend = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
    return {
      date: date.toISOString().split('T')[0],
      efficiency: 60 + Math.random() * 35,
      tasksCompleted: Math.floor(5 + Math.random() * 20),
      avgTime: 1 + Math.random() * 4,
    };
  });

  // 任务分布
  const taskDistribution = [
    { category: '开发', count: 45, color: '#3b82f6' },
    { category: '测试', count: 25, color: '#10b981' },
    { category: '设计', count: 15, color: '#8b5cf6' },
    { category: '文档', count: 10, color: '#f59e0b' },
    { category: '其他', count: 5, color: '#6b7280' },
  ];

  // 成员贡献
  const memberContributions = [
    { id: '1', name: '张三', tasksCompleted: 32, contribution: 156, efficiency: 92, role: '前端工程师' },
    { id: '2', name: '李四', tasksCompleted: 28, contribution: 142, efficiency: 88, role: '后端工程师' },
    { id: '3', name: '王五', tasksCompleted: 25, contribution: 128, efficiency: 85, role: 'UI设计师' },
    { id: '4', name: '赵六', tasksCompleted: 22, contribution: 115, efficiency: 82, role: '测试工程师' },
    { id: '5', name: '钱七', tasksCompleted: 20, contribution: 98, efficiency: 78, role: '产品经理' },
    { id: '6', name: '孙八', tasksCompleted: 18, contribution: 87, efficiency: 75, role: '运维工程师' },
  ];

  // 关键指标
  const metrics = {
    efficiency: Math.round(60 + Math.random() * 30),
    taskCompletionRate: Math.round(70 + Math.random() * 25),
    avgResponseTime: Math.round(1 + Math.random() * 3),
    activeProjects: Math.floor(3 + Math.random() * 5),
    pendingTasks: Math.floor(10 + Math.random() * 20),
    completedThisWeek: Math.floor(20 + Math.random() * 30),
    overdueTasks: Math.floor(Math.random() * 5),
    teamUtilization: Math.round(70 + Math.random() * 20),
  };

  return {
    metrics,
    efficiencyTrend,
    taskDistribution,
    memberContributions,
    period,
    updatedAt: new Date().toISOString(),
  };
}