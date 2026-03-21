/**
 * Database schema for notifications
 *
 * Creates tables for storing notifications and user preferences
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { logger } from '@/lib/logger';

/**
 * Notification storage class
 */
export class NotificationStorage {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || join(process.cwd(), 'data', 'notifications.db');
  }

  /**
   * Initialize database connection and create tables
   */
  initialize(): void {
    try {
      // Ensure data directory exists
      const fs = require('fs');
      const dir = require('path').dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.db = new Database(this.dbPath);

      // Enable WAL mode for better performance
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      this.createTables();

      logger.info('[NotificationStorage] Database initialized at', { dbPath: this.dbPath });
    } catch (error) {
      logger.error('[NotificationStorage] Failed to initialize database', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private createTables(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Notifications table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        user_id TEXT,
        team_id TEXT,
        task_id TEXT,
        read INTEGER DEFAULT 0,
        email_sent INTEGER DEFAULT 0,
        email_sent_at INTEGER,
        created_at INTEGER NOT NULL,
        expires_at INTEGER
      )
    `);

    // Create indexes for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_team_id ON notifications(team_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON notifications(task_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
    `);

    // User notification preferences table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_notification_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL UNIQUE,
        email_enabled INTEGER DEFAULT 1,
        email_threshold TEXT DEFAULT 'high',
        push_enabled INTEGER DEFAULT 1,
        push_threshold TEXT DEFAULT 'medium',
        digest_enabled INTEGER DEFAULT 0,
        digest_frequency TEXT DEFAULT 'daily',
        quiet_hours_start TEXT,
        quiet_hours_end TEXT,
        timezone TEXT DEFAULT 'UTC',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,

        INDEX idx_user (user_id)
      )
    `);

    // Notification delivery log table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notification_delivery_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notification_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        recipient TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        sent_at INTEGER NOT NULL,
        delivery_metadata TEXT,

        INDEX idx_notification (notification_id),
        INDEX idx_channel (channel),
        INDEX idx_status (status),
        FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
      )
    `);
  }

  /**
   * Insert a notification
   */
  insertNotification(notification: {
    id: string;
    type: string;
    priority: string;
    title: string;
    message: string;
    data?: string;
    userId?: string;
    teamId?: string;
    taskId?: string;
    expiresAt?: number;
  }): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      INSERT INTO notifications (
        id, type, priority, title, message, data,
        user_id, team_id, task_id, read,
        email_sent, email_sent_at, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, ?, ?)
    `);

    stmt.run(
      notification.id,
      notification.type,
      notification.priority,
      notification.title,
      notification.message,
      notification.data || null,
      notification.userId || null,
      notification.teamId || null,
      notification.taskId || null,
      Date.now(),
      notification.expiresAt || null
    );
  }

  /**
   * Get notifications with filters
   */
  getNotifications(filters?: {
    userId?: string;
    teamId?: string;
    taskId?: string;
    type?: string;
    priority?: string;
    read?: boolean;
    since?: number;
    limit?: number;
    offset?: number;
  }): Array<{
    id: string;
    type: string;
    priority: string;
    title: string;
    message: string;
    data: string | null;
    userId: string | null;
    teamId: string | null;
    taskId: string | null;
    read: number;
    emailSent: number;
    emailSentAt: number | null;
    createdAt: number;
    expiresAt: number | null;
  }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    let query = `
      SELECT
        id, type, priority, title, message, data,
        user_id as userId, team_id as teamId, task_id as taskId,
        read, email_sent as emailSent, email_sent_at as emailSentAt,
        created_at as createdAt, expires_at as expiresAt
      FROM notifications
      WHERE 1=1
    `;

    const params: unknown[] = [];

    if (filters?.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }

    if (filters?.teamId) {
      query += ' AND team_id = ?';
      params.push(filters.teamId);
    }

    if (filters?.taskId) {
      query += ' AND task_id = ?';
      params.push(filters.taskId);
    }

    if (filters?.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters?.priority) {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }

    if (filters?.read !== undefined) {
      query += ' AND read = ?';
      params.push(filters.read ? 1 : 0);
    }

    if (filters?.since) {
      query += ' AND created_at >= ?';
      params.push(filters.since);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = this.db.prepare(query);
    const results = stmt.all(...params);
    return results as Array<{
      id: string;
      type: string;
      priority: string;
      title: string;
      message: string;
      data: string | null;
      userId: string | null;
      teamId: string | null;
      taskId: string | null;
      read: number;
      emailSent: number;
      emailSentAt: number | null;
      createdAt: number;
      expiresAt: number | null;
    }>;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): boolean {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      UPDATE notifications
      SET read = 1
      WHERE id = ?
    `);

    const result = stmt.run(notificationId);
    return result.changes > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead(userId: string): number {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      UPDATE notifications
      SET read = 1
      WHERE user_id = ? AND read = 0
    `);

    const result = stmt.run(userId);
    return result.changes;
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): boolean {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      DELETE FROM notifications
      WHERE id = ?
    `);

    const result = stmt.run(notificationId);
    return result.changes > 0;
  }

  /**
   * Get unread count for a user
   */
  getUnreadCount(userId: string): number {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND read = 0
    `);

    const result = stmt.get(userId) as { count: number };
    return result.count;
  }

  /**
   * Mark notification as email sent
   */
  markEmailSent(notificationId: string, messageId?: string): boolean {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      UPDATE notifications
      SET email_sent = 1, email_sent_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(Date.now(), notificationId);

    // Log delivery
    if (messageId) {
      this.logDelivery({
        notificationId,
        channel: 'email',
        recipient: 'email',
        status: 'sent',
        sentAt: Date.now(),
        deliveryMetadata: JSON.stringify({ messageId }),
      });
    }

    return result.changes > 0;
  }

  /**
   * Get user notification preferences
   */
  getUserPreferences(userId: string): {
    emailEnabled: number;
    emailThreshold: string;
    pushEnabled: number;
    pushThreshold: string;
    digestEnabled: number;
    digestFrequency: string;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    timezone: string;
  } | null {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      SELECT
        email_enabled as emailEnabled,
        email_threshold as emailThreshold,
        push_enabled as pushEnabled,
        push_threshold as pushThreshold,
        digest_enabled as digestEnabled,
        digest_frequency as digestFrequency,
        quiet_hours_start as quietHoursStart,
        quiet_hours_end as quietHoursEnd,
        timezone
      FROM user_notification_preferences
      WHERE user_id = ?
    `);

    const result = stmt.get(userId);
    return result as {
      emailEnabled: number;
      emailThreshold: string;
      pushEnabled: number;
      pushThreshold: string;
      digestEnabled: number;
      digestFrequency: string;
      quietHoursStart: string | null;
      quietHoursEnd: string | null;
      timezone: string;
    } | null;
  }

  /**
   * Set user notification preferences
   */
  setUserPreferences(userId: string, preferences: {
    emailEnabled?: boolean;
    emailThreshold?: string;
    pushEnabled?: boolean;
    pushThreshold?: string;
    digestEnabled?: boolean;
    digestFrequency?: string;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone?: string;
  }): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      INSERT INTO user_notification_preferences (
        user_id, email_enabled, email_threshold,
        push_enabled, push_threshold,
        digest_enabled, digest_frequency,
        quiet_hours_start, quiet_hours_end,
        timezone, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        email_enabled = COALESCE(?, email_enabled),
        email_threshold = COALESCE(?, email_threshold),
        push_enabled = COALESCE(?, push_enabled),
        push_threshold = COALESCE(?, push_threshold),
        digest_enabled = COALESCE(?, digest_enabled),
        digest_frequency = COALESCE(?, digest_frequency),
        quiet_hours_start = COALESCE(?, quiet_hours_start),
        quiet_hours_end = COALESCE(?, quiet_hours_end),
        timezone = COALESCE(?, timezone),
        updated_at = ?
    `);

    const now = Date.now();

    stmt.run(
      userId,
      preferences.emailEnabled ?? 1,
      preferences.emailThreshold ?? 'high',
      preferences.pushEnabled ?? 1,
      preferences.pushThreshold ?? 'medium',
      preferences.digestEnabled ?? 0,
      preferences.digestFrequency ?? 'daily',
      preferences.quietHoursStart ?? null,
      preferences.quietHoursEnd ?? null,
      preferences.timezone ?? 'UTC',
      now,
      now,
      preferences.emailEnabled,
      preferences.emailThreshold,
      preferences.pushEnabled,
      preferences.pushThreshold,
      preferences.digestEnabled,
      preferences.digestFrequency,
      preferences.quietHoursStart,
      preferences.quietHoursEnd,
      preferences.timezone,
      now
    );
  }

  /**
   * Log notification delivery
   */
  logDelivery(log: {
    notificationId: string;
    channel: string;
    recipient: string;
    status: string;
    errorMessage?: string;
    sentAt: number;
    deliveryMetadata?: string;
  }): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      INSERT INTO notification_delivery_log (
        notification_id, channel, recipient, status,
        error_message, sent_at, delivery_metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      log.notificationId,
      log.channel,
      log.recipient,
      log.status,
      log.errorMessage || null,
      log.sentAt,
      log.deliveryMetadata || null
    );
  }

  /**
   * Clean up expired notifications
   */
  cleanupExpired(): number {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      DELETE FROM notifications
      WHERE expires_at IS NOT NULL AND expires_at < ?
    `);

    const result = stmt.run(Date.now());

    if (result.changes > 0) {
      logger.info(`[NotificationStorage] Cleaned up ${result.changes} expired notifications`);
    }

    return result.changes;
  }

  /**
   * Get database statistics
   */
  getStats(): {
    totalNotifications: number;
    unreadNotifications: number;
    totalUsers: number;
    totalDeliveries: number;
  } {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM notifications');
    const unreadStmt = this.db.prepare('SELECT COUNT(*) as count FROM notifications WHERE read = 0');
    const usersStmt = this.db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM notifications WHERE user_id IS NOT NULL');
    const deliveriesStmt = this.db.prepare('SELECT COUNT(*) as count FROM notification_delivery_log');

    return {
      totalNotifications: (totalStmt.get() as { count: number }).count,
      unreadNotifications: (unreadStmt.get() as { count: number }).count,
      totalUsers: (usersStmt.get() as { count: number }).count,
      totalDeliveries: (deliveriesStmt.get() as { count: number }).count,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info('[NotificationStorage] Database connection closed');
    }
  }
}

// Singleton instance
export const notificationStorage = new NotificationStorage();

