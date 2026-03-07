/**
 * 数据导入模块测试
 * @module lib/db/__tests__/import.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseCSV,
  importFromCSV,
  importFromJSON,
  importData,
  generateCSVTemplate,
  generateJSONTemplate,
  validateImportFile,
  type ImportOptions,
} from '../import';

// Mock tasks.repository
vi.mock('../tasks.repository', () => ({
  createTask: vi.fn(async (taskData) => ({
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: taskData.title,
    description: taskData.description,
    priority: taskData.priority,
    status: taskData.status,
    tags: taskData.tags,
    assignee: taskData.assignee,
    dueDate: taskData.dueDate,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  getAllTasks: vi.fn(async () => []),
}));

describe('parseCSV', () => {
  it('应该正确解析基本 CSV', () => {
    const csv = `title,description,priority,status
任务1,描述1,high,todo
任务2,描述2,medium,in_progress`;

    const rows = parseCSV(csv);
    
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      title: '任务1',
      description: '描述1',
      priority: 'high',
      status: 'todo',
    });
    expect(rows[1]).toEqual({
      title: '任务2',
      description: '描述2',
      priority: 'medium',
      status: 'in_progress',
    });
  });

  it('应该处理引号包裹的字段', () => {
    const csv = `title,description
"包含,逗号的任务","这是""引号""测试"`;

    const rows = parseCSV(csv);
    
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('包含,逗号的任务');
    expect(rows[0].description).toBe('这是"引号"测试');
  });

  it('应该处理空 CSV', () => {
    expect(parseCSV('')).toEqual([]);
    expect(parseCSV('只有表头')).toEqual([]);
  });

  it('应该忽略表头前后空格', () => {
    const csv = ` title , description 
任务1,描述1`;

    const rows = parseCSV(csv);
    expect(rows[0]).toHaveProperty('title');
    expect(rows[0]).toHaveProperty('description');
  });

  it('应该处理不同换行符', () => {
    const csv = 'title\r\n任务1\n任务2';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
  });
});

describe('importFromCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该成功导入基本 CSV', async () => {
    const csv = `title,description,priority,status,tags
任务1,描述1,high,todo,feature
任务2,描述2,medium,in_progress,bug|urgent`;

    const result = await importFromCSV(csv);
    
    expect(result.success).toBe(true);
    expect(result.imported).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.tasks).toHaveLength(2);
  });

  it('应该正确处理中文字段名', async () => {
    const csv = `任务名称,描述,优先级,状态,标签
测试任务,测试描述,高,待办,功能`;

    const result = await importFromCSV(csv);
    
    expect(result.success).toBe(true);
    expect(result.imported).toBe(1);
    expect(result.tasks?.[0].title).toBe('测试任务');
  });

  it('应该使用默认值', async () => {
    const csv = `title
只有标题的任务`;

    const result = await importFromCSV(csv);
    
    expect(result.success).toBe(true);
    expect(result.tasks?.[0].priority).toBe('medium');
    expect(result.tasks?.[0].status).toBe('todo');
  });

  it('应该正确解析不同日期格式', async () => {
    const csv = `title,due_date
任务1,2024-12-31
任务2,2024/12/31
任务3,December 31, 2024`;

    const result = await importFromCSV(csv);
    
    expect(result.success).toBe(true);
    expect(result.imported).toBe(3);
  });

  it('应该处理缺少标题的行', async () => {
    const csv = `title,priority
,high
任务1,medium`;

    const result = await importFromCSV(csv, { skipErrors: true });
    
    // 空标题会使用默认值"未命名任务"，所以两个都会被导入
    expect(result.imported).toBe(2);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('应该在 skipErrors=false 时遇到错误停止', async () => {
    const csv = `title,priority
,high
任务1,medium`;

    const result = await importFromCSV(csv, { skipErrors: false });
    
    expect(result.success).toBe(false);
    expect(result.failed).toBeGreaterThan(0);
  });

  it('应该正确解析多种优先级格式', async () => {
    const csv = `title,priority
任务1,high
任务2,高
任务3,紧急
任务4,urgent`;

    const result = await importFromCSV(csv);
    
    expect(result.success).toBe(true);
    expect(result.tasks?.[0].priority).toBe('high');
    expect(result.tasks?.[1].priority).toBe('high');
    expect(result.tasks?.[2].priority).toBe('high');
    expect(result.tasks?.[3].priority).toBe('high');
  });

  it('应该正确解析多种状态格式', async () => {
    const csv = `title,status
任务1,todo
任务2,待办
任务3,in_progress
任务4,进行中
任务5,done
任务6,完成`;

    const result = await importFromCSV(csv);
    
    expect(result.success).toBe(true);
    expect(result.tasks?.[0].status).toBe('todo');
    expect(result.tasks?.[1].status).toBe('todo');
    expect(result.tasks?.[2].status).toBe('in_progress');
    expect(result.tasks?.[3].status).toBe('in_progress');
    expect(result.tasks?.[4].status).toBe('done');
    expect(result.tasks?.[5].status).toBe('done');
  });

  it('应该使用自定义默认优先级和状态', async () => {
    const csv = `title
任务1`;

    const options: ImportOptions = {
      defaultPriority: 'low',
      defaultStatus: 'review',
    };
    
    const result = await importFromCSV(csv, options);
    
    expect(result.tasks?.[0].priority).toBe('low');
    expect(result.tasks?.[0].status).toBe('review');
  });
});

describe('importFromJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该成功导入基本 JSON', async () => {
    const json = JSON.stringify({
      tasks: [
        { title: '任务1', description: '描述1', priority: 'high', status: 'todo' },
        { title: '任务2', description: '描述2', priority: 'medium', status: 'in_progress' },
      ],
    });

    const result = await importFromJSON(json);
    
    expect(result.success).toBe(true);
    expect(result.imported).toBe(2);
    expect(result.tasks).toHaveLength(2);
  });

  it('应该处理空任务数组', async () => {
    const json = JSON.stringify({ tasks: [] });

    const result = await importFromJSON(json);
    
    expect(result.success).toBe(true);
    expect(result.imported).toBe(0);
  });

  it('应该处理无效 JSON', async () => {
    const result = await importFromJSON('not valid json');
    
    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('JSON 解析失败');
  });

  it('应该处理缺少 tasks 字段的情况', async () => {
    const json = JSON.stringify({ otherField: 'value' });

    const result = await importFromJSON(json);
    
    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('tasks 数组');
  });

  it('应该处理缺少标题的任务', async () => {
    const json = JSON.stringify({
      tasks: [
        { description: '没有标题' },
        { title: '有标题', description: '描述' },
      ],
    });

    const result = await importFromJSON(json, { skipErrors: true });
    
    // 空标题会使用默认值"未命名任务"，所以两个都会被导入
    expect(result.imported).toBe(2);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('应该正确处理标签数组', async () => {
    const json = JSON.stringify({
      tasks: [
        { title: '任务1', tags: ['feature', 'urgent'] },
      ],
    });

    const result = await importFromJSON(json);
    
    expect(result.success).toBe(true);
    expect(result.tasks?.[0].tags).toHaveLength(2);
  });
});

describe('importData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该根据文件扩展名选择导入方法 (CSV)', async () => {
    const csv = 'title\n任务1';
    const result = await importData(csv, 'tasks.csv');
    
    expect(result.success).toBe(true);
    expect(result.imported).toBe(1);
  });

  it('应该根据文件扩展名选择导入方法 (JSON)', async () => {
    const json = JSON.stringify({ tasks: [{ title: '任务1' }] });
    const result = await importData(json, 'tasks.json');
    
    expect(result.success).toBe(true);
    expect(result.imported).toBe(1);
  });

  it('应该自动检测 JSON 格式', async () => {
    const json = JSON.stringify({ tasks: [{ title: '任务1' }] });
    const result = await importData(json, 'unknown.txt');
    
    expect(result.success).toBe(true);
    expect(result.imported).toBe(1);
  });

  it('应该将未知格式默认当作 CSV', async () => {
    const csv = 'title\n任务1';
    const result = await importData(csv, 'unknown.xyz');
    
    expect(result.success).toBe(true);
    expect(result.imported).toBe(1);
  });
});

describe('generateCSVTemplate', () => {
  it('应该生成有效的 CSV 模板', () => {
    const template = generateCSVTemplate();
    
    expect(template).toContain('title');
    expect(template).toContain('description');
    expect(template).toContain('priority');
    expect(template).toContain('status');
    
    // 应该能被解析
    const rows = parseCSV(template);
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe('generateJSONTemplate', () => {
  it('应该生成有效的 JSON 模板', () => {
    const template = generateJSONTemplate();
    
    expect(template).toContain('tasks');
    
    // 应该能被解析
    const data = JSON.parse(template);
    expect(Array.isArray(data.tasks)).toBe(true);
    expect(data.tasks.length).toBeGreaterThan(0);
  });
});

describe('validateImportFile', () => {
  it('应该验证有效的 CSV 文件', () => {
    const content = 'title,description\n任务1,描述1';
    const result = validateImportFile(content, 'tasks.csv');
    
    expect(result.valid).toBe(true);
    expect(result.format).toBe('csv');
  });

  it('应该验证有效的 JSON 文件', () => {
    const content = JSON.stringify({ tasks: [{ title: '任务1' }] });
    const result = validateImportFile(content, 'tasks.json');
    
    expect(result.valid).toBe(true);
    expect(result.format).toBe('json');
  });

  it('应该拒绝只有表头的 CSV', () => {
    const content = 'title,description';
    const result = validateImportFile(content, 'tasks.csv');
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('至少需要');
  });

  it('应该拒绝无效的 JSON', () => {
    const content = 'not valid json';
    const result = validateImportFile(content, 'tasks.json');
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('格式不正确');
  });

  it('应该拒绝没有 tasks 数组的 JSON', () => {
    const content = JSON.stringify({ otherField: 'value' });
    const result = validateImportFile(content, 'tasks.json');
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('tasks 数组');
  });

  it('应该拒绝不支持的文件格式', () => {
    const content = 'some content';
    const result = validateImportFile(content, 'tasks.txt');
    
    expect(result.valid).toBe(false);
    expect(result.format).toBe('unknown');
  });
});