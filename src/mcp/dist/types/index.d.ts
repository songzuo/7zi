/**
 * 7zi MCP Server Types
 * MCP (Model Context Protocol) 类型定义
 */
import { z } from 'zod';
export declare const DashboardStatsSchema: z.ZodObject<{
    totalTasks: z.ZodNumber;
    completedTasks: z.ZodNumber;
    inProgressTasks: z.ZodNumber;
    pendingTasks: z.ZodNumber;
    activeAgents: z.ZodNumber;
    totalAgents: z.ZodNumber;
    completionRate: z.ZodNumber;
    avgCompletionTime: z.ZodOptional<z.ZodNumber>;
    todayCompleted: z.ZodNumber;
    weeklyTrend: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    activeAgents: number;
    totalAgents: number;
    completionRate: number;
    todayCompleted: number;
    avgCompletionTime?: number | undefined;
    weeklyTrend?: number[] | undefined;
}, {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    activeAgents: number;
    totalAgents: number;
    completionRate: number;
    todayCompleted: number;
    avgCompletionTime?: number | undefined;
    weeklyTrend?: number[] | undefined;
}>;
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
export declare const TaskStatusSchema: z.ZodEnum<["pending", "in_progress", "completed", "cancelled", "on_hold"]>;
export declare const TaskPrioritySchema: z.ZodEnum<["low", "medium", "high", "urgent"]>;
export declare const TaskSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["pending", "in_progress", "completed", "cancelled", "on_hold"]>;
    priority: z.ZodEnum<["low", "medium", "high", "urgent"]>;
    assigneeId: z.ZodOptional<z.ZodString>;
    assigneeName: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    dueDate: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    priority: "low" | "medium" | "high" | "urgent";
    title: string;
    status: "pending" | "in_progress" | "completed" | "cancelled" | "on_hold";
    id: string;
    createdAt: string;
    updatedAt: string;
    description?: string | undefined;
    assigneeId?: string | undefined;
    tags?: string[] | undefined;
    assigneeName?: string | undefined;
    dueDate?: string | undefined;
    completedAt?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    priority: "low" | "medium" | "high" | "urgent";
    title: string;
    status: "pending" | "in_progress" | "completed" | "cancelled" | "on_hold";
    id: string;
    createdAt: string;
    updatedAt: string;
    description?: string | undefined;
    assigneeId?: string | undefined;
    tags?: string[] | undefined;
    assigneeName?: string | undefined;
    dueDate?: string | undefined;
    completedAt?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type Task = z.infer<typeof TaskSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export declare const CreateTaskSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    priority: z.ZodDefault<z.ZodOptional<z.ZodEnum<["low", "medium", "high", "urgent"]>>>;
    assigneeId: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    dueDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    priority: "low" | "medium" | "high" | "urgent";
    title: string;
    description?: string | undefined;
    assigneeId?: string | undefined;
    tags?: string[] | undefined;
    dueDate?: string | undefined;
}, {
    title: string;
    priority?: "low" | "medium" | "high" | "urgent" | undefined;
    description?: string | undefined;
    assigneeId?: string | undefined;
    tags?: string[] | undefined;
    dueDate?: string | undefined;
}>;
export declare const UpdateTaskSchema: z.ZodObject<{
    taskId: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["pending", "in_progress", "completed", "cancelled", "on_hold"]>>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    assigneeId: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    dueDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    taskId: string;
    priority?: "low" | "medium" | "high" | "urgent" | undefined;
    description?: string | undefined;
    title?: string | undefined;
    status?: "pending" | "in_progress" | "completed" | "cancelled" | "on_hold" | undefined;
    assigneeId?: string | undefined;
    tags?: string[] | undefined;
    dueDate?: string | undefined;
}, {
    taskId: string;
    priority?: "low" | "medium" | "high" | "urgent" | undefined;
    description?: string | undefined;
    title?: string | undefined;
    status?: "pending" | "in_progress" | "completed" | "cancelled" | "on_hold" | undefined;
    assigneeId?: string | undefined;
    tags?: string[] | undefined;
    dueDate?: string | undefined;
}>;
export declare const AgentStatusSchema: z.ZodEnum<["active", "inactive", "busy", "offline"]>;
export declare const AgentRoleSchema: z.ZodEnum<["director", "ai_world_expert", "consultant", "architect", "executor", "admin", "tester", "designer", "marketer", "sales", "finance", "media"]>;
export declare const AgentSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    role: z.ZodEnum<["director", "ai_world_expert", "consultant", "architect", "executor", "admin", "tester", "designer", "marketer", "sales", "finance", "media"]>;
    status: z.ZodEnum<["active", "inactive", "busy", "offline"]>;
    provider: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    currentTask: z.ZodOptional<z.ZodString>;
    completedTasks: z.ZodOptional<z.ZodNumber>;
    lastActiveAt: z.ZodOptional<z.ZodString>;
    capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    status: "active" | "inactive" | "busy" | "offline";
    id: string;
    role: "ai_world_expert" | "architect" | "executor" | "admin" | "tester" | "designer" | "consultant" | "director" | "marketer" | "sales" | "finance" | "media";
    description?: string | undefined;
    completedTasks?: number | undefined;
    currentTask?: string | undefined;
    provider?: string | undefined;
    capabilities?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    lastActiveAt?: string | undefined;
}, {
    name: string;
    status: "active" | "inactive" | "busy" | "offline";
    id: string;
    role: "ai_world_expert" | "architect" | "executor" | "admin" | "tester" | "designer" | "consultant" | "director" | "marketer" | "sales" | "finance" | "media";
    description?: string | undefined;
    completedTasks?: number | undefined;
    currentTask?: string | undefined;
    provider?: string | undefined;
    capabilities?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    lastActiveAt?: string | undefined;
}>;
export type Agent = z.infer<typeof AgentSchema>;
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export type AgentRole = z.infer<typeof AgentRoleSchema>;
export declare const ActivityTypeSchema: z.ZodEnum<["task_created", "task_updated", "task_completed", "task_assigned", "agent_status_changed", "meeting_started", "meeting_ended", "decision_made", "report_generated"]>;
export declare const ActivityLogSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["task_created", "task_updated", "task_completed", "task_assigned", "agent_status_changed", "meeting_started", "meeting_ended", "decision_made", "report_generated"]>;
    agentId: z.ZodOptional<z.ZodString>;
    agentName: z.ZodOptional<z.ZodString>;
    taskId: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "task_completed" | "task_assigned" | "agent_status_changed" | "task_created" | "task_updated" | "meeting_started" | "meeting_ended" | "decision_made" | "report_generated";
    description: string;
    id: string;
    timestamp: string;
    taskId?: string | undefined;
    agentId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    agentName?: string | undefined;
}, {
    type: "task_completed" | "task_assigned" | "agent_status_changed" | "task_created" | "task_updated" | "meeting_started" | "meeting_ended" | "decision_made" | "report_generated";
    description: string;
    id: string;
    timestamp: string;
    taskId?: string | undefined;
    agentId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    agentName?: string | undefined;
}>;
export type ActivityLog = z.infer<typeof ActivityLogSchema>;
export type ActivityType = z.infer<typeof ActivityTypeSchema>;
export interface McpServerConfig {
    name: string;
    version: string;
    description?: string;
    transport: 'stdio' | 'http' | 'sse';
    port?: number;
    basePath?: string;
}
export declare const DEFAULT_MCP_CONFIG: McpServerConfig;
export interface McpToolResponse<T = unknown> {
    content: Array<{
        type: 'text' | 'image' | 'resource';
        text?: string;
        data?: string;
        mimeType?: string;
        uri?: string;
    }>;
    isError?: boolean;
    structuredContent?: T;
}
export interface McpResourceResponse {
    uri: string;
    name: string;
    mimeType?: string;
    text?: string;
    blob?: string;
}
export interface McpPromptResponse {
    description?: string;
    messages: Array<{
        role: 'user' | 'assistant';
        content: {
            type: 'text' | 'image' | 'resource';
            text?: string;
            data?: string;
            mimeType?: string;
        };
    }>;
}
//# sourceMappingURL=index.d.ts.map