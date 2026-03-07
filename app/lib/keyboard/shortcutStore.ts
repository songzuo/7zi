/**
 * 全局快捷键存储
 * 使用 Zustand 进行状态管理，支持跨组件共享
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { KeyboardShortcut } from './types';

/** 快捷键配置（不含 handler，可序列化） */
export interface ShortcutConfig {
  id: string;
  keys: string[];
  description: string;
  group?: string;
  enabled: boolean;
  enableInInput?: boolean;
}

/** 快捷键存储状态 */
interface ShortcutStoreState {
  /** 所有注册的快捷键配置 */
  configs: Map<string, ShortcutConfig>;
  
  /** 当前活动的快捷键处理器 */
  handlers: Map<string, (event: KeyboardEvent) => void>;
  
  /** 快捷键是否启用（全局开关） */
  enabled: boolean;
  
  /** 当前 scope */
  activeScope: string | null;
  
  /** 用户自定义快捷键映射 */
  customKeyBindings: Map<string, string[]>;
  
  // Actions
  /** 注册快捷键 */
  register: (shortcut: KeyboardShortcut) => void;
  
  /** 注销快捷键 */
  unregister: (id: string) => void;
  
  /** 更新快捷键绑定 */
  updateKeyBinding: (id: string, newKeys: string[]) => void;
  
  /** 重置快捷键绑定 */
  resetKeyBinding: (id: string) => void;
  
  /** 启用/禁用快捷键 */
  setEnabled: (id: string, enabled: boolean) => void;
  
  /** 全局启用/禁用 */
  setGlobalEnabled: (enabled: boolean) => void;
  
  /** 设置活动 scope */
  setScope: (scope: string | null) => void;
  
  /** 获取所有快捷键 */
  getAll: () => KeyboardShortcut[];
  
  /** 按分组获取 */
  getByGroup: () => Map<string, KeyboardShortcut[]>;
  
  /** 获取快捷键配置 */
  getConfig: (id: string) => ShortcutConfig | undefined;
  
  /** 获取有效快捷键（考虑自定义绑定） */
  getEffectiveKeys: (id: string) => string[];
}

/** 默认快捷键配置 */
export const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  // 通用
  {
    id: 'command-palette',
    keys: ['ctrl', 'k'],
    description: '打开命令面板',
    group: '通用',
    enabled: true,
    enableInInput: true,
  },
  {
    id: 'shortcut-help',
    keys: ['ctrl', '/'],
    description: '显示快捷键帮助',
    group: '通用',
    enabled: true,
    enableInInput: true,
  },
  {
    id: 'search',
    keys: ['ctrl', 'f'],
    description: '全局搜索',
    group: '通用',
    enabled: true,
    enableInInput: false,
  },
  {
    id: 'escape',
    keys: ['Escape'],
    description: '关闭弹窗/取消',
    group: '通用',
    enabled: true,
    enableInInput: true,
  },
  
  // 导航
  {
    id: 'nav-home',
    keys: ['alt', '1'],
    description: '跳转到首页',
    group: '导航',
    enabled: true,
  },
  {
    id: 'nav-dashboard',
    keys: ['alt', '2'],
    description: '跳转到仪表盘',
    group: '导航',
    enabled: true,
  },
  {
    id: 'nav-tasks',
    keys: ['alt', '3'],
    description: '跳转到任务',
    group: '导航',
    enabled: true,
  },
  {
    id: 'nav-settings',
    keys: ['alt', '4'],
    description: '跳转到设置',
    group: '导航',
    enabled: true,
  },
  
  // 任务
  {
    id: 'new-task',
    keys: ['ctrl', 'n'],
    description: '新建任务',
    group: '任务',
    enabled: true,
  },
  {
    id: 'complete-task',
    keys: ['ctrl', 'Enter'],
    description: '完成任务',
    group: '任务',
    enabled: true,
  },
  {
    id: 'delete-task',
    keys: ['ctrl', 'Delete'],
    description: '删除任务',
    group: '任务',
    enabled: true,
  },
  
  // 编辑
  {
    id: 'save',
    keys: ['ctrl', 's'],
    description: '保存',
    group: '编辑',
    enabled: true,
  },
  {
    id: 'undo',
    keys: ['ctrl', 'z'],
    description: '撤销',
    group: '编辑',
    enabled: true,
  },
  {
    id: 'redo',
    keys: ['ctrl', 'shift', 'z'],
    description: '重做',
    group: '编辑',
    enabled: true,
  },
  {
    id: 'copy',
    keys: ['ctrl', 'c'],
    description: '复制',
    group: '编辑',
    enabled: true,
  },
  {
    id: 'paste',
    keys: ['ctrl', 'v'],
    description: '粘贴',
    group: '编辑',
    enabled: true,
  },
  
  // 视图
  {
    id: 'toggle-theme',
    keys: ['ctrl', 'shift', 't'],
    description: '切换主题',
    group: '视图',
    enabled: true,
    enableInInput: true,
  },
  {
    id: 'toggle-sidebar',
    keys: ['ctrl', 'b'],
    description: '切换侧边栏',
    group: '视图',
    enabled: true,
  },
  {
    id: 'fullscreen',
    keys: ['F11'],
    description: '全屏模式',
    group: '视图',
    enabled: true,
  },
];

/** 创建快捷键存储 */
export const useShortcutStore = create<ShortcutStoreState>()(
  persist(
    (set, get) => ({
      configs: new Map(DEFAULT_SHORTCUTS.map(s => [s.id, s])),
      handlers: new Map(),
      enabled: true,
      activeScope: null,
      customKeyBindings: new Map(),
      
      register: (shortcut: KeyboardShortcut) => {
        set(state => {
          const newConfigs = new Map(state.configs);
          const newHandlers = new Map(state.handlers);
          
          // 保存配置
          const config: ShortcutConfig = {
            id: shortcut.id,
            keys: shortcut.keys,
            description: shortcut.description,
            group: shortcut.group,
            enabled: shortcut.enabled ?? true,
            enableInInput: shortcut.enableInInput,
          };
          newConfigs.set(shortcut.id, config);
          
          // 保存处理器
          newHandlers.set(shortcut.id, shortcut.handler);
          
          return { configs: newConfigs, handlers: newHandlers };
        });
      },
      
      unregister: (id: string) => {
        set(state => {
          const newConfigs = new Map(state.configs);
          const newHandlers = new Map(state.handlers);
          
          newConfigs.delete(id);
          newHandlers.delete(id);
          
          return { configs: newConfigs, handlers: newHandlers };
        });
      },
      
      updateKeyBinding: (id: string, newKeys: string[]) => {
        set(state => {
          const newBindings = new Map(state.customKeyBindings);
          newBindings.set(id, newKeys);
          return { customKeyBindings: newBindings };
        });
      },
      
      resetKeyBinding: (id: string) => {
        set(state => {
          const newBindings = new Map(state.customKeyBindings);
          newBindings.delete(id);
          return { customKeyBindings: newBindings };
        });
      },
      
      setEnabled: (id: string, enabled: boolean) => {
        set(state => {
          const newConfigs = new Map(state.configs);
          const config = newConfigs.get(id);
          if (config) {
            newConfigs.set(id, { ...config, enabled });
          }
          return { configs: newConfigs };
        });
      },
      
      setGlobalEnabled: (enabled: boolean) => {
        set({ enabled });
      },
      
      setScope: (scope: string | null) => {
        set({ activeScope: scope });
      },
      
      getAll: () => {
        const state = get();
        const shortcuts: KeyboardShortcut[] = [];
        
        state.configs.forEach((config, id) => {
          const handler = state.handlers.get(id);
          if (handler && config.enabled) {
            shortcuts.push({
              id,
              keys: state.getEffectiveKeys(id),
              description: config.description,
              handler,
              enableInInput: config.enableInInput,
              group: config.group,
              enabled: config.enabled,
            });
          }
        });
        
        return shortcuts;
      },
      
      getByGroup: () => {
        const state = get();
        const groups = new Map<string, KeyboardShortcut[]>();
        
        state.configs.forEach((config, id) => {
          const handler = state.handlers.get(id);
          if (handler && config.enabled) {
            const group = config.group || '其他';
            if (!groups.has(group)) {
              groups.set(group, []);
            }
            groups.get(group)!.push({
              id,
              keys: state.getEffectiveKeys(id),
              description: config.description,
              handler,
              enableInInput: config.enableInInput,
              group,
              enabled: config.enabled,
            });
          }
        });
        
        return groups;
      },
      
      getConfig: (id: string) => {
        return get().configs.get(id);
      },
      
      getEffectiveKeys: (id: string) => {
        const state = get();
        const customKeys = state.customKeyBindings.get(id);
        if (customKeys) {
          return customKeys;
        }
        const config = state.configs.get(id);
        return config?.keys || [];
      },
    }),
    {
      name: 'shortcut-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        customKeyBindings: Array.from(state.customKeyBindings.entries()),
        enabled: state.enabled,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<ShortcutStoreState>;
        return {
          ...current,
          customKeyBindings: new Map(persistedState.customKeyBindings || []),
          enabled: persistedState.enabled ?? current.enabled,
        };
      },
    }
  )
);

/** 获取平台特定的主修饰键 */
export function getPlatformModifier(): 'ctrl' | 'meta' {
  if (typeof navigator === 'undefined') return 'ctrl';
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? 'meta' : 'ctrl';
}

/** 格式化快捷键显示 */
export function formatShortcutForDisplay(keys: string[]): string {
  const platform = getPlatformModifier();
  
  return keys
    .map(key => {
      const lowerKey = key.toLowerCase();
      switch (lowerKey) {
        case 'ctrl':
          return platform === 'meta' ? '⌃' : 'Ctrl';
        case 'meta':
          return platform === 'meta' ? '⌘' : 'Win';
        case 'alt':
          return platform === 'meta' ? '⌥' : 'Alt';
        case 'shift':
          return platform === 'meta' ? '⇧' : 'Shift';
        case 'escape':
          return 'Esc';
        case ' ':
          return 'Space';
        case 'arrowup':
          return '↑';
        case 'arrowdown':
          return '↓';
        case 'arrowleft':
          return '←';
        case 'arrowright':
          return '→';
        case 'enter':
          return 'Enter';
        case 'delete':
          return 'Del';
        case 'backspace':
          return '⌫';
        default:
          return key.length === 1 ? key.toUpperCase() : key;
      }
    })
    .join(' + ');
}

export default useShortcutStore;