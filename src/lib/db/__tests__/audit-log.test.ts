/**
 * Audit Log Database Module Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initializeAuditLogsTable,
  createAuditLog,
  getAuditLogById,
  queryAuditLogs,
  getUserAuditLogs,
  getEntityAuditLogs,
  getFailedLoginAttempts,
  hasExcessiveFailedLogins,
  cleanupOldAuditLogs,
  getAuditStatistics,
  AuditAction,
  AuditStatus,
  type AuditLog,
} from '../audit-log';
import { getDatabaseAsync } from '../index';

// Mock dependencies
vi.mock('../index', () => ({
  getDatabaseAsync: vi.fn(),
}));

vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('audit-log', () => {
  let mockDb: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock database
    mockDb = {
      exec: vi.fn(),
      prepare: vi.fn(),
      query: vi.fn(),
    };

    // Setup prepare to return prepared statements
    const mockStmt = {
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
    };

    mockDb.prepare.mockReturnValue(mockStmt);

    // Mock getDatabaseAsync
    vi.mocked(getDatabaseAsync).mockResolvedValue(mockDb);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeAuditLogsTable', () => {
    it('should create audit_logs table with correct schema', async () => {
      await initializeAuditLogsTable();

      expect(mockDb.exec).toHaveBeenCalled();
      const sql = mockDb.exec.mock.calls[0][0];
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS audit_logs');
      expect(sql).toContain('id TEXT PRIMARY KEY');
      expect(sql).toContain('user_id TEXT');
      expect(sql).toContain('action TEXT NOT NULL');
      expect(sql).toContain('entity_type TEXT NOT NULL');
      expect(sql).toContain('status TEXT NOT NULL DEFAULT');
      expect(sql).toContain('FOREIGN KEY (user_id) REFERENCES users(id)');
    });

    it('should create indexes for common queries', async () => {
      await initializeAuditLogsTable();

      const sql = mockDb.exec.mock.calls[0][0];
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_audit_logs_action');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_audit_logs_entity');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_audit_logs_status');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at');
    });

    it('should log successful initialization', async () => {
      await initializeAuditLogsTable();

      const { logger } = await import('../../logger');
      expect(logger.info).toHaveBeenCalledWith(
        'Audit logs table initialized',
        { category: 'db' }
      );
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Database error');
      mockDb.exec.mockImplementationOnce(() => {
        throw error;
      });

      await expect(initializeAuditLogsTable()).rejects.toThrow('Database error');

      const { logger } = await import('../../logger');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize audit logs table',
        { category: 'db', error }
      );
    });
  });

  describe('createAuditLog', () => {
    it('should create audit log entry with generated ID', async () => {
      const entry: Omit<AuditLog, 'id' | 'created_at'> = {
        user_id: 'user123',
        action: AuditAction.USER_CREATED,
        entity_type: 'user',
        entity_id: 'user123',
        details: { username: 'testuser' },
        status: AuditStatus.SUCCESS,
      };

      const mockStmt = {
        run: vi.fn(),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await createAuditLog(entry);

      expect(result).toHaveProperty('id');
      expect(result.id).toMatch(/^audit_\d+_[a-z0-9]+$/);
      expect(result.user_id).toBe('user123');
      expect(result.action).toBe(AuditAction.USER_CREATED);
      expect(result).toHaveProperty('created_at');
      expect(mockStmt.run).toHaveBeenCalled();
    });

    it('should handle null user_id', async () => {
      const entry: Omit<AuditLog, 'id' | 'created_at'> = {
        user_id: null,
        action: AuditAction.LOGIN_FAILED,
        entity_type: 'auth',
        entity_id: null,
        details: { ip: '192.168.1.1' },
        status: AuditStatus.FAILED,
      };

      const mockStmt = {
        run: vi.fn(),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await createAuditLog(entry);

      expect(result.user_id).toBeNull();
      expect(mockStmt.run).toHaveBeenCalledWith(
        expect.any(String),
        null,
        AuditAction.LOGIN_FAILED,
        'auth',
        null,
        null,
        null,
        expect.any(String),
        null,
        null,
        AuditStatus.FAILED,
        null,
        expect.any(String)
      );
    });

    it('should serialize details to JSON', async () => {
      const entry: Omit<AuditLog, 'id' | 'created_at'> = {
        user_id: 'user123',
        action: AuditAction.DATA_CREATED,
        entity_type: 'document',
        entity_id: 'doc123',
        details: { title: 'Test Document', count: 5, nested: { value: 'test' } },
        status: AuditStatus.SUCCESS,
      };

      const mockStmt = {
        run: vi.fn(),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await createAuditLog(entry);

      const callArgs = mockStmt.run.mock.calls[0];
      expect(callArgs[7]).toBe(JSON.stringify(entry.details));
    });

    it('should log debug message on success', async () => {
      const entry: Omit<AuditLog, 'id' | 'created_at'> = {
        user_id: 'user123',
        action: AuditAction.LOGIN,
        entity_type: 'auth',
        entity_id: null,
        details: {},
        status: AuditStatus.SUCCESS,
      };

      const mockStmt = {
        run: vi.fn(),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await createAuditLog(entry);

      const { logger } = await import('../../logger');
      expect(logger.debug).toHaveBeenCalledWith('Audit log created', {
        category: 'audit',
        action: AuditAction.LOGIN,
        user_id: 'user123',
        entity_type: 'auth',
      });
    });

    it('should handle creation errors', async () => {
      const entry: Omit<AuditLog, 'id' | 'created_at'> = {
        user_id: 'user123',
        action: AuditAction.LOGIN,
        entity_type: 'auth',
        entity_id: null,
        details: {},
        status: AuditStatus.SUCCESS,
      };

      const error = new Error('Insert failed');
      const mockStmt = {
        run: vi.fn().mockImplementation(() => {
          throw error;
        }),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await expect(createAuditLog(entry)).rejects.toThrow('Insert failed');
    });
  });

  describe('getAuditLogById', () => {
    it('should return audit log by ID', async () => {
      const mockRow = {
        id: 'audit_1',
        user_id: 'user123',
        action: AuditAction.LOGIN,
        entity_type: 'auth',
        entity_id: null,
        resource_type: null,
        resource_id: null,
        details: '{}',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        status: AuditStatus.SUCCESS,
        error_message: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockStmt = {
        get: vi.fn().mockReturnValue(mockRow),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await getAuditLogById('audit_1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('audit_1');
      expect(result!.user_id).toBe('user123');
      expect(result!.action).toBe(AuditAction.LOGIN);
      expect(result!.status).toBe(AuditStatus.SUCCESS);
    });

    it('should parse details JSON', async () => {
      const mockRow = {
        id: 'audit_1',
        user_id: 'user123',
        action: AuditAction.LOGIN,
        entity_type: 'auth',
        entity_id: null,
        resource_type: null,
        resource_id: null,
        details: '{"key":"value","count":5}',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        status: AuditStatus.SUCCESS,
        error_message: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockStmt = {
        get: vi.fn().mockReturnValue(mockRow),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await getAuditLogById('audit_1');

      expect(result!.details).toEqual({ key: 'value', count: 5 });
    });

    it('should return null for non-existent ID', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue(undefined),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await getAuditLogById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle query errors', async () => {
      const error = new Error('Query failed');
      const mockStmt = {
        get: vi.fn().mockImplementation(() => {
          throw error;
        }),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await expect(getAuditLogById('audit_1')).rejects.toThrow('Query failed');
    });
  });

  describe('queryAuditLogs', () => {
    it('should query with no filters', async () => {
      const mockRows = [
        {
          id: 'audit_1',
          user_id: 'user1',
          action: AuditAction.LOGIN,
          entity_type: 'auth',
          entity_id: null,
          resource_type: null,
          resource_id: null,
          details: '{}',
          ip_address: null,
          user_agent: null,
          status: AuditStatus.SUCCESS,
          error_message: null,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockStmt = {
        get: vi.fn().mockReturnValue({ count: 1 }),
        all: vi.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await queryAuditLogs({});

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.logs[0].id).toBe('audit_1');
    });

    it('should filter by user_id', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue({ count: 1 }),
        all: vi.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await queryAuditLogs({ user_id: 'user123' });

      const countSql = mockDb.prepare.mock.calls[0][0];
      expect(countSql).toContain('user_id = ?');
    });

    it('should filter by action', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue({ count: 1 }),
        all: vi.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await queryAuditLogs({ action: AuditAction.LOGIN });

      const countSql = mockDb.prepare.mock.calls[0][0];
      expect(countSql).toContain('action = ?');
    });

    it('should filter by status', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue({ count: 1 }),
        all: vi.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await queryAuditLogs({ status: AuditStatus.FAILED });

      const countSql = mockDb.prepare.mock.calls[0][0];
      expect(countSql).toContain('status = ?');
    });

    it('should filter by date range', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue({ count: 1 }),
        all: vi.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await queryAuditLogs({
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      const countSql = mockDb.prepare.mock.calls[0][0];
      expect(countSql).toContain('created_at >= ?');
      expect(countSql).toContain('created_at <= ?');
    });

    it('should apply limit and offset', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue({ count: 10 }),
        all: vi.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await queryAuditLogs({ limit: 20, offset: 10 });

      const dataSql = mockDb.prepare.mock.calls[1][0];
      expect(dataSql).toContain('LIMIT ? OFFSET ?');
      expect(mockStmt.all).toHaveBeenCalled();
    });

    it('should use default limit of 50', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue({ count: 1 }),
        all: vi.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await queryAuditLogs({});

      const dataSql = mockDb.prepare.mock.calls[1][0];
      expect(dataSql).toContain('LIMIT ? OFFSET ?');
      expect(mockStmt.all).toHaveBeenCalled();
    });
  });

  describe('getUserAuditLogs', () => {
    it('should get logs for a specific user', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue({ count: 2 }),
        all: vi.fn().mockReturnValue([
          {
            id: 'audit_1',
            user_id: 'user123',
            action: AuditAction.LOGIN,
            entity_type: 'auth',
            entity_id: null,
            resource_type: null,
            resource_id: null,
            details: '{}',
            ip_address: null,
            user_agent: null,
            status: AuditStatus.SUCCESS,
            error_message: null,
            created_at: '2024-01-01T00:00:00Z',
          },
        ]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await getUserAuditLogs('user123');

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe('user123');
    });

    it('should filter by actions when specified', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue({ count: 5 }),
        all: vi.fn().mockReturnValue([
          {
            id: 'audit_1',
            user_id: 'user123',
            action: AuditAction.LOGIN,
            entity_type: 'auth',
            entity_id: null,
            resource_type: null,
            resource_id: null,
            details: '{}',
            ip_address: null,
            user_agent: null,
            status: AuditStatus.SUCCESS,
            error_message: null,
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'audit_2',
            user_id: 'user123',
            action: AuditAction.LOGOUT,
            entity_type: 'auth',
            entity_id: null,
            resource_type: null,
            resource_id: null,
            details: '{}',
            ip_address: null,
            user_agent: null,
            status: AuditStatus.SUCCESS,
            error_message: null,
            created_at: '2024-01-01T00:00:00Z',
          },
        ]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await getUserAuditLogs('user123', {
        actions: [AuditAction.LOGIN, AuditAction.LOGOUT],
      });

      expect(result).toHaveLength(2);
    });

    it('should use custom limit when specified', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue({ count: 100 }),
        all: vi.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await getUserAuditLogs('user123', { limit: 100 });

      expect(mockStmt.all).toHaveBeenCalledWith(
        expect.anything(),
        100,
        0
      );
    });
  });

  describe('getEntityAuditLogs', () => {
    it('should get logs for a specific entity', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue({ count: 1 }),
        all: vi.fn().mockReturnValue([
          {
            id: 'audit_1',
            user_id: 'user123',
            action: AuditAction.DATA_UPDATED,
            entity_type: 'document',
            entity_id: 'doc123',
            resource_type: null,
            resource_id: null,
            details: '{}',
            ip_address: null,
            user_agent: null,
            status: AuditStatus.SUCCESS,
            error_message: null,
            created_at: '2024-01-01T00:00:00Z',
          },
        ]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await getEntityAuditLogs('document', 'doc123');

      expect(result).toHaveLength(1);
      expect(result[0].entity_type).toBe('document');
      expect(result[0].entity_id).toBe('doc123');
    });
  });

  describe('getFailedLoginAttempts', () => {
    it('should get failed login attempts for a user', async () => {
      const mockStmt = {
        all: vi.fn().mockReturnValue([
          {
            id: 'audit_1',
            user_id: 'user123',
            action: AuditAction.LOGIN_FAILED,
            entity_type: 'auth',
            entity_id: null,
            resource_type: null,
            resource_id: null,
            details: '{}',
            ip_address: '192.168.1.1',
            user_agent: null,
            status: AuditStatus.FAILED,
            error_message: 'Invalid password',
            created_at: new Date().toISOString(),
          },
        ]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await getFailedLoginAttempts('user123', 15);

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe(AuditAction.LOGIN_FAILED);
      expect(result[0].status).toBe(AuditStatus.FAILED);
    });

    it('should get all failed login attempts when userId is null', async () => {
      const mockStmt = {
        all: vi.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await getFailedLoginAttempts(null, 15);

      const sql = mockDb.prepare.mock.calls[0][0];
      expect(sql).not.toContain('user_id = ?');
    });

    it('should use custom time window', async () => {
      const mockStmt = {
        all: vi.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await getFailedLoginAttempts('user123', 30);

      const sql = mockDb.prepare.mock.calls[0][0];
      expect(sql).toContain('action = ?');
      expect(sql).toContain('status = ?');
      expect(sql).toContain('created_at >= ?');
    });
  });

  describe('hasExcessiveFailedLogins', () => {
    it('should return true when threshold is exceeded', async () => {
      const mockRows = Array.from({ length: 5 }, (_, i) => ({
        id: `audit_${i}`,
        user_id: 'user123',
        action: AuditAction.LOGIN_FAILED,
        entity_type: 'auth',
        entity_id: null,
        resource_type: null,
        resource_id: null,
        details: '{}',
        ip_address: '192.168.1.1',
        user_agent: null,
        status: AuditStatus.FAILED,
        error_message: 'Invalid password',
        created_at: new Date().toISOString(),
      }));

      const mockStmt = {
        all: vi.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await hasExcessiveFailedLogins('user123', 5, 15);

      expect(result).toBe(true);
    });

    it('should return false when below threshold', async () => {
      const mockRows = Array.from({ length: 2 }, (_, i) => ({
        id: `audit_${i}`,
        user_id: 'user123',
        action: AuditAction.LOGIN_FAILED,
        entity_type: 'auth',
        entity_id: null,
        resource_type: null,
        resource_id: null,
        details: '{}',
        ip_address: '192.168.1.1',
        user_agent: null,
        status: AuditStatus.FAILED,
        error_message: 'Invalid password',
        created_at: new Date().toISOString(),
      }));

      const mockStmt = {
        all: vi.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await hasExcessiveFailedLogins('user123', 5, 15);

      expect(result).toBe(false);
    });

    it('should use default threshold and time window', async () => {
      const mockStmt = {
        all: vi.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await hasExcessiveFailedLogins('user123');

      expect(mockStmt.all).toHaveBeenCalled();
    });
  });

  describe('cleanupOldAuditLogs', () => {
    it('should delete logs older than specified days', async () => {
      const mockStmt = {
        run: vi.fn().mockReturnValue({ changes: 10 }),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const deleted = await cleanupOldAuditLogs(90);

      expect(deleted).toBe(10);
      expect(mockStmt.run).toHaveBeenCalled();
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM audit_logs WHERE created_at < ?'
      );
    });

    it('should log when logs are deleted', async () => {
      const mockStmt = {
        run: vi.fn().mockReturnValue({ changes: 10 }),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await cleanupOldAuditLogs(90);

      const { logger } = await import('../../logger');
      expect(logger.info).toHaveBeenCalledWith(
        'Old audit logs cleaned up',
        { category: 'db', deleted: 10, daysToKeep: 90 }
      );
    });

    it('should not log when no logs are deleted', async () => {
      const mockStmt = {
        run: vi.fn().mockReturnValue({ changes: 0 }),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await cleanupOldAuditLogs(90);

      const { logger } = await import('../../logger');
      // Logger.info is called by initializeAuditLogsTable, but not by cleanup
      const cleanupLogCalls = logger.info.mock.calls.filter(
        (call: any[]) => call[0] === 'Old audit logs cleaned up'
      );
      expect(cleanupLogCalls).toHaveLength(0);
    });

    it('should use default of 90 days', async () => {
      const mockStmt = {
        run: vi.fn().mockReturnValue({ changes: 0 }),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await cleanupOldAuditLogs();

      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('getAuditStatistics', () => {
    it('should return statistics with all fields', async () => {
      const mockStmt = {
        get: vi.fn()
          .mockReturnValueOnce({ count: 100 })
          .mockReturnValueOnce({ count: 100 })
          .mockReturnValueOnce({ count: 80 }),
        all: vi.fn()
          .mockReturnValueOnce([
            { status: 'success', count: 80 },
            { status: 'failed', count: 20 },
          ])
          .mockReturnValueOnce([
            { action: 'login', count: 50 },
            { action: 'logout', count: 30 },
            { action: 'user_created', count: 20 },
          ])
          .mockReturnValueOnce([
            { user_id: 'user1', count: 50 },
            { user_id: 'user2', count: 30 },
          ]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await getAuditStatistics();

      expect(result).toEqual({
        totalLogs: 100,
        successCount: 80,
        failedCount: 20,
        actionBreakdown: {
          login: 50,
          logout: 30,
          user_created: 20,
        },
        topUsers: [
          { user_id: 'user1', count: 50 },
          { user_id: 'user2', count: 30 },
        ],
      });
    });

    it('should filter by date range when provided', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue({ count: 50 }),
        all: vi.fn()
          .mockReturnValueOnce([])
          .mockReturnValueOnce([])
          .mockReturnValueOnce([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await getAuditStatistics({
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      const sql = mockDb.prepare.mock.calls[0][0];
      expect(sql).toContain('created_at >= ?');
      expect(sql).toContain('created_at <= ?');
    });

    it('should handle no status rows', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue({ count: 100 }),
        all: vi.fn()
          .mockReturnValueOnce([])
          .mockReturnValueOnce([])
          .mockReturnValueOnce([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await getAuditStatistics();

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should handle no top users', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue({ count: 0 }),
        all: vi.fn()
          .mockReturnValueOnce([])
          .mockReturnValueOnce([])
          .mockReturnValueOnce([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await getAuditStatistics();

      expect(result.totalLogs).toBe(0);
      expect(result.topUsers).toEqual([]);
    });
  });
});
