/**
 * Tests for Data Export API Route
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/data/export/route';
import { NextRequest } from 'next/server';

// Mock the data import/export module
vi.mock('@/lib/data-import-export', () => ({
  exportData: vi.fn(),
  exportToCSV: vi.fn(),
  exportToJSON: vi.fn(),
  getSupportedTables: vi.fn(),
  getExportFileName: vi.fn(),
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
  exportData,
  exportToCSV,
  exportToJSON,
  getSupportedTables,
  getExportFileName,
} from '@/lib/data-import-export';

describe('/api/data/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupportedTables.mockReturnValue([
      'agents',
      'agent_tokens',
      'user_preferences',
    ]);
    getExportFileName.mockReturnValue('test-export.json');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET', () => {
    it('should return supported tables and usage information', async () => {
      const request = new NextRequest('http://localhost/api/data/export');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Data export API');
      expect(data.supportedTables).toEqual([
        'agents',
        'agent_tokens',
        'user_preferences',
      ]);
      expect(data.usage).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      getSupportedTables.mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost/api/data/export');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST', () => {
    it('should export data in JSON format', async () => {
      const mockExportResult = {
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

      exportData.mockResolvedValue(mockExportResult);
      exportToJSON.mockReturnValue('{"format":"json"}');

      const request = new NextRequest('http://localhost/api/data/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          tables: ['agents'],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(exportData).toHaveBeenCalledWith({
        format: 'json',
        tables: ['agents'],
        filters: undefined,
        includeSchema: false,
      });
      expect(exportToJSON).toHaveBeenCalledWith(mockExportResult);
    });

    it('should export data in CSV format', async () => {
      const mockExportResult = {
        format: 'csv' as const,
        tables: ['agents'],
        data: {
          agents: [
            { id: 'agent-1', name: 'Agent 1', type: 'worker' },
          ],
        },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      exportData.mockResolvedValue(mockExportResult);
      exportToCSV.mockReturnValue('id,name\nagent-1,Agent 1');
      getExportFileName.mockReturnValue('test-export.csv');

      const request = new NextRequest('http://localhost/api/data/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          tables: ['agents'],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
      expect(exportToCSV).toHaveBeenCalledWith(mockExportResult);
    });

    it('should handle validation errors', async () => {
      const request = new NextRequest('http://localhost/api/data/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'invalid',
          tables: ['agents'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
    });

    it('should handle empty tables array', async () => {
      const request = new NextRequest('http://localhost/api/data/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          tables: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
    });

    it('should handle export errors', async () => {
      exportData.mockRejectedValue(new Error('Export failed'));

      const request = new NextRequest('http://localhost/api/data/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          tables: ['agents'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Export failed');
    });

    it('should support filters in export options', async () => {
      const mockExportResult = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [] },
        stats: { totalRows: 0, tables: { agents: 0 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      exportData.mockResolvedValue(mockExportResult);
      exportToJSON.mockReturnValue('{"format":"json"}');

      const request = new NextRequest('http://localhost/api/data/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          tables: ['agents'],
          filters: [
            {
              table: 'agents',
              where: 'status = ?',
              params: ['active'],
              limit: 100,
            },
          ],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(exportData).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({
              table: 'agents',
              where: 'status = ?',
              params: ['active'],
              limit: 100,
            }),
          ]),
        }),
      );
    });

    it('should support includeSchema option', async () => {
      const mockExportResult = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [] },
        stats: { totalRows: 0, tables: { agents: 0 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      exportData.mockResolvedValue(mockExportResult);
      exportToJSON.mockReturnValue('{"format":"json"}');

      const request = new NextRequest('http://localhost/api/data/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          tables: ['agents'],
          includeSchema: true,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(exportData).toHaveBeenCalledWith(
        expect.objectContaining({
          includeSchema: true,
        }),
      );
    });
  });
});
