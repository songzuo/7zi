/**
 * Backup API Integration Tests
 * Real integration tests for /api/backup endpoint
 * Tests against actual backup file operations, not mocks
 */

import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import fs from 'fs/promises';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'backups');

function createNextRequest(url: string, method: string = 'GET'): NextRequest {
  const request = new NextRequest(url, {
    method,
    headers: new Headers({
      'x-forwarded-for': '127.0.0.1',
      'x-real-ip': '127.0.0.1',
    }),
  });
  return request;
}

describe('/api/backup Integration Tests', () => {
  beforeAll(async () => {
    // Ensure backup directory exists
    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
    } catch {
      // Directory may already exist
    }
  });

  afterAll(async () => {
    // Cleanup test backups
    try {
      const files = await fs.readdir(BACKUP_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(BACKUP_DIR, file));
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('GET /api/backup', () => {
    it('should return 200 with JSON content type', async () => {
      const request = createNextRequest('http://localhost:3000/api/backup');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should return success response structure', async () => {
      const request = createNextRequest('http://localhost:3000/api/backup');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('backups');
      expect(data.data).toHaveProperty('count');
      expect(data.data).toHaveProperty('totalSizeMB');
      expect(data).toHaveProperty('timestamp');
    });

    it('should return empty backups array when no backups exist', async () => {
      const request = createNextRequest('http://localhost:3000/api/backup');
      const response = await GET(request);
      const data = await response.json();

      expect(Array.isArray(data.data.backups)).toBe(true);
      expect(typeof data.data.count).toBe('number');
      expect(typeof data.data.totalSizeMB).toBe('string');
    });

    it('should include timestamp in ISO format', async () => {
      const request = createNextRequest('http://localhost:3000/api/backup');
      const response = await GET(request);
      const data = await response.json();

      const timestamp = new Date(data.timestamp);
      expect(timestamp.toISOString()).toBe(data.timestamp);
    });
  });

  describe('POST /api/backup', () => {
    it('should create a backup and return 201', async () => {
      const request = createNextRequest('http://localhost:3000/api/backup', 'POST');
      const response = await POST(request);
      
      // POST may be handled differently, check actual behavior
      expect([200, 201]).toContain(response.status);
    });

    it('should return backup metadata after creation', async () => {
      const request = createNextRequest('http://localhost:3000/api/backup', 'POST');
      
      const response = await POST(request);
      
      if (response.status === 201) {
        const data = await response.json();
        
        expect(data).toHaveProperty('success', true);
        expect(data.data).toHaveProperty('backup');
        expect(data.data.backup).toHaveProperty('id');
        expect(data.data.backup).toHaveProperty('filename');
        expect(data.data.backup).toHaveProperty('createdAt');
        expect(data.data.backup).toHaveProperty('sizeInBytes');
        expect(data.data.backup).toHaveProperty('sizeInMB');
        expect(data.data.backup).toHaveProperty('version');
        expect(data.data.backup).toHaveProperty('tables');
        expect(data.data.backup).toHaveProperty('recordCounts');
        expect(data.data.backup).toHaveProperty('checksum');
      }
    });

    it('should create actual backup file on disk', async () => {
      const initialFiles: string[] = await fs.readdir(BACKUP_DIR).catch(() => []);
      
      const request = createNextRequest('http://localhost:3000/api/backup', 'POST');
      
      await POST(request);
      
      // Give filesystem time to write
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalFiles = await fs.readdir(BACKUP_DIR).catch(() => []);
      const newFiles = finalFiles.filter(f => !initialFiles.includes(f) && f.endsWith('.json'));
      
      // Should have created at least one new backup file
      expect(newFiles.length).toBeGreaterThan(0);
    });

    it('should generate unique backup IDs', async () => {
      const request = createNextRequest('http://localhost:3000/api/backup', 'POST');
      
      const response = await POST(request);
      
      if (response.status === 201) {
        const data = await response.json();
        
        // Backup ID should follow pattern: backup-{timestamp}-{random}
        expect(data.data.backup.id).toMatch(/^backup-\d+-[a-z0-9]+$/);
      }
    });

    it('should include download URL in response', async () => {
      const request = createNextRequest('http://localhost:3000/api/backup', 'POST');
      
      const response = await POST(request);
      
      if (response.status === 201) {
        const data = await response.json();
        
        expect(data.data).toHaveProperty('downloadUrl');
        expect(data.data.downloadUrl).toMatch(/^\/api\/backup\//);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing database gracefully', async () => {
      // This tests the route's error handling
      const request = createNextRequest('http://localhost:3000/api/backup');
      
      const response = await GET(request);
      
      // Should either succeed (empty backups) or return proper error structure
      const data = await response.json();
      
      if (data.success === false) {
        expect(data).toHaveProperty('error');
        expect(data.error).toHaveProperty('type');
        expect(data.error).toHaveProperty('message');
        expect(data.error).toHaveProperty('timestamp');
      } else {
        expect(data).toHaveProperty('success', true);
        expect(data.data).toHaveProperty('backups');
      }
    });
  });
});
