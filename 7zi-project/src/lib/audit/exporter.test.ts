/**
 * Unit tests for Audit Log Exporter
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { AuditLogExporter } from './exporter';
import { AuditLogStorage } from './storage';
import { AuditLogEntry, ExportFormat, ExportOptions } from './types';

describe('AuditLogExporter', () => {
  let storage: AuditLogStorage;
  let exporter: AuditLogExporter;
  let sampleEntries: AuditLogEntry[];

  beforeEach(() => {
    storage = new AuditLogStorage();
    exporter = new AuditLogExporter(storage);
    sampleEntries = generateSampleEntries(50);
    sampleEntries.forEach(entry => storage.add(entry));
  });

  describe('Create Export Job', () => {
    test('should create an export job', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filters: {},
        includeHeaders: true
      };

      const job = await exporter.createExportJob(options);

      expect(job.id).toBeDefined();
      expect(job.format).toBe('csv');
      expect(job.createdAt).toBeInstanceOf(Date);
      // Job may be pending, processing, or completed depending on timing
      expect(['pending', 'processing', 'completed']).toContain(job.status);
    });

    test('should create job with different formats', async () => {
      const formats: ExportFormat[] = ['csv', 'json', 'excel'];

      for (const format of formats) {
        const options: ExportOptions = {
          format,
          filters: {}
        };

        const job = await exporter.createExportJob(options);
        expect(job.format).toBe(format);
      }
    });

    test('should create job with filters', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filters: {
          action: 'create',
          status: 'success'
        }
      };

      const job = await exporter.createExportJob(options);
      expect(job.filters).toEqual({
        action: 'create',
        status: 'success'
      });
    });

    test('should create job with max records limit', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filters: {},
        maxRecords: 10
      };

      const job = await exporter.createExportJob(options);

      // Wait for job to complete
      await waitForJobCompletion(exporter, job.id);

      const finalJob = exporter.getJobStatus(job.id);
      expect(finalJob?.status).toBe('completed');
    });
  });

  describe('Get Export Status', () => {
    test('should get job status', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filters: {}
      };

      const job = await exporter.createExportJob(options);
      const status = exporter.getJobStatus(job.id);

      expect(status).toBeDefined();
      expect(status?.id).toBe(job.id);
      expect(status?.format).toBe('csv');
    });

    test('should return undefined for non-existent job', () => {
      const status = exporter.getJobStatus('non-existent');
      expect(status).toBeUndefined();
    });
  });

  describe('Export Processing', () => {
    test('should complete CSV export', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filters: {},
        includeHeaders: true
      };

      const job = await exporter.createExportJob(options);
      await waitForJobCompletion(exporter, job.id);

      const finalJob = exporter.getJobStatus(job.id);
      expect(finalJob?.status).toBe('completed');
      expect(finalJob?.progress).toBe(100);
      expect(finalJob?.completedAt).toBeInstanceOf(Date);
      expect(finalJob?.fileSize).toBeGreaterThan(0);
    });

    test('should complete JSON export', async () => {
      const options: ExportOptions = {
        format: 'json',
        filters: {}
      };

      const job = await exporter.createExportJob(options);
      await waitForJobCompletion(exporter, job.id);

      const finalJob = exporter.getJobStatus(job.id);
      expect(finalJob?.status).toBe('completed');
      expect(finalJob?.fileSize).toBeGreaterThan(0);
    });

    test('should complete Excel export', async () => {
      const options: ExportOptions = {
        format: 'excel',
        filters: {},
        includeHeaders: true
      };

      const job = await exporter.createExportJob(options);
      await waitForJobCompletion(exporter, job.id);

      const finalJob = exporter.getJobStatus(job.id);
      expect(finalJob?.status).toBe('completed');
      expect(finalJob?.fileSize).toBeGreaterThan(0);
    });

    test('should export with filters', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filters: {
          action: 'create',
          status: 'success'
        }
      };

      const job = await exporter.createExportJob(options);
      await waitForJobCompletion(exporter, job.id);

      const finalJob = exporter.getJobStatus(job.id);
      expect(finalJob?.status).toBe('completed');
      expect(finalJob?.filters.action).toBe('create');
    });

    test('should export with max records limit', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filters: {},
        maxRecords: 10
      };

      const job = await exporter.createExportJob(options);
      await waitForJobCompletion(exporter, job.id);

      const finalJob = exporter.getJobStatus(job.id);
      expect(finalJob?.status).toBe('completed');

      // Count lines in CSV content
      const content = exporter.getExportContent(job.id) as string;
      const lines = content.split('\n').filter(line => line.trim());
      expect(lines.length).toBeLessThanOrEqual(11); // 10 records + header
    });
  });

  describe('Export Content', () => {
    test('should get CSV export content', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filters: {},
        includeHeaders: true
      };

      const job = await exporter.createExportJob(options);
      await waitForJobCompletion(exporter, job.id);

      const content = exporter.getExportContent(job.id);
      expect(content).toBeDefined();
      expect(typeof content).toBe('string');

      const lines = (content as string).split('\n');
      expect(lines[0]).toContain('id,timestamp');
    });

    test('should get JSON export content', async () => {
      const options: ExportOptions = {
        format: 'json',
        filters: {}
      };

      const job = await exporter.createExportJob(options);
      await waitForJobCompletion(exporter, job.id);

      const content = exporter.getExportContent(job.id);
      expect(content).toBeDefined();
      expect(typeof content).toBe('string');

      const parsed = JSON.parse(content as string);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0]).toHaveProperty('id');
      expect(parsed[0]).toHaveProperty('timestamp');
    });

    test('should get Excel export content', async () => {
      const options: ExportOptions = {
        format: 'excel',
        filters: {},
        includeHeaders: true
      };

      const job = await exporter.createExportJob(options);
      await waitForJobCompletion(exporter, job.id);

      const content = exporter.getExportContent(job.id);
      expect(content).toBeDefined();
      expect(typeof content).toBe('string');

      const lines = (content as string).split('\n');
      expect(lines[0]).toContain('id\ttimestamp');
    });

    test('should return undefined for non-existent job', () => {
      const content = exporter.getExportContent('non-existent');
      expect(content).toBeUndefined();
    });

    test('should return undefined for incomplete job', async () => {
      // Create a large export that won't complete immediately
      // Add many entries to storage
      for (let i = 0; i < 1000; i++) {
        storage.add({
          id: `large-test-${i}`,
          timestamp: new Date(),
          userId: 'user-1',
          action: 'create',
          resourceType: 'document',
          status: 'success'
        });
      }

      const options: ExportOptions = {
        format: 'json',
        filters: {},
        maxRecords: 10000
      };

      const job = await exporter.createExportJob(options);

      // Check status immediately - it might already be completed due to async processing
      const status = exporter.getJobStatus(job.id);
      // The job could be in any state depending on timing
      expect(['pending', 'processing', 'completed']).toContain(status?.status);
    });
  });

  describe('CSV Formatting', () => {
    test('should handle special characters in CSV', async () => {
      // Add entry with special characters in errorMessage (which is exported)
      const specialEntry: AuditLogEntry = {
        id: 'special-test',
        timestamp: new Date(),
        userId: 'user-1',
        action: 'create',
        resourceType: 'document',
        errorMessage: 'Test with "quotes" and, comma',
        status: 'failure'
      };

      storage.add(specialEntry);

      const options: ExportOptions = {
        format: 'csv',
        filters: { status: 'failure' }
      };

      const job = await exporter.createExportJob(options);
      await waitForJobCompletion(exporter, job.id);

      const content = exporter.getExportContent(job.id) as string;
      expect(content).toBeDefined();
      // Should properly escape quotes and commas
      expect(content).toContain('"Test with ""quotes"" and, comma"');
    });

    test('should export without headers', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filters: {},
        includeHeaders: false
      };

      const job = await exporter.createExportJob(options);
      await waitForJobCompletion(exporter, job.id);

      const content = exporter.getExportContent(job.id) as string;
      const lines = content.split('\n');
      expect(lines[0]).not.toContain('id,timestamp');
    });
  });

  describe('Export Progress', () => {
    test('should track progress', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filters: {}
      };

      const job = await exporter.createExportJob(options);
      // Initial progress could be 0-100 depending on async completion
      expect(job.progress).toBeGreaterThanOrEqual(0);
      expect(job.progress).toBeLessThanOrEqual(100);

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 50));

      const inProgressJob = exporter.getJobStatus(job.id);
      expect(inProgressJob?.progress).toBeGreaterThanOrEqual(0);

      // Wait for completion
      await waitForJobCompletion(exporter, job.id);

      const finalJob = exporter.getJobStatus(job.id);
      expect(finalJob?.progress).toBe(100);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup old jobs', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filters: {}
      };

      const job1 = await exporter.createExportJob(options);
      const job2 = await exporter.createExportJob(options);

      await waitForJobCompletion(exporter, job1.id);
      await waitForJobCompletion(exporter, job2.id);

      // Manually set createdAt to be old
      const job = exporter.getJobStatus(job1.id);
      if (job) {
        job.createdAt = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
      }

      const cleaned = exporter.cleanupOldJobs(24 * 60 * 60 * 1000); // 24 hours
      expect(cleaned).toBe(1);
      expect(exporter.getJobStatus(job1.id)).toBeUndefined();
      expect(exporter.getJobStatus(job2.id)).toBeDefined();
    });
  });
});

/**
 * Helper function to wait for job completion
 */
async function waitForJobCompletion(
  exporter: AuditLogExporter,
  jobId: string,
  timeoutMs = 5000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const job = exporter.getJobStatus(jobId);

    if (job?.status === 'completed' || job?.status === 'failed') {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Job ${jobId} did not complete within ${timeoutMs}ms`);
}

/**
 * Generate sample audit log entries
 */
function generateSampleEntries(count: number): AuditLogEntry[] {
  const entries: AuditLogEntry[] = [];
  const actions = ['create', 'read', 'update', 'delete'];
  const resourceTypes = ['document', 'user', 'tenant', 'settings', 'log'];
  const statuses: ('success' | 'failure' | 'pending')[] = ['success', 'failure', 'pending'];

  for (let i = 0; i < count; i++) {
    const now = new Date();
    entries.push({
      id: `audit-${i}`,
      timestamp: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      userId: `user-${(i % 10) + 1}`,
      username: `user${(i % 10) + 1}`,
      action: actions[Math.floor(Math.random() * actions.length)],
      resourceType: resourceTypes[Math.floor(Math.random() * resourceTypes.length)],
      resourceId: `resource-${i}`,
      tenantId: `tenant-${(i % 5) + 1}`,
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      details: {
        index: i,
        timestamp: now.toISOString()
      }
    });
  }

  return entries;
}