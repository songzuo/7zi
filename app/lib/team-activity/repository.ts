/**
 * 团队活动追踪 - 数据仓库
 */

import type {
  TeamActivity,
  TeamMember,
  ActivityStats,
  TeamActivityType,
  ActivityPriority,
  GetTeamActivitiesRequest,
  GetTeamActivitiesResponse,
  MemberStatus,
} from './types';
import { MEMBER_ROLE_CONFIG } from './types';

// ========== 模拟数据生成 ==========

/** 生成唯一 ID */
function generateId(): string {
  return `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/** 11 位 AI 成员 */
const DEFAULT_MEMBERS: TeamMember[] = [
  {
    id: 'member-1',
    name: '智能体世界专家',
    role: '智能体世界专家',
    status: 'online',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=expert',
    provider: MEMBER_ROLE_CONFIG['智能体世界专家'].provider,
    lastActiveAt: new Date().toISOString(),
    tasksCompleted: 156,
    tasksInProgress: 3,
    efficiency: 94,
  },
  {
    id: 'member-2',
    name: '咨询师',
    role: '咨询师',
    status: 'online',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=consultant',
    provider: MEMBER_ROLE_CONFIG['咨询师'].provider,
    lastActiveAt: new Date().toISOString(),
    tasksCompleted: 142,
    tasksInProgress: 2,
    efficiency: 88,
  },
  {
    id: 'member-3',
    name: '架构师',
    role: '架构师',
    status: 'busy',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=architect',
    provider: MEMBER_ROLE_CONFIG['架构师'].provider,
    lastActiveAt: new Date(Date.now() - 5 * 60000).toISOString(),
    tasksCompleted: 128,
    tasksInProgress: 4,
    efficiency: 92,
  },
  {
    id: 'member-4',
    name: 'Executor',
    role: 'Executor',
    status: 'online',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=executor',
    provider: MEMBER_ROLE_CONFIG['Executor'].provider,
    lastActiveAt: new Date().toISOString(),
    tasksCompleted: 234,
    tasksInProgress: 5,
    efficiency: 96,
  },
  {
    id: 'member-5',
    name: '系统管理员',
    role: '系统管理员',
    status: 'online',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
    provider: MEMBER_ROLE_CONFIG['系统管理员'].provider,
    lastActiveAt: new Date().toISOString(),
    tasksCompleted: 98,
    tasksInProgress: 2,
    efficiency: 90,
  },
  {
    id: 'member-6',
    name: '测试员',
    role: '测试员',
    status: 'meeting',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=tester',
    provider: MEMBER_ROLE_CONFIG['测试员'].provider,
    lastActiveAt: new Date(Date.now() - 10 * 60000).toISOString(),
    tasksCompleted: 187,
    tasksInProgress: 3,
    efficiency: 91,
  },
  {
    id: 'member-7',
    name: '设计师',
    role: '设计师',
    status: 'online',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=designer',
    provider: MEMBER_ROLE_CONFIG['设计师'].provider,
    lastActiveAt: new Date().toISOString(),
    tasksCompleted: 112,
    tasksInProgress: 2,
    efficiency: 89,
  },
  {
    id: 'member-8',
    name: '推广专员',
    role: '推广专员',
    status: 'away',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=marketing',
    provider: MEMBER_ROLE_CONFIG['推广专员'].provider,
    lastActiveAt: new Date(Date.now() - 30 * 60000).toISOString(),
    tasksCompleted: 78,
    tasksInProgress: 1,
    efficiency: 85,
  },
  {
    id: 'member-9',
    name: '销售客服',
    role: '销售客服',
    status: 'online',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sales',
    provider: MEMBER_ROLE_CONFIG['销售客服'].provider,
    lastActiveAt: new Date().toISOString(),
    tasksCompleted: 145,
    tasksInProgress: 4,
    efficiency: 87,
  },
  {
    id: 'member-10',
    name: '财务',
    role: '财务',
    status: 'offline',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=finance',
    provider: MEMBER_ROLE_CONFIG['财务'].provider,
    lastActiveAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    tasksCompleted: 67,
    tasksInProgress: 0,
    efficiency: 93,
  },
  {
    id: 'member-11',
    name: '媒体',
    role: '媒体',
    status: 'online',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=media',
    provider: MEMBER_ROLE_CONFIG['媒体'].provider,
    lastActiveAt: new Date().toISOString(),
    tasksCompleted: 98,
    tasksInProgress: 2,
    efficiency: 88,
  },
];

/** 生成随机活动 */
function generateRandomActivity(member: TeamMember, index: number): TeamActivity {
  const activityTypes: TeamActivityType[] = [
    'task_created',
    'task_completed',
    'task_updated',
    'task_assigned',
    'comment_added',
    'code_committed',
    'code_reviewed',
    'bug_reported',
    'bug_fixed',
    'document_created',
  ];

  const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
  const hoursAgo = Math.floor(Math.random() * 48);
  const timestamp = new Date(Date.now() - hoursAgo * 3600000).toISOString();
  const priorities: ActivityPriority[] = ['low', 'normal', 'normal', 'normal', 'high'];

  const activityTitles: Record<TeamActivityType, string[]> = {
    task_created: [
      `创建新任务: 实现${['用户认证', '数据导出', '实时通知', '权限管理'][Math.floor(Math.random() * 4)]}功能`,
      `创建新任务: ${['优化', '重构', '设计'][Math.floor(Math.random() * 3)]}${['API', 'UI组件', '数据库'][Math.floor(Math.random() * 3)]}`,
    ],
    task_completed: [
      `完成任务: ${['代码审查', '单元测试', '文档编写', '功能实现'][Math.floor(Math.random() * 4)]}`,
      `完成任务: 修复 #${Math.floor(Math.random() * 100)} Bug`,
    ],
    task_updated: [
      `更新任务状态: ${['待处理', '进行中', '已完成'][Math.floor(Math.random() * 3)]}`,
      `更新任务优先级: ${['低', '中', '高'][Math.floor(Math.random() * 3)]}`,
    ],
    task_assigned: [
      `分配任务给 ${DEFAULT_MEMBERS[Math.floor(Math.random() * 11)].name}`,
      `接受任务: ${['新功能开发', '性能优化', '代码重构'][Math.floor(Math.random() * 3)]}`,
    ],
    comment_added: [
      `在任务 #${Math.floor(Math.random() * 100)} 添加评论`,
      `回复评论: ${['好的', '明白', '我会处理', '需要讨论'][Math.floor(Math.random() * 4)]}`,
    ],
    code_committed: [
      `提交代码: ${['feat: ', 'fix: ', 'refactor: ', 'docs: '][Math.floor(Math.random() * 4)]}${['新功能', 'Bug修复', '代码优化', '文档更新'][Math.floor(Math.random() * 4)]}`,
      `推送 ${Math.floor(Math.random() * 5) + 1} 个提交到 ${['main', 'develop', 'feature/new'][Math.floor(Math.random() * 3)]}`,
    ],
    code_reviewed: [
      `审查代码: PR #${Math.floor(Math.random() * 50)}`,
      `${['批准', '请求修改', '评论'][Math.floor(Math.random() * 3)]} PR #${Math.floor(Math.random() * 50)}`,
    ],
    bug_reported: [
      `报告 Bug: ${['页面加载慢', '登录失败', '数据显示错误', '样式异常'][Math.floor(Math.random() * 4)]}`,
      `创建 Issue #${Math.floor(Math.random() * 100)}: ${['性能问题', '功能异常', '安全漏洞'][Math.floor(Math.random() * 3)]}`,
    ],
    bug_fixed: [
      `修复 Bug: ${['内存泄漏', '空指针异常', '并发问题', '数据不一致'][Math.floor(Math.random() * 4)]}`,
      `关闭 Issue #${Math.floor(Math.random() * 100)}`,
    ],
    document_created: [
      `创建文档: ${['API文档', '部署指南', '用户手册', '开发规范'][Math.floor(Math.random() * 4)]}`,
      `更新文档: ${['README', 'CHANGELOG', 'CONTRIBUTING'][Math.floor(Math.random() * 3)]}`,
    ],
    meeting_started: [`开始会议: ${['每日站会', '需求评审', '技术讨论', '团队周会'][Math.floor(Math.random() * 4)]}`],
    meeting_ended: [`结束会议: 时长 ${Math.floor(Math.random() * 60) + 15} 分钟`],
    status_changed: [`状态变更: ${['在线', '忙碌', '离开', '会议中'][Math.floor(Math.random() * 4)]}`],
    project_created: [`创建项目: ${['电商平台', '管理系统', '移动应用', '数据分析平台'][Math.floor(Math.random() * 4)]}`],
    project_updated: [`更新项目: ${['添加成员', '修改配置', '更新进度'][Math.floor(Math.random() * 3)]}`],
    report_generated: [`生成报告: ${['周报', '月报', '性能报告', '质量报告'][Math.floor(Math.random() * 4)]}`],
  };

  const titles = activityTitles[type];
  const title = titles[Math.floor(Math.random() * titles.length)];

  return {
    id: generateId(),
    type,
    memberId: member.id,
    memberName: member.name,
    memberRole: member.role,
    memberAvatar: member.avatar,
    title,
    description: `${member.name} ${title}`,
    timestamp,
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    metadata: {
      taskId: type.includes('task') ? `task-${Math.floor(Math.random() * 1000)}` : undefined,
      taskTitle: type.includes('task') ? title.split(': ')[1] : undefined,
      commitSha: type === 'code_committed' ? Math.random().toString(36).substr(2, 7) : undefined,
      branch: type === 'code_committed' ? ['main', 'develop', 'feature'][Math.floor(Math.random() * 3)] : undefined,
    },
    tags: type.includes('task') ? ['任务管理'] : type.includes('code') ? ['开发'] : ['协作'],
  };
}

/** 生成活动统计 */
function generateActivityStats(activities: TeamActivity[]): ActivityStats {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 3600000);

  const byType: Record<TeamActivityType, number> = {
    task_created: 0,
    task_completed: 0,
    task_updated: 0,
    task_assigned: 0,
    comment_added: 0,
    meeting_started: 0,
    meeting_ended: 0,
    status_changed: 0,
    project_created: 0,
    project_updated: 0,
    code_committed: 0,
    code_reviewed: 0,
    bug_reported: 0,
    bug_fixed: 0,
    document_created: 0,
    report_generated: 0,
  };

  const byMember: Record<string, number> = {};

  activities.forEach((activity) => {
    byType[activity.type]++;
    byMember[activity.memberId] = (byMember[activity.memberId] || 0) + 1;
  });

  const todayActivities = activities.filter((a) => new Date(a.timestamp) >= today).length;
  const weekActivities = activities.filter((a) => new Date(a.timestamp) >= weekAgo).length;

  // 计算生产力评分（基于完成任务数、效率等）
  const completionRate = byType.task_completed / (byType.task_created || 1);
  const avgTasksPerMember = activities.length / 11;
  const productivityScore = Math.min(
    100,
    Math.round((completionRate * 50 + (avgTasksPerMember / 10) * 50))
  );

  return {
    totalActivities: activities.length,
    todayActivities,
    weekActivities,
    byType,
    byMember,
    avgCompletionTime: 2.5 + Math.random() * 2, // 2.5-4.5 小时
    productivityScore,
  };
}

// ========== Repository 类 ==========

class TeamActivityRepository {
  private activities: TeamActivity[] = [];
  private members: TeamMember[] = DEFAULT_MEMBERS;

  constructor() {
    // 初始化时生成一些历史活动
    this.initializeActivities();
  }

  /** 初始化活动数据 */
  private initializeActivities(): void {
    // 为每个成员生成 5-15 条历史活动
    this.members.forEach((member) => {
      const count = 5 + Math.floor(Math.random() * 10);
      for (let i = 0; i < count; i++) {
        this.activities.push(generateRandomActivity(member, i));
      }
    });

    // 按时间排序（最新的在前）
    this.activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /** 获取团队成员列表 */
  async getMembers(): Promise<TeamMember[]> {
    return [...this.members];
  }

  /** 更新成员状态 */
  async updateMemberStatus(memberId: string, status: MemberStatus): Promise<void> {
    const member = this.members.find((m) => m.id === memberId);
    if (member) {
      member.status = status;
      member.lastActiveAt = new Date().toISOString();
    }
  }

  /** 获取活动列表 */
  async getActivities(
    request: GetTeamActivitiesRequest = {}
  ): Promise<GetTeamActivitiesResponse> {
    let filtered = [...this.activities];

    // 应用过滤条件
    if (request.memberId) {
      filtered = filtered.filter((a) => a.memberId === request.memberId);
    }

    if (request.type) {
      filtered = filtered.filter((a) => a.type === request.type);
    }

    if (request.priority) {
      filtered = filtered.filter((a) => a.priority === request.priority);
    }

    if (request.startDate) {
      const startDate = new Date(request.startDate);
      filtered = filtered.filter((a) => new Date(a.timestamp) >= startDate);
    }

    if (request.endDate) {
      const endDate = new Date(request.endDate);
      filtered = filtered.filter((a) => new Date(a.timestamp) <= endDate);
    }

    const total = filtered.length;
    const limit = request.limit || 50;
    const offset = request.offset || 0;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      activities: paginated,
      total,
      hasMore: offset + limit < total,
      stats: generateActivityStats(filtered),
    };
  }

  /** 添加新活动 */
  async addActivity(activity: Omit<TeamActivity, 'id'>): Promise<TeamActivity> {
    const newActivity: TeamActivity = {
      ...activity,
      id: generateId(),
    };

    this.activities.unshift(newActivity);

    // 更新成员最后活跃时间
    const member = this.members.find((m) => m.id === activity.memberId);
    if (member) {
      member.lastActiveAt = activity.timestamp;
    }

    return newActivity;
  }

  /** 获取活动统计 */
  async getStats(): Promise<ActivityStats> {
    return generateActivityStats(this.activities);
  }

  /** 获取团队概览 */
  async getOverview(): Promise<{
    members: TeamMember[];
    activeMembers: number;
    totalActivities: number;
    recentActivities: TeamActivity[];
    stats: ActivityStats;
  }> {
    const activeMembers = this.members.filter((m) => m.status === 'online').length;
    const recentActivities = this.activities.slice(0, 20);
    const stats = generateActivityStats(this.activities);

    return {
      members: this.members,
      activeMembers,
      totalActivities: this.activities.length,
      recentActivities,
      stats,
    };
  }
}

// ========== 导出单例 ==========

export const teamActivityRepository = new TeamActivityRepository();

export type { TeamActivity, TeamMember, ActivityStats };
