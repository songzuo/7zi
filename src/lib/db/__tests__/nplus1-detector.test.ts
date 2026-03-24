/**
 * N+1 Query Detector Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getNPlus1Detector,
  resetNPlus1Detector,
  type NPlus1Detection,
  type QueryPattern
} from '../nplus1-detector';

describe('NPlus1Detector', () => {
  let detector: ReturnType<typeof getNPlus1Detector>;

  beforeEach(() => {
    resetNPlus1Detector();
    detector = getNPlus1Detector();
  });

  describe('request tracking', () => {
    it('should start tracking a request', () => {
      detector.startRequest('req-1');
      expect(() => detector.startRequest('req-1')).not.toThrow();
    });

    it('should end tracking and return detection results', () => {
      detector.startRequest('req-1');
      const result = detector.endRequest('req-1');

      expect(result).toHaveProperty('detected');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('severity');
    });

    it('should handle multiple concurrent requests', () => {
      detector.startRequest('req-1');
      detector.startRequest('req-2');

      detector.recordQuery('req-1', 'SELECT * FROM users', 10);
      detector.recordQuery('req-2', 'SELECT * FROM posts', 15);

      const result1 = detector.endRequest('req-1');
      const result2 = detector.endRequest('req-2');

      expect(result1.patterns).toHaveLength(1);
      expect(result2.patterns).toHaveLength(1);
    });
  });

  describe('query recording', () => {
    it('should record SELECT queries', () => {
      detector.startRequest('req-1');
      detector.recordQuery('req-1', 'SELECT * FROM users WHERE id = ?', 10);

      const result = detector.endRequest('req-1');
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].patternType).toBe('select');
    });

    it('should record INSERT queries', () => {
      detector.startRequest('req-1');
      detector.recordQuery('req-1', 'INSERT INTO users (name) VALUES (?)', 5);

      const result = detector.endRequest('req-1');
      expect(result.patterns[0].patternType).toBe('insert');
    });

    it('should record UPDATE queries', () => {
      detector.startRequest('req-1');
      detector.recordQuery('req-1', 'UPDATE users SET name = ? WHERE id = ?', 8);

      const result = detector.endRequest('req-1');
      expect(result.patterns[0].patternType).toBe('update');
    });

    it('should record DELETE queries', () => {
      detector.startRequest('req-1');
      detector.recordQuery('req-1', 'DELETE FROM users WHERE id = ?', 6);

      const result = detector.endRequest('req-1');
      expect(result.patterns[0].patternType).toBe('delete');
    });
  });

  describe('N+1 detection', () => {
    it('should detect N+1 pattern', () => {
      detector.startRequest('req-1');

      // Simulate N+1: one query to get users, then N queries to get posts for each
      detector.recordQuery('req-1', 'SELECT * FROM users LIMIT 10', 10);

      for (let i = 0; i < 10; i++) {
        detector.recordQuery('req-1', 'SELECT * FROM posts WHERE user_id = ?', 5);
      }

      const result = detector.endRequest('req-1');

      expect(result.detected).toBe(true);
      expect(result.severity).toBe('high');
    });

    it('should not detect N+1 when queries are different', () => {
      detector.startRequest('req-1');

      detector.recordQuery('req-1', 'SELECT * FROM users', 10);
      detector.recordQuery('req-1', 'SELECT * FROM posts', 10);
      detector.recordQuery('req-1', 'SELECT * FROM comments', 10);

      const result = detector.endRequest('req-1');

      expect(result.detected).toBe(false);
    });

    it('should detect medium severity N+1', () => {
      detector.startRequest('req-1');

      // 3 similar queries - medium severity
      for (let i = 0; i < 3; i++) {
        detector.recordQuery('req-1', 'SELECT * FROM posts WHERE user_id = ?', 5);
      }

      const result = detector.endRequest('req-1');

      expect(result.detected).toBe(true);
      expect(result.severity).toBe('medium');
    });

    it('should detect low severity N+1', () => {
      detector.startRequest('req-1');

      // 2 similar queries - low severity
      for (let i = 0; i < 2; i++) {
        detector.recordQuery('req-1', 'SELECT * FROM posts WHERE user_id = ?', 5);
      }

      const result = detector.endRequest('req-1');

      expect(result.detected).toBe(true);
      expect(result.severity).toBe('low');
    });
  });

  describe('pattern analysis', () => {
    it('should extract table name from query', () => {
      detector.startRequest('req-1');
      detector.recordQuery('req-1', 'SELECT * FROM users WHERE id = ?', 10);

      const result = detector.endRequest('req-1');

      expect(result.patterns[0].tableName).toBe('users');
    });

    it('should extract where clause pattern', () => {
      detector.startRequest('req-1');
      detector.recordQuery('req-1', 'SELECT * FROM users WHERE id = ? AND status = ?', 10);

      const result = detector.endRequest('req-1');

      expect(result.patterns[0].whereClause).toBeDefined();
    });

    it('should create pattern key for grouping', () => {
      detector.startRequest('req-1');

      detector.recordQuery('req-1', 'SELECT * FROM users WHERE id = ?', 10);
      detector.recordQuery('req-1', 'SELECT * FROM users WHERE id = ?', 15);

      const result = detector.endRequest('req-1');

      expect(result.patterns[0].patternKey).toBeDefined();
      expect(result.patterns[0].count).toBe(2);
    });
  });

  describe('optimization suggestions', () => {
    it('should suggest batch queries for N+1', () => {
      detector.startRequest('req-1');

      for (let i = 0; i < 5; i++) {
        detector.recordQuery('req-1', 'SELECT * FROM posts WHERE user_id = ?', 5);
      }

      const result = detector.endRequest('req-1');

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]).toContain('batch');
    });

    it('should suggest eager loading', () => {
      detector.startRequest('req-1');

      for (let i = 0; i < 5; i++) {
        detector.recordQuery('req-1', 'SELECT * FROM posts WHERE user_id = ?', 5);
      }

      const result = detector.endRequest('req-1');

      expect(result.suggestions).toContain('Use eager loading or JOIN queries to fetch related data in a single query');
    });
  });

  describe('batch query generation', () => {
    it('should generate batch query for SELECT', () => {
      const options = detector.generateBatchQuery(
        'SELECT * FROM posts WHERE user_id = ?',
        [1, 2, 3]
      );

      expect(options.sql).toContain('IN');
      expect(options.params).toHaveLength(3);
    });

    it('should generate batch query for INSERT', () => {
      const options = detector.generateBatchQuery(
        'INSERT INTO posts (title, user_id) VALUES (?, ?)',
        [
          ['Post 1', 1],
          ['Post 2', 2],
        ]
      );

      expect(options.sql).toContain('VALUES');
      expect(options.params).toHaveLength(2);
    });

    it('should generate batch query for UPDATE', () => {
      const options = detector.generateBatchQuery(
        'UPDATE posts SET status = ? WHERE user_id = ?',
        [['published', 1], ['published', 2]]
      );

      expect(options.sql).toContain('UPDATE');
      expect(options.params).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty requests', () => {
      detector.startRequest('req-1');
      const result = detector.endRequest('req-1');

      expect(result.detected).toBe(false);
      expect(result.patterns).toEqual([]);
    });

    it('should handle queries without WHERE clause', () => {
      detector.startRequest('req-1');
      detector.recordQuery('req-1', 'SELECT * FROM users', 10);

      const result = detector.endRequest('req-1');

      expect(result.patterns[0].whereClause).toBeUndefined();
    });

    it('should handle complex queries', () => {
      detector.startRequest('req-1');
      detector.recordQuery(
        'req-1',
        'SELECT u.*, COUNT(p.id) as post_count FROM users u LEFT JOIN posts p ON u.id = p.user_id WHERE u.status = ? GROUP BY u.id HAVING post_count > ? ORDER BY post_count DESC',
        50
      );

      const result = detector.endRequest('req-1');

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].patternType).toBe('select');
    });

    it('should handle unknown query types', () => {
      detector.startRequest('req-1');
      detector.recordQuery('req-1', 'PRAGMA table_info(users)', 5);

      const result = detector.endRequest('req-1');

      expect(result.patterns[0].patternType).toBe('unknown');
    });
  });

  describe('enable/disable', () => {
    it('should enable detection', () => {
      detector.setEnabled(true);
      detector.startRequest('req-1');
      detector.recordQuery('req-1', 'SELECT * FROM users', 10);

      expect(() => detector.endRequest('req-1')).not.toThrow();
    });

    it('should disable detection', () => {
      detector.setEnabled(false);
      detector.startRequest('req-1');

      // Should not throw even when disabled
      expect(() => detector.recordQuery('req-1', 'SELECT * FROM users', 10)).not.toThrow();
    });

    it('should track enabled state', () => {
      detector.setEnabled(false);
      expect(detector.isEnabled()).toBe(false);

      detector.setEnabled(true);
      expect(detector.isEnabled()).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should track query count', () => {
      detector.startRequest('req-1');

      for (let i = 0; i < 5; i++) {
        detector.recordQuery('req-1', 'SELECT * FROM users', 10);
      }

      const result = detector.endRequest('req-1');
      expect(result.patterns[0].count).toBe(5);
    });

    it('should track total execution time', () => {
      detector.startRequest('req-1');

      detector.recordQuery('req-1', 'SELECT * FROM users', 10);
      detector.recordQuery('req-1', 'SELECT * FROM users', 15);
      detector.recordQuery('req-1', 'SELECT * FROM users', 20);

      const result = detector.endRequest('req-1');
      expect(result.patterns[0].totalTime).toBe(45); // 10 + 15 + 20
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const detector1 = getNPlus1Detector();
      const detector2 = getNPlus1Detector();

      expect(detector1).toBe(detector2);
    });

    it('should maintain state across instances', () => {
      const detector1 = getNPlus1Detector();
      detector1.setEnabled(false);

      const detector2 = getNPlus1Detector();
      expect(detector2.isEnabled()).toBe(false);
    });
  });
});
