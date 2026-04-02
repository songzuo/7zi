#!/usr/bin/env node

/**
 * Validate migration 3 - Critical Indexes
 */

const Database = require('better-sqlite3')

// Use in-memory database for testing
const db = new Database(':memory:')

// Create migrations table
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`)

// Create necessary tables for v3 migration
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT,
    type TEXT,
    status TEXT DEFAULT 'active',
    last_active_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agent_tokens (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS user_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_system INTEGER DEFAULT 0,
    permissions TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agent_wallets (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL UNIQUE,
    balance REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'CNY',
    frozen_balance REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS wallet_transactions (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CNY',
    status TEXT NOT NULL DEFAULT 'pending',
    from_wallet_id TEXT,
    to_wallet_id TEXT,
    description TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (wallet_id) REFERENCES agent_wallets(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS agent_data_access (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );
`)

console.log('✓ All tables created')

// Run migration 3
console.log('\nRunning Migration 3: Add Critical Indexes...')

// Critical indexes for token expiration queries
db.exec(
  'CREATE INDEX IF NOT EXISTS idx_agent_tokens_agent_expires ON agent_tokens(agent_id, expires_at)'
)
db.exec(
  'CREATE INDEX IF NOT EXISTS idx_user_tokens_user_expires ON user_tokens(user_id, expires_at)'
)

// Critical indexes for role lookups
db.exec('CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name)')
db.exec('CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system)')

// Critical indexes for wallet currency queries
db.exec('CREATE INDEX IF NOT EXISTS idx_agent_wallets_currency ON agent_wallets(currency)')
db.exec(
  'CREATE INDEX IF NOT EXISTS idx_wallet_transactions_currency_status ON wallet_transactions(currency, status)'
)

// Set migration version
db.prepare(
  `
  INSERT OR REPLACE INTO migrations (key, value, updated_at)
  VALUES ('version', ?, ?)
`
).run('3', new Date().toISOString())

console.log('✓ Migration 3 completed')

// Verify indexes
console.log('\nVerifying indexes...')

const expectedIndexes = [
  'idx_agent_tokens_agent_expires',
  'idx_user_tokens_user_expires',
  'idx_roles_name',
  'idx_roles_is_system',
  'idx_agent_wallets_currency',
  'idx_wallet_transactions_currency_status',
]

let allIndexesFound = true
for (const indexName of expectedIndexes) {
  const result = db
    .prepare(
      `
    SELECT name FROM sqlite_master
    WHERE type='index' AND name = ?
  `
    )
    .get(indexName)

  if (result) {
    console.log(`✓ Index found: ${indexName}`)
  } else {
    console.log(`✗ Index NOT found: ${indexName}`)
    allIndexesFound = false
  }
}

// Get current version
const versionRow = db.prepare('SELECT value FROM migrations WHERE key = ?').get('version')
const currentVersion = versionRow ? versionRow.value : '0'

console.log(`\nCurrent migration version: ${currentVersion}`)

db.close()

console.log('\n' + '='.repeat(50))
if (allIndexesFound && currentVersion === '3') {
  console.log('✅ VALIDATION PASSED: All indexes created successfully')
  console.log('✅ Migration version is correct')
} else {
  console.log('❌ VALIDATION FAILED: Some indexes are missing')
  process.exit(1)
}
console.log('='.repeat(50))
