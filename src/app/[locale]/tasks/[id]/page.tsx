'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTasksStore } from '@/lib/store/tasks-store';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Task } from '@/lib/types/task-types';

// Extracted components
import { BackLink } from './components/BackLink';
import { TaskBadges } from './components/TaskBadges';
import { AssigneeAvatar } from './components/AssigneeAvatar';
import { StatusActions } from './components/StatusActions';
import { CommentsSection } from './components/CommentsSection';
import { TaskHistory } from './components/TaskHistory';
import { AssignmentSection } from './components/AssignmentSection';
import { TaskMetadata } from './components/TaskMetadata';

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;

  const { tasks } = useTasksStore();
  const [task, setTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (taskId && tasks.length > 0) {
      const foundTask = tasks.find(t => t.id === taskId);
      if (foundTask) {
        requestAnimationFrame(() => {
          setTask(foundTask);
          setLoading(false);
        });
      }
    }
  }, [taskId, tasks]);

  const handleStatusChange = async (_status: string) => {
    // This would be implemented with the store
  };

  const handleAddComment = async () => {
    if (task && newComment.trim()) {
      // This would be implemented with the store
      setNewComment('');
    }
  };

  const handleAssignTask = async (_memberId: string) => {
    // This would be implemented with the store
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <BackLink />
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <BackLink />
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-8 shadow-lg text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">任务未找到</h2>
          <p className="text-gray-600 dark:text-gray-400">请求的任务不存在或已被删除。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <BackLink />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Task Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div className="space-y-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{task.title}</h1>
                <TaskBadges status={task.status} priority={task.priority} type={task.type} />
              </div>

              {task.assignee && <AssigneeAvatar name={task.assignee} />}
            </div>

            <div className="prose prose-zinc max-w-none dark:prose-invert mb-6">
              <p className="text-gray-700 dark:text-gray-300">{task.description || '无描述'}</p>
            </div>

            <StatusActions currentStatus={task.status} onStatusChange={handleStatusChange} />

            <CommentsSection
              comments={task.comments || []}
              newComment={newComment}
              onCommentChange={setNewComment}
              onSubmit={handleAddComment}
            />
          </div>

          <TaskHistory history={task.history || []} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <AssignmentSection onAssign={handleAssignTask} />
          <TaskMetadata task={task} />
        </div>
      </div>
    </div>
  );
}