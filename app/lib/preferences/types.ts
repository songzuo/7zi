/**
 * 用户偏好设置类型定义
 */

/** 主题模式 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** 语言设置 */
export type Language = 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'de';

/** 日期格式 */
export type DateFormat = 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY/MM/DD';

/** 时间格式 */
export type TimeFormat = '24h' | '12h';

/** 时区设置 */
export interface TimeZoneConfig {
  /** 时区ID (如 'Asia/Shanghai') */
  id: string;
  /** 时区名称 (如 '中国标准时间') */
  name: string;
  /** UTC偏移 (如 '+08:00') */
  offset: string;
}

/** 通知设置 */
export interface NotificationPreferences {
  /** 是否启用桌面通知 */
  enableDesktop: boolean;
  /** 是否启用邮件通知 */
  enableEmail: boolean;
  /** 是否启用声音 */
  enableSound: boolean;
  /** 任务到期提醒（提前多少分钟） */
  taskDueReminder: number;
  /** 每日摘要通知 */
  dailyDigest: boolean;
  /** 每日摘要时间 (HH:mm) */
  dailyDigestTime: string;
  /** 每周摘要通知 */
  weeklyDigest: boolean;
  /** 每周摘要日 (0-6, 0=周日) */
  weeklyDigestDay: number;
}

/** 隐私设置 */
export interface PrivacyPreferences {
  /** 是否显示在线状态 */
  showOnlineStatus: boolean;
  /** 是否显示正在输入 */
  showTypingIndicator: boolean;
  /** 是否允许数据收集 */
  allowAnalytics: boolean;
  /** 是否允许错误报告 */
  allowErrorReporting: boolean;
}

/** 外观设置 */
export interface AppearancePreferences {
  /** 主题模式 */
  theme: ThemeMode;
  /** 强调色 (hex color) */
  accentColor: string;
  /** 字体大小 */
  fontSize: 'small' | 'medium' | 'large';
  /** 侧边栏折叠状态 */
  sidebarCollapsed: boolean;
  /** 紧凑模式 */
  compactMode: boolean;
  /** 动画效果 */
  enableAnimations: boolean;
  /** 代码主题 */
  codeTheme: 'light' | 'dark' | 'auto';
}

/** 编辑器设置 */
export interface EditorPreferences {
  /** 字体 */
  fontFamily: string;
  /** 字体大小 */
  fontSize: number;
  /** Tab 大小 */
  tabSize: 2 | 4;
  /** 自动保存 */
  autoSave: boolean;
  /** 自动保存延迟 (ms) */
  autoSaveDelay: number;
  /** 括号自动补全 */
  autoClosingBrackets: boolean;
  /** 显示行号 */
  showLineNumbers: boolean;
  /** 显示缩进参考线 */
  showIndentGuides: boolean;
  /** 自动换行 */
  wordWrap: boolean;
}

/** 仪表盘设置 */
export interface DashboardPreferences {
  /** 默认视图 */
  defaultView: 'kanban' | 'list' | 'calendar' | 'timeline';
  /** 每页显示数量 */
  pageSize: number;
  /** 显示已完成任务 */
  showCompletedTasks: boolean;
  /** 任务排序字段 */
  taskSortBy: 'dueDate' | 'priority' | 'createdAt' | 'updatedAt';
  /** 升序/降序 */
  taskSortOrder: 'asc' | 'desc';
}

/** 完整的用户偏好设置 */
export interface UserPreferences {
  /** 用户ID */
  userId?: string;
  
  /** 语言设置 */
  language: Language;
  
  /** 日期格式 */
  dateFormat: DateFormat;
  
  /** 时间格式 */
  timeFormat: TimeFormat;
  
  /** 时区 */
  timezone: string;
  
  /** 通知设置 */
  notifications: NotificationPreferences;
  
  /** 隐私设置 */
  privacy: PrivacyPreferences;
  
  /** 外观设置 */
  appearance: AppearancePreferences;
  
  /** 编辑器设置 */
  editor: EditorPreferences;
  
  /** 仪表盘设置 */
  dashboard: DashboardPreferences;
  
  /** 最后更新时间 */
  updatedAt?: string;
}

/** 默认用户偏好设置 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'zh',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
  
  notifications: {
    enableDesktop: true,
    enableEmail: true,
    enableSound: true,
    taskDueReminder: 30,
    dailyDigest: false,
    dailyDigestTime: '09:00',
    weeklyDigest: true,
    weeklyDigestDay: 1,
  },
  
  privacy: {
    showOnlineStatus: true,
    showTypingIndicator: true,
    allowAnalytics: true,
    allowErrorReporting: true,
  },
  
  appearance: {
    theme: 'system',
    accentColor: '#3B82F6',
    fontSize: 'medium',
    sidebarCollapsed: false,
    compactMode: false,
    enableAnimations: true,
    codeTheme: 'auto',
  },
  
  editor: {
    fontFamily: 'Monaco, Menlo, "Courier New", monospace',
    fontSize: 14,
    tabSize: 2,
    autoSave: true,
    autoSaveDelay: 1000,
    autoClosingBrackets: true,
    showLineNumbers: true,
    showIndentGuides: true,
    wordWrap: false,
  },
  
  dashboard: {
    defaultView: 'kanban',
    pageSize: 25,
    showCompletedTasks: false,
    taskSortBy: 'dueDate',
    taskSortOrder: 'asc',
  },
};

/** 设置分组 */
export type PreferenceGroup = 'general' | 'appearance' | 'notifications' | 'privacy' | 'editor' | 'dashboard';

/** 设置分组配置 */
export const PREFERENCE_GROUPS: Record<PreferenceGroup, { label: string; icon: string; description: string }> = {
  general: {
    label: '通用',
    icon: '⚙️',
    description: '语言、时区、日期时间格式',
  },
  appearance: {
    label: '外观',
    icon: '🎨',
    description: '主题、颜色、字体大小',
  },
  notifications: {
    label: '通知',
    icon: '🔔',
    description: '桌面通知、邮件提醒、声音',
  },
  privacy: {
    label: '隐私',
    icon: '🔒',
    description: '在线状态、数据收集、错误报告',
  },
  editor: {
    label: '编辑器',
    icon: '✏️',
    description: '字体、自动保存、代码格式',
  },
  dashboard: {
    label: '仪表盘',
    icon: '📊',
    description: '默认视图、任务排序、显示选项',
  },
};

/** 可选的强调色 */
export const ACCENT_COLORS = [
  { value: '#3B82F6', label: '蓝色', name: 'blue' },
  { value: '#8B5CF6', label: '紫色', name: 'purple' },
  { value: '#EC4899', label: '粉色', name: 'pink' },
  { value: '#F59E0B', label: '橙色', name: 'orange' },
  { value: '#10B981', label: '绿色', name: 'green' },
  { value: '#06B6D4', label: '青色', name: 'cyan' },
  { value: '#EF4444', label: '红色', name: 'red' },
  { value: '#6366F1', label: '靛蓝', name: 'indigo' },
] as const;

/** 支持的语言 */
export const LANGUAGES: Record<Language, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
};
