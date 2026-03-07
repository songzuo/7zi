/**
 * @fileoverview 数据导出工具单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DataExporter,
  ExportField,
  exportData,
  downloadExport,
  createFields,
  dateFormatter,
  booleanFormatter,
  arrayFormatter,
  truncateFormatter,
} from '../index';

// ============================================================================
// 测试数据类型
// ============================================================================

interface TestUser {
  id: number;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  tags: string[];
}

// ============================================================================
// 测试数据
// ============================================================================

const testUsers: TestUser[] = [
  {
    id: 1,
    name: '张三',
    email: 'zhangsan@example.com',
    active: true,
    createdAt: '2024-01-15T10:30:00Z',
    tags: ['admin', 'developer'],
  },
  {
    id: 2,
    name: '李四',
    email: 'lisi@example.com',
    active: false,
    createdAt: '2024-02-20T14:45:00Z',
    tags: ['user'],
  },
  {
    id: 3,
    name: '王五',
    email: 'wangwu@example.com',
    active: true,
    createdAt: '2024-03-10T08:00:00Z',
    tags: ['user', 'tester'],
  },
];

const testFields: ExportField<TestUser>[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: '姓名' },
  { key: 'email', label: '邮箱' },
  { key: 'active', label: '状态', formatter: booleanFormatter('启用', '禁用') },
  { key: 'createdAt', label: '创建时间', formatter: dateFormatter('locale') },
  { key: 'tags', label: '标签', formatter: arrayFormatter(', ') },
];

// ============================================================================
// DataExporter 测试
// ============================================================================

describe('DataExporter', () => {
  let exporter: DataExporter<TestUser>;

  describe('Excel 导出', () => {
    beforeEach(() => {
      exporter = new DataExporter({
        filename: 'test-users',
        format: 'xlsx',
        fields: testFields,
        sheetName: '用户数据',
      });
    });

    it('应该成功导出 Excel 文件', () => {
      const result = exporter.export(testUsers);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('test-users.xlsx');
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob?.type).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });

    it('应该生成正确大小的 Blob', () => {
      const result = exporter.export(testUsers);

      // Excel 文件应该有一定大小（至少 1KB）
      expect(result.blob?.size).toBeGreaterThan(1000);
    });
  });

  describe('CSV 导出', () => {
    beforeEach(() => {
      exporter = new DataExporter({
        filename: 'test-users',
        format: 'csv',
        fields: testFields,
      });
    });

    it('应该成功导出 CSV 文件', () => {
      const result = exporter.export(testUsers);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('test-users.csv');
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob?.type).toBe('text/csv;charset=utf-8');
    });

    it('CSV 应该包含 BOM 头', async () => {
      const result = exporter.export(testUsers);

      // 读取 Blob 内容
      const text = await result.blob?.text();
      expect(text?.startsWith('\ufeff')).toBe(true);
    });

    it('应该正确转义包含逗号的值', () => {
      const dataWithComma: TestUser[] = [
        { ...testUsers[0], name: '张, 三' },
      ];

      const result = exporter.export(dataWithComma);
      expect(result.success).toBe(true);
    });
  });

  describe('JSON 导出', () => {
    beforeEach(() => {
      exporter = new DataExporter({
        filename: 'test-users',
        format: 'json',
        fields: testFields,
      });
    });

    it('应该成功导出 JSON 文件', () => {
      const result = exporter.export(testUsers);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('test-users.json');
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob?.type).toBe('application/json;charset=utf-8');
    });

    it('应该生成有效的 JSON', async () => {
      const result = exporter.export(testUsers);

      const text = await result.blob?.text();
      const parsed = JSON.parse(text!);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(3);
      expect(parsed[0]).toHaveProperty('ID');
      expect(parsed[0]).toHaveProperty('姓名');
    });
  });

  describe('字段选择', () => {
    beforeEach(() => {
      exporter = new DataExporter({
        filename: 'test-users',
        format: 'json',
        fields: testFields,
        selectedFields: ['id', 'name'],
      });
    });

    it('应该只导出选中的字段', async () => {
      const result = exporter.export(testUsers);

      const text = await result.blob?.text();
      const parsed = JSON.parse(text!);

      expect(Object.keys(parsed[0])).toEqual(['ID', '姓名']);
    });
  });

  describe('默认字段选择', () => {
    it('应该排除 defaultSelected: false 的字段', async () => {
      const fieldsWithDefaults: ExportField<TestUser>[] = [
        { key: 'id', label: 'ID', defaultSelected: true },
        { key: 'name', label: '姓名', defaultSelected: true },
        { key: 'email', label: '邮箱', defaultSelected: false },
      ];

      exporter = new DataExporter({
        filename: 'test',
        format: 'json',
        fields: fieldsWithDefaults,
      });

      const result = exporter.export(testUsers);
      const text = await result.blob?.text();
      const parsed = JSON.parse(text!);

      expect(Object.keys(parsed[0])).toEqual(['ID', '姓名']);
    });
  });

  describe('数据转换', () => {
    it('应该正确应用 transform 函数', async () => {
      exporter = new DataExporter({
        filename: 'test',
        format: 'json',
        fields: testFields,
        transform: (data) => data.filter((u) => u.active),
      });

      const result = exporter.export(testUsers);
      const text = await result.blob?.text();
      const parsed = JSON.parse(text!);

      expect(parsed.length).toBe(2); // 只有 2 个 active 用户
    });
  });

  describe('错误处理', () => {
    it('应该处理空数据', () => {
      exporter = new DataExporter({
        filename: 'test',
        format: 'xlsx',
        fields: testFields,
      });

      const result = exporter.export([]);

      expect(result.success).toBe(true);
    });

    it('应该处理不支持的格式', () => {
      exporter = new DataExporter({
        filename: 'test',
        format: 'pdf' as never,
        fields: testFields,
      });

      const result = exporter.export(testUsers);

      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的导出格式');
    });
  });
});

// ============================================================================
// 便捷函数测试
// ============================================================================

describe('便捷函数', () => {
  describe('exportData', () => {
    it('应该快速导出数据', () => {
      const result = exportData(testUsers, {
        filename: 'quick-export',
        format: 'csv',
        fields: testFields,
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe('quick-export.csv');
    });
  });

  describe('createFields', () => {
    it('应该从键名创建字段配置', () => {
      const fields = createFields<TestUser>(['id', 'name', 'email']);

      expect(fields).toHaveLength(3);
      expect(fields[0].key).toBe('id');
      expect(fields[0].label).toBe('id');
      expect(fields[0].defaultSelected).toBe(true);
    });

    it('应该支持自定义标签', () => {
      const fields = createFields<TestUser>(
        ['id', 'name'],
        { id: '编号', name: '用户名' }
      );

      expect(fields[0].label).toBe('编号');
      expect(fields[1].label).toBe('用户名');
    });
  });
});

// ============================================================================
// 格式化器测试
// ============================================================================

describe('格式化器', () => {
  describe('dateFormatter', () => {
    it('应该格式化 ISO 日期', () => {
      const formatter = dateFormatter('iso');
      const result = formatter('2024-01-15T10:30:00Z');

      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('应该格式化本地日期', () => {
      const formatter = dateFormatter('locale');
      const result = formatter('2024-01-15T10:30:00Z');

      expect(result).toMatch(/2024/);
    });

    it('应该格式化 Unix 时间戳', () => {
      const formatter = dateFormatter('unix');
      const result = formatter('2024-01-15T10:30:00Z');

      expect(result).toMatch(/^\d+$/);
    });

    it('应该处理无效日期', () => {
      const formatter = dateFormatter('iso');
      const result = formatter('invalid-date');

      expect(result).toBe('invalid-date');
    });

    it('应该处理空值', () => {
      const formatter = dateFormatter('iso');
      const result = formatter(null);

      expect(result).toBe('');
    });
  });

  describe('booleanFormatter', () => {
    it('应该格式化布尔值', () => {
      const formatter = booleanFormatter('是', '否');

      expect(formatter(true)).toBe('是');
      expect(formatter(false)).toBe('否');
    });

    it('应该处理字符串布尔值', () => {
      const formatter = booleanFormatter();

      expect(formatter('true')).toBe('是');
      expect(formatter('false')).toBe('否');
      expect(formatter('yes')).toBe('是');
      expect(formatter('no')).toBe('否');
    });

    it('应该处理数字布尔值', () => {
      const formatter = booleanFormatter();

      expect(formatter(1)).toBe('是');
      expect(formatter(0)).toBe('否');
    });
  });

  describe('arrayFormatter', () => {
    it('应该格式化数组', () => {
      const formatter = arrayFormatter(', ');

      expect(formatter(['a', 'b', 'c'])).toBe('a, b, c');
    });

    it('应该处理非数组值', () => {
      const formatter = arrayFormatter();

      expect(formatter('string')).toBe('string');
    });

    it('应该处理对象数组', () => {
      const formatter = arrayFormatter('; ');
      const result = formatter([{ id: 1 }, { id: 2 }]);

      expect(result).toContain('{"id":1}');
      expect(result).toContain('{"id":2}');
    });
  });

  describe('truncateFormatter', () => {
    it('应该截断长字符串', () => {
      const formatter = truncateFormatter(10);
      const result = formatter('这是一个很长的字符串需要被截断');

      expect(result.length).toBe(13); // 10 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('不应该截断短字符串', () => {
      const formatter = truncateFormatter(10);
      const result = formatter('短字符串');

      expect(result).toBe('短字符串');
    });

    it('应该处理空值', () => {
      const formatter = truncateFormatter(10);

      expect(formatter(null)).toBe('');
      expect(formatter(undefined)).toBe('');
    });
  });
});

// ============================================================================
// 边界情况测试
// ============================================================================

describe('边界情况', () => {
  it('应该处理包含特殊字符的数据', async () => {
    const specialData: TestUser[] = [
      {
        id: 1,
        name: '张"三"',
        email: 'test@example.com',
        active: true,
        createdAt: '2024-01-01',
        tags: ['tag"1', 'tag,2', 'tag\n3'],
      },
    ];

    const exporter = new DataExporter({
      filename: 'special',
      format: 'csv',
      fields: testFields,
    });

    const result = exporter.export(specialData);
    expect(result.success).toBe(true);

    const text = await result.blob?.text();
    expect(text).toContain('张""三""'); // CSV 转义
  });

  it('应该处理 null 和 undefined 值', async () => {
    const nullData: TestUser[] = [
      {
        id: 1,
        name: null as unknown as string,
        email: undefined as unknown as string,
        active: null as unknown as boolean,
        createdAt: null as unknown as string,
        tags: null as unknown as string[],
      },
    ];

    const exporter = new DataExporter({
      filename: 'null-test',
      format: 'json',
      fields: testFields,
    });

    const result = exporter.export(nullData);
    expect(result.success).toBe(true);

    const text = await result.blob?.text();
    const parsed = JSON.parse(text!);

    expect(parsed[0]['姓名']).toBe(null);
    expect(parsed[0]['邮箱']).toBe(null);
  });

  it('应该处理大数据量', () => {
    // 生成 10000 条测试数据
    const largeData: TestUser[] = Array.from({ length: 10000 }, (_, i) => ({
      id: i + 1,
      name: `用户${i + 1}`,
      email: `user${i + 1}@example.com`,
      active: i % 2 === 0,
      createdAt: new Date().toISOString(),
      tags: ['tag1', 'tag2'],
    }));

    const exporter = new DataExporter({
      filename: 'large-test',
      format: 'xlsx',
      fields: testFields,
    });

    const startTime = Date.now();
    const result = exporter.export(largeData);
    const endTime = Date.now();

    expect(result.success).toBe(true);
    expect(endTime - startTime).toBeLessThan(5000); // 应该在 5 秒内完成
  });
});