/**
 * Report Generator - Main Entry
 * 报表生成器 - 主入口
 * 
 * @version 1.10.0
 * @created 2025-04-03
 * 
 * 功能：
 * - 协调模板引擎、数据聚合器、NLG处理器
 * - 提供统一的报表生成接口
 * - 支持自定义配置
 */

import { DatabaseConnection } from '@/lib/db/types'
import { logger } from '@/lib/logger'
import {
  ReportGenerateRequest,
  GeneratedReport,
  ReportTemplate,
  ReportTemplateType,
  ReportLanguage,
  ReportTone,
  AggregatedData,
  ReportGeneratorOptions,
} from './types'
import { ReportTemplateEngine } from './template-engine'
import { ReportDataAggregator } from './data-aggregator'
import { NLGProcessor } from './nlg-processor'

/**
 * 报表生成器默认选项
 */
const DEFAULT_OPTIONS: ReportGeneratorOptions = {
  enableCache: true,
  cacheTTL: 300,
  maxConcurrentAggregations: 5,
  defaultLanguage: ReportLanguage.ZH_CN,
  defaultTone: ReportTone.FORMAL,
  enableInsights: true,
  enableCharts: true,
}

/**
 * 报表生成器
 */
export class ReportGenerator {
  private options: ReportGeneratorOptions
  private templateEngine: ReportTemplateEngine
  private dataAggregator: ReportDataAggregator
  private nlgProcessor: NLGProcessor

  constructor(
    db: DatabaseConnection | null = null,
    options: Partial<ReportGeneratorOptions> = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    
    // 初始化组件
    this.templateEngine = new ReportTemplateEngine()
    this.dataAggregator = new ReportDataAggregator(db, {
      cacheEnabled: this.options.enableCache,
      cacheTTL: this.options.cacheTTL,
    })
    this.nlgProcessor = new NLGProcessor({
      defaultLanguage: this.options.defaultLanguage,
      defaultTone: this.options.defaultTone,
      enableInsightExtraction: this.options.enableInsights,
    })

    logger.info('[ReportGenerator] Initialized', {
      enableCache: this.options.enableCache,
      defaultLanguage: this.options.defaultLanguage,
    })
  }

  /**
   * 生成报表
   */
  async generate(request: ReportGenerateRequest): Promise<GeneratedReport> {
    const startTime = Date.now()
    logger.info('[ReportGenerator] Starting report generation', {
      templateId: request.templateId,
      templateType: request.templateType,
      timeRange: request.timeRange,
    })

    try {
      // 1. 确定模板类型
      const templateType = await this.resolveTemplateType(request)

      // 2. 聚合数据
      const data = await this.dataAggregator.aggregate({
        templateType,
        timeRange: request.timeRange,
        customRange: request.customRange,
        filters: request.filters,
      })

      // 3. 应用模板变量（如果有）
      if (request.templateId || request.templateType) {
        await this.applyTemplateVariables(data, request)
      }

      // 4. 生成报表
      const report = await this.nlgProcessor.generateReport(
        templateType,
        data,
        {
          language: request.language || this.options.defaultLanguage,
          tone: request.tone || this.options.defaultTone,
          includeInsights: request.options?.includeInsights ?? this.options.enableInsights,
          includeCharts: request.options?.includeCharts ?? this.options.enableCharts,
        }
      )

      logger.info('[ReportGenerator] Report generated successfully', {
        reportId: report.id,
        generationTimeMs: Date.now() - startTime,
      })

      return report
    } catch (error) {
      logger.error('[ReportGenerator] Failed to generate report', error)
      throw error
    }
  }

  /**
   * 生成自定义报表
   */
  async generateCustom(
    config: {
      title: string
      description?: string
      sections: Array<{
        title: string
        dataSource: string
        metrics: string[]
      }>
      timeRange: ReportGenerateRequest['timeRange']
      customRange?: ReportGenerateRequest['customRange']
      filters?: Record<string, unknown>
      language?: ReportLanguage
      tone?: ReportTone
    }
  ): Promise<GeneratedReport> {
    logger.info('[ReportGenerator] Generating custom report', { title: config.title })

    // 聚合自定义数据
    const data = await this.dataAggregator.aggregate({
      templateType: ReportTemplateType.CUSTOM,
      timeRange: config.timeRange,
      customRange: config.customRange,
      filters: config.filters,
    })

    // 生成报表
    const report = await this.nlgProcessor.generateReport(
      ReportTemplateType.CUSTOM,
      data,
      {
        language: config.language || this.options.defaultLanguage,
        tone: config.tone || this.options.defaultTone,
        includeInsights: this.options.enableInsights,
        includeCharts: this.options.enableCharts,
      }
    )

    // 自定义标题
    report.title = config.title

    return report
  }

  /**
   * 获取模板列表
   */
  getTemplates(): ReportTemplate[] {
    return this.templateEngine.getAllTemplates()
  }

  /**
   * 获取模板
   */
  getTemplate(templateId: string): ReportTemplate | undefined {
    return this.templateEngine.getTemplate(templateId)
  }

  /**
   * 获取支持的模板类型
   */
  getSupportedTemplateTypes(): ReportTemplateType[] {
    return this.templateEngine.getSupportedTypes()
  }

  /**
   * 注册自定义模板
   */
  registerTemplate(template: ReportTemplate): void {
    this.templateEngine.registerTemplate(template)
    logger.info('[ReportGenerator] Custom template registered', { templateId: template.id })
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.dataAggregator.clearCache()
    logger.info('[ReportGenerator] Cache cleared')
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; hits: number; entries: Array<{ key: string; hitCount: number }> } {
    return this.dataAggregator.getCacheStats()
  }

  /**
   * 解析模板类型
   */
  private async resolveTemplateType(request: ReportGenerateRequest): Promise<ReportTemplateType> {
    if (request.templateType) {
      return request.templateType
    }

    if (request.templateId) {
      const template = this.templateEngine.getTemplate(request.templateId)
      if (template) {
        return template.type
      }
    }

    return ReportTemplateType.CUSTOM
  }

  /**
   * 应用模板变量
   */
  private async applyTemplateVariables(
    data: AggregatedData,
    request: ReportGenerateRequest
  ): Promise<void> {
    if (!request.variables) {
      return
    }

    // 合并变量到 metrics
    const filteredVariables: Record<string, string | number | boolean> = {}
    for (const [key, value] of Object.entries(request.variables || {})) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        filteredVariables[key] = value
      }
    }
    data.metrics = {
      ...data.metrics,
      ...filteredVariables,
    }
  }
}

// 导出单例实例
export const reportGenerator = new ReportGenerator()

// 导出类型和组件
export * from './types'
export { ReportTemplateEngine } from './template-engine'
export { ReportDataAggregator } from './data-aggregator'
export { NLGProcessor } from './nlg-processor'