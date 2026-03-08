/**
 * 7zi MCP Server - Prompts
 * MCP 提示模板 - 预定义的任务和工作流模板
 */
import { z } from 'zod';
export function registerPrompts(server) {
    // Prompt: 创建新任务
    server.registerPrompt('create-task', {
        description: '快速创建新任务的模板',
        argsSchema: {
            taskType: z.string().describe('任务类型 (如：开发、测试、设计、文档)'),
            priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('优先级'),
        },
    }, ({ taskType, priority }) => {
        return {
            description: '创建新任务的工作流',
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `# 创建新任务

## 任务类型
${taskType}

## 优先级
${priority || 'medium'}

## 步骤

### 1. 定义任务
- 任务标题：简洁描述任务目标
- 详细描述：详细说明任务要求
- 验收标准：如何判断任务完成

### 2. 分配资源
使用 \`smart_assign_task\` 智能分配任务

### 3. 创建任务
使用 \`create_task\` 创建任务记录

---
**提示**: 使用 \`get_agent_workload\` 查看成员工作负载`,
                    },
                },
            ],
        };
    });
    // Prompt: 每日站会
    server.registerPrompt('daily-standup', {
        description: '每日站会议程模板',
    }, () => {
        return {
            description: '每日站会工作流',
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `# 每日站会议程

## 时间
建议：每日上午 9:00

## 参与者
- AI 主管
- 所有活跃的 AI 成员

## 会议流程

### 1. Dashboard 回顾 (5分钟)
使用工具: \`get_dashboard_stats\`

### 2. 成员汇报 (每人 2-3分钟)
- 昨日完成了什么
- 今日计划做什么
- 遇到什么问题

### 3. 问题讨论 (10分钟)

### 4. 任务分配 (5分钟)
使用 \`smart_assign_task\` 分配任务

---
**工具**: list_agents, get_activity_logs, get_team_efficiency`,
                    },
                },
            ],
        };
    });
    // Prompt: 任务评审
    server.registerPrompt('task-review', {
        description: '任务评审和代码审查模板',
        argsSchema: {
            taskId: z.string().describe('要评审的任务 ID'),
        },
    }, ({ taskId }) => {
        return {
            description: '任务评审工作流',
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `# 任务评审

## 任务信息
任务 ID: ${taskId}

## 评审维度

### 1. 完成度检查
- [ ] 所有需求是否已实现
- [ ] 验收标准是否满足

### 2. 质量检查
- [ ] 代码风格是否一致
- [ ] 是否有注释和文档

### 3. 安全性检查
- [ ] 是否有安全漏洞
- [ ] 权限控制是否正确

## 审查步骤

1. \`get_task(taskId: "${taskId}")\`
2. 评审并记录问题
3. 生成改进建议

## 评审结果
- ✅ 通过
- ⚠️ 有条件通过
- ❌ 需要修改`,
                    },
                },
            ],
        };
    });
    // Prompt: 团队协作规划
    server.registerPrompt('collaboration-planning', {
        description: '团队协作项目规划模板',
        argsSchema: {
            projectType: z.string().describe('项目类型'),
            complexity: z.enum(['low', 'medium', 'high']).optional().describe('复杂度'),
        },
    }, ({ projectType, complexity }) => {
        return {
            description: '团队协作规划工作流',
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `# 团队协作项目规划

## 项目概况
- 项目类型: ${projectType}
- 复杂度: ${complexity || 'medium'}

## 规划步骤

### 1. 获取协作建议
\`get_collaboration_suggestions(projectType: "${projectType}", complexity: "${complexity || 'medium'}")\`

### 2. 分析需求
- 明确项目目标
- 拆分功能模块
- 识别关键任务

### 3. 资源分配
- \`get_agent_workload\` 查看工作负载
- \`smart_assign_task\` 分配任务

### 4. 制定时间线
- 里程碑设置
- 任务依赖关系
- 风险缓冲

## 输出
- 团队成员列表及分工
- 任务分解和时间线
- 协作机制和规范`,
                    },
                },
            ],
        };
    });
    // Prompt: 效率分析
    server.registerPrompt('efficiency-analysis', {
        description: '团队效率分析和优化建议',
        argsSchema: {
            period: z.enum(['today', 'week', 'month']).optional().describe('统计周期'),
        },
    }, ({ period }) => {
        return {
            description: '效率分析工作流',
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `# 团队效率分析

## 分析周期
${period || 'week'}

## 数据收集

使用工具:
- \`get_dashboard_stats(includeWeeklyTrend: true)\`
- \`get_activity_logs(limit: 100)\`
- \`get_team_efficiency(period: "${period || 'week'}")\`
- \`get_agent_workload()\`

## 分析维度

### 整体指标
- 任务完成率
- 平均完成时间
- 活跃成员比例

### 个人指标
- 每位成员的任务完成数
- 工作负载分布

## 输出
1. 效率现状总结
2. 问题识别
3. 改进建议
4. 后续行动计划`,
                    },
                },
            ],
        };
    });
    // Prompt: 项目进度汇报
    server.registerPrompt('project-progress', {
        description: '项目进度汇报模板',
        argsSchema: {
            projectId: z.string().optional().describe('项目 ID'),
        },
    }, ({ projectId }) => {
        return {
            description: '项目进度汇报工作流',
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `# 项目进度汇报

${projectId ? `项目 ID: ${projectId}` : ''}

## 汇报内容

### 1. 总体进度
- 完成百分比
- 当前阶段
- 预计完成时间

### 2. 本周期进展
- 已完成的任务
- 进行中的任务

### 3. 下期计划
- 计划完成的任务
- 资源需求

### 4. 风险和问题
- 当前风险
- 需要支持的事项

## 数据来源
- \`get_dashboard_stats()\`
- \`list_tasks(status: "in_progress")\`
- \`get_activity_logs(limit: 50)\`

## 建议频率
- 日报: 快速同步
- 周报: 详细分析`,
                    },
                },
            ],
        };
    });
}
//# sourceMappingURL=index.js.map