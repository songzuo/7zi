/**
 * Notification Statistics API Route
 * Provides notification statistics for a user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { NotificationType, NotificationPriority, NotificationStats } from '@/types/notifications';
import { getDatabase } from '@/lib/db';

// ============================================================================
// Helper Functions
// ============================================================================

async function initializeNotificationsTable(): Promise<void> {
  const db = getDatabase();

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'unread',
      group_id TEXT,
      related_id TEXT,
      related_type TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      read_at TEXT
    );
  `;

  db.exec(createTableSQL);
}

// ============================================================================
// GET /api/notifications/stats
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    await initializeNotificationsTable();

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();

    // Get total count
    const totalResult = db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND status != 'archived'
    `).get(user.id) as { count: number };

    // Get unread count
    const unreadResult = db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND status = 'unread'
    `).get(user.id) as { count: number };

    // Get counts by type
    const typeRows = db.prepare(`
      SELECT type, COUNT(*) as count FROM notifications
      WHERE user_id = ? AND status != 'archived'
      GROUP BY type
    `).all(user.id) as Array<{ type: string; count: number }>;

    const byType: Partial<Record<NotificationType, number>> = {};
    typeRows.forEach((row) => {
      byType[row.type as NotificationType] = row.count;
    });

    // Initialize all types with 0
    Object.values(NotificationType).forEach((type) => {
      if (!(type in byType)) {
        byType[type] = 0;
      }
    });

    // Get counts by priority
    const priorityRows = db.prepare(`
      SELECT priority, COUNT(*) as count FROM notifications
      WHERE user_id = ? AND status != 'archived'
      GROUP BY priority
    `).all(user.id) as Array<{ priority: string; count: number }>;

    const byPriority: Partial<Record<NotificationPriority, number>> = {};
    priorityRows.forEach((row) => {
      byPriority[row.priority as NotificationPriority] = row.count;
    });

    // Initialize all priorities with 0
    Object.values(NotificationPriority).forEach((priority) => {
      if (!(priority in byPriority)) {
        byPriority[priority] = 0;
      }
    });

    const stats: NotificationStats = {
      total: totalResult.count,
      unread: unreadResult.count,
      by_type: byType as Record<NotificationType, number>,
      by_priority: byPriority as Record<NotificationPriority, number>,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[API] Error fetching notification stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
