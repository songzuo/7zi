/**
 * Data Export Module Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportData,
  exportToCSV,
  importData,
  importFromCSV,
  listExports,
  deleteExport,
} from '../data-export';
import { ExportFormat, ExportOptions } from '../types';

describe('Data Export Module', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-21T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('exportData (JSON)', () => {
    it('should export data to JSON format', async () => {
      const exportResult = await exportData({
        format: ExportFormat.JSON,
        includeMetadata: true,
      });

      expect(exportResult).toHaveProperty('filename');
      expect(exportResult).toHaveProperty('path');
      expect(exportResult).toHaveProperty('size');
      expect(exportResult.filename).toMatch(/^export-.*\.json$/);
      expect(exportResult.size).toBeGreaterThan(0);
    });

    it('should export data without metadata', async () => {
      const exportResult = await exportData({
        format: ExportFormat.JSON,
        includeMetadata: false,
      });

      expect(exportResult.filename).toMatch(/^export-.*\.json$/);
    });

    it('should export specific tables', async () => {
      const exportResult = await exportData({
        format: ExportFormat.JSON,
        tables: ['users', 'tasks'],
      });

      expect(exportResult.filename).toMatch(/^export-.*\.json$/);
      expect(exportResult.size).toBeGreaterThan(0);
    });
  });

  describe('exportToCSV', () => {
    it('should export data to CSV format', async () => {
      const exportResult = await exportToCSV({
        format: ExportFormat.CSV,
      });

      expect(exportResult).toHaveProperty('filename');
      expect(exportResult).toHaveProperty('path');
      expect(exportResult).toHaveProperty('size');
      expect(exportResult.filename).toMatch(/^export-.*$/);
      expect(exportResult.size).toBeGreaterThan(0);
    });

    it('should create a directory with CSV files', async () => {
      const exportResult = await exportToCSV({
        format: ExportFormat.CSV,
      });

      // The export should create a directory
      expect(exportResult.path).toMatch(/export-.*$/);
    });

    it('should export specific tables to CSV', async () => {
      const exportResult = await exportToCSV({
        format: ExportFormat.CSV,
        tables: ['users'],
      });

      expect(exportResult.filename).toMatch(/^export-.*$/);
      expect(exportResult.size).toBeGreaterThan(0);
    });
  });

  describe('importData (JSON)', () => {
    it('should import data from JSON format', async () => {
      // First export data
      const exportResult = await exportData({
        format: ExportFormat.JSON,
      });

      // Then import it
      const importResult = await importData(exportResult.filename, {
        format: ExportFormat.JSON,
        truncateTables: false,
        skipErrors: false,
      });

      expect(importResult.success).toBe(true);
      expect(importResult.message).toContain('imported');
      expect(importResult.importedRecords).toBeGreaterThanOrEqual(0);
    });

    it('should handle dry run mode', async () => {
      const exportResult = await exportData({
        format: ExportFormat.JSON,
      });

      const importResult = await importData(exportResult.filename, {
        format: ExportFormat.JSON,
        dryRun: true,
      });

      expect(importResult.success).toBe(true);
      expect(importResult.message).toContain('Dry run');
    });

    it('should fail for non-existent file', async () => {
      const importResult = await importData('non-existent.json', {
        format: ExportFormat.JSON,
      });

      expect(importResult.success).toBe(false);
      expect(importResult.error).toBeDefined();
    });

    it('should support truncating tables', async () => {
      const exportResult = await exportData({
        format: ExportFormat.JSON,
      });

      const importResult = await importData(exportResult.filename, {
        format: ExportFormat.JSON,
        truncateTables: true,
        skipErrors: false,
      });

      expect(importResult.success).toBe(true);
    });

    it('should skip errors when configured', async () => {
      const exportResult = await exportData({
        format: ExportFormat.JSON,
      });

      const importResult = await importData(exportResult.filename, {
        format: ExportFormat.JSON,
        truncateTables: false,
        skipErrors: true,
      });

      expect(importResult.success).toBe(true);
    });
  });

  describe('importFromCSV', () => {
    it('should import data from CSV format', async () => {
      // First export data to CSV
      const exportResult = await exportToCSV({
        format: ExportFormat.CSV,
      });

      // Then import it
      const importResult = await importFromCSV(exportResult.filename, {
        format: ExportFormat.CSV,
        truncateTables: false,
        skipErrors: false,
      });

      expect(importResult.success).toBe(true);
      expect(importResult.message).toContain('imported');
    });

    it('should handle dry run mode', async () => {
      const exportResult = await exportToCSV({
        format: ExportFormat.CSV,
      });

      const importResult = await importFromCSV(exportResult.filename, {
        format: ExportFormat.CSV,
        dryRun: true,
      });

      expect(importResult.success).toBe(true);
      expect(importResult.message).toContain('Dry run');
    });

    it('should support truncating tables', async () => {
      const exportResult = await exportToCSV({
        format: ExportFormat.CSV,
      });

      const importResult = await importFromCSV(exportResult.filename, {
        format: ExportFormat.CSV,
        truncateTables: true,
        skipErrors: false,
      });

      expect(importResult.success).toBe(true);
    });
  });

  describe('listExports', () => {
    it('should return empty array initially', async () => {
      const exports = await listExports();

      expect(Array.isArray(exports)).toBe(true);
      expect(exports.length).toBe(0);
    });

    it('should list JSON exports', async () => {
      await exportData({
        format: ExportFormat.JSON,
      });

      const exports = await listExports();

      expect(exports.length).toBeGreaterThanOrEqual(1);
      const jsonExport = exports.find(e => e.format === 'json');
      expect(jsonExport).toBeDefined();
    });

    it('should list CSV exports', async () => {
      await exportToCSV({
        format: ExportFormat.CSV,
      });

      const exports = await listExports();

      expect(exports.length).toBeGreaterThanOrEqual(1);
      const csvExport = exports.find(e => e.format === 'csv');
      expect(csvExport).toBeDefined();
    });

    it('should return exports with correct structure', async () => {
      const exportResult = await exportData({
        format: ExportFormat.JSON,
      });

      const exports = await listExports();
      const foundExport = exports.find(e => e.filename === exportResult.filename);

      expect(foundExport).toBeDefined();
      expect(foundExport).toHaveProperty('filename');
      expect(foundExport).toHaveProperty('path');
      expect(foundExport).toHaveProperty('size');
      expect(foundExport).toHaveProperty('format');
    });
  });

  describe('deleteExport', () => {
    it('should delete a JSON export', async () => {
      const exportResult = await exportData({
        format: ExportFormat.JSON,
      });

      const deleted = await deleteExport(exportResult.filename);

      expect(deleted).toBe(true);

      const exports = await listExports();
      const found = exports.find(e => e.filename === exportResult.filename);
      expect(found).toBeUndefined();
    });

    it('should delete a CSV export', async () => {
      const exportResult = await exportToCSV({
        format: ExportFormat.CSV,
      });

      const deleted = await deleteExport(exportResult.filename);

      expect(deleted).toBe(true);

      const exports = await listExports();
      const found = exports.find(e => e.filename === exportResult.filename);
      expect(found).toBeUndefined();
    });

    it('should return false for non-existent export', async () => {
      const deleted = await deleteExport('non-existent.json');

      expect(deleted).toBe(false);
    });
  });
});
