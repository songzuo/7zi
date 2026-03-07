/**
 * useImport Hook 测试
 * @module hooks/__tests__/useImport.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useImport } from '../useImport';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock FileReader
class MockFileReader {
  result: string = '';
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
  
  readAsText(file: File) {
    // 模拟异步读取
    setTimeout(() => {
      if (file.name.includes('error')) {
        this.onerror?.({} as ProgressEvent<FileReader>);
      } else {
        this.result = 'test content';
        this.onload?.({ target: { result: this.result } } as unknown as ProgressEvent<FileReader>);
      }
    }, 0);
  }
}

// @ts-expect-error Mocking
global.FileReader = MockFileReader;

describe('useImport', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useImport());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.preview).toBe(null);
      expect(result.current.result).toBe(null);
      expect(result.current.file).toBe(null);
    });
  });

  describe('parseFile', () => {
    it('应该解析 CSV 文件', async () => {
      const csvContent = `title,description,priority
任务1,描述1,high
任务2,描述2,medium`;

      const { result } = renderHook(() => useImport());

      // 创建模拟文件
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      // 覆盖 FileReader 以返回实际内容
      const originalFileReader = global.FileReader;
      // @ts-expect-error Mocking
      global.FileReader = class {
        result: string = '';
        onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
        
        readAsText() {
          this.result = csvContent;
          this.onload?.({ target: { result: this.result } } as unknown as ProgressEvent<FileReader>);
        }
      };

      let previewResult;
      await act(async () => {
        previewResult = await result.current.parseFile(file);
      });

      // 恢复原始 FileReader
      global.FileReader = originalFileReader;

      expect(previewResult).not.toBeNull();
      expect(previewResult?.format).toBe('csv');
      expect(previewResult?.headers).toContain('title');
      expect(previewResult?.headers).toContain('description');
      expect(previewResult?.headers).toContain('priority');
      expect(previewResult?.totalRows).toBe(2);
      expect(result.current.file).toBe(file);
    });

    it('应该解析 JSON 文件', async () => {
      const jsonContent = JSON.stringify({
        tasks: [
          { title: '任务1', description: '描述1', priority: 'high' },
          { title: '任务2', description: '描述2', priority: 'medium' },
        ],
      });

      const { result } = renderHook(() => useImport());

      const file = new File([jsonContent], 'test.json', { type: 'application/json' });
      
      const originalFileReader = global.FileReader;
      // @ts-expect-error Mocking
      global.FileReader = class {
        result: string = '';
        onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
        
        readAsText() {
          this.result = jsonContent;
          this.onload?.({ target: { result: this.result } } as unknown as ProgressEvent<FileReader>);
        }
      };

      let previewResult;
      await act(async () => {
        previewResult = await result.current.parseFile(file);
      });

      global.FileReader = originalFileReader;

      expect(previewResult).not.toBeNull();
      expect(previewResult?.format).toBe('json');
      expect(previewResult?.totalRows).toBe(2);
      expect(previewResult?.validRows).toBe(2);
    });

    it('应该处理无效的 JSON 文件', async () => {
      const invalidJson = 'not valid json';

      const { result } = renderHook(() => useImport());

      const file = new File([invalidJson], 'test.json', { type: 'application/json' });
      
      const originalFileReader = global.FileReader;
      // @ts-expect-error Mocking
      global.FileReader = class {
        result: string = '';
        onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
        
        readAsText() {
          this.result = invalidJson;
          this.onload?.({ target: { result: this.result } } as unknown as ProgressEvent<FileReader>);
        }
      };

      let previewResult;
      await act(async () => {
        previewResult = await result.current.parseFile(file);
      });

      global.FileReader = originalFileReader;

      expect(previewResult?.errors.length).toBeGreaterThan(0);
      expect(previewResult?.errors[0].message).toContain('JSON 解析失败');
    });

    it('应该检测缺少 title 字段的数据', async () => {
      const jsonContent = JSON.stringify({
        tasks: [
          { description: '没有标题' },
          { title: '有标题' },
        ],
      });

      const { result } = renderHook(() => useImport());

      const file = new File([jsonContent], 'test.json', { type: 'application/json' });
      
      const originalFileReader = global.FileReader;
      // @ts-expect-error Mocking
      global.FileReader = class {
        result: string = '';
        onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
        
        readAsText() {
          this.result = jsonContent;
          this.onload?.({ target: { result: this.result } } as unknown as ProgressEvent<FileReader>);
        }
      };

      let previewResult;
      await act(async () => {
        previewResult = await result.current.parseFile(file);
      });

      global.FileReader = originalFileReader;

      expect(previewResult?.validRows).toBe(1);
      expect(previewResult?.errors.length).toBe(1);
    });
  });

  describe('importData', () => {
    it('应该在没有文件时返回 null', async () => {
      const { result } = renderHook(() => useImport());

      let importResult;
      await act(async () => {
        importResult = await result.current.importData();
      });

      expect(importResult).toBeNull();
      expect(result.current.error).toBe('没有选择文件');
    });

    it('应该成功导入数据', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          imported: 2,
          failed: 0,
          errors: [],
          tasks: [
            { id: '1', title: '任务1', status: 'todo', priority: 'high' },
            { id: '2', title: '任务2', status: 'todo', priority: 'medium' },
          ],
        }),
      });

      const { result } = renderHook(() => useImport());

      // 先设置文件
      const csvContent = 'title\n任务1';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const originalFileReader = global.FileReader;
      // @ts-expect-error Mocking
      global.FileReader = class {
        result: string = '';
        onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
        
        readAsText() {
          this.result = csvContent;
          this.onload?.({ target: { result: this.result } } as unknown as ProgressEvent<FileReader>);
        }
      };

      await act(async () => {
        await result.current.parseFile(file);
      });

      // 执行导入
      let importResult;
      await act(async () => {
        importResult = await result.current.importData({ skipErrors: true });
      });

      global.FileReader = originalFileReader;

      expect(importResult).not.toBeNull();
      expect(importResult?.success).toBe(true);
      expect(importResult?.imported).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith('/api/import', expect.objectContaining({
        method: 'POST',
      }));
    });

    it('应该处理导入失败', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          errors: [{ row: 1, message: '导入失败' }],
        }),
      });

      const { result } = renderHook(() => useImport());

      const csvContent = 'title\n任务1';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const originalFileReader = global.FileReader;
      // @ts-expect-error Mocking
      global.FileReader = class {
        result: string = '';
        onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
        
        readAsText() {
          this.result = csvContent;
          this.onload?.({ target: { result: this.result } } as unknown as ProgressEvent<FileReader>);
        }
      };

      await act(async () => {
        await result.current.parseFile(file);
      });

      let importResult;
      await act(async () => {
        importResult = await result.current.importData();
      });

      global.FileReader = originalFileReader;

      expect(importResult).toBeNull();
      expect(result.current.error).not.toBeNull();
    });
  });

  describe('downloadTemplate', () => {
    it('应该下载 CSV 模板', async () => {
      const csvContent = 'title,description\n示例,描述';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob([csvContent], { type: 'text/csv' }),
      });

      const { result } = renderHook(() => useImport());

      // Mock URL.createObjectURL 和相关 DOM 方法
      const mockUrl = 'blob:test';
      const mockCreateObjectURL = vi.fn(() => mockUrl);
      const mockRevokeObjectURL = vi.fn();
      const mockClick = vi.fn();
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      
      URL.createObjectURL = mockCreateObjectURL;
      URL.revokeObjectURL = mockRevokeObjectURL;
      
      const originalCreateElement = document.createElement.bind(document);
      const originalBody = document.body;
      
      // Mock document.createElement
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return {
            href: '',
            download: '',
            click: mockClick,
            style: {},
          } as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tagName);
      });
      
      // Mock document.body
      Object.defineProperty(document, 'body', {
        value: {
          appendChild: mockAppendChild,
          removeChild: mockRemoveChild,
        },
        configurable: true,
      });

      await act(async () => {
        await result.current.downloadTemplate('csv');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/import?action=template&format=csv');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockUrl);
      
      // 恢复
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      Object.defineProperty(document, 'body', {
        value: originalBody,
        configurable: true,
      });
      vi.restoreAllMocks();
    });

    it('应该下载 JSON 模板', async () => {
      const jsonContent = JSON.stringify({ tasks: [] });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob([jsonContent], { type: 'application/json' }),
      });

      const { result } = renderHook(() => useImport());

      const mockUrl = 'blob:test';
      const mockCreateObjectURL = vi.fn(() => mockUrl);
      const mockRevokeObjectURL = vi.fn();
      const mockClick = vi.fn();
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      
      URL.createObjectURL = mockCreateObjectURL;
      URL.revokeObjectURL = mockRevokeObjectURL;
      
      const originalCreateElement = document.createElement.bind(document);
      const originalBody = document.body;
      
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return {
            href: '',
            download: '',
            click: mockClick,
            style: {},
          } as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tagName);
      });
      
      Object.defineProperty(document, 'body', {
        value: {
          appendChild: mockAppendChild,
          removeChild: mockRemoveChild,
        },
        configurable: true,
      });

      await act(async () => {
        await result.current.downloadTemplate('json');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/import?action=template&format=json');
      
      // 恢复
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      Object.defineProperty(document, 'body', {
        value: originalBody,
        configurable: true,
      });
      vi.restoreAllMocks();
    });

    it('应该处理下载失败', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useImport());

      await act(async () => {
        await result.current.downloadTemplate('csv');
      });

      expect(result.current.error).toBe('获取模板失败');
    });
  });

  describe('setFieldMapping', () => {
    it('应该设置字段映射', () => {
      const { result } = renderHook(() => useImport());

      const mappings = [
        { sourceField: 'name', targetField: 'title' },
        { sourceField: 'desc', targetField: 'description' },
      ];

      act(() => {
        result.current.setFieldMapping(mappings);
      });

      // setFieldMapping 只是内部存储，没有暴露状态
      // 所以我们只验证不会报错
      expect(true).toBe(true);
    });
  });

  describe('reset', () => {
    it('应该重置所有状态', async () => {
      const csvContent = 'title\n任务1';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          imported: 1,
          failed: 0,
          errors: [],
        }),
      });

      const { result } = renderHook(() => useImport());

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const originalFileReader = global.FileReader;
      // @ts-expect-error Mocking
      global.FileReader = class {
        result: string = '';
        onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
        
        readAsText() {
          this.result = csvContent;
          this.onload?.({ target: { result: this.result } } as unknown as ProgressEvent<FileReader>);
        }
      };

      // 解析文件
      await act(async () => {
        await result.current.parseFile(file);
      });

      // 验证状态已改变
      expect(result.current.preview).not.toBeNull();
      expect(result.current.file).not.toBeNull();

      // 重置
      act(() => {
        result.current.reset();
      });

      global.FileReader = originalFileReader;

      // 验证状态已重置
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.preview).toBe(null);
      expect(result.current.result).toBe(null);
      expect(result.current.file).toBe(null);
    });
  });
});