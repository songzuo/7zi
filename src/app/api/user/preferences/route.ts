/**
 * API Route: User Preferences
 * Endpoint: /api/user/preferences
 * Methods: GET, POST, PUT
 *
 * This API endpoint manages user preferences including language, theme, and notification settings.
 */

import { initializeUserPreferencesTable, getUserPreferences, createUserPreferences, updateUserPreferences } from '@/lib/db/user-preferences';
import { logger } from '@/lib/logger';

// Initialize database table on first request
let dbInitialized = false;

async function ensureDatabaseInitialized() {
  if (!dbInitialized) {
    await initializeUserPreferencesTable();
    dbInitialized = true;
  }
}

/**
 * GET /api/user/preferences?user_id=xxx
 * Get user preferences
 */
export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    let preferences = await getUserPreferences(userId);

    // If preferences don't exist, return defaults
    if (!preferences) {
      preferences = {
        user_id: userId,
        locale: 'zh',
        theme: 'system',
        notifications_enabled: true,
        email_notifications: true,
        sound_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return NextResponse.json({ success: true, data: preferences });
  } catch (_error) {
    logger.error('Failed to get user preferences', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/preferences
 * Create user preferences
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();

    const body = await request.json();
    const { user_id, locale, theme, timezone, notifications_enabled, email_notifications, sound_enabled } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Check if preferences already exist
    const existing = await getUserPreferences(user_id);
    if (existing) {
      return NextResponse.json(
        { error: 'User preferences already exist. Use PUT to update.' },
        { status: 409 }
      );
    }

    const preferences = await createUserPreferences(user_id, {
      locale,
      theme,
      timezone,
      notifications_enabled,
      email_notifications,
      sound_enabled,
    });

    return NextResponse.json({ success: true, data: preferences }, { status: 201 });
  } catch (_error) {
    logger.error('Failed to create user preferences', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/preferences
 * Update user preferences
 */
export async function PUT(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();

    const body = await request.json();
    const { user_id, ...updates } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Check if preferences exist
    const existing = await getUserPreferences(user_id);
    if (!existing) {
      // If not exist, create new preferences
      const preferences = await createUserPreferences(user_id, updates);
      return NextResponse.json({ success: true, data: preferences }, { status: 201 });
    }

    // Update existing preferences
    const preferences = await updateUserPreferences(user_id, updates);

    return NextResponse.json({ success: true, data: preferences });
  } catch (_error) {
    logger.error('Failed to update user preferences', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
