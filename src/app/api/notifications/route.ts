/**
 * Notifications API Route
 * Handles CRUD operations for notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NotificationFilters,
  NotificationListResponse,
  NotificationStats,
  CreateNotificationDto,
  UpdateNotificationDto,
} from '@/types/notifications';
import { getDatabase } from '@/lib/db';

// ============================================================================
// Database Initialization
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

    CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
    ON notifications(user_id);
    
    CREATE INDEX IF NOT EXISTS idx_notifications_user_status 
    ON notifications(user_id, status);
    
    CREATE INDEX IF NOT EXISTS idx_notifications_type 
    ON notifications(type);
    
    CREATE INDEX IF NOT EXISTS idx_notifications_priority 
    ON notifications(priority);
    
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
    ON notifications(created_at DESC);
  `;

  db.exec(createTableSQL);
}

// ============================================================================
// Helper Functions
// ============================================================================

function rowToNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    type: row.type as NotificationType,
    title: row.title as string,
    content: row.content as string,
    priority: row.priority as NotificationPriority,
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

function buildFiltersQuery(filters: NotificationFilters): {
  whereClause: string;
  params: unknown[];
} {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.user_id) {
    conditions.push('user_id = ?');
    params.push(filters.user_id);
  }

  if (filters.type) {
    if (Array.isArray(filters.type)) {
      conditions.push(`type IN (${filters.type.map(() => '?').join(', ')})`);
      params.push(...filters.type);
    } else {
      conditions.push('type = ?');
      params.push(filters.type);
    }
  }

  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }

  if (filters.priority) {
    conditions.push('priority = ?');
    params.push(filters.priority);
  }

  if (filters.group_id) {
    conditions.push('group_id = ?');
    params.push(filters.group_id);
  }

  if (filters.related_id) {
    conditions.push('related_id = ?');
    params.push(filters.related_id);
  }

  if (filters.related_type) {
    conditions.push('related_type = ?');
    params.push(filters.related_type);
  }

  if (filters.start_date) {
    conditions.push('created_at >= ?');
    params.push(filters.start_date);
  }

  if (filters.end_date) {
    conditions.push('created_at <= ?');
    params.push(filters.end_date);
  }

  if (filters.search) {
    conditions.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

// ============================================================================
// GET /api/notifications
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    await initializeNotificationsTable();

    const { searchParams } = new URL(request.url);
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse filters
    const filters: NotificationFilters = {
      user_id: user.id,
      type: searchParams.get('type') as NotificationType | null,
      status: searchParams.get('status') as NotificationStatus | null,
      priority: searchParams.get('priority') as NotificationPriority | null,
      group_id: searchParams.get('group_id') || undefined,
      related_id: searchParams.get('related_id') || undefined,
      related_type: searchParams.get('related_type') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      search: searchParams.get('search') || undefined,
    };

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '20')));
    const offset = (page - 1) * perPage;

    const { whereClause, params } = buildFiltersQuery(filters);

    const db = getDatabase();

    // Get total count
    const countSQL = `SELECT COUNT(*) as total FROM notifications ${whereClause}`;
    const countResult = db.prepare(countSQL).get(...params) as { total: number };

    // Get unread count
    const unreadSQL = `SELECT COUNT(*) as unread FROM notifications ${whereClause} AND status = 'unread'`;
    const unreadResult = db.prepare(unreadSQL).get(...params) as { unread: number };

    // Get notifications
    const notificationsSQL = `
      SELECT * FROM notifications
      ${whereClause}
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END ASC,
        created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(notificationsSQL).all(...params, perPage, offset);

    const notifications: Notification[] = rows.map(rowToNotification);

    const response: NotificationListResponse = {
      notifications,
      meta: {
        total: countResult.total,
        unread_count: unreadResult.unread,
        page,
        per_page: perPage,
        total_pages: Math.ceil(countResult.total / perPage),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/notifications
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await initializeNotificationsTable();

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as CreateNotificationDto;

    // Validate required fields
    if (!body.user_id || !body.type || !body.title || !body.content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate notification type
    if (!Object.values(NotificationType).includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }

    // Validate priority
    if (body.priority && !Object.values(NotificationPriority).includes(body.priority)) {
      return NextResponse.json(
        { error: 'Invalid priority level' },
        { status: 400 }
      );
    }

    // Check if user can create notification for target user
    if (body.user_id !== user.id) {
      // For now, only allow creating notifications for yourself
      // In production, check permissions
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: body.user_id,
      type: body.type,
      title: body.title,
      content: body.content,
      priority: body.priority || NotificationPriority.NORMAL,
      status: NotificationStatus.UNREAD,
      group_id: body.group_id,
      related_id: body.related_id,
      related_type: body.related_type,
      metadata: body.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const db = getDatabase();

    const insertSQL = `
      INSERT INTO notifications (
        id, user_id, type, title, content, priority, status,
        group_id, related_id, related_type, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.prepare(insertSQL).run(
      notification.id,
      notification.user_id,
      notification.type,
      notification.title,
      notification.content,
      notification.priority,
      notification.status,
      notification.group_id || null,
      notification.related_id || null,
      notification.related_type || null,
      notification.metadata ? JSON.stringify(notification.metadata) : null,
      notification.created_at,
      notification.updated_at
    );

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
