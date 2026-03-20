/**
 * @fileoverview Export types and interfaces
 */

export type ExportFormat = 'csv' | 'json' | 'xlsx';

export type ExportEntityType = 'tasks' | 'projects';

export interface ExportOptions {
  format: ExportFormat;
  selectedFields?: string[];
  dateRange?: {
    from?: string;
    to?: string;
  };
  limit?: number;
  offset?: number;
}

export interface ExportResult {
  format: ExportFormat;
  filename: string;
  mimeType: string;
  data: ArrayBuffer;
  size: number;
}

export interface ExportProgress {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  processedCount: number;
  totalCount: number;
  message?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
  result?: ExportResult;
}

export interface ExportField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array';
  required?: boolean;
}

export interface ExportableEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}
