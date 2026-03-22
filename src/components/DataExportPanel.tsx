/**
 * Data Export Panel Component
 * Provides UI for exporting tasks, projects, and creating backups
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { downloadFile } from '@/lib/utils/download';

type ExportFormat = 'json' | 'csv';
type ExportType = 'tasks' | 'projects' | 'backup';

interface ExportProgress {
  isExporting: boolean;
  progress: number;
  status: string;
}

interface ExportFilters {
  status: string;
  priority: string;
  assignee: string;
  tags: string;
  startDate: string;
  endDate: string;
  category?: string;
}

export function DataExportPanel() {
  const [exportType, setExportType] = useState<ExportType>('tasks');
  const [format, setFormat] = useState<ExportFormat>('json');
  const [includeTasks, setIncludeTasks] = useState(true);
  const [filters, setFilters] = useState<ExportFilters>({
    status: '',
    priority: '',
    assignee: '',
    startDate: '',
    endDate: '',
    tags: '',
    category: '',
  });
  const [progress, setProgress] = useState<ExportProgress>({
    isExporting: false,
    progress: 0,
    status: '',
  });

  const handleExport = async () => {
    try {
      setProgress({
        isExporting: true,
        progress: 0,
        status: 'Preparing export...',
      });

      let url: string;
      let filename: string;

      // Build URL with query parameters
      const searchParams = new URLSearchParams();

      if (exportType === 'tasks') {
        searchParams.append('format', format);

        // Add task filters
        if (filters.status) searchParams.append('status', filters.status);
        if (filters.priority) searchParams.append('priority', filters.priority);
        if (filters.assignee) searchParams.append('assignee', filters.assignee);
        if (filters.startDate) searchParams.append('startDate', filters.startDate);
        if (filters.endDate) searchParams.append('endDate', filters.endDate);
        if (filters.tags) searchParams.append('tags', filters.tags);

        url = `/api/export/tasks?${searchParams.toString()}`;
        filename = `tasks-export-${new Date().toISOString().split('T')[0]}.${format}`;
      } else if (exportType === 'projects') {
        searchParams.append('format', format);
        searchParams.append('includeTasks', includeTasks.toString());

        // Add project filters
        if (filters.category) searchParams.append('category', filters.category);

        url = `/api/export/projects?${searchParams.toString()}`;
        filename = `projects-export-${new Date().toISOString().split('T')[0]}.${format}`;
      } else {
        // Backup - always JSON
        setProgress({ ...progress, status: 'Creating backup...' });

        // Create backup first
        const backupResponse = await fetch('/api/backup', {
          method: 'POST',
        });

        if (!backupResponse.ok) {
          throw new Error('Failed to create backup');
        }

        const backupData = await backupResponse.json();
        const backupId = backupData.data.backup.id;
        url = `/api/backup/${backupId}`;
        filename = `backup-${new Date().toISOString().split('T')[0]}.json`;

        setProgress({ ...progress, progress: 50, status: 'Downloading backup...' });
      }

      // Simulate progress for non-backup exports
      if (exportType !== 'backup') {
        const progressInterval = setInterval(() => {
          setProgress((prev) => ({
            ...prev,
            progress: Math.min(prev.progress + 10, 90),
          }));
        }, 100);

        // Fetch data
        const response = await fetch(url);
        clearInterval(progressInterval);

        if (!response.ok) {
          throw new Error('Export failed');
        }

        setProgress({ ...progress, progress: 100, status: 'Processing...' });

        // Download file
        const content = await response.text();
        downloadFile(content, filename, format === 'csv' ? 'text/csv' : 'application/json');
      } else {
        // Backup download
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Download failed');
        }

        const content = await response.text();
        downloadFile(content, filename, 'application/json');
      }

      setProgress({
        isExporting: false,
        progress: 100,
        status: 'Export completed successfully!',
      });

      // Reset after 2 seconds
      setTimeout(() => {
        setProgress({
          isExporting: false,
          progress: 0,
          status: '',
        });
      }, 2000);
    } catch (error) {
      // Silently handle error in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Export error:', error);
      }
      setProgress({
        isExporting: false,
        progress: 0,
        status: 'Export failed. Please try again.',
      });
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Data Export & Backup</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Export your data or create a full database backup for safekeeping.
        </p>
      </div>

      {/* Export Type Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Export Type</label>
        <Select
          value={exportType}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExportType(e.target.value as ExportType)}
          disabled={progress.isExporting}
        >
          <option value="tasks">Tasks</option>
          <option value="projects">Projects</option>
          <option value="backup">Full Backup</option>
        </Select>
      </div>

      {/* Format Selection (not for backup) */}
      {exportType !== 'backup' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Format</label>
          <Select
            value={format}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormat(e.target.value as ExportFormat)}
            disabled={progress.isExporting}
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </Select>
        </div>
      )}

      {/* Include Tasks Option (for projects) */}
      {exportType === 'projects' && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeTasks"
            checked={includeTasks}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIncludeTasks(e.target.checked)}
            disabled={progress.isExporting}
          />
          <label htmlFor="includeTasks" className="text-sm">
            Include associated tasks
          </label>
        </div>
      )}

      {/* Filters for Tasks */}
      {exportType === 'tasks' && (
        <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          <h4 className="text-sm font-medium">Filters (Optional)</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-600 dark:text-zinc-400">Status</label>
              <Select
                value={filters.status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, status: e.target.value })}
                disabled={progress.isExporting}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-600 dark:text-zinc-400">Priority</label>
              <Select
                value={filters.priority}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, priority: e.target.value })}
                disabled={progress.isExporting}
              >
                <option value="">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-600 dark:text-zinc-400">Assignee</label>
              <Input
                type="text"
                value={filters.assignee}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, assignee: e.target.value })}
                placeholder="Assignee ID"
                disabled={progress.isExporting}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-600 dark:text-zinc-400">Tags</label>
              <Input
                type="text"
                value={filters.tags}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, tags: e.target.value })}
                placeholder="tag1, tag2, tag3"
                disabled={progress.isExporting}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-600 dark:text-zinc-400">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, startDate: e.target.value })}
                disabled={progress.isExporting}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-600 dark:text-zinc-400">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, endDate: e.target.value })}
                disabled={progress.isExporting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filters for Projects */}
      {exportType === 'projects' && (
        <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          <h4 className="text-sm font-medium">Filters (Optional)</h4>

          <div className="space-y-1">
            <label className="text-xs text-zinc-600 dark:text-zinc-400">Category</label>
            <Select
              value={filters.category}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, category: e.target.value })}
              disabled={progress.isExporting}
            >
              <option value="">All Categories</option>
              <option value="website">Website</option>
              <option value="app">App</option>
              <option value="ai">AI</option>
              <option value="design">Design</option>
            </Select>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      {progress.isExporting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{progress.status}</span>
            <span className="text-zinc-600 dark:text-zinc-400">
              {progress.progress}%
            </span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Export Button */}
      <Button
        onClick={handleExport}
        disabled={progress.isExporting}
        className="w-full"
      >
        {progress.isExporting ? 'Exporting...' : 'Export Data'}
      </Button>

      {/* Status Message */}
      {progress.status && !progress.isExporting && (
        <div
          className={`text-sm text-center ${
            progress.status.includes('successfully')
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {progress.status}
        </div>
      )}
    </Card>
  );
}
