/**
 * @fileoverview Data Import Module - Export Index
 * @description 数据导入模块统一导出
 * @version 1.12.0
 */

// Types
export * from './types'

// Parsers
export { CSVParser, csvParser } from './parsers/csv-parser'
export { ExcelParser, excelParser } from './parsers/excel-parser'
export { JSONParser, jsonParser } from './parsers/json-parser'

// Core
export { ImportValidator, importValidator } from './validator'
export { FieldTransformer, fieldTransformer } from './transformer'
export { DataImportService, dataImportService } from './import-service'

// Convenience exports
import { dataImportService } from './import-service'
import { csvParser } from './parsers/csv-parser'
import { excelParser } from './parsers/excel-parser'
import { jsonParser } from './parsers/json-parser'
import { importValidator } from './validator'
import { fieldTransformer } from './transformer'

/**
 * 默认导出
 */
export default {
  service: dataImportService,
  parsers: {
    csv: csvParser,
    excel: excelParser,
    json: jsonParser,
  },
  validator: importValidator,
  transformer: fieldTransformer,
}
