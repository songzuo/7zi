/**
 * Backup List Component
 * Display available backups with download and delete options
 */

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { downloadFromUrl } from '@/lib/utils/download';

interface BackupMetadata {
  id: string;
  filename: string;
  createdAt: string;
  sizeInBytes: number;
  sizeInMB: number;
  version: string;
  tables: string[];
  recordCounts: Record<string, number>;
  checksum: string;
}

interface BackupListProps {
  refreshTrigger?: number;
}

export function BackupList({ refreshTrigger }: BackupListProps) {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/backup');

      if (!response.ok) {
        throw new Error('Failed to fetch backups');
      }

      const data = await response.json();
      setBackups(data.data.backups);
    } catch (err) {
      console.error('Failed to fetch backups:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch backups');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (backupId: string, filename: string) => {
    try {
      await downloadFromUrl(`/api/backup/${backupId}`, filename);
    } catch (err) {
      console.error('Failed to download backup:', err);
      alert('Failed to download backup. Please try again.');
    }
  };

  const handleDelete = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(backupId);

      const response = await fetch(`/api/backup/${backupId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete backup');
      }

      // Refresh the list
      await fetchBackups();
    } catch (err) {
      console.error('Failed to delete backup:', err);
      alert('Failed to delete backup. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  useEffect(() => {
    fetchBackups();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="font-medium">Error loading backups</p>
          <p className="text-sm mt-1">{error}</p>
          <Button onClick={fetchBackups} className="mt-4">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (backups.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p className="font-medium">No backups available</p>
          <p className="text-sm mt-1">
            Create your first backup using the export panel above.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Available Backups</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {backups.length} backup{backups.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <Button onClick={fetchBackups} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {backups.map((backup) => (
          <div
            key={backup.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{backup.filename}</h4>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                    v{backup.version}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-medium">Created:</span>{' '}
                    {formatDate(backup.createdAt)}
                  </div>
                  <div>
                    <span className="font-medium">Size:</span>{' '}
                    {formatBytes(backup.sizeInBytes)}
                  </div>
                  <div>
                    <span className="font-medium">Tables:</span>{' '}
                    {backup.tables.length}
                  </div>
                  <div>
                    <span className="font-medium">Records:</span>{' '}
                    {Object.values(backup.recordCounts).reduce(
                      (sum, count) => sum + count,
                      0
                    )}
                  </div>
                </div>

                {backup.tables.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tables:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {backup.tables.map((table) => (
                        <span
                          key={table}
                          className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {table}
                          {backup.recordCounts[table] && (
                            <span className="ml-1 text-gray-500 dark:text-gray-400">
                              ({backup.recordCounts[table]})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleDownload(backup.id, backup.filename)}
                  size="sm"
                  variant="outline"
                >
                  Download
                </Button>
                <Button
                  onClick={() => handleDelete(backup.id)}
                  size="sm"
                  variant="outline"
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  disabled={deleting === backup.id}
                >
                  {deleting === backup.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
