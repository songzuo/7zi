/**
 * Trading System Database Schema
 * Tables for user data isolation and trading systems
 */

import { db } from './index'

/**
 * Initialize trading system tables
 */
export function initTradingTables(): void {
  // Trading positions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS trading_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      exchange TEXT NOT NULL,
      quantity REAL DEFAULT 0,
      avg_price REAL DEFAULT 0,
      current_price REAL DEFAULT 0,
      pnl REAL DEFAULT 0,
      pnl_percent REAL DEFAULT 0,
      market_type TEXT DEFAULT 'crypto',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, symbol, exchange)
    )
  `)

  // Trading balances table
  db.exec(`
    CREATE TABLE IF NOT EXISTS trading_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      exchange TEXT NOT NULL,
      asset TEXT NOT NULL,
      balance REAL DEFAULT 0,
      available REAL DEFAULT 0,
      frozen REAL DEFAULT 0,
      usd_value REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, exchange, asset)
    )
  `)

  // Trading orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS trading_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      order_id TEXT UNIQUE,
      symbol TEXT NOT NULL,
      exchange TEXT NOT NULL,
      side TEXT NOT NULL,
      type TEXT NOT NULL,
      price REAL DEFAULT 0,
      quantity REAL DEFAULT 0,
      filled_quantity REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      market_type TEXT DEFAULT 'crypto',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // User trading settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS trading_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      enabled_systems TEXT DEFAULT '[]',
      binance_api_key TEXT,
      binance_api_secret TEXT,
      polymarket_api_key TEXT,
      hyperliquid_api_key TEXT,
      pancakeswap_wallet TEXT,
      china_a_account TEXT,
      notifications_enabled INTEGER DEFAULT 1,
      auto_sync INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create indexes for user data isolation
  db.exec(`CREATE INDEX IF NOT EXISTS idx_positions_user ON trading_positions(user_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_balances_user ON trading_balances(user_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_user ON trading_orders(user_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_settings_user ON trading_settings(user_id)`)
}

// Auto-initialize on import
try {
  initTradingTables()
} catch (error) {
  console.error('Failed to initialize trading tables:', error)
}

export default initTradingTables
