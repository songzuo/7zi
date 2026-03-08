'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useMembers } from '@/stores/dashboardStore';
import type { Task, TaskType } from '@/lib/types/task-types';

interface AssignmentSuggesterProps {
  task: Partial<Task> & { type?: TaskType };
  onAssigneeChange?: (assigneeId: string | null) => void;
}

// Helper function defined outside component to avoid hoisting issues
const balanceWorkload = <T extends { completedTasks: number; role: string; id: string }>(
  membersList: T[], 
  taskType: TaskType
): string | null => {
  // Sort by completed tasks (ascending) to balance workload
  const sortedMembers = [...membersList].sort((a, b) => a.completedTasks - b.completedTasks);
  
  // If there's a tie in completed tasks, prefer members with matching expertise
  const minTasks = sortedMembers[0]?.completedTasks || 0;
  const candidates = sortedMembers.filter(member => member.completedTasks === minTasks);
  
  const expertiseMapping: Record<TaskType, string[]> = {
    development: ['架构师', 'Executor'],
    design: ['设计师'],
    research: ['咨询师', '智能体世界专家'],
    marketing: ['推广专员', '媒体'],
    other: []
  };
  
  const relevantRoles = expertiseMapping[taskType] || [];
  const expertCandidate = candidates.find(member => relevantRoles.includes(member.role));
  return expertCandidate?.id || sortedMembers[0]?.id || null;
};

export default function AssignmentSuggester({ 
  task,
  onAssigneeChange
}: AssignmentSuggesterProps) {
  const members = useMembers();
  const [suggestedAssignee, setSuggestedAssignee] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const previousTaskIdRef = useRef<string | undefined>(task.id);

  // Intelligent assignment algorithm based on task type and member expertise
  useEffect(() => {
    if (!task.type || !members.length) return;

    const findBestAssignee = (): string | null => {
      // Filter available members (idle or working but not busy/offline)
      const availableMembers = members.filter(member => 
        member.status === 'idle' || member.status === 'working'
      );
      
      if (availableMembers.length === 0) {
        // If no one is available, pick from all members with load balancing
        return balanceWorkload(members, task.type || 'other');
      }

      // Match by role/expertise mapping
      const expertiseMapping: Record<TaskType, string[]> = {
        development: ['架构师', 'Executor'],
        design: ['设计师'],
        research: ['咨询师', '智能体世界专家'],
        marketing: ['推广专员', '媒体'],
        other: ['系统管理员', '测试员', '销售客服', '财务']
      };

      const relevantRoles = expertiseMapping[task.type || 'other'] || [];
      const expertMembers = availableMembers.filter(member => 
        relevantRoles.includes(member.role)
      );

      if (expertMembers.length > 0) {
        // Balance workload among experts
        return balanceWorkload(expertMembers, task.type || 'other');
      }

      // Fallback: assign to any available member with least completed tasks
      return [...availableMembers]
        .sort((a, b) => a.completedTasks - b.completedTasks)[0]?.id || null;
    };

    // Only update if task changed
    if (previousTaskIdRef.current !== task.id) {
      const bestAssignee = findBestAssignee();
      requestAnimationFrame(() => {
        setSuggestedAssignee(bestAssignee);
      });
      previousTaskIdRef.current = task.id;
    }
  }, [task.type, task.id, members]);

  const handleAcceptSuggestion = () => {
    if (suggestedAssignee && onAssigneeChange) {
      onAssigneeChange(suggestedAssignee);
      setShowSuggestions(false);
    }
  };

  const handleManualAssign = (memberId: string) => {
    if (onAssigneeChange) {
      onAssigneeChange(memberId);
      setShowSuggestions(false);
    }
  };

  const handleUnassign = () => {
    if (onAssigneeChange) {
      onAssigneeChange(null);
      setShowSuggestions(false);
    }
  };

  const getSuggestedMember = () => {
    return members.find(member => member.id === suggestedAssignee);
  };

  const getCurrentMember = () => {
    return members.find(member => member.id === task.assignee);
  };

  const getMemberStatusText = (status: string) => {
    switch (status) {
      case 'idle': return '空闲';
      case 'working': return '工作中';
      case 'busy': return '忙碌';
      case 'offline': return '离线';
      default: return status;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          智能分配建议
        </h3>
        {suggestedAssignee && !task.assignee && (
          <button
            onClick={handleAcceptSuggestion}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            接受建议
          </button>
        )}
      </div>

      {suggestedAssignee && !task.assignee && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-blue-800 dark:text-blue-200 mb-2">
            建议分配给:
          </p>
          <div className="flex items-center space-x-3">
            <Image 
              src={getSuggestedMember()?.avatar || '/default-avatar.png'} 
              alt={getSuggestedMember()?.name || 'Member'}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {getSuggestedMember()?.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getSuggestedMember()?.role} • {getMemberStatusText(getSuggestedMember()?.status || 'idle')}
              </p>
            </div>
          </div>
        </div>
      )}

      {task.assignee && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-green-800 dark:text-green-200 mb-2">
            当前分配给:
          </p>
          <div className="flex items-center space-x-3">
            <Image 
              src={getCurrentMember()?.avatar || '/default-avatar.png'} 
              alt={getCurrentMember()?.name || 'Member'}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {getCurrentMember()?.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getCurrentMember()?.role} • {getMemberStatusText(getCurrentMember()?.status || 'idle')}
              </p>
            </div>
          </div>
          <button
            onClick={handleUnassign}
            className="mt-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            取消分配
          </button>
        </div>
      )}

      <button
        onClick={() => setShowSuggestions(!showSuggestions)}
        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        {showSuggestions ? '隐藏所有成员' : '手动选择成员'}
      </button>

      {showSuggestions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2">
          {members.map((member) => (
            <div
              key={member.id}
              onClick={() => handleManualAssign(member.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                task.assignee === member.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Image 
                  src={member.avatar || '/default-avatar.png'} 
                  alt={member.name}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {member.role} • {getMemberStatusText(member.status)}
                  </p>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {member.completedTasks} 任务
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
