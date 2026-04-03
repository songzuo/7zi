/**
 * Unit tests for Audit Log Manager and API Handlers
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { AuditLogManager } from './manager';
import { createAuditAPIHandlers } from './api';
import { AuditLogEntry } from './types';

describe('AuditLogManager', () => {
  let manager: AuditLogManager;

  beforeEach(() => {
    manager = new AuditLogManager();
    addSampleData(manager);
  });

  describe('Log', () => {
    test('should create audit entry with generated id and timestamp', () => {
      const entry = manager.log({
        userId: 'user-1',
        action: 'create',
        resourceType: 'document',
        status: 'success'
      });

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.userId).toBe('user-1');
      expect(entry.action).toBe('create');
    });

    test('should log multiple entries', () => {
      manager.log({ action: 'read', resourceType: 'doc', status: 'success' });
      manager.log({ action: 'update', resourceType: 'doc', status: 'success' });
      manager.log({ action: 'delete', resourceType: 'doc', status: 'success' });

      const result = manager.search({});
      expect(result.total).toBeGreaterThan(3);
    });
  });

  describe('Search', () => {
    test('should search with filters', () => {
      const result = manager.search({ action: 'create' });
      expect(result.total).toBeGreaterThan(0);
    });

    test('should paginate results', () => {
      const result = manager.search({}, { page: 1, pageSize: 10 });
      expect(result.entries).toHaveLength(10);
      expect(result.pageSize).toBe(10);
    });
  });

  describe('Get', () => {
    test('should get entry by id', () => {
      const logged = manager.log({
        userId: 'user-1',
        action: 'test-get',
        resourceType: 'test',
        status: 'success'
      });

      const retrieved = manager.get(logged.id);
      expect(retrieved).toEqual(logged);
    });

    test('should return undefined for non-existent id', () => {
      const retrieved = manager.get('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Export', () => {
    test('should create export job', async () => {
      const job = await manager.createExport({
        format: 'csv',
        filters: {}
      });

      expect(job.id).toBeDefined();
      expect(job.status).toBeDefined();
    });

    test('should get export status', async () => {
      const job = await manager.createExport({
        format: 'json',
        filters: {}
      });

      const status = manager.getExportStatus(job.id);
      expect(status).toBeDefined();
      expect(status?.id).toBe(job.id);
    });

    test('should wait for export completion', async () => {
      const job = await manager.createExport({
        format: 'csv',
        filters: {},
        maxRecords: 100
      });

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 500));

      const status = manager.getExportStatus(job.id);
      expect(status?.status).toBe('completed');
    });
  });

  describe('Stats', () => {
    test('should get statistics', () => {
      const stats = manager.getStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byStatus).toBeDefined();
      expect(stats.byAction).toBeDefined();
      expect(stats.byResourceType).toBeDefined();
    });

    test('should filter stats by date', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const stats = manager.getStats({
        startDate: yesterday
      });

      expect(stats.total).toBeGreaterThan(0);
    });
  });
});

describe('API Handlers', () => {
  let manager: AuditLogManager;
  let handlers: ReturnType<typeof createAuditAPIHandlers>;

  beforeEach(() => {
    manager = new AuditLogManager();
    addSampleData(manager);
    handlers = createAuditAPIHandlers(manager);
  });

  describe('Search API', () => {
    test('should search with query parameters', async () => {
      const response = await handlers.search({
        query: {
          action: 'create',
          page: '1',
          pageSize: '10'
        }
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.entries).toBeDefined();
    });

    test('should handle search with date range', async () => {
      const now = new Date().toISOString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const response = await handlers.search({
        query: {
          startDate: yesterday,
          endDate: now
        }
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle search with full text', async () => {
      const response = await handlers.search({
        query: {
          searchText: 'create'
        }
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Export API', () => {
    test('should create export job', async () => {
      const response = await handlers.createExport({
        body: {
          format: 'csv',
          filters: {}
        }
      });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobId).toBeDefined();
      expect(response.body.data.status).toBeDefined();
    });

    test('should reject invalid format', async () => {
      const response = await handlers.createExport({
        body: {
          format: 'invalid',
          filters: {}
        }
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject missing format', async () => {
      const response = await handlers.createExport({
        body: {
          filters: {}
        }
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Export Status API', () => {
    test('should get export status', async () => {
      // First create an export
      const createResponse = await handlers.createExport({
        body: { format: 'csv', filters: {} }
      });

      const jobId = createResponse.body.data.jobId;

      // Then get status
      const response = await handlers.getExportStatus({
        params: { jobId }
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(jobId);
    });

    test('should handle missing job id', async () => {
      const response = await handlers.getExportStatus({
        params: {}
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle non-existent job', async () => {
      const response = await handlers.getExportStatus({
        params: { jobId: 'non-existent' }
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Download API', () => {
    test('should download completed export', async () => {
      // Create and wait for export to complete
      const job = await manager.createExport({
        format: 'csv',
        filters: {},
        maxRecords: 10
      });

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await handlers.downloadExport({
        params: { jobId: job.id }
      });

      expect(response.status).toBe(200);
      expect(response.body).toContain('id,timestamp');
    });

    test('should handle incomplete export', async () => {
      const job = await manager.createExport({
        format: 'csv',
        filters: {}
      });

      const response = await handlers.downloadExport({
        params: { jobId: job.id }
      });

      // Export might already be complete due to async processing
      // Either 400 (not ready) or 200 (already complete) is acceptable
      expect([200, 400]).toContain(response.status);

      if (response.status === 400) {
        expect(response.body.success).toBe(false);
      } else {
        expect(response.body).toContain('id,timestamp');
      }
    });

    test('should handle non-existent export', async () => {
      const response = await handlers.downloadExport({
        params: { jobId: 'non-existent' }
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Stats API', () => {
    test('should get statistics', async () => {
      const response = await handlers.getStats({
        query: {}
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    test('should filter stats by tenant', async () => {
      const response = await handlers.getStats({
        query: { tenantId: 'tenant-1' }
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

/**
 * Add sample data to manager
 */
function addSampleData(manager: AuditLogManager): void {
  const actions = ['create', 'read', 'update', 'delete'];
  const resourceTypes = ['document', 'user', 'tenant', 'settings'];
  const statuses: ('success' | 'failure' | 'pending')[] = ['success', 'failure', 'pending'];

  for (let i = 0; i < 50; i++) {
    manager.log({
      userId: `user-${(i % 10) + 1}`,
      username: `user${(i % 10) + 1}`,
      action: actions[i % actions.length],
      resourceType: resourceTypes[i % resourceTypes.length],
      resourceId: `resource-${i}`,
      tenantId: `tenant-${(i % 3) + 1}`,
      status: statuses[i % statuses.length],
      ipAddress: `192.168.1.${i % 255}`
    });
  }
}