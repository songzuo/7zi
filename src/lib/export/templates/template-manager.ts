/**
 * @fileoverview 导出模板系统 - 支持自定义导出模板
 * @description 使用 Handlebars 模板引擎支持自定义导出格式
 * @version 1.0.0
 */

import Handlebars from 'handlebars'
import { PDFExporter, PDFOptions, PDFTableOptions } from '../formats/pdf-exporter'
import { HTMLExporter, HTMLOptions, HTMLTableOptions } from '../formats/html-exporter'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 模板类型
 */
export type TemplateType = 'pdf' | 'html' | 'csv' | 'json' | 'xlsx'

/**
 * 模板变量
 */
export interface TemplateVariables {
  /** 数据 */
  data: Record<string, unknown>[]
  /** 标题 */
  title?: string
  /** 副标题 */
  subtitle?: string
  /** 描述 */
  description?: string
  /** 导出日期 */
  exportDate?: string
  /** 总记录数 */
  totalCount?: number
  /** 自定义变量 */
  [key: string]: unknown
}

/**
 * 模板配置
 */
export interface TemplateConfig {
  /** 模板 ID */
  id: string
  /** 模板名称 */
  name: string
  /** 模板类型 */
  type: TemplateType
  /** 模板内容 */
  content: string
  /** 模板描述 */
  description?: string
  /** PDF 选项 */
  pdfOptions?: PDFOptions
  /** HTML 选项 */
  htmlOptions?: HTMLOptions
  /** 创建时间 */
  createdAt?: string
  /** 更新时间 */
  updatedAt?: string
  /** 创建者 */
  createdBy?: string
  /** 是否为默认模板 */
  isDefault?: boolean
  /** 标签 */
  tags?: string[]
}

/**
 * 预设模板
 */
export interface PresetTemplate {
  id: string
  name: string
  type: TemplateType
  description: string
  content: string
  options?: {
    pdf?: PDFOptions
    html?: HTMLOptions
  }
}

// ============================================================================
// 预设模板
// ============================================================================

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'pdf-simple',
    name: 'PDF - Simple Table',
    type: 'pdf',
    description: 'Simple PDF table export with minimal styling',
    content: '{{{table}}}',
    options: {
      pdf: {
        orientation: 'portrait',
        format: 'a4',
        fontSize: 10,
        showPageNumber: true,
      },
    },
  },
  {
    id: 'pdf-landscape',
    name: 'PDF - Landscape Table',
    type: 'pdf',
    description: 'PDF table in landscape orientation for wide tables',
    content: '{{{table}}}',
    options: {
      pdf: {
        orientation: 'landscape',
        format: 'a4',
        fontSize: 9,
        showPageNumber: true,
      },
    },
  },
  {
    id: 'pdf-a3',
    name: 'PDF - A3 Large Table',
    type: 'pdf',
    description: 'PDF table on A3 paper for large tables',
    content: '{{{table}}}',
    options: {
      pdf: {
        orientation: 'portrait',
        format: 'a3',
        fontSize: 10,
        showPageNumber: true,
      },
    },
  },
  {
    id: 'html-light',
    name: 'HTML - Light Theme',
    type: 'html',
    description: 'HTML export with light theme',
    content: '{{{content}}}',
    options: {
      html: {
        theme: 'light',
        includePrintStyles: true,
        responsive: true,
      },
    },
  },
  {
    id: 'html-dark',
    name: 'HTML - Dark Theme',
    type: 'html',
    description: 'HTML export with dark theme',
    content: '{{{content}}}',
    options: {
      html: {
        theme: 'dark',
        includePrintStyles: true,
        responsive: true,
      },
    },
  },
  {
    id: 'html-blue',
    name: 'HTML - Blue Theme',
    type: 'html',
    description: 'HTML export with blue theme',
    content: '{{{content}}}',
    options: {
      html: {
        theme: 'blue',
        includePrintStyles: true,
        responsive: true,
      },
    },
  },
]

// ============================================================================
// 模板管理器类
// ============================================================================

/**
 * 模板管理器
 */
export class TemplateManager {
  private templates: Map<string, TemplateConfig> = new Map()
  private pdfExporter: PDFExporter
  private htmlExporter: HTMLExporter

  constructor() {
    this.pdfExporter = new PDFExporter()
    this.htmlExporter = new HTMLExporter()
    this.init()
  }

  /**
   * 初始化模板管理器
   */
  private init(): void {
    // 加载预设模板
    PRESET_TEMPLATES.forEach(preset => {
      this.templates.set(preset.id, {
        ...preset,
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    })
  }

  /**
   * 获取所有模板
   */
  getTemplates(): TemplateConfig[] {
    return Array.from(this.templates.values())
  }

  /**
   * 根据类型获取模板
   */
  getTemplatesByType(type: TemplateType): TemplateConfig[] {
    return this.getTemplates().filter(template => template.type === type)
  }

  /**
   * 获取默认模板
   */
  getDefaultTemplate(type: TemplateType): TemplateConfig | undefined {
    return this.getTemplatesByType(type).find(t => t.isDefault)
  }

  /**
   * 根据ID获取模板
   */
  getTemplate(id: string): TemplateConfig | undefined {
    return this.templates.get(id)
  }

  /**
   * 创建模板
   */
  createTemplate(template: Omit<TemplateConfig, 'id' | 'createdAt' | 'updatedAt'>): TemplateConfig {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const newTemplate: TemplateConfig = {
      ...template,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.templates.set(id, newTemplate)
    return newTemplate
  }

  /**
   * 更新模板
   */
  updateTemplate(id: string, updates: Partial<TemplateConfig>): TemplateConfig | null {
    const template = this.templates.get(id)
    if (!template) {
      return null
    }

    const updatedTemplate: TemplateConfig = {
      ...template,
      ...updates,
      id: template.id, // 保持 ID 不变
      createdAt: template.createdAt, // 保持创建时间不变
      updatedAt: new Date().toISOString(),
    }

    this.templates.set(id, updatedTemplate)
    return updatedTemplate
  }

  /**
   * 删除模板
   */
  deleteTemplate(id: string): boolean {
    const template = this.templates.get(id)
    if (!template) {
      return false
    }

    // 不允许删除默认模板
    if (template.isDefault) {
      throw new Error('Cannot delete default templates')
    }

    return this.templates.delete(id)
  }

  /**
   * 复制模板
   */
  duplicateTemplate(id: string, newName?: string): TemplateConfig | null {
    const template = this.templates.get(id)
    if (!template) {
      return null
    }

    const newTemplate = this.createTemplate({
      ...template,
      name: newName || `${template.name} (Copy)`,
      isDefault: false,
    })

    return newTemplate
  }

  /**
   * 编译模板
   */
  compileTemplate(content: string): HandlebarsTemplateDelegate {
    return Handlebars.compile(content)
  }

  /**
   * 渲染模板
   */
  renderTemplate(templateId: string, variables: TemplateVariables): string {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const compiledTemplate = this.compileTemplate(template.content)

    // 添加默认变量
    const mergedVariables: TemplateVariables = {
      exportDate: new Date().toLocaleString(),
      totalCount: variables.data?.length || 0,
      ...variables,
    }

    return compiledTemplate(mergedVariables)
  }

  /**
   * 使用模板导出数据
   */
  async exportWithTemplate<T extends Record<string, unknown>>(
    templateId: string,
    data: T[],
    options: {
      filename: string
      title?: string
      subtitle?: string
      description?: string
      variables?: TemplateVariables
    }
  ): Promise<{
    success: boolean
    blob?: Blob
    filename?: string
    error?: string
  }> {
    try {
      const template = this.templates.get(templateId)
      if (!template) {
        throw new Error(`Template not found: ${templateId}`)
      }

      // 根据模板类型执行导出
      switch (template.type) {
        case 'pdf':
          return this.exportWithPDFTemplate(template, data, options)
        case 'html':
          return this.exportWithHTMLTemplate(template, data, options)
        default:
          throw new Error(`Unsupported template type: ${template.type}`)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      }
    }
  }

  /**
   * 使用 PDF 模板导出
   */
  private async exportWithPDFTemplate<T extends Record<string, unknown>>(
    template: TemplateConfig,
    data: T[],
    options: {
      filename: string
      title?: string
      subtitle?: string
      description?: string
      variables?: TemplateVariables
    }
  ): Promise<{
    success: boolean
    blob?: Blob
    filename?: string
    error?: string
  }> {
    // 需要从变量中获取列配置
    const columns = (options.variables?.columns as PDFTableOptions['columns']) || []

    const result = await this.pdfExporter.export(data, {
      filename: options.filename,
      columns,
      title: options.title || template.description,
      subtitle: options.subtitle,
      pdfOptions: template.pdfOptions,
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      }
    }

    return {
      success: true,
      blob: result.blob,
      filename: options.filename,
    }
  }

  /**
   * 使用 HTML 模板导出
   */
  private async exportWithHTMLTemplate<T extends Record<string, unknown>>(
    template: TemplateConfig,
    data: T[],
    options: {
      filename: string
      title?: string
      subtitle?: string
      description?: string
      variables?: TemplateVariables
    }
  ): Promise<{
    success: boolean
    blob?: Blob
    filename?: string
    error?: string
  }> {
    // 需要从变量中获取列配置
    const columns = (options.variables?.columns as HTMLTableOptions['columns']) || []

    const result = await this.htmlExporter.export(data, {
      filename: options.filename,
      columns,
      title: options.title || template.name,
      subtitle: options.subtitle,
      description: options.description,
      htmlOptions: template.htmlOptions,
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      }
    }

    return {
      success: true,
      blob: result.blob,
      filename: options.filename,
    }
  }

  /**
   * 验证模板
   */
  validateTemplate(template: TemplateConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 检查必填字段
    if (!template.name) {
      errors.push('Template name is required')
    }

    if (!template.type) {
      errors.push('Template type is required')
    }

    if (!template.content) {
      errors.push('Template content is required')
    }

    // 验证模板内容语法
    try {
      this.compileTemplate(template.content)
    } catch (error) {
      errors.push(`Template syntax error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 获取模板预览
   */
  async previewTemplate(
    templateId: string,
    sampleData: Record<string, unknown>[]
  ): Promise<{
    success: boolean
    preview?: string
    error?: string
  }> {
    try {
      const template = this.templates.get(templateId)
      if (!template) {
        throw new Error(`Template not found: ${templateId}`)
      }

      switch (template.type) {
        case 'html':
          const htmlResult = await this.htmlExporter.export(sampleData, {
            filename: 'preview.html',
            columns: [
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Name' },
              { key: 'value', label: 'Value' },
            ],
            htmlOptions: template.htmlOptions,
          })
          return {
            success: true,
            preview: htmlResult.html,
          }
        default:
          throw new Error(`Preview not supported for template type: ${template.type}`)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Preview failed',
      }
    }
  }
}
