/**
 * @fileoverview preferencesStore 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePreferencesStore } from '../preferencesStore';
import type { Theme } from '../preferencesStore';

describe('preferencesStore', () => {
  beforeEach(() => {
    // 重置 store
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
  });

  describe('initial state', () => {
    it('should have default settings', () => {
      const settings = usePreferencesStore.getState().settings;
      expect(settings.theme).toBe('system');
      expect(settings.language).toBe('zh');
      expect(settings.notifications.enabled).toBe(true);
    });

    it('should have isLoaded as false initially', () => {
      expect(usePreferencesStore.getState().isLoaded).toBe(false);
    });
  });

  describe('setTheme', () => {
    it('should update theme', () => {
      usePreferencesStore.getState().setTheme('dark');
      expect(usePreferencesStore.getState().settings.theme).toBe('dark');
    });

    it('should update isDark when setting dark theme', () => {
      usePreferencesStore.getState().setTheme('dark');
      expect(usePreferencesStore.getState().isDark).toBe(true);
    });

    it('should update isDark when setting light theme', () => {
      usePreferencesStore.getState().setTheme('light');
      expect(usePreferencesStore.getState().isDark).toBe(false);
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      usePreferencesStore.getState().setTheme('light');
      usePreferencesStore.getState().toggleTheme();
      expect(usePreferencesStore.getState().settings.theme).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      usePreferencesStore.getState().setTheme('dark');
      usePreferencesStore.getState().toggleTheme();
      expect(usePreferencesStore.getState().settings.theme).toBe('light');
    });
  });

  describe('setLanguage', () => {
    it('should update language', () => {
      usePreferencesStore.getState().setLanguage('en');
      expect(usePreferencesStore.getState().settings.language).toBe('en');
    });

    it('should support multiple languages', () => {
      const languages = ['en', 'zh', 'ja'] as const;
      languages.forEach((lang) => {
        usePreferencesStore.getState().setLanguage(lang);
        expect(usePreferencesStore.getState().settings.language).toBe(lang);
      });
    });
  });

  describe('setNotifications', () => {
    it('should update notification preferences', () => {
      usePreferencesStore.getState().setNotifications({ sound: false });
      expect(usePreferencesStore.getState().settings.notifications.sound).toBe(false);
    });

    it('should merge with existing preferences', () => {
      const initial = usePreferencesStore.getState().settings.notifications;
      usePreferencesStore.getState().setNotifications({
        email: true,
        push: false,
      });
      const updated = usePreferencesStore.getState().settings.notifications;
      expect(updated.email).toBe(true);
      expect(updated.push).toBe(false);
      expect(updated.sound).toBe(initial.sound); // unchanged
    });
  });

  describe('resetSettings', () => {
    it('should reset to default settings', () => {
      usePreferencesStore.getState().setTheme('dark');
      usePreferencesStore.getState().setLanguage('en');
      usePreferencesStore.getState().resetSettings();

      const settings = usePreferencesStore.getState().settings;
      expect(settings.theme).toBe('system');
      expect(settings.language).toBe('zh');
    });
  });

  describe('syncThemeToDOM', () => {
    it('should not throw errors', () => {
      expect(() => {
        usePreferencesStore.getState().syncThemeToDOM();
      }).not.toThrow();
    });
  });

  describe('selector hooks', () => {
    it('useSettings should return current settings', () => {
      const settings = usePreferencesStore.getState().settings;
      expect(settings).toBeDefined();
      expect(settings.theme).toBeDefined();
      expect(settings.language).toBeDefined();
      expect(settings.notifications).toBeDefined();
    });
  });
});
