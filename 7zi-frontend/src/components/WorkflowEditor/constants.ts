/**
 * 常量定义
 *
 * 🎨 设计师: Designer
 * 创建日期: 2026-04-01
 * 版本: v1.9.1 (2026-04-03)
 */

import type { NodeTemplate, NodeType, NodeCategory } from './types'

/**
 * 节点类型定义
 */
export const NODE_TYPES: NodeType[] = [
  'start',
  'end',
  'agent',
  'condition',
  'parallel',
  'wait',
  'humanInput',
  'loop', // v1.9.1: 循环节点
  'subworkflow', // v1.9.1: 子工作流节点
  'transform', // v1.9.1: 数据转换节点
]

/**
 * 节点模板
 * v1.9.1 新增: loop, subworkflow, transform 节点
 */
export const NODE_TEMPLATES: Record<NodeType, NodeTemplate> = {
  // ========== 基础节点 ==========
  start: {
    type: 'start',
    label: 'Start',
    icon: '▶️',
    description: '工作流入口点',
    category: 'basic',
    defaultConfig: {},
  },
  end: {
    type: 'end',
    label: 'End',
    icon: '⏹️',
    description: '工作流出口点',
    category: 'basic',
    defaultConfig: {},
  },

  // ========== Agent 节点 ==========
  agent: {
    type: 'agent',
    label: 'Agent',
    icon: '🤖',
    description: '执行 AI 任务',
    category: 'agent',
    defaultConfig: {
      agentType: 'default',
      timeout: 30000,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffStrategy: 'exponential',
      },
    },
  },

  // ========== 逻辑节点 ==========
  condition: {
    type: 'condition',
    label: 'Condition',
    icon: '🔀',
    description: '条件分支',
    category: 'logic',
    defaultConfig: {
      condition: 'true',
      trueBranchLabel: 'True',
      falseBranchLabel: 'False',
    },
  },
  parallel: {
    type: 'parallel',
    label: 'Parallel',
    icon: '⚡',
    description: '并行执行多个分支',
    category: 'logic',
    defaultConfig: {
      maxConcurrency: 3,
    },
  },

  // ========== 流程节点 ==========
  wait: {
    type: 'wait',
    label: 'Wait',
    icon: '⏸️',
    description: '等待时间或事件',
    category: 'flow',
    defaultConfig: {
      waitType: 'duration',
      duration: 5000,
      timeout: 30000,
    },
  },
  humanInput: {
    type: 'humanInput',
    label: 'Human Input',
    icon: '👤',
    description: '等待人工输入或审批',
    category: 'flow',
    defaultConfig: {
      waitForEvent: 'user.input',
      timeout: 3600000, // 1小时
    },
  },

  // ========== v1.9.1 新增节点 ==========
  loop: {
    type: 'loop',
    label: 'Loop',
    icon: '🔄',
    description: '循环执行直到满足条件',
    category: 'logic',
    defaultConfig: {
      loopType: 'count',
      loopCount: 10,
      loopCondition: '{{index}} < {{count}}',
      iterationVariable: 'item',
    },
  },
  subworkflow: {
    type: 'subworkflow',
    label: 'Subworkflow',
    icon: '📦',
    description: '调用子工作流',
    category: 'flow',
    defaultConfig: {
      subworkflowId: '',
      subworkflowInputs: {},
    },
  },
  transform: {
    type: 'transform',
    label: 'Transform',
    icon: '🔄',
    description: '数据转换和处理',
    category: 'logic',
    defaultConfig: {
      transformExpression: 'return data',
      outputFormat: 'json',
    },
  },

  // ========== v1.12.2 新增节点 ==========
  notification: {
    type: 'notification',
    label: 'Notification',
    icon: '🔔',
    description: '发送通知',
    category: 'custom',
    defaultConfig: {
      notificationType: 'email',
      notificationTitle: 'Workflow Notification',
      notificationContent: 'Workflow completed successfully',
      notificationRecipients: [],
      notificationPriority: 'normal',
    },
  },
}

/**
 * 节点类别标签
 */
export const NODE_CATEGORY_LABELS: Record<NodeCategory, string> = {
  basic: '基础',
  agent: 'Agent',
  logic: '逻辑',
  flow: '流程',
  custom: '自定义',
}

/**
 * 节点颜色
 */
export const NODE_COLORS = {
  start: {
    light: '#10B981', // Emerald 500
    dark: '#34D399', // Emerald 400
    bg: '#D1FAE5', // Emerald 100
  },
  end: {
    light: '#EF4444', // Red 500
    dark: '#F87171', // Red 400
    bg: '#FEE2E2', // Red 100
  },
  agent: {
    light: '#6366F1', // Indigo 500
    dark: '#818CF8', // Indigo 400
    bg: '#E0E7FF', // Indigo 100
  },
  condition: {
    light: '#F59E0B', // Amber 500
    dark: '#FBBF24', // Amber 400
    bg: '#FEF3C7', // Amber 100
  },
  parallel: {
    light: '#8B5CF6', // Violet 500
    dark: '#A78BFA', // Violet 400
    bg: '#EDE9FE', // Violet 100
  },
  wait: {
    light: '#06B6D4', // Cyan 500
    dark: '#22D3EE', // Cyan 400
    bg: '#CFFAFE', // Cyan 100
  },
  humanInput: {
    light: '#F97316', // Orange 500
    dark: '#FB923C', // Orange 400
    bg: '#FFEDD5', // Orange 100
  },
  // v1.9.1 新增节点颜色
  loop: {
    light: '#EC4899', // Pink 500
    dark: '#F472B6', // Pink 400
    bg: '#FCE7F3', // Pink 100
  },
  subworkflow: {
    light: '#14B8A6', // Teal 500
    dark: '#2DD4BF', // Teal 400
    bg: '#CCFBF1', // Teal 100
  },
  transform: {
    light: '#84CC16', // Lime 500
    dark: '#A3E635', // Lime 400
    bg: '#ECFCCB', // Lime 100
  },
  notification: {
    light: '#EF4444', // Red 500
    dark: '#F87171', // Red 400
    bg: '#FEE2E2', // Red 100
  },
} as const

/**
 * 键盘快捷键
 */
export const KEYBOARD_SHORTCUTS = {
  SAVE: 'Ctrl+S',
  RUN: 'Ctrl+Enter',
  VALIDATE: 'Ctrl+Shift+V',
  UNDO: 'Ctrl+Z',
  REDO: 'Ctrl+Y',
  DELETE: 'Delete',
  COPY: 'Ctrl+C',
  PASTE: 'Ctrl+V',
  SELECT_ALL: 'Ctrl+A',
  DUPLICATE: 'Ctrl+D',
  AUTO_LAYOUT: 'Ctrl+L',
  FIND: 'Ctrl+F',
  ZOOM_IN: 'Ctrl+=',
  ZOOM_OUT: 'Ctrl+-',
  ZOOM_RESET: 'Ctrl+0',
  FIT_VIEW: 'Ctrl+Shift+F',
  EXPORT: 'Ctrl+E',
  IMPORT: 'Ctrl+I',
} as const

/**
 * 响应式断点
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const

/**
 * 画布配置
 */
export const CANVAS_CONFIG = {
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 4,
  DEFAULT_ZOOM: 1,
  ZOOM_STEP: 0.1,
  PAN_SPEED: 1,
  GRID_SIZE: 20,
  SNAP_TO_GRID: true,
} as const

/**
 * 执行状态颜色
 */
export const EXECUTION_STATUS_COLORS = {
  IDLE: '#94A3B8',
  PENDING: '#F59E0B',
  RUNNING: '#3B82F6',
  SUCCESS: '#10B981',
  FAILED: '#EF4444',
  CANCELLED: '#6B7280',
  TIMEOUT: '#DC2626',
} as const

/**
 * 验证规则
 */
export const VALIDATION_RULES = {
  MAX_NODE_LABEL_LENGTH: 50,
  MAX_CONDITION_LENGTH: 500,
  MIN_DURATION: 100,
  MAX_DURATION: 86400000, // 24小时
  MIN_TIMEOUT: 1000,
  MAX_TIMEOUT: 3600000, // 1小时
  MAX_RETRIES: 10,
  MAX_LOOP_COUNT: 1000,
} as const

/**
 * 版本信息
 */
export const EDITOR_VERSION = '1.9.1' as const

/**
 * 导出配置
 */
export const EXPORT_CONFIG = {
  version: '1.9.1',
  supportedVersions: ['1.9.0', '1.9.1'],
  fileExtension: '.json',
  mimeType: 'application/json',
} as const
