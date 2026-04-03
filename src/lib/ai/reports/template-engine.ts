/**
 * Report Template Engine
 * 报表模板引擎
 * 
 * @version 1.10.0
 * @created 2025-04-03
 * 
 * 功能：
 * - 预定义报表模板管理
 * - 变量插值系统
 * - 多语言支持
 * - 条件渲染
 */

import {
  ReportTemplate,
  ReportTemplateType,
  ReportLanguage,
  ReportTone,
  ReportTemplateVariable,
  ReportSection,
  TemplateEngineConfig,
} from './types'

/**
 * 模板引擎默认配置
 */
const DEFAULT_CONFIG: TemplateEngineConfig = {
  enableHotReload: false,
  defaultLanguage: ReportLanguage.ZH_CN,
  strictMode: true,
}

/**
 * 报表模板引擎
 */
export class ReportTemplateEngine {
  private config: TemplateEngineConfig
  private templates: Map<string, ReportTemplate> = new Map()
  private templateCache: Map<string, string> = new Map()

  constructor(config: Partial<TemplateEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeBuiltInTemplates()
  }

  /**
   * 初始化内置模板
   */
  private initializeBuiltInTemplates(): void {
    // 项目进度报表
    this.registerTemplate(this.createProjectProgressTemplate())
    
    // 团队绩效报表
    this.registerTemplate(this.createTeamPerformanceTemplate())
    
    // 任务分析报表
    this.registerTemplate(this.createTaskAnalysisTemplate())
    
    // 智能体活动报表
    this.registerTemplate(this.createAgentActivityTemplate())
    
    // 收入分析报表
    this.registerTemplate(this.createRevenueAnalysisTemplate())
    
    // 用户参与度报表
    this.registerTemplate(this.createUserEngagementTemplate())
  }

  /**
   * 注册模板
   */
  registerTemplate(template: ReportTemplate): void {
    this.templates.set(template.id, template)
    this.templateCache.delete(template.id) // 清除缓存
  }

  /**
   * 获取模板
   */
  getTemplate(templateId: string): ReportTemplate | undefined {
    return this.templates.get(templateId)
  }

  /**
   * 根据类型获取模板
   */
  getTemplateByType(type: ReportTemplateType): ReportTemplate | undefined {
    for (const template of this.templates.values()) {
      if (template.type === type) {
        return template
      }
    }
    return undefined
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * 获取支持的模板类型
   */
  getSupportedTypes(): ReportTemplateType[] {
    return Object.values(ReportTemplateType)
  }

  /**
   * 变量插值
   */
  interpolate(template: string, variables: Record<string, unknown>): string {
    let result = template

    // 处理简单变量 {{variable}}
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key]
      return value !== undefined ? String(value) : match
    })

    // 处理嵌套变量 {{object.property}}
    result = result.replace(/\{\{([\w.]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(variables, path)
      return value !== undefined ? String(value) : match
    })

    // 处理条件块 {{#if condition}}...{{/if}}
    result = this.processConditionals(result, variables)

    // 处理循环 {{#each items}}...{{/each}}
    result = this.processLoops(result, variables)

    return result
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.')
    let value: unknown = obj

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key]
      } else {
        return undefined
      }
    }

    return value
  }

  /**
   * 处理条件块
   */
  private processConditionals(template: string, variables: Record<string, unknown>): string {
    // 处理 {{#if condition}}...{{/if}}
    const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g
    
    return template.replace(ifRegex, (match, condition, content) => {
      const value = variables[condition]
      const isTrue = Boolean(value) || value === 'true' || value === 1
      
      return isTrue ? content.trim() : ''
    })
  }

  /**
   * 处理循环
   */
  private processLoops(template: string, variables: Record<string, unknown>): string {
    // 处理 {{#each items}}...{{/each}}
    const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g
    
    return template.replace(eachRegex, (match, arrayName, content) => {
      const array = variables[arrayName]
      
      if (!Array.isArray(array)) {
        return ''
      }

      return array.map((item, index) => {
        let itemContent = content
        
        // 替换 {{this}}
        itemContent = itemContent.replace(/\{\{this\}\}/g, String(item))
        
        // 替换 {{@index}}
        itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index + 1))
        
        // 如果 item 是对象，替换属性
        if (typeof item === 'object' && item !== null) {
          itemContent = this.interpolate(itemContent, item as Record<string, unknown>)
        }
        
        return itemContent.trim()
      }).join('\n')
    })
  }

  /**
   * 验证变量
   */
  validateVariables(
    template: ReportTemplate,
    variables: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    for (const variable of template.variables) {
      const value = variables[variable.key]

      // 检查必需变量
      if (variable.required && (value === undefined || value === null)) {
        errors.push(`Missing required variable: ${variable.key}`)
        continue
      }

      // 如果值存在，进行类型检查
      if (value !== undefined && value !== null) {
        const typeError = this.validateVariableType(variable, value)
        if (typeError) {
          errors.push(typeError)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 验证变量类型
   */
  private validateVariableType(variable: ReportTemplateVariable, value: unknown): string | null {
    const actualType = Array.isArray(value) ? 'array' : typeof value

    if (actualType !== variable.type) {
      // 特殊情况：数字字符串
      if (variable.type === 'number' && typeof value === 'string') {
        const num = Number(value)
        if (!isNaN(num)) {
          return null
        }
      }

      return `Invalid type for ${variable.key}: expected ${variable.type}, got ${actualType}`
    }

    // 验证约束
    if (variable.validation) {
      if (variable.validation.min !== undefined && typeof value === 'number') {
        if (value < variable.validation.min) {
          return `${variable.key} must be >= ${variable.validation.min}`
        }
      }

      if (variable.validation.max !== undefined && typeof value === 'number') {
        if (value > variable.validation.max) {
          return `${variable.key} must be <= ${variable.validation.max}`
        }
      }

      if (variable.validation.pattern && typeof value === 'string') {
        const regex = new RegExp(variable.validation.pattern)
        if (!regex.test(value)) {
          return `${variable.key} does not match required pattern`
        }
      }

      if (variable.validation.options && !Array.isArray(value)) {
        if (!variable.validation.options.includes(String(value))) {
          return `${variable.key} must be one of: ${variable.validation.options.join(', ')}`
        }
      }
    }

    return null
  }

  /**
   * 渲染章节
   */
  renderSections(
    template: ReportTemplate,
    variables: Record<string, unknown>
  ): string[] {
    const rendered: string[] = []

    for (const section of template.sections) {
      // 检查条件
      if (section.conditional) {
        const conditionValue = variables[section.conditional.variable]
        const shouldRender = this.evaluateCondition(
          conditionValue,
          section.conditional.operator,
          section.conditional.value
        )

        if (!shouldRender) {
          continue
        }
      }

      // 渲染章节内容
      const content = this.interpolate(section.template, variables)
      rendered.push(`## ${section.title}\n\n${content}`)
    }

    return rendered
  }

  /**
   * 评估条件
   */
  private evaluateCondition(
    value: unknown,
    operator: string,
    targetValue: unknown
  ): boolean {
    switch (operator) {
      case 'equals':
        return value === targetValue
      case 'notEquals':
        return value !== targetValue
      case 'exists':
        return value !== undefined && value !== null
      case 'greaterThan':
        return Number(value) > Number(targetValue)
      case 'lessThan':
        return Number(value) < Number(targetValue)
      default:
        return false
    }
  }

  // ========================================================================
  // 内置模板创建方法
  // ========================================================================

  private createProjectProgressTemplate(): ReportTemplate {
    return {
      id: 'tpl-project-progress',
      type: ReportTemplateType.PROJECT_PROGRESS,
      name: '项目进度报表',
      description: '展示项目整体进度、里程碑完成情况和风险项',
      version: '1.0.0',
      variables: [
        {
          key: 'projectName',
          label: '项目名称',
          type: 'string',
          required: true,
          description: '项目的名称',
        },
        {
          key: 'overallProgress',
          label: '整体进度',
          type: 'number',
          required: true,
          description: '项目完成百分比',
          validation: { min: 0, max: 100 },
        },
        {
          key: 'milestones',
          label: '里程碑',
          type: 'array',
          required: true,
          description: '项目里程碑列表',
        },
        {
          key: 'risks',
          label: '风险项',
          type: 'array',
          required: false,
          description: '项目风险列表',
        },
      ],
      sections: [
        {
          id: 'summary',
          title: '项目概览',
          template: `**{{projectName}}** 当前进度为 **{{overallProgress}}%**。

本期共完成 **{{completedTasks}}** 个任务，新增 **{{newTasks}}** 个任务，整体进度较上期{{progressTrend}}。`,
          order: 1,
          required: true,
        },
        {
          id: 'milestones',
          title: '里程碑进展',
          template: `{{#each milestones}}
{{@index}}. **{{name}}** - {{status}} ({{completion}}%)
   截止日期: {{deadline}}
   {{#if blocked}}⚠️ 阻塞原因: {{blockedReason}}{{/if}}
{{/each}}`,
          order: 2,
          required: true,
        },
        {
          id: 'risks',
          title: '风险提示',
          template: `{{#if risks}}
本期识别到 **{{risksCount}}** 个风险项：

{{#each risks}}
- **{{severity}}** 级风险: {{description}}
  影响范围: {{impact}}
  应对措施: {{mitigation}}
{{/each}}
{{/if}}`,
          order: 3,
          required: false,
          conditional: {
            variable: 'risks',
            operator: 'exists',
            value: true,
          },
        },
      ],
      supportedLanguages: [ReportLanguage.ZH_CN, ReportLanguage.EN_US],
      supportedTones: [ReportTone.FORMAL, ReportTone.DETAILED],
      metadata: {
        author: 'System',
        createdAt: '2025-04-03T00:00:00Z',
        updatedAt: '2025-04-03T00:00:00Z',
        tags: ['project', 'progress', 'milestone'],
      },
    }
  }

  private createTeamPerformanceTemplate(): ReportTemplate {
    return {
      id: 'tpl-team-performance',
      type: ReportTemplateType.TEAM_PERFORMANCE,
      name: '团队绩效报表',
      description: '展示团队成员的工作效率、任务完成情况和协作指标',
      version: '1.0.0',
      variables: [
        {
          key: 'teamName',
          label: '团队名称',
          type: 'string',
          required: true,
          description: '团队的名称',
        },
        {
          key: 'members',
          label: '团队成员',
          type: 'array',
          required: true,
          description: '团队成员绩效数据',
        },
        {
          key: 'period',
          label: '统计周期',
          type: 'string',
          required: true,
          description: '报表统计的时间周期',
        },
      ],
      sections: [
        {
          id: 'overview',
          title: '团队概览',
          template: `**{{teamName}}** 在 **{{period}}** 内的表现：

- 任务完成率: **{{completionRate}}%**
- 平均响应时间: **{{avgResponseTime}}** 分钟
- 协作指数: **{{collaborationScore}}**/10
- 客户满意度: **{{satisfactionScore}}**/5`,
          order: 1,
          required: true,
        },
        {
          id: 'members',
          title: '成员表现',
          template: `{{#each members}}
### {{name}} ({{role}})
- 完成任务: **{{tasksCompleted}}** 个
- 工作时长: **{{hoursWorked}}** 小时
- 效率评分: **{{efficiencyScore}}**/10
- 贡献度: **{{contribution}}**%

{{/each}}`,
          order: 2,
          required: true,
        },
      ],
      supportedLanguages: [ReportLanguage.ZH_CN, ReportLanguage.EN_US],
      supportedTones: [ReportTone.FORMAL, ReportTone.DETAILED, ReportTone.CONCISE],
      metadata: {
        author: 'System',
        createdAt: '2025-04-03T00:00:00Z',
        updatedAt: '2025-04-03T00:00:00Z',
        tags: ['team', 'performance', 'kpi'],
      },
    }
  }

  private createTaskAnalysisTemplate(): ReportTemplate {
    return {
      id: 'tpl-task-analysis',
      type: ReportTemplateType.TASK_ANALYSIS,
      name: '任务分析报表',
      description: '展示任务分布、完成趋势和瓶颈分析',
      version: '1.0.0',
      variables: [
        {
          key: 'totalTasks',
          label: '总任务数',
          type: 'number',
          required: true,
          description: '统计周期内的总任务数',
        },
        {
          key: 'taskDistribution',
          label: '任务分布',
          type: 'object',
          required: true,
          description: '按状态、优先级分布的任务数据',
        },
        {
          key: 'trends',
          label: '趋势数据',
          type: 'array',
          required: false,
          description: '任务完成趋势',
        },
      ],
      sections: [
        {
          id: 'summary',
          title: '任务概览',
          template: `本期共处理 **{{totalTasks}}** 个任务：

- ✅ 已完成: **{{completedTasks}}** ({{completionRate}}%)
- 🔄 进行中: **{{inProgressTasks}}** ({{inProgressRate}}%)
- ⏳ 待处理: **{{pendingTasks}}** ({{pendingRate}}%)
- ❌ 已取消: **{{cancelledTasks}}** ({{cancellationRate}}%)

平均完成时间: **{{avgCompletionTime}}** 小时`,
          order: 1,
          required: true,
        },
        {
          id: 'priority',
          title: '优先级分布',
          template: `按优先级统计：

- 🔴 高优先级: **{{highPriority}}** 个 (完成率 {{highPriorityCompletion}}%)
- 🟡 中优先级: **{{mediumPriority}}** 个 (完成率 {{mediumPriorityCompletion}}%)
- 🟢 低优先级: **{{lowPriority}}** 个 (完成率 {{lowPriorityCompletion}}%)`,
          order: 2,
          required: true,
        },
        {
          id: 'bottlenecks',
          title: '瓶颈分析',
          template: `{{#if bottlenecks}}
识别到以下瓶颈：

{{#each bottlenecks}}
- **{{stage}}**: 平均耗时 {{avgTime}} 小时
  影响任务数: {{affectedTasks}}
  建议: {{recommendation}}
{{/each}}
{{/if}}`,
          order: 3,
          required: false,
        },
      ],
      supportedLanguages: [ReportLanguage.ZH_CN, ReportLanguage.EN_US],
      supportedTones: [ReportTone.FORMAL, ReportTone.TECHNICAL],
      metadata: {
        author: 'System',
        createdAt: '2025-04-03T00:00:00Z',
        updatedAt: '2025-04-03T00:00:00Z',
        tags: ['task', 'analysis', 'bottleneck'],
      },
    }
  }

  private createAgentActivityTemplate(): ReportTemplate {
    return {
      id: 'tpl-agent-activity',
      type: ReportTemplateType.AGENT_ACTIVITY,
      name: '智能体活动报表',
      description: '展示智能体的工作情况、资源消耗和协作模式',
      version: '1.0.0',
      variables: [
        {
          key: 'agents',
          label: '智能体列表',
          type: 'array',
          required: true,
          description: '智能体活动数据',
        },
        {
          key: 'totalTokens',
          label: '总 Token 数',
          type: 'number',
          required: true,
          description: '总消耗的 token 数',
        },
      ],
      sections: [
        {
          id: 'overview',
          title: '智能体概览',
          template: `当前活跃智能体: **{{activeAgents}}** 个

本期统计：
- 总任务数: **{{totalTasks}}**
- 总 Token 消耗: **{{totalTokens}}**
- 平均响应时间: **{{avgResponseTime}}** ms
- 成功率: **{{successRate}}**%`,
          order: 1,
          required: true,
        },
        {
          id: 'provider-stats',
          title: '提供商统计',
          template: `按提供商统计：

{{#each providers}}
### {{name}}
- 活跃智能体: {{activeAgents}} 个
- 任务完成: {{tasksCompleted}} 个
- Token 消耗: {{tokensUsed}}
- 平均延迟: {{avgLatency}} ms
{{/each}}`,
          order: 2,
          required: true,
        },
      ],
      supportedLanguages: [ReportLanguage.ZH_CN, ReportLanguage.EN_US],
      supportedTones: [ReportTone.TECHNICAL, ReportTone.DETAILED],
      metadata: {
        author: 'System',
        createdAt: '2025-04-03T00:00:00Z',
        updatedAt: '2025-04-03T00:00:00Z',
        tags: ['agent', 'activity', 'ai'],
      },
    }
  }

  private createRevenueAnalysisTemplate(): ReportTemplate {
    return {
      id: 'tpl-revenue-analysis',
      type: ReportTemplateType.REVENUE_ANALYSIS,
      name: '收入分析报表',
      description: '展示收入来源、增长趋势和预测分析',
      version: '1.0.0',
      variables: [
        {
          key: 'totalRevenue',
          label: '总收入',
          type: 'number',
          required: true,
          description: '统计周期内的总收入',
        },
        {
          key: 'growthRate',
          label: '增长率',
          type: 'number',
          required: true,
          description: '同比增长率',
        },
      ],
      sections: [
        {
          id: 'summary',
          title: '收入概览',
          template: `本期总收入: **¥{{totalRevenue}}**

- 环比增长: **{{growthRate}}%**
- 同比增长: **{{yoyGrowth}}%**
- ARPU: **¥{{arpu}}**
- 付费转化率: **{{conversionRate}}**%`,
          order: 1,
          required: true,
        },
        {
          id: 'sources',
          title: '收入来源',
          template: `按来源统计：

{{#each sources}}
- **{{name}}**: ¥{{amount}} ({{percentage}}%)
  增长: {{growth}}%
{{/each}}`,
          order: 2,
          required: true,
        },
      ],
      supportedLanguages: [ReportLanguage.ZH_CN, ReportLanguage.EN_US],
      supportedTones: [ReportTone.FORMAL, ReportTone.DETAILED],
      metadata: {
        author: 'System',
        createdAt: '2025-04-03T00:00:00Z',
        updatedAt: '2025-04-03T00:00:00Z',
        tags: ['revenue', 'finance', 'growth'],
      },
    }
  }

  private createUserEngagementTemplate(): ReportTemplate {
    return {
      id: 'tpl-user-engagement',
      type: ReportTemplateType.USER_ENGAGEMENT,
      name: '用户参与度报表',
      description: '展示用户活跃度、留存率和参与行为分析',
      version: '1.0.0',
      variables: [
        {
          key: 'totalUsers',
          label: '总用户数',
          type: 'number',
          required: true,
          description: '平台总用户数',
        },
        {
          key: 'activeUsers',
          label: '活跃用户数',
          type: 'number',
          required: true,
          description: '统计周期内的活跃用户数',
        },
      ],
      sections: [
        {
          id: 'summary',
          title: '用户概览',
          template: `总用户数: **{{totalUsers}}**

本期活跃用户: **{{activeUsers}}** (活跃率 {{activeRate}}%)

- 新增用户: **{{newUsers}}**
- 流失用户: **{{churnedUsers}}**
- 净增: **{{netGrowth}}**
- 留存率: **{{retentionRate}}**%`,
          order: 1,
          required: true,
        },
        {
          id: 'engagement',
          title: '参与行为',
          template: `用户参与指标：

- 平均会话时长: **{{avgSessionDuration}}** 分钟
- 人均操作次数: **{{actionsPerUser}}**
- DAU/MAU: **{{dauMauRatio}}**
- 用户满意度: **{{satisfactionScore}}**/5`,
          order: 2,
          required: true,
        },
      ],
      supportedLanguages: [ReportLanguage.ZH_CN, ReportLanguage.EN_US],
      supportedTones: [ReportTone.FORMAL, ReportTone.CONCISE],
      metadata: {
        author: 'System',
        createdAt: '2025-04-03T00:00:00Z',
        updatedAt: '2025-04-03T00:00:00Z',
        tags: ['user', 'engagement', 'retention'],
      },
    }
  }
}

// 导出单例实例
export const templateEngine = new ReportTemplateEngine()
