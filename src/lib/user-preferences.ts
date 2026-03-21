/**
 * User Preferences Client Hook
 * Manages user preferences including language, theme, and notifications
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import type { Locale } from '@/i18n/config';
import { logger } from '@/lib/logger';

export interface UserPreferences {
  locale: string;
  theme: 'light' | 'dark' | 'system';
  notifications_enabled: boolean;
  email_notifications: boolean;
  sound_enabled: boolean;
}

const STORAGE_KEY = '7zi-user-preferences';
const USER_ID_KEY = '7zi-user-id';

/**
 * Get or generate user ID
 */
function getUserId(): string {
  if (typeof window === 'undefined') return 'guest';

  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

/**
 * Load preferences from localStorage
 */
function loadPreferencesFromStorage(): UserPreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Failed to load preferences from storage', { error });
    return null;
  }
}

/**
 * Save preferences to localStorage
 */
function savePreferencesToStorage(preferences: UserPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    logger.error('Failed to save preferences to storage', { error });
  }
}

/**
 * Sync preferences to server
 */
async function syncPreferencesToServer(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  try {
    await fetch('/api/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...preferences }),
    });

    logger.info('Preferences synced to server', { userId, preferences });
  } catch (error) {
    logger.error('Failed to sync preferences to server', { error });
    // Continue silently - don't break the app if server sync fails
  }
}

/**
 * Load preferences from server
 */
async function loadPreferencesFromServer(userId: string): Promise<UserPreferences | null> {
  try {
    const response = await fetch(`/api/user/preferences?user_id=${userId}`);
    const result = await response.json();

    if (result.success && result.data) {
      return {
        locale: result.data.locale,
        theme: result.data.theme,
        notifications_enabled: result.data.notifications_enabled,
        email_notifications: result.data.email_notifications,
        sound_enabled: result.data.sound_enabled,
      };
    }

    return null;
  } catch (error) {
    logger.error('Failed to load preferences from server', { error });
    return null;
  }
}

export interface UseUserPreferencesReturn {
  preferences: UserPreferences;
  isLoading: boolean;
  updateLocale: (locale: Locale) => Promise<void>;
  updateTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  updateNotifications: (enabled: boolean) => Promise<void>;
  updateEmailNotifications: (enabled: boolean) => Promise<void>;
  updateSoundEnabled: (enabled: boolean) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

/**
 * Hook to manage user preferences
 */
export function useUserPreferences(): UseUserPreferencesReturn {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as Locale;

  const [preferences, setPreferences] = useState<UserPreferences>({
    locale: currentLocale,
    theme: 'system',
    notifications_enabled: true,
    email_notifications: true,
    sound_enabled: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const stored = loadPreferencesFromStorage();
    if (stored) {
      setPreferences(stored);
    }
  }, []);

  // Update locale preference
  const updateLocale = useCallback(async (locale: Locale) => {
    setIsLoading(true);

    try {
      const newPreferences = { ...preferences, locale };
      setPreferences(newPreferences);
      savePreferencesToStorage(newPreferences);

      // Sync to server
      const userId = getUserId();
      await syncPreferencesToServer(userId, { locale });

      // Navigate to new locale
      router.replace(pathname, { locale });

      logger.info('Locale updated', { locale });
    } catch (error) {
      logger.error('Failed to update locale', { error });
    } finally {
      setIsLoading(false);
    }
  }, [preferences, pathname, router]);

  // Update theme preference
  const updateTheme = useCallback(async (theme: 'light' | 'dark' | 'system') => {
    setIsLoading(true);

    try {
      const newPreferences = { ...preferences, theme };
      setPreferences(newPreferences);
      savePreferencesToStorage(newPreferences);

      // Sync to server
      const userId = getUserId();
      await syncPreferencesToServer(userId, { theme });

      logger.info('Theme updated', { theme });
    } catch (error) {
      logger.error('Failed to update theme', { error });
    } finally {
      setIsLoading(false);
    }
  }, [preferences]);

  // Update notifications preference
  const updateNotifications = useCallback(async (enabled: boolean) => {
    setIsLoading(true);

    try {
      const newPreferences = { ...preferences, notifications_enabled: enabled };
      setPreferences(newPreferences);
      savePreferencesToStorage(newPreferences);

      // Sync to server
      const userId = getUserId();
      await syncPreferencesToServer(userId, { notifications_enabled: enabled });

      logger.info('Notifications updated', { enabled });
    } catch (error) {
      logger.error('Failed to update notifications', { error });
    } finally {
      setIsLoading(false);
    }
  }, [preferences]);

  // Update email notifications preference
  const updateEmailNotifications = useCallback(async (enabled: boolean) => {
    setIsLoading(true);

    try {
      const newPreferences = { ...preferences, email_notifications: enabled };
      setPreferences(newPreferences);
      savePreferencesToStorage(newPreferences);

      // Sync to server
      const userId = getUserId();
      await syncPreferencesToServer(userId, { email_notifications: enabled });

      logger.info('Email notifications updated', { enabled });
    } catch (error) {
      logger.error('Failed to update email notifications', { error });
    } finally {
      setIsLoading(false);
    }
  }, [preferences]);

  // Update sound enabled preference
  const updateSoundEnabled = useCallback(async (enabled: boolean) => {
    setIsLoading(true);

    try {
      const newPreferences = { ...preferences, sound_enabled: enabled };
      setPreferences(newPreferences);
      savePreferencesToStorage(newPreferences);

      // Sync to server
      const userId = getUserId();
      await syncPreferencesToServer(userId, { sound_enabled: enabled });

      logger.info('Sound enabled updated', { enabled });
    } catch (error) {
      logger.error('Failed to update sound enabled', { error });
    } finally {
      setIsLoading(false);
    }
  }, [preferences]);

  // Refresh preferences from server/storage
  const refreshPreferences = useCallback(async () => {
    setIsLoading(true);

    try {
      const userId = getUserId();

      // Try to load from server first
      const serverPreferences = await loadPreferencesFromServer(userId);

      if (serverPreferences) {
        setPreferences(serverPreferences);
        // Update localStorage with server data
        savePreferencesToStorage(serverPreferences);
      } else {
        // Fall back to localStorage
        const stored = loadPreferencesFromStorage();
        if (stored) {
          setPreferences(stored);
        }
      }

      logger.info('Preferences refreshed', { userId });
    } catch (error) {
      logger.error('Failed to refresh preferences', { error });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    preferences,
    isLoading,
    updateLocale,
    updateTheme,
    updateNotifications,
    updateEmailNotifications,
    updateSoundEnabled,
    refreshPreferences,
  };
}
