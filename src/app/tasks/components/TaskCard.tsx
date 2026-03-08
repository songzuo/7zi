'use client';

import { useState } from 'react';
import type { Task, AITeamMember } from '@/lib/types/task-types';

interface TaskCardProps {
  task: Task;
  members?: AITeamMember[];
  onAssign?: (taskId: string, assigneeId: string) => void;
  onUnassign?: (taskId: string) => void;
  onEdit?: (updates: Partial<Task>) => void;
  onUpdateStatus?: (taskId: string, status: Task['status']) => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

export default function TaskCard({ 
  task, 
  members = [],
  onAssign, 
  onUnassign,
  onEdit,
  onUpdateStatus,
  onSelect,
  isSelected = false,
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAssignOptions, setShowAssignOptions] = useState(false);

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: Task['type']) => {
    const labels: Record<Task['type'], string> = {
      development: '开发',
      design: '设计',
      research: '研究',
      marketing: '营销',
      other: '其他'
    };
    return labels[type];
  };

  // Mock AI team members for assignment options
  const aiTeamMembers = [
    { id: 'executor', name: '执行者', role: 'development' },
    { id: 'architect', name: '架构师', role: 'development' },
    { id: 'designer', name: '设计师', role: 'design' },
    { id: 'consultant', name: '咨询师', role: 'research' },
    { id: 'ai-expert', name: '智能体世界专家', role: 'research' },
    { id: 'promoter', name: '推广专员', role: 'marketing' },
    { id: 'media', name: '媒体', role: 'marketing' }
  ];

  const handleAssign = (memberId: string) => {
    if (onAssign) {
      onAssign(task.id, memberId);
    }
    setShowAssignOptions(false);
  };

  const handleStatusChange = (newStatus: Task['status']) => {
    if (onUpdateStatus) {
      onUpdateStatus(task.id, newStatus);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
        <div className="flex gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
            {task.priority === 'urgent' ? '紧急' : 
             task.priority === 'high' ? '高' : 
             task.priority === 'medium' ? '中' : '低'}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
            {task.status === 'pending' ? '待分配' : 
             task.status === 'assigned' ? '已分配' : 
             task.status === 'in_progress' ? '进行中' : '已完成'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
          {getTypeLabel(task.type)}
        </span>
        {task.assignee && (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
            分配给: {task.assignee}
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="mb-4">
          <p className="text-gray-600 text-sm whitespace-pre-wrap">{task.description}</p>
          <div className="mt-3 text-xs text-gray-500">
            <p>创建时间: {new Date(task.createdAt).toLocaleString('zh-CN')}</p>
            {task.updatedAt !== task.createdAt && (
              <p>更新时间: {new Date(task.updatedAt).toLocaleString('zh-CN')}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {isExpanded ? '收起' : '展开详情'}
        </button>

        <div className="flex gap-2">
          {task.status === 'pending' && (
            <div className="relative">
              <button
                onClick={() => setShowAssignOptions(!showAssignOptions)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                分配任务
              </button>
              {showAssignOptions && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="p-2 text-xs text-gray-500 font-medium">推荐分配:</div>
                  {aiTeamMembers
                    .filter(member => member.role === task.type)
                    .map(member => (
                      <button
                        key={member.id}
                        onClick={() => handleAssign(member.id)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                      >
                        {member.name}
                      </button>
                    ))
                  }
                  <div className="border-t border-gray-200 p-2 text-xs text-gray-500 font-medium">其他成员:</div>
                  {aiTeamMembers
                    .filter(member => member.role !== task.type)
                    .map(member => (
                      <button
                        key={member.id}
                        onClick={() => handleAssign(member.id)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm opacity-75"
                      >
                        {member.name}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
          )}

          {task.status !== 'completed' && task.status !== 'pending' && (
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as Task['status'])}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="assigned">已分配</option>
              <option value="in_progress">进行中</option>
              <option value="completed">已完成</option>
            </select>
          )}
        </div>
      </div>
    </div>
  );
}