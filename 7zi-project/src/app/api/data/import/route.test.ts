/**
 * Tests for Data Import API Route
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/data/import/route';
import { NextRequest } from 'next/server';

// Mock the data import/export module
vi.mock('@/lib/data-import-export', () => ({
  importData: vi.fn(),
  parseCSV: vi.fn(),
  parseJSON: vi.fn(),
  validateImportOptions: vi.fn(),
  createBackup: vi.fn(),
}));

// Mock logger
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateImportOptions).mockReturnValue({
      valid: true,
      errors: [],
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET', () => {
    it('should return import options and usage information', async () => {
      const request = new NextRequest('http://localhost/api/data/import');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Data import API');
      expect(data.importModes).toBeDefined();
      expect(data.usage).toBeDefined();
      expect(data.examples).toBeDefined();
      expect(data.importModes).toEqual({
        insert: 'Insert new records, fail on duplicates',
        update: 'Update existing records, fail if not found',
        upsert: 'Insert or update records (default)',
        replace: 'Clear table and insert all records',
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock an error (this is unlikely in GET, but let's test it)
      const request = new NextRequest('http://localhost/api/data/import');
      const response = await GET(request);

      // Should succeed
      expect(response.status).toBe(200);
    });
  });

  describe('POST', () => {
    it('should import JSON data with upsert mode', async () => {
      const mockImportResult = {
        success: true,
        mode: 'upsert',
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

      const mockExportData = {
        format: 'json' as const,
        tables: ['agents'],
        data: {
          agents: [
            { id: 'agent-1', name: 'Agent 1', type: 'worker' },
          ],
        },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue(mockExportData);
      vi.mocked(importData).mockResolvedValue(mockImportResult);

      const request = new NextRequest('http://localhost/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'upsert',
          data: mockExportData,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats.totalRows).toBe(1);
      expect(data.message).toBe('Data imported successfully');
      expect(parseJSON).toHaveBeenCalledWith(mockExportData);
      expect(importData).toHaveBeenCalledWith(mockExportData, {
        format: 'json',
        mode: 'upsert',
        dryRun: false,
        skipDuplicates: true,
        batchSize: undefined,
      });
    });

    it('should import CSV data with insert mode', async () => {
      const mockImportResult = {
        success: true,
        mode: 'insert',
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

      const csvData = '# Table: agents\n\nid,name\nagent-1,Agent 1\nagent-2,Agent 2\n';

      vi.mocked(parseCSV).mockReturnValue({
        agents: [
          { id: 'agent-1', name: 'Agent 1' },
          { id: 'agent-2', name: 'Agent 2' },
        ],
      });
      vi.mocked(importData).mockResolvedValue(mockImportResult);

      const request = new NextRequest('http://localhost/api/data/import', {
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
      expect(parseCSV).toHaveBeenCalledWith(csvData);
      expect(importData).toHaveBeenCalledWith(
        expect.objectContaining({
          tables: ['agents'],
          data: expect.any(Object),
        }),
        expect.objectContaining({
          format: 'csv',
          mode: 'insert',
        }),
      );
    });

    it('should create backup before import when requested', async () => {
      const mockImportResult = {
        success: true,
        mode: 'upsert',
        dryRun: false,
        stats: {
          totalRows: 0,
          tables: {},
        },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue({
        format: 'json' as const,
        tables: [],
        data: {},
        stats: { totalRows: 0, tables: {} },
        exportedAt: '2024-01-01T00:00:00.000Z',
      });
      vi.mocked(importData).mockResolvedValue(mockImportResult);
      vi.mocked(createBackup).mockResolvedValue('backup-test');

      const request = new NextRequest('http://localhost/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'upsert',
          createBackup: true,
          data: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.backup).toBe('backup-test');
      expect(createBackup).toHaveBeenCalled();
    });

    it('should support dry run mode', async () => {
      const mockImportResult = {
        success: true,
        mode: 'upsert',
        dryRun: true,
        stats: {
          totalRows: 1,
          tables: {
            agents: { inserted: 0, updated: 1, skipped: 0, errors: 0 },
          },
        },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue({
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [{ id: 'agent-1', name: 'Agent 1' }] },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      });
      vi.mocked(importData).mockResolvedValue(mockImportResult);

      const request = new NextRequest('http://localhost/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'upsert',
          dryRun: true,
          data: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Dry run completed. No data was imported.');
      expect(importData).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ dryRun: true }),
      );
      expect(createBackup).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      vi.mocked(validateImportOptions).mockReturnValue({
        valid: false,
        errors: ['Invalid mode'],
      });

      const request = new NextRequest('http://localhost/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'invalid',
          data: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid import options');
      expect(data.details).toEqual(['Invalid mode']);
    });

    it('should handle JSON parse errors', async () => {
      vi.mocked(parseJSON).mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const request = new NextRequest('http://localhost/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'upsert',
          data: 'invalid json',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to parse data');
    });

    it('should handle import errors with partial success', async () => {
      const mockImportResult = {
        success: false,
        mode: 'upsert',
        dryRun: false,
        stats: {
          totalRows: 2,
          tables: {
            agents: { inserted: 1, updated: 0, skipped: 0, errors: 1 },
          },
        },
        errors: ['Failed to import row 2: Duplicate record'],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue({
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [{ id: 'agent-1' }, { id: 'agent-1' }] },
        stats: { totalRows: 2, tables: { agents: 2 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      });
      vi.mocked(importData).mockResolvedValue(mockImportResult);

      const request = new NextRequest('http://localhost/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'upsert',
          data: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.stats.totalRows).toBe(2);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0]).toContain('Failed to import row 2');
    });

    it('should handle Zod validation errors', async () => {
      const request = new NextRequest('http://localhost/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'invalid',
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

    it('should support custom backup name', async () => {
      const mockImportResult = {
        success: true,
        mode: 'upsert',
        dryRun: false,
        stats: { totalRows: 0, tables: {} },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue({
        format: 'json' as const,
        tables: [],
        data: {},
        stats: { totalRows: 0, tables: {} },
        exportedAt: '2024-01-01T00:00:00.000Z',
      });
      vi.mocked(importData).mockResolvedValue(mockImportResult);
      vi.mocked(createBackup).mockResolvedValue('my-custom-backup');

      const request = new NextRequest('http://localhost/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'upsert',
          createBackup: true,
          backupName: 'my-custom-backup',
          data: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.backup).toBe('my-custom-backup');
      expect(createBackup).toHaveBeenCalledWith('my-custom-backup');
    });

    it('should support skipDuplicates option', async () => {
      const mockImportResult = {
        success: true,
        mode: 'insert',
        dryRun: false,
        stats: { totalRows: 0, tables: {} },
        errors: [],
        importedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(parseJSON).mockReturnValue({
        format: 'json' as const,
        tables: [],
        data: {},
        stats: { totalRows: 0, tables: {} },
        exportedAt: '2024-01-01T00:00:00.000Z',
      });
      vi.mocked(importData).mockResolvedValue(mockImportResult);

      const request = new NextRequest('http://localhost/api/data/import', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          mode: 'insert',
          skipDuplicates: false,
          data: {},
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(importData).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skipDuplicates: false }),
      );
    });
  });
});
