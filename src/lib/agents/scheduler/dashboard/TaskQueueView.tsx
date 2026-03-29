/**
 * TaskQueueView Component
 * Displays all pending tasks in the AI Agent Scheduler system
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useSchedulerStore } from '../stores/scheduler-store';
import { Task, TaskPriority, TaskStatus } from '../models/task-model';
import { TaskType, AgentCapability } from '../models/agent-capability';

/**
 * Task display interface (enhanced from Task)
 */
interface TaskDisplay extends Task {
  assignedAgentName?: string;
  assignedAgentEmoji?: string;
}

/**
 * Priority order for sorting
 */
const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3
};

/**
 * Task type icons (emoji)
 */
const TASK_TYPE_ICONS: Record<TaskType, string> = {
  architecture: '🏗️',
  research: '📚',
  implementation: '⚡',
  testing: '🧪',
  devops: '🛡️',
  design: '🎨',
  marketing: '📣',
  sales: '💼',
  finance: '💰',
  media: '📺',
  general: '📝'
};

/**
 * Priority badge colors
 */
const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string; border: string }> = {
  urgent: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-300 dark:border-red-800' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-300 dark:border-orange-800' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-300 dark:border-yellow-800' },
  low: { bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-700 dark:text-gray-400', border: 'border-gray-300 dark:border-gray-700' }
};

/**
 * Status badge colors
 */
const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  assigned: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  in_progress: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  completed: { bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-600 dark:text-gray-400' },
  failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  cancelled: { bg: 'bg-gray-200 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400' }
};

/**
 * TaskCard Component
 * Displays a single task card with all relevant information
 */
interface TaskCardProps {
  task: TaskDisplay;
  agents: AgentCapability[];
  onReassign: (taskId: string, newAgentId: string) => void;
  onCancel: (taskId: string) => void;
  onTaskClick: (taskId: string) => void;
  selected: boolean;
  currentTime?: number;
}

function TaskCard({ task, agents, onReassign, onCancel, onTaskClick, selected }: TaskCardProps) {
  const [showReassign, setShowReassign] = useState(false);
  
  const priorityColor = PRIORITY_COLORS[task.priority];
  const statusColor = STATUS_COLORS[task.status];
  const typeIcon = TASK_TYPE_ICONS[task.type];
  
  // Format timestamps
  const createdAt = new Date(task.createdAt).toLocaleString();
  const deadline = task.deadline ? new Date(task.deadline).toLocaleString() : null;
  
  // Check if deadline is approaching or overdue
  const isOverdue = task.deadline && task.deadline < Date.now() && task.status !== 'completed';
  const isDeadlineSoon = task.deadline && !isOverdue && (task.deadline - Date.now()) < 60 * 60 * 1000;
  
  // Available agents for reassignment
  const availableAgents = agents.filter(a => a.availability && a.capabilities.taskTypes.includes(task.type));
  
  return (
    <div
      className={`
        p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md
        ${selected ? 'ring-2 ring-blue-500 border-blue-500' : priorityColor.border}
        ${isOverdue ? 'bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-gray-800'}
      `}
      onClick={() => onTaskClick(task.id)}
    >
      {/* Header: Priority and Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-md text-xs font-semibold ${priorityColor.bg} ${priorityColor.text} border ${priorityColor.border}`}>
            {task.priority.toUpperCase()}
          </span>
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
            {task.status.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl" title={`Type: ${task.type}`}>
            {typeIcon}
          </span>
          {isOverdue && (
            <span className="text-red-500 font-semibold text-xs" title="Overdue">
              ⚠️ OVERDUE
            </span>
          )}
          {isDeadlineSoon && !isOverdue && (
            <span className="text-orange-500 font-semibold text-xs" title="Deadline within 1 hour">
              ⏰ SOON
            </span>
          )}
        </div>
      </div>
      
      {/* Task Title */}
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
        {task.title}
      </h3>
      
      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}
      
      {/* Assigned Agent */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">Assigned:</span>
        {task.assignedAgentName ? (
          <div className="flex items-center gap-1">
            <span className="text-sm">{task.assignedAgentEmoji || '🤖'}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {task.assignedAgentName}
            </span>
          </div>
        ) : (
          <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
            ⏳ Pending Assignment
          </span>
        )}
      </div>
      
      {/* Metadata: Time, Duration, Dependencies */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-gray-600 dark:text-gray-400">
        <div>
          <span className="font-medium">Created:</span> {createdAt}
        </div>
        <div>
          <span className="font-medium">Est. Duration:</span> {task.estimatedDuration}m
        </div>
        {deadline && (
          <div className={`col-span-2 ${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
            <span className="font-medium">Deadline:</span> {deadline}
          </div>
        )}
        {task.dependencies.length > 0 && (
          <div className="col-span-2">
            <span className="font-medium">Dependencies:</span> {task.dependencies.length} task{task.dependencies.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
      
      {/* Required Capabilities */}
      {task.requiredCapabilities.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.requiredCapabilities.slice(0, 3).map((cap, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
            >
              {cap}
            </span>
          ))}
          {task.requiredCapabilities.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded text-xs">
              +{task.requiredCapabilities.length - 3} more
            </span>
          )}
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        {task.status === 'pending' || task.status === 'assigned' ? (
          <>
            {showReassign ? (
              <select
                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    onReassign(task.id, e.target.value);
                    setShowReassign(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="" disabled>Assign to...</option>
                {availableAgents.map(agent => (
                  <option key={agent.agentId} value={agent.agentId}>
                    {agent.name} ({agent.capabilities.concurrency} tasks)
                  </option>
                ))}
              </select>
            ) : (
              <button
                className="px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReassign(!showReassign);
                }}
              >
                Reassign
              </button>
            )}
            <button
              className="px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              onClick={(e) => {
                e.stopPropagation();
                onCancel(task.id);
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400 italic">
            Task is {task.status.replace('_', ' ')}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * TaskQueueView Component
 * Main component for displaying and managing the task queue
 */
export function TaskQueueView() {
  const {
    tasks,
    agents,
    selectedTaskId,
    selectTask,
    manualAssign,
    isLoading,
    error,
    refresh
  } = useSchedulerStore();
  
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TaskType | 'all'>('all');
  
  // Initialize store on mount
  React.useEffect(() => {
    refresh();
  }, [refresh]);
  
  // Enhanced tasks with agent names
  const enhancedTasks: TaskDisplay[] = useMemo(() => {
    return tasks.map(task => {
      const agent = task.assignedAgent ? agents.find(a => a.agentId === task.assignedAgent) : null;
      return {
        ...task,
        assignedAgentName: agent?.name,
        assignedAgentEmoji: agent?.name === '智能体世界专家' ? '🌟' :
                           agent?.name === '咨询师' ? '📚' :
                           agent?.name === '架构师' ? '🏗️' :
                           agent?.name === 'Executor' ? '⚡' :
                           agent?.name === '系统管理员' ? '🛡️' :
                           agent?.name === '测试员' ? '🧪' :
                           agent?.name === '设计师' ? '🎨' :
                           agent?.name === '推广专员' ? '📣' :
                           agent?.name === '销售客服' ? '💼' :
                           agent?.name === '财务' ? '💰' :
                           agent?.name === '媒体' ? '📺' : '🤖'
      };
    });
  }, [tasks, agents]);
  
  // Filter tasks
  const filteredTasks = useMemo(() => {
    return enhancedTasks.filter(task => {
      // Status filter
      if (filterStatus !== 'all' && task.status !== filterStatus) {
        return false;
      }
      
      // Priority filter
      if (filterPriority !== 'all' && task.priority !== filterPriority) {
        return false;
      }
      
      // Type filter
      if (filterType !== 'all' && task.type !== filterType) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.id.toLowerCase().includes(query) ||
          task.requiredCapabilities.some(cap => cap.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [enhancedTasks, filterStatus, filterPriority, filterType, searchQuery]);
  
  // Sort tasks by priority and other criteria
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // First by priority (urgent first)
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by deadline (earlier first)
      if (a.deadline && b.deadline) {
        return a.deadline - b.deadline;
      } else if (a.deadline) {
        return -1;
      } else if (b.deadline) {
        return 1;
      }
      
      // Finally by creation time (older first)
      return a.createdAt - b.createdAt;
    });
  }, [filteredTasks]);
  
  // Group tasks by priority
  const groupedTasks = useMemo(() => {
    const groups: Record<TaskPriority, TaskDisplay[]> = {
      urgent: [],
      high: [],
      medium: [],
      low: []
    };
    
    sortedTasks.forEach(task => {
      groups[task.priority].push(task);
    });
    
    return groups;
  }, [sortedTasks]);
  
  // Statistics
  const stats = useMemo(() => {
    return {
      total: filteredTasks.length,
      pending: filteredTasks.filter(t => t.status === 'pending').length,
      assigned: filteredTasks.filter(t => t.status === 'assigned').length,
      inProgress: filteredTasks.filter(t => t.status === 'in_progress').length,
      urgent: filteredTasks.filter(t => t.priority === 'urgent').length,
      overdue: filteredTasks.filter(t => t.deadline && t.deadline < Date.now()).length
    };
  }, [filteredTasks]);
  
  // Handle manual reassignment
  const handleReassign = useCallback(async (taskId: string, newAgentId: string) => {
    try {
      manualAssign(taskId, newAgentId, 'user');
      refresh();
    } catch (error) {
      console.error('Failed to reassign task:', error);
      alert('Failed to reassign task. Please try again.');
    }
  }, [manualAssign, refresh]);
  
  // Handle task cancellation
  const handleCancel = useCallback(async (taskId: string) => {
    if (confirm('Are you sure you want to cancel this task?')) {
      try {
        // This would need to be implemented in the scheduler
        alert('Task cancellation not yet implemented');
      } catch (error) {
        console.error('Failed to cancel task:', error);
        alert('Failed to cancel task. Please try again.');
      }
    }
  }, []);
  
  // Handle task click
  const handleTaskClick = useCallback((taskId: string) => {
    selectTask(taskId === selectedTaskId ? null : taskId);
  }, [selectedTaskId, selectTask]);
  
  // Clear filters
  const clearFilters = () => {
    setFilterStatus('all');
    setFilterPriority('all');
    setFilterType('all');
    setSearchQuery('');
  };
  
  if (isLoading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Task Queue
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          View and manage all tasks in the scheduler
        </p>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}
      
      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {stats.pending}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
            {stats.assigned}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Assigned</div>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">
            {stats.inProgress}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">
            {stats.urgent}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Urgent</div>
        </div>
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
            {stats.overdue}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Overdue</div>
        </div>
      </div>
      
      {/* Filters and Search */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, ID, or capability..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Type Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TaskType | 'all')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="architecture">Architecture</option>
              <option value="research">Research</option>
              <option value="implementation">Implementation</option>
              <option value="testing">Testing</option>
              <option value="devops">DevOps</option>
              <option value="design">Design</option>
              <option value="marketing">Marketing</option>
              <option value="sales">Sales</option>
              <option value="finance">Finance</option>
              <option value="media">Media</option>
              <option value="general">General</option>
            </select>
          </div>
          
          {/* Clear Filters Button */}
          {(filterStatus !== 'all' || filterPriority !== 'all' || filterType !== 'all' || searchQuery) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 mt-6 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
      
      {/* Task List */}
      {sortedTasks.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No tasks found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your filters or add some tasks to the queue.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.keys(groupedTasks) as TaskPriority[]).map(priority => {
            const tasksInGroup = groupedTasks[priority];
            if (tasksInGroup.length === 0) return null;
            
            const priorityColor = PRIORITY_COLORS[priority];
            
            return (
              <div key={priority}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-md text-sm font-semibold ${priorityColor.bg} ${priorityColor.text} border ${priorityColor.border}`}>
                    {priority.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {tasksInGroup.length} task{tasksInGroup.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasksInGroup.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      agents={agents}
                      onReassign={handleReassign}
                      onCancel={handleCancel}
                      onTaskClick={handleTaskClick}
                      selected={selectedTaskId === task.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
