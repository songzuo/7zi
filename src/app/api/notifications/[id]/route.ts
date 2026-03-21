/**
 * Individual Notification API Route
 * Handles operations on a specific notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  Notification,
  NotificationStatus,
  NotificationStats,
} from '@/types/notifications';
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

function rowToNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    type: row.type as string,
    title: row.title as string,
    content: row.content as string,
    priority: row.priority as string,
    status: row.status as NotificationStatus,
    group_id: row.group_id as string | undefined,
    related_id: row.related_id as string | undefined,
    related_type: row.related_type as string | undefined,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    read_at: row.read_at as string | undefined,
  };
}

// ============================================================================
// GET /api/notifications/[id]
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initializeNotificationsTable();

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = params.id;

    const db = getDatabase();

    const row = db.prepare(`
      SELECT * FROM notifications
      WHERE id = ? AND user_id = ?
    `).get(notificationId, user.id) as Record<string, unknown> | undefined;

    if (!row) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const notification = rowToNotification(row);

    return NextResponse.json(notification);
  } catch (error) {
    console.error('[API] Error fetching notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/notifications/[id]
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initializeNotificationsTable();

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = params.id;
    const body = await request.json();

    const db = getDatabase();

    // Check if notification exists and belongs to user
    const existing = db.prepare(`
      SELECT * FROM notifications
      WHERE id = ? AND user_id = ?
    `).get(notificationId, user.id) as Record<string, unknown> | undefined;

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Build update query
    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.title !== undefined) {
      updates.push('title = ?');
      values.push(body.title);
    }

    if (body.content !== undefined) {
      updates.push('content = ?');
      values.push(body.content);
    }

    if (body.status !== undefined) {
      updates.push('status = ?');
      values.push(body.status);

      // Update read_at if marking as read
      if (body.status === 'read') {
        updates.push('read_at = ?');
        values.push(new Date().toISOString());
      } else if (body.status === 'unread') {
        updates.push('read_at = NULL');
      }
    }

    if (body.metadata !== undefined) {
      updates.push('metadata = ?');
      values.push(JSON.stringify(body.metadata));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(notificationId);
    values.push(user.id);

    const updateSQL = `
      UPDATE notifications
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `;

    db.prepare(updateSQL).run(...values);

    // Fetch updated notification
    const row = db.prepare(`
      SELECT * FROM notifications
      WHERE id = ?
    `).get(notificationId) as Record<string, unknown>;

    const notification = rowToNotification(row);

    return NextResponse.json(notification);
  } catch (error) {
    console.error('[API] Error updating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/notifications/[id]
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initializeNotificationsTable();

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = params.id;

    const db = getDatabase();

    // Check if notification exists and belongs to user
    const existing = db.prepare(`
      SELECT * FROM notifications
      WHERE id = ? AND user_id = ?
    `).get(notificationId, user.id);

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Delete notification
    db.prepare(`
      DELETE FROM notifications
      WHERE id = ? AND user_id = ?
    `).run(notificationId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
