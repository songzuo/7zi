/**
 * 7zi MCP Server - Dashboard Tools
 * Dashboard 相关 MCP 工具
 */
import { z } from 'zod';
// Dashboard 统计数据 Schema
const GetDashboardStatsSchema = {
    includeWeeklyTrend: z.boolean().optional().default(false).describe('是否包含本周趋势数据'),
};
// 模拟 Dashboard 数据
function getMockDashboardStats(includeWeeklyTrend) {
    const totalTasks = 156;
    const completedTasks = 124;
    const inProgressTasks = 18;
    const pendingTasks = 14;
    const activeAgents = 11;
    const totalAgents = 11;
    return {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        activeAgents,
        totalAgents,
        completionRate: completedTasks / totalTasks,
        avgCompletionTime: 2.5,
        todayCompleted: 8,
        weeklyTrend: includeWeeklyTrend
            ? [12, 18, 15, 22, 19, 14, 8]
            : undefined,
    };
}
// 模拟活动日志
function getMockActivityLogs(limit = 20) {
    const activities = [
        {
            id: '1',
            type: 'task_completed',
            agentId: 'agent-executor',
            agentName: 'Executor',
            taskId: 'task-001',
            description: '完成代码实现任务',
            timestamp: new Date().toISOString(),
        },
        {
            id: '2',
            type: 'task_assigned',
            agentId: 'agent-architect',
            agentName: '架构师',
            taskId: 'task-002',
            description: '分配新任务：设计 MCP Server 架构',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
            id: '3',
            type: 'agent_status_changed',
            agentId: 'agent-director',
            agentName: 'AI 主管',
            description: '状态变更为：主持会议',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
    ];
    return activities.slice(0, limit);
}
/**
 * 注册 Dashboard 相关工具
 */
export function registerDashboardTools(server) {
    // 获取 Dashboard 统计数据
    server.registerTool('get_dashboard_stats', {
        description: '获取 7zi 团队 Dashboard 统计数据，包括任务完成情况、活跃 AI 成员数、完成率等',
        inputSchema: GetDashboardStatsSchema,
    }, async ({ includeWeeklyTrend }) => {
        try {
            const stats = getMockDashboardStats(includeWeeklyTrend || false);
            const summary = `
📊 **7zi 团队 Dashboard 统计**

**任务概览**
- 总任务数：${stats.totalTasks}
- 已完成：${stats.completedTasks} ✅
- 进行中：${stats.inProgressTasks} 🔄
- 待处理：${stats.pendingTasks} ⏳
- 完成率：${(stats.completionRate * 100).toFixed(1)}%

**团队状态**
- 活跃 AI 成员：${stats.activeAgents}/${stats.totalAgents} 🤖
- 今日完成：${stats.todayCompleted} 个任务
- 平均完成时间：${stats.avgCompletionTime} 小时

${stats.weeklyTrend
                ? `**本周趋势**\n${stats.weeklyTrend
                    .map((count, i) => {
                    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
                    return `- ${days[i]}: ${count} 个任务`;
                })
                    .join('\n')}`
                : ''}
        `.trim();
            return {
                content: [
                    {
                        type: 'text',
                        text: summary,
                    },
                ],
                structuredContent: stats,
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `获取 Dashboard 统计失败：${error instanceof Error ? error.message : '未知错误'}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // 获取活动日志
    server.registerTool('get_activity_logs', {
        description: '获取团队活动日志，包括任务创建、完成、分配等操作记录',
        inputSchema: {
            limit: z.number().min(1).max(100).optional().default(20).describe('返回的活动记录数量'),
        },
    }, async ({ limit }) => {
        try {
            const activities = getMockActivityLogs(limit);
            const summary = activities
                .map((activity) => {
                const time = new Date(activity.timestamp).toLocaleString('zh-CN');
                const agentInfo = activity.agentName ? ` [${activity.agentName}]` : '';
                return `- [${time}]${agentInfo} ${activity.description}`;
            })
                .join('\n');
            return {
                content: [
                    {
                        type: 'text',
                        text: `📝 **最近 ${activities.length} 条活动记录**\n\n${summary}`,
                    },
                ],
                structuredContent: { activities, total: activities.length },
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `获取活动日志失败：${error instanceof Error ? error.message : '未知错误'}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // 获取团队效率报告
    server.registerTool('get_team_efficiency', {
        description: '获取团队效率报告，包括各 AI 成员的工作效率和贡献度',
        inputSchema: {
            period: z.enum(['today', 'week', 'month']).optional().default('week').describe('统计周期'),
        },
    }, async ({ period }) => {
        try {
            const agents = [
                { name: '智能体世界专家', role: 'ai_world_expert', completedTasks: 18, efficiency: 95, status: 'active' },
                { name: '架构师', role: 'architect', completedTasks: 15, efficiency: 92, status: 'active' },
                { name: 'Executor', role: 'executor', completedTasks: 22, efficiency: 98, status: 'active' },
                { name: '系统管理员', role: 'admin', completedTasks: 12, efficiency: 88, status: 'active' },
                { name: '测试员', role: 'tester', completedTasks: 20, efficiency: 94, status: 'active' },
                { name: '设计师', role: 'designer', completedTasks: 16, efficiency: 91, status: 'active' },
            ];
            const periodLabels = { today: '今日', week: '本周', month: '本月' };
            const summary = agents
                .map((agent, i) => {
                const rank = i + 1;
                const statusEmoji = agent.status === 'active' ? '🟢' : '🔴';
                return `${rank}. ${statusEmoji} **${agent.name}**\n   - 完成任务：${agent.completedTasks} 个\n   - 效率评分：${agent.efficiency}%`;
            })
                .join('\n\n');
            return {
                content: [
                    {
                        type: 'text',
                        text: `📈 **团队效率报告 - ${periodLabels[period]}**\n\n${summary}`,
                    },
                ],
                structuredContent: { period, agents },
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `获取效率报告失败：${error instanceof Error ? error.message : '未知错误'}`,
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=dashboard.js.map