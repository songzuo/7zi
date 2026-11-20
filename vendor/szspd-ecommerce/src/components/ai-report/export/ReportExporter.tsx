/**
 * @fileoverview 报表导出功能
 * @description 支持 PDF/Excel/CSV/JSON 格式导出
 */

'use client'

import { useState, useCallback } from 'react'
import type { ExportFormat, ExportOptions, ReportConfig, ChartConfig } from '../types'

/**
 * 导出服务类
 */
export class ReportExporter {
  /**
   * 导出为 CSV
   */
  static toCSV(data: Record<string, unknown>[], filename: string): void {
    if (data.length === 0) return
    
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const value = row[h]
          if (value === null || value === undefined) return ''
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`
          }
          return String(value)
        }).join(',')
      )
    ].join('\n')
    
    downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;')
  }
  
  /**
   * 导出为 JSON
   */
  static toJSON(data: unknown, filename: string): void {
    const jsonContent = JSON.stringify(data, null, 2)
    downloadFile(jsonContent, `${filename}.json`, 'application/json')
  }
  
  /**
   * 导出为 Excel (简化版，实际需要 xlsx 库)
   */
  static toExcel(data: Record<string, unknown>[], filename: string): void {
    // 简化实现：使用 CSV 作为替代
    // 实际项目中应使用 xlsx 库
    this.toCSV(data, filename)
    console.warn('Excel 导出已降级为 CSV 格式，建议安装 xlsx 库')
  }
  
  /**
   * 导出为 PDF (简化版)
   */
  static async toPDF(
    config: ReportConfig,
    options: ExportOptions
  ): Promise<void> {
    // PDF 导出需要 html2pdf 或类似库
    // 这里提供简化实现
    console.log('PDF 导出选项:', options)
    
    // 创建临时容器用于打印
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error('无法打开打印窗口，请检查浏览器弹窗设置')
    }
    
    const htmlContent = generatePrintableHTML(config, options)
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    // 等待内容加载后打印
    printWindow.onload = () => {
      printWindow.print()
    }
  }
}

/**
 * 下载文件辅助函数
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 生成可打印的 HTML
 */
function generatePrintableHTML(
  config: ReportConfig,
  options: ExportOptions
): string {
  const { name, query, sql, chartConfig, result, createdAt } = config
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${options.title || name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px;
      color: #1a1a1a;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 20px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      color: #06b6d4;
    }
    .header p {
      color: #6b7280;
      margin: 5px 0;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 10px;
    }
    .query-box {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
    }
    .sql-box {
      background: #1f2937;
      color: #e5e7eb;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      white-space: pre-wrap;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 10px;
      text-align: left;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
    }
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${options.title || name}</h1>
    <p>生成时间: ${createdAt.toLocaleString('zh-CN')}</p>
    ${options.author ? `<p>作者: ${options.author}</p>` : ''}
  </div>
  
  <div class="section">
    <h2>📊 查询描述</h2>
    <div class="query-box">${query}</div>
  </div>
  
  ${options.includeSQL ? `
  <div class="section">
    <h2>🔍 SQL 查询</h2>
    <div class="sql-box">${sql.sql}</div>
    <p style="color: #6b7280; margin-top: 10px;">${sql.explanation}</p>
  </div>
  ` : ''}
  
  ${options.includeData ? `
  <div class="section">
    <h2>📈 数据结果</h2>
    <p>共 ${result.totalCount} 条记录</p>
    <table>
      <thead>
        <tr>
          ${result.fields.map(f => `<th>${f.name}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${result.data.slice(0, 100).map(row => `
          <tr>
            ${result.fields.map(f => `<td>${row[f.name] ?? '-'}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${result.data.length > 100 ? '<p style="color: #6b7280;">仅显示前 100 条记录</p>' : ''}
  </div>
  ` : ''}
  
  <div class="footer">
    <p>Generated by 7zi Studio AI Report Generator</p>
  </div>
</body>
</html>
  `
}

/**
 * 导出面板组件
 */
export function ExportPanel({
  onExport,
  disabled = false,
  className = ''
}: {
  onExport: (options: ExportOptions) => Promise<void>
  disabled?: boolean
  className?: string
}) {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [includeChart, setIncludeChart] = useState(true)
  const [includeData, setIncludeData] = useState(true)
  const [includeSQL, setIncludeSQL] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  
  const handleExport = async () => {
    setIsExporting(true)
    try {
      await onExport({
        format,
        includeChart,
        includeData,
        includeSQL
      })
    } finally {
      setIsExporting(false)
    }
  }
  
  const formatOptions: { value: ExportFormat; label: string; icon: string }[] = [
    { value: 'csv', label: 'CSV', icon: '📄' },
    { value: 'excel', label: 'Excel', icon: '📊' },
    { value: 'pdf', label: 'PDF', icon: '📑' },
    { value: 'json', label: 'JSON', icon: '{ }' }
  ]
  
  return (
    <div className={`rounded-xl bg-white p-6 shadow-lg dark:bg-zinc-800 ${className}`}>
      <h3 className="mb-4 text-lg font-bold text-zinc-900 dark:text-white">
        导出报表
      </h3>
      
      {/* 格式选择 */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          导出格式
        </label>
        <div className="flex flex-wrap gap-2">
          {formatOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFormat(opt.value)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                format === opt.value
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
              }`}
            >
              <span>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* 选项 */}
      <div className="mb-6 space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeData}
            onChange={e => setIncludeData(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">包含数据</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeSQL}
            onChange={e => setIncludeSQL(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">包含 SQL 语句</span>
        </label>
      </div>
      
      {/* 导出按钮 */}
      <button
        onClick={handleExport}
        disabled={disabled || isExporting}
        className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-3 font-medium text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isExporting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            导出中...
          </span>
        ) : (
          `导出 ${format.toUpperCase()}`
        )}
      </button>
    </div>
  )
}

/**
 * 导出 Hook
 */
export function useReportExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const exportReport = useCallback(async (
    config: ReportConfig,
    options: ExportOptions
  ) => {
    setIsExporting(true)
    setError(null)
    
    try {
      switch (options.format) {
        case 'csv':
          ReportExporter.toCSV(config.result.data, config.name)
          break
        case 'json':
          ReportExporter.toJSON({
            query: config.query,
            sql: config.sql,
            data: config.result.data
          }, config.name)
          break
        case 'excel':
          ReportExporter.toExcel(config.result.data, config.name)
          break
        case 'pdf':
          await ReportExporter.toPDF(config, options)
          break
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('导出失败')
      setError(error)
      throw error
    } finally {
      setIsExporting(false)
    }
  }, [])
  
  return {
    exportReport,
    isExporting,
    error
  }
}