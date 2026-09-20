/**
 * Trading Settings API - User Data Isolation
 */

import { NextRequest, NextResponse } from 'next/server'
import { verify } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import '@/lib/db/trading-schema'

async function getUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null
  const result = await verify(token)
  return result.valid && result.payload ? result.payload.sub : null
}

/**
 * GET /api/trading/settings - Get user's settings only
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = db.get(
      'SELECT * FROM trading_settings WHERE user_id = ?',
      [userId]
    )

    if (!settings) {
      // Return default settings for new user
      return NextResponse.json({
        user_id: userId,
        enabled_systems: ['binance'],
        notifications_enabled: true,
        auto_sync: true,
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Settings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/trading/settings - Update user's settings
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { enabled_systems, notifications_enabled, auto_sync } = body

    const existing = db.get(
      'SELECT id FROM trading_settings WHERE user_id = ?',
      [userId]
    )

    if (existing) {
      db.exec(
        `UPDATE trading_settings SET 
         enabled_systems = COALESCE(?, enabled_systems),
         notifications_enabled = COALESCE(?, notifications_enabled),
         auto_sync = COALESCE(?, auto_sync),
         updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [
          enabled_systems ? JSON.stringify(enabled_systems) : null,
          notifications_enabled,
          auto_sync,
          userId
        ]
      )
    } else {
      db.exec(
        `INSERT INTO trading_settings 
         (user_id, enabled_systems, notifications_enabled, auto_sync)
         VALUES (?, ?, ?, ?)`,
        [
          userId,
          JSON.stringify(enabled_systems || ['binance']),
          notifications_enabled ?? 1,
          auto_sync ?? 1
        ]
      )
    }

    return NextResponse.json({ success: true, message: 'Settings updated' })
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
