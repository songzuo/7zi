/**
 * Tests for Analytics Export API Route
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST, GET } from './route';
import { NextRequest } from 'next/server';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock XLSX
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(() => {}),
  },
  write: vi.fn(() => Buffer.from('mock-excel-data')),
}));

// Mock error handler
vi.mock('@/lib/api/error-handler', () => ({
  createErrorResponse: vi.fn((error) => ({
    status: 500,
    json: async () => ({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }),
  })),
  createSuccessResponse: vi.fn((data) => ({
    status: 200,
    json: async () => ({
      success: true,
      data,
    }),
  })),
  createValidationError: vi.fn((message, details) => ({
    status: 400,
    json: async () => ({
      success: false,
      error: message,
      details,
    }),
  })),
}));

import { logger } from '@/lib/logger';

describe('POST /api/analytics/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('CSV Export', () => {
    it('should export data as CSV format', async () => {
      const mockData = [
        { timestamp: '2024-01-01', value: 100, label: 'Test' },
        { timestamp: '2024-01-02', value: 200, label: 'Test2' },
      ];

      const request = new NextRequest('http://localhost/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          data: mockData,
          filename: 'test-analytics',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(logger.info).toHaveBeenCalledWith(
        'Analytics data exported',
        expect.objectContaining({
          format: 'csv',
          dataSize: 2,
        })
      );
    });

    it('should handle special characters in CSV data', async () => {
      const mockData = [
        {
          timestamp: '2024-01-01',
          value: 100,
          label: 'Test, with comma',
          description: 'Test "quoted" text',
        },
      ];

      const request = new NextRequest('http://localhost/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          data: mockData,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
    });

    it('should support custom filename', async () => {
      const mockData = [{ timestamp: '2024-01-01', value: 100 }];

      const request = new NextRequest('http://localhost/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          data: mockData,
          filename: 'custom-export',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Disposition')).toContain('custom-export');
    });
  });

  describe('Excel Export', () => {
    it('should export data as Excel format', async () => {
      const mockData = [
        { timestamp: '2024-01-01', value: 100, label: 'Test' },
        { timestamp: '2024-01-02', value: 200, label: 'Test2' },
      ];

      const request = new NextRequest('http://localhost/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'xlsx',
          data: mockData,
          filename: 'test-analytics',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
    });

    it('should handle large datasets for Excel', async () => {
      const mockData = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: `2024-01-01`,
        value: i * 10,
        label: `Data point ${i}`,
      }));

      const request = new NextRequest('http://localhost/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'xlsx',
          data: mockData,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('JSON Export', () => {
    it('should export data as JSON format', async () => {
      const mockData = [
        { timestamp: '2024-01-01', value: 100, label: 'Test' },
        { timestamp: '2024-01-02', value: 200, label: 'Test2' },
      ];

      const request = new NextRequest('http://localhost/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          data: mockData,
          filename: 'test-analytics',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');

      const responseBody = await response.text();
      const parsedData = JSON.parse(responseBody);
      expect(parsedData).toEqual(mockData);
    });

    it('should output pretty JSON by default', async () => {
      const mockData = [{ timestamp: '2024-01-01', value: 100 }];

      const request = new NextRequest('http://localhost/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          data: mockData,
        }),
      });

      const response = await POST(request);
      const responseBody = await response.text();

      expect(responseBody).toContain('\n');
      expect(responseBody).toContain('  ');
    });
  });

  describe('Validation', () => {
    it('should reject unsupported format', async () => {
      const mockData = [{ timestamp: '2024-01-01', value: 100 }];

      const request = new NextRequest('http://localhost/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'pdf',
          data: mockData,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Unsupported export format');
    });

    it('should reject empty data array', async () => {
      const request = new NextRequest('http://localhost/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          data: [],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('No data to export');
    });

    it('should reject missing data', async () => {
      const request = new NextRequest('http://localhost/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost/api/analytics/export', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Additional Options', () => {
    it('should support includeHeaders option for CSV', async () => {
      const mockData = [{ timestamp: '2024-01-01', value: 100 }];

      const request = new NextRequest('http://localhost/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          data: mockData,
          includeHeaders: false,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const responseBody = await response.text();
      expect(responseBody).not.toContain('timestamp');
    });

    it('should support date range in filename', async () => {
      const mockData = [{ timestamp: '2024-01-01', value: 100 }];

      const request = new NextRequest('http://localhost/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          data: mockData,
          dateRange: {
            start: '2024-01-01',
            end: '2024-01-31',
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Disposition')).toContain('2024-01-01');
      expect(response.headers.get('Content-Disposition')).toContain('2024-01-31');
    });

    it('should include filters in log', async () => {
      const mockData = [{ timestamp: '2024-01-01', value: 100 }];

      const request = new NextRequest('http://localhost/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          data: mockData,
          filters: { metric: 'page_views' },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(logger.info).toHaveBeenCalledWith(
        'Analytics data exported',
        expect.objectContaining({
          filters: { metric: 'page_views' },
        })
      );
    });
  });

  describe('Cache Control', () => {
    it('should set cache control headers', async () => {
      const mockData = [{ timestamp: '2024-01-01', value: 100 }];

      const request = new NextRequest('http://localhost/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          data: mockData,
        }),
      });

      const response = await POST(request);

      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // The POST handler should handle invalid data and return error response
      const request = new NextRequest('http://localhost/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          data: null,
        }),
      });

      const response = await POST(request);

      // Should return 400 or 500 status
      expect([400, 500]).toContain(response.status);
    });
  });
});

describe('GET /api/analytics/export', () => {
  it('should return export options', async () => {
    const response = await GET();
    const responseData = await response.json();

    expect(responseData.success).toBe(true);
    expect(responseData.data).toHaveProperty('formats');
    expect(responseData.data.formats).toContain('csv');
    expect(responseData.data.formats).toContain('xlsx');
    expect(responseData.data.formats).toContain('json');
  });

  it('should return maxRecords limit', async () => {
    const response = await GET();
    const responseData = await response.json();

    expect(responseData.data).toHaveProperty('maxRecords');
    expect(typeof responseData.data.maxRecords).toBe('number');
  });

  it('should return available options', async () => {
    const response = await GET();
    const responseData = await response.json();

    expect(responseData.data).toHaveProperty('options');
    expect(responseData.data.options).toHaveProperty('includeHeaders');
    expect(responseData.data.options).toHaveProperty('timeRange');
  });

  it('should return response with expected structure', async () => {
    const response = await GET();
    const responseData = await response.json();

    expect(responseData).toHaveProperty('success');
    expect(responseData.success).toBe(true);
    expect(responseData).toHaveProperty('data');
  });
});
