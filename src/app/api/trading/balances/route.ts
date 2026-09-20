/**
 * Trading Balances API - User Data Isolation
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
 * GET /api/trading/balances - Get user's balances only
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Filter by user_id - critical for data isolation
    const balances = db.queryRows(
      'SELECT * FROM trading_balances WHERE user_id = ? ORDER BY usd_value DESC',
      [userId]
    )

    const total = balances.reduce((sum: number, b: { usd_value?: number }) => sum + (b.usd_value || 0), 0)

    return NextResponse.json({ 
      balances, 
      count: balances.length,
      totalUsdValue: total 
    })
  } catch (error) {
    console.error('Balances API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/trading/balances - Add or update balance
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { exchange, asset, balance, available, frozen, usd_value } = body

    if (!exchange || !asset) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Upsert with user_id for isolation
    const existing = db.get(
      'SELECT id FROM trading_balances WHERE user_id = ? AND exchange = ? AND asset = ?',
      [userId, exchange, asset]
    )

    if (existing) {
      db.exec(
        `UPDATE trading_balances SET 
         balance = COALESCE(?, balance),
         available = COALESCE(?, available),
         frozen = COALESCE(?, frozen),
         usd_value = COALESCE(?, usd_value),
         updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND exchange = ? AND asset = ?`,
        [balance, available, frozen, usd_value, userId, exchange, asset]
      )
    } else {
      db.exec(
        `INSERT INTO trading_balances 
         (user_id, exchange, asset, balance, available, frozen, usd_value)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, exchange, asset, balance || 0, available || balance || 0, frozen || 0, usd_value || 0]
      )
    }

    return NextResponse.json({ success: true, message: 'Balance updated' })
  } catch (error) {
    console.error('Balances POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
