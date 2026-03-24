// @ts-nocheck - Test file with complex type issues
/**
 * Simple smoke test for data import/export functionality
 */

import { describe, it, expect } from 'vitest';
import {
  getSupportedTables,
  isValidTable,
  validateExportOptions,
  validateImportOptions,
  parseCSV,
  parseJSON,
  exportToCSV,
  exportToJSON,
} from './data-import-export';

describe('Data Import/Export - Smoke Tests', () => {
  describe('Basic Functions', () => {
    it('should get supported tables', () => {
      const tables = getSupportedTables();
      expect(Array.isArray(tables)).toBe(true);
      expect(tables.length).toBeGreaterThan(0);
      expect(tables).toContain('agents');
    });

    it('should validate supported tables', () => {
      expect(isValidTable('agents')).toBe(true);
      expect(isValidTable('user_preferences')).toBe(true);
      expect(isValidTable('invalid_table')).toBe(false);
    });

    it('should validate export options', () => {
      const validOptions = validateExportOptions({
        format: 'json',
        tables: ['agents'],
      });
      expect(validOptions.valid).toBe(true);
      expect(validOptions.errors).toHaveLength(0);

      const invalidOptions = validateExportOptions({
        format: 'xml' as any,
        tables: [],
      });
      expect(invalidOptions.valid).toBe(false);
      expect(invalidOptions.errors.length).toBeGreaterThan(0);
    });

    it('should validate import options', () => {
      const validOptions = validateImportOptions({
        format: 'json',
        mode: 'upsert',
      });
      expect(validOptions.valid).toBe(true);
      expect(validOptions.errors).toHaveLength(0);

      const invalidOptions = validateImportOptions({
        format: 'xml' as any,
        mode: 'invalid' as any,
      });
      expect(invalidOptions.valid).toBe(false);
      expect(invalidOptions.errors.length).toBeGreaterThan(0);
    });
  });

  describe('CSV Parsing', () => {
    it('should parse simple CSV', () => {
      const csv = `# Table: test

id,name
1,Alice
2,Bob
`;
      const result = parseCSV(csv);
      expect(result).toHaveProperty('test');
      expect(Array.isArray(result.test)).toBe(true);
      expect(result.test).toHaveLength(2);
      expect(result.test[0]).toEqual({ id: '1', name: 'Alice' });
    });

    it('should handle CSV with quoted values', () => {
      const csv = `# Table: test

id,description
1,"Item with, comma"
2,"Normal item"
`;
      const result = parseCSV(csv);
      expect(result.test[0].description).toBe('Item with, comma');
      expect(result.test[1].description).toBe('Normal item');
    });
  });

  describe('JSON Parsing', () => {
    it('should parse valid JSON', () => {
      const json = JSON.stringify({
        format: 'json',
        tables: ['test'],
        data: { test: [{ id: '1', name: 'Test' }] },
        stats: { totalRows: 1, tables: { test: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      });
      const result = parseJSON(json);
      expect(result.tables).toEqual(['test']);
      expect(result.data.test[0].name).toBe('Test');
    });
  });

  describe('CSV Export', () => {
    it('should convert data to CSV', () => {
      const data = {
        format: 'json' as const,
        tables: ['test'],
        data: {
          test: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' },
          ],
        },
        stats: { totalRows: 2, tables: { test: 2 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };
      const csv = exportToCSV(data);
      expect(csv).toContain('# Table: test');
      expect(csv).toContain('id,name');
      expect(csv).toContain('1,Alice');
      expect(csv).toContain('2,Bob');
    });

    it('should handle CSV escaping', () => {
      const data = {
        format: 'json' as const,
        tables: ['test'],
        data: {
          test: [{ id: '1', name: 'Name, With, Commas' }],
        },
        stats: { totalRows: 1, tables: { test: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };
      const csv = exportToCSV(data);
      expect(csv).toContain('"Name, With, Commas"');
    });
  });

  describe('JSON Export', () => {
    it('should convert data to JSON', () => {
      const data = {
        format: 'json' as const,
        tables: ['test'],
        data: { test: [{ id: '1', name: 'Test' }] },
        stats: { totalRows: 1, tables: { test: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };
      const json = exportToJSON(data);
      const parsed = JSON.parse(json);
      expect(parsed.tables).toEqual(['test']);
      expect(parsed.data.test[0].name).toBe('Test');
    });
  });
});
