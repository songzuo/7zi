/**
 * 响应式成员列表组件
 *
 * 功能:
 * - 响应式网格布局 (1列 -> 2列 -> 3列 -> 4列)
 * - 移动端触摸优化
 * - 搜索和筛选
 * - 分页或无限滚动
 */

'use client';

import React, { useState, useMemo } from 'react';
import { MemberCard } from '@/components/MemberCard';
import type { UnifiedTeamMember } from '@/types/members';
import { useTranslations } from 'next-intl';

interface ResponsiveMemberListProps {
  members: UnifiedTeamMember[];
  locale: string;
  compact?: boolean;
  enableSearch?: boolean;
  enableFilter?: boolean;
}

export const ResponsiveMemberList: React.FC<ResponsiveMemberListProps> = ({
  members,
  locale,
  compact = false,
  enableSearch = true,
  enableFilter = true,
}) => {
  const t = useTranslations('team');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 过滤和搜索
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = member.name.toLowerCase().includes(query);
        const matchesRole = member.role.toLowerCase().includes(query);
        if (!matchesName && !matchesRole) {
          return false;
        }
      }

      // 状态过滤
      if (statusFilter !== 'all' && member.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [members, searchQuery, statusFilter]);

  return (
    <div className="w-full">
      {/* 搜索和筛选栏 */}
      {(enableSearch || enableFilter) && (
        <div className="mb-6 space-y-4">
          {/* 搜索框 */}
          {enableSearch && (
            <div className="relative">
              <input
                type="search"
                placeholder={t('searchPlaceholder') || '搜索成员...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-10 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all min-h-[44px] text-base"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          )}

          {/* 状态筛选 */}
          {enableFilter && (
            <div className="flex flex-wrap gap-2">
              {['all', 'online', 'working', 'busy', 'idle', 'offline'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all min-h-[40px] touch-active ${
                    statusFilter === status
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {status === 'all' && (t('all') || '全部')}
                  {status === 'online' && (t('online') || '在线')}
                  {status === 'working' && (t('working') || '工作中')}
                  {status === 'busy' && (t('busy') || '忙碌')}
                  {status === 'idle' && (t('idle') || '空闲')}
                  {status === 'offline' && (t('offline') || '离线')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 成员数量显示 */}
      <div className="mb-4 text-sm text-gray-600 dark:text-zinc-400">
        {t('showingMembers', {
          count: filteredMembers.length,
          total: members.length,
        }) || `显示 ${filteredMembers.length} / ${members.length} 位成员`}
      </div>

      {/* 响应式网格布局 */}
      <div
        className="grid gap-4 sm:gap-6
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-3
          xl:grid-cols-4"
      >
        {filteredMembers.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            compact={compact}
          />
        ))}
      </div>

      {/* 空状态 */}
      {filteredMembers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-zinc-400 text-lg">
            {t('noResults') || '没有找到匹配的成员'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ResponsiveMemberList;
