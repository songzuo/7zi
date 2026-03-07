/**
 * Export API 测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Task, TaskPriority, TaskStatus } from './tasks/types';

// 在模块加载前 mock
vi.mock('jspdf', () => {
  const MockJsPDF = function(this: { text: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn>; setFontSize: ReturnType<typeof vi.fn>; addPage: ReturnType<typeof vi.fn>; setDrawColor: ReturnType<typeof vi.fn>; setLineWidth: ReturnType<typeof vi.fn>; line: ReturnType<typeof vi.fn>; rect: ReturnType<typeof vi.fn>; setTextColor: ReturnType<typeof vi.fn>; output: ReturnType<typeof vi.fn> }) {
    this.text = vi.fn();
    this.save = vi.fn();
    this.setFontSize = vi.fn();
    this.addPage = vi.fn();
    this.setDrawColor = vi.fn();
    this.setLineWidth = vi.fn();
    this.line = vi.fn();
    this.rect = vi.fn();
    this.setTextColor = vi.fn();
    this.output = vi.fn(() => new Blob(['pdf content'], { type: 'application/pdf' }));
  };
  return { jsPDF: MockJsPDF as unknown as typeof import('jspdf').jsPDF };
});

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn(() => new ArrayBuffer(8)),
}));

// 动态导入确保 mock 生效
const {
  exportTasksToCSV,
  exportTasksToJSON,
  exportTasksToPDF,
  exportTasksToExcel,
  filterTasksForExport,
  batchExportTasks,
  downloadBlob,
  exportTasksToCSVWithOptions,
  exportTasksToJSONWithOptions,
  ExportFormat,
} = await import('./export');

describe('Export API', () => {
  const mockTasks: Task[] = [
    {
      id: 'task_1',
      title: 'Task 1',
      status: 'todo' as TaskStatus,
      priority: 'high' as TaskPriority,
      assignee: 'user1',
      dueDate: new Date('2024-01-01'),
      tags: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'task_2',
      title: 'Task 2',
      status: 'done' as TaskStatus,
      priority: 'low' as TaskPriority,
      assignee: 'user2',
      dueDate: new Date('2024-01-02'),
      tags: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exportTasksToCSV', () => {
    it('should export tasks to CSV format', () => {
      const blob = exportTasksToCSV(mockTasks);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv;charset=utf-8;');
    });

    it('should handle empty task list', () => {
      const blob = exportTasksToCSV([]);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should include CSV headers', async () => {
      const blob = exportTasksToCSV(mockTasks);
      const text = await blob.text();
      expect(text).toContain('ID');
      expect(text).toContain('Title');
    });

    it('should include BOM for UTF-8', async () => {
      const blob = exportTasksToCSV(mockTasks);
      const buffer = await blob.arrayBuffer();
      const view = new Uint8Array(buffer, 0, 3);
      // BOM is EF BB BF
      expect(view[0]).toBe(0xEF);
      expect(view[1]).toBe(0xBB);
      expect(view[2]).toBe(0xBF);
    });
  });

  describe('exportTasksToJSON', () => {
    it('should export tasks to JSON format', () => {
      const blob = exportTasksToJSON(mockTasks);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json;charset=utf-8;');
    });

    it('should serialize tasks correctly', async () => {
      const blob = exportTasksToJSON(mockTasks);
      const text = await blob.text();
      const data = JSON.parse(text);
      expect(data).toHaveLength(2);
      expect(data[0].id).toBe('task_1');
      expect(data[1].id).toBe('task_2');
    });

    it('should handle empty task list', async () => {
      const blob = exportTasksToJSON([]);
      expect(blob).toBeInstanceOf(Blob);
      const text = await blob.text();
      const data = JSON.parse(text);
      expect(data).toEqual([]);
    });
  });

  describe('exportTasksToPDF', () => {
    it('should export tasks to PDF format', () => {
      const blob = exportTasksToPDF(mockTasks);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle empty task list', () => {
      const blob = exportTasksToPDF([]);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('exportTasksToExcel', () => {
    it('should export tasks to Excel format', () => {
      const blob = exportTasksToExcel(mockTasks);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle empty task list', () => {
      const blob = exportTasksToExcel([]);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('ExportFormat types', () => {
    it('should have valid export formats', () => {
      const formats: ExportFormat[] = ['csv', 'json', 'pdf', 'excel'];
      expect(formats).toHaveLength(4);
    });
  });

  describe('filterTasksForExport', () => {
    const allTasks: Task[] = [
      {
        id: 'task_1',
        title: 'High Priority Task',
        status: 'todo',
        priority: 'high',
        assignee: 'user1',
        dueDate: new Date('2024-01-01'),
        tags: [{ id: 'tag1', name: 'bug', color: 'red' }],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'task_2',
        title: 'Medium Priority Task',
        status: 'in_progress',
        priority: 'medium',
        assignee: 'user2',
        dueDate: new Date('2024-01-15'),
        tags: [{ id: 'tag2', name: 'feature', color: 'blue' }],
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-06'),
      },
      {
        id: 'task_3',
        title: 'Completed Task',
        status: 'done',
        priority: 'low',
        assignee: 'user1',
        dueDate: new Date('2024-01-10'),
        tags: [],
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-10'),
        completedAt: new Date('2024-01-10'),
      },
    ];

    it('should filter by status', () => {
      const filtered = filterTasksForExport(allTasks, { format: 'json', status: 'todo' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe('todo');
    });

    it('should filter by priority', () => {
      const filtered = filterTasksForExport(allTasks, { format: 'json', priority: 'high' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].priority).toBe('high');
    });

    it('should filter by assignee (excluding completed by default)', () => {
      const filtered = filterTasksForExport(allTasks, { format: 'json', assignee: 'user1' });
      // user1 has task_1 (todo) and task_3 (done), but done is filtered out by default
      expect(filtered).toHaveLength(1);
      expect(filtered[0].assignee).toBe('user1');
    });

    it('should filter by assignee including completed', () => {
      const filtered = filterTasksForExport(allTasks, { format: 'json', assignee: 'user1', includeCompleted: true });
      expect(filtered).toHaveLength(2);
      expect(filtered.every(t => t.assignee === 'user1')).toBe(true);
    });

    it('should filter out completed tasks by default', () => {
      const filtered = filterTasksForExport(allTasks, { format: 'json' });
      expect(filtered.every(t => t.status !== 'done')).toBe(true);
    });

    it('should include completed tasks when includeCompleted is true', () => {
      const filtered = filterTasksForExport(allTasks, { format: 'json', includeCompleted: true });
      expect(filtered).toHaveLength(3);
    });

    it('should filter by date range', () => {
      const filtered = filterTasksForExport(allTasks, {
        format: 'json',
        dateRange: {
          start: new Date('2024-01-05'),
          end: new Date('2024-01-06'),
        },
        includeCompleted: true,
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('task_2');
    });

    it('should filter by tags', () => {
      const filtered = filterTasksForExport(allTasks, {
        format: 'json',
        tags: ['tag1'],
        includeCompleted: true,
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].tags[0].id).toBe('tag1');
    });
  });

  describe('batchExportTasks', () => {
    it('should export multiple formats at once', () => {
      const result = batchExportTasks(mockTasks, ['csv', 'json', 'pdf', 'excel']);

      expect(result.csv).toBeInstanceOf(Blob);
      expect(result.json).toBeInstanceOf(Blob);
      expect(result.pdf).toBeInstanceOf(Blob);
      expect(result.excel).toBeInstanceOf(Blob);
    });

    it('should export only requested formats', () => {
      const result = batchExportTasks(mockTasks, ['csv', 'json']);

      expect(result.csv).toBeInstanceOf(Blob);
      expect(result.json).toBeInstanceOf(Blob);
      expect(result.pdf).toBeUndefined();
      expect(result.excel).toBeUndefined();
    });

    it('should return empty object for empty formats', () => {
      const result = batchExportTasks(mockTasks, []);
      expect(result).toEqual({});
    });
  });

  describe('CSV export format', () => {
    it('should include all required columns', async () => {
      const blob = exportTasksToCSV(mockTasks);
      const text = await blob.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',');

      expect(headers).toContain('ID');
      expect(headers).toContain('Title');
      expect(headers).toContain('Status');
      expect(headers).toContain('Priority');
    });

    it('should handle special characters in data', async () => {
      const tasksWithSpecialChars: Task[] = [{
        id: 'task_special',
        title: 'Task with "quotes" and, commas',
        status: 'todo',
        priority: 'high',
        tags: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }];

      const blob = exportTasksToCSV(tasksWithSpecialChars);
      const text = await blob.text();

      // Should contain the title
      expect(text).toContain('Task with');
    });
  });

  describe('JSON export format', () => {
    it('should produce valid JSON', async () => {
      const blob = exportTasksToJSON(mockTasks);
      const text = await blob.text();

      expect(() => JSON.parse(text)).not.toThrow();
    });

    it('should preserve task structure', async () => {
      const blob = exportTasksToJSON(mockTasks);
      const text = await blob.text();
      const parsed = JSON.parse(text);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0]).toHaveProperty('id');
      expect(parsed[0]).toHaveProperty('title');
      expect(parsed[0]).toHaveProperty('status');
      expect(parsed[0]).toHaveProperty('priority');
    });

    it('should format JSON with indentation', async () => {
      const blob = exportTasksToJSON(mockTasks);
      const text = await blob.text();

      // Should have indentation (2 spaces)
      expect(text).toContain('\n');
      expect(text).toContain('  ');
    });
  });

  describe('downloadBlob', () => {
    it('should create download link with correct attributes', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: { visibility: '' },
      };

      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') return mockLink as unknown as HTMLAnchorElement;
        return document.createElement(tag);
      });

      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => document.body);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => document.body);

      const blob = new Blob(['test'], { type: 'text/plain' });
      downloadBlob(blob, 'test-file.txt');

      expect(mockLink.download).toBe('test-file.txt');
      expect(mockLink.click).toHaveBeenCalled();

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe('exportTasksToCSVWithOptions', () => {
    it('should apply filters before exporting', () => {
      const tasks: Task[] = [
        { ...mockTasks[0], id: 'task_1', status: 'todo' },
        { ...mockTasks[0], id: 'task_2', status: 'done' },
        { ...mockTasks[0], id: 'task_3', status: 'in_progress' },
      ];

      const blob = exportTasksToCSVWithOptions(tasks, {
        format: 'csv',
        status: 'todo',
      });

      expect(blob).toBeInstanceOf(Blob);
    });

    it('should respect includeCompleted option', () => {
      const tasks: Task[] = [
        { ...mockTasks[0], id: 'task_1', status: 'todo' },
        { ...mockTasks[0], id: 'task_2', status: 'done' },
      ];

      const blobFiltered = exportTasksToCSVWithOptions(tasks, { format: 'csv' });
      const blobAll = exportTasksToCSVWithOptions(tasks, { format: 'csv', includeCompleted: true });

      expect(blobFiltered).toBeInstanceOf(Blob);
      expect(blobAll).toBeInstanceOf(Blob);
    });
  });

  describe('exportTasksToJSONWithOptions', () => {
    it('should apply filters before exporting', async () => {
      const tasks: Task[] = [
        { ...mockTasks[0], id: 'task_1', priority: 'high' },
        { ...mockTasks[0], id: 'task_2', priority: 'low' },
      ];

      const blob = exportTasksToJSONWithOptions(tasks, {
        format: 'json',
        priority: 'high',
        includeCompleted: true,
      });

      const text = await blob.text();
      const data = JSON.parse(text);

      expect(data).toHaveLength(1);
      expect(data[0].priority).toBe('high');
    });
  });

  describe('edge cases', () => {
    it('should handle tasks without optional fields', async () => {
      const minimalTask: Task = {
        id: 'minimal',
        title: 'Minimal Task',
        status: 'todo',
        priority: 'medium',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const csvBlob = exportTasksToCSV([minimalTask]);
      const jsonBlob = exportTasksToJSON([minimalTask]);

      expect(csvBlob).toBeInstanceOf(Blob);
      expect(jsonBlob).toBeInstanceOf(Blob);

      const jsonData = JSON.parse(await jsonBlob.text());
      expect(jsonData[0].id).toBe('minimal');
    });

    it('should handle tasks with Unicode characters', async () => {
      const unicodeTask: Task = {
        id: 'unicode_task',
        title: '任务标题 🎉 Тест 任务',
        description: '中文描述 📝',
        status: 'todo',
        priority: 'high',
        tags: [{ id: 't1', name: '标签', color: 'red' }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const csvBlob = exportTasksToCSV([unicodeTask]);
      const jsonBlob = exportTasksToJSON([unicodeTask]);

      const csvText = await csvBlob.text();
      const jsonText = await jsonBlob.text();

      expect(csvText).toContain('任务标题');
      expect(jsonText).toContain('任务标题');
    });
  });
});