/**
 * Files Repository Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initializeFilesTable,
  createFile,
  getFileById,
  getFileByHash,
  getAllFiles,
  filterFiles,
  updateFile,
  deleteFile,
  getFileStats,
  getFilesByTaskId,
} from '../lib/db/files.repository';

describe('Files Repository', () => {
  beforeAll(async () => {
    await initializeFilesTable();
  });

  describe('createFile', () => {
    it('should create a file record', async () => {
      const file = await createFile({
        filename: 'test_123.png',
        originalName: 'test.png',
        mimeType: 'image/png',
        size: 1024,
        path: 'image/test_123.png',
        hash: 'abc123',
      });

      expect(file).toBeDefined();
      expect(file.id).toMatch(/^file_/);
      expect(file.filename).toBe('test_123.png');
      expect(file.originalName).toBe('test.png');
      expect(file.mimeType).toBe('image/png');
      expect(file.size).toBe(1024);
      expect(file.hash).toBe('abc123');
    });

    it('should create file with all optional fields', async () => {
      const file = await createFile({
        filename: 'document.pdf',
        originalName: 'my document.pdf',
        mimeType: 'application/pdf',
        size: 5120,
        path: 'pdf/document.pdf',
        hash: 'def456',
        uploadedBy: 'user_123',
        taskId: 'task_456',
        description: 'Test document',
      });

      expect(file.uploadedBy).toBe('user_123');
      expect(file.taskId).toBe('task_456');
      expect(file.description).toBe('Test document');
    });
  });

  describe('getFileById', () => {
    it('should return file by id', async () => {
      const created = await createFile({
        filename: 'get_test.txt',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: 100,
        path: 'text/get_test.txt',
        hash: 'get_test_hash',
      });

      const found = await getFileById(created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent file', async () => {
      const found = await getFileById('non_existent_id');
      expect(found).toBeNull();
    });
  });

  describe('getFileByHash', () => {
    it('should return file by hash', async () => {
      const hash = 'unique_hash_' + Date.now();
      await createFile({
        filename: 'hash_test.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 2048,
        path: 'image/hash_test.jpg',
        hash,
      });

      const found = await getFileByHash(hash);
      expect(found).toBeDefined();
      expect(found?.hash).toBe(hash);
    });

    it('should return null for non-existent hash', async () => {
      const found = await getFileByHash('non_existent_hash');
      expect(found).toBeNull();
    });
  });

  describe('getAllFiles', () => {
    it('should return all files', async () => {
      const files = await getAllFiles();
      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe('filterFiles', () => {
    it('should filter by mime type', async () => {
      const uniqueType = 'test/unique_' + Date.now();
      await createFile({
        filename: 'filter_test.bin',
        originalName: 'test.bin',
        mimeType: uniqueType,
        size: 100,
        path: 'other/filter_test.bin',
        hash: 'filter_hash_' + Date.now(),
      });

      const filtered = await filterFiles({ mimeType: uniqueType });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered[0].mimeType).toBe(uniqueType);
    });

    it('should filter by search term', async () => {
      const uniqueName = 'unique_search_name_' + Date.now() + '.txt';
      await createFile({
        filename: uniqueName,
        originalName: uniqueName,
        mimeType: 'text/plain',
        size: 50,
        path: 'text/' + uniqueName,
        hash: 'search_hash_' + Date.now(),
      });

      const filtered = await filterFiles({ search: 'unique_search_name' });
      expect(filtered.length).toBeGreaterThan(0);
    });
  });

  describe('updateFile', () => {
    it('should update file description', async () => {
      const file = await createFile({
        filename: 'update_test.txt',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: 100,
        path: 'text/update_test.txt',
        hash: 'update_hash_' + Date.now(),
      });

      const updated = await updateFile(file.id, { description: 'Updated description' });
      expect(updated?.description).toBe('Updated description');
    });

    it('should return null for non-existent file', async () => {
      const updated = await updateFile('non_existent', { description: 'test' });
      expect(updated).toBeNull();
    });
  });

  describe('deleteFile', () => {
    it('should delete file', async () => {
      const file = await createFile({
        filename: 'delete_test.txt',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: 100,
        path: 'text/delete_test.txt',
        hash: 'delete_hash_' + Date.now(),
      });

      const deleted = await deleteFile(file.id);
      expect(deleted).toBe(true);

      const found = await getFileById(file.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent file', async () => {
      const deleted = await deleteFile('non_existent_id');
      expect(deleted).toBe(false);
    });
  });

  describe('getFileStats', () => {
    it('should return file statistics', async () => {
      const stats = await getFileStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('recentUploads');
      expect(typeof stats.total).toBe('number');
    });
  });

  describe('getFilesByTaskId', () => {
    it('should return files by task id', async () => {
      const taskId = 'task_test_' + Date.now();
      await createFile({
        filename: 'task_file.txt',
        originalName: 'task.txt',
        mimeType: 'text/plain',
        size: 100,
        path: 'text/task_file.txt',
        hash: 'task_hash_' + Date.now(),
        taskId,
      });

      const files = await getFilesByTaskId(taskId);
      expect(files.length).toBeGreaterThan(0);
      expect(files[0].taskId).toBe(taskId);
    });
  });
});