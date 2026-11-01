/**
 * @fileoverview CSV Parser Edge Case Tests
 * @description CSV 解析器边界用例（空文件、只有表头、引号/转义/换行、列数不一致、Unicode、BOM 等）
 * @version 1.12.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CSVParser } from '../parsers/csv-parser'

describe('CSVParser 边界用例', () => {
  let parser: CSVParser

  beforeEach(() => {
    parser = new CSVParser()
  })

  describe('空文件与只有表头', () => {
    it('空字符串应返回零行零字段且成功', async () => {
      const result = await parser.parse('', { format: 'csv', skipHeader: true })

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
      expect(result.fields).toEqual([])
      expect(result.totalRows).toBe(0)
      expect(result.errors).toEqual([])
    })

    it('只有表头没有数据行时 totalRows 应为 0', async () => {
      const result = await parser.parse('name,age,email', { format: 'csv', skipHeader: true })

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
      expect(result.fields).toEqual(['name', 'age', 'email'])
      expect(result.totalRows).toBe(0)
    })

    it('全空白内容应视为空文件', async () => {
      const result = await parser.parse('   \n\n  \n', { format: 'csv', skipHeader: true })

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
      expect(result.totalRows).toBe(0)
    })

    it('空文件的 preview 不应抛错', async () => {
      const result = await parser.preview('', 5)

      expect(result.fields).toEqual([])
      expect(result.data).toEqual([])
      expect(result.totalRows).toBe(0)
    })

    it('只有表头的 preview totalRows 应为 0 而非 1', async () => {
      const result = await parser.preview('a,b,c', 10)

      expect(result.fields).toEqual(['a', 'b', 'c'])
      expect(result.data).toEqual([])
      expect(result.totalRows).toBe(0)
    })
  })

  describe('totalRows 语义', () => {
    it('totalRows 应统计全部数据行而不是被 maxRows 截断后的行数', async () => {
      const csv = `name,age
John,30
Jane,25
Bob,35
Amy,28`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true, maxRows: 2 })

      expect(result.data).toHaveLength(2)
      expect(result.totalRows).toBe(4)
    })

    it('totalRows 不应把表头算作数据行', async () => {
      const csv = `name,age
John,30`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.data).toHaveLength(1)
      expect(result.totalRows).toBe(1)
    })

    it('空行不应计入 totalRows', async () => {
      const csv = `name,age
John,30

Jane,25
`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.data).toHaveLength(2)
      expect(result.totalRows).toBe(2)
    })
  })

  describe('引号、转义与换行', () => {
    it('双引号转义应还原为单个引号', async () => {
      const csv = `name,quote
John,"He said ""hello"""`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.success).toBe(true)
      expect(result.data[0].quote).toBe('He said "hello"')
    })

    it('引号内的换行应保留在同一个字段中', async () => {
      const csv = `name,desc
John,"line1
line2"`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].desc).toBe('line1\nline2')
    })

    it('引号内的分隔符不应切分字段', async () => {
      const csv = `a,b
"x,y",z`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.data[0].a).toBe('x,y')
      expect(result.data[0].b).toBe('z')
    })

    it('引号内的换行不应影响 totalRows 统计', async () => {
      const csv = `a,b
"multi
line",1
second,2`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.data).toHaveLength(2)
      expect(result.totalRows).toBe(2)
    })

    it('parseStream 应正确处理引号内的换行', async () => {
      const csv = `a,b
"x
y",1
z,2`

      const rows: Record<string, unknown>[] = []
      for await (const batch of parser.parseStream(csv, { format: 'csv', batchSize: 10 })) {
        rows.push(...batch)
      }

      expect(rows).toHaveLength(2)
      expect(rows[0].a).toBe('x\ny')
      expect(rows[1].a).toBe('z')
    })
  })

  describe('列数与表头不一致', () => {
    it('列数少于表头时应补 null 并给出警告', async () => {
      const csv = `name,age,email
John,30`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.success).toBe(true)
      expect(result.data[0].email).toBe(null)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.field === 'email')).toBe(true)
    })

    it('列数多于表头时多余列应落到 field_N 并给出警告', async () => {
      const csv = `name,age
John,30,extra`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.success).toBe(true)
      expect(result.data[0].name).toBe('John')
      expect(result.data[0].field_2).toBe('extra')
      expect(result.warnings.some(w => w.field === 'field_2')).toBe(true)
    })

    it('表头有空列名时字段名应回退到 field_N', async () => {
      const csv = `name,,age
John,x,30`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.success).toBe(true)
      expect(result.data[0].field_1).toBe('x')
      expect(result.data[0].age).toBe(30)
    })

    it('重复表头应给出警告', async () => {
      const csv = `name,name
John,Jane`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.warnings.some(w => w.message.includes('重复的表头字段'))).toBe(true)
    })
  })

  describe('值解析边界', () => {
    it('保留前导零的标识类字符串', async () => {
      const csv = `zip,id
007,000123`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.data[0].zip).toBe('007')
      expect(result.data[0].id).toBe('000123')
    })

    it('应支持指数形式数字', async () => {
      const csv = `v
1e3`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.data[0].v).toBe(1000)
    })

    it('非法的 JSON 应回退为原始字符串', async () => {
      const csv = `v
"{not json"`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.data[0].v).toBe('{not json')
    })
  })

  describe('编码与换行符', () => {
    it('应剥离 UTF-8 BOM', async () => {
      const csv = '﻿name,age\nJohn,30'

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.fields).toEqual(['name', 'age'])
      expect(result.data[0].name).toBe('John')
    })

    it('应支持 CRLF 换行符', async () => {
      const csv = 'name,age\r\nJohn,30\r\nJane,25'

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.data).toHaveLength(2)
      expect(result.data[0].age).toBe(30)
      expect(result.data[1].name).toBe('Jane')
    })
  })

  describe('Unicode 与中文表头', () => {
    it('中文表头应被正确解析', async () => {
      const csv = `姓名,年龄,邮箱
张三,30,zhang@example.com`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.fields).toEqual(['姓名', '年龄', '邮箱'])
      expect(result.data[0].姓名).toBe('张三')
      expect(result.data[0].年龄).toBe(30)
    })

    it('中文表头的 preview 应正常返回', async () => {
      const csv = `姓名,年龄
张三,30
李四,25`

      const result = await parser.preview(csv, 1)

      expect(result.fields).toEqual(['姓名', '年龄'])
      expect(result.data).toHaveLength(1)
      expect(result.totalRows).toBe(2)
    })

    it('带 emoji 与组合字符的字段应保留原样', async () => {
      const csv = `emoji,cjk
"🚀 launch","é"`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: true })

      expect(result.data[0].emoji).toBe('🚀 launch')
      expect(result.data[0].cjk).toBe('é')
    })
  })

  describe('skipHeader 关闭时', () => {
    it('skipHeader=false 时首行应作为数据行处理', async () => {
      const csv = `John,30
Jane,25`

      const result = await parser.parse(csv, { format: 'csv', skipHeader: false })

      // 字段名仍来自第一行（与 ExcelParser 一致），但第一行同时也算一条数据行
      expect(result.fields).toEqual(['John', '30'])
      expect(result.data).toHaveLength(2)
      expect(result.totalRows).toBe(2)
      expect(result.data[0].John).toBe('John')
    })
  })
})
