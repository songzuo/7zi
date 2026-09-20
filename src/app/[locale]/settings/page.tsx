'use client'

/**
 * Settings Page with Data Export and Backup
 * Provides access to export, backup, and other settings
 */

import { DataExportPanel } from '@/components/DataExportPanel'
import { BackupList } from '@/components/BackupList'
import { useState, useEffect } from 'react'
import {
  Skeleton,
  SkeletonText,
} from '@/components/ui/Skeleton'

export default function SettingsPage() {
  const [backupRefreshTrigger, _setBackupRefreshTrigger] = useState(0)
  const [loading, setLoading] = useState(true)

  // Simulate loading state for skeleton demo
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <Skeleton variant="text" className="mb-2 h-9 w-32" />
          <Skeleton variant="text" className="h-5 w-80" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column skeleton */}
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
              <Skeleton variant="text" className="mb-4 h-6 w-24" />
              <SkeletonText lines={4} />
              <div className="mt-4 flex gap-3">
                <Skeleton variant="rounded" className="h-10 w-24" />
                <Skeleton variant="rounded" className="h-10 w-20" />
              </div>
            </div>

            {/* Tips card skeleton */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <Skeleton variant="text" className="mb-2 h-5 w-28" />
              <div className="space-y-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} variant="text" className="h-4 w-full" />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column skeleton */}
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
              <Skeleton variant="text" className="mb-4 h-6 w-28" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                  >
                    <div className="flex-1">
                      <Skeleton variant="text" className="mb-2 h-4 w-32" />
                      <Skeleton variant="text" className="h-3 w-48" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton variant="rounded" className="h-8 w-16" />
                      <Skeleton variant="rounded" className="h-8 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Warning card skeleton */}
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <Skeleton variant="text" className="mb-2 h-5 w-32" />
              <div className="space-y-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} variant="text" className="h-4 w-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Settings</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Manage your data exports, backups, and platform settings
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column - Export Panel */}
        <div className="space-y-6">
          <DataExportPanel />

          {/* Additional settings can be added here */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">💡 Export Tips</h3>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
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

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <h3 className="mb-2 font-semibold text-yellow-900 dark:text-yellow-100">
              ⚠️ Important Notes
            </h3>
            <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
              <li>• Backups are stored on the server</li>
              <li>• Download backups for safe local storage</li>
              <li>• Delete old backups to free up space</li>
              <li>• Verify backup integrity before deletion</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
