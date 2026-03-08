/**
 * 7zi MCP Server - Task Tools
 * 任务管理相关 MCP 工具
 */
import { z } from 'zod';
const TaskStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']);
const TaskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
// 模拟任务数据存储
const mockTasks = new Map();
// 初始化测试任务
mockTasks.set('task-001', {
    id: 'task-001',
    title: '实现 MCP Server 核心功能',
    description: '设计并实现 MCP Server，暴露 7zi 的核心能力',
    status: 'in_progress',
    priority: 'high',
    assigneeId: 'agent-architect',
    assigneeName: '架构师',
    tags: ['mcp', 'architecture'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
});
mockTasks.set('task-002', {
    id: 'task-002',
    title: '编写 MCP Server 文档',
    description: '创建完整的 MCP Server 使用文档',
    status: 'pending',
    priority: 'medium',
    assigneeId: 'agent-consultant',
    assigneeName: '咨询师',
    tags: ['documentation'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
});
mockTasks.set('task-003', {
    id: 'task-003',
    title: '测试 MCP Server 功能',
    description: '编写单元测试和集成测试',
    status: 'pending',
    priority: 'high',
    assigneeId: 'agent-tester',
    assigneeName: '测试员',
    tags: ['testing'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
});
export function registerTaskTools(server) {
    // 获取任务列表
    server.registerTool('list_tasks', {
        description: '获取任务列表，支持按状态、优先级、分配者筛选',
        inputSchema: {
            status: TaskStatusEnum.optional().describe('按状态筛选'),
            priority: TaskPriorityEnum.optional().describe('按优先级筛选'),
            assigneeId: z.string().optional().describe('按 AI 成员 ID 筛选'),
            limit: z.number().min(1).max(100).optional().default(20).describe('返回数量限制'),
        },
    }, async ({ status, priority, assigneeId, limit }) => {
        let tasks = Array.from(mockTasks.values());
        if (status)
            tasks = tasks.filter((t) => t.status === status);
        if (priority)
            tasks = tasks.filter((t) => t.priority === priority);
        if (assigneeId)
            tasks = tasks.filter((t) => t.assigneeId === assigneeId);
        tasks = tasks.slice(0, limit);
        const summary = tasks.length > 0
            ? tasks.map((t) => `📋 **${t.title}** [${t.assigneeName || '未分配'}]\n   - 状态：${t.status} | 优先级：${t.priority}`).join('\n\n')
            : '没有找到匹配的任务';
        return {
            content: [{ type: 'text', text: `📋 **任务列表** (共 ${tasks.length} 个)\n\n${summary}` }],
            structuredContent: { tasks, total: tasks.length },
        };
    });
    // 获取任务详情
    server.registerTool('get_task', {
        description: '获取指定任务的详细信息',
        inputSchema: { taskId: z.string().describe('任务 ID') },
    }, async ({ taskId }) => {
        const task = mockTasks.get(taskId);
        if (!task) {
            return { content: [{ type: 'text', text: `❌ 任务不存在：${taskId}` }], isError: true };
        }
        return {
            content: [{ type: 'text', text: `📋 **${task.title}**\n\n- ID: ${task.id}\n- 状态：${task.status}\n- 优先级：${task.priority}\n- 描述：${task.description || '无'}\n- 分配给：${task.assigneeName || '未分配'}` }],
            structuredContent: task,
        };
    });
    // 创建任务
    server.registerTool('create_task', {
        description: '创建新任务',
        inputSchema: {
            title: z.string().min(1).max(200).describe('任务标题'),
            description: z.string().max(2000).optional().describe('任务描述'),
            priority: TaskPriorityEnum.optional().default('medium').describe('优先级'),
            assigneeId: z.string().optional().describe('分配给的 AI 成员 ID'),
            tags: z.array(z.string()).optional().describe('任务标签'),
        },
    }, async ({ title, description, priority, assigneeId, tags }) => {
        const taskId = `task-${Date.now()}`;
        const now = new Date().toISOString();
        const assigneeNames = {
            'agent-director': 'AI 主管',
            'agent-architect': '架构师',
            'agent-executor': 'Executor',
            'agent-tester': '测试员',
            'agent-consultant': '咨询师',
        };
        const task = {
            id: taskId,
            title,
            description,
            status: 'pending',
            priority: priority || 'medium',
            assigneeId,
            assigneeName: assigneeId ? assigneeNames[assigneeId] : undefined,
            tags: tags || [],
            createdAt: now,
            updatedAt: now,
        };
        mockTasks.set(taskId, task);
        return {
            content: [{ type: 'text', text: `✅ 任务创建成功!\n\n📋 **${title}**\n- ID: ${taskId}` }],
            structuredContent: task,
        };
    });
    // 更新任务状态
    server.registerTool('update_task_status', {
        description: '更新任务状态',
        inputSchema: {
            taskId: z.string().describe('任务 ID'),
            status: TaskStatusEnum.describe('新状态'),
        },
    }, async ({ taskId, status }) => {
        const task = mockTasks.get(taskId);
        if (!task) {
            return { content: [{ type: 'text', text: `❌ 任务不存在：${taskId}` }], isError: true };
        }
        const updatedTask = { ...task, status, updatedAt: new Date().toISOString() };
        if (status === 'completed')
            updatedTask.completedAt = new Date().toISOString();
        mockTasks.set(taskId, updatedTask);
        return {
            content: [{ type: 'text', text: `✅ 任务状态已更新!\n\n📋 **${task.title}**\n- 新状态：${status}` }],
            structuredContent: updatedTask,
        };
    });
    // 分配任务
    server.registerTool('assign_task', {
        description: '将任务分配给指定的 AI 成员',
        inputSchema: {
            taskId: z.string().describe('任务 ID'),
            assigneeId: z.string().describe('AI 成员 ID'),
        },
    }, async ({ taskId, assigneeId }) => {
        const task = mockTasks.get(taskId);
        if (!task) {
            return { content: [{ type: 'text', text: `❌ 任务不存在：${taskId}` }], isError: true };
        }
        const assigneeNames = {
            'agent-director': 'AI 主管',
            'agent-architect': '架构师',
            'agent-executor': 'Executor',
            'agent-tester': '测试员',
        };
        const assigneeName = assigneeNames[assigneeId];
        if (!assigneeName) {
            return { content: [{ type: 'text', text: `❌ AI 成员不存在：${assigneeId}` }], isError: true };
        }
        const updatedTask = { ...task, assigneeId, assigneeName, updatedAt: new Date().toISOString() };
        mockTasks.set(taskId, updatedTask);
        return {
            content: [{ type: 'text', text: `✅ 任务已分配!\n\n📋 **${task.title}**\n- 分配给：${assigneeName}` }],
            structuredContent: updatedTask,
        };
    });
    // 智能分配任务
    server.registerTool('smart_assign_task', {
        description: '智能分配任务给最合适的 AI 成员',
        inputSchema: {
            taskType: z.string().describe('任务类型 (如：开发、测试、设计、文档)'),
            priority: TaskPriorityEnum.optional().default('medium').describe('任务优先级'),
            requiredCapabilities: z.array(z.string()).optional().describe('所需能力列表'),
        },
    }, async ({ taskType, priority, requiredCapabilities }) => {
        const taskTypeMap = {
            '开发': ['executor', 'architect'],
            '测试': ['tester'],
            '设计': ['designer'],
            '文档': ['consultant'],
        };
        const candidateRoles = taskTypeMap[taskType] || [];
        const agents = [
            { id: 'agent-architect', name: '架构师', role: 'architect', status: 'active', capabilities: ['架构设计', '代码实现'] },
            { id: 'agent-executor', name: 'Executor', role: 'executor', status: 'active', capabilities: ['代码实现', '功能开发'] },
            { id: 'agent-tester', name: '测试员', role: 'tester', status: 'active', capabilities: ['测试', '质量保障'] },
            { id: 'agent-designer', name: '设计师', role: 'designer', status: 'active', capabilities: ['UI 设计', 'UX 设计'] },
            { id: 'agent-consultant', name: '咨询师', role: 'consultant', status: 'active', capabilities: ['研究', '文档'] },
        ];
        let candidates = agents.filter((a) => candidateRoles.includes(a.role));
        if (requiredCapabilities?.length) {
            candidates = candidates.filter((a) => requiredCapabilities.some((cap) => a.capabilities.some((c) => c.includes(cap))));
        }
        if (!candidates.length) {
            return {
                content: [{ type: 'text', text: `⚠️ 没有找到合适的 AI 成员\n\n任务类型：${taskType}` }],
                isError: true,
            };
        }
        const best = candidates[0];
        return {
            content: [{ type: 'text', text: `🎯 **智能分配建议**\n\n**推荐成员**: ${best.name}\n**角色**: ${best.role}\n**状态**: ${best.status}` }],
            structuredContent: { recommended: best, alternatives: candidates.slice(1, 3) },
        };
    });
}
//# sourceMappingURL=tasks.js.map