/**
 * Bulk Notification Actions API Route
 * Handles bulk operations on notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
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
// POST /api/notifications/bulk
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await initializeNotificationsTable();

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notification_ids, action } = body;

    if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
      return NextResponse.json(
        { error: 'notification_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!['mark_read', 'mark_unread', 'archive', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const placeholders = notification_ids.map(() => '?').join(',');
    const now = new Date().toISOString();

    let updateSQL = '';
    const params = [...notification_ids, user.id];

    switch (action) {
      case 'mark_read':
        updateSQL = `
          UPDATE notifications
          SET status = 'read',
              read_at = ?,
              updated_at = ?
          WHERE id IN (${placeholders}) AND user_id = ?
        `;
        params.unshift(now, now);
        break;

      case 'mark_unread':
        updateSQL = `
          UPDATE notifications
          SET status = 'unread',
              read_at = NULL,
              updated_at = ?
          WHERE id IN (${placeholders}) AND user_id = ?
        `;
        params.unshift(now);
        break;

      case 'archive':
        updateSQL = `
          UPDATE notifications
          SET status = 'archived',
              updated_at = ?
          WHERE id IN (${placeholders}) AND user_id = ?
        `;
        params.unshift(now);
        break;

      case 'delete':
        updateSQL = `
          DELETE FROM notifications
          WHERE id IN (${placeholders}) AND user_id = ?
        `;
        break;
    }

    const result = db.prepare(updateSQL).run(...params);

    return NextResponse.json({
      success: true,
      affected: result.changes,
      action,
    });
  } catch (error) {
    console.error('[API] Error in bulk notification action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
