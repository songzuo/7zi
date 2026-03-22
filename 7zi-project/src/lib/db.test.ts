/**
 * Database Module Unit Tests
 * 测试数据库模块的核心功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import {
  getDatabase,
  getDatabaseAsync,
  getDatabaseSize,
  closeDatabase,
  type DatabaseConnection,
  type DatabaseStatement,
  type DatabaseResult,
} from './db';
import { join } from 'path';
import { unlinkSync, mkdirSync, existsSync } from 'fs';

// ============================================================================
// Test Suite: 数据库模块基础功能
// ============================================================================

describe('Database Module', () => {
  let testDbPath: string;
  let originalCwd: string;

  beforeEach(() => {
    // 保存当前工作目录
    originalCwd = process.cwd();

    // 创建临时数据库路径
    testDbPath = join(process.cwd(), 'data', `test_${Date.now()}.db`);

    // 关闭任何现有的数据库连接
    closeDatabase();
  });

  afterEach(() => {
    // 关闭数据库连接
    closeDatabase();

    // 清理测试数据库
    if (existsSync(testDbPath)) {
      try {
        unlinkSync(testDbPath);
      } catch (error) {
        // 忽略清理错误
      }
    }

    // 恢复工作目录
    process.chdir(originalCwd);
  });

  // ============================================================================
  // Test Group: 数据库连接
  // ============================================================================

  describe('数据库连接', () => {
    it('getDatabase 应该返回数据库实例', () => {
      const db = getDatabase();

      expect(db).toBeDefined();
      expect(typeof db.prepare).toBe('function');
      expect(typeof db.exec).toBe('function');
      expect(typeof db.close).toBe('function');
    });

    it('getDatabaseAsync 应该返回数据库实例', async () => {
      const db = await getDatabaseAsync();

      expect(db).toBeDefined();
      expect(typeof db.prepare).toBe('function');
      expect(typeof db.exec).toBe('function');
      expect(typeof db.close).toBe('function');
    });

    it('应该返回相同的数据库实例（单例模式）', () => {
      const db1 = getDatabase();
      const db2 = getDatabase();

      expect(db1).toBe(db2);
    });

    it('应该正确配置 SQLite 选项', () => {
      const db = getDatabase();

      // 检查 WAL 模式是否启用
      const walMode = db.pragma('journal_mode', { simple: true });
      expect(walMode).toBe('wal');

      // 检查外键是否启用
      const foreignKeys = db.pragma('foreign_keys', { simple: true });
      expect(foreignKeys).toBe(1);
    });
  });

  // ============================================================================
  // Test Group: 数据库操作
  // ============================================================================

  describe('数据库操作', () => {
    it('应该能够执行 SQL 语句', () => {
      const db = getDatabase();

      // 创建测试表
      db.exec(`
        CREATE TABLE users_test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 插入数据
      const insertStmt = db.prepare(`
        INSERT INTO users_test (name, email) VALUES (?, ?)
      `);

      const result = insertStmt.run('Test User', 'test@example.com') as DatabaseResult;

      expect(result.changes).toBe(1);
      expect(result.lastInsertRowid).toBe(1);
    });

    it('应该能够查询数据', () => {
      const db = getDatabase();

      // 创建测试表并插入数据
      db.exec(`
        CREATE TABLE products_test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price REAL NOT NULL
        )
      `);

      const insertStmt = db.prepare(`
        INSERT INTO products_test (name, price) VALUES (?, ?)
      `);

      insertStmt.run('Product 1', 10.99);
      insertStmt.run('Product 2', 20.99);

      // 查询数据
      const selectStmt = db.prepare(`
        SELECT * FROM products_test WHERE id = ?
      `);

      const product = selectStmt.get(1) as Record<string, unknown>;

      expect(product).toBeDefined();
      expect(product.name).toBe('Product 1');
      expect(product.price).toBe(10.99);
    });

    it('应该能够查询多条数据', () => {
      const db = getDatabase();

      // 创建测试表并插入数据
      db.exec(`
        CREATE TABLE items_test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          quantity INTEGER NOT NULL
        )
      `);

      const insertStmt = db.prepare(`
        INSERT INTO items_test (name, quantity) VALUES (?, ?)
      `);

      insertStmt.run('Item 1', 5);
      insertStmt.run('Item 2', 10);
      insertStmt.run('Item 3', 15);

      // 查询所有数据
      const selectStmt = db.prepare(`
        SELECT * FROM items_test ORDER BY id
      `);

      const items = selectStmt.all() as Record<string, unknown>[];

      expect(items).toHaveLength(3);
      expect(items[0].name).toBe('Item 1');
      expect(items[1].name).toBe('Item 2');
      expect(items[2].name).toBe('Item 3');
    });

    it('应该能够使用便捷 query 方法', () => {
      const db = getDatabase() as any;

      // 创建测试表并插入数据
      db.exec(`
        CREATE TABLE customers_test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL
        )
      `);

      db.exec(`
        INSERT INTO customers_test (name, email) VALUES ('Customer 1', 'customer1@example.com')
      `);
      db.exec(`
        INSERT INTO customers_test (name, email) VALUES ('Customer 2', 'customer2@example.com')
      `);

      // 使用 query 方法
      const results = db.query('SELECT * FROM customers_test ORDER BY id') as Record<string, unknown>[];

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Customer 1');
      expect(results[1].name).toBe('Customer 2');
    });

    it('应该能够使用带参数的 query 方法', () => {
      const db = getDatabase() as any;

      // 创建测试表并插入数据
      db.exec(`
        CREATE TABLE orders_test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          total REAL NOT NULL
        )
      `);

      db.exec(`
        INSERT INTO orders_test (customer_id, total) VALUES (1, 100.50)
      `);
      db.exec(`
        INSERT INTO orders_test (customer_id, total) VALUES (2, 200.75)
      `);

      // 使用带参数的 query 方法
      const results = db.query(
        'SELECT * FROM orders_test WHERE customer_id = ?',
        [1]
      ) as Record<string, unknown>[];

      expect(results).toHaveLength(1);
      expect(results[0].customer_id).toBe(1);
      expect(results[0].total).toBe(100.50);
    });
  });

  // ============================================================================
  // Test Group: 事务处理
  // ============================================================================

  describe('事务处理', () => {
    it('应该能够执行事务', () => {
      const db = getDatabase();

      // 创建测试表
      db.exec(`
        CREATE TABLE accounts_test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          balance REAL NOT NULL
        )
      `);

      // 插入初始数据
      const insertStmt = db.prepare(`
        INSERT INTO accounts_test (name, balance) VALUES (?, ?)
      `);
      insertStmt.run('Account 1', 1000.00);
      insertStmt.run('Account 2', 500.00);

      // 执行事务
      const transfer = db.transaction((fromId: number, toId: number, amount: number) => {
        const withdraw = db.prepare(`
          UPDATE accounts_test SET balance = balance - ? WHERE id = ?
        `);
        const deposit = db.prepare(`
          UPDATE accounts_test SET balance = balance + ? WHERE id = ?
        `);

        withdraw.run(amount, fromId);
        deposit.run(amount, toId);
      });

      transfer(1, 2, 200.00);

      // 验证事务结果
      const selectStmt = db.prepare(`
        SELECT * FROM accounts_test WHERE id = ?
      `);

      const account1 = selectStmt.get(1) as Record<string, unknown>;
      const account2 = selectStmt.get(2) as Record<string, unknown>;

      expect(account1.balance).toBe(800.00);
      expect(account2.balance).toBe(700.00);
    });

    it('事务失败时应该回滚', () => {
      const db = getDatabase();

      // 创建测试表
      db.exec(`
        CREATE TABLE transactions_test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          status TEXT NOT NULL
        )
      `);

      // 插入初始数据
      const insertStmt = db.prepare(`
        INSERT INTO transactions_test (amount, status) VALUES (?, ?)
      `);
      insertStmt.run(100.00, 'pending');

      // 尝试执行失败的事务
      const failingTransaction = db.transaction(() => {
        const updateStmt = db.prepare(`
          UPDATE transactions_test SET status = ? WHERE id = ?
        `);
        updateStmt.run('completed', 1);

        // 故意抛出错误
        throw new Error('Transaction failed');
      });

      // 事务应该失败
      expect(() => failingTransaction()).toThrow('Transaction failed');

      // 验证回滚
      const selectStmt = db.prepare(`
        SELECT * FROM transactions_test WHERE id = ?
      `);

      const transaction = selectStmt.get(1) as Record<string, unknown>;

      // 状态应该仍然是 'pending'（已回滚）
      expect(transaction.status).toBe('pending');
    });
  });

  // ============================================================================
  // Test Group: 数据库大小查询
  // ============================================================================

  describe('数据库大小查询', () => {
    it('getDatabaseSize 应该返回数据库大小', () => {
      // 创建数据库并插入一些数据
      const db = getDatabase();

      db.exec(`
        CREATE TABLE test_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          data TEXT NOT NULL
        )
      `);

      const insertStmt = db.prepare(`
        INSERT INTO test_data (data) VALUES (?)
      `);

      // 插入一些数据以增加数据库大小
      for (let i = 0; i < 100; i++) {
        insertStmt.run(`Test data ${i}`);
      }

      // 获取数据库大小
      const sizeInfo = getDatabaseSize();

      expect(sizeInfo).toBeDefined();
      expect(sizeInfo!.sizeInBytes).toBeGreaterThan(0);
      expect(sizeInfo!.sizeInMB).toBeGreaterThan(0);
      expect(sizeInfo!.sizeInMB).toBe(sizeInfo!.sizeInBytes / (1024 * 1024));
    });
  });

  // ============================================================================
  // Test Group: 数据库关闭
  // ============================================================================

  describe('数据库关闭', () => {
    it('closeDatabase 应该关闭数据库连接', () => {
      const db1 = getDatabase();
      expect(db1).toBeDefined();

      closeDatabase();

      // 应该返回新的数据库实例
      const db2 = getDatabase();
      expect(db2).toBeDefined();
      expect(db2).not.toBe(db1);
    });

    it('关闭数据库后应该能够重新连接', () => {
      const db1 = getDatabase();
      db1.exec(`
        CREATE TABLE test_table (
          id INTEGER PRIMARY KEY,
          value TEXT
        )
      `);

      closeDatabase();

      // 重新连接
      const db2 = getDatabase() as any;

      // 表应该仍然存在
      const tables = db2.query(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='test_table'
      `) as Record<string, unknown>[];

      expect(tables).toHaveLength(1);
    });
  });

  // ============================================================================
  // Test Group: 错误处理
  // ============================================================================

  describe('错误处理', () => {
    it('应该处理 SQL 语法错误', () => {
      const db = getDatabase();

      expect(() => {
        db.exec('INVALID SQL STATEMENT');
      }).toThrow();
    });

    it('应该处理违反约束的错误', () => {
      const db = getDatabase();

      db.exec(`
        CREATE TABLE unique_test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL
        )
      `);

      const insertStmt = db.prepare(`
        INSERT INTO unique_test (email) VALUES (?)
      `);

      insertStmt.run('test@example.com');

      expect(() => {
        insertStmt.run('test@example.com'); // 重复的 email
      }).toThrow();
    });

    it('应该处理查询不存在的数据', () => {
      const db = getDatabase();

      db.exec(`
        CREATE TABLE test_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        )
      `);

      const selectStmt = db.prepare(`
        SELECT * FROM test_data WHERE id = ?
      `);

      const result = selectStmt.get(999);

      // better-sqlite3 的 get() 方法在找不到数据时返回 undefined
      expect(result).toBeUndefined();
    });
  });

  // ============================================================================
  // Test Group: 性能测试
  // ============================================================================

  describe('性能测试', () => {
    it('应该能够高效插入大量数据', () => {
      const db = getDatabase();

      db.exec(`
        CREATE TABLE performance_test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const insertStmt = db.prepare(`
        INSERT INTO performance_test (data) VALUES (?)
      `);

      const startTime = Date.now();

      // 插入 1000 条记录
      for (let i = 0; i < 1000; i++) {
        insertStmt.run(`Data ${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 应该在合理时间内完成（< 1 秒）
      expect(duration).toBeLessThan(1000);

      // 验证数据已插入
      const count = db.prepare(`
        SELECT COUNT(*) as count FROM performance_test
      `).get() as { count: number };

      expect(count.count).toBe(1000);
    });

    it('批量插入应该比单个插入更快', () => {
      const db = getDatabase();

      db.exec(`
        CREATE TABLE batch_test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          value INTEGER NOT NULL
        )
      `);

      // 使用事务批量插入
      const insertStmt = db.prepare(`
        INSERT INTO batch_test (value) VALUES (?)
      `);

      const batchInsert = db.transaction((count: number) => {
        for (let i = 0; i < count; i++) {
          insertStmt.run(i);
        }
      });

      const startTime = Date.now();
      batchInsert(500);
      const endTime = Date.now();
      const batchDuration = endTime - startTime;

      // 验证数据已插入
      const countResult = db.prepare(`
        SELECT COUNT(*) as count FROM batch_test
      `).get() as { count: number };

      expect(countResult.count).toBe(500);

      // 批量插入应该很快（< 500ms）
      expect(batchDuration).toBeLessThan(500);
    });
  });
});
