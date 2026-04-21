/**
 * @fileoverview Excel Workbook 包装器 - 基于 exceljs 实现
 * @description 提供 Workbook/Worksheet API 供遗留代码使用
 * @version 2.0.0 - 基于 exceljs
 */

import ExcelJS from 'exceljs'

// ============================================================================
// 类型定义（兼容遗留 API）
// ============================================================================

/**
 * 工作簿类（兼容遗留 Workbook API）
 */
export class Workbook {
  private _workbook: ExcelJS.Workbook

  constructor() {
    this._workbook = new ExcelJS.Workbook()
  }

  get properties(): ExcelJS.WorkbookProperties {
    return this._workbook.properties
  }

  set properties(value: ExcelJS.WorkbookProperties) {
    this._workbook.properties = value
  }

  addWorksheet(name: string, options?: ExcelJS.AddWorksheetOptions): Worksheet {
    const exceljsWorksheet = this._workbook.addWorksheet(name, options)
    return new Worksheet(exceljsWorksheet)
  }

  get worksheets(): Worksheet[] {
    return this._workbook.worksheets.map(ws => new Worksheet(ws))
  }

  xlsx = {
    writeBuffer: async (): Promise<Buffer> => {
      const buffer = await this._workbook.xlsx.writeBuffer()
      return buffer as unknown as Buffer
    },
  }
}

/**
 * 工作表类（兼容遗留 Worksheet API）
 */
export class Worksheet {
  private _worksheet: ExcelJS.Worksheet

  constructor(worksheet: ExcelJS.Worksheet) {
    this._worksheet = worksheet
  }

  get name(): string {
    return this._worksheet.name
  }

  addRow(values: unknown[]): Row {
    const row = this._worksheet.addRow(values)
    return new Row(row)
  }

  getColumn(index: number): Column {
    return new Column(this._worksheet.getColumn(index))
  }

  get columns(): Column[] {
    return (this._worksheet.columns as ExcelJS.Column[]).map(col => new Column(col))
  }

  get views(): ExcelJS.WorksheetView[] {
    return this._worksheet.views as unknown as ExcelJS.WorksheetView[]
  }

  set views(value: ExcelJS.WorksheetView[]) {
    this._worksheet.views = value as unknown as typeof this._worksheet.views
  }

  get autoFilter(): ExcelJS.AutoFilter | undefined {
    return this._worksheet.autoFilter
  }

  set autoFilter(value: ExcelJS.AutoFilter | undefined) {
    this._worksheet.autoFilter = value
  }
}

/**
 * 行类
 */
export class Row {
  private _row: ExcelJS.Row

  constructor(row: ExcelJS.Row) {
    this._row = row
  }

  get values(): unknown[] {
    return this._row.values as unknown[]
  }

  get font(): ExcelJS.Font {
    return this._row.font as ExcelJS.Font
  }

  set font(value: ExcelJS.Font) {
    this._row.font = value
  }

  get fill(): ExcelJS.Fill {
    return this._row.fill as ExcelJS.Fill
  }

  set fill(value: ExcelJS.Fill) {
    this._row.fill = value
  }
}

/**
 * 列类
 */
export class Column {
  private _column: ExcelJS.Column

  constructor(column: ExcelJS.Column) {
    this._column = column
  }

  get width(): number {
    return this._column.width || 15
  }

  set width(value: number) {
    this._column.width = value
  }
}

// ============================================================================
// 导出
// ============================================================================

export default { Workbook }
