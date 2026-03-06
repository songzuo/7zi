/**
 * Export API 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportTasksToCSV,
  exportTasksToJSON,
  exportTasksToPDF,
  exportTasksToExcel,
  ExportFormat,
} from './export';
import type { Task, TaskPriority, TaskStatus } from './tasks/types';

// Mock jsPDF - 使用命名导出 jsPDF
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    text: vi.fn(),
    save: vi.fn(),
    setFontSize: vi.fn(),
    addPage: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    line: vi.fn(),
    rect: vi.fn(),
    setTextColor: vi.fn(),
    output: vi.fn(() => new Blob(['pdf content'], { type: 'application/pdf' })),
  })),
}));

// Mock xlsx
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn(() => new ArrayBuffer(8)),
}));

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
    // Mock blob for downloads
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  });

  describe('exportTasksToCSV', () => {
    it('should export tasks to CSV format', async () => {
      const blob = await exportTasksToCSV(mockTasks);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv');
    });

    it('should handle empty task list', async () => {
      const blob = await exportTasksToCSV([]);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should include CSV headers', async () => {
      const blob = await exportTasksToCSV(mockTasks);
      const text = await blob.text();
      expect(text).toContain('ID,Title,Status,Priority');
    });
  });

  describe('exportTasksToJSON', () => {
    it('should export tasks to JSON format', async () => {
      const blob = await exportTasksToJSON(mockTasks);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });

    it('should serialize tasks correctly', async () => {
      const blob = await exportTasksToJSON(mockTasks);
      const text = await blob.text();
      const data = JSON.parse(text);
      expect(data).toEqual(mockTasks);
    });

    it('should handle empty task list', async () => {
      const blob = await exportTasksToJSON([]);
      expect(blob).toBeInstanceOf(Blob);
      const text = await blob.text();
      const data = JSON.parse(text);
      expect(data).toEqual([]);
    });
  });

  describe('exportTasksToPDF', () => {
    it('should export tasks to PDF format', async () => {
      const blob = await exportTasksToPDF(mockTasks);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle empty task list', async () => {
      const blob = await exportTasksToPDF([]);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('exportTasksToExcel', () => {
    it('should export tasks to Excel format', async () => {
      const blob = await exportTasksToExcel(mockTasks);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle empty task list', async () => {
      const blob = await exportTasksToExcel([]);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('ExportFormat types', () => {
    it('should have valid export formats', () => {
      const formats: ExportFormat[] = ['csv', 'json', 'pdf', 'excel'];
      expect(formats).toHaveLength(4);
    });
  });
});