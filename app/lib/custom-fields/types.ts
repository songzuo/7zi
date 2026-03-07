/**
 * 自定义字段系统类型定义
 * @module lib/custom-fields/types
 * @description 支持任务、项目等实体的自定义字段扩展
 */

/**
 * 自定义字段类型
 */
export type CustomFieldType =
  | 'text'      // 文本
  | 'number'    // 数字
  | 'date'      // 日期
  | 'select'    // 单选
  | 'multiselect' // 多选
  | 'checkbox'  // 复选框
  | 'url'       // URL
  | 'email'     // 邮箱
  | 'phone'     // 电话
  | 'textarea'  // 多行文本
  | 'currency'  // 货币
  | 'percent'   // 百分比
  | 'user';     // 用户引用

/**
 * 自定义字段选项（用于 select/multiselect）
 */
export interface CustomFieldOption {
  id: string;
  label: string;
  value: string;
  color?: string;
  icon?: string;
}

/**
 * 自定义字段定义
 */
export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  description?: string;
  required?: boolean;
  defaultValue?: CustomFieldValue;
  options?: CustomFieldOption[]; // 用于 select/multiselect
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string; // 正则表达式
    message?: string; // 验证失败消息
  };
  entityType: 'task' | 'member' | 'project' | 'issue';
  displayOrder: number;
  showInList?: boolean;  // 是否在列表视图显示
  showInExport?: boolean; // 是否在导出中包含
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 自定义字段值
 */
export type CustomFieldValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | null;

/**
 * 实体的自定义字段值映射
 */
export type CustomFieldValues = Record<string, CustomFieldValue>;

/**
 * 自定义字段模板
 */
export interface CustomFieldTemplate {
  id: string;
  name: string;
  description?: string;
  fields: CustomFieldDefinition[];
  entityType: 'task' | 'member' | 'project' | 'issue';
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 自定义字段统计
 */
export interface CustomFieldStats {
  totalFields: number;
  byType: Record<CustomFieldType, number>;
  byEntity: Record<string, number>;
  requiredFields: number;
}

/**
 * 字段类型配置
 */
export const FIELD_TYPE_CONFIG: Record<CustomFieldType, {
  label: string;
  icon: string;
  defaultValue: CustomFieldValue;
  supportsOptions: boolean;
}> = {
  text: { label: '文本', icon: '📝', defaultValue: '', supportsOptions: false },
  number: { label: '数字', icon: '🔢', defaultValue: 0, supportsOptions: false },
  date: { label: '日期', icon: '📅', defaultValue: null, supportsOptions: false },
  select: { label: '单选', icon: '📋', defaultValue: '', supportsOptions: true },
  multiselect: { label: '多选', icon: '☑️', defaultValue: [], supportsOptions: true },
  checkbox: { label: '复选框', icon: '✅', defaultValue: false, supportsOptions: false },
  url: { label: '链接', icon: '🔗', defaultValue: '', supportsOptions: false },
  email: { label: '邮箱', icon: '📧', defaultValue: '', supportsOptions: false },
  phone: { label: '电话', icon: '📞', defaultValue: '', supportsOptions: false },
  textarea: { label: '多行文本', icon: '📄', defaultValue: '', supportsOptions: false },
  currency: { label: '货币', icon: '💰', defaultValue: 0, supportsOptions: false },
  percent: { label: '百分比', icon: '📊', defaultValue: 0, supportsOptions: false },
  user: { label: '用户', icon: '👤', defaultValue: '', supportsOptions: false },
};

/**
 * 预定义字段模板
 */
export const PREDEFINED_TEMPLATES: CustomFieldTemplate[] = [
  {
    id: 'template-task-basic',
    name: '基础任务模板',
    description: '包含常用的任务自定义字段',
    entityType: 'task',
    isDefault: true,
    fields: [
      {
        id: 'field-estimated-hours',
        name: '预估工时',
        type: 'number',
        entityType: 'task',
        displayOrder: 1,
        showInList: true,
        showInExport: true,
        validation: { min: 0, max: 1000 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'field-actual-hours',
        name: '实际工时',
        type: 'number',
        entityType: 'task',
        displayOrder: 2,
        showInList: true,
        showInExport: true,
        validation: { min: 0, max: 1000 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'field-story-points',
        name: '故事点',
        type: 'number',
        entityType: 'task',
        displayOrder: 3,
        showInList: true,
        showInExport: true,
        validation: { min: 0, max: 100 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'field-sprint',
        name: '迭代',
        type: 'select',
        entityType: 'task',
        displayOrder: 4,
        showInList: true,
        showInExport: true,
        options: [
          { id: 'sprint-1', label: 'Sprint 1', value: 'sprint-1' },
          { id: 'sprint-2', label: 'Sprint 2', value: 'sprint-2' },
          { id: 'sprint-3', label: 'Sprint 3', value: 'sprint-3' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'template-task-advanced',
    name: '高级任务模板',
    description: '包含更丰富的任务管理字段',
    entityType: 'task',
    isDefault: false,
    fields: [
      {
        id: 'field-customer',
        name: '客户',
        type: 'text',
        entityType: 'task',
        displayOrder: 1,
        showInList: true,
        showInExport: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'field-budget',
        name: '预算',
        type: 'currency',
        entityType: 'task',
        displayOrder: 2,
        showInList: true,
        showInExport: true,
        validation: { min: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'field-progress',
        name: '进度',
        type: 'percent',
        entityType: 'task',
        displayOrder: 3,
        showInList: true,
        showInExport: true,
        validation: { min: 0, max: 100 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'field-department',
        name: '部门',
        type: 'select',
        entityType: 'task',
        displayOrder: 4,
        showInList: true,
        showInExport: true,
        options: [
          { id: 'dept-dev', label: '开发部', value: 'dev', color: 'blue' },
          { id: 'dept-design', label: '设计部', value: 'design', color: 'purple' },
          { id: 'dept-marketing', label: '市场部', value: 'marketing', color: 'green' },
          { id: 'dept-sales', label: '销售部', value: 'sales', color: 'orange' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'template-member-profile',
    name: '成员档案模板',
    description: 'AI 团队成员扩展信息',
    entityType: 'member',
    isDefault: true,
    fields: [
      {
        id: 'field-specialty',
        name: '专长',
        type: 'multiselect',
        entityType: 'member',
        displayOrder: 1,
        showInList: true,
        showInExport: true,
        options: [
          { id: 'spec-frontend', label: '前端开发', value: 'frontend' },
          { id: 'spec-backend', label: '后端开发', value: 'backend' },
          { id: 'spec-devops', label: 'DevOps', value: 'devops' },
          { id: 'spec-testing', label: '测试', value: 'testing' },
          { id: 'spec-design', label: '设计', value: 'design' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'field-hourly-rate',
        name: '时薪',
        type: 'currency',
        entityType: 'member',
        displayOrder: 2,
        showInList: false,
        showInExport: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'field-timezone',
        name: '时区',
        type: 'select',
        entityType: 'member',
        displayOrder: 3,
        showInList: true,
        showInExport: true,
        options: [
          { id: 'tz-utc', label: 'UTC', value: 'UTC' },
          { id: 'tz-cst', label: '中国标准时间', value: 'Asia/Shanghai' },
          { id: 'tz-pst', label: '太平洋标准时间', value: 'America/Los_Angeles' },
          { id: 'tz-est', label: '东部标准时间', value: 'America/New_York' },
          { id: 'tz-cet', label: '欧洲中部时间', value: 'Europe/Berlin' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
