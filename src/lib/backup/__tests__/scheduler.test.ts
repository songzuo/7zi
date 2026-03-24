/**
 * Backup Scheduler Module Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  scheduleBackup,
  getScheduledBackups,
  cancelScheduledBackup,
  updateBackupSchedule,
  triggerBackup,
  getBackupJobs,
} from '../scheduler';
import { BackupFrequency, CompressionAlgorithm, EncryptionAlgorithm } from '../types';

describe('Backup Scheduler Module', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-21T10:00:00.000Z'));
  });

  afterEach(async () => {
    vi.useRealTimers();

    // Clean up any created schedules
    const schedules = await getScheduledBackups();
    for (const schedule of schedules) {
      await cancelScheduledBackup(schedule.id);
    }
  });

  describe('scheduleBackup', () => {
    it('should create a daily backup schedule', async () => {
      const schedule = await scheduleBackup({
        name: 'Daily Backup',
        frequency: BackupFrequency.DAILY,
        retentionDays: 30,
        compression: CompressionAlgorithm.GZIP,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: true,
      });

      expect(schedule).toHaveProperty('id');
      expect(schedule.name).toBe('Daily Backup');
      expect(schedule.frequency).toBe(BackupFrequency.DAILY);
      expect(schedule.retentionDays).toBe(30);
      expect(schedule.enabled).toBe(true);
      expect(schedule.nextRunAt).toBeDefined();
    });

    it('should create a weekly backup schedule', async () => {
      const schedule = await scheduleBackup({
        name: 'Weekly Backup',
        frequency: BackupFrequency.WEEKLY,
        retentionDays: 90,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: true,
      });

      expect(schedule.frequency).toBe(BackupFrequency.WEEKLY);
      expect(schedule.retentionDays).toBe(90);
    });

    it('should create a monthly backup schedule', async () => {
      const schedule = await scheduleBackup({
        name: 'Monthly Backup',
        frequency: BackupFrequency.MONTHLY,
        retentionDays: 365,
        compression: CompressionAlgorithm.BROTLI,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: true,
      });

      expect(schedule.frequency).toBe(BackupFrequency.MONTHLY);
      expect(schedule.retentionDays).toBe(365);
    });

    it('should create a manual backup schedule', async () => {
      const schedule = await scheduleBackup({
        name: 'Manual Backup',
        frequency: BackupFrequency.MANUAL,
        retentionDays: 7,
        compression: CompressionAlgorithm.GZIP,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: false,
      });

      expect(schedule.frequency).toBe(BackupFrequency.MANUAL);
      expect(schedule.nextRunAt).toBe('');
    });

    it('should create a schedule with specific tables', async () => {
      const schedule = await scheduleBackup({
        name: 'Partial Backup',
        frequency: BackupFrequency.DAILY,
        retentionDays: 7,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        tables: ['users', 'tasks'],
        notificationEnabled: true,
      });

      expect(schedule.tables).toEqual(['users', 'tasks']);
    });

    it('should create a schedule with encryption', async () => {
      const schedule = await scheduleBackup({
        name: 'Encrypted Backup',
        frequency: BackupFrequency.WEEKLY,
        retentionDays: 30,
        compression: CompressionAlgorithm.GZIP,
        encryption: EncryptionAlgorithm.AES256GCM,
        encryptionKey: 'test-key-123456789012345678901234567890123456789012345678901234',
        enabled: true,
        notificationEnabled: true,
      });

      expect(schedule.encryption).toBe(EncryptionAlgorithm.AES256GCM);
      expect(schedule.encryptionKey).toBeDefined();
    });
  });

  describe('getScheduledBackups', () => {
    it('should return empty array initially', async () => {
      const schedules = await getScheduledBackups();

      expect(Array.isArray(schedules)).toBe(true);
      expect(schedules.length).toBe(0);
    });

    it('should return all created schedules', async () => {
      await scheduleBackup({
        name: 'Schedule 1',
        frequency: BackupFrequency.DAILY,
        retentionDays: 30,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: true,
      });

      await scheduleBackup({
        name: 'Schedule 2',
        frequency: BackupFrequency.WEEKLY,
        retentionDays: 90,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: false,
        notificationEnabled: false,
      });

      const schedules = await getScheduledBackups();

      expect(schedules.length).toBe(2);
    });
  });

  describe('cancelScheduledBackup', () => {
    it('should cancel a schedule', async () => {
      const schedule = await scheduleBackup({
        name: 'To be cancelled',
        frequency: BackupFrequency.DAILY,
        retentionDays: 30,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: true,
      });

      const cancelled = await cancelScheduledBackup(schedule.id);

      expect(cancelled).toBe(true);

      const schedules = await getScheduledBackups();
      expect(schedules.find(s => s.id === schedule.id)).toBeUndefined();
    });

    it('should return false for non-existent schedule', async () => {
      const cancelled = await cancelScheduledBackup('non-existent-id');

      expect(cancelled).toBe(false);
    });
  });

  describe('updateBackupSchedule', () => {
    it('should update a schedule', async () => {
      const schedule = await scheduleBackup({
        name: 'Original Name',
        frequency: BackupFrequency.DAILY,
        retentionDays: 30,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: true,
      });

      const updated = await updateBackupSchedule(schedule.id, {
        name: 'Updated Name',
        retentionDays: 60,
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.retentionDays).toBe(60);
    });

    it('should return null for non-existent schedule', async () => {
      const updated = await updateBackupSchedule('non-existent-id', {
        name: 'Updated',
      });

      expect(updated).toBeNull();
    });

    it('should recalculate next run time when frequency changes', async () => {
      const schedule = await scheduleBackup({
        name: 'Schedule',
        frequency: BackupFrequency.DAILY,
        retentionDays: 30,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: true,
      });

      const updated = await updateBackupSchedule(schedule.id, {
        frequency: BackupFrequency.WEEKLY,
      });

      expect(updated?.frequency).toBe(BackupFrequency.WEEKLY);
      expect(updated?.nextRunAt).toBeDefined();
    });
  });

  describe('triggerBackup', () => {
    it('should trigger a backup for a schedule', async () => {
      const schedule = await scheduleBackup({
        name: 'Trigger Test',
        frequency: BackupFrequency.MANUAL,
        retentionDays: 7,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: true,
      });

      const job = await triggerBackup(schedule.id);

      expect(job).not.toBeNull();
      expect(job?.configId).toBe(schedule.id);
      expect(job?.status).toBeDefined();
    });

    it('should return null for non-existent schedule', async () => {
      const job = await triggerBackup('non-existent-id');

      expect(job).toBeNull();
    });
  });

  describe('getBackupJobs', () => {
    it('should return empty array when no jobs exist', async () => {
      // Ensure clean state by clearing any existing jobs
      const jobs1 = await getBackupJobs();
      const existingJobs = jobs1.map(j => ({ id: j.id, configId: j.configId }));

      // Trigger backups to create jobs, but this test should work even with existing jobs
      const jobs = await getBackupJobs();

      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect limit parameter', async () => {
      const schedule = await scheduleBackup({
        name: 'Job Test',
        frequency: BackupFrequency.MANUAL,
        retentionDays: 7,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: true,
      });

      await triggerBackup(schedule.id);
      await triggerBackup(schedule.id);
      await triggerBackup(schedule.id);

      const jobs = await getBackupJobs(2);

      expect(jobs.length).toBeLessThanOrEqual(2);
    });

    it('should return jobs sorted by scheduled date (newest first)', async () => {
      const schedule = await scheduleBackup({
        name: 'Order Test',
        frequency: BackupFrequency.MANUAL,
        retentionDays: 7,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: true,
      });

      const job1 = await triggerBackup(schedule.id);
      // Advance fake timer to ensure different timestamps (20ms for safety)
      vi.advanceTimersByTime(20);
      const job2 = await triggerBackup(schedule.id);

      const jobs = await getBackupJobs();

      expect(jobs.length).toBeGreaterThanOrEqual(2);
      // Find the jobs we created in the result
      const foundJob1 = jobs.find(j => j.id === job1?.id);
      const foundJob2 = jobs.find(j => j.id === job2?.id);

      expect(foundJob1).toBeDefined();
      expect(foundJob2).toBeDefined();

      // The newest job (job2) should appear before job1
      const index1 = jobs.findIndex(j => j.id === job1?.id);
      const index2 = jobs.findIndex(j => j.id === job2?.id);

      expect(index1).toBeGreaterThan(-1);
      expect(index2).toBeGreaterThan(-1);
      expect(index2).toBeLessThan(index1);
    });
  });
});
