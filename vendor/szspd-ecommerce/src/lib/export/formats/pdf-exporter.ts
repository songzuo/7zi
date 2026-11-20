/**
 * @fileoverview PDF 导出器 - 使用 jsPDF 生成 PDF 文档
 * @description 支持表格、文本、样式等 PDF 导出
 * @version 1.0.0
 */

import jsPDF from 'jspdf'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * PDF 选项
 */
export interface PDFOptions {
  /** 页面方向 */
  orientation?: 'portrait' | 'landscape'
  /** 页面格式 */
  format?: 'a4' | 'a3' | 'letter' | 'legal'
  /** 单位 */
  unit?: 'mm' | 'in' | 'pt' | 'px'
  /** 字体 */
  fontSize?: number
  /** 字体族 */
  fontFamily?: string
  /** 页边距 */
  margin?: {
    top: number
    right: number
    bottom: number
    left: number
  }
  /** 是否显示页码 */
  showPageNumber?: boolean
  /** 页码位置 */
  pageNumberPosition?: 'bottom-center' | 'bottom-right' | 'bottom-left'
  /** 标题 */
  title?: string
  /** 副标题 */
  subtitle?: string
  /** 页脚文本 */
  footer?: string
  /** 是否自动分页 */
  autoPageBreak?: boolean
  /** 主题 */
  theme?: 'light' | 'dark'
}

/**
 * PDF 单元格样式
 */
export interface PDFCellStyle {
  /** 背景色 */
  fillColor?: [number, number, number]
  /** 文字颜色 */
  textColor?: [number, number, number]
  /** 字体大小 */
  fontSize?: number
  /** 是否加粗 */
  bold?: boolean
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 垂直对齐 */
  valign?: 'top' | 'middle' | 'bottom'
}

/**
 * PDF 表格配置
 */
export interface PDFTableOptions {
  /** 列配置 */
  columns: Array<{
    key: string
    label: string
    width?: number
    align?: 'left' | 'center' | 'right'
    style?: PDFCellStyle
  }>
  /** 行高 */
  rowHeight?: number
  /** 表头样式 */
  headerStyle?: PDFCellStyle
  /** 行样式 */
  rowStyle?: PDFCellStyle
  /** 斑马纹 */
  zebra?: boolean
  /** 斑马纹行数 */
  zebraRows?: number
  /** 斑马纹样式 */
  zebraStyle?: PDFCellStyle
  /** 边框 */
  border?: boolean
  /** 边框样式 */
  borderStyle?: {
    color?: [number, number, number]
    lineWidth?: number
  }
}

/**
 * PDF 导出结果
 */
export interface PDFExportResult {
  success: boolean
  data?: ArrayBuffer
  blob?: Blob
  filename?: string
  pageCount?: number
  error?: string
}

// ============================================================================
// PDF 导出器类
// ============================================================================

/**
 * PDF 导出器
 */
export class PDFExporter {
  private doc: jsPDF | null = null
  private options: Required<PDFOptions>
  private currentPage: number = 1

  constructor(options: PDFOptions = {}) {
    this.options = {
      orientation: options.orientation || 'portrait',
      format: options.format || 'a4',
      unit: options.unit || 'mm',
      fontSize: options.fontSize || 10,
      fontFamily: options.fontFamily || 'helvetica',
      margin: options.margin || { top: 20, right: 15, bottom: 20, left: 15 },
      showPageNumber: options.showPageNumber ?? true,
      pageNumberPosition: options.pageNumberPosition || 'bottom-center',
      title: options.title || '',
      subtitle: options.subtitle || '',
      footer: options.footer || '',
      autoPageBreak: options.autoPageBreak ?? true,
      theme: options.theme || 'light',
    }
  }

  /**
   * 创建新文档
   */
  createDocument(): void {
    this.doc = new jsPDF({
      orientation: this.options.orientation,
      unit: this.options.unit,
      format: this.options.format,
    })
    this.currentPage = 1

    // 设置主题
    if (this.options.theme === 'dark') {
      this.doc?.setFillColor(30, 30, 30)
      this.doc?.rect(0, 0, 210, 297, 'F')
    }
  }

  /**
   * 添加标题
   */
  addTitle(title?: string): void {
    if (!this.doc) return

    const text = title || this.options.title
    if (!text) return

    this.doc.setFontSize(18)
    this.doc.setFont(this.options.fontFamily, 'bold')
    this.doc.setTextColor(
      this.options.theme === 'dark' ? 255 : 30,
      this.options.theme === 'dark' ? 255 : 30,
      this.options.theme === 'dark' ? 255 : 30
    )

    const pageWidth = this.doc.internal.pageSize.getWidth()
    const textWidth = this.doc.getTextWidth(text)
    const x = (pageWidth - textWidth) / 2

    this.doc.text(text, x, this.options.margin.top)

    // 移动到标题下方
    this.currentY = this.options.margin.top + 10
  }

  /**
   * 添加副标题
   */
  addSubtitle(subtitle?: string): void {
    if (!this.doc) return

    const text = subtitle || this.options.subtitle
    if (!text) return

    this.doc.setFontSize(12)
    this.doc.setFont(this.options.fontFamily, 'normal')
    this.doc.setTextColor(
      this.options.theme === 'dark' ? 200 : 80,
      this.options.theme === 'dark' ? 200 : 80,
      this.options.theme === 'dark' ? 200 : 80
    )

    const pageWidth = this.doc.internal.pageSize.getWidth()
    const textWidth = this.doc.getTextWidth(text)
    const x = (pageWidth - textWidth) / 2

    this.doc.text(text, x, this.currentY || this.options.margin.top + 10)
    this.currentY = (this.currentY || this.options.margin.top) + 10
  }

  private currentY: number = 0

  /**
   * 添加段落
   */
  addParagraph(text: string, options?: {
    fontSize?: number
    bold?: boolean
    color?: [number, number, number]
    align?: 'left' | 'center' | 'right'
    marginBottom?: number
  }): void {
    if (!this.doc) return

    this.doc.setFontSize(options?.fontSize || this.options.fontSize)
    this.doc.setFont(this.options.fontFamily, options?.bold ? 'bold' : 'normal')

    if (options?.color) {
      this.doc.setTextColor(...options.color)
    } else {
      this.doc.setTextColor(
        this.options.theme === 'dark' ? 240 : 40,
        this.options.theme === 'dark' ? 240 : 40,
        this.options.theme === 'dark' ? 240 : 40
      )
    }

    const pageWidth = this.doc.internal.pageSize.getWidth()
    const maxWidth = pageWidth - this.options.margin.left - this.options.margin.right

    // 分割文本以适应页面
    const lines = this.doc.splitTextToSize(text, maxWidth)
    const x = options?.align === 'center'
      ? (pageWidth - maxWidth) / 2
      : options?.align === 'right'
      ? pageWidth - this.options.margin.right - maxWidth
      : this.options.margin.left

    const y = this.currentY || this.options.margin.top + 20

    // 检查是否需要新页面
    if (y + (lines.length * this.options.fontSize) > this.getPageHeight() - this.options.margin.bottom) {
      this.addPage()
    }

    this.doc.text(lines, x, this.currentY || y)
    this.currentY = (this.currentY || y) + (lines.length * this.options.fontSize) + (options?.marginBottom || 5)
  }

  /**
   * 添加表格
   */
  addTable<T extends Record<string, unknown>>(
    data: T[],
    options: PDFTableOptions
  ): void {
    if (!this.doc || !data.length) return
    const doc = this.doc

    const { columns, rowHeight = 7, headerStyle, rowStyle, zebra, zebraRows = 1, zebraStyle, border, borderStyle } = options

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const availableWidth = pageWidth - this.options.margin.left - this.options.margin.right
    const startX = this.options.margin.left
    const startY = this.currentY || this.options.margin.top + 20

    // 计算列宽
    const columnWidths = columns.map(col => {
      if (col.width) {
        return (col.width / 100) * availableWidth
      }
      return availableWidth / columns.length
    })

    // 表头
    let currentY = startY
    doc.setFontSize(this.options.fontSize)
    doc.setFont(this.options.fontFamily, 'bold')

    if (headerStyle?.fillColor) {
      doc.setFillColor(...headerStyle.fillColor)
    }
    if (headerStyle?.textColor) {
      doc.setTextColor(...headerStyle.textColor)
    }

    // 绘制表头背景
    if (headerStyle?.fillColor) {
      doc.rect(startX, currentY, availableWidth, rowHeight, 'F')
    }

    // 绘制表头文本
    columns.forEach((col, index) => {
      const cellX = startX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0)
      const align = col.align || headerStyle?.align || 'left'
      const labelWidth = this.doc?.getTextWidth(col.label) ?? 0
      const textX = this.getAlignedX(cellX, columnWidths[index], align, labelWidth)

      this.doc?.text(col.label, textX, currentY + rowHeight / 2 + this.options.fontSize / 3)
    })

    currentY += rowHeight

    // 数据行
    doc.setFontSize(this.options.fontSize)
    doc.setFont(this.options.fontFamily, 'normal')

    data.forEach((row, rowIndex) => {
      // 检查是否需要新页面
      if (currentY + rowHeight > pageHeight - this.options.margin.bottom - 10) {
        this.addPage()
        currentY = this.options.margin.top
      }

      // 斑马纹
      if (zebra && rowIndex % zebraRows === 0) {
        const style = zebraStyle || {
          fillColor: [240, 240, 240],
        }
        if (style.fillColor) {
          doc.setFillColor(...style.fillColor)
          doc.rect(startX, currentY, availableWidth, rowHeight * zebraRows, 'F')
        }
      }

      // 绘制行
      columns.forEach((col, colIndex) => {
        const cellX = startX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0)
        const value = String(row[col.key] || '')
        const align = col.align || rowStyle?.align || 'left'
        const textX = this.getAlignedX(cellX, columnWidths[colIndex], align, doc.getTextWidth(value))

        if (rowStyle?.textColor) {
          doc.setTextColor(...rowStyle.textColor)
        } else {
          doc.setTextColor(
            this.options.theme === 'dark' ? 240 : 40,
            this.options.theme === 'dark' ? 240 : 40,
            this.options.theme === 'dark' ? 240 : 40
          )
        }

        // 截断过长的文本
        const maxTextWidth = columnWidths[colIndex] - 2
        let displayValue = value
        if (doc.getTextWidth(value) > maxTextWidth) {
          const chars = value.split('')
          let truncated = ''
          for (const char of chars) {
            if (doc.getTextWidth(truncated + char + '...') <= maxTextWidth) {
              truncated += char
            } else {
              break
            }
          }
          displayValue = truncated + '...'
        }

        doc.text(displayValue, textX, currentY + rowHeight / 2 + this.options.fontSize / 3)
      })

      // 边框
      if (border) {
        doc.setDrawColor(
          borderStyle?.color?.[0] || 0,
          borderStyle?.color?.[1] || 0,
          borderStyle?.color?.[2] || 0
        )
        doc.setLineWidth(borderStyle?.lineWidth || 0.1)
        doc.rect(startX, currentY, availableWidth, rowHeight)
      }

      currentY += rowHeight
    })

    this.currentY = currentY + 5
  }

  /**
   * 添加页码
   */
  addPageNumber(): void {
    if (!this.doc || !this.options.showPageNumber) return

    const text = `Page ${this.currentPage}`
    this.doc.setFontSize(9)
    this.doc.setFont(this.options.fontFamily, 'normal')
    this.doc.setTextColor(
      this.options.theme === 'dark' ? 150 : 100,
      this.options.theme === 'dark' ? 150 : 100,
      this.options.theme === 'dark' ? 150 : 100
    )

    const pageWidth = this.doc.internal.pageSize.getWidth()
    const pageHeight = this.doc.internal.pageSize.getHeight()
    const textWidth = this.doc.getTextWidth(text)

    let x: number
    switch (this.options.pageNumberPosition) {
      case 'bottom-center':
        x = (pageWidth - textWidth) / 2
        break
      case 'bottom-right':
        x = pageWidth - this.options.margin.right - textWidth
        break
      case 'bottom-left':
        x = this.options.margin.left
        break
      default:
        x = (pageWidth - textWidth) / 2
    }

    this.doc.text(text, x, pageHeight - this.options.margin.bottom)
  }

  /**
   * 添加页脚
   */
  addFooter(): void {
    if (!this.doc || !this.options.footer) return

    const text = this.options.footer
    this.doc.setFontSize(9)
    this.doc.setFont(this.options.fontFamily, 'normal')
    this.doc.setTextColor(
      this.options.theme === 'dark' ? 150 : 100,
      this.options.theme === 'dark' ? 150 : 100,
      this.options.theme === 'dark' ? 150 : 100
    )

    const pageWidth = this.doc.internal.pageSize.getWidth()
    const pageHeight = this.doc.internal.pageSize.getHeight()
    const textWidth = this.doc.getTextWidth(text)
    const x = (pageWidth - textWidth) / 2

    this.doc.text(text, x, pageHeight - this.options.margin.bottom - 5)
  }

  /**
   * 添加新页面
   */
  addPage(): void {
    if (!this.doc) return

    this.doc.addPage()
    this.currentPage++
    this.currentY = this.options.margin.top

    // 添加页码到前一页
    this.doc.setPage(this.currentPage - 1)
    this.addPageNumber()
    this.addFooter()

    // 切换回新页面
    this.doc.setPage(this.currentPage)
  }

  /**
   * 获取页面高度
   */
  private getPageHeight(): number {
    if (!this.doc) return 297
    return this.doc.internal.pageSize.getHeight()
  }

  /**
   * 获取对齐后的 X 坐标
   */
  private getAlignedX(cellX: number, cellWidth: number, align: string, textWidth: number): number {
    switch (align) {
      case 'center':
        return cellX + (cellWidth - textWidth) / 2
      case 'right':
        return cellX + cellWidth - textWidth - 1
      default:
        return cellX + 1
    }
  }

  /**
   * 保存 PDF
   */
  async save(filename?: string): Promise<PDFExportResult> {
    if (!this.doc) {
      return { success: false, error: 'PDF 文档未创建' }
    }

    try {
      // 添加最后一页的页码和页脚
      this.addPageNumber()
      this.addFooter()

      // 生成 ArrayBuffer
      const data = this.doc.output('arraybuffer')
      const blob = new Blob([data], { type: 'application/pdf' })

      return {
        success: true,
        data,
        blob,
        filename: filename || 'document.pdf',
        pageCount: this.currentPage,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF 保存失败',
      }
    }
  }

  /**
   * 导出为 Blob
   */
  async export<T extends Record<string, unknown>>(
    data: T[],
    options: {
      filename: string
      columns: PDFTableOptions['columns']
      title?: string
      subtitle?: string
      pdfOptions?: PDFOptions
    }
  ): Promise<PDFExportResult> {
    try {
      // 创建文档
      this.createDocument()

      // 添加标题
      if (options.title || this.options.title) {
        this.addTitle(options.title)
      }

      // 添加副标题
      if (options.subtitle || this.options.subtitle) {
        this.addSubtitle(options.subtitle)
      }

      // 添加表格
      if (data.length > 0) {
        this.addTable(data, {
          columns: options.columns,
          rowStyle: {
            textColor: this.options.theme === 'dark' ? [240, 240, 240] : [40, 40, 40],
          },
          border: true,
          headerStyle: {
            fillColor: this.options.theme === 'dark' ? [60, 60, 60] : [200, 200, 200],
            textColor: [0, 0, 0],
            bold: true,
          },
          zebra: true,
          zebraRows: 1,
          zebraStyle: {
            fillColor: this.options.theme === 'dark' ? [45, 45, 45] : [245, 245, 245],
          },
        })
      }

      // 保存
      return await this.save(options.filename)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF 导出失败',
      }
    }
  }
}
