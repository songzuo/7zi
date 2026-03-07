/**
 * 高级过滤器系统类型定义
 */

/**
 * 过滤条件操作符
 */
export type FilterOperator = 
  | 'equals' 
  | 'notEquals'
  | 'contains' 
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan' 
  | 'lessThan' 
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'in'
  | 'notIn';

/**
 * 过滤条件
 */
export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
}

/**
 * 过滤器逻辑关系
 */
export type FilterLogic = 'AND' | 'OR';

/**
 * 过滤器配置
 */
export interface FilterConfig {
  id: string;
  name: string;
  conditions: FilterCondition[];
  logic: FilterLogic;
  createdAt: string;
  updatedAt: string;
}

/**
 * 字段类型定义
 */
export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';

/**
 * 字段配置
 */
export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  operators: FilterOperator[];
  options?: { value: string; label: string }[];
  placeholder?: string;
}

/**
 * 预定义过滤器模板
 */
export interface FilterTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  conditions: Omit<FilterCondition, 'id'>[];
  logic: FilterLogic;
  category: 'task' | 'member' | 'general';
}

/**
 * TaskBoard 字段配置
 */
export const TASK_FILTER_FIELDS: FieldConfig[] = [
  {
    name: 'state',
    label: '状态',
    type: 'select',
    operators: ['equals', 'notEquals', 'in', 'notIn'],
    options: [
      { value: 'open', label: '开放' },
      { value: 'closed', label: '已关闭' },
    ],
  },
  {
    name: 'priority',
    label: '优先级',
    type: 'select',
    operators: ['equals', 'notEquals', 'in', 'notIn'],
    options: [
      { value: 'low', label: '低' },
      { value: 'medium', label: '中' },
      { value: 'high', label: '高' },
      { value: 'urgent', label: '紧急' },
    ],
  },
  {
    name: 'assignee',
    label: '负责人',
    type: 'string',
    operators: ['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty'],
    placeholder: '输入负责人名称',
  },
  {
    name: 'labels',
    label: '标签',
    type: 'multiselect',
    operators: ['contains', 'notContains', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
    placeholder: '选择标签',
  },
  {
    name: 'title',
    label: '标题',
    type: 'string',
    operators: ['equals', 'notEquals', 'contains', 'notContains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
    placeholder: '输入标题关键词',
  },
  {
    name: 'created_at',
    label: '创建时间',
    type: 'date',
    operators: ['equals', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual'],
  },
  {
    name: 'updated_at',
    label: '更新时间',
    type: 'date',
    operators: ['equals', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual'],
  },
  {
    name: 'comments',
    label: '评论数',
    type: 'number',
    operators: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual'],
    placeholder: '输入评论数',
  },
];

/**
 * MemberPresenceBoard 字段配置
 */
export const MEMBER_FILTER_FIELDS: FieldConfig[] = [
  {
    name: 'status',
    label: '状态',
    type: 'select',
    operators: ['equals', 'notEquals', 'in', 'notIn'],
    options: [
      { value: 'working', label: '工作中' },
      { value: 'busy', label: '忙碌' },
      { value: 'idle', label: '空闲' },
      { value: 'offline', label: '离线' },
    ],
  },
  {
    name: 'role',
    label: '角色',
    type: 'string',
    operators: ['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty'],
    placeholder: '输入角色名称',
  },
  {
    name: 'provider',
    label: '提供商',
    type: 'select',
    operators: ['equals', 'notEquals', 'in', 'notIn'],
    options: [
      { value: 'minimax', label: 'MiniMax' },
      { value: 'self-claude', label: 'Claude' },
      { value: 'volcengine', label: '火山引擎' },
      { value: 'bailian', label: '百炼' },
    ],
  },
  {
    name: 'name',
    label: '名称',
    type: 'string',
    operators: ['equals', 'notEquals', 'contains', 'notContains', 'startsWith', 'endsWith'],
    placeholder: '输入成员名称',
  },
  {
    name: 'currentTask',
    label: '当前任务',
    type: 'string',
    operators: ['contains', 'notContains', 'isEmpty', 'isNotEmpty'],
    placeholder: '输入任务关键词',
  },
  {
    name: 'completedTasks',
    label: '完成任务数',
    type: 'number',
    operators: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual'],
    placeholder: '输入任务数',
  },
  {
    name: 'activityLevel',
    label: '活动度',
    type: 'select',
    operators: ['equals', 'notEquals', 'in', 'notIn'],
    options: [
      { value: 'high', label: '高' },
      { value: 'medium', label: '中' },
      { value: 'low', label: '低' },
    ],
  },
];

/**
 * 预定义过滤器模板
 */
export const FILTER_TEMPLATES: FilterTemplate[] = [
  // Task 过滤器模板
  {
    id: 'template-open-tasks',
    name: '开放任务',
    description: '显示所有开放状态的任务',
    icon: '🟢',
    conditions: [{ field: 'state', operator: 'equals', value: 'open' }],
    logic: 'AND',
    category: 'task',
  },
  {
    id: 'template-high-priority',
    name: '高优先级任务',
    description: '显示高优先级和紧急任务',
    icon: '🔴',
    conditions: [{ field: 'priority', operator: 'in', value: ['high', 'urgent'] }],
    logic: 'OR',
    category: 'task',
  },
  {
    id: 'template-unassigned',
    name: '未分配任务',
    description: '显示没有负责人的任务',
    icon: '👤',
    conditions: [{ field: 'assignee', operator: 'isEmpty', value: null }],
    logic: 'AND',
    category: 'task',
  },
  {
    id: 'template-recent-updated',
    name: '最近更新',
    description: '显示最近7天内更新的任务',
    icon: '🕐',
    conditions: [
      { field: 'updated_at', operator: 'greaterThanOrEqual', value: '{{7_days_ago}}' },
    ],
    logic: 'AND',
    category: 'task',
  },
  // Member 过滤器模板
  {
    id: 'template-online-members',
    name: '在线成员',
    description: '显示所有在线的团队成员',
    icon: '🟢',
    conditions: [{ field: 'status', operator: 'in', value: ['working', 'busy'] }],
    logic: 'OR',
    category: 'member',
  },
  {
    id: 'template-active-members',
    name: '活跃成员',
    description: '显示有当前任务的成员',
    icon: '⚡',
    conditions: [{ field: 'currentTask', operator: 'isNotEmpty', value: null }],
    logic: 'AND',
    category: 'member',
  },
  {
    id: 'template-top-performers',
    name: '高产出成员',
    description: '显示完成任务数超过10的成员',
    icon: '🏆',
    conditions: [{ field: 'completedTasks', operator: 'greaterThan', value: 10 }],
    logic: 'AND',
    category: 'member',
  },
];

/**
 * 操作符显示配置
 */
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: '等于',
  notEquals: '不等于',
  contains: '包含',
  notContains: '不包含',
  startsWith: '开头是',
  endsWith: '结尾是',
  greaterThan: '大于',
  lessThan: '小于',
  greaterThanOrEqual: '大于等于',
  lessThanOrEqual: '小于等于',
  isEmpty: '为空',
  isNotEmpty: '不为空',
  in: '属于',
  notIn: '不属于',
};

/**
 * localStorage 键名
 */
export const FILTER_STORAGE_KEYS = {
  taskFilters: 'openclaw_task_filters',
  memberFilters: 'openclaw_member_filters',
  recentFilters: 'openclaw_recent_filters',
} as const;