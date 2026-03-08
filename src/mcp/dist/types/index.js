/**
 * 7zi MCP Server Types
 * MCP (Model Context Protocol) 类型定义
 */
import { z } from 'zod';
// ============================================================================
// Dashboard 相关类型
// ============================================================================
export const DashboardStatsSchema = z.object({
    totalTasks: z.number().describe('总任务数'),
    completedTasks: z.number().describe('已完成任务数'),
    inProgressTasks: z.number().describe('进行中任务数'),
    pendingTasks: z.number().describe('待处理任务数'),
    activeAgents: z.number().describe('活跃 AI 成员数'),
    totalAgents: z.number().describe('总 AI 成员数'),
    completionRate: z.number().describe('完成率 (0-1)'),
    avgCompletionTime: z.number().optional().describe('平均完成时间 (小时)'),
    todayCompleted: z.number().describe('今日完成任务数'),
    weeklyTrend: z.array(z.number()).optional().describe('本周趋势数据'),
});
// ============================================================================
// 任务相关类型
// ============================================================================
export const TaskStatusSchema = z.enum([
    'pending',
    'in_progress',
    'completed',
    'cancelled',
    'on_hold',
]);
export const TaskPrioritySchema = z.enum([
    'low',
    'medium',
    'high',
    'urgent',
]);
export const TaskSchema = z.object({
    id: z.string().describe('任务唯一标识'),
    title: z.string().describe('任务标题'),
    description: z.string().optional().describe('任务描述'),
    status: TaskStatusSchema.describe('任务状态'),
    priority: TaskPrioritySchema.describe('优先级'),
    assigneeId: z.string().optional().describe('分配给的 AI 成员 ID'),
    assigneeName: z.string().optional().describe('分配给的 AI 成员名称'),
    tags: z.array(z.string()).optional().describe('任务标签'),
    dueDate: z.string().optional().describe('截止日期 (ISO 格式)'),
    createdAt: z.string().describe('创建时间'),
    updatedAt: z.string().describe('更新时间'),
    completedAt: z.string().optional().describe('完成时间'),
    metadata: z.record(z.unknown()).optional().describe('额外元数据'),
});
export const CreateTaskSchema = z.object({
    title: z.string().min(1).max(200).describe('任务标题'),
    description: z.string().max(2000).optional().describe('任务描述'),
    priority: TaskPrioritySchema.optional().default('medium').describe('优先级'),
    assigneeId: z.string().optional().describe('分配给的 AI 成员 ID'),
    tags: z.array(z.string()).optional().describe('任务标签'),
    dueDate: z.string().optional().describe('截止日期 (ISO 格式)'),
});
export const UpdateTaskSchema = z.object({
    taskId: z.string().describe('任务 ID'),
    title: z.string().min(1).max(200).optional().describe('任务标题'),
    description: z.string().max(2000).optional().describe('任务描述'),
    status: TaskStatusSchema.optional().describe('任务状态'),
    priority: TaskPrioritySchema.optional().describe('优先级'),
    assigneeId: z.string().optional().describe('分配给的 AI 成员 ID'),
    tags: z.array(z.string()).optional().describe('任务标签'),
    dueDate: z.string().optional().describe('截止日期'),
});
// ============================================================================
// AI 成员相关类型
// ============================================================================
export const AgentStatusSchema = z.enum([
    'active',
    'inactive',
    'busy',
    'offline',
]);
export const AgentRoleSchema = z.enum([
    'director', // 主管
    'ai_world_expert', // 智能体世界专家
    'consultant', // 咨询师
    'architect', // 架构师
    'executor', // 执行者
    'admin', // 系统管理员
    'tester', // 测试员
    'designer', // 设计师
    'marketer', // 推广专员
    'sales', // 销售客服
    'finance', // 财务
    'media', // 媒体
]);
export const AgentSchema = z.object({
    id: z.string().describe('AI 成员唯一标识'),
    name: z.string().describe('AI 成员名称'),
    role: AgentRoleSchema.describe('AI 成员角色'),
    status: AgentStatusSchema.describe('当前状态'),
    provider: z.string().optional().describe('AI 模型提供商'),
    description: z.string().optional().describe('角色描述'),
    currentTask: z.string().optional().describe('当前任务'),
    completedTasks: z.number().optional().describe('已完成任务数'),
    lastActiveAt: z.string().optional().describe('最后活跃时间'),
    capabilities: z.array(z.string()).optional().describe('能力列表'),
    metadata: z.record(z.unknown()).optional().describe('额外元数据'),
});
// ============================================================================
// 活动日志相关类型
// ============================================================================
export const ActivityTypeSchema = z.enum([
    'task_created',
    'task_updated',
    'task_completed',
    'task_assigned',
    'agent_status_changed',
    'meeting_started',
    'meeting_ended',
    'decision_made',
    'report_generated',
]);
export const ActivityLogSchema = z.object({
    id: z.string().describe('活动 ID'),
    type: ActivityTypeSchema.describe('活动类型'),
    agentId: z.string().optional().describe('相关 AI 成员 ID'),
    agentName: z.string().optional().describe('相关 AI 成员名称'),
    taskId: z.string().optional().describe('相关任务 ID'),
    description: z.string().describe('活动描述'),
    metadata: z.record(z.unknown()).optional().describe('额外元数据'),
    timestamp: z.string().describe('时间戳'),
});
export const DEFAULT_MCP_CONFIG = {
    name: '7zi-team',
    version: '1.0.0',
    description: '7zi AI 团队管理平台 MCP Server - 暴露 Dashboard、任务管理、AI 团队等核心能力',
    transport: 'stdio',
};
//# sourceMappingURL=index.js.map