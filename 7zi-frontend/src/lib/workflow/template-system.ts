/**
 * Workflow Template System
 *
 * 📋 模板系统核心
 * 版本: v1.12.2
 * 创建日期: 2026-04-04
 *
 * 提供预设模板和自定义模板管理功能
 */

import type { Node, Edge } from 'reactflow'

/**
 * 模板分类
 */
export type TemplateCategory =
  | 'customer-service'
  | 'data-processing'
  | 'automation'
  | 'approval'
  | 'collaboration'
  | 'custom'

/**
 * 模板接口
 */
export interface Template {
  id: string
  name: string
  description: string
  category: TemplateCategory
  workflow: {
    nodes: Node[]
    edges: Edge[]
  }
  tags: string[]
  usageCount: number
  createdAt: number
  isPreset?: boolean
}

/**
 * 模板管理器
 */
export class TemplateManager {
  private templates: Map<string, Template>
  private storageKey = 'workflow-templates'

  constructor() {
    this.templates = new Map()
    this.loadTemplates()
    this.initializePresetTemplates()
  }

  /**
   * 初始化预设模板
   */
  private initializePresetTemplates(): void {
    const presets = this.getPresetTemplates()
    presets.forEach(template => {
      if (!this.templates.has(template.id)) {
        this.templates.set(template.id, template)
      }
    })
    this.saveTemplates()
  }

  /**
   * 获取所有预设模板
   */
  private getPresetTemplates(): Template[] {
    return [
      // 1. AI 客服对话流程
      {
        id: 'preset-ai-customer-service',
        name: 'AI 客服对话流程',
        description: '智能客服工作流，支持自动回复和人工转接',
        category: 'customer-service',
        tags: ['AI', '客服', '对话', '自动化'],
        usageCount: 0,
        createdAt: Date.now(),
        isPreset: true,
        workflow: {
          nodes: [
            {
              id: 'start',
              type: 'start',
              position: { x: 100, y: 100 },
              data: { label: '开始' },
            },
            {
              id: 'ai-reply',
              type: 'task',
              position: { x: 300, y: 100 },
              data: {
                label: 'AI 回复',
                description: '使用 AI 模型生成回复',
                config: {
                  model: 'gpt-4',
                  temperature: 0.7,
                },
              },
            },
            {
              id: 'check-resolved',
              type: 'condition',
              position: { x: 500, y: 100 },
              data: {
                label: '是否解决?',
                description: '检查用户是否满意',
                conditions: [
                  { label: '已解决', value: 'resolved' },
                  { label: '未解决', value: 'unresolved' },
                ],
              },
            },
            {
              id: 'end',
              type: 'end',
              position: { x: 700, y: 50 },
              data: { label: '结束' },
            },
            {
              id: 'human-handoff',
              type: 'task',
              position: { x: 700, y: 200 },
              data: {
                label: '转人工',
                description: '转接给人工客服',
                config: {
                  queue: 'customer-service',
                  priority: 'high',
                },
              },
            },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'ai-reply' },
            { id: 'e2', source: 'ai-reply', target: 'check-resolved' },
            {
              id: 'e3',
              source: 'check-resolved',
              target: 'end',
              label: '已解决',
              type: 'conditional',
            },
            {
              id: 'e4',
              source: 'check-resolved',
              target: 'human-handoff',
              label: '未解决',
              type: 'conditional',
            },
          ],
        },
      },

      // 2. 数据处理流水线
      {
        id: 'preset-data-pipeline',
        name: '数据处理流水线',
        description: '并行处理多个数据源，汇总结果',
        category: 'data-processing',
        tags: ['数据', 'ETL', '并行', '汇总'],
        usageCount: 0,
        createdAt: Date.now(),
        isPreset: true,
        workflow: {
          nodes: [
            {
              id: 'start',
              type: 'start',
              position: { x: 50, y: 150 },
              data: { label: '开始' },
            },
            {
              id: 'data-source-1',
              type: 'task',
              position: { x: 200, y: 50 },
              data: {
                label: '数据源 1',
                description: '从数据库读取数据',
                config: {
                  source: 'database',
                  query: 'SELECT * FROM users',
                },
              },
            },
            {
              id: 'data-source-2',
              type: 'task',
              position: { x: 200, y: 150 },
              data: {
                label: '数据源 2',
                description: '从 API 获取数据',
                config: {
                  source: 'api',
                  endpoint: '/api/data',
                },
              },
            },
            {
              id: 'data-source-3',
              type: 'task',
              position: { x: 200, y: 250 },
              data: {
                label: '数据源 3',
                description: '从文件读取数据',
                config: {
                  source: 'file',
                  path: '/data/input.csv',
                },
              },
            },
            {
              id: 'process-data',
              type: 'task',
              position: { x: 400, y: 150 },
              data: {
                label: '数据处理',
                description: '清洗、转换、验证数据',
                config: {
                  operations: ['clean', 'transform', 'validate'],
                },
              },
            },
            {
              id: 'aggregate-data',
              type: 'task',
              position: { x: 600, y: 150 },
              data: {
                label: '数据汇总',
                description: '合并所有数据源结果',
                config: {
                  strategy: 'merge',
                  deduplicate: true,
                },
              },
            },
            {
              id: 'end',
              type: 'end',
              position: { x: 800, y: 150 },
              data: { label: '结束' },
            },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'data-source-1' },
            { id: 'e2', source: 'start', target: 'data-source-2' },
            { id: 'e3', source: 'start', target: 'data-source-3' },
            { id: 'e4', source: 'data-source-1', target: 'process-data' },
            { id: 'e5', source: 'data-source-2', target: 'process-data' },
            { id: 'e6', source: 'data-source-3', target: 'process-data' },
            { id: 'e7', source: 'process-data', target: 'aggregate-data' },
            { id: 'e8', source: 'aggregate-data', target: 'end' },
          ],
        },
      },

      // 3. 定时任务调度
      {
        id: 'preset-scheduled-task',
        name: '定时任务调度',
        description: '按计划执行任务，支持重复执行',
        category: 'automation',
        tags: ['定时', '调度', '自动化', 'Cron'],
        usageCount: 0,
        createdAt: Date.now(),
        isPreset: true,
        workflow: {
          nodes: [
            {
              id: 'start',
              type: 'start',
              position: { x: 50, y: 100 },
              data: { label: '开始' },
            },
            {
              id: 'timer',
              type: 'wait',
              position: { x: 200, y: 100 },
              data: {
                label: '定时器',
                description: '等待到指定时间',
                config: {
                  cron: '0 9 * * *', // 每天 9:00
                  timezone: 'Asia/Shanghai',
                },
              },
            },
            {
              id: 'execute-task',
              type: 'task',
              position: { x: 400, y: 100 },
              data: {
                label: '执行任务',
                description: '执行预定任务',
                config: {
                  task: 'daily-report',
                  params: {},
                },
              },
            },
            {
              id: 'check-repeat',
              type: 'condition',
              position: { x: 600, y: 100 },
              data: {
                label: '是否重复?',
                description: '检查是否需要重复执行',
                conditions: [
                  { label: '是', value: 'yes' },
                  { label: '否', value: 'no' },
                ],
              },
            },
            {
              id: 'end',
              type: 'end',
              position: { x: 800, y: 50 },
              data: { label: '结束' },
            },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'timer' },
            { id: 'e2', source: 'timer', target: 'execute-task' },
            { id: 'e3', source: 'execute-task', target: 'check-repeat' },
            {
              id: 'e4',
              source: 'check-repeat',
              target: 'timer',
              label: '是',
              type: 'conditional',
            },
            {
              id: 'e5',
              source: 'check-repeat',
              target: 'end',
              label: '否',
              type: 'conditional',
            },
          ],
        },
      },

      // 4. 人工审批流程
      {
        id: 'preset-approval-flow',
        name: '人工审批流程',
        description: '提交申请、等待审批、根据结果处理',
        category: 'approval',
        tags: ['审批', '工作流', '人工', '流程'],
        usageCount: 0,
        createdAt: Date.now(),
        isPreset: true,
        workflow: {
          nodes: [
            {
              id: 'start',
              type: 'start',
              position: { x: 50, y: 100 },
              data: { label: '开始' },
            },
            {
              id: 'submit-request',
              type: 'task',
              position: { x: 200, y: 100 },
              data: {
                label: '提交申请',
                description: '用户提交审批申请',
                config: {
                  form: 'approval-form',
                  requiredFields: ['reason', 'amount'],
                },
              },
            },
            {
              id: 'wait-approval',
              type: 'wait',
              position: { x: 400, y: 100 },
              data: {
                label: '等待审批',
                description: '等待审批人处理',
                config: {
                  timeout: 86400, // 24小时
                  approvers: ['manager', 'director'],
                },
              },
            },
            {
              id: 'check-approved',
              type: 'condition',
              position: { x: 600, y: 100 },
              data: {
                label: '是否通过?',
                description: '检查审批结果',
                conditions: [
                  { label: '通过', value: 'approved' },
                  { label: '拒绝', value: 'rejected' },
                ],
              },
            },
            {
              id: 'end-approved',
              type: 'end',
              position: { x: 800, y: 50 },
              data: { label: '结束（通过）' },
            },
            {
              id: 'request-modification',
              type: 'task',
              position: { x: 800, y: 200 },
              data: {
                label: '返回修改',
                description: '通知用户修改申请',
                config: {
                  notify: true,
                  reason: '需要补充信息',
                },
              },
            },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'submit-request' },
            { id: 'e2', source: 'submit-request', target: 'wait-approval' },
            { id: 'e3', source: 'wait-approval', target: 'check-approved' },
            {
              id: 'e4',
              source: 'check-approved',
              target: 'end-approved',
              label: '通过',
              type: 'conditional',
            },
            {
              id: 'e5',
              source: 'check-approved',
              target: 'request-modification',
              label: '拒绝',
              type: 'conditional',
            },
          ],
        },
      },

      // 5. 多 Agent 协作任务
      {
        id: 'preset-multi-agent',
        name: '多 Agent 协作任务',
        description: '多个 AI Agent 并行工作，汇总结果',
        category: 'collaboration',
        tags: ['Agent', '协作', '并行', 'AI'],
        usageCount: 0,
        createdAt: Date.now(),
        isPreset: true,
        workflow: {
          nodes: [
            {
              id: 'start',
              type: 'start',
              position: { x: 50, y: 150 },
              data: { label: '开始' },
            },
            {
              id: 'agent-1',
              type: 'task',
              position: { x: 200, y: 50 },
              data: {
                label: 'Agent 1',
                description: '研究分析',
                config: {
                  agent: 'researcher',
                  task: 'analyze-market',
                },
              },
            },
            {
              id: 'agent-2',
              type: 'task',
              position: { x: 200, y: 150 },
              data: {
                label: 'Agent 2',
                description: '数据收集',
                config: {
                  agent: 'collector',
                  task: 'gather-data',
                },
              },
            },
            {
              id: 'agent-3',
              type: 'task',
              position: { x: 200, y: 250 },
              data: {
                label: 'Agent 3',
                description: '报告生成',
                config: {
                  agent: 'writer',
                  task: 'draft-report',
                },
              },
            },
            {
              id: 'aggregate-results',
              type: 'task',
              position: { x: 400, y: 150 },
              data: {
                label: '结果汇总',
                description: '合并所有 Agent 的结果',
                config: {
                  strategy: 'merge',
                  format: 'markdown',
                },
              },
            },
            {
              id: 'end',
              type: 'end',
              position: { x: 600, y: 150 },
              data: { label: '结束' },
            },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'agent-1' },
            { id: 'e2', source: 'start', target: 'agent-2' },
            { id: 'e3', source: 'start', target: 'agent-3' },
            { id: 'e4', source: 'agent-1', target: 'aggregate-results' },
            { id: 'e5', source: 'agent-2', target: 'aggregate-results' },
            { id: 'e6', source: 'agent-3', target: 'aggregate-results' },
            { id: 'e7', source: 'aggregate-results', target: 'end' },
          ],
        },
      },
    ]
  }

  /**
   * 从 localStorage 加载模板
   */
  private loadTemplates(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const templates = JSON.parse(stored) as Template[]
        templates.forEach(template => {
          this.templates.set(template.id, template)
        })
      }
    } catch (error) {
      console.error('[TemplateManager] 加载模板失败:', error)
    }
  }

  /**
   * 保存模板到 localStorage
   */
  private saveTemplates(): void {
    try {
      const templates = Array.from(this.templates.values())
      localStorage.setItem(this.storageKey, JSON.stringify(templates))
    } catch (error) {
      console.error('[TemplateManager] 保存模板失败:', error)
    }
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): Template[] {
    return Array.from(this.templates.values())
  }

  /**
   * 根据分类获取模板
   */
  getTemplatesByCategory(category: TemplateCategory): Template[] {
    return this.getAllTemplates().filter(t => t.category === category)
  }

  /**
   * 根据标签搜索模板
   */
  searchTemplates(query: string): Template[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllTemplates().filter(
      t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  /**
   * 根据 ID 获取模板
   */
  getTemplateById(id: string): Template | undefined {
    return this.templates.get(id)
  }

  /**
   * 创建自定义模板
   */
  createTemplate(template: Omit<Template, 'id' | 'createdAt' | 'usageCount'>): Template {
    const newTemplate: Template = {
      ...template,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      usageCount: 0,
      isPreset: false,
    }
    this.templates.set(newTemplate.id, newTemplate)
    this.saveTemplates()
    return newTemplate
  }

  /**
   * 更新模板
   */
  updateTemplate(id: string, updates: Partial<Template>): Template | undefined {
    const template = this.templates.get(id)
    if (!template) return undefined

    // 不允许修改预设模板的核心属性
    if (template.isPreset) {
      const allowedUpdates: (keyof Template)[] = ['usageCount']
      const hasInvalidUpdate = Object.keys(updates).some(
        key => !allowedUpdates.includes(key as keyof Template)
      )
      if (hasInvalidUpdate) {
        console.warn('[TemplateManager] 不允许修改预设模板')
        return template
      }
    }

    const updated = { ...template, ...updates }
    this.templates.set(id, updated)
    this.saveTemplates()
    return updated
  }

  /**
   * 删除模板
   */
  deleteTemplate(id: string): boolean {
    const template = this.templates.get(id)
    if (!template) return false

    // 不允许删除预设模板
    if (template.isPreset) {
      console.warn('[TemplateManager] 不允许删除预设模板')
      return false
    }

    this.templates.delete(id)
    this.saveTemplates()
    return true
  }

  /**
   * 增加模板使用次数
   */
  incrementUsage(id: string): void {
    const template = this.templates.get(id)
    if (template) {
      template.usageCount++
      this.saveTemplates()
    }
  }

  /**
   * 获取热门模板（按使用次数排序）
   */
  getPopularTemplates(limit = 5): Template[] {
    return this.getAllTemplates()
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
  }

  /**
   * 获取最近创建的模板
   */
  getRecentTemplates(limit = 5): Template[] {
    return this.getAllTemplates()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
  }
}

// 导出单例实例
export const templateManager = new TemplateManager()