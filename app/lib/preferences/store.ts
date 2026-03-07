/**
 * 用户偏好设置存储
 * 使用 Zustand 进行状态管理，支持本地持久化
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  UserPreferences,
  NotificationPreferences,
  PrivacyPreferences,
  AppearancePreferences,
  EditorPreferences,
  DashboardPreferences,
  ThemeMode,
  Language,
  DateFormat,
  TimeFormat,
} from './types';
import { DEFAULT_PREFERENCES } from './types';

/** 存储键名 */
const STORAGE_KEY = 'user-preferences';

/** 偏好设置存储状态 */
interface PreferencesStoreState extends UserPreferences {
  // === 通用设置 ===
  /** 设置语言 */
  setLanguage: (language: Language) => void;
  /** 设置日期格式 */
  setDateFormat: (format: DateFormat) => void;
  /** 设置时间格式 */
  setTimeFormat: (format: TimeFormat) => void;
  /** 设置时区 */
  setTimezone: (timezone: string) => void;

  // === 通知设置 ===
  /** 更新通知设置 */
  updateNotifications: (updates: Partial<NotificationPreferences>) => void;

  // === 隐私设置 ===
  /** 更新隐私设置 */
  updatePrivacy: (updates: Partial<PrivacyPreferences>) => void;

  // === 外观设置 ===
  /** 更新外观设置 */
  updateAppearance: (updates: Partial<AppearancePreferences>) => void;
  /** 设置主题 */
  setTheme: (theme: ThemeMode) => void;
  /** 设置强调色 */
  setAccentColor: (color: string) => void;
  /** 切换侧边栏 */
  toggleSidebar: () => void;
  /** 切换紧凑模式 */
  toggleCompactMode: () => void;

  // === 编辑器设置 ===
  /** 更新编辑器设置 */
  updateEditor: (updates: Partial<EditorPreferences>) => void;

  // === 仪表盘设置 ===
  /** 更新仪表盘设置 */
  updateDashboard: (updates: Partial<DashboardPreferences>) => void;

  // === 全局操作 ===
  /** 重置所有设置 */
  resetAll: () => void;
  /** 重置指定分组 */
  resetGroup: (group: 'notifications' | 'privacy' | 'appearance' | 'editor' | 'dashboard') => void;
  /** 导出设置 */
  exportPreferences: () => string;
  /** 导入设置 */
  importPreferences: (json: string) => boolean;
  /** 获取完整偏好设置 */
  getPreferences: () => UserPreferences;
}

/**
 * 用户偏好设置 Store
 */
export const usePreferencesStore = create<PreferencesStoreState>()(
  persist(
    (set, get) => ({
      // 初始值使用默认设置
      ...DEFAULT_PREFERENCES,

      // === 通用设置 ===
      setLanguage: (language) => {
        set({ language, updatedAt: new Date().toISOString() });
      },

      setDateFormat: (dateFormat) => {
        set({ dateFormat, updatedAt: new Date().toISOString() });
      },

      setTimeFormat: (timeFormat) => {
        set({ timeFormat, updatedAt: new Date().toISOString() });
      },

      setTimezone: (timezone) => {
        set({ timezone, updatedAt: new Date().toISOString() });
      },

      // === 通知设置 ===
      updateNotifications: (updates) => {
        set((state) => ({
          notifications: { ...state.notifications, ...updates },
          updatedAt: new Date().toISOString(),
        }));
      },

      // === 隐私设置 ===
      updatePrivacy: (updates) => {
        set((state) => ({
          privacy: { ...state.privacy, ...updates },
          updatedAt: new Date().toISOString(),
        }));
      },

      // === 外观设置 ===
      updateAppearance: (updates) => {
        set((state) => ({
          appearance: { ...state.appearance, ...updates },
          updatedAt: new Date().toISOString(),
        }));
      },

      setTheme: (theme) => {
        set((state) => ({
          appearance: { ...state.appearance, theme },
          updatedAt: new Date().toISOString(),
        }));
      },

      setAccentColor: (accentColor) => {
        set((state) => ({
          appearance: { ...state.appearance, accentColor },
          updatedAt: new Date().toISOString(),
        }));
      },

      toggleSidebar: () => {
        set((state) => ({
          appearance: {
            ...state.appearance,
            sidebarCollapsed: !state.appearance.sidebarCollapsed,
          },
          updatedAt: new Date().toISOString(),
        }));
      },

      toggleCompactMode: () => {
        set((state) => ({
          appearance: {
            ...state.appearance,
            compactMode: !state.appearance.compactMode,
          },
          updatedAt: new Date().toISOString(),
        }));
      },

      // === 编辑器设置 ===
      updateEditor: (updates) => {
        set((state) => ({
          editor: { ...state.editor, ...updates },
          updatedAt: new Date().toISOString(),
        }));
      },

      // === 仪表盘设置 ===
      updateDashboard: (updates) => {
        set((state) => ({
          dashboard: { ...state.dashboard, ...updates },
          updatedAt: new Date().toISOString(),
        }));
      },

      // === 全局操作 ===
      resetAll: () => {
        set({ ...DEFAULT_PREFERENCES, updatedAt: new Date().toISOString() });
      },

      resetGroup: (group) => {
        set((state) => ({
          [group]: DEFAULT_PREFERENCES[group],
          updatedAt: new Date().toISOString(),
        }));
      },

      exportPreferences: () => {
        const state = get();
        const exportData: UserPreferences = {
          language: state.language,
          dateFormat: state.dateFormat,
          timeFormat: state.timeFormat,
          timezone: state.timezone,
          notifications: state.notifications,
          privacy: state.privacy,
          appearance: state.appearance,
          editor: state.editor,
          dashboard: state.dashboard,
          updatedAt: state.updatedAt,
        };
        return JSON.stringify(exportData, null, 2);
      },

      importPreferences: (json) => {
        try {
          const data = JSON.parse(json) as Partial<UserPreferences>;
          
          // 验证数据格式
          if (typeof data !== 'object' || data === null) {
            return false;
          }

          set((state) => ({
            language: data.language ?? state.language,
            dateFormat: data.dateFormat ?? state.dateFormat,
            timeFormat: data.timeFormat ?? state.timeFormat,
            timezone: data.timezone ?? state.timezone,
            notifications: { ...state.notifications, ...data.notifications },
            privacy: { ...state.privacy, ...data.privacy },
            appearance: { ...state.appearance, ...data.appearance },
            editor: { ...state.editor, ...data.editor },
            dashboard: { ...state.dashboard, ...data.dashboard },
            updatedAt: new Date().toISOString(),
          }));

          return true;
        } catch {
          return false;
        }
      },

      getPreferences: () => {
        const state = get();
        return {
          language: state.language,
          dateFormat: state.dateFormat,
          timeFormat: state.timeFormat,
          timezone: state.timezone,
          notifications: state.notifications,
          privacy: state.privacy,
          appearance: state.appearance,
          editor: state.editor,
          dashboard: state.dashboard,
          updatedAt: state.updatedAt,
        };
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // 选择性持久化（排除方法）
      partialize: (state) => ({
        userId: state.userId,
        language: state.language,
        dateFormat: state.dateFormat,
        timeFormat: state.timeFormat,
        timezone: state.timezone,
        notifications: state.notifications,
        privacy: state.privacy,
        appearance: state.appearance,
        editor: state.editor,
        dashboard: state.dashboard,
        updatedAt: state.updatedAt,
      }),
    }
  )
);

// ============================================================================
// 辅助 Hooks
// ============================================================================

/** 只获取通知设置 */
export function useNotificationPreferences() {
  return usePreferencesStore((state) => state.notifications);
}

/** 只获取隐私设置 */
export function usePrivacyPreferences() {
  return usePreferencesStore((state) => state.privacy);
}

/** 只获取外观设置 */
export function useAppearancePreferences() {
  return usePreferencesStore((state) => state.appearance);
}

/** 只获取编辑器设置 */
export function useEditorPreferences() {
  return usePreferencesStore((state) => state.editor);
}

/** 只获取仪表盘设置 */
export function useDashboardPreferences() {
  return usePreferencesStore((state) => state.dashboard);
}

/** 获取主题模式 */
export function useThemeMode(): ThemeMode {
  return usePreferencesStore((state) => state.appearance.theme);
}

/** 获取当前语言 */
export function useLanguage(): Language {
  return usePreferencesStore((state) => state.language);
}

export default usePreferencesStore;