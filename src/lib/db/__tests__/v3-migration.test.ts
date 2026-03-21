/**
 * Test v3 migration - Add critical indexes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { migrate, getCurrentVersion } from '../migrations';
import { getDatabaseAsync } from '../index';

describe('v3 Migration - Critical Indexes', () => {
  beforeEach(async () => {
    // Use in-memory database for tests
    process.env.DATABASE_PATH = ':memory:';
  });

  afterEach(async () => {
    // Clean up environment
    delete process.env.DATABASE_PATH;
  });

  describe('v3 migration execution', () => {
    it('should run v3 migration and create all critical indexes', async () => {
      const db = await getDatabaseAsync();

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
          agent_id TEXT NOT NULL,
          currency TEXT NOT NULL,
          balance REAL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS wallet_transactions (
          id TEXT PRIMARY KEY,
          wallet_id TEXT NOT NULL,
          type TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          amount REAL NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (wallet_id) REFERENCES agent_wallets(id)
        );

        CREATE TABLE IF NOT EXISTS agent_data_access (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id TEXT NOT NULL,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );
      `);

      // Insert test data
      db.prepare(`INSERT INTO agents (id, name, provider, type, status, last_active_at) VALUES (?, ?, ?, ?, ?, ?)`)
        .run('agent-1', 'Test Agent', 'openai', 'assistant', 'active', new Date().toISOString());

      db.prepare(`INSERT INTO agent_tokens (id, agent_id, token, expires_at) VALUES (?, ?, ?, ?)`)
        .run('token-1', 'agent-1', 'test-token-1', new Date(Date.now() + 86400000).toISOString());

      db.prepare(`INSERT INTO user_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`)
        .run('user-token-1', 'user-1', 'user-token', new Date(Date.now() + 86400000).toISOString());

      db.prepare(`INSERT INTO roles (id, name, is_system) VALUES (?, ?, ?)`)
        .run('role-1', 'admin', 1);

      db.prepare(`INSERT INTO agent_wallets (id, agent_id, currency, balance) VALUES (?, ?, ?, ?)`)
        .run('wallet-1', 'agent-1', 'USD', 100.0);

      // Run migrations
      await migrate();

      const version = await getCurrentVersion();
      expect(version).toBe(3);
    });

    it('should create all v3 critical indexes', async () => {
      const db = await getDatabaseAsync();

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
          agent_id TEXT NOT NULL,
          currency TEXT NOT NULL,
          balance REAL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS wallet_transactions (
          id TEXT PRIMARY KEY,
          wallet_id TEXT NOT NULL,
          type TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          amount REAL NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (wallet_id) REFERENCES agent_wallets(id)
        );

        CREATE TABLE IF NOT EXISTS agent_data_access (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id TEXT NOT NULL,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );
      `);

      // Run migrations
      await migrate();

      const expectedIndexes = [
        'idx_agent_tokens_agent_expires',
        'idx_user_tokens_user_expires',
        'idx_roles_name',
        'idx_roles_is_system',
        'idx_agent_wallets_currency',
      ];

      for (const indexName of expectedIndexes) {
        const result = db.prepare(`
          SELECT name FROM sqlite_master
          WHERE type='index' AND name = ?
        `).get(indexName);

        expect(result).toBeDefined();
      }
    });

    it('should preserve v2 indexes after v3 migration', async () => {
      const db = await getDatabaseAsync();

      // Create necessary tables
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
          agent_id TEXT NOT NULL,
          currency TEXT NOT NULL,
          balance REAL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS wallet_transactions (
          id TEXT PRIMARY KEY,
          wallet_id TEXT NOT NULL,
          type TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          amount REAL NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (wallet_id) REFERENCES agent_wallets(id)
        );

        CREATE TABLE IF NOT EXISTS agent_data_access (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id TEXT NOT NULL,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );
      `);

      // Run migrations
      await migrate();

      const v2Indexes = [
        'idx_agents_status_provider',
        'idx_agents_status_type',
        'idx_agents_last_active',
        'idx_agent_tokens_expires',
        'idx_agent_data_access_agent_timestamp',
        'idx_agent_data_access_resource',
        'idx_wallet_transactions_wallet_status',
        'idx_wallet_transactions_wallet_created',
        'idx_wallet_transactions_type_status',
      ];

      for (const indexName of v2Indexes) {
        const result = db.prepare(`
          SELECT name FROM sqlite_master
          WHERE type='index' AND name = ?
        `).get(indexName);

        expect(result).toBeDefined();
      }
    });
  });
});
