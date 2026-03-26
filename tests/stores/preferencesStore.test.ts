/**
 * Preferences Store Tests
 * Tests for src/stores/preferencesStore.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  usePreferencesStore,
  getSettings,
  setTheme,
  toggleTheme,
  setLanguage,
  type Theme,
  type Locale,
} from '@/stores/preferencesStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock document.documentElement
const mockDocumentElement = {
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
  },
};

Object.defineProperty(document, 'documentElement', {
  value: mockDocumentElement,
  writable: true,
});

describe('Preferences Store', () => {
  beforeEach(() => {
    // Reset store state
    usePreferencesStore.setState({
      settings: {
        theme: 'system',
        language: 'zh',
        notifications: {
          enabled: true,
          sound: true,
          email: false,
          push: true,
        },
      },
      isLoaded: false,
      isDark: false,
    });

    // Clear localStorage
    localStorageMock.clear();

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with default settings', () => {
      const state = usePreferencesStore.getState();

      expect(state.settings.theme).toBe('system');
      expect(state.settings.language).toBe('zh');
      expect(state.settings.notifications.enabled).toBe(true);
      expect(state.settings.notifications.sound).toBe(true);
      expect(state.settings.notifications.email).toBe(false);
      expect(state.settings.notifications.push).toBe(true);
    });

    it('should have isLoaded flag', () => {
      const state = usePreferencesStore.getState();

      expect(typeof state.isLoaded).toBe('boolean');
    });

    it('should have isDark flag', () => {
      const state = usePreferencesStore.getState();

      expect(typeof state.isDark).toBe('boolean');
    });

    it('should have setTheme action', () => {
      const state = usePreferencesStore.getState();

      expect(typeof state.setTheme).toBe('function');
    });

    it('should have toggleTheme action', () => {
      const state = usePreferencesStore.getState();

      expect(typeof state.toggleTheme).toBe('function');
    });

    it('should have setLanguage action', () => {
      const state = usePreferencesStore.getState();

      expect(typeof state.setLanguage).toBe('function');
    });

    it('should have setNotifications action', () => {
      const state = usePreferencesStore.getState();

      expect(typeof state.setNotifications).toBe('function');
    });

    it('should have resetSettings action', () => {
      const state = usePreferencesStore.getState();

      expect(typeof state.resetSettings).toBe('function');
    });
  });

  describe('setTheme', () => {
    it('should set theme to light', () => {
      const { setTheme } = usePreferencesStore.getState();

      setTheme('light');

      const state = usePreferencesStore.getState();
      expect(state.settings.theme).toBe('light');
      expect(state.isDark).toBe(false);
    });

    it('should set theme to dark', () => {
      const { setTheme } = usePreferencesStore.getState();

      setTheme('dark');

      const state = usePreferencesStore.getState();
      expect(state.settings.theme).toBe('dark');
      expect(state.isDark).toBe(true);
    });

    it('should set theme to system', () => {
      const { setTheme } = usePreferencesStore.getState();

      setTheme('system');

      const state = usePreferencesStore.getState();
      expect(state.settings.theme).toBe('system');
    });

    it('should sync theme to DOM', () => {
      const { setTheme } = usePreferencesStore.getState();

      setTheme('dark');

      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');

      setTheme('light');

      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('dark');
    });

    it('should preserve other settings when changing theme', () => {
      const { setTheme, setLanguage } = usePreferencesStore.getState();

      setLanguage('en');
      setTheme('dark');

      const state = usePreferencesStore.getState();
      expect(state.settings.language).toBe('en');
      expect(state.settings.theme).toBe('dark');
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      const { setTheme, toggleTheme } = usePreferencesStore.getState();

      setTheme('light');
      toggleTheme();

      const state = usePreferencesStore.getState();
      expect(state.settings.theme).toBe('dark');
      expect(state.isDark).toBe(true);
    });

    it('should toggle from dark to light', () => {
      const { setTheme, toggleTheme } = usePreferencesStore.getState();

      setTheme('dark');
      toggleTheme();

      const state = usePreferencesStore.getState();
      expect(state.settings.theme).toBe('light');
      expect(state.isDark).toBe(false);
    });

    it('should toggle from system based on system preference', () => {
      const { setTheme, toggleTheme } = usePreferencesStore.getState();

      setTheme('system');
      toggleTheme();

      const state = usePreferencesStore.getState();
      expect(['light', 'dark']).toContain(state.settings.theme);
    });

    it('should sync theme to DOM after toggle', () => {
      const { setTheme, toggleTheme } = usePreferencesStore.getState();

      setTheme('light');
      toggleTheme();

      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
    });
  });

  describe('setLanguage', () => {
    it('should set language to zh', () => {
      const { setLanguage } = usePreferencesStore.getState();

      setLanguage('zh');

      const state = usePreferencesStore.getState();
      expect(state.settings.language).toBe('zh');
    });

    it('should set language to en', () => {
      const { setLanguage } = usePreferencesStore.getState();

      setLanguage('en');

      const state = usePreferencesStore.getState();
      expect(state.settings.language).toBe('en');
    });

    it('should set language to ja', () => {
      const { setLanguage } = usePreferencesStore.getState();

      setLanguage('ja');

      const state = usePreferencesStore.getState();
      expect(state.settings.language).toBe('ja');
    });

    it('should preserve other settings when changing language', () => {
      const { setLanguage, setTheme } = usePreferencesStore.getState();

      setTheme('dark');
      setLanguage('en');

      const state = usePreferencesStore.getState();
      expect(state.settings.theme).toBe('dark');
      expect(state.settings.language).toBe('en');
    });
  });

  describe('setNotifications', () => {
    it('should update enabled notification', () => {
      const { setNotifications } = usePreferencesStore.getState();

      setNotifications({ enabled: false });

      const state = usePreferencesStore.getState();
      expect(state.settings.notifications.enabled).toBe(false);
    });

    it('should update sound notification', () => {
      const { setNotifications } = usePreferencesStore.getState();

      setNotifications({ sound: false });

      const state = usePreferencesStore.getState();
      expect(state.settings.notifications.sound).toBe(false);
    });

    it('should update email notification', () => {
      const { setNotifications } = usePreferencesStore.getState();

      setNotifications({ email: true });

      const state = usePreferencesStore.getState();
      expect(state.settings.notifications.email).toBe(true);
    });

    it('should update push notification', () => {
      const { setNotifications } = usePreferencesStore.getState();

      setNotifications({ push: false });

      const state = usePreferencesStore.getState();
      expect(state.settings.notifications.push).toBe(false);
    });

    it('should update multiple notification settings', () => {
      const { setNotifications } = usePreferencesStore.getState();

      setNotifications({ enabled: false, sound: false });

      const state = usePreferencesStore.getState();
      expect(state.settings.notifications.enabled).toBe(false);
      expect(state.settings.notifications.sound).toBe(false);
    });

    it('should preserve other notification settings when updating one', () => {
      const { setNotifications, setTheme } = usePreferencesStore.getState();

      setTheme('dark');
      setNotifications({ enabled: false });

      const state = usePreferencesStore.getState();
      expect(state.settings.notifications.sound).toBe(true);
      expect(state.settings.notifications.email).toBe(false);
      expect(state.settings.notifications.push).toBe(true);
      expect(state.settings.theme).toBe('dark');
    });
  });

  describe('resetSettings', () => {
    it('should reset to default settings', () => {
      const { setTheme, setLanguage, setNotifications, resetSettings } =
        usePreferencesStore.getState();

      setTheme('dark');
      setLanguage('en');
      setNotifications({ enabled: false });
      resetSettings();

      const state = usePreferencesStore.getState();
      expect(state.settings.theme).toBe('system');
      expect(state.settings.language).toBe('zh');
      expect(state.settings.notifications.enabled).toBe(true);
    });

    it('should sync default theme to DOM', () => {
      const { setTheme, resetSettings } = usePreferencesStore.getState();

      setTheme('dark');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');

      resetSettings();
      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('dark');
    });
  });

  describe('external API - getSettings', () => {
    it('should return current settings', () => {
      const { setLanguage } = usePreferencesStore.getState();

      setLanguage('en');

      const settings = getSettings();
      expect(settings.language).toBe('en');
    });
  });

  describe('external API - setTheme', () => {
    it('should set theme externally', () => {
      setTheme('dark');

      const state = usePreferencesStore.getState();
      expect(state.settings.theme).toBe('dark');
    });
  });

  describe('external API - toggleTheme', () => {
    it('should toggle theme externally', () => {
      const { setTheme } = usePreferencesStore.getState();
      setTheme('light');

      toggleTheme();

      const state = usePreferencesStore.getState();
      expect(state.settings.theme).toBe('dark');
    });
  });

  describe('external API - setLanguage', () => {
    it('should set language externally', () => {
      setLanguage('en');

      const state = usePreferencesStore.getState();
      expect(state.settings.language).toBe('en');
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple theme changes', () => {
      const { setTheme } = usePreferencesStore.getState();

      setTheme('light');
      expect(usePreferencesStore.getState().settings.theme).toBe('light');

      setTheme('dark');
      expect(usePreferencesStore.getState().settings.theme).toBe('dark');

      setTheme('system');
      expect(usePreferencesStore.getState().settings.theme).toBe('system');
    });

    it('should handle theme and language changes together', () => {
      const { setTheme, setLanguage } = usePreferencesStore.getState();

      setTheme('dark');
      setLanguage('en');

      const state = usePreferencesStore.getState();
      expect(state.settings.theme).toBe('dark');
      expect(state.settings.language).toBe('en');
    });

    it('should handle complete settings workflow', () => {
      const { setTheme, setLanguage, setNotifications, resetSettings } =
        usePreferencesStore.getState();

      // Change all settings
      setTheme('dark');
      setLanguage('en');
      setNotifications({ enabled: false, email: true });

      let state = usePreferencesStore.getState();
      expect(state.settings.theme).toBe('dark');
      expect(state.settings.language).toBe('en');
      expect(state.settings.notifications.enabled).toBe(false);
      expect(state.settings.notifications.email).toBe(true);

      // Reset
      resetSettings();

      state = usePreferencesStore.getState();
      expect(state.settings.theme).toBe('system');
      expect(state.settings.language).toBe('zh');
      expect(state.settings.notifications.enabled).toBe(true);
      expect(state.settings.notifications.email).toBe(false);
    });

    it('should work with external API functions', () => {
      setTheme('dark');
      expect(getSettings().theme).toBe('dark');

      setLanguage('en');
      expect(getSettings().language).toBe('en');

      toggleTheme();
      expect(getSettings().theme).toBe('light');
    });
  });

  describe('edge cases', () => {
    it('should handle rapid theme changes', () => {
      const { setTheme } = usePreferencesStore.getState();

      setTheme('light');
      setTheme('dark');
      setTheme('light');
      setTheme('dark');

      const state = usePreferencesStore.getState();
      expect(state.settings.theme).toBe('dark');
    });

    it('should handle rapid language changes', () => {
      const { setLanguage } = usePreferencesStore.getState();

      setLanguage('en');
      setLanguage('zh');
      setLanguage('en');
      setLanguage('zh');

      const state = usePreferencesStore.getState();
      expect(state.settings.language).toBe('zh');
    });

    it('should handle setting same value multiple times', () => {
      const { setTheme } = usePreferencesStore.getState();

      setTheme('dark');
      setTheme('dark');
      setTheme('dark');

      const state = usePreferencesStore.getState();
      expect(state.settings.theme).toBe('dark');
    });

    it('should handle empty notifications update', () => {
      const { setNotifications } = usePreferencesStore.getState();

      setNotifications({});

      const state = usePreferencesStore.getState();
      expect(state.settings.notifications).toEqual({
        enabled: true,
        sound: true,
        email: false,
        push: true,
      });
    });
  });
});
