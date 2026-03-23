/**
 * User Preferences Database Module Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initializeUserPreferencesTable,
  getUserPreferences,
  createUserPreferences,
  updateUserPreferences,
  updateUserLocale,
  getOrCreateUserPreferences,
  deleteUserPreferences,
  type UserPreferences,
} from '../user-preferences';
import { getDatabaseAsync } from '../index';

// Mock dependencies
const mockGetDatabaseAsync = vi.fn();

vi.mock('../index', async () => {
  const actual = await vi.importActual<typeof import('../index')>('../index');
  return {
    ...actual,
    getDatabaseAsync: mockGetDatabaseAsync,
  };
});

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * Mock statement interface
 */
interface MockStatement {
  run: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
}

/**
 * Mock database interface
 */
interface MockDatabase {
  exec: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
  prepare: ReturnType<typeof vi.fn>;
}

describe('user-preferences', () => {
  let mockDb: MockDatabase;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock database
    mockDb = {
      exec: vi.fn(),
      query: vi.fn(),
      prepare: vi.fn(),
    };

    // Setup prepare to return prepared statements
    const mockStmt = {
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
    };

    mockDb.prepare.mockReturnValue(mockStmt);

    // Mock getDatabaseAsync
    mockGetDatabaseAsync.mockResolvedValue(mockDb);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeUserPreferencesTable', () => {
    it('should create user_preferences table with correct schema', async () => {
      await initializeUserPreferencesTable();

      expect(mockDb.exec).toHaveBeenCalled();
      const sql = mockDb.exec.mock.calls[0][0];
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS user_preferences');
      expect(sql).toContain('user_id TEXT PRIMARY KEY');
      expect(sql).toContain('locale TEXT NOT NULL DEFAULT');
      expect(sql).toContain('theme TEXT NOT NULL DEFAULT');
      expect(sql).toContain("CHECK(theme IN ('light', 'dark', 'system'))");
      expect(sql).toContain('notifications_enabled INTEGER NOT NULL DEFAULT 1');
      expect(sql).toContain('email_notifications INTEGER NOT NULL DEFAULT 1');
      expect(sql).toContain('sound_enabled INTEGER NOT NULL DEFAULT 1');
    });

    it('should create indexes for common queries', async () => {
      await initializeUserPreferencesTable();

      const sql = mockDb.exec.mock.calls[0][0];
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_user_preferences_locale');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_user_preferences_theme');
    });

    it('should log successful initialization', async () => {
      await initializeUserPreferencesTable();

      const { logger } = await import('../../logger');
      expect(logger.info).toHaveBeenCalledWith(
        'User preferences table initialized',
        { category: 'db' }
      );
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Database error');
      mockDb.exec.mockImplementationOnce(() => {
        throw error;
      });

      await expect(initializeUserPreferencesTable()).rejects.toThrow('Database error');

      const { logger } = await import('../../logger');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize user preferences table',
        { category: 'db', error }
      );
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences for existing user', async () => {
      const mockRow = {
        user_id: 'user123',
        locale: 'zh',
        theme: 'dark',
        timezone: 'Asia/Shanghai',
        notifications_enabled: 1,
        email_notifications: 1,
        sound_enabled: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockDb.query.mockReturnValue([mockRow]);

      const result = await getUserPreferences('user123');

      expect(result).not.toBeNull();
      expect(result!.user_id).toBe('user123');
      expect(result!.locale).toBe('zh');
      expect(result!.theme).toBe('dark');
      expect(result!.timezone).toBe('Asia/Shanghai');
      expect(result!.notifications_enabled).toBe(true);
      expect(result!.email_notifications).toBe(true);
      expect(result!.sound_enabled).toBe(false);
    });

    it('should handle null timezone', async () => {
      const mockRow = {
        user_id: 'user123',
        locale: 'en',
        theme: 'system',
        timezone: null,
        notifications_enabled: 1,
        email_notifications: 0,
        sound_enabled: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockDb.query.mockReturnValue([mockRow]);

      const result = await getUserPreferences('user123');

      expect(result!.timezone).toBeUndefined();
    });

    it('should return null for non-existent user', async () => {
      mockDb.query.mockReturnValue([]);

      const result = await getUserPreferences('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when result is undefined', async () => {
      mockDb.query.mockReturnValue(undefined);

      const result = await getUserPreferences('user123');

      expect(result).toBeNull();
    });

    it('should handle query errors', async () => {
      const error = new Error('Query failed');
      mockDb.query.mockImplementation(() => {
        throw error;
      });

      await expect(getUserPreferences('user123')).rejects.toThrow('Query failed');

      const { logger } = await import('../../logger');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get user preferences',
        { category: 'db', error, userId: 'user123' }
      );
    });
  });

  describe('createUserPreferences', () => {
    it('should create preferences with default values', async () => {
      const result = await createUserPreferences('user123');

      expect(result).toEqual({
        user_id: 'user123',
        locale: 'zh',
        theme: 'system',
        notifications_enabled: true,
        email_notifications: true,
        sound_enabled: true,
        timezone: undefined,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_preferences'),
        expect.arrayContaining([
          'user123',
          'zh',
          'system',
          null,
          1,
          1,
          1,
          expect.any(String),
          expect.any(String),
        ])
      );
    });

    it('should create preferences with custom values', async () => {
      const result = await createUserPreferences('user123', {
        locale: 'en',
        theme: 'light',
        timezone: 'America/New_York',
        notifications_enabled: false,
        email_notifications: false,
        sound_enabled: false,
      });

      expect(result.locale).toBe('en');
      expect(result.theme).toBe('light');
      expect(result.timezone).toBe('America/New_York');
      expect(result.notifications_enabled).toBe(false);
      expect(result.email_notifications).toBe(false);
      expect(result.sound_enabled).toBe(false);

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_preferences'),
        expect.arrayContaining([
          'user123',
          'en',
          'light',
          'America/New_York',
          0,
          0,
          0,
          expect.any(String),
          expect.any(String),
        ])
      );
    });

    it('should log successful creation', async () => {
      await createUserPreferences('user123');

      const { logger } = await import('../../logger');
      expect(logger.info).toHaveBeenCalledWith(
        'User preferences created',
        { category: 'db', userId: 'user123' }
      );
    });

    it('should handle creation errors', async () => {
      const error = new Error('Insert failed');
      mockDb.exec.mockImplementationOnce(() => {
        throw error;
      });

      await expect(createUserPreferences('user123')).rejects.toThrow('Insert failed');

      const { logger } = await import('../../logger');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create user preferences',
        { category: 'db', error, userId: 'user123' }
      );
    });

    it('should handle partial custom preferences', async () => {
      const result = await createUserPreferences('user123', {
        locale: 'en',
        theme: 'dark',
      });

      expect(result.locale).toBe('en');
      expect(result.theme).toBe('dark');
      expect(result.notifications_enabled).toBe(true); // default
      expect(result.email_notifications).toBe(true); // default
      expect(result.sound_enabled).toBe(true); // default
    });
  });

  describe('updateUserPreferences', () => {
    beforeEach(() => {
      // Mock getUserPreferences to return updated data
      mockDb.query.mockReturnValue([
        {
          user_id: 'user123',
          locale: 'en',
          theme: 'light',
          timezone: 'America/New_York',
          notifications_enabled: 0,
          email_notifications: 0,
          sound_enabled: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]);
    });

    it('should update single field', async () => {
      const result = await updateUserPreferences('user123', {
        locale: 'en',
      });

      expect(result.locale).toBe('en');
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_preferences SET'),
        expect.arrayContaining([
          'en',
          expect.any(String),
          'user123',
        ])
      );

      const sql = mockDb.exec.mock.calls[0][0];
      expect(sql).toContain('locale = ?');
      expect(sql).toContain('updated_at = ?');
    });

    it('should update multiple fields', async () => {
      const result = await updateUserPreferences('user123', {
        locale: 'en',
        theme: 'light',
        notifications_enabled: false,
      });

      expect(result.locale).toBe('en');
      expect(result.theme).toBe('light');
      expect(result.notifications_enabled).toBe(false);

      const sql = mockDb.exec.mock.calls[0][0];
      expect(sql).toContain('locale = ?');
      expect(sql).toContain('theme = ?');
      expect(sql).toContain('notifications_enabled = ?');
    });

    it('should convert boolean to integer', async () => {
      await updateUserPreferences('user123', {
        notifications_enabled: true,
        email_notifications: false,
      });

      const values = mockDb.exec.mock.calls[0][1] as unknown[];
      const notifIndex = values.findIndex((v) => v === 1 || v === 0);
      expect(notifIndex).toBeGreaterThan(-1);
    });

    it('should update timezone', async () => {
      await updateUserPreferences('user123', {
        timezone: 'Europe/Berlin',
      });

      const values = mockDb.exec.mock.calls[0][1];
      expect(values).toContain('Europe/Berlin');
    });

    it('should reject when no fields to update', async () => {
      await expect(
        updateUserPreferences('user123', {})
      ).rejects.toThrow('No fields to update');
    });

    it('should log successful update', async () => {
      await updateUserPreferences('user123', {
        locale: 'en',
      });

      const { logger } = await import('../../logger');
      expect(logger.info).toHaveBeenCalledWith(
        'User preferences updated',
        { category: 'db', userId: 'user123', updates: { locale: 'en' } }
      );
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockDb.exec.mockImplementationOnce(() => {
        throw error;
      });

      await expect(
        updateUserPreferences('user123', { locale: 'en' })
      ).rejects.toThrow('Update failed');
    });

    it('should throw when updated preferences cannot be retrieved', async () => {
      mockDb.query.mockReturnValue([]);

      await expect(
        updateUserPreferences('user123', { locale: 'en' })
      ).rejects.toThrow('Failed to retrieve updated preferences');
    });
  });

  describe('updateUserLocale', () => {
    beforeEach(() => {
      mockDb.query.mockReturnValue([
        {
          user_id: 'user123',
          locale: 'en',
          theme: 'system',
          timezone: null,
          notifications_enabled: 1,
          email_notifications: 1,
          sound_enabled: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]);
    });

    it('should update user locale', async () => {
      await updateUserLocale('user123', 'en');

      const sql = mockDb.exec.mock.calls[0][0];
      expect(sql).toContain('UPDATE user_preferences SET');
      expect(sql).toContain('locale = ?');
    });
  });

  describe('getOrCreateUserPreferences', () => {
    it('should return existing preferences', async () => {
      const existingPreferences = {
        user_id: 'user123',
        locale: 'zh',
        theme: 'dark',
        timezone: 'Asia/Shanghai',
        notifications_enabled: 1,
        email_notifications: 1,
        sound_enabled: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockDb.query.mockReturnValue([existingPreferences]);

      const result = await getOrCreateUserPreferences('user123');

      expect(result.user_id).toBe('user123');
      expect(result.locale).toBe('zh');
      expect(mockDb.exec).not.toHaveBeenCalled(); // No insert
    });

    it('should create new preferences if not exist', async () => {
      mockDb.query.mockReturnValue([]);

      const result = await getOrCreateUserPreferences('user123');

      expect(result.user_id).toBe('user123');
      expect(mockDb.exec).toHaveBeenCalled(); // Insert was called
    });

    it('should use default locale when creating', async () => {
      mockDb.query.mockReturnValue([]);

      const result = await getOrCreateUserPreferences('user123');

      expect(result.locale).toBe('zh');
    });

    it('should use custom default locale when provided', async () => {
      mockDb.query.mockReturnValue([]);

      const result = await getOrCreateUserPreferences('user123', 'en');

      expect(result.locale).toBe('en');
    });
  });

  describe('deleteUserPreferences', () => {
    it('should delete user preferences', async () => {
      await deleteUserPreferences('user123');

      expect(mockDb.exec).toHaveBeenCalledWith(
        'DELETE FROM user_preferences WHERE user_id = ?',
        ['user123']
      );
    });

    it('should log successful deletion', async () => {
      await deleteUserPreferences('user123');

      const { logger } = await import('../../logger');
      expect(logger.info).toHaveBeenCalledWith(
        'User preferences deleted',
        { category: 'db', userId: 'user123' }
      );
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed');
      mockDb.exec.mockImplementationOnce(() => {
        throw error;
      });

      await expect(deleteUserPreferences('user123')).rejects.toThrow('Delete failed');

      const { logger } = await import('../../logger');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to delete user preferences',
        { category: 'db', error, userId: 'user123' }
      );
    });
  });

  describe('Theme validation', () => {
    it('should accept light theme', async () => {
      mockDb.query.mockReturnValue([
        {
          user_id: 'user123',
          locale: 'en',
          theme: 'light',
          timezone: null,
          notifications_enabled: 1,
          email_notifications: 1,
          sound_enabled: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]);

      await updateUserPreferences('user123', { theme: 'light' });
    });

    it('should accept dark theme', async () => {
      mockDb.query.mockReturnValue([
        {
          user_id: 'user123',
          locale: 'en',
          theme: 'dark',
          timezone: null,
          notifications_enabled: 1,
          email_notifications: 1,
          sound_enabled: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]);

      await updateUserPreferences('user123', { theme: 'dark' });
    });

    it('should accept system theme', async () => {
      mockDb.query.mockReturnValue([
        {
          user_id: 'user123',
          locale: 'en',
          theme: 'system',
          timezone: null,
          notifications_enabled: 1,
          email_notifications: 1,
          sound_enabled: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]);

      await updateUserPreferences('user123', { theme: 'system' });
    });
  });

  describe('Boolean field handling', () => {
    beforeEach(() => {
      mockDb.query.mockReturnValue([
        {
          user_id: 'user123',
          locale: 'en',
          theme: 'system',
          timezone: null,
          notifications_enabled: 1,
          email_notifications: 1,
          sound_enabled: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]);
    });

    it('should convert integer 1 to boolean true', async () => {
      const result = await getUserPreferences('user123');

      expect(result!.notifications_enabled).toBe(true);
      expect(result!.email_notifications).toBe(true);
      expect(result!.sound_enabled).toBe(true);
    });

    it('should convert integer 0 to boolean false', async () => {
      mockDb.query.mockReturnValue([
        {
          user_id: 'user123',
          locale: 'en',
          theme: 'system',
          timezone: null,
          notifications_enabled: 0,
          email_notifications: 0,
          sound_enabled: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]);

      const result = await getUserPreferences('user123');

      expect(result!.notifications_enabled).toBe(false);
      expect(result!.email_notifications).toBe(false);
      expect(result!.sound_enabled).toBe(false);
    });

    it('should convert boolean true to integer 1 on update', async () => {
      await updateUserPreferences('user123', {
        notifications_enabled: true,
      });

      const values = mockDb.exec.mock.calls[0][1];
      expect(values).toContain(1);
    });

    it('should convert boolean false to integer 0 on update', async () => {
      await updateUserPreferences('user123', {
        notifications_enabled: false,
      });

      const values = mockDb.exec.mock.calls[0][1];
      expect(values).toContain(0);
    });
  });

  describe('Timestamp handling', () => {
    it('should generate ISO timestamps on create', async () => {
      const result = await createUserPreferences('user123');

      expect(result.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should update timestamp on update', async () => {
      mockDb.query.mockReturnValue([
        {
          user_id: 'user123',
          locale: 'en',
          theme: 'system',
          timezone: null,
          notifications_enabled: 1,
          email_notifications: 1,
          sound_enabled: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]);

      await updateUserPreferences('user123', { locale: 'en' });

      const values = mockDb.exec.mock.calls[0][1];
      // updated_at should be the second to last value
      const updatedAtIndex = values.length - 2;
      expect(values[updatedAtIndex]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
