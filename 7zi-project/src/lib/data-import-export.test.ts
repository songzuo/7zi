/**
 * Tests for Data Import/Export Module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  exportData,
  exportToCSV,
  exportToJSON,
  importData,
  parseCSV,
  parseJSON,
  getSupportedTables,
  isValidTable,
  validateExportOptions,
  validateImportOptions,
} from '@/lib/data-import-export';

// Mock database
vi.mock('@/lib/db', () => ({
  getDatabaseAsync: vi.fn(),
}));

describe('Data Import/Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getSupportedTables', () => {
    it('should return list of supported tables', () => {
      const tables = getSupportedTables();
      expect(tables).toEqual([
        'agents',
        'agent_tokens',
        'agent_data_access',
        'user_preferences',
        'audit_logs',
      ]);
    });
  });

  describe('isValidTable', () => {
    it('should return true for supported tables', () => {
      expect(isValidTable('agents')).toBe(true);
      expect(isValidTable('user_preferences')).toBe(true);
    });

    it('should return false for unsupported tables', () => {
      expect(isValidTable('unsupported_table')).toBe(false);
      expect(isValidTable('')).toBe(false);
    });
  });

  describe('validateExportOptions', () => {
    it('should validate correct export options', () => {
      const options = {
        format: 'json',
        tables: ['agents'],
      };

      const result = validateExportOptions(options);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid format', () => {
      const options = {
        format: 'xml',
        tables: ['agents'],
      };

      const result = validateExportOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid format: xml. Must be \'csv\' or \'json\'');
    });

    it('should reject empty tables array', () => {
      const options = {
        format: 'json',
        tables: [],
      };

      const result = validateExportOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one table must be specified');
    });

    it('should reject unsupported table', () => {
      const options = {
        format: 'json',
        tables: ['unsupported_table'],
      };

      const result = validateExportOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unsupported table: unsupported_table');
    });
  });

  describe('validateImportOptions', () => {
    it('should validate correct import options', () => {
      const options = {
        format: 'json',
        mode: 'upsert',
      };

      const result = validateImportOptions(options);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid mode', () => {
      const options = {
        format: 'json',
        mode: 'invalid',
      };

      const result = validateImportOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid mode: invalid');
    });

    it('should reject invalid batch size', () => {
      const options = {
        format: 'json',
        mode: 'upsert',
        batchSize: 2000,
      };

      const result = validateImportOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid batchSize: 2000');
    });
  });

  describe('parseCSV', () => {
    it('should parse simple CSV with one table', () => {
      const csv = `# Table: agents

id,name,type
agent-1,Agent 1,worker
agent-2,Agent 2,worker
`;

      const result = parseCSV(csv);

      expect(result).toHaveProperty('agents');
      expect(result.agents).toHaveLength(2);
      expect(result.agents[0]).toEqual({
        id: 'agent-1',
        name: 'Agent 1',
        type: 'worker',
      });
    });

    it('should handle quoted values with commas', () => {
      const csv = `# Table: agents

id,name,description
agent-1,Agent 1,"Agent with, comma"
agent-2,Agent 2,"Normal description"
`;

      const result = parseCSV(csv);

      expect(result.agents[0]).toEqual({
        id: 'agent-1',
        name: 'Agent 1',
        description: 'Agent with, comma',
      });
    });

    it('should handle quoted values with quotes', () => {
      const csv = `# Table: agents

id,name,description
agent-1,Agent 1,"Agent with ""quotes"""
`;

      const result = parseCSV(csv);

      expect(result.agents[0]).toEqual({
        id: 'agent-1',
        name: 'Agent 1',
        description: 'Agent with "quotes"',
      });
    });

    it('should handle multiple tables', () => {
      const csv = `# Table: agents

id,name
agent-1,Agent 1

# Table: user_preferences

id,key,value
pref-1,theme,dark
`;

      const result = parseCSV(csv);

      expect(result).toHaveProperty('agents');
      expect(result).toHaveProperty('user_preferences');
      expect(result.agents).toHaveLength(1);
      expect(result.user_preferences).toHaveLength(1);
    });

    it('should handle empty tables', () => {
      const csv = `# Table: agents (empty)
`;

      const result = parseCSV(csv);

      expect(result).toHaveProperty('agents');
      expect(result.agents).toHaveLength(0);
    });
  });

  describe('parseJSON', () => {
    it('should parse valid JSON export', () => {
      const json = JSON.stringify({
        format: 'json',
        tables: ['agents'],
        data: {
          agents: [
            { id: 'agent-1', name: 'Agent 1', type: 'worker' },
          ],
        },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      });

      const result = parseJSON(json);

      expect(result.format).toBe('json');
      expect(result.tables).toEqual(['agents']);
      expect(result.data.agents).toHaveLength(1);
      expect(result.data.agents[0].id).toBe('agent-1');
    });

    it('should throw on invalid JSON', () => {
      const json = 'invalid json';

      expect(() => parseJSON(json)).toThrow();
    });
  });

  describe('exportToCSV', () => {
    it('should convert export result to CSV format', () => {
      const data = {
        format: 'json',
        tables: ['agents'],
        data: {
          agents: [
            { id: 'agent-1', name: 'Agent 1', type: 'worker' },
            { id: 'agent-2', name: 'Agent 2', type: 'assistant' },
          ],
        },
        stats: { totalRows: 2, tables: { agents: 2 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const csv = exportToCSV(data);

      expect(csv).toContain('# Table: agents');
      expect(csv).toContain('id,name,type');
      expect(csv).toContain('agent-1,Agent 1,worker');
      expect(csv).toContain('agent-2,Agent 2,assistant');
    });

    it('should handle empty tables', () => {
      const data = {
        format: 'json',
        tables: ['agents'],
        data: {
          agents: [],
        },
        stats: { totalRows: 0, tables: { agents: 0 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const csv = exportToCSV(data);

      expect(csv).toContain('# Table: agents (empty)');
    });

    it('should escape values with commas', () => {
      const data = {
        format: 'json',
        tables: ['agents'],
        data: {
          agents: [
            { id: 'agent-1', name: 'Agent, With, Commas', type: 'worker' },
          ],
        },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const csv = exportToCSV(data);

      expect(csv).toContain('"Agent, With, Commas"');
    });

    it('should escape values with quotes', () => {
      const data = {
        format: 'json',
        tables: ['agents'],
        data: {
          agents: [
            { id: 'agent-1', name: 'Agent "With Quotes"', type: 'worker' },
          ],
        },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const csv = exportToCSV(data);

      expect(csv).toContain('"Agent ""With Quotes"""');
    });

    it('should handle null values', () => {
      const data = {
        format: 'json',
        tables: ['agents'],
        data: {
          agents: [
            { id: 'agent-1', name: 'Agent 1', description: null },
          ],
        },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const csv = exportToCSV(data);

      expect(csv).toContain('agent-1,Agent 1,');
    });
  });

  describe('exportToJSON', () => {
    it('should convert export result to JSON format', () => {
      const data = {
        format: 'json',
        tables: ['agents'],
        data: {
          agents: [
            { id: 'agent-1', name: 'Agent 1', type: 'worker' },
          ],
        },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const json = exportToJSON(data);

      const parsed = JSON.parse(json);
      expect(parsed.format).toBe('json');
      expect(parsed.tables).toEqual(['agents']);
      expect(parsed.data.agents).toHaveLength(1);
    });

    it('should produce valid JSON', () => {
      const data = {
        format: 'json',
        tables: ['agents'],
        data: { agents: [] },
        stats: { totalRows: 0, tables: { agents: 0 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const json = exportToJSON(data);

      expect(() => JSON.parse(json)).not.toThrow();
    });
  });
});
