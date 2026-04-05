/**
 * Reports API
 * 报表 API 路由
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  ReportDataAggregator,
  createTimeRange,
  TimeRange,
} from '@/lib/reporting/data-aggregator'
import {
  ReportGenerator,
  ReportType,
  ReportOptions,
} from '@/lib/reporting/report-generator'
import {
  NLGProcessor,
  ToneStyle,
  Language,
} from '@/lib/reporting/nlg-processor'

/**
 * 报表生成请求体
 */
interface GenerateReportRequest {
  type: ReportType
  title?: string
  description?: string
  timeRange: TimeRange
  sources?: string[]
  options?: ReportOptions
  nlgOptions?: {
    tone?: ToneStyle
    language?: Language
    includeNLG?: boolean
  }
}

/**
 * 初始化聚合器和生成器
 */
let aggregator: ReportDataAggregator
let reportGenerator: ReportGenerator

function getAggregator(): ReportDataAggregator {
  if (!aggregator) {
    aggregator = new ReportDataAggregator({
      dataSources: [],
      cache: {
        enabled: true,
        ttl: 5 * 60 * 1000,
        maxSize: 100,
      },
    })
  }
  return aggregator
}

function getReportGenerator(): ReportGenerator {
  if (!reportGenerator) {
    reportGenerator = new ReportGenerator()
  }
  return reportGenerator
}

/**
 * POST /api/reports/generate
 * 生成报表
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateReportRequest = await request.json()

    const {
      type,
      title,
      description,
      timeRange,
      sources = ['user-activity'],
      options = {},
      nlgOptions = {},
    } = body

    // 验证报表类型
    const validTypes: ReportType[] = ['summary', 'detailed', 'trend', 'comparison', 'analytics', 'export']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid report type. Valid types: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // 验证时间范围
    const validTimeRanges: TimeRange[] = ['day', 'week', 'month', 'year', 'custom']
    if (!validTimeRanges.includes(timeRange)) {
      return NextResponse.json(
        { error: `Invalid time range. Valid ranges: ${validTimeRanges.join(', ')}` },
        { status: 400 }
      )
    }

    // 创建时间范围配置
    const timeRangeConfig = createTimeRange(timeRange)

    // 获取聚合器
    const agg = getAggregator()

    // 添加示例数据源（如果没有）
    if (agg.getDataSources().length === 0) {
      // 添加默认数据源
      const { UserActivityDataSource, PerformanceDataSource } = await import('@/lib/reporting/data-aggregator')
      agg.addDataSource(new UserActivityDataSource())
      agg.addDataSource(new PerformanceDataSource())
    }

    // 聚合数据
    const aggregatedData = await agg.aggregateMultiple(sources, timeRangeConfig)

    // 创建默认标题
    const reportTitle = title || `${type} Report - ${timeRange}`
    const reportDescription = description || `${type} report for ${timeRange}`

    // 生成报表
    const generator = getReportGenerator()
    const report = generator.generate({
      type,
      title: reportTitle,
      description: reportDescription,
      data: aggregatedData,
      options,
    })

    // 生成自然语言描述
    let nlgText = null
    if (nlgOptions.includeNLG !== false) {
      const nlgProcessor = new NLGProcessor({
        tone: nlgOptions.tone || 'formal',
        language: nlgOptions.language || 'zh',
        includeNumbers: true,
        includePercentages: true,
        includeTrends: true,
      })

      // 使用第一个数据源的指标
      const firstSource = Object.values(aggregatedData)[0]
      if (firstSource) {
        nlgText = nlgProcessor.generateReport(firstSource)
      }
    }

    return NextResponse.json({
      success: true,
      report,
      nlg: nlgText,
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reports/templates
 * 获取模板列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') as ReportType | null

    const generator = getReportGenerator()
    const templates = generator.getTemplates()

    // 过滤特定类型
    const validTypes: ReportType[] = ['summary', 'detailed', 'trend', 'comparison', 'analytics', 'export']
    const filteredTemplates = type && validTypes.includes(type)
      ? templates.filter(t => t.type === type)
      : templates

    // 返回模板列表和元数据
    return NextResponse.json({
      success: true,
      templates: filteredTemplates.map(t => ({
        type: t.type,
        variables: t.variables,
        description: getTemplateDescription(t.type),
      })),
      metadata: {
        total: filteredTemplates.length,
        types: validTypes,
      },
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch templates',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * 获取模板描述
 */
function getTemplateDescription(type: ReportType): string {
  const descriptions: Record<ReportType, { zh: string; en: string; ja: string }> = {
    summary: {
      zh: '汇总报表 - 提供关键指标的快速概览',
      en: 'Summary Report - Provides quick overview of key metrics',
      ja: 'サマリーレポート - 主要指標のクイックオーバービューを提供',
    },
    detailed: {
      zh: '详细报表 - 包含完整的指标数据和深度分析',
      en: 'Detailed Report - Contains complete metric data and in-depth analysis',
      ja: '詳細レポート - 完全な指標データと詳細な分析を含む',
    },
    trend: {
      zh: '趋势报表 - 展示指标随时间的变化趋势',
      en: 'Trend Report - Shows trends of metrics over time',
      ja: 'トレンドレポート - 指標の時間経過による変化を表示',
    },
    comparison: {
      zh: '对比报表 - 比较不同数据源或时间段的指标',
      en: 'Comparison Report - Compare metrics across different data sources or time periods',
      ja: '比較レポート - 異なるデータソースや期間の指標を比較',
    },
    analytics: {
      zh: '分析报表 - 提供数据分析和洞察建议',
      en: 'Analytics Report - Provides data analysis and insights',
      ja: '分析レポート - データ分析と洞察を提供',
    },
    export: {
      zh: '导出报表 - 适合导出和数据交换的格式',
      en: 'Export Report - Format suitable for export and data exchange',
      ja: 'エクスポートレポート - エクスポートとデータ交換に適した形式',
    },
  }
  return descriptions[type].zh
}
