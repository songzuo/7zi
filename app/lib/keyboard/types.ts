/**
 * 键盘快捷键类型定义
 * Keyboard Shortcut Type Definitions
 */

/** 键盘组合键修饰符 */
export type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';

/** 键盘快捷键配置 */
export interface KeyboardShortcut {
  /** 快捷键唯一标识 */
  id: string;
  /** 快捷键组合，如 ['ctrl', 'k'] 或 ['meta', 'n'] */
  keys: string[];
  /** 快捷键描述 */
  description: string;
  /** 回调函数 */
  handler: (event: KeyboardEvent) => void;
  /** 是否在输入框中也触发 (默认 false) */
  enableInInput?: boolean;
  /** 是否阻止默认行为 (默认 true) */
  preventDefault?: boolean;
  /** 是否启用 (默认 true) */
  enabled?: boolean;
  /** 分组名称 */
  group?: string;
}

/** 快捷键分组 */
export interface ShortcutGroup {
  name: string;
  shortcuts: KeyboardShortcut[];
}

/** 快捷键注册选项 */
export interface UseKeyboardShortcutsOptions {
  /** 是否启用 (默认 true) */
  enabled?: boolean;
  /** Scope 名称，用于区分不同页面 */
  scope?: string;
  /** 全局快捷键 (在输入框中也生效) */
  global?: boolean;
}

/** 解析后的快捷键 */
export interface ParsedShortcut {
  modifierKeys: ModifierKey[];
  key: string;
  displayText: string;
}

/** 快捷键帮助面板 Props */
export interface ShortcutHelpPanelProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 自定义分组 */
  customGroups?: ShortcutGroup[];
}

/** 快捷键存储 */
export interface ShortcutStore {
  /** 所有注册的快捷键 */
  shortcuts: Map<string, KeyboardShortcut>;
  /** 当前活动的 scope */
  activeScope: string | null;
  /** 注册快捷键 */
  register: (shortcut: KeyboardShortcut) => void;
  /** 注销快捷键 */
  unregister: (id: string) => void;
  /** 获取所有快捷键 */
  getAll: () => KeyboardShortcut[];
  /** 按分组获取 */
  getByGroup: () => Map<string, KeyboardShortcut[]>;
}

/** 平台特定的修饰键 */
export type PlatformModifier = 'ctrl' | 'meta';

/** 获取平台特定的主修饰键 */
export function getPlatformModifier(): PlatformModifier {
  if (typeof navigator === 'undefined') return 'ctrl';
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? 'meta' : 'ctrl';
}

/** 格式化快捷键显示文本 */
export function formatShortcutDisplay(keys: string[]): string {
  const platform = getPlatformModifier();
  
  return keys
    .map(key => {
      switch (key.toLowerCase()) {
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
        default:
          return key.toUpperCase();
      }
    })
    .join(' + ');
}

/** 解析快捷键字符串 */
export function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut.toLowerCase().split('+');
  const modifierKeys: ModifierKey[] = [];
  let key = '';

  for (const part of parts) {
    const trimmed = part.trim();
    if (['ctrl', 'alt', 'shift', 'meta'].includes(trimmed)) {
      modifierKeys.push(trimmed as ModifierKey);
    } else {
      key = trimmed;
    }
  }

  return {
    modifierKeys,
    key,
    displayText: formatShortcutDisplay([...modifierKeys, key]),
  };
}

/** 检查键盘事件是否匹配快捷键 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean {
  const keys = shortcut.keys.map(k => k.toLowerCase());
  
  // 检查修饰键
  const hasCtrl = keys.includes('ctrl');
  const hasAlt = keys.includes('alt');
  const hasShift = keys.includes('shift');
  const hasMeta = keys.includes('meta');

  if (hasCtrl !== (event.ctrlKey || event.metaKey)) return false;
  if (hasAlt !== event.altKey) return false;
  if (hasShift !== event.shiftKey) return false;
  if (hasMeta !== event.metaKey) return false;

  // 获取非修饰键
  const mainKey = keys.find(k => !['ctrl', 'alt', 'shift', 'meta'].includes(k));
  if (!mainKey) return false;

  return event.key.toLowerCase() === mainKey;
}