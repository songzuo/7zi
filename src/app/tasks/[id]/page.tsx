'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTasksStore } from '@/lib/store/tasks-store';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import Link from 'next/link';
import type { TaskComment, StatusChange, Task } from '@/lib/types/task-types';

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
        <div className="mb-6">
          <Link 
            href="/tasks" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← 返回任务列表
          </Link>
        </div>
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Link 
            href="/tasks" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← 返回任务列表
          </Link>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-8 shadow-lg text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">任务未找到</h2>
          <p className="text-gray-600 dark:text-gray-400">请求的任务不存在或已被删除。</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
      case 'assigned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'in_progress': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'development': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'design': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-200';
      case 'research': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
      case 'marketing': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - then.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return '刚刚';
    if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}小时前`;
    return `${Math.floor(diffInMinutes / 1440)}天前`;
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link 
          href="/tasks" 
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
        >
          ← 返回任务列表
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Task Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div className="space-y-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{task.title}</h1>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status === 'pending' && '待分配'}
                    {task.status === 'assigned' && '已分配'}
                    {task.status === 'in_progress' && '进行中'}
                    {task.status === 'completed' && '已完成'}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority === 'urgent' && '紧急'}
                    {task.priority === 'high' && '高'}
                    {task.priority === 'medium' && '中'}
                    {task.priority === 'low' && '低'}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(task.type)}`}>
                    {task.type === 'development' && '开发'}
                    {task.type === 'design' && '设计'}
                    {task.type === 'research' && '研究'}
                    {task.type === 'marketing' && '推广'}
                    {task.type === 'other' && '其他'}
                  </span>
                </div>
              </div>
              
              {task.assignee && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-medium">
                    {task.assignee.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{task.assignee}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">已分配</div>
                  </div>
                </div>
              )}
            </div>

            <div className="prose prose-zinc max-w-none dark:prose-invert mb-6">
              <p className="text-gray-700 dark:text-gray-300">{task.description || '无描述'}</p>
            </div>

            {/* Status Actions */}
            <div className="flex flex-wrap gap-2 mb-6">
              {task.status !== 'pending' && (
                <button 
                  onClick={() => handleStatusChange('pending')}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  设为待分配
                </button>
              )}
              {task.status !== 'assigned' && (
                <button 
                  onClick={() => handleStatusChange('assigned')}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  设为已分配
                </button>
              )}
              {task.status !== 'in_progress' && (
                <button 
                  onClick={() => handleStatusChange('in_progress')}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  设为进行中
                </button>
              )}
              {task.status !== 'completed' && (
                <button 
                  onClick={() => handleStatusChange('completed')}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  设为已完成
                </button>
              )}
            </div>

            {/* Comments Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                💬 评论 ({task.comments?.length || 0})
              </h3>
              
              <div className="space-y-4">
                {task.comments?.map((comment: TaskComment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                      {comment.author.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{comment.author}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimeAgo(comment.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="添加评论..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg text-sm bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <button 
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  发送
                </button>
              </div>
            </div>
          </div>

          {/* History Section */}
          {task.history && task.history.length > 0 && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                📜 历史记录
              </h3>
              <div className="space-y-3">
                {task.history.map((entry: StatusChange, index: number) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{entry.changedBy}</span> 将状态改为{' '}
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {entry.status === 'pending' && '待分配'}
                        {entry.status === 'assigned' && '已分配'}
                        {entry.status === 'in_progress' && '进行中'}
                        {entry.status === 'completed' && '已完成'}
                      </span>
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {formatTimeAgo(entry.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assignment Section */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">智能分配</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              基于任务类型和AI成员专长，系统会自动推荐最适合的执行者。
            </div>
            <button 
              onClick={() => handleAssignTask('executor')}
              className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all"
            >
              分配给 Executor
            </button>
          </div>
          
          {/* Task Metadata */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">任务信息</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">创建时间:</span>{' '}
                <span className="text-gray-900 dark:text-white">{formatTimeAgo(task.createdAt)}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">最后更新:</span>{' '}
                <span className="text-gray-900 dark:text-white">{formatTimeAgo(task.updatedAt)}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">创建者:</span>{' '}
                <span className="text-gray-900 dark:text-white">{task.createdBy === 'user' ? '用户' : 'AI'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}