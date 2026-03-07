/**
 * useExport Hook 测试
 * 测试覆盖：初始状态、导出方法、错误处理、loading 状态切换
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useExport, ExportOptions, ExportResult } from './useExport';

describe('useExport', () => {
  // 存储原始方法
  let originalFetch: typeof fetch;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  // Mock 函数
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let mockClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // 保存原始方法
    originalFetch = global.fetch;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch as typeof fetch;

    // Mock URL 方法
    mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    mockRevokeObjectURL = vi.fn();
    URL.createObjectURL = mockCreateObjectURL as typeof URL.createObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL as typeof URL.revokeObjectURL;

    // Mock link.click
    mockClick = vi.fn();
    vi.spyOn(HTMLElement.prototype, 'click').mockImplementation(mockClick);
  });

  afterEach(() => {
    // 恢复原始方法
    global.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useExport());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastExport).toBe(null);
    });

    it('应该返回所有必需的方法', () => {
      const { result } = renderHook(() => useExport());

      expect(typeof result.current.exportTasks).toBe('function');
      expect(typeof result.current.exportTasksAsJSON).toBe('function');
      expect(typeof result.current.exportTasksAsCSV).toBe('function');
      expect(typeof result.current.exportTasksAsPDF).toBe('function');
      expect(typeof result.current.exportTasksAsExcel).toBe('function');
      expect(typeof result.current.exportStats).toBe('function');
      expect(typeof result.current.exportCustomData).toBe('function');
      expect(typeof result.current.downloadBlob).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('exportTasks', () => {
    it('应该使用 GET 请求导出任务（无 taskIds）', async () => {
      const mockBlob = new Blob(['test data'], { type: 'application/json' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      const options: ExportOptions = {
        format: 'json',
        type: 'tasks',
      };

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportTasks(options);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/export?format=json&type=tasks')
        );
      });

      expect(exportResult!).toBeDefined();
      expect(exportResult!.success).toBe(true);
      expect(exportResult!.blob).toBe(mockBlob);
      expect(exportResult!.filename).toMatch(/tasks-export-\d{4}-\d{2}-\d{2}\.json/);
    });

    it('应该使用 POST 请求导出任务（有 taskIds）', async () => {
      const mockBlob = new Blob(['test data'], { type: 'application/json' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      const options: ExportOptions = {
        format: 'json',
        type: 'tasks',
        taskIds: ['task-1', 'task-2'],
      };

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportTasks(options);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            format: 'json',
            type: 'tasks',
            taskIds: ['task-1', 'task-2'],
          }),
        });
      });

      expect(exportResult!.success).toBe(true);
    });

    it('应该正确导出为 CSV 格式', async () => {
      const mockBlob = new Blob(['id,name\n1,Task 1'], { type: 'text/csv' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      const options: ExportOptions = {
        format: 'csv',
        type: 'tasks',
      };

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportTasks(options);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(exportResult!.success).toBe(true);
      expect(exportResult!.filename).toMatch(/\.csv$/);
    });

    it('应该正确导出为 PDF 格式', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      const options: ExportOptions = {
        format: 'pdf',
        type: 'tasks',
      };

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportTasks(options);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(exportResult!.success).toBe(true);
      expect(exportResult!.filename).toMatch(/\.pdf$/);
    });

    it('应该正确导出为 Excel 格式', async () => {
      const mockBlob = new Blob(['excel content'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      const options: ExportOptions = {
        format: 'excel',
        type: 'tasks',
      };

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportTasks(options);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(exportResult!.success).toBe(true);
      expect(exportResult!.filename).toMatch(/\.xlsx$/);
    });

    it('应该正确处理查询参数', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/json' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      const options: ExportOptions = {
        format: 'json',
        type: 'tasks',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        priority: 'high',
        status: 'todo',
        assignee: 'user-123',
        tags: ['urgent', 'important'],
        includeCompleted: true,
      };

      await act(async () => {
        await result.current.exportTasks(options);
      });

      await waitFor(() => {
        const fetchUrl = mockFetch.mock.calls[0][0];
        expect(fetchUrl).toContain('format=json');
        expect(fetchUrl).toContain('type=tasks');
        expect(fetchUrl).toContain('startDate=2024-01-01');
        expect(fetchUrl).toContain('endDate=2024-12-31');
        expect(fetchUrl).toContain('priority=high');
        expect(fetchUrl).toContain('status=pending');
        expect(fetchUrl).toContain('assignee=user-123');
        expect(fetchUrl).toContain('tags=urgent%2Cimportant');
        expect(fetchUrl).toContain('includeCompleted=true');
      });
    });

    it('应该处理网络错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useExport());

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      expect(exportResult!.success).toBe(false);
      expect(exportResult!.error).toBe('Network error');
      expect(result.current.lastExport?.success).toBe(false);
    });

    it('应该处理 API 错误响应', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Export failed: Invalid format' }),
      });

      const { result } = renderHook(() => useExport());

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Export failed: Invalid format');
      });

      expect(exportResult!.success).toBe(false);
      expect(exportResult!.error).toBe('Export failed: Invalid format');
    });

    it('应该处理没有错误消息的 API 错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useExport());

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Export failed');
      });

      expect(exportResult!.success).toBe(false);
      expect(exportResult!.error).toBe('Export failed');
    });

    it('应该处理未知错误类型', async () => {
      mockFetch.mockRejectedValueOnce('Unknown error string');

      const { result } = renderHook(() => useExport());

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Unknown error');
      });

      expect(exportResult!.success).toBe(false);
      expect(exportResult!.error).toBe('Unknown error');
    });

    it('应该在成功后自动下载文件', async () => {
      const mockBlob = new Blob(['test data'], { type: 'application/json' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
        expect(mockClick).toHaveBeenCalled();
        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      });
    });

    it('应该正确管理 loading 状态', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/json' });
      let resolvePromise: any;
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useExport());

      expect(result.current.loading).toBe(false);

      let exportPromise: Promise<ExportResult>;
      act(() => {
        exportPromise = result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await act(async () => {
        resolvePromise({
          ok: true,
          blob: async () => mockBlob,
        });
        await exportPromise!;
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('应该在错误时也正确管理 loading 状态', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useExport());

      expect(result.current.loading).toBe(false);

      await act(async () => {
        await result.current.exportTasks({ format: 'json' });
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('exportTasksAsJSON', () => {
    it('应该调用 exportTasks 并传递正确的参数', async () => {
      const mockBlob = new Blob(['json data'], { type: 'application/json' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportTasksAsJSON();
      });

      await waitFor(() => {
        const fetchUrl = mockFetch.mock.calls[0][0];
        expect(fetchUrl).toContain('format=json');
        expect(fetchUrl).toContain('type=tasks');
      });

      expect(exportResult!.success).toBe(true);
    });

    it('应该传递 taskIds 参数', async () => {
      const mockBlob = new Blob(['json data'], { type: 'application/json' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportTasksAsJSON(['task-1', 'task-2']);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            format: 'json',
            type: 'tasks',
            taskIds: ['task-1', 'task-2'],
          }),
        });
      });
    });
  });

  describe('exportTasksAsCSV', () => {
    it('应该调用 exportTasks 并传递正确的参数', async () => {
      const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportTasksAsCSV(['task-1']);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.format).toBe('csv');
      expect(callBody.type).toBe('tasks');
      expect(callBody.taskIds).toEqual(['task-1']);
      expect(exportResult!.success).toBe(true);
    });
  });

  describe('exportTasksAsPDF', () => {
    it('应该调用 exportTasks 并传递正确的参数', async () => {
      const mockBlob = new Blob(['pdf data'], { type: 'application/pdf' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportTasksAsPDF();
      });

      await waitFor(() => {
        const fetchUrl = mockFetch.mock.calls[0][0];
        expect(fetchUrl).toContain('format=pdf');
        expect(fetchUrl).toContain('type=tasks');
      });

      expect(exportResult!.success).toBe(true);
      expect(exportResult!.filename).toMatch(/\.pdf$/);
    });
  });

  describe('exportTasksAsExcel', () => {
    it('应该调用 exportTasks 并传递正确的参数', async () => {
      const mockBlob = new Blob(['excel data'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportTasksAsExcel();
      });

      await waitFor(() => {
        const fetchUrl = mockFetch.mock.calls[0][0];
        expect(fetchUrl).toContain('format=excel');
        expect(fetchUrl).toContain('type=tasks');
      });

      expect(exportResult!.success).toBe(true);
      expect(exportResult!.filename).toMatch(/\.xlsx$/);
    });
  });

  describe('exportStats', () => {
    it('应该成功导出统计信息', async () => {
      const mockStats = { total: 100, completed: 50 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const { result } = renderHook(() => useExport());

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportStats();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/export?format=json&type=stats')
        );
      });

      expect(exportResult!.success).toBe(true);
      expect(exportResult!.filename).toMatch(/stats-export-\d{4}-\d{2}-\d{2}\.json/);
    });

    it('应该处理统计导出错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Stats not available' }),
      });

      const { result } = renderHook(() => useExport());

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportStats();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Stats not available');
      });

      expect(exportResult!.success).toBe(false);
      expect(exportResult!.error).toBe('Stats not available');
    });

    it('应该在成功后自动下载统计文件', async () => {
      const mockStats = { total: 100 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportStats();
      });

      await waitFor(() => {
        expect(mockClick).toHaveBeenCalled();
        expect(mockRevokeObjectURL).toHaveBeenCalled();
      });
    });

    it('应该正确管理 loading 状态', async () => {
      const mockStats = { total: 100 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const { result } = renderHook(() => useExport());

      expect(result.current.loading).toBe(false);

      await act(async () => {
        await result.current.exportStats();
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('exportCustomData', () => {
    it('应该成功导出自定义 JSON 数据', async () => {
      const mockBlob = new Blob(['custom data'], { type: 'application/json' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      const customData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportCustomData(customData, 'json');
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            format: 'json',
            type: 'custom',
            data: customData,
          }),
        });
      });

      expect(exportResult!.success).toBe(true);
      expect(exportResult!.filename).toMatch(/custom-export-\d{4}-\d{2}-\d{2}\.json/);
    });

    it('应该成功导出自定义 CSV 数据', async () => {
      const mockBlob = new Blob(['id,name\n1,Item 1'], { type: 'text/csv' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      const customData = [{ id: 1, name: 'Item 1' }];

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportCustomData(customData, 'csv');
      });

      await waitFor(() => {
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.format).toBe('csv');
        expect(callBody.type).toBe('custom');
        expect(callBody.data).toEqual(customData);
      });

      expect(exportResult!.success).toBe(true);
      expect(exportResult!.filename).toMatch(/\.csv$/);
    });

    it('应该处理自定义数据导出错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid data format' }),
      });

      const { result } = renderHook(() => useExport());

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportCustomData([], 'json');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid data format');
      });

      expect(exportResult!.success).toBe(false);
    });

    it('应该处理网络错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      const { result } = renderHook(() => useExport());

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportCustomData([{ test: 1 }], 'json');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Connection failed');
      });

      expect(exportResult!.success).toBe(false);
    });
  });

  describe('downloadBlob', () => {
    it('应该创建下载链接并触发下载', () => {
      const { result } = renderHook(() => useExport());

      const blob = new Blob(['test content'], { type: 'text/plain' });
      const filename = 'test-file.txt';

      act(() => {
        result.current.downloadBlob(blob, filename);
      });

      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('应该正确处理不同类型的 Blob', () => {
      const { result } = renderHook(() => useExport());

      const jsonBlob = new Blob(['{"key": "value"}'], { type: 'application/json' });
      const filename = 'data.json';

      act(() => {
        result.current.downloadBlob(jsonBlob, filename);
      });

      expect(mockCreateObjectURL).toHaveBeenCalledWith(jsonBlob);
    });

    it('可以独立调用（不依赖导出结果）', async () => {
      const mockBlob = new Blob(['independent'], { type: 'text/plain' });
      const { result } = renderHook(() => useExport());

      act(() => {
        result.current.downloadBlob(mockBlob, 'standalone.txt');
      });

      expect(mockClick).toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastExport).toBe(null);
    });
  });

  describe('reset', () => {
    it('应该重置所有状态', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/json' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.lastExport).not.toBe(null);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastExport).toBe(null);
    });

    it('应该清除错误状态', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBe(null);
    });

    it('应该在 loading 状态下也能重置', async () => {
      let resolvePromise: any;
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useExport());

      act(() => {
        result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastExport).toBe(null);

      if (resolvePromise) {
        resolvePromise({ ok: true, blob: async () => new Blob() });
      }
    });
  });

  describe('错误处理', () => {
    it('应该正确处理 JSON 解析错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const { result } = renderHook(() => useExport());

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid JSON');
      });

      expect(exportResult!.success).toBe(false);
    });

    it('应该正确处理 blob 获取错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => {
          throw new Error('Blob error');
        },
      });

      const { result } = renderHook(() => useExport());

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Blob error');
      });

      expect(exportResult!.success).toBe(false);
    });

    it('应该处理连续的错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('First error'));
      mockFetch.mockRejectedValueOnce(new Error('Second error'));

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('First error');
      });

      await act(async () => {
        await result.current.exportTasks({ format: 'csv' });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Second error');
      });
    });

    it('应该在错误后能够成功导出', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const mockBlob = new Blob(['success'], { type: 'application/json' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      let exportResult: ExportResult;
      await act(async () => {
        exportResult = await result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      expect(exportResult!.success).toBe(true);
    });
  });

  describe('loading 状态切换', () => {
    it('应该在导出开始时设置 loading 为 true', async () => {
      let resolvePromise: any;
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useExport());

      act(() => {
        result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await act(async () => {
        resolvePromise({ ok: true, blob: async () => new Blob() });
      });
    });

    it('应该在导出成功后设置 loading 为 false', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/json' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportTasks({ format: 'json' });
      });

      expect(result.current.loading).toBe(false);
    });

    it('应该在导出失败后设置 loading 为 false', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Error'));

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportTasks({ format: 'json' });
      });

      expect(result.current.loading).toBe(false);
    });

    it('应该在 exportStats 中正确管理 loading', async () => {
      let resolvePromise: any;
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useExport());

      act(() => {
        result.current.exportStats();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await act(async () => {
        resolvePromise({ ok: true, json: async () => ({}) });
      });

      expect(result.current.loading).toBe(false);
    });

    it('应该在 exportCustomData 中正确管理 loading', async () => {
      let resolvePromise: any;
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useExport());

      act(() => {
        result.current.exportCustomData([{ test: 1 }], 'json');
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await act(async () => {
        resolvePromise({ ok: true, blob: async () => new Blob() });
      });

      expect(result.current.loading).toBe(false);
    });

    it('应该支持并发导出请求', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/json' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await Promise.all([
          result.current.exportTasks({ format: 'json' }),
          result.current.exportTasks({ format: 'csv' }),
        ]);
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('lastExport 状态管理', () => {
    it('应该在成功导出后更新 lastExport', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/json' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.lastExport).not.toBe(null);
        expect(result.current.lastExport!.success).toBe(true);
        expect(result.current.lastExport!.blob).toBe(mockBlob);
      });
    });

    it('应该在失败导出后更新 lastExport', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Export failed'));

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.lastExport).not.toBe(null);
        expect(result.current.lastExport!.success).toBe(false);
        expect(result.current.lastExport!.error).toBe('Export failed');
      });
    });

    it('应该在多次导出后保留最后一次结果', async () => {
      const mockBlob1 = new Blob(['first'], { type: 'application/json' });
      const mockBlob2 = new Blob(['second'], { type: 'text/csv' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob1,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob2,
      });

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportTasks({ format: 'json' });
      });

      await waitFor(() => {
        expect(result.current.lastExport!.blob).toBe(mockBlob1);
      });

      await act(async () => {
        await result.current.exportTasks({ format: 'csv' });
      });

      await waitFor(() => {
        expect(result.current.lastExport!.blob).toBe(mockBlob2);
      });
    });
  });

  describe('文件名生成', () => {
    it('应该为不同类型生成正确的文件名', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/json' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportTasks({ format: 'json', type: 'tasks' });
      });
      expect(result.current.lastExport!.filename).toMatch(/tasks-export-.*\.json/);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      await act(async () => {
        await result.current.exportStats();
      });
      expect(result.current.lastExport!.filename).toMatch(/stats-export-.*\.json/);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });
      await act(async () => {
        await result.current.exportCustomData([], 'json');
      });
      expect(result.current.lastExport!.filename).toMatch(/custom-export-.*\.json/);
    });

    it('应该为不同格式生成正确的扩展名', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/octet-stream' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      const testCases = [
        { format: 'json' as const, ext: '.json' },
        { format: 'csv' as const, ext: '.csv' },
        { format: 'pdf' as const, ext: '.pdf' },
        { format: 'excel' as const, ext: '.xlsx' },
      ];

      for (const { format, ext } of testCases) {
        await act(async () => {
          await result.current.exportTasks({ format, type: 'tasks' });
        });
        expect(result.current.lastExport!.filename).toMatch(new RegExp(`\\${ext}$`));
      }
    });

    it('应该包含当前日期', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/json' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportTasks({ format: 'json' });
      });

      const today = new Date().toISOString().split('T')[0];
      expect(result.current.lastExport!.filename).toContain(today);
    });
  });
});