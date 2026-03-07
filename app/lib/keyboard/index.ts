/**
 * 键盘快捷键模块导出
 */

// 类型
export * from './types';

// Hook
export * from './useKeyboardShortcuts';

// 组件
export * from './ShortcutHelpPanel';
export * from './ShortcutProvider';
export * from './CommandPalette';

// Store
export {
  useShortcutStore,
  formatShortcutForDisplay,
  getPlatformModifier,
  DEFAULT_SHORTCUTS,
  type ShortcutConfig,
} from './shortcut-store';

// 便捷导出
export { ShortcutProvider as KeyboardProvider } from './ShortcutProvider';
export { CommandPalette } from './CommandPalette';
export { ShortcutHelpPanel } from './ShortcutHelpPanel';