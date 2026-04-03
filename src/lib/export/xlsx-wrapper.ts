/**
 * @fileoverview XLSX (SheetJS) 包装器 - ExcelJS 的兼容层
 * @description 提供与 ExcelJS 兼容的 API，但使用 XLSX (SheetJS) 作为底层实现
 * @note 由于 XLSX 不支持样式，以下功能将无法实现：
 *       - 单元格样式（字体、背景、边框）
 *       - 冻结行/列
 *       - 自动筛选
 *       - 合并单元格
 * @version 1.0.0
 */

import * as XLSX from 'xlsx'

// ============================================================================
// 类型定义（兼容 ExcelJS）
// ============================================================================

/**
 * 工作簿类（兼容 ExcelJS.Workbook）
 */
export class Workbook {
  private _worksheets: Worksheet[] = []
  private _properties: WorkbookProperties = {}

  /**
   * 工作簿属性
   */
  get properties(): WorkbookProperties {
    return this._properties
  }

  set properties(value: WorkbookProperties) {
    this._properties = value
  }

  /**
   * 添加工作表
   */
  addWorksheet(name: string, options?: WorksheetOptions): Worksheet {
    const worksheet = new Worksheet(name, options)
    this._worksheets.push(worksheet)
    return worksheet
  }

  /**
   * 获取所有工作表
   */
  get worksheets(): Worksheet[] {
    return this._worksheets
  }

  /**
   * 写入 XLSX 缓冲区
   */
  xlsx = {
    writeBuffer: async (options: { type?: 'buffer' } = {}): Promise<Buffer> => {
      // 创建 XLSX 工作簿
      const workbook = XLSX.utils.book_new()

      // 添加所有工作表
      this._worksheets.forEach(ws => {
        const worksheet = ws.toXLSXWorksheet()
        XLSX.utils.book_append_sheet(workbook, worksheet, ws.name)
      })

      // 写入缓冲区
      const buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      })

      return buffer as Buffer
    },
  }
}

/**
 * 工作表类（兼容 ExcelJS.Worksheet）
 */
export class Worksheet {
  name: string
  private _rows: Row[] = []
  private _columns: Column[] = []
  private _views: WorksheetView[] = []
  private _autoFilter: AutoFilter | null = null

  constructor(name: string, options?: WorksheetOptions) {
    this.name = name
  }

  /**
   * 添加行
   */
  addRow(values: unknown[]): Row {
    const row = new Row(values, this._rows.length + 1)
    this._rows.push(row)
    return row
  }

  /**
   * 获取列
   */
  getColumn(index: number): Column {
    if (!this._columns[index - 1]) {
      this._columns[index - 1] = new Column(index)
    }
    return this._columns[index - 1]
  }

  /**
   * 获取所有列
   */
  get columns(): Column[] {
    return this._columns
  }

  /**
   * 工作表视图（冻结行等）
   * @note XLSX 不支持冻结行，此属性会被忽略
   */
  get views(): WorksheetView[] {
    return this._views
  }

  set views(value: WorksheetView[]) {
    this._views = value
    // XLSX 不支持冻结行，记录警告
    if (value.some(v => v.state === 'frozen')) {
      console.warn('[XLSX Wrapper] 冻结行功能在 XLSX 中不支持，将被忽略')
    }
  }

  /**
   * 自动筛选
   * @note XLSX 不支持自动筛选，此属性会被忽略
   */
  get autoFilter(): AutoFilter | null {
    return this._autoFilter
  }

  set autoFilter(value: AutoFilter | null) {
    this._autoFilter = value
    // XLSX 不支持自动筛选，记录警告
    if (value) {
      console.warn('[XLSX Wrapper] 自动筛选功能在 XLSX 中不支持，将被忽略')
    }
  }

  /**
   * 转换为 XLSX 工作表
   */
  toXLSXWorksheet(): XLSX.WorkSheet {
    // 将行数据转换为二维数组
    const data: unknown[][] = this._rows.map(row => row.values)

    // 转换为 XLSX 工作表
    const worksheet = XLSX.utils.aoa_to_sheet(data)

    // 设置列宽（有限支持）
    if (this._columns.length > 0) {
      worksheet['!cols'] = this._columns.map(col => ({
        wch: col.width || 15,
      }))
    }

    return worksheet
  }
}

/**
 * 行类（兼容 ExcelJS.Row）
 */
export class Row {
  values: unknown[]
  number: number
  private _font: Font | null = null
  private _fill: Fill | null = null

  constructor(values: unknown[], number: number) {
    this.values = values
    this.number = number
  }

  /**
   * 字体样式
   * @note XLSX 不支持样式，此属性会被忽略
   */
  get font(): Font | null {
    return this._font
  }

  set font(value: Font | null) {
    this._font = value
    if (value) {
      console.warn('[XLSX Wrapper] 字体样式在 XLSX 中不支持，将被忽略')
    }
  }

  /**
   * 填充样式
   * @note XLSX 不支持样式，此属性会被忽略
   */
  get fill(): Fill | null {
    return this._fill
  }

  set fill(value: Fill | null) {
    this._fill = value
    if (value) {
      console.warn('[XLSX Wrapper] 填充样式在 XLSX 中不支持，将被忽略')
    }
  }
}

/**
 * 列类（兼容 ExcelJS.Column）
 */
export class Column {
  number: number
  private _width: number = 15

  constructor(number: number) {
    this.number = number
  }

  /**
   * 列宽
   */
  get width(): number {
    return this._width
  }

  set width(value: number) {
    this._width = value
  }
}

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 工作簿属性
 */
export interface WorkbookProperties {
  title?: string
  subject?: string
  creator?: string
  keywords?: string
  description?: string
  lastModifiedBy?: string
}

/**
 * 工作表选项
 */
export interface WorksheetOptions {
  pageSetup?: {
    horizontalCentered?: boolean
    verticalCentered?: boolean
  }
}

/**
 * 工作表视图
 */
export interface WorksheetView {
  state?: 'normal' | 'frozen' | 'split'
  xSplit?: number
  ySplit?: number
}

/**
 * 自动筛选
 */
export interface AutoFilter {
  from: { row: number; column: number }
  to: { row: number; column: number }
}

/**
 * 字体样式
 */
export interface Font {
  bold?: boolean
  color?: { argb: string }
  size?: number
  name?: string
  family?: number
}

/**
 * 填充样式
 */
export interface Fill {
  type: 'pattern'
  pattern: 'solid' | 'none'
  fgColor?: { argb: string }
  bgColor?: { argb: string }
}

// ============================================================================
// 导出
// ============================================================================

export default {
  Workbook,
}