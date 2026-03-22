'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface Member {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'busy' | 'offline';
  avatar?: string;
  email?: string;
  tasks?: number;
}

interface MemberCardProps {
  members: Member[];
  height?: number;
  itemHeight?: number;
  onMemberClick?: (member: Member) => void;
  className?: string;
}

/**
 * MemberCard - 单个成员卡片组件
 */
function MemberCardItem({
  member,
  onClick
}: {
  member: Member;
  onClick?: (member: Member) => void;
}) {
  const statusColors = {
    online: 'bg-green-500',
    busy: 'bg-yellow-500',
    offline: 'bg-gray-400'
  };

  const statusLabels = {
    online: '在线',
    busy: '忙碌',
    offline: '离线'
  };

  return (
    <div
      className="p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      onClick={() => onClick?.(member)}
      data-testid={`member-${member.id}`}
    >
      <div className="flex items-center space-x-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {member.avatar ? (
            <img
              src={member.avatar}
              alt={member.name}
              className="w-12 h-12 rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-lg">
              {member.name.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Status indicator */}
          <div
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${statusColors[member.status]}`}
            title={statusLabels[member.status]}
          />
        </div>

        {/* Member info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {member.name}
          </h3>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            {member.role}
          </p>
          {member.email && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500 truncate">
              {member.email}
            </p>
          )}
        </div>

        {/* Status and tasks */}
        <div className="flex-shrink-0 text-right">
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
            <span
              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusColors[member.status]}`}
            />
            {statusLabels[member.status]}
          </div>
          {typeof member.tasks === 'number' && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              {member.tasks} 个任务
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * MemberCardList - 虚拟化的成员列表组件
 *
 * 使用 @tanstack/react-virtual 实现高性能的长列表渲染
 * 支持数千个成员流畅滚动
 */
export function MemberCardList({
  members = [],
  height = 600,
  itemHeight = 100,
  onMemberClick,
  className = ''
}: MemberCardProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // 使用 @tanstack/react-virtual 进行虚拟化
  const virtualizer = useVirtualizer({
    count: members.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5 // 预渲染 5 个项目以提升滚动流畅度
  });

  if (members.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-full text-gray-500 dark:text-gray-400 ${className}`}
        data-testid="member-card-empty"
      >
        <p className="text-sm">暂无成员</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`h-full overflow-auto ${className}`}
      data-testid="member-card-list"
      style={{ height: `${height}px` }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const member = members[virtualRow.index];
          return (
            <div
              key={member.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <MemberCardItem member={member} onClick={onMemberClick} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * MemberCardList.Static - 非虚拟化版本（用于少量数据）
 */
export function MemberCardListStatic({
  members = [],
  onMemberClick,
  className = ''
}: {
  members: Member[];
  onMemberClick?: (member: Member) => void;
  className?: string;
}) {
  if (members.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-full text-gray-500 dark:text-gray-400 ${className}`}
        data-testid="member-card-empty"
      >
        <p className="text-sm">暂无成员</p>
      </div>
    );
  }

  return (
    <div className={className} data-testid="member-card-list-static">
      {members.map((member) => (
        <MemberCardItem
          key={member.id}
          member={member}
          onClick={onMemberClick}
        />
      ))}
    </div>
  );
}

// 向后兼容的导出
export function MemberCard({
  members,
  height,
  itemHeight,
  onMemberClick,
  className
}: MemberCardProps) {
  // 如果数据量超过 50，使用虚拟化版本
  if (members && members.length > 50) {
    return (
      <MemberCardList
        members={members}
        height={height}
        itemHeight={itemHeight}
        onMemberClick={onMemberClick}
        className={className}
      />
    );
  }

  // 否则使用静态版本
  return (
    <MemberCardListStatic
      members={members || []}
      onMemberClick={onMemberClick}
      className={className}
    />
  );
}
