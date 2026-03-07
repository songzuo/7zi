'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * 用户设置类型定义
 */
export interface UserSettings {
  /** 主题模式 */
  theme: 'light' | 'dark' | 'system';
  /** 启用动画效果 */
  animations: boolean;
  /** 紧凑模式 */
  compact: boolean;
  /** 桌面通知 */
  notifications: boolean;
  /** 提示音 */
  sounds: boolean;
  /** 语言 */
  language: string;
  /** 每页显示数量 */
  pageSize: number;
}

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  animations: true,
  compact: false,
  notifications: false,
  sounds: false,
  language: 'zh-CN',
  pageSize: 20,
};

const STORAGE_KEY = 'user-settings';

/**
 * 从 localStorage 读取设置
 */
function loadSettings(): UserSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }

  return DEFAULT_SETTINGS;
}

/**
 * 保存设置到 localStorage
 */
function saveSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * 用户设置 Hook
 * 
 * @returns {Object} 用户设置状态和更新方法
 * 
 * @example
 * ```tsx
 * function SettingsPage() {
 *   const { settings, updateSetting, resetSettings } = useUserSettings();
 *   
 *   return (
 *     <div>
 *       <Switch
 *         checked={settings.animations}
 *         onChange={(v) => updateSetting('animations', v)}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  // 初始化时从 localStorage 读取
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setMounted(true);
  }, []);

  // 更新单个设置
  const updateSetting = useCallback(<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  // 批量更新设置
  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  // 重置为默认设置
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  // 导出设置
  const exportSettings = useCallback(() => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  // 导入设置
  const importSettings = useCallback((json: string) => {
    try {
      const imported = JSON.parse(json);
      const validSettings: UserSettings = {
        theme: ['light', 'dark', 'system'].includes(imported.theme) ? imported.theme : DEFAULT_SETTINGS.theme,
        animations: typeof imported.animations === 'boolean' ? imported.animations : DEFAULT_SETTINGS.animations,
        compact: typeof imported.compact === 'boolean' ? imported.compact : DEFAULT_SETTINGS.compact,
        notifications: typeof imported.notifications === 'boolean' ? imported.notifications : DEFAULT_SETTINGS.notifications,
        sounds: typeof imported.sounds === 'boolean' ? imported.sounds : DEFAULT_SETTINGS.sounds,
        language: typeof imported.language === 'string' ? imported.language : DEFAULT_SETTINGS.language,
        pageSize: typeof imported.pageSize === 'number' ? imported.pageSize : DEFAULT_SETTINGS.pageSize,
      };
      setSettings(validSettings);
      saveSettings(validSettings);
      return { success: true };
    } catch {
      return { success: false, error: 'Invalid settings format' };
    }
  }, []);

  return {
    settings,
    mounted,
    updateSetting,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
  };
}

export default useUserSettings;