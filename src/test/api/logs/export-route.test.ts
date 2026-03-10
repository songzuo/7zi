/**
 * Logs Export API 单元测试
 * 测试日志导出 API 端点
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/logs/export/route';

// Mock query result
const createMockLogs = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `log-${String(i + 1).padStart(3, '0')}`,
    timestamp: new Date(2024, 0, i + 1).toISOString(),
    level: i % 4 === 0 ? 'error' : i % 4 === 1 ? 'warn' : i % 4 === 2 ? 'info' : 'debug',
    category: i % 3 === 0 ? 'api' : i % 3 === 1 ? 'auth' : 'system',
    message: `Test log message ${i + 1}`,
    userId: `user-${(i % 5) + 1}`,
    requestId: `req-${(i % 3) + 1}`,
    route: `/api/${i % 2 === 0 ? 'tasks' : 'users'}`,
    metadata: { key: `value-${i}` },
  }));
};

const mockLogs = createMockLogs(10);
const mockQueryResult = {
  logs: mockLogs,
  total: 10,
  page: 1,
  limit: 100,
  hasMore: false,
};

const mockDbTransport = {
  query: vi.fn(() => ({ ...mockQueryResult })),
  cleanup: vi.fn(() => 10),
};

vi.mock('@/lib/logger/database-transport', () => ({
  getDbTransport: vi.fn(() => mockDbTransport),
}));

// Mock auth
vi.mock('@/lib/security/auth', () => ({
  verifyToken: vi.fn(),
  extractToken: vi.fn(),
  isAdmin: vi.fn((user) => user?.role === 'admin'),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  apiLogger: {
    audit: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Logs Export API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbTransport.query.mockReturnValue({ ...mockQueryResult });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/logs/export', () => {
    describe('Basic Export', () => {
      it('should export logs as JSON by default', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export');
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toContain('application/json');
        expect(response.headers.get('Content-Disposition')).toMatch(/attachment; filename="logs-export-.*\.json"/);
        
        const text = await response.text();
        const data = JSON.parse(text);
        expect(data.format).toBe('json');
        expect(data.logs).toBeDefined();
        expect(Array.isArray(data.logs)).toBe(true);
        expect(data.exportedAt).toBeDefined();
        expect(data.totalRecords).toBe(10);
      });

      it('should export logs as CSV when format=csv', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?format=csv');
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toContain('text/csv');
        expect(response.headers.get('Content-Disposition')).toMatch(/attachment; filename="logs-export-.*\.csv"/);
        
        const text = await response.text();
        const lines = text.split('\n');
        expect(lines[0]).toBe('id,timestamp,level,category,message,userId,requestId,route');
        expect(lines.length).toBe(11); // header + 10 data rows
      });

      it('should reject invalid format', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?format=xml');
        const response = await GET(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('Invalid format');
      });
    });

    describe('Filtering by Level', () => {
      it('should filter by single level', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?level=error');
        await GET(request);

        expect(mockDbTransport.query).toHaveBeenCalled();
        const callArgs = mockDbTransport.query.mock.calls[0][0];
        expect(callArgs.levels).toEqual(['error']);
      });

      it('should filter by multiple levels', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?levels=error,warn,info');
        await GET(request);

        expect(mockDbTransport.query).toHaveBeenCalled();
        const callArgs = mockDbTransport.query.mock.calls[0][0];
        expect(callArgs.levels).toEqual(['error', 'warn', 'info']);
      });
    });

    describe('Filtering by Category', () => {
      it('should filter by single category', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?category=api');
        await GET(request);

        expect(mockDbTransport.query).toHaveBeenCalled();
        const callArgs = mockDbTransport.query.mock.calls[0][0];
        expect(callArgs.categories).toEqual(['api']);
      });

      it('should filter by multiple categories', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?categories=api,auth');
        await GET(request);

        expect(mockDbTransport.query).toHaveBeenCalled();
        const callArgs = mockDbTransport.query.mock.calls[0][0];
        expect(callArgs.categories).toEqual(['api', 'auth']);
      });
    });

    describe('Date Range Filtering', () => {
      it('should filter by startDate', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?startDate=2024-01-01T00:00:00Z');
        await GET(request);

        expect(mockDbTransport.query).toHaveBeenCalled();
        const callArgs = mockDbTransport.query.mock.calls[0][0];
        expect(callArgs.startTime).toBe('2024-01-01T00:00:00Z');
      });

      it('should filter by endDate', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?endDate=2024-12-31T23:59:59Z');
        await GET(request);

        expect(mockDbTransport.query).toHaveBeenCalled();
        const callArgs = mockDbTransport.query.mock.calls[0][0];
        expect(callArgs.endTime).toBe('2024-12-31T23:59:59Z');
      });

      it('should filter by both startDate and endDate', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z');
        await GET(request);

        expect(mockDbTransport.query).toHaveBeenCalled();
        const callArgs = mockDbTransport.query.mock.calls[0][0];
        expect(callArgs.startTime).toBe('2024-01-01T00:00:00Z');
        expect(callArgs.endTime).toBe('2024-12-31T23:59:59Z');
      });

      it('should reject invalid startDate format', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?startDate=invalid-date');
        const response = await GET(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('Invalid startDate');
      });

      it('should reject invalid endDate format', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?endDate=not-a-date');
        const response = await GET(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('Invalid endDate');
      });
    });

    describe('Limit Parameter', () => {
      it('should use default limit of 1000', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export');
        await GET(request);

        expect(mockDbTransport.query).toHaveBeenCalled();
        const callArgs = mockDbTransport.query.mock.calls[0][0];
        expect(callArgs.limit).toBe(1000);
      });

      it('should respect custom limit', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?limit=100');
        await GET(request);

        expect(mockDbTransport.query).toHaveBeenCalled();
        const callArgs = mockDbTransport.query.mock.calls[0][0];
        expect(callArgs.limit).toBe(100);
      });

      it('should cap limit at 10000', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?limit=50000');
        await GET(request);

        expect(mockDbTransport.query).toHaveBeenCalled();
        const callArgs = mockDbTransport.query.mock.calls[0][0];
        expect(callArgs.limit).toBe(10000);
      });

      it('should reject negative limit', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?limit=-1');
        const response = await GET(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('Invalid limit');
      });

      it('should reject zero limit', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?limit=0');
        const response = await GET(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('Invalid limit');
      });
    });

    describe('Additional Filters', () => {
      it('should filter by search term', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?search=error');
        await GET(request);

        expect(mockDbTransport.query).toHaveBeenCalled();
        const callArgs = mockDbTransport.query.mock.calls[0][0];
        expect(callArgs.search).toBe('error');
      });

      it('should filter by userId', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?userId=user-123');
        await GET(request);

        expect(mockDbTransport.query).toHaveBeenCalled();
        const callArgs = mockDbTransport.query.mock.calls[0][0];
        expect(callArgs.userId).toBe('user-123');
      });

      it('should filter by requestId', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?requestId=req-456');
        await GET(request);

        expect(mockDbTransport.query).toHaveBeenCalled();
        const callArgs = mockDbTransport.query.mock.calls[0][0];
        expect(callArgs.requestId).toBe('req-456');
      });

      it('should filter by route', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?route=/api/tasks');
        await GET(request);

        expect(mockDbTransport.query).toHaveBeenCalled();
        const callArgs = mockDbTransport.query.mock.calls[0][0];
        expect(callArgs.route).toBe('/api/tasks');
      });
    });

    describe('Authentication', () => {
      it('should allow access without token', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export');
        const response = await GET(request);

        expect(response.status).toBe(200);
      });

      it('should accept valid token', async () => {
        const { verifyToken, extractToken } = await import('@/lib/security/auth');
        vi.mocked(extractToken).mockReturnValue('valid-token');
        vi.mocked(verifyToken).mockResolvedValue({ sub: 'user-123', role: 'user' } as any);

        const request = new NextRequest('http://localhost:3000/api/logs/export', {
          headers: { Authorization: 'Bearer valid-token' },
        });
        const response = await GET(request);

        expect(response.status).toBe(200);
      });

      it('should reject invalid token', async () => {
        const { verifyToken, extractToken } = await import('@/lib/security/auth');
        vi.mocked(extractToken).mockReturnValue('invalid-token');
        vi.mocked(verifyToken).mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/logs/export', {
          headers: { Authorization: 'Bearer invalid-token' },
        });
        const response = await GET(request);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toContain('Invalid authentication token');
      });
    });

    describe('CSV Output Format', () => {
      it('should include all columns in CSV header', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?format=csv');
        const response = await GET(request);

        const text = await response.text();
        const header = text.split('\n')[0];
        expect(header).toContain('id');
        expect(header).toContain('timestamp');
        expect(header).toContain('level');
        expect(header).toContain('category');
        expect(header).toContain('message');
        expect(header).toContain('userId');
        expect(header).toContain('requestId');
        expect(header).toContain('route');
      });

      it('should handle empty logs in CSV', async () => {
        mockDbTransport.query.mockReturnValueOnce({
          logs: [],
          total: 0,
          page: 1,
          limit: 100,
          hasMore: false,
        });

        const request = new NextRequest('http://localhost:3000/api/logs/export?format=csv');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const text = await response.text();
        expect(text).toBe('');
      });

      it('should escape special characters in CSV', async () => {
        const logsWithSpecialChars = [{
          id: 'log-001',
          timestamp: '2024-01-01T00:00:00.000Z',
          level: 'info',
          category: 'api',
          message: 'Test, message with "quotes" and\nnewlines',
          userId: 'user-1',
          requestId: 'req-1',
          route: '/api/test',
        }];

        mockDbTransport.query.mockReturnValueOnce({
          logs: logsWithSpecialChars,
          total: 1,
          page: 1,
          limit: 100,
          hasMore: false,
        });

        const request = new NextRequest('http://localhost:3000/api/logs/export?format=csv');
        const response = await GET(request);

        const text = await response.text();
        // Check that special characters are properly escaped
        expect(text).toContain('"Test, message with ""quotes"" and\nnewlines"');
      });
    });

    describe('JSON Output Format', () => {
      it('should include metadata in JSON export', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?format=json');
        const response = await GET(request);

        const text = await response.text();
        const data = JSON.parse(text);

        expect(data.exportedAt).toBeDefined();
        expect(data.format).toBe('json');
        expect(data.totalRecords).toBe(10);
        expect(data.filters).toBeDefined();
        expect(data.logs).toBeDefined();
        expect(Array.isArray(data.logs)).toBe(true);
      });

      it('should include applied filters in JSON export', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?level=error&category=api&startDate=2024-01-01T00:00:00Z');
        const response = await GET(request);

        const text = await response.text();
        const data = JSON.parse(text);

        expect(data.filters.levels).toEqual(['error']);
        expect(data.filters.categories).toEqual(['api']);
        expect(data.filters.startDate).toBe('2024-01-01T00:00:00Z');
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        mockDbTransport.query.mockImplementationOnce(() => {
          throw new Error('Database connection failed');
        });

        const request = new NextRequest('http://localhost:3000/api/logs/export');
        const response = await GET(request);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Failed to export logs');
      });
    });

    describe('Response Headers', () => {
      it('should set correct JSON content type', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?format=json');
        const response = await GET(request);

        expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
      });

      it('should set correct CSV content type', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export?format=csv');
        const response = await GET(request);

        expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
      });

      it('should set cache control headers', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export');
        const response = await GET(request);

        expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
        expect(response.headers.get('Pragma')).toBe('no-cache');
        expect(response.headers.get('Expires')).toBe('0');
      });

      it('should set attachment disposition for download', async () => {
        const request = new NextRequest('http://localhost:3000/api/logs/export');
        const response = await GET(request);

        const disposition = response.headers.get('Content-Disposition');
        expect(disposition).toMatch(/attachment/);
      });
    });
  });
});