'use client';

/**
 * Settings Page with Data Export and Backup
 * Provides access to export, backup, and other settings
 */

import { DataExportPanel } from '@/components/DataExportPanel';
import { BackupList } from '@/components/BackupList';
import { useState } from 'react';

export default function SettingsPage() {
  const [backupRefreshTrigger, setBackupRefreshTrigger] = useState(0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Manage your data exports, backups, and platform settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Export Panel */}
        <div className="space-y-6">
          <DataExportPanel />

          {/* Additional settings can be added here */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              💡 Export Tips
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• JSON format preserves all data and structure</li>
              <li>• CSV format is ideal for spreadsheets</li>
              <li>• Use filters to export specific data subsets</li>
              <li>• Backups include all tables and metadata</li>
              <li>• Regular backups ensure data safety</li>
            </ul>
          </div>
        </div>

        {/* Right Column - Backup List */}
        <div className="space-y-6">
          <BackupList refreshTrigger={backupRefreshTrigger} />

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              ⚠️ Important Notes
            </h3>
            <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
              <li>• Backups are stored on the server</li>
              <li>• Download backups for safe local storage</li>
              <li>• Delete old backups to free up space</li>
              <li>• Verify backup integrity before deletion</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
