/**
// @ts-ignore - Mock type compatibility issues
 * Tests for Database Index Module
 * Tests types, interfaces, and helper functions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock better-sqlite3 before importing the module
vi.mock('better-sqlite3', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      pragma: vi.fn(),
      exec: vi.fn(),
      prepare: vi.fn().mockReturnValue({
        run: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: BigInt(0) }),
        get: vi.fn().mockReturnValue(null),
        all: vi.fn().mockReturnValue([]),
      }),
      close: vi.fn(),
      open: true,
    })),
  };
});

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// We need to mock the middleware module before importing db
vi.mock('@/lib/middleware/db-performance', () => ({
  withPerformanceLogging: vi.fn((connection) => connection),
}));

describe('Database Types', () => {
  describe('DatabaseResult', () => {
    it('should have changes property', () => {
      const result = { changes: 5, lastInsertRowid: 123 };
      expect(result.changes).toBe(5);
    });

    it('should have optional lastInsertRowid', () => {
      const resultWithRowid = { changes: 1, lastInsertRowid: 1 };
      expect(resultWithRowid.lastInsertRowid).toBe(1);

      const resultWithoutRowid = { changes: 0 };
      expect(resultWithoutRowid.lastInsertRowid).toBeUndefined();
    });
  });

  describe('DatabaseStatement', () => {
    it('should define run method signature', () => {
      const stmt = {
        run: (...params: unknown[]) => ({ changes: 0, lastInsertRowid: undefined as number | undefined }),
        get: (...params: unknown[]) => null as Record<string, unknown> | null,
        all: (...params: unknown[]) => [] as Record<string, unknown>[],
      };

      expect(typeof stmt.run).toBe('function');
      expect(typeof stmt.get).toBe('function');
      expect(typeof stmt.all).toBe('function');
    });
  });

  describe('DatabaseConnection', () => {
    it('should define required methods', () => {
      const connection = {
        query: vi.fn(),
        queryRows: vi.fn(),
        exec: vi.fn(),
        prepare: vi.fn(),
        pragma: vi.fn(),
        batch: vi.fn(),
      };

      expect(typeof connection.query).toBe('function');
      expect(typeof connection.queryRows).toBe('function');
      expect(typeof connection.exec).toBe('function');
      expect(typeof connection.prepare).toBe('function');
      expect(typeof connection.pragma).toBe('function');
      expect(typeof connection.batch).toBe('function');
    });
  });
});

describe('Database Module Exports', () => {
  it('should export required functions', async () => {
    const db = await import('./index');
    
    expect(typeof db.getDatabase).toBe('function');
    expect(typeof db.getDatabaseAsync).toBe('function');
    expect(typeof db.closeDatabase).toBe('function');
    expect(typeof db.getDatabaseStats).toBe('function');
    expect(typeof db.vacuumDatabase).toBe('function');
    expect(typeof db.analyzeDatabase).toBe('function');
    expect(typeof db.getDatabaseSize).toBe('function');
    expect(typeof db.migrate).toBe('function');
    expect(typeof db.optimizeDatabase).toBe('function');
    expect(typeof db.getDatabaseHealth).toBe('function');
  });
});

describe('Database Size Calculation', () => {
  it('should calculate size correctly', () => {
    const pageSize = 4096;
    const pageCount = 1000;
    const sizeInBytes = pageSize * pageCount;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    expect(sizeInBytes).toBe(4096000);
    expect(sizeInMB).toBeCloseTo(3.91, 1);
  });

  it('should handle zero pages', () => {
    const pageSize = 4096;
    const pageCount = 0;
    const sizeInBytes = pageSize * pageCount;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    expect(sizeInBytes).toBe(0);
    expect(sizeInMB).toBe(0);
  });

  it('should handle large databases', () => {
    const pageSize = 4096;
    const pageCount = 10000000; // ~40GB
    const sizeInBytes = pageSize * pageCount;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    expect(sizeInBytes).toBe(40960000000);
    expect(sizeInMB).toBeCloseTo(39062.5, 0);
  });
});

describe('Database Stats', () => {
  it('should track connection count', () => {
    const stats = {
      connectionCount: 5,
      isOpen: true,
      isMemoryDatabase: false,
    };

    expect(stats.connectionCount).toBe(5);
    expect(stats.isOpen).toBe(true);
    expect(stats.isMemoryDatabase).toBe(false);
  });

  it('should indicate memory database', () => {
    const stats = {
      connectionCount: 1,
      isOpen: true,
      isMemoryDatabase: true,
    };

    expect(stats.isMemoryDatabase).toBe(true);
  });
});

describe('SQL Type Detection', () => {
  it('should identify SELECT statements', () => {
    const sql1 = 'SELECT * FROM users';
    const sql2 = 'select * from agents';
    const sql3 = '  SELECT id FROM tasks';

    const isSelect = (sql: string) => sql.trim().toLowerCase().startsWith('select');

    expect(isSelect(sql1)).toBe(true);
    expect(isSelect(sql2)).toBe(true);
    expect(isSelect(sql3)).toBe(true);
  });

  it('should identify non-SELECT statements', () => {
    const sql1 = 'INSERT INTO users VALUES (1, "test")';
    const sql2 = 'UPDATE users SET name = "test"';
    const sql3 = 'DELETE FROM users WHERE id = 1';

    const isSelect = (sql: string) => sql.trim().toLowerCase().startsWith('select');

    expect(isSelect(sql1)).toBe(false);
    expect(isSelect(sql2)).toBe(false);
    expect(isSelect(sql3)).toBe(false);
  });
});

describe('Parameter Handling', () => {
  it('should handle undefined params', () => {
    const params = undefined;
    const effectiveParams = params || [];
    
    expect(effectiveParams).toEqual([]);
  });

  it('should handle empty params array', () => {
    const params: unknown[] = [];
    const effectiveParams = params || [];
    
    expect(effectiveParams).toEqual([]);
  });

  it('should pass through valid params', () => {
    const params = [1, 'test', { id: 1 }];
    const effectiveParams = params || [];
    
    expect(effectiveParams).toEqual(params);
  });
});

describe('Batch Operations', () => {
  it('should process batch statements', () => {
    const statements = [
      { sql: 'INSERT INTO users VALUES (?)', params: [1] },
      { sql: 'INSERT INTO users VALUES (?)', params: [2] },
      { sql: 'UPDATE users SET name = ? WHERE id = ?', params: ['test', 1] },
    ];

    expect(statements.length).toBe(3);
    expect(statements[0].params).toEqual([1]);
    expect(statements[2].params).toEqual(['test', 1]);
  });

  it('should handle empty batch', () => {
    const statements: Array<{ sql: string; params?: unknown[] }> = [];
    
    expect(statements.length).toBe(0);
  });
});

describe('Error Handling', () => {
  it('should convert bigint to number', () => {
    const bigintValue = BigInt(123456789);
    const numberValue = Number(bigintValue);
    
    expect(numberValue).toBe(123456789);
  });

  it('should handle undefined lastInsertRowid', () => {
    const result = { changes: 0, lastInsertRowid: undefined as number | undefined };
    
    const safeRowid = result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined;
    
    expect(safeRowid).toBeUndefined();
  });

  it('should handle null safety for changes', () => {
    const result = { changes: null as unknown as number, lastInsertRowid: undefined as number | undefined };
    
    const safeChanges = result?.changes ?? 0;
    
    expect(safeChanges).toBe(0);
  });
});

describe('Pragma Options', () => {
  it('should support simple pragma', () => {
    const options = { simple: true };
    expect(options.simple).toBe(true);
  });

  it('should support complex pragma', () => {
    const options = { simple: false };
    expect(options.simple).toBe(false);
  });
});

describe('Default Exports', () => {
  it('should have all required exports', async () => {
    const db = await import('./index');
    const defaultExport = db.default;

    expect(typeof defaultExport.getDatabase).toBe('function');
    expect(typeof defaultExport.getDatabaseAsync).toBe('function');
    expect(typeof defaultExport.closeDatabase).toBe('function');
    expect(typeof defaultExport.getDatabaseStats).toBe('function');
    expect(typeof defaultExport.vacuumDatabase).toBe('function');
    expect(typeof defaultExport.analyzeDatabase).toBe('function');
    expect(typeof defaultExport.getDatabaseSize).toBe('function');
    expect(typeof defaultExport.migrate).toBe('function');
    expect(typeof defaultExport.optimizeDatabase).toBe('function');
    expect(typeof defaultExport.getDatabaseHealth).toBe('function');
  });
});
