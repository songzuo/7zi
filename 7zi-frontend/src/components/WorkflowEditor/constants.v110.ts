/**
 * 常量定义 v1.10.0
 *
 * 🎨 设计师: Designer
 * 创建日期: 2026-04-03
 * 版本: v1.10.0
 *
 * v1.10.0 更新：
 * - 新增更多快捷键
 * - 新增布局类型
 * - 新增网格类型
 * - 增加历史记录限制
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
  'loop',
  'subworkflow',
  'transform',
]

/**
 * 节点模板
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
      timeout: 3600000,
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
    light: '#10B981',
    dark: '#34D399',
    bg: '#D1FAE5',
  },
  end: {
    light: '#EF4444',
    dark: '#F87171',
    bg: '#FEE2E2',
  },
  agent: {
    light: '#6366F1',
    dark: '#818CF8',
    bg: '#E0E7FF',
  },
  condition: {
    light: '#F59E0B',
    dark: '#FBBF24',
    bg: '#FEF3C7',
  },
  parallel: {
    light: '#8B5CF6',
    dark: '#A78BFA',
    bg: '#EDE9FE',
  },
  wait: {
    light: '#06B6D4',
    dark: '#22D3EE',
    bg: '#CFFAFE',
  },
  humanInput: {
    light: '#F97316',
    dark: '#FB923C',
    bg: '#FFEDD5',
  },
  loop: {
    light: '#EC4899',
    dark: '#F472B6',
    bg: '#FCE7F3',
  },
  subworkflow: {
    light: '#14B8A6',
    dark: '#2DD4BF',
    bg: '#CCFBF1',
  },
  transform: {
    light: '#84CC16',
    dark: '#A3E635',
    bg: '#ECFCCB',
  },
} as const

/**
 * 键盘快捷键 v1.10.0
 */
export const KEYBOARD_SHORTCUTS = {
  // 基础操作
  SAVE: 'Ctrl+S',
  RUN: 'Ctrl+Enter',
  VALIDATE: 'Ctrl+Shift+V',
  UNDO: 'Ctrl+Z',
  REDO: 'Ctrl+Y',

  // 编辑操作
  DELETE: 'Delete',
  COPY: 'Ctrl+C',
  PASTE: 'Ctrl+V',
  CUT: 'Ctrl+X',
  SELECT_ALL: 'Ctrl+A',
  DUPLICATE: 'Ctrl+D',

  // 视图操作
  ZOOM_IN: 'Ctrl+=',
  ZOOM_OUT: 'Ctrl+-',
  ZOOM_RESET: 'Ctrl+0',
  FIT_VIEW: 'Ctrl+Shift+F',
  AUTO_LAYOUT: 'Ctrl+L',

  // 文件操作
  EXPORT: 'Ctrl+E',
  IMPORT: 'Ctrl+I',
  FIND: 'Ctrl+F',

  // 辅助操作
  SHORTCUTS: '?',
  ESCAPE: 'Escape',

  // 多选操作
  MULTI_SELECT: 'Shift+Click',
  ADD_TO_SELECTION: 'Ctrl+Click',
  PAN_CANVAS: 'Space+Drag',
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
 * 画布配置 v1.10.0
 */
export const CANVAS_CONFIG = {
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 4,
  DEFAULT_ZOOM: 1,
  ZOOM_STEP: 0.1,
  PAN_SPEED: 1,
  GRID_SIZE: 20,
  SNAP_TO_GRID: true,
  GRID_TYPES: ['dots', 'lines', 'none'] as const,
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
  MAX_DURATION: 86400000,
  MIN_TIMEOUT: 1000,
  MAX_TIMEOUT: 3600000,
  MAX_RETRIES: 10,
  MAX_LOOP_COUNT: 1000,
} as const

/**
 * 版本信息 v1.10.0
 */
export const EDITOR_VERSION = '1.10.0' as const

/**
 * 导出配置
 */
export const EXPORT_CONFIG = {
  version: '1.10.0',
  supportedVersions: ['1.9.0', '1.9.1', '1.10.0'],
  fileExtension: '.json',
  mimeType: 'application/json',
} as const

/**
 * 布局类型 v1.10.0
 */
export const LAYOUT_TYPES = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
  TREE: 'tree',
  FORCE: 'force',
} as const

/**
 * 性能配置 v1.10.0
 */
export const PERFORMANCE_CONFIG = {
  MAX_NODES: 1000,
  MAX_EDGES: 2000,
  RENDER_THRESHOLD: 100,
  VIRTUAL_SCROLL_THRESHOLD: 200,
  DEBOUNCE_DELAY: 150,
  THROTTLE_DELAY: 50,
} as const

/**
 * 历史记录配置 v1.10.0
 */
export const HISTORY_CONFIG = {
  DEFAULT_LIMIT: 100,
  MAX_LIMIT: 500,
  MIN_LIMIT: 10,
} as const

/**
 * 主题配置 v1.10.0
 */
export const THEME_CONFIG = {
  THEMES: ['light', 'dark', 'auto'] as const,
  DEFAULT_THEME: 'auto',
} as const