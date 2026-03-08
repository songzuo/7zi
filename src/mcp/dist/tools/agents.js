/**
 * 7zi MCP Server - Agent Tools
 * AI 成员相关 MCP 工具
 */
import { z } from 'zod';
const AgentStatusEnum = z.enum(['active', 'inactive', 'busy', 'offline']);
// 11 位 AI 成员定义
const TEAM_AGENTS = [
    { id: 'agent-director', name: 'AI 主管', role: 'director', description: '团队主管，负责协调和管理工作', status: 'active', provider: 'claude', capabilities: ['协调', '决策', '会议主持'], completedTasks: 45 },
    { id: 'agent-expert', name: '智能体世界专家', role: 'ai_world_expert', description: '视角转换、未来布局专家', status: 'active', provider: 'minimax', capabilities: ['视角转换', '未来布局'], completedTasks: 38 },
    { id: 'agent-consultant', name: '咨询师', role: 'consultant', description: '研究分析、信息整理', status: 'active', provider: 'minimax', capabilities: ['研究', '分析', '文档'], completedTasks: 42 },
    { id: 'agent-architect', name: '架构师', role: 'architect', description: '系统设计、技术规划', status: 'busy', currentTask: '设计 MCP Server 架构', provider: 'self-claude', capabilities: ['架构设计', '技术规划'], completedTasks: 35 },
    { id: 'agent-executor', name: 'Executor', role: 'executor', description: '任务执行、代码实现', status: 'active', provider: 'volcengine', capabilities: ['代码实现', '功能开发'], completedTasks: 58 },
    { id: 'agent-admin', name: '系统管理员', role: 'admin', description: '运维部署、安全监控', status: 'active', provider: 'bailian', capabilities: ['运维', '部署', '安全'], completedTasks: 32 },
    { id: 'agent-tester', name: '测试员', role: 'tester', description: '质量保障、Bug 修复', status: 'active', provider: 'minimax', capabilities: ['测试', '质量保障'], completedTasks: 51 },
    { id: 'agent-designer', name: '设计师', role: 'designer', description: 'UI/UX 设计、前端开发', status: 'active', provider: 'self-claude', capabilities: ['UI 设计', 'UX 设计'], completedTasks: 44 },
    { id: 'agent-marketer', name: '推广专员', role: 'marketer', description: '市场推广、SEO 优化', status: 'active', provider: 'volcengine', capabilities: ['市场推广', 'SEO'], completedTasks: 28 },
    { id: 'agent-sales', name: '销售客服', role: 'sales', description: '客户支持、商务合作', status: 'active', provider: 'bailian', capabilities: ['客户支持', '商务合作'], completedTasks: 36 },
    { id: 'agent-finance', name: '财务', role: 'finance', description: '会计审计、成本控制', status: 'active', provider: 'minimax', capabilities: ['会计', '审计'], completedTasks: 25 },
    { id: 'agent-media', name: '媒体', role: 'media', description: '内容创作、品牌宣传', status: 'active', provider: 'self-claude', capabilities: ['内容创作', '品牌宣传'], completedTasks: 33 },
];
export function registerAgentTools(server) {
    // 获取团队所有 AI 成员
    server.registerTool('list_agents', {
        description: '获取 7zi 团队所有 AI 成员列表',
        inputSchema: {
            status: AgentStatusEnum.optional().describe('按状态筛选'),
            role: z.string().optional().describe('按角色筛选'),
        },
    }, async ({ status, role }) => {
        let agents = [...TEAM_AGENTS];
        if (status)
            agents = agents.filter((a) => a.status === status);
        if (role)
            agents = agents.filter((a) => a.role === role);
        const statusEmojis = { active: '🟢', busy: '🟡', inactive: '🔴', offline: '⚫' };
        const summary = agents
            .map((agent) => {
            const statusEmoji = statusEmojis[agent.status] || '⚪';
            const currentTask = agent.currentTask ? `\n   - 当前任务：${agent.currentTask}` : '';
            return `${statusEmoji} **${agent.name}** (${agent.role})\n   - 提供商：${agent.provider}\n   - 已完成任务：${agent.completedTasks} 个${currentTask}`;
        })
            .join('\n\n');
        return {
            content: [{ type: 'text', text: `👥 **7zi AI 团队成员** (共 ${agents.length} 位)\n\n${summary}` }],
            structuredContent: { agents, total: agents.length },
        };
    });
    // 获取单个 AI 成员详情
    server.registerTool('get_agent', {
        description: '获取指定 AI 成员的详细信息',
        inputSchema: { agentId: z.string().describe('AI 成员 ID') },
    }, async ({ agentId }) => {
        const agent = TEAM_AGENTS.find((a) => a.id === agentId);
        if (!agent) {
            return { content: [{ type: 'text', text: `❌ AI 成员不存在：${agentId}` }], isError: true };
        }
        return {
            content: [{ type: 'text', text: `🤖 **${agent.name}**\n\n- ID: ${agent.id}\n- 角色：${agent.role}\n- 状态：${agent.status}\n- 提供商：${agent.provider}\n- 描述：${agent.description}\n- 能力：${agent.capabilities.join(', ')}\n- 已完成任务：${agent.completedTasks} 个` }],
            structuredContent: agent,
        };
    });
    // 获取 AI 成员工作负载
    server.registerTool('get_agent_workload', {
        description: '获取 AI 成员的工作负载和任务分配情况',
        inputSchema: { agentId: z.string().optional().describe('AI 成员 ID，不提供则返回所有成员') },
    }, async ({ agentId }) => {
        let agents = agentId ? TEAM_AGENTS.filter((a) => a.id === agentId) : TEAM_AGENTS;
        if (agentId && agents.length === 0) {
            return { content: [{ type: 'text', text: `❌ AI 成员不存在：${agentId}` }], isError: true };
        }
        const workloads = agents.map((agent) => {
            const currentTasks = agent.status === 'busy' ? 3 : agent.status === 'active' ? 1 : 0;
            const maxTasks = 5;
            const loadPercentage = Math.round((currentTasks / maxTasks) * 100);
            return { id: agent.id, name: agent.name, currentTasks, maxTasks, loadPercentage, status: agent.status };
        });
        const summary = workloads
            .map((w) => {
            const loadBar = '█'.repeat(Math.round(w.loadPercentage / 10)) + '░'.repeat(10 - Math.round(w.loadPercentage / 10));
            return `**${w.name}**\n   负载：[${loadBar}] ${w.loadPercentage}%\n   当前任务：${w.currentTasks}/${w.maxTasks}`;
        })
            .join('\n\n');
        return {
            content: [{ type: 'text', text: `📊 **AI 成员工作负载**\n\n${summary}` }],
            structuredContent: { workloads },
        };
    });
    // 获取团队协作建议
    server.registerTool('get_collaboration_suggestions', {
        description: '获取团队协作建议，推荐最佳的成员组合',
        inputSchema: {
            projectType: z.string().describe('项目类型'),
            complexity: z.enum(['low', 'medium', 'high']).optional().default('medium').describe('项目复杂度'),
        },
    }, async ({ projectType, complexity }) => {
        const suggestions = {
            'web 应用': [{ members: ['架构师', 'Executor', '设计师', '测试员'], reason: '完整的前端开发团队' }],
            'api 服务': [{ members: ['架构师', 'Executor', '测试员', '系统管理员'], reason: '后端开发团队' }],
            '数据分析': [{ members: ['咨询师', '财务', '架构师'], reason: '数据分析专业团队' }],
            '营销活动': [{ members: ['推广专员', '设计师', '媒体'], reason: '营销全流程团队' }],
        };
        const teamConfigs = suggestions[projectType] || [{ members: ['AI 主管', 'Executor', '测试员'], reason: '通用团队配置' }];
        const recommendedConfig = complexity === 'high' ? teamConfigs[0] : teamConfigs[teamConfigs.length - 1];
        const summary = `🤝 **团队协作建议**\n\n**项目类型**: ${projectType}\n**复杂度**: ${complexity}\n\n**推荐团队配置**:\n${recommendedConfig.members.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n\n**推荐理由**:\n${recommendedConfig.reason}`;
        return {
            content: [{ type: 'text', text: summary }],
            structuredContent: { projectType, complexity, recommended: recommendedConfig },
        };
    });
}
//# sourceMappingURL=agents.js.map