/**
 * 键盘快捷键系统测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import userEvent from '@testing-library/user-event';

// 模拟 localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// 模拟 navigator.platform
Object.defineProperty(navigator, 'platform', {
  value: 'Win32',
  writable: true,
});

// 模拟 createPortal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (children: ReactNode) => children,
  };
});

// 导入测试模块
import {
  KeyboardShortcut,
  formatShortcutDisplay,
  parseShortcut,
  matchesShortcut,
  getPlatformModifier,
} from '../types';

import {
  useShortcutStore,
  formatShortcutForDisplay,
  DEFAULT_SHORTCUTS,
} from '../shortcut-store';

import { ShortcutProvider, useRegisterShortcut, useShortcutContext } from '../ShortcutProvider';

import { CommandPalette, useCommandPalette } from '../CommandPalette';

// ============================================================================
// 类型测试
// ============================================================================

describe('键盘快捷键类型', () => {
  describe('getPlatformModifier', () => {
    it('在 Windows 上返回 ctrl', () => {
      expect(getPlatformModifier()).toBe('ctrl');
    });

    it('在 Mac 上返回 meta', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        writable: true,
      });
      expect(getPlatformModifier()).toBe('meta');
      
      // 恢复
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        writable: true,
      });
    });
  });

  describe('formatShortcutDisplay', () => {
    it('格式化 Ctrl+K', () => {
      const result = formatShortcutDisplay(['ctrl', 'k']);
      expect(result).toBe('Ctrl + K');
    });

    it('格式化 Shift+Enter', () => {
      const result = formatShortcutDisplay(['shift', 'enter']);
      expect(result).toBe('Shift + Enter');
    });

    it('格式化 Escape', () => {
      const result = formatShortcutDisplay(['Escape']);
      expect(result).toBe('Esc');
    });

    it('格式化方向键', () => {
      expect(formatShortcutDisplay(['arrowup'])).toBe('↑');
      expect(formatShortcutDisplay(['arrowdown'])).toBe('↓');
      expect(formatShortcutDisplay(['arrowleft'])).toBe('←');
      expect(formatShortcutDisplay(['arrowright'])).toBe('→');
    });
  });

  describe('parseShortcut', () => {
    it('解析 Ctrl+K', () => {
      const result = parseShortcut('ctrl+k');
      expect(result.modifierKeys).toEqual(['ctrl']);
      expect(result.key).toBe('k');
    });

    it('解析 Ctrl+Shift+S', () => {
      const result = parseShortcut('ctrl+shift+s');
      expect(result.modifierKeys).toEqual(['ctrl', 'shift']);
      expect(result.key).toBe('s');
    });
  });

  describe('matchesShortcut', () => {
    const createKeyboardEvent = (key: string, modifiers: Partial<KeyboardEvent> = {}): KeyboardEvent => {
      return new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...modifiers,
      });
    };

    it('匹配简单快捷键 Escape', () => {
      const event = createKeyboardEvent('Escape');
      const shortcut: KeyboardShortcut = {
        id: 'escape',
        keys: ['Escape'],
        description: '关闭',
        handler: vi.fn(),
      };
      expect(matchesShortcut(event, shortcut)).toBe(true);
    });

    it('匹配 Ctrl+K', () => {
      const event = createKeyboardEvent('k', { ctrlKey: true });
      const shortcut: KeyboardShortcut = {
        id: 'command-palette',
        keys: ['ctrl', 'k'],
        description: '命令面板',
        handler: vi.fn(),
      };
      expect(matchesShortcut(event, shortcut)).toBe(true);
    });

    it('不匹配缺少修饰键的情况', () => {
      const event = createKeyboardEvent('k');
      const shortcut: KeyboardShortcut = {
        id: 'command-palette',
        keys: ['ctrl', 'k'],
        description: '命令面板',
        handler: vi.fn(),
      };
      expect(matchesShortcut(event, shortcut)).toBe(false);
    });
  });
});

// ============================================================================
// Store 测试
// ============================================================================

describe('快捷键存储', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // 重置 store
    useShortcutStore.setState({
      configs: new Map(DEFAULT_SHORTCUTS.map(s => [s.id, s])),
      handlers: new Map(),
      enabled: true,
      activeScope: null,
      customKeyBindings: new Map(),
    });
  });

  describe('DEFAULT_SHORTCUTS', () => {
    it('包含必要的默认快捷键', () => {
      const ids = DEFAULT_SHORTCUTS.map(s => s.id);
      expect(ids).toContain('command-palette');
      expect(ids).toContain('shortcut-help');
      expect(ids).toContain('new-task');
      expect(ids).toContain('save');
    });

    it('所有默认快捷键都有描述', () => {
      DEFAULT_SHORTCUTS.forEach(shortcut => {
        expect(shortcut.description).toBeTruthy();
      });
    });
  });

  describe('formatShortcutForDisplay', () => {
    it('格式化快捷键', () => {
      expect(formatShortcutForDisplay(['ctrl', 'k'])).toBe('Ctrl + K');
      expect(formatShortcutForDisplay(['ctrl', 'shift', 's'])).toBe('Ctrl + Shift + S');
    });
  });

  describe('register/unregister', () => {
    it('注册快捷键', () => {
      const store = useShortcutStore.getState();
      const handler = vi.fn();
      
      store.register({
        id: 'test-shortcut',
        keys: ['ctrl', 't'],
        description: '测试快捷键',
        handler,
      });

      const config = store.getConfig('test-shortcut');
      expect(config).toBeDefined();
      expect(config?.keys).toEqual(['ctrl', 't']);
    });

    it('注销快捷键', () => {
      const store = useShortcutStore.getState();
      
      store.register({
        id: 'test-shortcut',
        keys: ['ctrl', 't'],
        description: '测试快捷键',
        handler: vi.fn(),
      });

      expect(store.getConfig('test-shortcut')).toBeDefined();

      store.unregister('test-shortcut');
      expect(store.getConfig('test-shortcut')).toBeUndefined();
    });
  });

  describe('updateKeyBinding', () => {
    it('更新快捷键绑定', () => {
      const store = useShortcutStore.getState();
      
      store.updateKeyBinding('save', ['ctrl', 'shift', 's']);
      
      const keys = store.getEffectiveKeys('save');
      expect(keys).toEqual(['ctrl', 'shift', 's']);
    });
  });

  describe('setEnabled', () => {
    it('启用/禁用快捷键', () => {
      const store = useShortcutStore.getState();
      
      store.setEnabled('save', false);
      const config = store.getConfig('save');
      expect(config?.enabled).toBe(false);
    });
  });

  describe('getByGroup', () => {
    it('按分组获取快捷键', () => {
      const store = useShortcutStore.getState();
      
      // 注册处理器
      DEFAULT_SHORTCUTS.forEach(config => {
        store.register({
          ...config,
          handler: vi.fn(),
        });
      });

      const groups = store.getByGroup();
      expect(groups.size).toBeGreaterThan(0);
      expect(groups.has('通用')).toBe(true);
    });
  });
});

// ============================================================================
// Provider 测试
// ============================================================================

describe('ShortcutProvider', () => {
  const wrapper = ({ children }: { children: ReactNode }) => 
    createElement(ShortcutProvider, null, children);

  it('提供上下文', () => {
    const TestComponent = () => {
      const context = useShortcutContext();
      return createElement('div', null, context ? 'has context' : 'no context');
    };

    render(createElement(TestComponent), { wrapper });
    expect(screen.getByText('has context')).toBeDefined();
  });

  it('注册和触发快捷键', async () => {
    const handler = vi.fn();
    
    const TestComponent = () => {
      useRegisterShortcut({
        id: 'test-shortcut',
        keys: ['ctrl', 't'],
        description: '测试',
        handler,
      });
      return createElement('div', null, 'test');
    };

    render(createElement(TestComponent), { wrapper });

    // 触发快捷键
    fireEvent.keyDown(window, {
      key: 't',
      ctrlKey: true,
    });

    await waitFor(() => {
      expect(handler).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// 命令面板测试
// ============================================================================

describe('CommandPalette', () => {
  const wrapper = ({ children }: { children: ReactNode }) => 
    createElement(ShortcutProvider, null, children);

  describe('useCommandPalette', () => {
    it('管理打开/关闭状态', () => {
      const TestComponent = () => {
        const { isOpen, open, close, toggle } = useCommandPalette();
        return createElement('div', null,
          createElement('span', null, isOpen ? 'open' : 'closed'),
          createElement('button', { onClick: open }, 'open'),
          createElement('button', { onClick: close }, 'close'),
          createElement('button', { onClick: toggle }, 'toggle')
        );
      };

      render(createElement(TestComponent), { wrapper });
      
      expect(screen.getByText('closed')).toBeDefined();
      
      fireEvent.click(screen.getByText('open'));
      expect(screen.getByText('open')).toBeDefined();
      
      fireEvent.click(screen.getByText('close'));
      expect(screen.getByText('closed')).toBeDefined();
      
      fireEvent.click(screen.getByText('toggle'));
      expect(screen.getByText('open')).toBeDefined();
    });
  });

  describe('CommandPalette 组件', () => {
    const commands = [
      {
        id: 'test-1',
        title: '测试命令 1',
        description: '描述 1',
        action: vi.fn(),
      },
      {
        id: 'test-2',
        title: '测试命令 2',
        description: '描述 2',
        action: vi.fn(),
      },
    ];

    it('打开时显示命令列表', () => {
      render(
        createElement(CommandPalette, {
          isOpen: true,
          onClose: vi.fn(),
          commands,
        }),
        { wrapper }
      );

      expect(screen.getByText('测试命令 1')).toBeDefined();
      expect(screen.getByText('测试命令 2')).toBeDefined();
    });

    it('关闭时不显示', () => {
      render(
        createElement(CommandPalette, {
          isOpen: false,
          onClose: vi.fn(),
          commands,
        }),
        { wrapper }
      );

      expect(screen.queryByText('测试命令 1')).toBeNull();
    });

    it('搜索过滤命令', async () => {
      const user = userEvent.setup();
      
      render(
        createElement(CommandPalette, {
          isOpen: true,
          onClose: vi.fn(),
          commands,
        }),
        { wrapper }
      );

      const input = screen.getByPlaceholderText('搜索命令...');
      await user.type(input, '命令 1');

      expect(screen.getByText('测试命令 1')).toBeDefined();
      expect(screen.queryByText('测试命令 2')).toBeNull();
    });

    it('点击命令执行 action', async () => {
      const action = vi.fn();
      const onClose = vi.fn();
      
      render(
        createElement(CommandPalette, {
          isOpen: true,
          onClose,
          commands: [{
            id: 'test',
            title: '测试命令',
            action,
          }],
        }),
        { wrapper }
      );

      await fireEvent.click(screen.getByText('测试命令'));
      
      expect(action).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('ESC 关闭面板', async () => {
      const onClose = vi.fn();
      
      render(
        createElement(CommandPalette, {
          isOpen: true,
          onClose,
          commands,
        }),
        { wrapper }
      );

      fireEvent.keyDown(screen.getByPlaceholderText('搜索命令...'), {
        key: 'Escape',
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('键盘导航', async () => {
      const action1 = vi.fn();
      const action2 = vi.fn();
      const onClose = vi.fn();
      
      render(
        createElement(CommandPalette, {
          isOpen: true,
          onClose,
          commands: [
            { id: '1', title: '命令 1', action: action1 },
            { id: '2', title: '命令 2', action: action2 },
          ],
        }),
        { wrapper }
      );

      const input = screen.getByPlaceholderText('搜索命令...');
      
      // 向下导航
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      
      // 选择第一个
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(action1).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// 集成测试
// ============================================================================

describe('快捷键系统集成', () => {
  it('完整流程：打开命令面板 → 搜索 → 执行', async () => {
    const user = userEvent.setup();
    const commandAction = vi.fn();
    
    const App = () => {
      const { isOpen, open, close } = useCommandPalette();
      
      return createElement(ShortcutProvider, null,
        createElement('button', { onClick: open }, '打开面板'),
        createElement(CommandPalette, {
          isOpen,
          onClose: close,
          commands: [{
            id: 'test',
            title: '测试命令',
            action: commandAction,
          }],
        })
      );
    };

    render(createElement(App));

    // 打开面板
    await user.click(screen.getByText('打开面板'));
    
    // 搜索
    const input = screen.getByPlaceholderText('搜索命令...');
    await user.type(input, '测试');
    
    // 点击命令
    await user.click(screen.getByText('测试命令'));
    
    expect(commandAction).toHaveBeenCalled();
  });
});