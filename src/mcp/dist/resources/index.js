/**
 * 7zi MCP Server - Resources
 * MCP 资源定义 - 提供只读数据访问
 */
// 简单的资源数据
const teamInfo = {
    name: '7zi AI 团队',
    version: '1.0.2',
    description: 'AI 驱动的团队管理平台',
    members: 11,
    capabilities: ['任务管理', '团队协作', '实时 Dashboard', '智能分配'],
};
const agents = [
    { id: 'agent-director', name: 'AI 主管', role: 'director', provider: 'claude', status: 'active' },
    { id: 'agent-expert', name: '智能体世界专家', role: 'ai_world_expert', provider: 'minimax', status: 'active' },
    { id: 'agent-consultant', name: '咨询师', role: 'consultant', provider: 'minimax', status: 'active' },
    { id: 'agent-architect', name: '架构师', role: 'architect', provider: 'self-claude', status: 'busy' },
    { id: 'agent-executor', name: 'Executor', role: 'executor', provider: 'volcengine', status: 'active' },
    { id: 'agent-admin', name: '系统管理员', role: 'admin', provider: 'bailian', status: 'active' },
    { id: 'agent-tester', name: '测试员', role: 'tester', provider: 'minimax', status: 'active' },
    { id: 'agent-designer', name: '设计师', role: 'designer', provider: 'self-claude', status: 'active' },
    { id: 'agent-marketer', name: '推广专员', role: 'marketer', provider: 'volcengine', status: 'active' },
    { id: 'agent-sales', name: '销售客服', role: 'sales', provider: 'bailian', status: 'active' },
    { id: 'agent-finance', name: '财务', role: 'finance', provider: 'minimax', status: 'active' },
    { id: 'agent-media', name: '媒体', role: 'media', provider: 'self-claude', status: 'active' },
];
const taskStatuses = [
    { value: 'pending', label: '待处理', description: '任务已创建，等待分配' },
    { value: 'in_progress', label: '进行中', description: '任务正在进行' },
    { value: 'completed', label: '已完成', description: '任务已成功完成' },
    { value: 'cancelled', label: '已取消', description: '任务被取消' },
    { value: 'on_hold', label: '暂停', description: '任务暂停，等待恢复' },
];
const taskPriorities = [
    { value: 'low', label: '低', description: '低优先级任务，可以延后' },
    { value: 'medium', label: '中', description: '中等优先级任务' },
    { value: 'high', label: '高', description: '高优先级任务' },
    { value: 'urgent', label: '紧急', description: '紧急任务，立即处理' },
];
export function registerResources(server) {
    // 使用旧的 API 注册资源（兼容）
    // 团队信息资源
    server.resource('team-info', '7zi://team/info', async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(teamInfo, null, 2) }],
    }));
    // AI 成员列表资源
    server.resource('agents-list', '7zi://agents/list', async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ agents, total: agents.length }, null, 2) }],
    }));
    // 任务状态资源
    server.resource('task-statuses', '7zi://tasks/statuses', async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ statuses: taskStatuses }, null, 2) }],
    }));
    // 任务优先级资源
    server.resource('task-priorities', '7zi://tasks/priorities', async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ priorities: taskPriorities }, null, 2) }],
    }));
    console.error('[7zi MCP] Resources registered (legacy API)');
}
//# sourceMappingURL=index.js.map