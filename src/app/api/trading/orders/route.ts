/**
 * Trading Orders API - User Data Isolation
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
 * GET /api/trading/orders - Get user's orders only
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const exchange = searchParams.get('exchange')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = 'SELECT * FROM trading_orders WHERE user_id = ?'
    const params: unknown[] = [userId]

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    if (exchange) {
      query += ' AND exchange = ?'
      params.push(exchange)
    }

    query += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit)

    const orders = db.queryRows(query, params)

    return NextResponse.json({ orders, count: orders.length })
  } catch (error) {
    console.error('Orders API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/trading/orders - Create new order
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { symbol, exchange, side, type, price, quantity, market_type } = body

    if (!symbol || !exchange || !side || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

    db.exec(
      `INSERT INTO trading_orders 
       (user_id, order_id, symbol, exchange, side, type, price, quantity, filled_quantity, status, market_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?)`,
      [userId, orderId, symbol, exchange, side, type, price || 0, quantity || 0, market_type || 'crypto']
    )

    return NextResponse.json({ success: true, orderId, message: 'Order created' })
  } catch (error) {
    console.error('Orders POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
