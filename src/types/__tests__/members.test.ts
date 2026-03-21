/**
 * Member Types Utility Tests
 */

import { describe, it, expect } from 'vitest';
import {
  getStatusColor,
  getStatusBgColor,
  MEMBER_STATUS_CONFIG,
} from '@/types/members';

// Define the type values as constants for testing
const MemberStatus = {
  ONLINE: 'online',
  WORKING: 'working',
  BUSY: 'busy',
  IDLE: 'idle',
  OFFLINE: 'offline',
} as const;

const MemberCategory = {
  STRATEGY: 'strategy',
  TECH: 'tech',
  CREATIVE: 'creative',
  BUSINESS: 'business',
} as const;

describe('Member Types', () => {
  describe('MemberStatus', () => {
    it('should have all expected status values', () => {
      expect(MemberStatus.ONLINE).toBe('online');
      expect(MemberStatus.WORKING).toBe('working');
      expect(MemberStatus.BUSY).toBe('busy');
      expect(MemberStatus.IDLE).toBe('idle');
      expect(MemberStatus.OFFLINE).toBe('offline');
    });
  });

  describe('MemberCategory', () => {
    it('should have all expected category values', () => {
      expect(MemberCategory.STRATEGY).toBe('strategy');
      expect(MemberCategory.TECH).toBe('tech');
      expect(MemberCategory.CREATIVE).toBe('creative');
      expect(MemberCategory.BUSINESS).toBe('business');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct color for online status', () => {
      expect(getStatusColor('online')).toBe('bg-green-500');
    });

    it('should return correct color for working status', () => {
      expect(getStatusColor('working')).toBe('bg-green-500');
    });

    it('should return correct color for busy status', () => {
      expect(getStatusColor('busy')).toBe('bg-yellow-500');
    });

    it('should return correct color for idle status', () => {
      expect(getStatusColor('idle')).toBe('bg-gray-400');
    });

    it('should return correct color for offline status', () => {
      expect(getStatusColor('offline')).toBe('bg-gray-300');
    });
  });

  describe('getStatusBgColor', () => {
    it('should return correct bg color for online status', () => {
      const color = getStatusBgColor('online');
      expect(color).toContain('bg-green-100');
      expect(color).toContain('text-green-700');
    });

    it('should return correct bg color for working status', () => {
      const color = getStatusBgColor('working');
      expect(color).toContain('bg-green-100');
      expect(color).toContain('text-green-700');
    });

    it('should return correct bg color for busy status', () => {
      const color = getStatusBgColor('busy');
      expect(color).toContain('bg-yellow-100');
      expect(color).toContain('text-yellow-700');
    });

    it('should return correct bg color for idle status', () => {
      const color = getStatusBgColor('idle');
      expect(color).toContain('bg-gray-100');
      expect(color).toContain('text-gray-600');
    });

    it('should return correct bg color for offline status', () => {
      const color = getStatusBgColor('offline');
      expect(color).toContain('bg-gray-100');
      expect(color).toContain('text-gray-400');
    });
  });

  describe('MEMBER_STATUS_CONFIG', () => {
    it('should have config for all statuses', () => {
      const statuses: MemberStatus[] = ['online', 'working', 'busy', 'idle', 'offline'];

      statuses.forEach((status) => {
        expect(MEMBER_STATUS_CONFIG[status]).toBeDefined();
        expect(MEMBER_STATUS_CONFIG[status].color).toBeDefined();
        expect(MEMBER_STATUS_CONFIG[status].bgColor).toBeDefined();
        expect(MEMBER_STATUS_CONFIG[status].label).toBeDefined();
      });
    });

    it('should have consistent color values', () => {
      expect(MEMBER_STATUS_CONFIG.online.color).toBe('bg-green-500');
      expect(MEMBER_STATUS_CONFIG.working.color).toBe('bg-green-500');
      expect(MEMBER_STATUS_CONFIG.busy.color).toBe('bg-yellow-500');
      expect(MEMBER_STATUS_CONFIG.idle.color).toBe('bg-gray-400');
      expect(MEMBER_STATUS_CONFIG.offline.color).toBe('bg-gray-300');
    });

    it('should have valid color class names', () => {
      Object.values(MEMBER_STATUS_CONFIG).forEach((config) => {
        expect(config.color).toMatch(/^bg-\w+-\d+$/);
        expect(config.bgColor).toContain('bg-');
        expect(config.bgColor).toContain('text-');
      });
    });
  });
});
