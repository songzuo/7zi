/**
 * ID Generator Tests
 * ID 生成工具单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateId,
  generateSlugId,
  generateShortId,
  generateRequestId,
  generateTaskId,
  generateNodeId,
  generateEdgeId,
  generateActivityId,
  generateCommentId,
  generateNotificationId,
  generateLogId,
  type IdPrefix,
} from '@/lib/id';

describe('generateId', () => {
  it('应生成带前缀的 ID', () => {
    const id = generateId('task');
    expect(id).toMatch(/^task_\d+_[a-z0-9]+$/);
  });

  it('应包含时间戳', () => {
    const before = Date.now();
    const id = generateId('task');
    const after = Date.now();

    const timestamp = parseInt(id.split('_')[1], 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('应包含随机字符串（默认9位）', () => {
    const id = generateId('task');
    const parts = id.split('_');
    expect(parts[2].length).toBe(9);
  });

  it('应支持自定义随机长度', () => {
    const id = generateId('task', 6);
    const parts = id.split('_');
    expect(parts[2].length).toBe(6);
  });

  it('应支持所有预定义前缀', () => {
    const prefixes: IdPrefix[] = [
      'req', 'task', 'node', 'edge', 'act',
      'log', 'gene', 'dream', 'comment', 'notif', 'proj', 'user'
    ];

    prefixes.forEach(prefix => {
      const id = generateId(prefix);
      expect(id.startsWith(`${prefix}_`)).toBe(true);
    });
  });

  it('应生成唯一 ID', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId('task'));
    }
    expect(ids.size).toBe(100);
  });
});

describe('generateSlugId', () => {
  it('应生成带连字符的 ID', () => {
    const id = generateSlugId('custom');
    expect(id).toMatch(/^custom-\d+-[a-z0-9]+$/);
  });

  it('应支持任意前缀', () => {
    const id = generateSlugId('my-prefix');
    expect(id.startsWith('my-prefix-')).toBe(true);
  });

  it('应包含时间戳', () => {
    const before = Date.now();
    const id = generateSlugId('test');
    const after = Date.now();

    const parts = id.split('-');
    const timestamp = parseInt(parts[1], 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});

describe('generateShortId', () => {
  it('应生成短 ID（4位随机）', () => {
    const id = generateShortId('task');
    const parts = id.split('_');
    expect(parts[2].length).toBe(4);
  });

  it('应包含正确的前缀', () => {
    const id = generateShortId('act');
    expect(id.startsWith('act_')).toBe(true);
  });
});

describe('便捷函数', () => {
  describe('generateRequestId', () => {
    it('应生成 req 前缀的 ID', () => {
      const id = generateRequestId();
      expect(id).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });

  describe('generateTaskId', () => {
    it('应生成 task 前缀的 ID', () => {
      const id = generateTaskId();
      expect(id).toMatch(/^task_\d+_[a-z0-9]+$/);
    });
  });

  describe('generateNodeId', () => {
    it('应生成 node 前缀的 ID（连字符格式）', () => {
      const id = generateNodeId();
      expect(id).toMatch(/^node-\d+-[a-z0-9]+$/);
    });
  });

  describe('generateEdgeId', () => {
    it('应生成 edge 前缀的 ID（连字符格式）', () => {
      const id = generateEdgeId();
      expect(id).toMatch(/^edge-\d+-[a-z0-9]+$/);
    });
  });

  describe('generateActivityId', () => {
    it('应生成 act 前缀的 ID', () => {
      const id = generateActivityId();
      expect(id).toMatch(/^act_\d+_[a-z0-9]+$/);
    });
  });

  describe('generateCommentId', () => {
    it('应生成 comment 前缀的 ID', () => {
      const id = generateCommentId();
      expect(id).toMatch(/^comment_\d+_[a-z0-9]+$/);
    });
  });

  describe('generateNotificationId', () => {
    it('应生成 notif 前缀的 ID', () => {
      const id = generateNotificationId();
      expect(id).toMatch(/^notif_\d+_[a-z0-9]+$/);
    });
  });

  describe('generateLogId', () => {
    it('应生成 log 前缀的 ID', () => {
      const id = generateLogId();
      expect(id).toMatch(/^log_\d+_[a-z0-9]+$/);
    });
  });
});

describe('ID 格式验证', () => {
  it('ID 应只包含小写字母、数字、下划线', () => {
    const id = generateId('task');
    expect(id).toMatch(/^[a-z0-9_]+$/);
  });

  it('SlugId 应只包含小写字母、数字、连字符', () => {
    const id = generateSlugId('node');
    expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('应能从 ID 提取时间戳', () => {
    const before = Date.now();
    const id = generateId('task');
    const after = Date.now();

    const parts = id.split('_');
    const timestamp = parseInt(parts[1], 10);

    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});

describe('并发安全性', () => {
  it('应在快速连续调用时生成唯一 ID', () => {
    const ids = new Set<string>();
    
    // 模拟并发生成
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId('task'));
    }

    expect(ids.size).toBe(1000);
  });

  it('应在同一毫秒内生成唯一 ID', () => {
    vi.useFakeTimers();
    const fixedTime = 1710489600000;
    vi.setSystemTime(fixedTime);

    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId('task'));
    }

    // 所有 ID 的时间戳相同，但随机部分应不同
    expect(ids.size).toBe(100);

    vi.useRealTimers();
  });
});

describe('边界情况', () => {
  it('应支持最短随机长度（1位）', () => {
    const id = generateId('task', 1);
    const parts = id.split('_');
    expect(parts[2].length).toBe(1);
  });

  it('应支持较长随机长度（20位）', () => {
    const id = generateId('task', 20);
    const parts = id.split('_');
    // generateRandomString 长度就是传入的 randomLength
    expect(parts[2].length).toBe(20);
  });

  it('不同前缀应产生不同 ID', () => {
    const id1 = generateId('task');
    const id2 = generateId('user');

    expect(id1).not.toBe(id2);
    expect(id1.startsWith('task_')).toBe(true);
    expect(id2.startsWith('user_')).toBe(true);
  });
});
