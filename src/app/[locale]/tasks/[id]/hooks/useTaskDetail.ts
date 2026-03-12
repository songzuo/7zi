/**
 * Task detail page hook - encapsulates all business logic
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTasksStore } from '@/lib/store/tasks-store';
import type { Task } from '@/lib/types/task-types';

interface UseTaskDetailReturn {
  task: Task | null;
  loading: boolean;
  newComment: string;
  setNewComment: (comment: string) => void;
  handleStatusChange: (status: string) => Promise<void>;
  handleAddComment: () => Promise<void>;
  handleAssignTask: (memberId: string) => Promise<void>;
}

export function useTaskDetail(): UseTaskDetailReturn {
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

  const handleStatusChange = useCallback(async (_status: string) => {
    // This would be implemented with the store
  }, []);

  const handleAddComment = useCallback(async () => {
    if (task && newComment.trim()) {
      // This would be implemented with the store
      setNewComment('');
    }
  }, [task, newComment]);

  const handleAssignTask = useCallback(async (_memberId: string) => {
    // This would be implemented with the store
  }, []);

  return {
    task,
    loading,
    newComment,
    setNewComment,
    handleStatusChange,
    handleAddComment,
    handleAssignTask,
  };
}
