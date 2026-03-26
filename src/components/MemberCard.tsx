'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import type { UnifiedTeamMember, MemberStatus } from '@/types/members';
import { MEMBER_STATUS_CONFIG } from '@/types/members';

// 重新导出统一类型，保持向后兼容
export type AIMember = UnifiedTeamMember;

interface MemberCardProps {
  member: UnifiedTeamMember;
  compact?: boolean;
  /** 选择模式 */
  isSelectionMode?: boolean;
  /** 是否选中 */
  isSelected?: boolean;
  /** 选择回调 */
  onSelect?: (memberId: string, event?: React.MouseEvent) => void;
  /** 点击回调（非选择模式） */
  onClick?: (member: UnifiedTeamMember) => void;
}

/**
 * MemberCard 组件 - 使用 React.memo 优化
 * 支持选择模式和批量操作
 */
const MemberCardBase: React.FC<MemberCardProps> = ({
  member,
  compact = false,
  isSelectionMode = false,
  isSelected = false,
  onSelect,
  onClick,
}) => {
  // 类型守卫，确保 status 是有效的 MemberStatus
  const status: MemberStatus = (
    ['online', 'working', 'busy', 'idle', 'offline'].includes(member.status)
      ? member.status
      : 'offline'
  ) as MemberStatus;

  // 使用统一的 MEMBER_STATUS_CONFIG
  const statusColors: Record<MemberStatus, string> = {
    working: 'bg-green-500',
    busy: 'bg-yellow-500',
    idle: 'bg-zinc-400',
    offline: 'bg-zinc-300',
    online: 'bg-green-500'
  };

  const statusBgColors: Record<MemberStatus, string> = {
    working: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    busy: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    idle: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300',
    offline: 'bg-zinc-100 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-400',
    online: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
  };

  const statusLabels: Record<MemberStatus, string> = {
    working: '工作中',
    busy: '忙碌',
    idle: '空闲',
    offline: '离线',
    online: '在线'
  };

  // 处理点击事件
  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode && onSelect) {
      onSelect(String(member.id), e);
    } else if (onClick) {
      onClick(member);
    }
  };

  // 选择模式的复选框
  const renderCheckbox = () => {
    if (!isSelectionMode) return null;

    return (
      <div
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          isSelected
            ? 'bg-blue-600 border-blue-600'
            : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700'
        }`}
      >
        {isSelected && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
    );
  };

  // 选中状态的边框样式
  const selectedRingClass = isSelected
    ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-zinc-800'
    : '';

  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={`px-4 py-3 transition-all duration-200 cursor-pointer group ${
          isSelectionMode ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:translate-x-1'
        } ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${selectedRingClass}`}
      >
        <div className="flex items-center gap-3">
          {renderCheckbox()}
          <div className="relative flex-shrink-0">
            <Image
              src={member.avatar || '/default-avatar.png'}
              alt={member.name}
              width={40}
              height={40}
              sizes="40px"
              className={`rounded-full ring-2 transition-all duration-200 ${
                isSelected
                  ? 'ring-blue-500'
                  : 'ring-transparent group-hover:ring-cyan-500/30'
              }`}
              unoptimized
            />
            <div
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-800 ${statusColors[status]}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                {member.emoji} {member.name}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBgColors[member.status]}`}>
                {statusLabels[member.status]}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{member.role}</span>
              <span className="text-xs text-zinc-400">·</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{member.provider}</span>
            </div>
            {member.currentTask && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">
                📌 {member.currentTask}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{member.completedTasks}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">完成任务</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`p-4 border rounded-xl transition-all duration-300 group bg-white dark:bg-zinc-800 dark:border-zinc-700 ${
        isSelectionMode
          ? `cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:border-blue-300'}`
          : 'hover:shadow-lg hover:-translate-y-1'
      } ${selectedRingClass}`}
    >
      <div className="flex items-start gap-3">
        {renderCheckbox()}
        <div className="relative flex-shrink-0">
          <Image
            src={member.avatar || '/default-avatar.png'}
            alt={member.name}
            width={48}
            height={48}
            sizes="48px"
            className={`rounded-full ring-2 transition-all duration-300 ${
              isSelected
                ? 'ring-blue-500'
                : 'ring-transparent group-hover:ring-cyan-500/50'
            }`}
            unoptimized
          />
          <div
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-800 ${statusColors[member.status]}`}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-base font-semibold text-zinc-900 dark:text-white">
              {member.emoji} {member.name}
            </h4>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBgColors[status]}`}>
              {statusLabels[status]}
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">{member.role}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2">提供商：{member.provider}</p>
          {member.currentTask && (
            <div className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded mb-2">
              📌 {member.currentTask}
            </div>
          )}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">
              <strong className="text-zinc-900 dark:text-white">{member.completedTasks}</strong> 完成任务
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 使用 React.memo 优化，自定义比较函数避免不必要的重渲染
export const MemberCard = memo(MemberCardBase, (prevProps, nextProps) => {
  // 只在 member 的关键字段变化时才重新渲染
  return (
    prevProps.member.id === nextProps.member.id &&
    prevProps.member.status === nextProps.member.status &&
    prevProps.member.currentTask === nextProps.member.currentTask &&
    prevProps.member.completedTasks === nextProps.member.completedTasks &&
    prevProps.compact === nextProps.compact &&
    prevProps.isSelectionMode === nextProps.isSelectionMode &&
    prevProps.isSelected === nextProps.isSelected
  );
});
