/**
 * NLG Processor
 * 自然语言生成器
 *
 * 将结构化数据转换为自然语言，支持多种语气风格和多语言
 */

import type { AggregatedData, AggregatedMetric } from './data-aggregator'

/**
 * 语气风格
 */
export type ToneStyle = 'formal' | 'concise' | 'detailed' | 'casual'

/**
 * 语言
 */
export type Language = 'zh' | 'en' | 'ja'

/**
 * NLG 配置
 */
export interface NLGConfig {
  tone: ToneStyle
  language: Language
  includeNumbers?: boolean
  includePercentages?: boolean
  includeTrends?: boolean
}

/**
 * 生成的文本
 */
export interface GeneratedText {
  text: string
  language: Language
  tone: ToneStyle
  metadata: {
    generatedAt: number
    dataPoints: number
  }
}

/**
 * 文本模板
 */
interface TextTemplate {
  [key: string]: {
    zh: string
    en: string
    ja: string
  }
}

/**
 * 语气风格配置
 */
const TONE_CONFIGS: Record<ToneStyle, { prefix: string; suffix: string; style: string }> = {
  formal: {
    prefix: '',
    suffix: '',
    style: 'formal',
  },
  concise: {
    prefix: '',
    suffix: '',
    style: 'concise',
  },
  detailed: {
    prefix: '',
    suffix: '',
    style: 'detailed',
  },
  casual: {
    prefix: '',
    suffix: '',
    style: 'casual',
  },
}

/**
 * 文本模板库
 */
const TEXT_TEMPLATES: TextTemplate = {
  summary: {
    zh: '根据数据分析，{summary}。{trends}。{recommendations}',
    en: 'Based on data analysis, {summary}. {trends}. {recommendations}',
    ja: 'データ分析によると、{summary}。{trends}。{recommendations}',
  },
  metric: {
    zh: '{name}为{value}，{change}。',
    en: '{name} is {value}, {change}.',
    ja: '{name}は{value}で、{change}。',
  },
  trend_up: {
    zh: '呈上升趋势',
    en: 'showing an upward trend',
    ja: '上昇傾向を示しています',
  },
  trend_down: {
    zh: '呈下降趋势',
    en: 'showing a downward trend',
    ja: '下降傾向を示しています',
  },
  trend_stable: {
    zh: '保持稳定',
    en: 'remains stable',
    ja: '安定しています',
  },
  positive_change: {
    zh: '增长{percent}%',
    en: 'increased by {percent}%',
    ja: '{percent}%増加',
  },
  negative_change: {
    zh: '下降{percent}%',
    en: 'decreased by {percent}%',
    ja: '{percent}%減少',
  },
  no_change: {
    zh: '无变化',
    en: 'no change',
    ja: '変化なし',
  },
  recommendation: {
    zh: '建议{action}。',
    en: 'Recommend {action}.',
    ja: '{action}をお勧めします。',
  },
}

/**
 * 自然语言生成器类
 */
export class NLGProcessor {
  private config: NLGConfig

  constructor(config: NLGConfig) {
    this.config = config
  }

  /**
   * 生成摘要文本
   */
  generateSummary(data: AggregatedData): GeneratedText {
    const summary = this.generateSummaryText(data)
    const trends = this.generateTrendText(data)
    const recommendations = this.generateRecommendationText(data)

    const template = TEXT_TEMPLATES.summary[this.config.language]
    const text = template
      .replace('{summary}', summary)
      .replace('{trends}', trends)
      .replace('{recommendations}', recommendations)

    return this.wrapResult(text, data.metrics.length)
  }

  /**
   * 生成指标描述
   */
  generateMetricDescription(metric: AggregatedMetric): GeneratedText {
    const template = TEXT_TEMPLATES.metric[this.config.language]
    const value = this.formatValue(metric.value)
    const change = this.formatChange(metric)

    const text = template
      .replace('{name}', metric.name)
      .replace('{value}', value)
      .replace('{change}', change)

    return this.wrapResult(text, 1)
  }

  /**
   * 生成完整报告文本
   */
  generateReport(data: AggregatedData): GeneratedText {
    const sections: string[] = []

    // 标题
    sections.push(this.generateTitle(data))

    // 摘要
    sections.push(this.generateSummaryText(data))

    // 详细指标
    if (this.config.tone === 'detailed') {
      sections.push(this.generateDetailedMetrics(data))
    }

    // 趋势分析
    if (this.config.includeTrends !== false) {
      sections.push(this.generateTrendText(data))
    }

    // 建议
    sections.push(this.generateRecommendationText(data))

    const text = sections.join('\n\n')
    return this.wrapResult(text, data.metrics.length)
  }

  /**
   * 生成标题
   */
  private generateTitle(data: AggregatedData): string {
    const titles = {
      zh: `📊 数据分析报告 (${data.timeRange.type})`,
      en: `📊 Data Analysis Report (${data.timeRange.type})`,
      ja: `📊 データ分析レポート (${data.timeRange.type})`,
    }
    return titles[this.config.language]
  }

  /**
   * 生成摘要文本
   */
  private generateSummaryText(data: AggregatedData): string {
    const summaries = {
      formal: {
        zh: `本次分析涵盖了${data.metrics.length}项关键指标，整体表现${this.getOverallTrend(data)}。`,
        en: `This analysis covers ${data.metrics.length} key metrics, with overall performance ${this.getOverallTrend(data)}.`,
        ja: `今回の分析では${data.metrics.length}の主要指標をカバーし、全体的なパフォーマンスは${this.getOverallTrend(data)}です。`,
      },
      concise: {
        zh: `${data.metrics.length}项指标${this.getOverallTrend(data)}。`,
        en: `${data.metrics.length} metrics ${this.getOverallTrend(data)}.`,
        ja: `${data.metrics.length}の指標は${this.getOverallTrend(data)}。`,
      },
      detailed: {
        zh: `本次分析共收集了${data.metrics.length}项关键指标数据，时间范围为${data.timeRange.type}。通过对各项指标的深入分析，我们发现整体表现${this.getOverallTrend(data)}。`,
        en: `This analysis collected ${data.metrics.length} key metrics over a ${data.timeRange.type} period. Through in-depth analysis of each metric, we found that overall performance is ${this.getOverallTrend(data)}.`,
        ja: `今回の分析では${data.metrics.length}の主要指標データを収集し、期間は${data.timeRange.type}です。各指標の詳細な分析を通じて、全体的なパフォーマンスは${this.getOverallTrend(data)}であることがわかりました。`,
      },
      casual: {
        zh: `看了${data.metrics.length}个指标，整体${this.getOverallTrend(data)}！`,
        en: `Checked ${data.metrics.length} metrics, overall ${this.getOverallTrend(data)}!`,
        ja: `${data.metrics.length}の指標を確認しましたが、全体的に${this.getOverallTrend(data)}！`,
      },
    }

    return summaries[this.config.tone][this.config.language]
  }

  /**
   * 生成趋势文本
   */
  private generateTrendText(data: AggregatedData): string {
    const trends = {
      formal: {
        zh: '趋势分析显示，各项指标变化符合预期。',
        en: 'Trend analysis shows that changes in metrics are as expected.',
        ja: 'トレンド分析によると、指標の変化は予想通りです。',
      },
      concise: {
        zh: '趋势正常。',
        en: 'Trends normal.',
        ja: 'トレンドは正常です。',
      },
      detailed: {
        zh: `趋势分析显示，${data.metrics.filter(m => m.trend === 'up').length}项指标呈上升趋势，${data.metrics.filter(m => m.trend === 'down').length}项指标呈下降趋势，${data.metrics.filter(m => m.trend === 'stable').length}项指标保持稳定。`,
        en: `Trend analysis shows that ${data.metrics.filter(m => m.trend === 'up').length} metrics are trending up, ${data.metrics.filter(m => m.trend === 'down').length} are trending down, and ${data.metrics.filter(m => m.trend === 'stable').length} remain stable.`,
        ja: `トレンド分析によると、${data.metrics.filter(m => m.trend === 'up').length}の指標が上昇傾向、${data.metrics.filter(m => m.trend === 'down').length}の指標が下降傾向、${data.metrics.filter(m => m.trend === 'stable').length}の指標が安定しています。`,
      },
      casual: {
        zh: '看起来趋势还不错！',
        en: 'Trends look pretty good!',
        ja: 'トレンドは悪くないですね！',
      },
    }

    return trends[this.config.tone][this.config.language]
  }

  /**
   * 生成建议文本
   */
  private generateRecommendationText(data: AggregatedData): string {
    const recommendations = {
      formal: {
        zh: '建议继续监控关键指标，定期进行数据分析。',
        en: 'Recommend continuing to monitor key metrics and conduct regular data analysis.',
        ja: '主要指標の監視を継続し、定期的なデータ分析を行うことをお勧めします。',
      },
      concise: {
        zh: '建议持续监控。',
        en: 'Recommend continuous monitoring.',
        ja: '継続的な監視をお勧めします。',
      },
      detailed: {
        zh: '基于当前数据分析，建议：1）持续监控关键指标变化；2）定期生成分析报告；3）及时发现并处理异常情况；4）优化数据收集和分析流程。',
        en: 'Based on current data analysis, recommend: 1) Continue monitoring changes in key metrics; 2) Generate analysis reports regularly; 3) Detect and handle anomalies promptly; 4) Optimize data collection and analysis processes.',
        ja: '現在のデータ分析に基づいて、以下をお勧めします：1）主要指標の変化を継続的に監視；2）定期的な分析レポートの生成；3）異常の適時の検出と処理；4）データ収集と分析プロセスの最適化。',
      },
      casual: {
        zh: '记得多看看数据哦！',
        en: 'Remember to check the data often!',
        ja: 'データをよく見てくださいね！',
      },
    }

    return recommendations[this.config.tone][this.config.language]
  }

  /**
   * 生成详细指标描述
   */
  private generateDetailedMetrics(data: AggregatedData): string {
    const descriptions = data.metrics.map(metric => this.generateMetricDescription(metric).text)
    return descriptions.join('\n')
  }

  /**
   * 格式化数值
   */
  private formatValue(value: number): string {
    if (!this.config.includeNumbers) {
      return 'N/A'
    }

    const locale = this.config.language === 'zh' ? 'zh-CN' : this.config.language === 'ja' ? 'ja-JP' : 'en-US'
    return value.toLocaleString(locale, {
      maximumFractionDigits: 2,
    })
  }

  /**
   * 格式化变化
   */
  private formatChange(metric: AggregatedMetric): string {
    if (!this.config.includeTrends || metric.trend === undefined) {
      return TEXT_TEMPLATES.no_change[this.config.language]
    }

    const trendText = TEXT_TEMPLATES[`trend_${metric.trend}` as keyof TextTemplate][this.config.language]

    if (!this.config.includePercentages || metric.changePercent === undefined) {
      return trendText
    }

    const percent = Math.abs(metric.changePercent * 100).toFixed(2)
    const changeText = metric.changePercent >= 0
      ? TEXT_TEMPLATES.positive_change[this.config.language].replace('{percent}', percent)
      : TEXT_TEMPLATES.negative_change[this.config.language].replace('{percent}', percent)

    return `${trendText}，${changeText}`
  }

  /**
   * 获取整体趋势
   */
  private getOverallTrend(data: AggregatedData): string {
    const upCount = data.metrics.filter(m => m.trend === 'up').length
    const downCount = data.metrics.filter(m => m.trend === 'down').length

    const trends = {
      zh: {
        up: '良好',
        down: '有待改善',
        stable: '稳定',
      },
      en: {
        up: 'good',
        down: 'needs improvement',
        stable: 'stable',
      },
      ja: {
        up: '良好',
        down: '改善が必要',
        stable: '安定',
      },
    }

    if (upCount > downCount) {
      return trends[this.config.language].up
    } else if (downCount > upCount) {
      return trends[this.config.language].down
    }
    return trends[this.config.language].stable
  }

  /**
   * 包装结果
   */
  private wrapResult(text: string, dataPoints: number): GeneratedText {
    return {
      text,
      language: this.config.language,
      tone: this.config.tone,
      metadata: {
        generatedAt: Date.now(),
        dataPoints,
      },
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<NLGConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取当前配置
   */
  getConfig(): NLGConfig {
    return { ...this.config }
  }
}

/**
 * 创建默认 NLG 处理器
 */
export function createNLGProcessor(language: Language = 'zh', tone: ToneStyle = 'formal'): NLGProcessor {
  return new NLGProcessor({
    tone,
    language,
    includeNumbers: true,
    includePercentages: true,
    includeTrends: true,
  })
}

/**
 * 批量生成多语言文本
 */
export function generateMultilingualText(
  data: AggregatedData,
  tone: ToneStyle = 'formal'
): Record<Language, GeneratedText> {
  const languages: Language[] = ['zh', 'en', 'ja']
  const results: Record<Language, GeneratedText> = {} as Record<Language, GeneratedText>

  for (const lang of languages) {
    const processor = createNLGProcessor(lang, tone)
    results[lang] = processor.generateReport(data)
  }

  return results
}

/**
 * 批量生成多语气文本
 */
export function generateMultiToneText(
  data: AggregatedData,
  language: Language = 'zh'
): Record<ToneStyle, GeneratedText> {
  const tones: ToneStyle[] = ['formal', 'concise', 'detailed', 'casual']
  const results: Record<ToneStyle, GeneratedText> = {} as Record<ToneStyle, GeneratedText>

  for (const tone of tones) {
    const processor = createNLGProcessor(language, tone)
    results[tone] = processor.generateReport(data)
  }

  return results
}