/**
 * @fileoverview Tests for ID generation utilities
 */

import { describe, it, expect } from 'vitest';
import { generateId, generateUUID } from '../id';

describe('id', () => {
  describe('generateId', () => {
    it('should generate a valid UUID v4 without prefix', () => {
      const id = generateId();

      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate a valid UUID v4 with prefix', () => {
      const id = generateId('user');

      expect(id).toMatch(/^user-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();

      for (let i = 0; i < 100; i++) {
        const id = generateId();
        ids.add(id);
      }

      expect(ids.size).toBe(100);
    });

    it('should handle different prefixes', () => {
      const id1 = generateId('user');
      const id2 = generateId('session');
      const id3 = generateId('order');

      expect(id1).toMatch(/^user-/);
      expect(id2).toMatch(/^session-/);
      expect(id3).toMatch(/^order-/);

      // Extract UUID parts and verify they are different
      const uuid1 = id1.replace('user-', '');
      const uuid2 = id2.replace('session-', '');
      const uuid3 = id3.replace('order-', '');

      expect(uuid1).not.toBe(uuid2);
      expect(uuid2).not.toBe(uuid3);
    });

    it('should handle empty prefix', () => {
      const id = generateId('');

      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should handle special characters in prefix', () => {
      const id = generateId('test_id-123');

      expect(id).toMatch(/^test_id-123-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate UUID v4 with correct version bits', () => {
      const id = generateId();

      // Extract version nibble (position after first dash + 12 chars)
      // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const parts = id.split('-');
      expect(parts[2]).toMatch(/^4[0-9a-f]{3}$/i);

      // Extract variant nibble (first char of 4th segment)
      expect(parts[3]).toMatch(/^[89ab][0-9a-f]{3}$/i);
    });

    it('should be case insensitive (lowercase)', () => {
      const id = generateId();

      expect(id).toBe(id.toLowerCase());
    });
  });

  describe('generateUUID', () => {
    it('should be an alias for generateId', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateId();

      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(uuid2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set();

      for (let i = 0; i < 100; i++) {
        const uuid = generateUUID();
        uuids.add(uuid);
      }

      expect(uuids.size).toBe(100);
    });

    it('should not accept prefix (no arguments)', () => {
      const uuid = generateUUID();

      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      // UUID format always starts with hex, not a prefix string
    });
  });
});
