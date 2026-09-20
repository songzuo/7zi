/**
 * Trading Dashboard API - User Data Isolation
 * 6 Trading Systems: Binance, Polymarket, Hyperliquid, PancakeSwap, Uniswap, 中国A股
 */

import { NextRequest, NextResponse } from 'next/server'
import { verify } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import '@/lib/db/trading-schema'
import { fetchUSStockData } from '@/lib/trading/stockData'

// 6 Trading Systems Configuration
export const TRADING_SYSTEMS = [
  { 
    id: 'binance', 
    name: 'Binance', 
    markets: ['加密货币', '美股'], 
    icon: 'exchange',
    features: ['现货交易', '合约交易', '杠杆代币', 'Staking']
  },
  { 
    id: 'polymarket', 
    name: 'Polymarket', 
    markets: ['预测市场'], 
    icon: 'chart',
    features: ['事件预测', 'CLOB订单簿', 'AMM流动性']
  },
  { 
    id: 'hyperliquid', 
    name: 'Hyperliquid', 
    markets: ['加密货币'], 
    icon: 'lightning',
    features: ['做市商策略', '资金费率套利', 'perp交易', '零Gas费']
  },
  { 
    id: 'pancakeswap', 
    name: 'PancakeSwap', 
    markets: ['DeFi'], 
    icon: 'cake',
    features: ['Swap交换', '流动性挖矿', '预测市场', 'NFT市场']
  },
  { 
    id: 'uniswap', 
    name: 'Uniswap', 
    markets: ['DeFi'], 
    icon: 'unicorn',
    features: ['V3流动性池', 'Range订单', 'TWAP订单', 'Protocol费用']
  },
  { 
    id: 'china_a', 
    name: '中国A股', 
    markets: ['A股'], 
    icon: 'chart-bar',
    features: ['聚宽数据', 'QMT实盘', 'Alpha策略', '选股池']
  },
]

async function getUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null
  const result = await verify(token)
  return result.valid && result.payload ? result.payload.sub : null
}

/**
 * GET /api/trading/dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's enabled systems
    const settings = db.get<{ enabled_systems: string }>(
      'SELECT enabled_systems FROM trading_settings WHERE user_id = ?',
      [userId]
    )
    const enabledSystems: string[] = settings?.enabled_systems 
      ? JSON.parse(settings.enabled_systems) 
      : ['binance']

    // Query user-specific data only
    const positions = db.queryRows(
      'SELECT * FROM trading_positions WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    )

    const balances = db.queryRows(
      'SELECT * FROM trading_balances WHERE user_id = ? ORDER BY usd_value DESC',
      [userId]
    )

    const orders = db.queryRows(
      'SELECT * FROM trading_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    )

    // Get US stocks from Binance
    const usStocks = await fetchUSStockData()

    // Calculate totals
    const totalPnL = positions.reduce((sum: number, p: { pnl?: number }) => sum + (p.pnl || 0), 0)
    const totalBalance = balances.reduce((sum: number, b: { usd_value?: number }) => sum + (b.usd_value || 0), 0)

    // Filter systems based on user settings
    const userSystems = TRADING_SYSTEMS.filter(s => enabledSystems.includes(s.id))

    return NextResponse.json({
      userId,
      systems: userSystems,
      allSystems: TRADING_SYSTEMS,
      enabledSystems,
      positions,
      balances,
      orders,
      usStocks,
      summary: {
        totalPnL,
        totalBalance,
        positionsCount: positions.length,
        ordersCount: orders.length,
      },
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
