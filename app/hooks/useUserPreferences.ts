'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * 高级用户偏好设置类型
 */
export interface UserPreferences {
  // 主题设置
  theme: 'light' | 'dark' | 'system';
  
  // 显示设置
  display: {
    /** 动画效果 */
    animations: boolean;
    /** 紧凑模式 */
    compactMode: boolean;
    /** 字体大小: small | medium | large */
    fontSize: 'small' | 'medium' | 'large';
    /** 侧边栏默认展开 */
    sidebarExpanded: boolean;
    /** 显示用户头像 */
    showAvatars: boolean;
    /** 显示活动状态指示器 */
    showStatusIndicators: boolean;
  };
  
  // 通知设置
  notifications: {
    /** 启用桌面通知 */
    enabled: boolean;
    /** 任务更新通知 */
    taskUpdates: boolean;
    /** 提及通知 */
    mentions: boolean;
    /** 系统通知 */
    system: boolean;
    /** 声音提醒 */
    sounds: boolean;
    /** 通知持续时间（秒） */
    duration: number;
  };
  
  // 语言和地区
  locale: {
    /** 界面语言 */
    language: string;
    /** 时区 */
    timezone: string;
    /** 日期格式 */
    dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
    /** 时间格式 */
    timeFormat: '24h' | '12h';
    /** 每周起始日 */
    weekStartsOn: 0 | 1 | 6; // 0=周日, 1=周一, 6=周六
  };
  
  // 隐私设置
  privacy: {
    /** 显示在线状态 */
    showOnlineStatus: boolean;
    /** 允许数据收集 */
    allowAnalytics: boolean;
    /** 个人资料公开 */
    publicProfile: boolean;
  };
  
  // 高级设置
  advanced: {
    /** 自动保存间隔（秒） */
    autoSaveInterval: number;
    /** 每页显示数量 */
    pageSize: number;
    /** 启用实验性功能 */
    experimentalFeatures: boolean;
    /** 调试模式 */
    debugMode: boolean;
  };
}

/**
 * 默认偏好设置
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  display: {
    animations: true,
    compactMode: false,
    fontSize: 'medium',
    sidebarExpanded: true,
    showAvatars: true,
    showStatusIndicators: true,
  },
  notifications: {
    enabled: false,
    taskUpdates: true,
    mentions: true,
    system: true,
    sounds: false,
    duration: 5,
  },
  locale: {
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    weekStartsOn: 1,
  },
  privacy: {
    showOnlineStatus: true,
    allowAnalytics: false,
    publicProfile: false,
  },
  advanced: {
    autoSaveInterval: 30,
    pageSize: 20,
    experimentalFeatures: false,
    debugMode: false,
  },
};

const STORAGE_KEY = 'user-preferences-v2';

/**
 * 深度合并对象
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];
      
      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }
  
  return result;
}

/**
 * 从 localStorage 加载偏好设置
 */
function loadPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return deepMerge(DEFAULT_PREFERENCES, parsed);
    }
  } catch (error) {
    console.error('Failed to load preferences:', error);
  }

  return DEFAULT_PREFERENCES;
}

/**
 * 保存偏好设置到 localStorage
 */
function savePreferences(preferences: UserPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}

/**
 * 获取浏览器时区
 */
function getBrowserTimezone(): string {
  if (typeof window === 'undefined') return 'Asia/Shanghai';
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Asia/Shanghai';
  }
}

/**
 * 获取浏览器语言
 */
function getBrowserLanguage(): string {
  if (typeof window === 'undefined') return 'zh-CN';
  return navigator.language || 'zh-CN';
}

/**
 * 用户偏好设置 Hook
 * 
 * @example
 * ```tsx
 * function PreferencesPage() {
 *   const { preferences, updatePreference, resetPreferences } = useUserPreferences();
 *   
 *   return (
 *     <Switch
 *       checked={preferences.display.animations}
 *       onChange={(v) => updatePreference('display', { animations: v })}
 *     />
 *   );
 * }
 * ```
 */
export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [mounted, setMounted] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 初始化
  useEffect(() => {
    const loaded = loadPreferences();
    
    // 自动检测浏览器设置
    if (loaded.locale.timezone === 'Asia/Shanghai') {
      loaded.locale.timezone = getBrowserTimezone();
    }
    if (loaded.locale.language === 'zh-CN') {
      loaded.locale.language = getBrowserLanguage();
    }
    
    setPreferences(loaded);
    setMounted(true);
  }, []);

  // 更新单个设置项
  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    category: K,
    updates: Partial<UserPreferences[K]>
  ) => {
    setPreferences(prev => {
      const newPreferences = {
        ...prev,
        [category]: {
          ...prev[category],
          ...updates,
        },
      };
      savePreferences(newPreferences);
      setLastSaved(new Date());
      return newPreferences;
    });
    setHasChanges(true);
  }, []);

  // 更新主题
  const updateTheme = useCallback((theme: UserPreferences['theme']) => {
    setPreferences(prev => {
      const newPreferences = { ...prev, theme };
      savePreferences(newPreferences);
      setLastSaved(new Date());
      return newPreferences;
    });
  }, []);

  // 批量更新
  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => {
      const newPreferences = deepMerge(prev, updates);
      savePreferences(newPreferences);
      setLastSaved(new Date());
      return newPreferences;
    });
    setHasChanges(true);
  }, []);

  // 重置为默认
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    savePreferences(DEFAULT_PREFERENCES);
    setLastSaved(new Date());
    setHasChanges(false);
  }, []);

  // 重置单个分类
  const resetCategory = useCallback(<K extends keyof UserPreferences>(category: K) => {
    setPreferences(prev => {
      const newPreferences = {
        ...prev,
        [category]: DEFAULT_PREFERENCES[category],
      };
      savePreferences(newPreferences);
      setLastSaved(new Date());
      return newPreferences;
    });
  }, []);

  // 导出设置
  const exportPreferences = useCallback(() => {
    return JSON.stringify(preferences, null, 2);
  }, [preferences]);

  // 导入设置
  const importPreferences = useCallback((json: string): { success: boolean; error?: string } => {
    try {
      const imported = JSON.parse(json);
      const validated = deepMerge(DEFAULT_PREFERENCES, imported);
      setPreferences(validated);
      savePreferences(validated);
      setLastSaved(new Date());
      return { success: true };
    } catch {
      return { success: false, error: '无效的设置格式' };
    }
  }, []);

  // 计算派生值
  const derivedValues = useMemo(() => ({
    /** 是否启用了任何通知 */
    hasAnyNotificationsEnabled: 
      preferences.notifications.taskUpdates ||
      preferences.notifications.mentions ||
      preferences.notifications.system,
    
    /** 是否使用12小时制 */
    is12HourFormat: preferences.locale.timeFormat === '12h',
    
    /** 是否为紧凑布局 */
    isCompactLayout: preferences.display.compactMode,
    
    /** 字体大小像素值 */
    fontSizePx: {
      small: 14,
      medium: 16,
      large: 18,
    }[preferences.display.fontSize],
  }), [preferences]);

  return {
    preferences,
    mounted,
    hasChanges,
    lastSaved,
    
    // 更新方法
    updatePreference,
    updateTheme,
    updatePreferences,
    
    // 重置方法
    resetPreferences,
    resetCategory,
    
    // 导入导出
    exportPreferences,
    importPreferences,
    
    // 派生值
    ...derivedValues,
  };
}

export default useUserPreferences;
