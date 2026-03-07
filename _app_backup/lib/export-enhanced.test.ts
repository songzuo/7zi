/**
 * 导出增强模块测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Task, TaskPriority, TaskStatus, TaskTag } from './tasks/types';
import {
  exportTasksToExcelEnhanced,
  exportWithTemplate,
  batchExportEnhanced,
  createCustomField,
  validateCustomFieldValue,
  getCustomFieldDefaultValue,
  initializeCustomFields,
  createColumnBuilder,
  ExportColumnBuilder,
  ExportConfigManager,
  exportConfigManager,
  SIMPLE_EXPORT_TEMPLATE,
  DETAILED_EXPORT_TEMPLATE,
  PROJECT_MANAGEMENT_TEMPLATE,
  DEFAULT_TASK_COLUMNS,
  type TaskWithCustomFields,
  type CustomFieldDefinition,
  type ExcelExportOptions,
} from './export-enhanced';

// Mock XLSX
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({ '!cols': [] })),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
    encode_range: vi.fn(() => 'A1:K10'),
  },
  write: vi.fn(() => new ArrayBuffer(8)),
}));

// 创建模拟任务
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task_${Date.now()}`,
    title: '测试任务',
    description: '测试描述',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    tags: [{ id: 'tag1', name: 'Bug', color: 'red' }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    ...overrides,
  };
}

function createMockTaskWithCustomFields(
  task: Task,
  customFields: Array<{ fieldId: string; value: unknown }> = []
): TaskWithCustomFields {
  return {
    ...task,
    customFields,
  };
}

describe('export-enhanced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Excel 导出测试
  // ============================================================================

  describe('exportTasksToExcelEnhanced', () => {
    it('should export tasks to Excel blob', () => {
      const tasks = [createMockTask(), createMockTask({ id: 'task_2' })];
      const blob = exportTasksToExcelEnhanced(tasks);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('should handle empty task list', () => {
      const blob = exportTasksToExcelEnhanced([]);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should use custom sheet name', () => {
      const tasks = [createMockTask()];
      const options: ExcelExportOptions = {
        sheetName: '自定义工作表',
      };
      const blob = exportTasksToExcelEnhanced(tasks, options);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should include stats when option is true', () => {
      const tasks = [
        createMockTask({ status: 'todo' }),
        createMockTask({ status: 'done' }),
        createMockTask({ status: 'in_progress' }),
      ];
      const blob = exportTasksToExcelEnhanced(tasks, { includeStats: true });
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should use custom columns', () => {
      const tasks = [createMockTask()];
      const options: ExcelExportOptions = {
        columns: [
          { key: 'title', header: '任务名称', width: 30 },
          { key: 'status', header: '状态', width: 10 },
        ],
      };
      const blob = exportTasksToExcelEnhanced(tasks, options);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle tasks with custom fields', () => {
      const customFieldDefs: CustomFieldDefinition[] = [
        { id: 'progress', name: '进度', type: 'number', defaultValue: 0 },
        { id: 'estimatedHours', name: '预估工时', type: 'number' },
      ];

      const task = createMockTask();
      const taskWithFields = createMockTaskWithCustomFields(task, [
        { fieldId: 'progress', value: 50 },
        { fieldId: 'estimatedHours', value: 8 },
      ]);

      const options: ExcelExportOptions = {
        customFields: customFieldDefs,
        columns: [
          { key: 'title', header: '任务', width: 30 },
          { key: 'progress', header: '进度', width: 10 },
          { key: 'estimatedHours', header: '工时', width: 10 },
        ],
      };

      const blob = exportTasksToExcelEnhanced([taskWithFields], options);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should format dates correctly', () => {
      const task = createMockTask({
        dueDate: new Date('2024-06-15'),
      });

      const options: ExcelExportOptions = {
        columns: [
          { key: 'title', header: '任务', width: 30 },
          { key: 'dueDate', header: '截止日期', width: 15, type: 'date', format: 'yyyy-mm-dd' },
        ],
      };

      const blob = exportTasksToExcelEnhanced([task], options);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should apply column transforms', () => {
      const task = createMockTask({ status: 'todo' });

      const options: ExcelExportOptions = {
        columns: [
          { key: 'title', header: '任务', width: 30 },
          {
            key: 'status',
            header: '状态',
            width: 15,
            transform: (value) => `[${value}]`,
          },
        ],
      };

      const blob = exportTasksToExcelEnhanced([task], options);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  // ============================================================================
  // 模板导出测试
  // ============================================================================

  describe('exportWithTemplate', () => {
    it('should export with simple template', () => {
      const tasks = [createMockTask()];
      const blob = exportWithTemplate(tasks, SIMPLE_EXPORT_TEMPLATE);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should export with detailed template', () => {
      const tasks = [createMockTask()];
      const blob = exportWithTemplate(tasks, DETAILED_EXPORT_TEMPLATE);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should export with project management template', () => {
      const tasks = [createMockTask()];
      const blob = exportWithTemplate(tasks, PROJECT_MANAGEMENT_TEMPLATE);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should merge template options with custom options', () => {
      const tasks = [createMockTask()];
      const blob = exportWithTemplate(tasks, DETAILED_EXPORT_TEMPLATE, {
        sheetName: '自定义名称',
      });
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  // ============================================================================
  // 批量导出测试
  // ============================================================================

  describe('batchExportEnhanced', () => {
    it('should return export result with blob and stats', () => {
      const tasks = [createMockTask(), createMockTask()];
      const result = batchExportEnhanced(tasks);

      expect(result.excel).toBeDefined();
      expect(result.excel!.blob).toBeInstanceOf(Blob);
      expect(result.excel!.filename).toContain('tasks-');
      expect(result.stats).toBeDefined();
      expect(result.stats!.totalRows).toBe(2);
      expect(result.stats!.exportedAt).toBeInstanceOf(Date);
    });

    it('should use custom filename', () => {
      const tasks = [createMockTask()];
      const result = batchExportEnhanced(tasks, { filename: 'custom-export.xlsx' });

      expect(result.excel!.filename).toBe('custom-export.xlsx');
    });
  });

  // ============================================================================
  // 自定义字段测试
  // ============================================================================

  describe('createCustomField', () => {
    it('should create text field', () => {
      const field = createCustomField('notes', '备注', 'text');
      expect(field.id).toBe('notes');
      expect(field.name).toBe('备注');
      expect(field.type).toBe('text');
    });

    it('should create number field with options', () => {
      const field = createCustomField('hours', '工时', 'number', {
        defaultValue: 0,
        required: true,
      });
      expect(field.type).toBe('number');
      expect(field.defaultValue).toBe(0);
      expect(field.required).toBe(true);
    });

    it('should create select field with options', () => {
      const field = createCustomField('category', '类别', 'select', {
        options: ['Bug', 'Feature', 'Enhancement'],
      });
      expect(field.type).toBe('select');
      expect(field.options).toEqual(['Bug', 'Feature', 'Enhancement']);
    });

    it('should create date field', () => {
      const field = createCustomField('startDate', '开始日期', 'date');
      expect(field.type).toBe('date');
    });

    it('should create boolean field', () => {
      const field = createCustomField('isUrgent', '紧急', 'boolean', {
        defaultValue: false,
      });
      expect(field.type).toBe('boolean');
      expect(field.defaultValue).toBe(false);
    });
  });

  describe('validateCustomFieldValue', () => {
    it('should validate required field', () => {
      const field: CustomFieldDefinition = {
        id: 'title',
        name: '标题',
        type: 'text',
        required: true,
      };

      const result = validateCustomFieldValue(field, '');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('必填');
    });

    it('should validate number field', () => {
      const field: CustomFieldDefinition = {
        id: 'hours',
        name: '工时',
        type: 'number',
      };

      expect(validateCustomFieldValue(field, 10).valid).toBe(true);
      expect(validateCustomFieldValue(field, 'not a number').valid).toBe(false);
    });

    it('should validate date field', () => {
      const field: CustomFieldDefinition = {
        id: 'dueDate',
        name: '截止日期',
        type: 'date',
      };

      expect(validateCustomFieldValue(field, new Date()).valid).toBe(true);
      expect(validateCustomFieldValue(field, '2024-01-01').valid).toBe(true);
      expect(validateCustomFieldValue(field, 'invalid date').valid).toBe(false);
    });

    it('should validate boolean field', () => {
      const field: CustomFieldDefinition = {
        id: 'isUrgent',
        name: '紧急',
        type: 'boolean',
      };

      expect(validateCustomFieldValue(field, true).valid).toBe(true);
      expect(validateCustomFieldValue(field, false).valid).toBe(true);
      expect(validateCustomFieldValue(field, 'yes').valid).toBe(false);
    });

    it('should validate select field', () => {
      const field: CustomFieldDefinition = {
        id: 'category',
        name: '类别',
        type: 'select',
        options: ['Bug', 'Feature', 'Enhancement'],
      };

      expect(validateCustomFieldValue(field, 'Bug').valid).toBe(true);
      expect(validateCustomFieldValue(field, 'Invalid').valid).toBe(false);
    });

    it('should allow undefined for non-required fields', () => {
      const field: CustomFieldDefinition = {
        id: 'optional',
        name: '可选字段',
        type: 'text',
      };

      expect(validateCustomFieldValue(field, undefined).valid).toBe(true);
    });
  });

  describe('getCustomFieldDefaultValue', () => {
    it('should return explicit default value', () => {
      const field: CustomFieldDefinition = {
        id: 'progress',
        name: '进度',
        type: 'number',
        defaultValue: 50,
      };

      expect(getCustomFieldDefaultValue(field)).toBe(50);
    });

    it('should return type-based default for text', () => {
      const field: CustomFieldDefinition = {
        id: 'notes',
        name: '备注',
        type: 'text',
      };

      expect(getCustomFieldDefaultValue(field)).toBe('');
    });

    it('should return type-based default for number', () => {
      const field: CustomFieldDefinition = {
        id: 'count',
        name: '数量',
        type: 'number',
      };

      expect(getCustomFieldDefaultValue(field)).toBe(0);
    });

    it('should return type-based default for boolean', () => {
      const field: CustomFieldDefinition = {
        id: 'active',
        name: '激活',
        type: 'boolean',
      };

      expect(getCustomFieldDefaultValue(field)).toBe(false);
    });

    it('should return first option for select', () => {
      const field: CustomFieldDefinition = {
        id: 'category',
        name: '类别',
        type: 'select',
        options: ['A', 'B', 'C'],
      };

      expect(getCustomFieldDefaultValue(field)).toBe('A');
    });

    it('should return null for date', () => {
      const field: CustomFieldDefinition = {
        id: 'date',
        name: '日期',
        type: 'date',
      };

      expect(getCustomFieldDefaultValue(field)).toBeNull();
    });
  });

  describe('initializeCustomFields', () => {
    it('should initialize task with custom fields', () => {
      const task = createMockTask();
      const fieldDefs: CustomFieldDefinition[] = [
        { id: 'progress', name: '进度', type: 'number', defaultValue: 0 },
        { id: 'isUrgent', name: '紧急', type: 'boolean', defaultValue: false },
      ];

      const taskWithFields = initializeCustomFields(task, fieldDefs);

      expect(taskWithFields.customFields).toHaveLength(2);
      expect(taskWithFields.customFields![0].fieldId).toBe('progress');
      expect(taskWithFields.customFields![0].value).toBe(0);
      expect(taskWithFields.customFields![1].fieldId).toBe('isUrgent');
      expect(taskWithFields.customFields![1].value).toBe(false);
    });

    it('should preserve original task properties', () => {
      const task = createMockTask();
      const fieldDefs: CustomFieldDefinition[] = [
        { id: 'notes', name: '备注', type: 'text' },
      ];

      const taskWithFields = initializeCustomFields(task, fieldDefs);

      expect(taskWithFields.id).toBe(task.id);
      expect(taskWithFields.title).toBe(task.title);
      expect(taskWithFields.status).toBe(task.status);
    });
  });

  // ============================================================================
  // 列构建器测试
  // ============================================================================

  describe('ExportColumnBuilder', () => {
    it('should build columns fluently', () => {
      const builder = new ExportColumnBuilder();
      const columns = builder
        .add('title', '任务', { width: 30 })
        .add('status', '状态', { width: 10 })
        .build();

      expect(columns).toHaveLength(2);
      expect(columns[0].key).toBe('title');
      expect(columns[1].key).toBe('status');
    });

    it('should add standard columns', () => {
      const builder = new ExportColumnBuilder();
      const columns = builder.addStandard().build();

      expect(columns.length).toBeGreaterThan(5);
      expect(columns.find(c => c.key === 'id')).toBeDefined();
      expect(columns.find(c => c.key === 'title')).toBeDefined();
      expect(columns.find(c => c.key === 'status')).toBeDefined();
    });

    it('should add custom field columns', () => {
      const field: CustomFieldDefinition = {
        id: 'progress',
        name: '进度',
        type: 'number',
      };

      const builder = new ExportColumnBuilder();
      const columns = builder.addCustomField(field, 15).build();

      expect(columns).toHaveLength(1);
      expect(columns[0].key).toBe('progress');
      expect(columns[0].header).toBe('进度');
    });

    it('should reset columns', () => {
      const builder = new ExportColumnBuilder();
      builder.add('title', '任务');
      builder.reset();
      const columns = builder.build();

      expect(columns).toHaveLength(0);
    });

    it('should combine standard and custom columns', () => {
      const field: CustomFieldDefinition = {
        id: 'progress',
        name: '进度',
        type: 'number',
      };

      const builder = new ExportColumnBuilder();
      const columns = builder
        .addStandard()
        .addCustomField(field)
        .build();

      expect(columns.length).toBe(DEFAULT_TASK_COLUMNS.length + 1);
    });
  });

  describe('createColumnBuilder', () => {
    it('should create a new builder instance', () => {
      const builder = createColumnBuilder();
      expect(builder).toBeInstanceOf(ExportColumnBuilder);
    });
  });

  // ============================================================================
  // 配置管理器测试
  // ============================================================================

  describe('ExportConfigManager', () => {
    it('should register and retrieve templates', () => {
      const manager = new ExportConfigManager();
      const template = {
        id: 'test',
        name: '测试模板',
        columns: [{ key: 'title', header: '任务', width: 30 }],
      };

      manager.register(template);
      const retrieved = manager.get('test');

      expect(retrieved).toEqual(template);
    });

    it('should return undefined for non-existent template', () => {
      const manager = new ExportConfigManager();
      expect(manager.get('non-existent')).toBeUndefined();
    });

    it('should return all templates', () => {
      const manager = new ExportConfigManager();
      const templates = manager.getAll();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.find(t => t.id === 'simple')).toBeDefined();
      expect(templates.find(t => t.id === 'detailed')).toBeDefined();
    });

    it('should remove templates', () => {
      const manager = new ExportConfigManager();
      const template = {
        id: 'removable',
        name: '可删除模板',
        columns: [{ key: 'title', header: '任务', width: 30 }],
      };

      manager.register(template);
      expect(manager.get('removable')).toBeDefined();

      manager.remove('removable');
      expect(manager.get('removable')).toBeUndefined();
    });
  });

  describe('exportConfigManager (global instance)', () => {
    it('should have default templates registered', () => {
      const templates = exportConfigManager.getAll();

      expect(templates.find(t => t.id === 'simple')).toBeDefined();
      expect(templates.find(t => t.id === 'detailed')).toBeDefined();
      expect(templates.find(t => t.id === 'project-management')).toBeDefined();
    });
  });

  // ============================================================================
  // 预定义模板测试
  // ============================================================================

  describe('DEFAULT_TASK_COLUMNS', () => {
    it('should have all essential columns', () => {
      const keys = DEFAULT_TASK_COLUMNS.map(c => c.key);

      expect(keys).toContain('id');
      expect(keys).toContain('title');
      expect(keys).toContain('status');
      expect(keys).toContain('priority');
      expect(keys).toContain('assignee');
      expect(keys).toContain('dueDate');
    });

    it('should have width defined for all columns', () => {
      DEFAULT_TASK_COLUMNS.forEach(col => {
        expect(col.width).toBeDefined();
        expect(col.width).toBeGreaterThan(0);
      });
    });
  });

  describe('SIMPLE_EXPORT_TEMPLATE', () => {
    it('should have minimal columns', () => {
      expect(SIMPLE_EXPORT_TEMPLATE.columns.length).toBeLessThan(DEFAULT_TASK_COLUMNS.length);
    });

    it('should have required columns', () => {
      const keys = SIMPLE_EXPORT_TEMPLATE.columns.map(c => c.key);
      expect(keys).toContain('title');
      expect(keys).toContain('status');
    });
  });

  describe('DETAILED_EXPORT_TEMPLATE', () => {
    it('should have all default columns', () => {
      expect(DETAILED_EXPORT_TEMPLATE.columns).toEqual(DEFAULT_TASK_COLUMNS);
    });

    it('should have stats enabled by default', () => {
      expect(DETAILED_EXPORT_TEMPLATE.defaultOptions?.includeStats).toBe(true);
    });
  });

  describe('PROJECT_MANAGEMENT_TEMPLATE', () => {
    it('should have custom fields defined', () => {
      expect(PROJECT_MANAGEMENT_TEMPLATE.customFields).toBeDefined();
      expect(PROJECT_MANAGEMENT_TEMPLATE.customFields!.length).toBeGreaterThan(0);
    });

    it('should have progress field', () => {
      const progressField = PROJECT_MANAGEMENT_TEMPLATE.customFields?.find(
        f => f.id === 'progress'
      );
      expect(progressField).toBeDefined();
      expect(progressField?.type).toBe('number');
    });
  });

  // ============================================================================
  // 边界情况测试
  // ============================================================================

  describe('edge cases', () => {
    it('should handle task without optional fields', () => {
      const minimalTask: Task = {
        id: 'minimal',
        title: '最小任务',
        status: 'todo',
        priority: 'medium',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const blob = exportTasksToExcelEnhanced([minimalTask]);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle task with null dates', () => {
      const taskWithNullDates: Task = {
        id: 'task_null_dates',
        title: '无日期任务',
        status: 'todo',
        priority: 'medium',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        dueDate: null as unknown as undefined,
        completedAt: null as unknown as undefined,
      };

      const blob = exportTasksToExcelEnhanced([taskWithNullDates]);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle task with unicode characters', () => {
      const unicodeTask: Task = {
        id: 'unicode_task',
        title: '任务标题 🎉 Тест 📝',
        description: '中文描述 with emoji 🚀',
        status: 'todo',
        priority: 'high',
        tags: [{ id: 'tag1', name: '标签🏷️', color: 'red' }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const blob = exportTasksToExcelEnhanced([unicodeTask]);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle very long task title', () => {
      const longTitleTask: Task = {
        id: 'long_title',
        title: '这是一个非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的任务标题',
        status: 'todo',
        priority: 'medium',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const blob = exportTasksToExcelEnhanced([longTitleTask]);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle empty columns array', () => {
      const task = createMockTask();
      const blob = exportTasksToExcelEnhanced([task], { columns: [] });
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle special characters in field values', () => {
      const taskWithSpecialChars: TaskWithCustomFields = {
        ...createMockTask(),
        title: 'Task with "quotes" and, commas',
        description: 'Line1\nLine2\tTabbed',
        customFields: [
          { fieldId: 'special', value: '<html>&amp;</html>' },
        ],
      };

      const options: ExcelExportOptions = {
        columns: [
          { key: 'title', header: 'Title', width: 30 },
          { key: 'description', header: 'Description', width: 50 },
        ],
        customFields: [{ id: 'special', name: 'Special', type: 'text' }],
      };

      const blob = exportTasksToExcelEnhanced([taskWithSpecialChars], options);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  // ============================================================================
  // 性能测试
  // ============================================================================

  describe('performance', () => {
    it('should handle large task list efficiently', () => {
      const tasks: Task[] = [];
      for (let i = 0; i < 1000; i++) {
        tasks.push(createMockTask({ id: `task_${i}` }));
      }

      const startTime = Date.now();
      const blob = exportTasksToExcelEnhanced(tasks);
      const duration = Date.now() - startTime;

      expect(blob).toBeInstanceOf(Blob);
      // Should complete in reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);
    });
  });
});
