/**
 * 用户仪表板 API
 * 
 * 提供用户统计数据、任务趋势、活动记录等
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// 类型定义
// ============================================================================

interface UserStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  contributionScore: number;
  ranking: number;
  totalMembers: number;
  streak: number;
  achievements: number;
}

interface TaskTrend {
  date: string;
  completed: number;
  created: number;
}

interface UserActivity {
  id: string;
  type: 'task_complete' | 'task_create' | 'comment' | 'commit' | 'review';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt?: string;
  progress?: number;
  total?: number;
}

interface RecentTask {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assignee?: string;
  labels: string[];
}

// ============================================================================
// 模拟数据生成
// ============================================================================

function generateMockStats(): UserStats {
  return {
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
}

function generateTaskTrend(): TaskTrend[] {
  const trend: TaskTrend[] = [];
  const now = new Date();

  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    trend.push({
      date: date.toISOString().split('T')[0],
      completed: Math.floor(Math.random() * 8) + 1,
      created: Math.floor(Math.random() * 5) + 1,
    });
  }

  return trend;
}

function generateActivities(): UserActivity[] {
  const activities: UserActivity[] = [
    {
      id: '1',
      type: 'task_complete',
      title: '完成了任务：用户仪表板设计',
      description: '完成了仪表板的 UI 设计和组件开发',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '2',
      type: 'commit',
      title: '提交代码：feat: 添加图表组件',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: '3',
      type: 'comment',
      title: '评论了任务：性能优化讨论',
      timestamp: new Date(Date.now() - 14400000).toISOString(),
    },
    {
      id: '4',
      type: 'task_create',
      title: '创建了任务：添加单元测试',
      timestamp: new Date(Date.now() - 21600000).toISOString(),
    },
    {
      id: '5',
      type: 'review',
      title: '完成了代码审查：PR #42',
      timestamp: new Date(Date.now() - 28800000).toISOString(),
    },
    {
      id: '6',
      type: 'task_complete',
      title: '完成了任务：API 文档更新',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '7',
      type: 'commit',
      title: '提交代码：fix: 修复登录问题',
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ];

  return activities;
}

function generateAchievements(): Achievement[] {
  return [
    {
      id: 'first_task',
      name: '初出茅庐',
      description: '完成第一个任务',
      icon: '🌟',
      progress: 1,
      total: 1,
      earnedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
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
      earnedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'team_player',
      name: '团队协作',
      description: '参与 10 个协作任务',
      icon: '🤝',
      progress: 8,
      total: 10,
    },
    {
      id: 'code_warrior',
      name: '代码战士',
      description: '提交 50 次代码',
      icon: '💻',
      progress: 42,
      total: 50,
    },
    {
      id: 'top_contributor',
      name: '顶级贡献者',
      description: '贡献积分达到 1000',
      icon: '👑',
      progress: 2450,
      total: 1000,
      earnedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ];
}

function generateRecentTasks(): RecentTask[] {
  return [
    {
      id: 'task-1',
      title: '实现用户仪表板页面',
      status: 'in_progress',
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      labels: ['frontend', 'feature'],
    },
    {
      id: 'task-2',
      title: '添加数据可视化图表',
      status: 'in_progress',
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      labels: ['frontend', 'charts'],
    },
    {
      id: 'task-3',
      title: '编写单元测试',
      status: 'todo',
      priority: 'medium',
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      labels: ['testing'],
    },
    {
      id: 'task-4',
      title: '优化页面性能',
      status: 'todo',
      priority: 'medium',
      labels: ['performance'],
    },
    {
      id: 'task-5',
      title: '更新 API 文档',
      status: 'completed',
      priority: 'low',
      labels: ['docs'],
    },
    {
      id: 'task-6',
      title: '修复登录 Bug',
      status: 'completed',
      priority: 'urgent',
      labels: ['bug', 'auth'],
    },
  ];
}

// ============================================================================
// API 处理器
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // 验证用户 ID
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // 生成仪表板数据
    const dashboardData = {
      stats: generateMockStats(),
      taskTrend: generateTaskTrend(),
      activities: generateActivities(),
      achievements: generateAchievements(),
      recentTasks: generateRecentTasks(),
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching user dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}