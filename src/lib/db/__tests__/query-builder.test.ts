/**
 * Query Builder Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QueryBuilder } from '../query-builder';
import type {
  QueryBuilderConfig,
  QueryCondition,
  JoinConfig,
  PaginationOptions,
  SortOptions,
} from '../query-builder';

describe('QueryBuilder', () => {
  let builder: QueryBuilder;

  beforeEach(() => {
    builder = new QueryBuilder({ from: 'users' });
  });

  describe('Constructor', () => {
    it('should create builder with basic config', () => {
      const qb = new QueryBuilder({ from: 'users' });
      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('should accept initial conditions', () => {
      const conditions: QueryCondition[] = [
        { condition: 'status = ?', value: 'active' },
      ];
      const qb = new QueryBuilder({ from: 'users', conditions });
      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('should accept pagination options', () => {
      const pagination: PaginationOptions = { limit: 10, offset: 0 };
      const qb = new QueryBuilder({ from: 'users', pagination });
      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('should accept sort options', () => {
      const sort: SortOptions = { orderBy: 'created_at', sortOrder: 'DESC' };
      const qb = new QueryBuilder({ from: 'users', sort });
      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('should accept select columns', () => {
      const select = ['id', 'name', 'email'];
      const qb = new QueryBuilder({ from: 'users', select });
      expect(qb).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('where', () => {
    it('should add single condition', () => {
      builder.where('status = ?', 'active');
      const result = builder.build();
      expect(result.sql).toContain('WHERE status = ?');
      expect(result.params).toContain('active');
    });

    it('should add multiple conditions', () => {
      builder.where('status = ?', 'active');
      builder.where('role = ?', 'admin');
      const result = builder.build();
      expect(result.sql).toContain('WHERE status = ? AND role = ?');
      expect(result.params).toEqual(['active', 'admin']);
    });

    it('should handle OR conditions', () => {
      builder.where('(status = ? OR role = ?)', ['active', 'admin']);
      const result = builder.build();
      expect(result.sql).toContain('WHERE (status = ? OR role = ?)');
    });

    it('should chain multiple where calls', () => {
      const query = builder
        .where('id = ?', 1)
        .where('name = ?', 'John')
        .build();
      expect(query.sql).toContain('WHERE id = ? AND name = ?');
    });
  });

  describe('join', () => {
    it('should add INNER JOIN', () => {
      builder.join('INNER', 'posts', 'users.id = posts.user_id');
      const result = builder.build();
      expect(result.sql).toContain('INNER JOIN posts ON users.id = posts.user_id');
    });

    it('should add LEFT JOIN', () => {
      builder.join('LEFT', 'posts', 'users.id = posts.user_id');
      const result = builder.build();
      expect(result.sql).toContain('LEFT JOIN posts ON users.id = posts.user_id');
    });

    it('should add multiple JOINs', () => {
      builder.join('INNER', 'posts', 'users.id = posts.user_id');
      builder.join('LEFT', 'comments', 'posts.id = comments.post_id');
      const result = builder.build();
      expect(result.sql).toContain('INNER JOIN');
      expect(result.sql).toContain('LEFT JOIN');
    });

    it('should support JOIN with alias', () => {
      builder.join('INNER', 'posts', 'users.id = p.user_id', 'p');
      const result = builder.build();
      expect(result.sql).toContain('INNER JOIN posts AS p ON users.id = p.user_id');
    });
  });

  describe('orderBy', () => {
    it('should add ORDER BY ASC', () => {
      builder.orderBy('created_at', 'ASC');
      const result = builder.build();
      expect(result.sql).toContain('ORDER BY created_at ASC');
    });

    it('should add ORDER BY DESC', () => {
      builder.orderBy('created_at', 'DESC');
      const result = builder.build();
      expect(result.sql).toContain('ORDER BY created_at DESC');
    });

    it('should default to ASC', () => {
      builder.orderBy('created_at');
      const result = builder.build();
      expect(result.sql).toContain('ORDER BY created_at ASC');
    });

    it('should handle multiple orderBy calls (last one wins)', () => {
      builder.orderBy('created_at', 'DESC');
      builder.orderBy('id', 'ASC');
      const result = builder.build();
      // Only the last ORDER BY is kept
      expect(result.sql).toContain('ORDER BY id ASC');
      expect(result.sql).not.toContain('created_at');
    });
  });

  describe('paginate', () => {
    it('should add LIMIT', () => {
      builder.paginate(10);
      const result = builder.build();
      expect(result.sql).toContain('LIMIT ?');
      expect(result.params).toContain(10);
    });

    it('should add OFFSET', () => {
      builder.paginate(10, 20);
      const result = builder.build();
      expect(result.sql).toContain('OFFSET ?');
      expect(result.params).toContain(20);
    });

    it('should add both LIMIT and OFFSET', () => {
      builder.paginate(10, 20);
      const result = builder.build();
      expect(result.sql).toContain('LIMIT ?');
      expect(result.sql).toContain('OFFSET ?');
      expect(result.params).toEqual([10, 20]);
    });

    it('should handle pagination correctly', () => {
      builder.paginate(10, 0);
      const result = builder.build();
      expect(result.sql).toContain('LIMIT ?');
      expect(result.params).toContain(10);
    });
  });

  describe('select', () => {
    it('should set select columns', () => {
      builder.select(['id', 'name', 'email']);
      const result = builder.build();
      expect(result.sql).toContain('SELECT id, name, email');
    });

    it('should default to * when no columns specified', () => {
      const result = builder.build();
      expect(result.sql).toContain('SELECT *');
    });

    it('should handle single column', () => {
      builder.select(['id']);
      const result = builder.build();
      expect(result.sql).toContain('SELECT id');
    });
  });

  describe('groupBy', () => {
    it('should add GROUP BY', () => {
      builder.groupBy(['status']);
      const result = builder.build();
      expect(result.sql).toContain('GROUP BY status');
    });

    it('should handle multiple group by columns', () => {
      builder.groupBy(['status', 'role']);
      const result = builder.build();
      expect(result.sql).toContain('GROUP BY status, role');
    });
  });

  describe('having', () => {
    it('should add HAVING clause', () => {
      builder.groupBy(['status']);
      builder.having('COUNT(*) > ?', 5);
      const result = builder.build();
      expect(result.sql).toContain('HAVING COUNT(*) > ?');
    });
  });

  describe('distinct', () => {
    it('should add DISTINCT', () => {
      builder.distinct(true);
      const result = builder.build();
      expect(result.sql).toContain('SELECT DISTINCT');
    });

    it('should remove DISTINCT when false', () => {
      builder.distinct(false);
      const result = builder.build();
      expect(result.sql).not.toContain('DISTINCT');
    });
  });

  describe('build', () => {
    it('should build basic SELECT query', () => {
      const result = builder.build();
      expect(result.sql).toBe('SELECT * FROM users');
      expect(result.params).toEqual([]);
    });

    it('should build complete query', () => {
      builder
        .select(['id', 'name'])
        .where('status = ?', 'active')
        .orderBy('id', 'ASC')
        .paginate(10);

      const result = builder.build();
      expect(result.sql).toContain('SELECT id, name');
      expect(result.sql).toContain('FROM users');
      expect(result.sql).toContain('WHERE status = ?');
      expect(result.sql).toContain('ORDER BY id ASC');
      expect(result.sql).toContain('LIMIT ?');
      expect(result.params).toEqual(['active', 10]);
    });

    it('should build complex query with all features', () => {
      builder
        .distinct(true)
        .select(['u.id', 'COUNT(p.id) as post_count'])
        .join('INNER', 'posts', 'u.id = p.user_id')
        .where('u.status = ?', 'active')
        .groupBy(['u.id'])
        .having('COUNT(p.id) > ?', 5)
        .orderBy('post_count', 'DESC')
        .paginate(20, 0);

      const result = builder.build();
      expect(result.sql).toContain('SELECT DISTINCT u.id, COUNT(p.id) as post_count');
      expect(result.sql).toContain('FROM users');
      expect(result.sql).toContain('INNER JOIN posts');
      expect(result.sql).toContain('ON u.id = p.user_id');
      expect(result.sql).toContain('WHERE u.status = ?');
      expect(result.sql).toContain('GROUP BY u.id');
      expect(result.sql).toContain('HAVING COUNT(p.id) > ?');
      expect(result.sql).toContain('ORDER BY post_count DESC');
      expect(result.sql).toContain('LIMIT ?');
      expect(result.params).toEqual(['active', 5, 20]);
    });
  });

  describe('reset', () => {
    it('should reset builder to initial state', () => {
      builder
        .where('status = ?', 'active')
        .orderBy('id', 'ASC')
        .paginate(10);

      const result1 = builder.build();
      expect(result1.sql).toContain('WHERE status = ?');

      builder.reset();
      const result2 = builder.build();
      expect(result2.sql).toBe('SELECT * FROM users');
      expect(result2.params).toEqual([]);
    });
  });

  describe('Chaining', () => {
    it('should support method chaining', () => {
      const result = builder
        .select(['id', 'name'])
        .where('status = ?', 'active')
        .orderBy('name', 'ASC')
        .paginate(10)
        .build();

      expect(result.sql).toContain('SELECT id, name');
      expect(result.sql).toContain('WHERE status = ?');
      expect(result.sql).toContain('ORDER BY name ASC');
      expect(result.sql).toContain('LIMIT ?');
      expect(result.params).toEqual(['active', 10]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty conditions', () => {
      const result = builder.build();
      expect(result.sql).not.toContain('WHERE');
    });

    it('should handle null/undefined values', () => {
      builder.where('name IS NULL', null);
      const result = builder.build();
      expect(result.sql).toContain('WHERE name IS NULL');
    });

    it('should handle array parameters', () => {
      builder.where('id IN (?)', [1, 2, 3]);
      const result = builder.build();
      expect(result.sql).toContain('WHERE id IN (?)');
      expect(result.params).toEqual([[1, 2, 3]]);
    });
  });
});
