/**
 * @fileoverview CSV Parser Tests
 * @description CSV 解析器单元测试
 * @version 1.12.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CSVParser } from '../parsers/csv-parser'

describe('CSVParser', () => {
  let parser: CSVParser

  beforeEach(() => {
    parser = new CSVParser()
  })

  describe('parse', () => {
    it('应该正确解析基本 CSV', async () => {
      const csv = `name,age,email
John,30,john@example.com
Jane,25,jane@example.com`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.fields).toEqual(['name', 'age', 'email'])
      expect(result.data[0].name).toBe('John')
      expect(result.data[0].age).toBe(30)
    })

    it('应该正确处理引号内的逗号', async () => {
      const csv = `name,description
John,"Hello, World"
Jane,"Test, with, commas"`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.success).toBe(true)
      expect(result.data[0].description).toBe('Hello, World')
      expect(result.data[1].description).toBe('Test, with, commas')
    })

    it('应该正确处理空值', async () => {
      const csv = `name,age,email
John,30,
,25,jane@example.com`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.success).toBe(true)
      expect(result.data[0].email).toBe(null)
      expect(result.data[1].name).toBe(null)
    })

    it('应该正确转换数据类型', async () => {
      const csv = `name,age,active,score
John,30,true,95.5
Jane,25,false,88.0`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.success).toBe(true)
      expect(result.data[0].age).toBe(30)
      expect(result.data[0].active).toBe(true)
      expect(result.data[0].score).toBe(95.5)
    })

    it('应该正确解析自定义分隔符', async () => {
      const csv = `name;age;email
John;30;john@example.com`

      const result = await parser.parse(csv, { format: 'csv', delimiter: ';', skipHeader: true })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('John')
    })

    it('应该正确处理 JSON 值', async () => {
      const csv = `name,tags
John,"[1,2,3]"
Jane,"{""key"":""value""}"`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.success).toBe(true)
      expect(result.data[0].tags).toEqual([1, 2, 3])
    })
  })

  describe('preview', () => {
    it('应该正确生成预览', async () => {
      const csv = `name,age,email
John,30,john@example.com
Jane,25,jane@example.com
Bob,35,bob@example.com`

      const result = await parser.preview(csv, 2)

      expect(result.fields).toEqual(['name', 'age', 'email'])
      expect(result.data).toHaveLength(2)
      expect(result.totalRows).toBe(3)
    })
  })

  describe('detectDelimiter', () => {
    it('应该检测逗号分隔符', () => {
      const content = 'name,age,email\nJohn,30,john@example.com'
      expect(parser.detectDelimiter(content)).toBe(',')
    })

    it('应该检测分号分隔符', () => {
      const content = 'name;age;email\nJohn;30;john@example.com'
      expect(parser.detectDelimiter(content)).toBe(';')
    })

    it('应该检测制表符分隔符', () => {
      const content = 'name\tage\temail\nJohn\t30\tjohn@example.com'
      expect(parser.detectDelimiter(content)).toBe('\t')
    })
  })

  describe('parseStream', () => {
    it('应该流式解析 CSV', async () => {
      const csv = `name,age
John,30
Jane,25
Bob,35`

      const results: Record<string, unknown>[] = []
      for await (const batch of parser.parseStream(csv, { format: 'csv', batchSize: 2 })) {
        results.push(...batch)
      }

      expect(results).toHaveLength(3)
      expect(results[0].name).toBe('John')
    })
  })
})
