/**
 * Notification Preferences Service
 * Manages user notification preferences for different channels and event types
 */

import { getDatabase } from '@/lib/db';

// ============================================================================
// Types
// ============================================================================

export type NotificationChannel = 'email' | 'push' | 'in_app' | 'sms';
export type NotificationEventType = 'agent_events' | 'wallet_events' | 'security_alerts' | 'marketing';

export interface NotificationPreference {
  id?: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  sms_enabled: boolean;
  agent_events_enabled: boolean;
  wallet_events_enabled: boolean;
  security_alerts_enabled: boolean;
  marketing_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export type NotificationPreferenceKey = keyof NotificationPreference;

export interface NotificationPreferencesMap {
  channels: Record<NotificationChannel, boolean>;
  events: Record<NotificationEventType, boolean>;
}

// ============================================================================
// Default Preferences
// ============================================================================

export const DEFAULT_PREFERENCES: Partial<NotificationPreference> = {
  email_enabled: true,
  push_enabled: true,
  in_app_enabled: true,
  sms_enabled: false,
  agent_events_enabled: true,
  wallet_events_enabled: true,
  security_alerts_enabled: true,
  marketing_enabled: false,
};

// ============================================================================
// Database Initialization
// ============================================================================

async function initializeTable(): Promise<void> {
  const db = getDatabase();

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      email_enabled INTEGER NOT NULL DEFAULT 1,
      push_enabled INTEGER NOT NULL DEFAULT 1,
      in_app_enabled INTEGER NOT NULL DEFAULT 1,
      sms_enabled INTEGER NOT NULL DEFAULT 0,
      agent_events_enabled INTEGER NOT NULL DEFAULT 1,
      wallet_events_enabled INTEGER NOT NULL DEFAULT 1,
      security_alerts_enabled INTEGER NOT NULL DEFAULT 1,
      marketing_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id 
    ON notification_preferences(user_id);
  `;

  db.exec(createTableSQL);
}

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Get user notification preferences
 */
export async function getUserPreferences(userId: string): Promise<NotificationPreference> {
  await initializeTable();

  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM notification_preferences
    WHERE user_id = ?
  `);

  const row = stmt.get(userId) as (NotificationPreference & Record<string, unknown>) | undefined;

  if (!row) {
    // Return default preferences if none exist
    return createDefaultPreferences(userId);
  }

  // Convert integer booleans to actual booleans
  return convertIntBooleans(row);
}

/**
 * Get user preferences as a map format (easier to use in frontend)
 */
export async function getUserPreferencesMap(userId: string): Promise<NotificationPreferencesMap> {
  const prefs = await getUserPreferences(userId);

  return {
    channels: {
      email: prefs.email_enabled,
      push: prefs.push_enabled,
      in_app: prefs.in_app_enabled,
      sms: prefs.sms_enabled,
    },
    events: {
      agent_events: prefs.agent_events_enabled,
      wallet_events: prefs.wallet_events_enabled,
      security_alerts: prefs.security_alerts_enabled,
      marketing: prefs.marketing_enabled,
    },
  };
}

/**
 * Create default preferences for a user
 */
function createDefaultPreferences(userId: string): NotificationPreference {
  return {
    id: `np_${userId}_${Date.now()}`,
    user_id: userId,
    email_enabled: DEFAULT_PREFERENCES.email_enabled ?? true,
    push_enabled: DEFAULT_PREFERENCES.push_enabled ?? true,
    in_app_enabled: DEFAULT_PREFERENCES.in_app_enabled ?? true,
    sms_enabled: DEFAULT_PREFERENCES.sms_enabled ?? false,
    agent_events_enabled: DEFAULT_PREFERENCES.agent_events_enabled ?? true,
    wallet_events_enabled: DEFAULT_PREFERENCES.wallet_events_enabled ?? true,
    security_alerts_enabled: DEFAULT_PREFERENCES.security_alerts_enabled ?? true,
    marketing_enabled: DEFAULT_PREFERENCES.marketing_enabled ?? false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Update user notification preferences
 */
export async function updateUserPreferences(
  userId: string,
  updates: Partial<NotificationPreference>
): Promise<NotificationPreference> {
  await initializeTable();

  const db = getDatabase();

  // Check if preferences exist
  const existing = await getUserPreferences(userId);

  // Merge updates with existing preferences
  const merged: NotificationPreference = {
    ...existing,
    ...updates,
    user_id: userId, // Ensure user_id can't be changed
    updated_at: new Date().toISOString(),
  };

  // Convert booleans to integers for SQLite
  const intRecord = convertBooleansToInt(merged);

  // Insert or update
  const upsertSQL = `
    INSERT INTO notification_preferences (
      id, user_id,
      email_enabled, push_enabled, in_app_enabled, sms_enabled,
      agent_events_enabled, wallet_events_enabled,
      security_alerts_enabled, marketing_enabled,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      email_enabled = excluded.email_enabled,
      push_enabled = excluded.push_enabled,
      in_app_enabled = excluded.in_app_enabled,
      sms_enabled = excluded.sms_enabled,
      agent_events_enabled = excluded.agent_events_enabled,
      wallet_events_enabled = excluded.wallet_events_enabled,
      security_alerts_enabled = excluded.security_alerts_enabled,
      marketing_enabled = excluded.marketing_enabled,
      updated_at = excluded.updated_at
  `;

  const stmt = db.prepare(upsertSQL);
  stmt.run(
    intRecord.id,
    intRecord.user_id,
    intRecord.email_enabled,
    intRecord.push_enabled,
    intRecord.in_app_enabled,
    intRecord.sms_enabled,
    intRecord.agent_events_enabled,
    intRecord.wallet_events_enabled,
    intRecord.security_alerts_enabled,
    intRecord.marketing_enabled,
    intRecord.created_at,
    intRecord.updated_at
  );

  return convertIntBooleans(merged);
}

/**
 * Update user preferences from map format
 */
export async function updateUserPreferencesFromMap(
  userId: string,
  preferencesMap: NotificationPreferencesMap
): Promise<NotificationPreference> {
  return updateUserPreferences(userId, {
    email_enabled: preferencesMap.channels.email,
    push_enabled: preferencesMap.channels.push,
    in_app_enabled: preferencesMap.channels.in_app,
    sms_enabled: preferencesMap.channels.sms,
    agent_events_enabled: preferencesMap.events.agent_events,
    wallet_events_enabled: preferencesMap.events.wallet_events,
    security_alerts_enabled: preferencesMap.events.security_alerts,
    marketing_enabled: preferencesMap.events.marketing,
  });
}

/**
 * Reset user preferences to defaults
 */
export async function resetUserPreferences(userId: string): Promise<NotificationPreference> {
  const defaults = createDefaultPreferences(userId);
  return updateUserPreferences(userId, defaults);
}

/**
 * Delete user preferences
 */
export async function deleteUserPreferences(userId: string): Promise<void> {
  await initializeTable();

  const db = getDatabase();

  const stmt = db.prepare(`
    DELETE FROM notification_preferences
    WHERE user_id = ?
  `);

  stmt.run(userId);
}

/**
 * Check if a notification should be sent for a given channel and event type
 */
export async function shouldSendNotification(
  userId: string,
  channel: NotificationChannel,
  eventType: NotificationEventType
): Promise<boolean> {
  try {
    const prefs = await getUserPreferences(userId);

    // Check if channel is enabled
    const channelEnabled = prefs[`${channel}_enabled` as NotificationPreferenceKey] as boolean;

    // Check if event type is enabled
    const eventEnabled = prefs[`${eventType}_enabled` as NotificationPreferenceKey] as boolean;

    return channelEnabled && eventEnabled;
  } catch (_error) {
    // If preferences don't exist, use defaults
    const defaults = DEFAULT_PREFERENCES;
    const channelEnabled = (defaults[`${channel}_enabled` as keyof typeof defaults] as boolean) ?? true;
    const eventEnabled = (defaults[`${eventType}_enabled` as keyof typeof defaults] as boolean) ?? true;
    return channelEnabled && eventEnabled;
  }
}

/**
 * Get all users who have enabled notifications for a specific channel and event type
 */
export async function getUsersWithNotificationEnabled(
  channel: NotificationChannel,
  eventType: NotificationEventType
): Promise<string[]> {
  await initializeTable();

  const db = getDatabase();

  const channelColumn = `${channel}_enabled`;
  const eventColumn = `${eventType}_enabled`;

  const stmt = db.prepare(`
    SELECT user_id FROM notification_preferences
    WHERE ${channelColumn} = 1
    AND ${eventColumn} = 1
  `);

  const rows = stmt.all() as Array<{ user_id: string }>;
  return rows.map((row) => row.user_id);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert integer booleans from SQLite to actual booleans
 */
function convertIntBooleans(record: NotificationPreference): NotificationPreference {
  return {
    ...record,
    email_enabled: Boolean(record.email_enabled),
    push_enabled: Boolean(record.push_enabled),
    in_app_enabled: Boolean(record.in_app_enabled),
    sms_enabled: Boolean(record.sms_enabled),
    agent_events_enabled: Boolean(record.agent_events_enabled),
    wallet_events_enabled: Boolean(record.wallet_events_enabled),
    security_alerts_enabled: Boolean(record.security_alerts_enabled),
    marketing_enabled: Boolean(record.marketing_enabled),
  };
}

/**
 * Convert booleans to integers for SQLite storage
 * Returns a version of the record where boolean fields are converted to 0/1 integers
 */
function convertBooleansToInt(record: NotificationPreference): Record<string, unknown> {
  return {
    ...record,
    email_enabled: record.email_enabled ? 1 : 0,
    push_enabled: record.push_enabled ? 1 : 0,
    in_app_enabled: record.in_app_enabled ? 1 : 0,
    sms_enabled: record.sms_enabled ? 1 : 0,
    agent_events_enabled: record.agent_events_enabled ? 1 : 0,
    wallet_events_enabled: record.wallet_events_enabled ? 1 : 0,
    security_alerts_enabled: record.security_alerts_enabled ? 1 : 0,
    marketing_enabled: record.marketing_enabled ? 1 : 0,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  getUserPreferences,
  getUserPreferencesMap,
  updateUserPreferences,
  updateUserPreferencesFromMap,
  resetUserPreferences,
  deleteUserPreferences,
  shouldSendNotification,
  getUsersWithNotificationEnabled,
  DEFAULT_PREFERENCES,
};
