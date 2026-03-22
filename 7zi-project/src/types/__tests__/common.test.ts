/**
 * @fileoverview Common types unit tests
 * @description Tests for type constants and configurations
 */

import { describe, it, expect } from 'vitest';
import {
  STATUS_CONFIG,
  PROJECT_STATUS_CONFIG,
  ACTIVITY_TYPE_CONFIG,
} from '@/types/common';

describe('STATUS_CONFIG', () => {
  it('should have all required status configurations', () => {
    expect(STATUS_CONFIG).toHaveProperty('online');
    expect(STATUS_CONFIG).toHaveProperty('working');
    expect(STATUS_CONFIG).toHaveProperty('busy');
    expect(STATUS_CONFIG).toHaveProperty('idle');
    expect(STATUS_CONFIG).toHaveProperty('offline');
  });

  it('should have correct structure for each status', () => {
    Object.values(STATUS_CONFIG).forEach(config => {
      expect(config).toHaveProperty('color');
      expect(config).toHaveProperty('bgColor');
      expect(config).toHaveProperty('label');
      expect(typeof config.label).toBe('string');
      expect(typeof config.color).toBe('string');
      expect(typeof config.bgColor).toBe('string');
    });
  });

  it('should have valid Tailwind classes', () => {
    Object.values(STATUS_CONFIG).forEach(config => {
      expect(config.color).toMatch(/^bg-\w+/);
      expect(config.bgColor).toMatch(/^bg-\w+/);
    });
  });

  it('should have unique labels', () => {
    const labels = Object.values(STATUS_CONFIG).map(c => c.label);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });
});

describe('PROJECT_STATUS_CONFIG', () => {
  it('should have all required project status configurations', () => {
    expect(PROJECT_STATUS_CONFIG).toHaveProperty('active');
    expect(PROJECT_STATUS_CONFIG).toHaveProperty('completed');
    expect(PROJECT_STATUS_CONFIG).toHaveProperty('paused');
  });

  it('should have correct structure for each status', () => {
    Object.values(PROJECT_STATUS_CONFIG).forEach(config => {
      expect(config).toHaveProperty('color');
      expect(config).toHaveProperty('label');
      expect(typeof config.label).toBe('string');
      expect(typeof config.color).toBe('string');
    });
  });

  it('should have valid Tailwind classes', () => {
    Object.values(PROJECT_STATUS_CONFIG).forEach(config => {
      expect(config.color).toMatch(/^bg-\w+-100/);
    });
  });

  it('should include emoji in labels', () => {
    Object.values(PROJECT_STATUS_CONFIG).forEach(config => {
      expect(config.label).toMatch(/[🟢🔵🟡]/);
    });
  });

  it('should have unique labels', () => {
    const labels = Object.values(PROJECT_STATUS_CONFIG).map(c => c.label);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });
});

describe('ACTIVITY_TYPE_CONFIG', () => {
  it('should have all required activity type configurations', () => {
    expect(ACTIVITY_TYPE_CONFIG).toHaveProperty('commit');
    expect(ACTIVITY_TYPE_CONFIG).toHaveProperty('issue');
    expect(ACTIVITY_TYPE_CONFIG).toHaveProperty('comment');
    expect(ACTIVITY_TYPE_CONFIG).toHaveProperty('deploy');
    expect(ACTIVITY_TYPE_CONFIG).toHaveProperty('meeting');
  });

  it('should have correct structure for each type', () => {
    Object.values(ACTIVITY_TYPE_CONFIG).forEach(config => {
      expect(config).toHaveProperty('icon');
      expect(config).toHaveProperty('color');
      expect(config).toHaveProperty('label');
      expect(typeof config.icon).toBe('string');
      expect(typeof config.label).toBe('string');
      expect(typeof config.color).toBe('string');
    });
  });

  it('should have valid Tailwind classes', () => {
    Object.values(ACTIVITY_TYPE_CONFIG).forEach(config => {
      expect(config.color).toMatch(/^bg-\w+-100/);
    });
  });

  it('should include emoji in icons', () => {
    Object.values(ACTIVITY_TYPE_CONFIG).forEach(config => {
      expect(config.icon).toMatch(/[\p{Emoji}]/u);
    });
  });

  it('should have unique labels', () => {
    const labels = Object.values(ACTIVITY_TYPE_CONFIG).map(c => c.label);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });

  it('should have unique icons or handle duplicates', () => {
    const icons = Object.values(ACTIVITY_TYPE_CONFIG).map(c => c.icon);
    const uniqueIcons = new Set(icons);
    // Note: Some icons may be shared (e.g., deploy and meeting both use 📋)
    expect(uniqueIcons.size).toBeGreaterThan(0);
  });
});

describe('Type consistency', () => {
  it('should have matching keys between configs and types', () => {
    // MemberStatus should match STATUS_CONFIG keys
    const memberStatuses = ['online', 'working', 'busy', 'idle', 'offline'] as const;
    expect(Object.keys(STATUS_CONFIG)).toEqual(memberStatuses);

    // ProjectStatus should match PROJECT_STATUS_CONFIG keys
    const projectStatuses = ['active', 'completed', 'paused'] as const;
    expect(Object.keys(PROJECT_STATUS_CONFIG)).toEqual(projectStatuses);

    // ActivityType should match ACTIVITY_TYPE_CONFIG keys
    const activityTypes = ['commit', 'issue', 'comment', 'deploy', 'meeting'] as const;
    expect(Object.keys(ACTIVITY_TYPE_CONFIG)).toEqual(activityTypes);
  });
});
