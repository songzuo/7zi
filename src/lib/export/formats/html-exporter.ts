/**
 * @fileoverview HTML 导出器 - 生成可打印的 HTML 文档
 * @description 支持表格、样式、主题等 HTML 导出
 * @version 1.0.0
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * HTML 选项
 */
export interface HTMLOptions {
  /** 标题 */
  title?: string
  /** 副标题 */
  subtitle?: string
  /** 描述 */
  description?: string
  /** 主题 */
  theme?: 'light' | 'dark' | 'blue' | 'green' | 'red'
  /** 语言 */
  lang?: string
  /** 字符集 */
  charset?: string
  /** 是否包含打印样式 */
  includePrintStyles?: boolean
  /** 是否包含导出元数据 */
  includeMetadata?: boolean
  /** 自定义 CSS */
  customCSS?: string
  /** 响应式 */
  responsive?: boolean
}

/**
 * HTML 表格列配置
 */
export interface HTMLTableColumn {
  /** 字段键 */
  key: string
  /** 列标题 */
  label: string
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 列宽 */
  width?: string
  /** 是否显示 */
  visible?: boolean
}

/**
 * HTML 表格选项
 */
export interface HTMLTableOptions {
  /** 列配置 */
  columns: HTMLTableColumn[]
  /** 是否斑马纹 */
  zebra?: boolean
  /** 是否显示边框 */
  border?: boolean
  /** 表头样式 */
  headerStyle?: {
    backgroundColor?: string
    textColor?: string
    fontWeight?: string
  }
  /** 行样式 */
  rowStyle?: {
    hoverColor?: string
    selectedColor?: string
  }
  /** 是否支持排序 */
  sortable?: boolean
  /** 是否支持筛选 */
  filterable?: boolean
  /** 分页 */
  pagination?: {
    pageSize: number
    showInfo: boolean
  }
}

/**
 * HTML 导出结果
 */
export interface HTMLExportResult {
  success: boolean
  html?: string
  blob?: Blob
  filename?: string
  error?: string
  rowCount?: number
}

// ============================================================================
// 主题配置
// ============================================================================

const THEMES: Record<string, {
  colors: {
    primary: string
    secondary: string
    background: string
    text: string
    border: string
    tableHeader: string
    tableRow: string
    tableRowAlt: string
  }
}> = {
  light: {
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      background: '#ffffff',
      text: '#1e293b',
      border: '#e2e8f0',
      tableHeader: '#f8fafc',
      tableRow: '#ffffff',
      tableRowAlt: '#f8fafc',
    },
  },
  dark: {
    colors: {
      primary: '#3b82f6',
      secondary: '#94a3b8',
      background: '#0f172a',
      text: '#f1f5f9',
      border: '#334155',
      tableHeader: '#1e293b',
      tableRow: '#0f172a',
      tableRowAlt: '#1e293b',
    },
  },
  blue: {
    colors: {
      primary: '#2563eb',
      secondary: '#60a5fa',
      background: '#f0f9ff',
      text: '#0c4a6e',
      border: '#bae6fd',
      tableHeader: '#e0f2fe',
      tableRow: '#f0f9ff',
      tableRowAlt: '#e0f2fe',
    },
  },
  green: {
    colors: {
      primary: '#16a34a',
      secondary: '#4ade80',
      background: '#f0fdf4',
      text: '#14532d',
      border: '#bbf7d0',
      tableHeader: '#dcfce7',
      tableRow: '#f0fdf4',
      tableRowAlt: '#dcfce7',
    },
  },
  red: {
    colors: {
      primary: '#dc2626',
      secondary: '#f87171',
      background: '#fef2f2',
      text: '#7f1d1d',
      border: '#fecaca',
      tableHeader: '#fee2e2',
      tableRow: '#fef2f2',
      tableRowAlt: '#fee2e2',
    },
  },
}

// ============================================================================
// HTML 导出器类
// ============================================================================

/**
 * HTML 导出器
 */
export class HTMLExporter {
  private options: Required<HTMLOptions>

  constructor(options: HTMLOptions = {}) {
    this.options = {
      title: options.title || 'Exported Data',
      subtitle: options.subtitle || '',
      description: options.description || '',
      theme: options.theme || 'light',
      lang: options.lang || 'en',
      charset: options.charset || 'UTF-8',
      includePrintStyles: options.includePrintStyles ?? true,
      includeMetadata: options.includeMetadata ?? true,
      customCSS: options.customCSS || '',
      responsive: options.responsive ?? true,
    }
  }

  /**
   * 生成 HTML 文档
   */
  async export<T extends Record<string, unknown>>(
    data: T[],
    options: {
      filename: string
      columns: HTMLTableColumn[]
      title?: string
      subtitle?: string
      description?: string
      htmlOptions?: HTMLOptions
      tableOptions?: HTMLTableOptions
    }
  ): Promise<HTMLExportResult> {
    try {
      const mergedOptions = {
        ...this.options,
        ...options.htmlOptions,
      }

      const theme = THEMES[mergedOptions.theme] || THEMES.light

      // 生成 HTML 内容
      const html = this.generateHTML(data, {
        ...options,
        htmlOptions: mergedOptions,
        tableOptions: {
          ...options.tableOptions,
          columns: options.columns,
        },
        theme,
      })

      // 创建 Blob
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })

      return {
        success: true,
        html,
        blob,
        filename: options.filename || 'export.html',
        rowCount: data.length,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'HTML 导出失败',
      }
    }
  }

  /**
   * 生成 HTML 内容
   */
  private generateHTML<T extends Record<string, unknown>>(
    data: T[],
    options: {
      filename: string
      columns: HTMLTableColumn[]
      title?: string
      subtitle?: string
      description?: string
      htmlOptions: Required<HTMLOptions>
      tableOptions?: HTMLTableOptions
      theme: typeof THEMES[keyof typeof THEMES]
    }
  ): string {
    const {
      filename,
      columns,
      title,
      subtitle,
      description,
      htmlOptions,
      tableOptions,
      theme,
    } = options

    const visibleColumns = columns.filter(col => col.visible !== false)

    // 生成头部
    const head = this.generateHead(filename, htmlOptions, theme)

    // 生成样式
    const styles = this.generateStyles(htmlOptions, theme, tableOptions)

    // 生成主体
    const body = this.generateBody(data, {
      title: title || htmlOptions.title,
      subtitle: subtitle || htmlOptions.subtitle,
      description: description || htmlOptions.description,
      columns: visibleColumns,
      tableOptions,
      theme,
    })

    // 组装 HTML
    return `<!DOCTYPE html>
<html lang="${htmlOptions.lang}" dir="ltr">
${head}
${styles}
<body class="theme-${htmlOptions.theme}">
  ${body}
</body>
</html>`
  }

  /**
   * 生成 HTML 头部
   */
  private generateHead(
    filename: string,
    options: Required<HTMLOptions>,
    theme: typeof THEMES[keyof typeof THEMES]
  ): string {
    let head = `<head>
  <meta charset="${options.charset}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="7zi-frontend HTML Exporter">
  <title>${options.title}</title>`

    if (options.includeMetadata) {
      head += `
  <meta name="description" content="${options.description}">
  <meta name="export-date" content="${new Date().toISOString()}">
  <meta name="export-filename" content="${filename}">
  <meta name="theme" content="${options.theme}">`
    }

    head += `
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
</head>`

    return head
  }

  /**
   * 生成样式
   */
  private generateStyles(
    options: Required<HTMLOptions>,
    theme: typeof THEMES[keyof typeof THEMES],
    tableOptions?: HTMLTableOptions
  ): string {
    const { colors } = theme
    const customCSS = options.customCSS

    const styles = `<style>
  /* Base Styles */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: ${colors.text};
    background-color: ${colors.background};
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  /* Header */
  .header {
    text-align: center;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 2px solid ${colors.border};
  }

  .header h1 {
    font-size: 32px;
    font-weight: 700;
    color: ${colors.primary};
    margin-bottom: 10px;
  }

  .header h2 {
    font-size: 20px;
    font-weight: 500;
    color: ${colors.secondary};
    margin-bottom: 10px;
  }

  .header .description {
    font-size: 14px;
    color: ${colors.secondary};
    max-width: 800px;
    margin: 0 auto;
  }

  .header .metadata {
    margin-top: 15px;
    font-size: 12px;
    color: ${colors.secondary};
  }

  /* Table */
  .table-container {
    overflow-x: auto;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background-color: ${colors.tableRow};
  }

  thead {
    background-color: ${colors.tableHeader};
  }

  th {
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    color: ${colors.text};
    border-bottom: 2px solid ${colors.border};
    white-space: nowrap;
  }

  td {
    padding: 10px 16px;
    border-bottom: 1px solid ${colors.border};
    color: ${colors.text};
  }

  tbody tr:hover {
    background-color: ${tableOptions?.rowStyle?.hoverColor || theme.colors.tableRowAlt};
  }

  tbody tr:nth-child(even) {
    background-color: ${tableOptions?.zebra ? theme.colors.tableRowAlt : 'inherit'};
  }

  /* Responsive */
  ${options.responsive ? `@media (max-width: 768px) {
    .container {
      padding: 20px 10px;
    }

    .header h1 {
      font-size: 24px;
    }

    .header h2 {
      font-size: 16px;
    }

    th, td {
      padding: 8px 10px;
      font-size: 12px;
    }
  }` : ''}

  /* Print Styles */
  ${options.includePrintStyles ? `@media print {
    body {
      font-size: 10pt;
    }

    .container {
      padding: 0;
      max-width: none;
    }

    .header {
      border-bottom: 1px solid ${colors.border};
    }

    .table-container {
      box-shadow: none;
    }

    thead {
      background-color: ${colors.tableHeader} !important;
    }
  }` : ''}

  ${customCSS}
</style>`

    return styles
  }

  /**
   * 生成主体内容
   */
  private generateBody<T extends Record<string, unknown>>(
    data: T[],
    options: {
      title: string
      subtitle: string
      description: string
      columns: HTMLTableColumn[]
      tableOptions?: HTMLTableOptions
      theme: typeof THEMES[keyof typeof THEMES]
    }
  ): string {
    const { title, subtitle, description, columns, tableOptions, theme } = options
    const { colors } = theme

    let body = `<div class="container">
  <div class="header">
    <h1>${this.escapeHTML(title)}</h1>`

    if (subtitle) {
      body += `
    <h2>${this.escapeHTML(subtitle)}</h2>`
    }

    if (description) {
      body += `
    <p class="description">${this.escapeHTML(description)}</p>`
    }

    body += `
    <div class="metadata">
      <span>Exported: ${new Date().toLocaleString()}</span>
      ${data.length > 0 ? `<span> • Total Records: ${data.length}</span>` : ''}
    </div>
  </div>`

    // 生成表格
    if (data.length > 0 && columns.length > 0) {
      body += this.generateTable(data, columns, tableOptions, theme)
    } else {
      body += `
  <div style="text-align: center; padding: 60px 20px; color: ${colors.secondary};">
    <p style="font-size: 18px; margin-bottom: 10px;">No data available</p>
    <p style="font-size: 14px;">There are no records to display in this export.</p>
  </div>`
    }

    body += `
</div>`

    return body
  }

  /**
   * 生成表格
   */
  private generateTable<T extends Record<string, unknown>>(
    data: T[],
    columns: HTMLTableColumn[],
    tableOptions: HTMLTableOptions | undefined,
    theme: typeof THEMES[keyof typeof THEMES]
  ): string {
    const { colors } = theme

    let table = `
  <div class="table-container">
    <table>
      <thead>
        <tr>`

    // 表头
    columns.forEach(column => {
      const align = column.align || 'left'
      table += `
          <th style="text-align: ${align}; ${column.width ? `width: ${column.width};` : ''}">${this.escapeHTML(column.label)}</th>`
    })

    table += `
        </tr>
      </thead>
      <tbody>`

    // 数据行
    data.forEach(row => {
      table += `
        <tr>`

      columns.forEach(column => {
        const value = row[column.key]
        const align = column.align || 'left'
        const displayValue = this.formatCellValue(value)

        table += `
          <td style="text-align: ${align};">${displayValue}</td>`
      })

      table += `
        </tr>`
    })

    table += `
      </tbody>
    </table>
  </div>`

    return table
  }

  /**
   * 格式化单元格值
   */
  private formatCellValue(value: unknown): string {
    if (value === null || value === undefined) {
      return ''
    }

    if (typeof value === 'boolean') {
      return value ? '✓' : '✗'
    }

    if (value instanceof Date) {
      return value.toLocaleString()
    }

    if (typeof value === 'object') {
      return this.escapeHTML(JSON.stringify(value))
    }

    return this.escapeHTML(String(value))
  }

  /**
   * 转义 HTML
   */
  private escapeHTML(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return text.replace(/[&<>"']/g, char => map[char])
  }
}
