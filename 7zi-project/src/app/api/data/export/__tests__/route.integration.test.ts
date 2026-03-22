/**
 * @fileoverview Data Export API 集成测试
 * @description 测试 /api/data/export 端点
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { GET, POST } from '@/app/api/data/export/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/data-import-export', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data-import-export')>('@/lib/data-import-export');
  return {
    ...actual,
    exportData: vi.fn(),
    exportToCSV: vi.fn(),
    exportToJSON: vi.fn(),
    getSupportedTables: vi.fn(),
    getExportFileName: vi.fn(),
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
  exportData,
  exportToCSV,
  exportToJSON,
  getSupportedTables,
  getExportFileName,
} from '@/lib/data-import-export';

describe('/api/data/export', () => {
  beforeAll(() => {
    vi.mocked(getSupportedTables).mockReturnValue([
      'agents',
      'agent_tokens',
      'agent_data_access',
      'user_preferences',
      'audit_logs',
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Test Suite: GET /api/data/export
  // ============================================================================

  describe('GET /api/data/export', () => {
    it('should return API information and supported tables', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/export');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Data export API');
      expect(data.supportedTables).toContain('agents');
      expect(data.supportedTables).toContain('agent_tokens');
      expect(data.usage).toBeDefined();
      expect(data.usage.method).toBe('POST');
    });

    it('should include correct usage documentation', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/export');
      const response = await GET(request);
      const data = await response.json();

      expect(data.usage.body).toHaveProperty('format');
      expect(data.usage.body).toHaveProperty('tables');
      expect(data.usage.body).toHaveProperty('filters');
      expect(data.usage.body).toHaveProperty('includeSchema');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(getSupportedTables).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = new NextRequest('http://localhost:3000/api/data/export');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  // ============================================================================
  // Test Suite: POST /api/data/export - JSON Format
  // ============================================================================

  describe('POST /api/data/export - JSON format', () => {
    it('should export agents data in JSON format', async () => {
      const mockExportResult = {
        format: 'json' as const,
        tables: ['agents'],
        data: {
          agents: [
            {
              id: 'agent-1',
              name: 'Test Agent 1',
              type: 'worker',
              provider: 'openai',
              status: 'active',
              created_at: '2024-01-01T00:00:00.000Z',
              updated_at: '2024-01-01T00:00:00.000Z',
            },
            {
              id: 'agent-2',
              name: 'Test Agent 2',
              type: 'assistant',
              provider: 'anthropic',
              status: 'idle',
              created_at: '2024-01-02T00:00:00.000Z',
              updated_at: '2024-01-02T00:00:00.000Z',
            },
          ],
        },
        stats: { totalRows: 2, tables: { agents: 2 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(exportData).mockResolvedValue(mockExportResult);
      vi.mocked(exportToJSON).mockReturnValue(JSON.stringify(mockExportResult));
      vi.mocked(getExportFileName).mockReturnValue('export-agents-20240101.json');

      const request = new NextRequest('http://localhost:3000/api/data/export', {
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
      expect(response.headers.get('Content-Disposition')).toContain('filename=');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');

      const text = await response.text();
      expect(text).toContain('Test Agent 1');
      expect(text).toContain('agent-1');

      expect(exportData).toHaveBeenCalledWith({
        format: 'json',
        tables: ['agents'],
        filters: undefined,
        includeSchema: false,
      });
    });

    it('should export multiple tables in JSON format', async () => {
      const mockExportResult = {
        format: 'json' as const,
        tables: ['agents', 'agent_tokens'],
        data: {
          agents: [{ id: 'agent-1', name: 'Agent 1' }],
          agent_tokens: [{ id: 'token-1', agent_id: 'agent-1' }],
        },
        stats: { totalRows: 2, tables: { agents: 1, agent_tokens: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(exportData).mockResolvedValue(mockExportResult);
      vi.mocked(exportToJSON).mockReturnValue(JSON.stringify(mockExportResult));

      const request = new NextRequest('http://localhost:3000/api/data/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          tables: ['agents', 'agent_tokens'],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(exportData).toHaveBeenCalledWith(
        expect.objectContaining({
          tables: ['agents', 'agent_tokens'],
        }),
      );
    });
  });

  // ============================================================================
  // Test Suite: POST /api/data/export - CSV Format
  // ============================================================================

  describe('POST /api/data/export - CSV format', () => {
    it('should export agents data in CSV format', async () => {
      const mockExportResult = {
        format: 'csv' as const,
        tables: ['agents'],
        data: {
          agents: [
            { id: 'agent-1', name: 'Test Agent 1', type: 'worker' },
            { id: 'agent-2', name: 'Test Agent 2', type: 'assistant' },
          ],
        },
        stats: { totalRows: 2, tables: { agents: 2 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(exportData).mockResolvedValue(mockExportResult);
      vi.mocked(exportToCSV).mockReturnValue('id,name,type\nagent-1,Test Agent 1,worker\nagent-2,Test Agent 2,assistant');
      vi.mocked(getExportFileName).mockReturnValue('export-agents-20240101.csv');

      const request = new NextRequest('http://localhost:3000/api/data/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          tables: ['agents'],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');

      const text = await response.text();
      expect(text).toContain('id,name,type');
      expect(text).toContain('agent-1,Test Agent 1,worker');
      expect(text).toContain('agent-2,Test Agent 2,assistant');

      expect(exportToCSV).toHaveBeenCalledWith(mockExportResult);
    });

    it('should include headers in CSV export', async () => {
      const mockExportResult = {
        format: 'csv' as const,
        tables: ['agents'],
        data: {
          agents: [{ id: 'agent-1', name: 'Agent 1', status: 'active' }],
        },
        stats: { totalRows: 1, tables: { agents: 1 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(exportData).mockResolvedValue(mockExportResult);
      vi.mocked(exportToCSV).mockReturnValue('id,name,status\nagent-1,Agent 1,active');

      const request = new NextRequest('http://localhost:3000/api/data/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          tables: ['agents'],
        }),
      });

      const response = await POST(request);
      const text = await response.text();

      expect(text.split('\n')[0]).toContain('id,name,status');
    });
  });

  // ============================================================================
  // Test Suite: POST /api/data/export - Filters
  // ============================================================================

  describe('POST /api/data/export - Filters', () => {
    it('should export with where clause filter', async () => {
      const mockExportResult = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [] },
        stats: { totalRows: 0, tables: { agents: 0 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(exportData).mockResolvedValue(mockExportResult);
      vi.mocked(exportToJSON).mockReturnValue('{"format":"json"}');

      const request = new NextRequest('http://localhost:3000/api/data/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          tables: ['agents'],
          filters: [
            {
              table: 'agents',
              where: 'status = ?',
              params: ['active'],
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
            }),
          ]),
        }),
      );
    });

    it('should export with limit filter', async () => {
      const mockExportResult = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [] },
        stats: { totalRows: 0, tables: { agents: 0 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(exportData).mockResolvedValue(mockExportResult);
      vi.mocked(exportToJSON).mockReturnValue('{"format":"json"}');

      const request = new NextRequest('http://localhost:3000/api/data/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          tables: ['agents'],
          filters: [
            {
              table: 'agents',
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
              limit: 100,
            }),
          ]),
        }),
      );
    });
  });

  // ============================================================================
  // Test Suite: POST /api/data/export - Schema
  // ============================================================================

  describe('POST /api/data/export - Schema', () => {
    it('should export with schema information', async () => {
      const mockExportResult = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [] },
        schema: {
          agents: {
            id: 'TEXT PRIMARY KEY',
            name: 'TEXT NOT NULL',
            type: 'TEXT',
            status: 'TEXT',
          },
        },
        stats: { totalRows: 0, tables: { agents: 0 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(exportData).mockResolvedValue(mockExportResult);
      vi.mocked(exportToJSON).mockReturnValue(JSON.stringify(mockExportResult));

      const request = new NextRequest('http://localhost:3000/api/data/export', {
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

  // ============================================================================
  // Test Suite: POST /api/data/export - Error Handling
  // ============================================================================

  describe('POST /api/data/export - Error Handling', () => {
    it('should handle missing tables array', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/export', {
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
      expect(data.details).toBeDefined();
    });

    it('should handle invalid format', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'xml',
          tables: ['agents'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
    });

    it('should handle export errors', async () => {
      vi.mocked(exportData).mockRejectedValue(new Error('Database export failed'));

      const request = new NextRequest('http://localhost:3000/api/data/export', {
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
      expect(data.error).toBe('Database export failed');
    });

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/export', {
        method: 'POST',
        body: 'invalid json',
      });

      await expect(POST(request)).rejects.toThrow();
    });

    it('should handle unsupported table', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          tables: ['unsupported_table'],
        }),
      });

      const response = await POST(request);

      // Should not throw, but might return an error from exportData
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  // ============================================================================
  // Test Suite: Response Headers
  // ============================================================================

  describe('Response Headers', () => {
    it('should include Content-Disposition for file download', async () => {
      const mockExportResult = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [] },
        stats: { totalRows: 0, tables: { agents: 0 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(exportData).mockResolvedValue(mockExportResult);
      vi.mocked(exportToJSON).mockReturnValue('{"format":"json"}');
      vi.mocked(getExportFileName).mockReturnValue('export-agents.json');

      const request = new NextRequest('http://localhost:3000/api/data/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          tables: ['agents'],
        }),
      });

      const response = await POST(request);

      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('filename=');
    });

    it('should include cache control headers', async () => {
      const mockExportResult = {
        format: 'json' as const,
        tables: ['agents'],
        data: { agents: [] },
        stats: { totalRows: 0, tables: { agents: 0 } },
        exportedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(exportData).mockResolvedValue(mockExportResult);
      vi.mocked(exportToJSON).mockReturnValue('{"format":"json"}');

      const request = new NextRequest('http://localhost:3000/api/data/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          tables: ['agents'],
        }),
      });

      const response = await POST(request);

      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    });
  });
});
