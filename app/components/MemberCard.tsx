'use client';

import React, { memo, useCallback } from 'react';
import { AIMember } from '../dashboard/page';

interface MemberCardProps {
  member: AIMember;
  compact?: boolean;
}

// 状态配置 - 移到组件外部避免重复创建
const STATUS_CONFIG = {
  colors: {
    working: 'bg-green-500',
    busy: 'bg-yellow-500',
    idle: 'bg-gray-400',
    offline: 'bg-gray-500 dark:bg-gray-600',
  },
  bgColors: {
    working: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    busy: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    idle: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    offline: 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500',
  },
  labels: {
    working: '工作中',
    busy: '忙碌',
    idle: '空闲',
    offline: '离线',
  },
} as const;

/**
 * 成员卡片组件 - 性能优化版本
 * 
 * 优化措施:
 * 1. 使用 React.memo 防止不必要的重渲染
 * 2. 状态配置移到组件外部
 * 3. 使用 useCallback 缓存事件处理
 */
const MemberCardComponent: React.FC<MemberCardProps> = ({ member, compact = false }) => {
  const statusColors = STATUS_CONFIG.colors;
  const statusBgColors = STATUS_CONFIG.bgColors;
  const statusLabels = STATUS_CONFIG.labels;

  // 使用 useCallback 缓存图片错误处理
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src =
      `https://api.dicebear.com/7.x/bottts/svg?seed=${member.id}`;
  }, [member.id]);

  if (compact) {
    return (
      <MemberCardCompact
        member={member}
        statusColors={statusColors}
        statusBgColors={statusBgColors}
        statusLabels={statusLabels}
        onImageError={handleImageError}
      />
    );
  }

  return (
    <MemberCardDefault
      member={member}
      statusColors={statusColors}
      statusBgColors={statusBgColors}
      statusLabels={statusLabels}
      onImageError={handleImageError}
    />
  );
};

// ============================================================================
// 子组件 - 使用 memo 防止不必要重渲染
// ============================================================================

interface MemberCardBaseProps {
  member: AIMember;
  statusColors: typeof STATUS_CONFIG.colors;
  statusBgColors: typeof STATUS_CONFIG.bgColors;
  statusLabels: typeof STATUS_CONFIG.labels;
  onImageError: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

const MemberCardCompact = memo(function MemberCardCompact({
  member,
  statusColors,
  statusBgColors,
  statusLabels,
  onImageError,
}: MemberCardBaseProps) {
  return (
    <article 
      className="px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors focus-within:bg-gray-50 dark:focus-within:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700"
      aria-labelledby={`member-${member.id}-name`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative flex-shrink-0">
          <img
            src={member.avatar}
            alt=""
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full"
            onError={onImageError}
          />
          <div
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white dark:border-gray-800 ${statusColors[member.status]}`}
            aria-hidden="true"
          />
          <span className="sr-only">{member.name}，状态：{statusLabels[member.status]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span id={`member-${member.id}-name`} className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
              {member.emoji} {member.name}
            </span>
            <span
              className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium ${statusBgColors[member.status]}`}
              aria-label={`状态：${statusLabels[member.status]}`}
            >
              {statusLabels[member.status]}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">{member.role}</span>
            <span className="text-xs text-gray-400" aria-hidden="true">·</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{member.provider}</span>
          </div>
          {member.currentTask && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-1 truncate" aria-label={`当前任务：${member.currentTask}`}>📌 {member.currentTask}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0" aria-label={`已完成 ${member.completedTasks} 个任务`}>
          <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{member.completedTasks}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">完成任务</p>
        </div>
      </div>
    </article>
  );
});

const MemberCardDefault = memo(function MemberCardDefault({
  member,
  statusColors,
  statusBgColors,
  statusLabels,
  onImageError,
}: MemberCardBaseProps) {
  return (
    <article 
      className="p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white dark:bg-gray-800"
      aria-labelledby={`member-${member.id}-title`}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="relative flex-shrink-0">
          <img
            src={member.avatar}
            alt=""
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full"
            onError={onImageError}
          />
          <div
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white dark:border-gray-800 ${statusColors[member.status]}`}
            aria-hidden="true"
          />
          <span className="sr-only">{member.name}，状态：{statusLabels[member.status]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
            <h4 id={`member-${member.id}-title`} className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              {member.emoji} {member.name}
            </h4>
            <span
              className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium ${statusBgColors[member.status]}`}
              aria-label={`状态：${statusLabels[member.status]}`}
            >
              {statusLabels[member.status]}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2" aria-label={`角色：${member.role}`}>{member.role}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2">提供商：{member.provider}</p>
          {member.currentTask && (
            <div className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded mb-1.5 sm:mb-2" aria-label={`当前任务：${member.currentTask}`}>
              📌 {member.currentTask}
            </div>
          )}
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <span className="text-gray-700 dark:text-gray-300" aria-label={`已完成 ${member.completedTasks} 个任务`}>
              <strong className="text-gray-900 dark:text-white">{member.completedTasks}</strong> 完成任务
            </span>
          </div>
        </div>
      </div>
    </article>
  );
});

// ============================================================================
// 导出 - 使用 memo 并自定义比较函数
// ============================================================================

export const MemberCard = memo(MemberCardComponent, (prevProps, nextProps) => {
  // 自定义比较：只在 member 相关属性变化时重新渲染
  return (
    prevProps.member.id === nextProps.member.id &&
    prevProps.member.name === nextProps.member.name &&
    prevProps.member.status === nextProps.member.status &&
    prevProps.member.currentTask === nextProps.member.currentTask &&
    prevProps.member.completedTasks === nextProps.member.completedTasks &&
    prevProps.compact === nextProps.compact
  );
});
