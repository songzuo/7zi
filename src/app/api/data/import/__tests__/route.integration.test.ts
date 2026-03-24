/**
 * @fileoverview Data Import API 集成测试
 * @description 测试 /api/data/import 端点
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/data/import/route';
import { NextRequest } from 'next/server';
import type { ImportExample } from '@/app/api/data/import/route';

// Mock dependencies
vi.mock('@/lib/data-import-export', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data-import-export')>('@/lib/data-import-export');
  return {
    ...actual,
    importData: vi.fn(),
    parseCSV: vi.fn(),
    parseJSON: vi.fn(),
    validateImportOptions: vi.fn(),
    createBackup: vi.fn(),
  };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  importData,
  parseCSV,
  parseJSON,
  validateImportOptions,
  createBackup,
} from '@/lib/data-import-export';

describe('/api/data/import', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Test Suite: GET /api/data/import
  // ============================================================================

  describe('GET /api/data/import', () => {
    it('should return API information and import modes', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/import');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Data import API');
      expect(data.importModes).toBeDefined();
      expect(data.importModes.insert).toBeDefined();
      expect(data.importModes.update).toBeDefined();
      expect(data.importModes.upsert).toBeDefined();
      expect(data.importModes.replace).toBeDefined();
    });

    it('should include usage documentation', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/import');
      const response = await GET(request);
      const data = await response.json();

      expect(data.usage).toBeDefined();
      expect(data.usage.method).toBe('POST');
      expect(data.usage.body).toHaveProperty('format');
      expect(data.usage.body).toHaveProperty('mode');
      expect(data.usage.body).toHaveProperty('dryRun');
      expect(data.usage.body).toHaveProperty('skipDuplicates');
    });

    it('should include example requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/import');
      const response = await GET(request);
      const data = await response.json();

      expect(data.examples).toBeDefined();
      expect(Array.isArray(data.examples)).toBe(true);
      expect(data.examples.length).toBeGreaterThan(0);

      const jsonExample = data.examples.find((e: ImportExample) => e.body?.format === 'json');
      expect(jsonExample).toBeDefined();

      const csvExample = data.examples.find((e: ImportExample) => e.body?.format === 'csv');
      expect(csvExample).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/import');
      request.json = vi.fn().mockRejectedValue(new Error('Test error'));

      const response = await GET(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  // ============================================================================
  // Test Suite: POST /api/data/import - JSON Format
  // ============================================================================

  describe('POST /api/data/import - JSON format', () => {
    it('should import agents data in JSON format with upsert mode', async () => {
      const importDataMock = {
        id: 'agent-1',
        name: 'Test Agent 1',
        type: 'worker',
        provider: 'openai',
        status: 'active',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const parsedData = {
        format: 'json' as const,
        tables: ['agents'],
        data: {
          agents: [importDataMock],
        },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const importResult = {
        success: true,
        mode: 'upsert' as const,
        dryRun: false,
        stats: {
          totalRows: 1,
          tables: {
            agents: { inserted: 1, updated: 0, skipped: 0, errors: 0 },
          },
        },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue(parsedData);
      vi.mocked(validateImportOptions).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(importData).mockResolvedValue(importResult);

      const requestBody = {
        format: 'json',
        mode: 'upsert',
        dryRun: false,
        data: parsedData,
      };

      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.totalRows).toBe(1);
      expect(data.message).toBe('Data imported successfully');

      expect(parseJSON).toHaveBeenCalledWith(requestBody.data);
      expect(validateImportOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'json',
          mode: 'upsert',
          dryRun: false,
        }),
      );
      expect(importData).toHaveBeenCalledWith(parsedData, expect.any(Object));
    });

    it('should import multiple tables in JSON format', async () => {
      const parsedData = {
        format: 'json' as const,
        tables: ['agents', 'agent_tokens'],
        data: {
          agents: [{ id: 'agent-1', name: 'Agent 1' }],
          agent_tokens: [{ id: 'token-1', agent_id: 'agent-1' }],
        },
        stats: { totalRows: 2, tables: { agents: 1, agent_tokens: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const importResult = {
        success: true,
        mode: 'upsert' as const,
        dryRun: false,
        stats: {
          totalRows: 2,
          tables: {
            agents: { inserted: 1, updated: 0, skipped: 0, errors: 0 },
            agent_tokens: { inserted: 1, updated: 0, skipped: 0, errors: 0 },
          },
        },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue(parsedData);
      vi.mocked(validateImportOptions).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(importData).mockResolvedValue(importResult);

      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'upsert',
          data: parsedData,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats.totalRows).toBe(2);
      expect(data.stats.tables.agents.inserted).toBe(1);
      expect(data.stats.tables.agent_tokens.inserted).toBe(1);
    });
  });

  // ============================================================================
  // Test Suite: POST /api/data/import - CSV Format
  // ============================================================================

  describe('POST /api/data/import - CSV format', () => {
    it('should import agents data in CSV format', async () => {
      const csvData = '# Table: agents\n\nid,name,type,provider,status\nagent-1,Agent 1,worker,openai,active\nagent-2,Agent 2,assistant,anthropic,idle';

      const parsedDataResult = {
        agents: [
          { id: 'agent-1', name: 'Agent 1', type: 'worker', provider: 'openai', status: 'active' },
          { id: 'agent-2', name: 'Agent 2', type: 'assistant', provider: 'anthropic', status: 'idle' },
        ],
      };

      const importResult = {
        success: true,
        mode: 'insert' as const,
        dryRun: false,
        stats: {
          totalRows: 2,
          tables: {
            agents: { inserted: 2, updated: 0, skipped: 0, errors: 0 },
          },
        },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseCSV).mockReturnValue(parsedDataResult);
      vi.mocked(validateImportOptions).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(importData).mockResolvedValue(importResult);

      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          mode: 'insert',
          data: csvData,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats.totalRows).toBe(2);
      expect(parseCSV).toHaveBeenCalledWith(csvData);
    });

    it('should handle CSV with header row', async () => {
      const csvData = 'id,name,type,provider,status\nagent-1,Agent 1,worker,openai,active';

      const parsedDataResult = {
        agents: [{ id: 'agent-1', name: 'Agent 1', type: 'worker', provider: 'openai', status: 'active' }],
      };

      const importResult = {
        success: true,
        mode: 'insert' as const,
        dryRun: false,
        stats: {
          totalRows: 1,
          tables: {
            agents: { inserted: 1, updated: 0, skipped: 0, errors: 0 },
          },
        },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseCSV).mockReturnValue(parsedDataResult);
      vi.mocked(validateImportOptions).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(importData).mockResolvedValue(importResult);

      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          mode: 'insert',
          data: csvData,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  // ============================================================================
  // Test Suite: POST /api/data/import - Import Modes
  // ============================================================================

  describe('POST /api/data/import - Import Modes', () => {
    it('should import in insert mode', async () => {
      const parsedData = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [{ id: 'agent-1', name: 'Agent 1' }] },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const importResult = {
        success: true,
        mode: 'insert' as const,
        dryRun: false,
        stats: { totalRows: 1, tables: { agents: { inserted: 1, updated: 0, skipped: 0, errors: 0 } } },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue(parsedData);
      vi.mocked(validateImportOptions).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(importData).mockResolvedValue(importResult);

      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'insert',
          data: parsedData,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.tables.agents.inserted).toBe(1);
    });

    it('should import in update mode', async () => {
      const parsedData = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [{ id: 'agent-1', name: 'Updated Agent' }] },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const importResult = {
        success: true,
        mode: 'update' as const,
        dryRun: false,
        stats: { totalRows: 1, tables: { agents: { inserted: 0, updated: 1, skipped: 0, errors: 0 } } },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue(parsedData);
      vi.mocked(validateImportOptions).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(importData).mockResolvedValue(importResult);

      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'update',
          data: parsedData,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.tables.agents.updated).toBe(1);
    });

    it('should import in replace mode', async () => {
      const parsedData = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [{ id: 'agent-1', name: 'New Agent' }] },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const importResult = {
        success: true,
        mode: 'replace' as const,
        dryRun: false,
        stats: { totalRows: 1, tables: { agents: { inserted: 1, updated: 0, skipped: 0, errors: 0 } } },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue(parsedData);
      vi.mocked(validateImportOptions).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(importData).mockResolvedValue(importResult);

      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'replace',
          data: parsedData,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(importData).toHaveBeenCalledWith(parsedData, expect.objectContaining({ mode: 'replace' }));
    });
  });

  // ============================================================================
  // Test Suite: POST /api/data/import - Dry Run
  // ============================================================================

  describe('POST /api/data/import - Dry Run', () => {
    it('should perform dry run without importing data', async () => {
      const parsedData = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [{ id: 'agent-1', name: 'Agent 1' }] },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const importResult = {
        success: true,
        mode: 'upsert' as const,
        dryRun: true,
        stats: { totalRows: 1, tables: { agents: { inserted: 1, updated: 0, skipped: 0, errors: 0 } } },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue(parsedData);
      vi.mocked(validateImportOptions).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(importData).mockResolvedValue(importResult);

      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'upsert',
          dryRun: true,
          data: parsedData,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Dry run completed. No data was imported.');
      expect(data.stats).toBeDefined();
      expect(importData).toHaveBeenCalledWith(parsedData, expect.objectContaining({ dryRun: true }));
      expect(createBackup).not.toHaveBeenCalled();
    });

    it('should not create backup when dryRun is true', async () => {
      const parsedData = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [{ id: 'agent-1', name: 'Agent 1' }] },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const importResult = {
        success: true,
        mode: 'upsert' as const,
        dryRun: true,
        stats: { totalRows: 1, tables: { agents: { inserted: 1, updated: 0, skipped: 0, errors: 0 } } },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue(parsedData);
      vi.mocked(validateImportOptions).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(importData).mockResolvedValue(importResult);

      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'upsert',
          dryRun: true,
          createBackup: true,
          data: parsedData,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(createBackup).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Test Suite: POST /api/data/import - Backup
  // ============================================================================

  describe('POST /api/data/import - Backup', () => {
    it('should create backup when createBackup is true', async () => {
      const parsedData = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [{ id: 'agent-1', name: 'Agent 1' }] },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const importResult = {
        success: true,
        mode: 'upsert' as const,
        dryRun: false,
        stats: { totalRows: 1, tables: { agents: { inserted: 1, updated: 0, skipped: 0, errors: 0 } } },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue(parsedData);
      vi.mocked(validateImportOptions).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(createBackup).mockResolvedValue('backup-20240101-120000');
      vi.mocked(importData).mockResolvedValue(importResult);

      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'upsert',
          dryRun: false,
          createBackup: true,
          data: parsedData,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.backup).toBe('backup-20240101-120000');
      expect(createBackup).toHaveBeenCalledWith(undefined);
    });

    it('should create backup with custom name', async () => {
      const parsedData = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [{ id: 'agent-1', name: 'Agent 1' }] },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const importResult = {
        success: true,
        mode: 'upsert' as const,
        dryRun: false,
        stats: { totalRows: 1, tables: { agents: { inserted: 1, updated: 0, skipped: 0, errors: 0 } } },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue(parsedData);
      vi.mocked(validateImportOptions).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(createBackup).mockResolvedValue('my-custom-backup');
      vi.mocked(importData).mockResolvedValue(importResult);

      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'upsert',
          dryRun: false,
          createBackup: true,
          backupName: 'my-custom-backup',
          data: parsedData,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.backup).toBe('my-custom-backup');
      expect(createBackup).toHaveBeenCalledWith('my-custom-backup');
    });
  });

  // ============================================================================
  // Test Suite: POST /api/data/import - Error Handling
  // ============================================================================

  describe('POST /api/data/import - Error Handling', () => {
    it('should handle validation errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'xml',  // Invalid format
          mode: 'upsert',
          data: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
    });

    it('should handle invalid JSON format', async () => {
      const parsedData = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [] },
        stats: { totalRows: 0, tables: { agents: 0 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue(parsedData);
      vi.mocked(validateImportOptions).mockReturnValue({
        valid: false,
        errors: ['Invalid batch size: must be between 1 and 1000'],
      });

      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'upsert',
          batchSize: 2000,  // Invalid batch size
          data: parsedData,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid import options');
      expect(data.details).toBeDefined();
    });

    it('should handle JSON parse errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: 'invalid json{{{',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to parse data');
    });

    it('should handle import errors', async () => {
      const parsedData = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [{ id: 'agent-1', name: 'Agent 1' }] },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue(parsedData);
      vi.mocked(validateImportOptions).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(importData).mockRejectedValue(new Error('Database import failed'));

      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'upsert',
          data: parsedData,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database import failed');
    });

    it('should handle partial success with errors', async () => {
      const parsedData = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [{ id: 'agent-1', name: 'Agent 1' }] },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const importResult = {
        success: false,
        mode: 'upsert' as const,
        dryRun: false,
        stats: {
          totalRows: 1,
          tables: {
            agents: { inserted: 0, updated: 0, skipped: 1, errors: 1 },
          },
        },
        errors: ['Duplicate key violation'],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue(parsedData);
      vi.mocked(validateImportOptions).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(importData).mockResolvedValue(importResult);

      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'upsert',
          data: parsedData,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.errors).toBeDefined();
      expect(data.errors.length).toBeGreaterThan(0);
      expect(data.message).toBe('Data imported with errors');
    });
  });

  // ============================================================================
  // Test Suite: POST /api/data/import - Options
  // ============================================================================

  describe('POST /api/data/import - Additional Options', () => {
    it('should support skipDuplicates option', async () => {
      const parsedData = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [{ id: 'agent-1', name: 'Agent 1' }] },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const importResult = {
        success: true,
        mode: 'upsert' as const,
        dryRun: false,
        stats: { totalRows: 1, tables: { agents: { inserted: 0, updated: 0, skipped: 1, errors: 0 } } },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue(parsedData);
      vi.mocked(validateImportOptions).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(importData).mockResolvedValue(importResult);

      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'upsert',
          skipDuplicates: true,
          data: parsedData,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(importData).toHaveBeenCalledWith(parsedData, expect.objectContaining({ skipDuplicates: true }));
    });

    it('should support batchSize option', async () => {
      const parsedData = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [{ id: 'agent-1', name: 'Agent 1' }] },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      const importResult = {
        success: true,
        mode: 'upsert' as const,
        dryRun: false,
        stats: { totalRows: 1, tables: { agents: { inserted: 1, updated: 0, skipped: 0, errors: 0 } } },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue(parsedData);
      vi.mocked(validateImportOptions).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(importData).mockResolvedValue(importResult);

      const request = new NextRequest('http://localhost:3000/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'upsert',
          batchSize: 50,
          data: parsedData,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(importData).toHaveBeenCalledWith(parsedData, expect.objectContaining({ batchSize: 50 }));
    });
  });
});
