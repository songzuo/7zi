'use client';

/**
 * 任务看板页面
 * 显示 GitHub Issues 作为任务看板
 */

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { TaskBoard } from '@/components/TaskBoard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { GitHubIssue } from '@/types';

export default function TasksPage() {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIssues() {
      try {
        const res = await fetch('/api/github/issues');
        if (res.ok) {
          const data = await res.json();
          setIssues(data.issues || []);
        }
      } catch (e) {
        console.error('Failed to fetch issues:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchIssues();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
        📋 任务看板
      </h1>
      <TaskBoard issues={issues} />
    </div>
  );
}
