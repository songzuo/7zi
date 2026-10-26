/**
 * Unit Tests for Keyboard Shortcuts Module
 *
 * Comprehensive tests for shortcut-manager, shortcut-config,
 * use-keyboard-shortcuts, and shortcut-tooltip.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ShortcutManager,
  getShortcutManager,
  destroyShortcutManager,
  initShortcutManager,
} from './shortcut-manager'
import { DEFAULT_SHORTCUTS, getShortcutDisplayText, SHORTCUT_CATEGORIES } from './shortcut-config'
import type { KeyboardShortcut } from './shortcut-manager'

// Mock document for tests
const mockDocument = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  activeElement: null,
}

global.document = mockDocument as any

describe('shortcut-manager', () => {
  let manager: ShortcutManager

  beforeEach(() => {
    destroyShortcutManager() // Reset global instance
    manager = new ShortcutManager({ debug: false, preventDefaultAll: false })
    vi.clearAllMocks()
  })

  afterEach(() => {
    destroyShortcutManager()
  })

  describe('Constructor', () => {
    it('should create a manager with default config', () => {
      const m = new ShortcutManager()
      expect(m).toBeInstanceOf(ShortcutManager)
    })

    it('should create a manager with custom config', () => {
      const m = new ShortcutManager({ debug: true, preventDefaultAll: false })
      expect(m).toBeInstanceOf(ShortcutManager)
    })

    it('should load default shortcuts', () => {
      expect(manager.getShortcut('global.command-palette')).toBeDefined()
      expect(manager.getShortcut('global.search')).toBeDefined()
      expect(manager.getShortcut('global.escape')).toBeDefined()
    })
  })

  describe('attach / detach', () => {
    it('should attach event listener', () => {
      manager.attach()
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should not attach twice', () => {
      manager.attach()
      manager.attach()
      expect(mockDocument.addEventListener).toHaveBeenCalledTimes(1)
    })

    it('should detach event listener', () => {
      manager.attach()
      manager.detach()
      expect(mockDocument.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should handle detach when not attached', () => {
      expect(() => manager.detach()).not.toThrow()
    })
  })

  describe('register', () => {
    it('should register a valid shortcut', () => {
      const shortcut: KeyboardShortcut = {
        id: 'test.shortcut',
        key: 't',
        context: 'global',
        description: 'Test shortcut',
        action: () => {},
      }

      manager.register(shortcut)
      expect(manager.hasShortcut('test.shortcut')).toBe(true)
    })

    it('should throw error for invalid shortcut (missing id)', () => {
      const invalid = { key: 'a', context: 'global', description: 'test', action: () => {} } as any
      expect(() => manager.register(invalid)).toThrow('Invalid shortcut')
    })

    it('should throw error for invalid shortcut (missing key)', () => {
      const invalid = {
        id: 'test',
        context: 'global',
        description: 'test',
        action: () => {},
      } as any
      expect(() => manager.register(invalid)).toThrow('Invalid shortcut')
    })

    it('should throw error for invalid shortcut (missing action)', () => {
      const invalid = { id: 'test', key: 'a', context: 'global', description: 'test' } as any
      expect(() => manager.register(invalid)).toThrow('Invalid shortcut')
    })

    it('should update existing shortcut with same id', () => {
      const first: KeyboardShortcut = {
        id: 'test.update',
        key: 'a',
        context: 'global',
        description: 'First',
        action: () => {},
      }

      const second: KeyboardShortcut = {
        id: 'test.update',
        key: 'b',
        context: 'global',
        description: 'Second',
        action: () => {},
      }

      manager.register(first)
      manager.register(second)

      const retrieved = manager.getShortcut('test.update')
      expect(retrieved?.key).toBe('b')
      expect(retrieved?.description).toBe('Second')
    })
  })

  describe('unregister', () => {
    it('should unregister a shortcut', () => {
      const shortcut: KeyboardShortcut = {
        id: 'test.unregister',
        key: 'u',
        context: 'global',
        description: 'Test unregister',
        action: () => {},
      }

      manager.register(shortcut)
      expect(manager.hasShortcut('test.unregister')).toBe(true)

      manager.unregister('test.unregister')
      expect(manager.hasShortcut('test.unregister')).toBe(false)
    })

    it('should handle unregister of non-existent shortcut', () => {
      expect(() => manager.unregister('does-not-exist')).not.toThrow()
    })
  })

  describe('update', () => {
    it('should update a shortcut', () => {
      const shortcut: KeyboardShortcut = {
        id: 'test.update-action',
        key: 'a',
        context: 'global',
        description: 'Test update action',
        action: () => {},
      }

      manager.register(shortcut)
      const updated = manager.update('test.update-action', { description: 'Updated' })

      expect(updated).toBe(true)
      expect(manager.getShortcut('test.update-action')?.description).toBe('Updated')
    })

    it('should return false for non-existent shortcut', () => {
      const updated = manager.update('does-not-exist', { description: 'Test' })
      expect(updated).toBe(false)
    })
  })

  describe('context management', () => {
    it('should have default global context', () => {
      expect(manager.getContext()).toBe('global')
    })

    it('should set new context', () => {
      manager.setContext('tasks')
      expect(manager.getContext()).toBe('tasks')
    })

    it('should not set same context', () => {
      const listener = vi.fn()
      manager.onContextChange(listener)

      manager.setContext('global')
      expect(listener).not.toHaveBeenCalled()
    })

    it('should notify context change listeners', () => {
      const listener = vi.fn()
      manager.onContextChange(listener)

      manager.setContext('tasks')
      expect(listener).toHaveBeenCalledWith('tasks')
    })

    it('should unregister context listener', () => {
      const listener = vi.fn()
      const unsubscribe = manager.onContextChange(listener)

      unsubscribe()
      manager.setContext('tasks')

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('getShortcutsForContext', () => {
    it('should get shortcuts for global context', () => {
      const shortcuts = manager.getShortcutsForContext('global')
      expect(shortcuts.length).toBeGreaterThan(0)
    })

    it('should get shortcuts for tasks context', () => {
      const shortcuts = manager.getShortcutsForContext('tasks')
      expect(shortcuts.length).toBeGreaterThan(0)
    })

    it('should return empty array for unknown context', () => {
      const shortcuts = manager.getShortcutsForContext('unknown' as any)
      expect(shortcuts).toEqual([])
    })
  })

  describe('getActiveShortcuts', () => {
    it('should return global shortcuts when in global context', () => {
      manager.setContext('global')
      const active = manager.getActiveShortcuts()
      const allGlobal = manager.getGlobalShortcuts()

      expect(active).toEqual(allGlobal)
    })

    it('should return global + context shortcuts when in specific context', () => {
      manager.setContext('tasks')
      const active = manager.getActiveShortcuts()
      const global = manager.getGlobalShortcuts()
      const tasks = manager.getShortcutsForContext('tasks')

      expect(active.length).toBe(global.length + tasks.length)
    })
  })

  describe('enable / disable', () => {
    it('should enable a shortcut', () => {
      const shortcut: KeyboardShortcut = {
        id: 'test.enable',
        key: 'e',
        context: 'global',
        description: 'Test enable',
        action: () => {},
      }

      manager.register(shortcut)
      manager.disable('test.enable')
      manager.enable('test.enable')

      const retrieved = manager.getShortcut('test.enable')
      expect(retrieved?.enabled).toBe(true)
    })

    it('should disable a shortcut', () => {
      const shortcut: KeyboardShortcut = {
        id: 'test.disable',
        key: 'd',
        context: 'global',
        description: 'Test disable',
        action: () => {},
      }

      manager.register(shortcut)
      manager.disable('test.disable')

      const retrieved = manager.getShortcut('test.disable')
      expect(retrieved?.enabled).toBe(false)
    })

    it('should enable all shortcuts', () => {
      manager.disableAll()
      manager.enableAll()

      const allShortcuts = Array.from((manager as any).shortcuts.values()) as KeyboardShortcut[]
      allShortcuts.forEach((s: KeyboardShortcut) => expect(s.enabled).toBe(true))
    })

    it('should disable all shortcuts', () => {
      manager.disableAll()

      const allShortcuts = Array.from((manager as any).shortcuts.values()) as KeyboardShortcut[]
      allShortcuts.forEach((s: KeyboardShortcut) => expect(s.enabled).toBe(false))
    })
  })

  describe('event handling', () => {
    it('should handle matching shortcut', () => {
      const action = vi.fn()
      const shortcut: KeyboardShortcut = {
        id: 'test.event',
        key: 'x',
        context: 'global',
        description: 'Test event',
        action,
      }

      manager.register(shortcut)
      manager.attach()

      const event = new KeyboardEvent('keydown', { key: 'x' })
      manager['handleKeyDown'](event)

      expect(action).toHaveBeenCalled()
    })

    it('should prevent default behavior', () => {
      // v14：preventDefault 只由 ShortcutManagerConfig.preventDefaultAll 控制，
      // KeyboardShortcut 上并没有 shortcut 级的 preventDefault 字段。
      // beforeEach 建的是 { preventDefaultAll: false }，用它断言
      // expect(event.preventDefault).toHaveBeenCalled() 必然失败。
      // 要验这条，就得单独建一个开了 preventDefaultAll 的实例。
      const action = vi.fn()
      const shortcut: KeyboardShortcut = {
        id: 'test.prevent-default',
        key: 'p',
        context: 'global',
        description: 'Test prevent default',
        action,
      }

      const pdManager = new ShortcutManager({ debug: false, preventDefaultAll: true })
      pdManager.register(shortcut)

      const event = new KeyboardEvent('keydown', {
        key: 'p',
        cancelable: true,
      }) as any

      event.preventDefault = vi.fn()
      pdManager['handleKeyDown'](event)

      expect(event.preventDefault).toHaveBeenCalled()

      // 反向确认：preventDefaultAll=false 时不拦默认行为。
      // 加这一半，这条用例才真在测 config 开关，而不是恒真。
      const offEvent = new KeyboardEvent('keydown', {
        key: 'p',
        cancelable: true,
      }) as any
      offEvent.preventDefault = vi.fn()
      manager.register(shortcut)
      manager['handleKeyDown'](offEvent)
      expect(offEvent.preventDefault).not.toHaveBeenCalled()
    })

    it('should respect ctrl modifier', () => {
      const action = vi.fn()
      const shortcut: KeyboardShortcut = {
        id: 'test.ctrl',
        key: 'a',
        context: 'global',
        ctrl: true,
        description: 'Test ctrl',
        action,
      }

      manager.register(shortcut)

      const event1 = new KeyboardEvent('keydown', { key: 'a' })
      manager['handleKeyDown'](event1)
      expect(action).not.toHaveBeenCalled()

      const event2 = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true })
      manager['handleKeyDown'](event2)
      expect(action).toHaveBeenCalled()
    })

    it('should respect shift modifier', () => {
      const action = vi.fn()
      const shortcut: KeyboardShortcut = {
        id: 'test.shift',
        key: '?',
        context: 'global',
        shift: true,
        description: 'Test shift',
        action,
      }

      // v14：DEFAULT_SHORTCUTS 里已经有 global.help（key='?'、shift=true）。
      // findMatchingShortcut 按 getActiveShortcuts() 的插入序返回**第一个**命中项，
      // 默认项先注册，所以这里命中的是 global.help，test.shift.action 永远不会被调用
      // —— 这条用例以前恒失败。摘掉冲突的默认项，让断言只针对 shift 判定本身。
      manager.unregister('global.help')
      manager.register(shortcut)

      const event = new KeyboardEvent('keydown', { key: '?', shiftKey: true })
      manager['handleKeyDown'](event)
      expect(action).toHaveBeenCalled()
    })

    it('should handle Escape key in input field', () => {
      const action = vi.fn()
      const shortcut: KeyboardShortcut = {
        id: 'test.escape',
        key: 'Escape',
        context: 'global',
        description: 'Test escape',
        action,
      }

      // v14：DEFAULT_SHORTCUTS 里已经有 global.escape（key='Escape'），
      // 会先于 test.escape 命中，导致断言恒失败。
      // 摘掉默认项后，这条用例才真的在验「input 里的 Escape 仍放行」。
      manager.unregister('global.escape')
      manager.register(shortcut)

      const event = new KeyboardEvent('keydown', { key: 'Escape' }) as any
      // v13：jsdom 与真实浏览器里 Event.target 都是**只读 getter**，
      // `event.target = …` 直接抛
      //   TypeError: Cannot set property target of #<Event> which has only a getter
      Object.defineProperty(event, 'target', {
        value: { tagName: 'INPUT' },
        configurable: true,
      })

      manager['handleKeyDown'](event)
      expect(action).toHaveBeenCalled()
    })

    it('should ignore other keys in input field', () => {
      const action = vi.fn()
      const shortcut: KeyboardShortcut = {
        id: 'test.input-ignore',
        key: 'a',
        context: 'global',
        description: 'Test input ignore',
        action,
      }

      manager.register(shortcut)

      const event = new KeyboardEvent('keydown', { key: 'a' }) as any
      // v13：同上，Event.target 只读。
      Object.defineProperty(event, 'target', {
        value: { tagName: 'INPUT' },
        configurable: true,
      })

      manager['handleKeyDown'](event)
      expect(action).not.toHaveBeenCalled()
    })

    it('should notify trigger listeners', () => {
      const action = vi.fn()
      const triggerListener = vi.fn()
      const shortcut: KeyboardShortcut = {
        id: 'test.trigger',
        key: 't',
        context: 'global',
        description: 'Test trigger',
        action,
      }

      manager.register(shortcut)
      manager.onShortcutTrigger(triggerListener)

      const event = new KeyboardEvent('keydown', { key: 't' })
      manager['handleKeyDown'](event)

      expect(triggerListener).toHaveBeenCalledWith(shortcut, event)
    })
  })

  describe('customizations', () => {
    it('should set customization', () => {
      manager.setCustomization('global.command-palette', { key: 'x' })

      const shortcut = manager.getShortcut('global.command-palette')
      expect(shortcut?.key).toBe('x')
    })

    it('should clear customization', () => {
      manager.setCustomization('global.command-palette', { key: 'x' })
      manager.clearCustomization('global.command-palette')

      const shortcut = manager.getShortcut('global.command-palette')
      expect(shortcut?.key).toBe('k') // Back to default
    })

    it('should get customizations', () => {
      manager.setCustomization('test.1', { key: 'a' })
      manager.setCustomization('test.2', { key: 'b' })

      const customizations = manager.getCustomizations()
      expect(customizations['test.1']).toEqual({ key: 'a' })
      expect(customizations['test.2']).toEqual({ key: 'b' })
    })

    it('should load customizations from record', () => {
      manager.loadCustomizations({
        'test.1': { key: 'x' },
        'test.2': { key: 'y' },
      })

      const customizations = manager.getCustomizations()
      expect(customizations['test.1']).toEqual({ key: 'x' })
      expect(customizations['test.2']).toEqual({ key: 'y' })
    })
  })

  describe('export / import', () => {
    it('should export configuration', () => {
      const config = manager.exportConfig()

      expect(config).toHaveProperty('shortcuts')
      expect(config).toHaveProperty('customizations')
      expect(config).toHaveProperty('context')
      expect(config.shortcuts).toBeInstanceOf(Array)
    })

    it('should import configuration', () => {
      const newManager = new ShortcutManager()
      const config = manager.exportConfig()

      newManager.importConfig(config)

      expect(newManager.getContext()).toBe(manager.getContext())
    })
  })

  describe('reset', () => {
    it('should reset to default shortcuts', () => {
      // Customize a shortcut
      manager.setCustomization('global.command-palette', { key: 'x' })
      expect(manager.getShortcut('global.command-palette')?.key).toBe('x')

      // Reset
      manager.reset()

      // Should be back to default
      expect(manager.getShortcut('global.command-palette')?.key).toBe('k')
    })

    it('should clear customizations', () => {
      manager.setCustomization('test.1', { key: 'a' })
      expect(manager.getCustomizations()['test.1']).toBeDefined()

      manager.reset()
      expect(manager.getCustomizations()['test.1']).toBeUndefined()
    })
  })
})

describe('global instance', () => {
  beforeEach(() => {
    destroyShortcutManager()
  })

  afterEach(() => {
    destroyShortcutManager()
  })

  it('should create global instance', () => {
    const instance = getShortcutManager()
    expect(instance).toBeInstanceOf(ShortcutManager)
  })

  it('should return same instance', () => {
    const instance1 = getShortcutManager()
    const instance2 = getShortcutManager()

    expect(instance1).toBe(instance2)
  })

  it('should init and attach', () => {
    const instance = initShortcutManager({ debug: false })
    expect(instance).toBeInstanceOf(ShortcutManager)
    expect(mockDocument.addEventListener).toHaveBeenCalled()
  })

  it('should destroy global instance', () => {
    // v13：原来写的是
    //     const newInstance = getShortcutManager()
    //     expect(newInstance).not.toBe(getShortcutManager())
    // 这两次调用返回的是**同一个**新单例（destroy 之后 getShortcutManager()
    // 会重新建一个，再调还是它），所以 not.toBe 恒失败。
    // 要验的是「销毁后再取到的是另一个实例」，必须先留住销毁前那个。
    const before = getShortcutManager()
    destroyShortcutManager()
    const after = getShortcutManager()
    expect(after).not.toBe(before)
  })
})

describe('shortcut-config', () => {
  describe('DEFAULT_SHORTCUTS', () => {
    it('should have required default shortcuts', () => {
      expect(DEFAULT_SHORTCUTS.length).toBeGreaterThan(0)

      const ids = DEFAULT_SHORTCUTS.map(s => s.id)
      expect(ids).toContain('global.command-palette')
      expect(ids).toContain('global.search')
      expect(ids).toContain('global.escape')
    })

    it('should have valid shortcut structures', () => {
      DEFAULT_SHORTCUTS.forEach(shortcut => {
        expect(shortcut).toHaveProperty('id')
        expect(shortcut).toHaveProperty('key')
        expect(shortcut).toHaveProperty('context')
        expect(shortcut).toHaveProperty('description')
        expect(shortcut).toHaveProperty('action')
        expect(typeof shortcut.action).toBe('function')
      })
    })
  })

  describe('SHORTCUT_CATEGORIES', () => {
    it('should have standard categories', () => {
      expect(SHORTCUT_CATEGORIES).toHaveProperty('navigation')
      expect(SHORTCUT_CATEGORIES).toHaveProperty('actions')
      expect(SHORTCUT_CATEGORIES).toHaveProperty('ui')
      expect(SHORTCUT_CATEGORIES).toHaveProperty('formatting')
    })
  })

  describe('getShortcutDisplayText', () => {
    it('should format simple key', () => {
      const shortcut: KeyboardShortcut = {
        id: 'test',
        key: 'a',
        context: 'global',
        description: 'Test',
        action: () => {},
      }

      const text = getShortcutDisplayText(shortcut)
      expect(text).toBe('A')
    })

    it('should format Ctrl + key', () => {
      const shortcut: KeyboardShortcut = {
        id: 'test',
        key: 'k',
        context: 'global',
        ctrl: true,
        description: 'Test',
        action: () => {},
      }

      const text = getShortcutDisplayText(shortcut)
      expect(text).toContain('Ctrl')
      expect(text).toContain('K')
    })

    it('should format Shift + key', () => {
      const shortcut: KeyboardShortcut = {
        id: 'test',
        key: '?',
        context: 'global',
        shift: true,
        description: 'Test',
        action: () => {},
      }

      const text = getShortcutDisplayText(shortcut)
      expect(text).toContain('Shift')
      expect(text).toContain('?')
    })

    it('should format multiple modifiers', () => {
      const shortcut: KeyboardShortcut = {
        id: 'test',
        key: 'z',
        context: 'global',
        ctrl: true,
        shift: true,
        description: 'Test',
        action: () => {},
      }

      const text = getShortcutDisplayText(shortcut)
      expect(text).toContain('Ctrl')
      expect(text).toContain('Shift')
      expect(text).toContain('Z')
    })

    it('should format special keys', () => {
      const specialKeys = ['Escape', 'Enter', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', ' ']

      specialKeys.forEach(key => {
        const shortcut: KeyboardShortcut = {
          id: 'test',
          key,
          context: 'global',
          description: 'Test',
          action: () => {},
        }

        const text = getShortcutDisplayText(shortcut)
        expect(text.length).toBeGreaterThan(0)
      })
    })

    it('should format Space key', () => {
      const shortcut: KeyboardShortcut = {
        id: 'test',
        key: ' ',
        context: 'global',
        description: 'Test',
        action: () => {},
      }

      const text = getShortcutDisplayText(shortcut)
      expect(text).toBe('Space')
    })

    it('should format arrow keys', () => {
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
      const symbols = ['↑', '↓', '←', '→']

      arrowKeys.forEach((key, index) => {
        const shortcut: KeyboardShortcut = {
          id: 'test',
          key,
          context: 'global',
          description: 'Test',
          action: () => {},
        }

        const text = getShortcutDisplayText(shortcut)
        expect(text).toContain(symbols[index])
      })
    })
  })
})
