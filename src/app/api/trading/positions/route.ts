/**
 * Trading Positions API - User Data Isolation
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
 * GET /api/trading/positions - Get user's positions only
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Filter by user_id - critical for data isolation
    const positions = db.queryRows(
      'SELECT * FROM trading_positions WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    )

    return NextResponse.json({ positions, count: positions.length })
  } catch (error) {
    console.error('Positions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/trading/positions - Create new position
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { symbol, exchange, quantity, avg_price, market_type } = body

    if (!symbol || !exchange) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Insert with user_id for isolation
    const result = db.exec(
      `INSERT INTO trading_positions 
       (user_id, symbol, exchange, quantity, avg_price, current_price, pnl, market_type)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [userId, symbol, exchange, quantity || 0, avg_price || 0, avg_price || 0, market_type || 'crypto']
    )

    return NextResponse.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: 'Position created' 
    })
  } catch (error) {
    console.error('Positions POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/trading/positions - Update position
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Position ID required' }, { status: 400 })
    }

    // Verify ownership before update - critical for data isolation
    const existing = db.get(
      'SELECT user_id FROM trading_positions WHERE id = ?',
      [id]
    )

    if (!existing || existing.user_id !== userId) {
      return NextResponse.json({ error: 'Position not found or access denied' }, { status: 403 })
    }

    const fields = Object.keys(updates)
      .filter(k => k !== 'id' && k !== 'user_id')
      .map(k => `${k} = ?`)
      .join(', ')
    
    const values = Object.keys(updates)
      .filter(k => k !== 'id' && k !== 'user_id')
      .map(k => updates[k])

    if (fields) {
      db.exec(
        `UPDATE trading_positions SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, id]
      )
    }

    return NextResponse.json({ success: true, message: 'Position updated' })
  } catch (error) {
    console.error('Positions PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/trading/positions - Delete position
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Position ID required' }, { status: 400 })
    }

    // Verify ownership before delete - critical for data isolation
    const existing = db.get(
      'SELECT user_id FROM trading_positions WHERE id = ?',
      [id]
    )

    if (!existing || existing.user_id !== userId) {
      return NextResponse.json({ error: 'Position not found or access denied' }, { status: 403 })
    }

    db.exec('DELETE FROM trading_positions WHERE id = ?', [id])

    return NextResponse.json({ success: true, message: 'Position deleted' })
  } catch (error) {
    console.error('Positions DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
