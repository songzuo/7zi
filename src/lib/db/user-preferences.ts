/**
 * User Preferences Database Module
 * Manages user preferences including language, theme, and notification settings
 */

import { getDatabaseAsync } from './connection';
import { logger } from '../logger';

/**
 * User preferences interface
 */
export interface UserPreferences {
  user_id: string;
  locale: string;
  theme: 'light' | 'dark' | 'system';
  timezone?: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  sound_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Database row interface for user preferences
 */
interface UserPreferencesRow {
  user_id: string;
  locale: string;
  theme: string;
  timezone: string | null;
  notifications_enabled: number;
  email_notifications: number;
  sound_enabled: number;
  created_at: string;
  updated_at: string;
}

/**
 * Initialize user preferences table
 */
export async function initializeUserPreferencesTable(): Promise<void> {
  try {
    const db = await getDatabaseAsync();

    db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        locale TEXT NOT NULL DEFAULT 'zh',
        theme TEXT NOT NULL DEFAULT 'system' CHECK(theme IN ('light', 'dark', 'system')),
        timezone TEXT,
        notifications_enabled INTEGER NOT NULL DEFAULT 1,
        email_notifications INTEGER NOT NULL DEFAULT 1,
        sound_enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Create indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_user_preferences_locale ON user_preferences(locale);
      CREATE INDEX IF NOT EXISTS idx_user_preferences_theme ON user_preferences(theme);
    `);

    logger.info('User preferences table initialized', { category: 'db' });
  } catch (error) {
    logger.error('Failed to initialize user preferences table', { category: 'db', error });
    throw error;
  }
}

/**
 * Get user preferences by user ID
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    const db = await getDatabaseAsync();
    const result = db.query(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [userId]
    ) as unknown as UserPreferencesRow[];

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      user_id: row.user_id,
      locale: row.locale,
      theme: row.theme as 'light' | 'dark' | 'system',
      timezone: row.timezone || undefined,
      notifications_enabled: Boolean(row.notifications_enabled),
      email_notifications: Boolean(row.email_notifications),
      sound_enabled: Boolean(row.sound_enabled),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  } catch (error) {
    logger.error('Failed to get user preferences', { category: 'db', error, userId });
    throw error;
  }
}

/**
 * Create user preferences for a new user
 */
export async function createUserPreferences(
  userId: string,
  preferences: Partial<Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>> = {}
): Promise<UserPreferences> {
  try {
    const db = await getDatabaseAsync();

    const now = new Date().toISOString();
    const defaultPreferences = {
      locale: 'zh',
      theme: 'system' as const,
      notifications_enabled: true,
      email_notifications: true,
      sound_enabled: true,
      ...preferences,
    };

    db.exec(
      `INSERT INTO user_preferences (
        user_id, locale, theme, timezone,
        notifications_enabled, email_notifications, sound_enabled,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        defaultPreferences.locale,
        defaultPreferences.theme,
        defaultPreferences.timezone || null,
        defaultPreferences.notifications_enabled ? 1 : 0,
        defaultPreferences.email_notifications ? 1 : 0,
        defaultPreferences.sound_enabled ? 1 : 0,
        now,
        now,
      ]
    );

    logger.info('User preferences created', { category: 'db', userId });

    return {
      user_id: userId,
      ...defaultPreferences,
      created_at: now,
      updated_at: now,
    };
  } catch (error) {
    logger.error('Failed to create user preferences', { category: 'db', error, userId });
    throw error;
  }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  updates: Partial<Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserPreferences> {
  try {
    const db = await getDatabaseAsync();

    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.locale !== undefined) {
      fields.push('locale = ?');
      values.push(updates.locale);
    }
    if (updates.theme !== undefined) {
      fields.push('theme = ?');
      values.push(updates.theme);
    }
    if (updates.timezone !== undefined) {
      fields.push('timezone = ?');
      values.push(updates.timezone);
    }
    if (updates.notifications_enabled !== undefined) {
      fields.push('notifications_enabled = ?');
      values.push(updates.notifications_enabled ? 1 : 0);
    }
    if (updates.email_notifications !== undefined) {
      fields.push('email_notifications = ?');
      values.push(updates.email_notifications ? 1 : 0);
    }
    if (updates.sound_enabled !== undefined) {
      fields.push('sound_enabled = ?');
      values.push(updates.sound_enabled ? 1 : 0);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(userId);

    db.exec(
      `UPDATE user_preferences SET ${fields.join(', ')} WHERE user_id = ?`,
      values
    );

    logger.info('User preferences updated', { category: 'db', userId, updates });

    const updated = await getUserPreferences(userId);
    if (!updated) {
      throw new Error('Failed to retrieve updated preferences');
    }
    return updated;
  } catch (error) {
    logger.error('Failed to update user preferences', { category: 'db', error, userId, updates });
    throw error;
  }
}

/**
 * Update user language preference
 */
export async function updateUserLocale(userId: string, locale: string): Promise<void> {
  await updateUserPreferences(userId, { locale });
}

/**
 * Get or create user preferences
 */
export async function getOrCreateUserPreferences(
  userId: string,
  defaultLocale: string = 'zh'
): Promise<UserPreferences> {
  let preferences = await getUserPreferences(userId);

  if (!preferences) {
    preferences = await createUserPreferences(userId, {
      locale: defaultLocale,
    });
  }

  return preferences;
}

/**
 * Delete user preferences
 */
export async function deleteUserPreferences(userId: string): Promise<void> {
  try {
    const db = await getDatabaseAsync();
    db.exec('DELETE FROM user_preferences WHERE user_id = ?', [userId]);

    logger.info('User preferences deleted', { category: 'db', userId });
  } catch (error) {
    logger.error('Failed to delete user preferences', { category: 'db', error, userId });
    throw error;
  }
}
