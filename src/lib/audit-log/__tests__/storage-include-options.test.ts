/**
 * 审计日志 - 存储层 include* 开关一致性测试
 * @module lib/audit-log/__tests__/storage-include-options.test
 *
 * 回归：memory-storage 原实现用 `if (!options.includeDetails)` 判断，
 * undefined（不传）取反为 true，于是只要调用方没显式带 includeDetails，
 * details / changes / metadata 就被静默删掉；
 * file-storage 则完全不处理这些开关。
 * 两个后端语义相反 —— 同一份代码换个存储结果就不一样。
 *
 * 本文件锁定统一后的语义：只有显式传 false 才裁剪。
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { MemoryAuditStorage } from '../storage/memory-storage.js';
import { FileAuditStorage } from '../storage/file-storage.js';
import { AuditEventBuilder } from '../event-builder.js';
import type { AuditEvent, AuditLogStorage } from '../types.js';

function makeEvent(): AuditEvent {
  return new AuditEventBuilder()
    .withId('evt-1')
    .withTimestamp(new Date('2026-01-01T00:00:00.000Z'))
    .withLevel('info')
    .withCategory('data')
    .withAction('update')
    .withStatus('success')
    .withSeverity('low')
    .withMessage('Test event')
    .withUser({ userId: 'u1', username: 'john' })
    .withDetails({ note: 'keep me' })
    .withChanges([{ field: 'title', oldValue: 'a', newValue: 'b' }])
    .withMetadata({ meta: 'value' })
    .build();
}

describe('存储层 include* 开关一致性', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-storage-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function withBackends(
    fn: (storage: AuditLogStorage, name: string) => Promise<void>
  ): Promise<void> {
    const memory = new MemoryAuditStorage();
    await memory.write(makeEvent());
    await fn(memory, 'memory');

    const file = new FileAuditStorage({ basePath: tmpDir });
    await file.write(makeEvent());
    // file-storage 有写入缓冲，close() 会把缓冲刷盘
    await file.close();
    await fn(file, 'file');
  }

  it('不传 include* 时应保留 details / changes / metadata', async () => {
    await withBackends(async (storage, name) => {
      const result = await storage.query({ filter: {} });

      expect(result.data[0].details, `${name} details`).toEqual({
        note: 'keep me',
      });
      expect(result.data[0].changes, `${name} changes`).toHaveLength(1);
      expect(result.data[0].metadata, `${name} metadata`).toEqual({
        meta: 'value',
      });
    });
  });

  it('includeDetails 为 false 时应裁掉 details', async () => {
    await withBackends(async (storage, name) => {
      const result = await storage.query({
        filter: {},
        includeDetails: false,
      });

      expect(result.data[0].details, `${name} details`).toBeUndefined();
      // 其它字段不受影响
      expect(result.data[0].changes, `${name} changes`).toHaveLength(1);
    });
  });

  it('includeChanges 为 false 时应裁掉 changes', async () => {
    await withBackends(async (storage, name) => {
      const result = await storage.query({
        filter: {},
        includeChanges: false,
      });

      expect(result.data[0].changes, `${name} changes`).toBeUndefined();
      expect(result.data[0].details, `${name} details`).toBeDefined();
    });
  });

  it('includeMetadata 为 false 时应裁掉 metadata', async () => {
    await withBackends(async (storage, name) => {
      const result = await storage.query({
        filter: {},
        includeMetadata: false,
      });

      expect(result.data[0].metadata, `${name} metadata`).toBeUndefined();
      expect(result.data[0].details, `${name} details`).toBeDefined();
    });
  });

  it('三个开关都为 false 时只保留基础字段', async () => {
    await withBackends(async (storage, name) => {
      const result = await storage.query({
        filter: {},
        includeDetails: false,
        includeChanges: false,
        includeMetadata: false,
      });

      expect(result.data[0].details, `${name} details`).toBeUndefined();
      expect(result.data[0].changes, `${name} changes`).toBeUndefined();
      expect(result.data[0].metadata, `${name} metadata`).toBeUndefined();
      expect(result.data[0].id).toBe('evt-1');
      expect(result.data[0].message).toBe('Test event');
    });
  });
});
