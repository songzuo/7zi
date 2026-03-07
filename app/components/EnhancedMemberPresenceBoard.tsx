'use client';

import React, { useState, useMemo, useCallback, memo } from 'react';
import { useTranslations } from 'next-intl';
import { AIMember } from '../app/dashboard/page';
import { useFilters } from '@/hooks/useFilters';
import { FilterPanel } from './FilterPanel';
import { FilterBar } from './FilterBar';
import { MEMBER_FILTER_FIELDS, FilterConfig, FilterTemplate } from '@/lib/types/filters';

interface EnhancedMemberPresenceBoardProps {
  members: AIMember[];
  compact?: boolean;
  showFilterPanel?: boolean;
}

/**
 * 增强版 MemberPresenceBoard - 带高级过滤器
 */
export const EnhancedMemberPresenceBoard: React.FC<EnhancedMemberPresenceBoardProps> = ({
  members,
  compact = false,
  showFilterPanel = false,
}) => {
  const t = useTranslations('member');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // 使用过滤器 hook
  const {
    activeFilters,
    savedFilters,
    filteredData,
    addFilter,
    removeFilter,
    clearFilters,
    createFromTemplate,
    applySavedFilter,
    saveFilter,
    filterCount,
    dataCount,
    filteredCount,
  } = useFilters(members, MEMBER_FILTER_FIELDS, 'memberFilters');

  // 处理过滤器保存
  const handleFilterSave = useCallback((filter: FilterConfig) => {
    addFilter(filter);
    saveFilter(filter);
    setIsFilterPanelOpen(false);
  }, [addFilter, saveFilter]);

  // 处理模板选择
  const handleTemplateSelect = useCallback((template: FilterTemplate) => {
    createFromTemplate(template);
  }, [createFromTemplate]);

  // 统计
  const stats = useMemo(() => ({
    working: filteredData.filter(m => m.status === 'working').length,
    busy: filteredData.filter(m => m.status === 'busy').length,
    idle: filteredData.filter(m => m.status === 'idle').length,
    offline: filteredData.filter(m => m.status === 'offline').length,
    withTask: filteredData.filter(m => m.currentTask).length,
    total: filteredData.length,
  }), [filteredData]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
      {/* 头部 */}
      <header className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 transition-colors">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* 标题行 */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span aria-hidden="true">👥</span> {t('title', { defaultValue: '团队成员' })}
            </h2>

            {/* 过滤器按钮 */}
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium 
                         rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                         ${isFilterPanelOpen || filterCount > 0
                           ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                           : 'text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                         }`}
              aria-expanded={isFilterPanelOpen}
              aria-label="高级过滤器"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="hidden sm:inline">过滤器</span>
              {filterCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">
                  {filterCount}
                </span>
              )}
            </button>
          </div>

          {/* 过滤器栏 */}
          {(isFilterPanelOpen || filterCount > 0) && (
            <FilterBar
              data={members}
              fields={MEMBER_FILTER_FIELDS}
              filteredData={filteredData}
              activeFilters={activeFilters}
              savedFilters={savedFilters}
              onAddFilter={addFilter}
              onRemoveFilter={removeFilter}
              onClearFilters={clearFilters}
              onCreateFromTemplate={handleTemplateSelect}
              onApplySavedFilter={applySavedFilter}
              showStats
            />
          )}

          {/* 过滤器面板 */}
          {isFilterPanelOpen && showFilterPanel && (
            <div className="mt-2">
              <FilterPanel
                type="member"
                onSave={handleFilterSave}
                onCancel={() => setIsFilterPanelOpen(false)}
              />
            </div>
          )}

          {/* 统计摘要 */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {stats.working} 工作中
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              {stats.busy} 忙碌
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              {stats.idle} 空闲
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-500" />
              {stats.offline} 离线
            </span>
            <span className="text-gray-400">|</span>
            <span>🎯 {stats.withTask} 有任务</span>
            <span className="text-gray-400">|</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              共 {stats.total} 人
            </span>
          </div>
        </div>
      </header>

      {/* 成员列表 */}
      <div 
        className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] sm:max-h-[600px] overflow-y-auto"
        role="list"
        aria-label="成员列表"
      >
        {filteredData.length === 0 ? (
          <div className="px-4 sm:px-6 py-10 sm:py-12 text-center text-gray-500 dark:text-gray-400" role="status">
            <p className="text-base sm:text-lg mb-2" aria-hidden="true">🔍</p>
            <p>{t('noMembers', { defaultValue: '没有找到匹配的成员' })}</p>
            {filterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                清除所有过滤条件
              </button>
            )}
          </div>
        ) : (
          filteredData.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              compact={compact}
              t={t}
            />
          ))
        )}
      </div>

      {/* 底部统计 */}
      {filteredData.length > 0 && (
        <footer className="px-4 sm:px-6 py-2 sm:py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-600 dark:text-gray-400 transition-colors">
          显示 {filteredData.length} / {members.length} 位成员
          {filterCount > 0 && ` (${filterCount} 个过滤器激活)`}
        </footer>
      )}
    </div>
  );
};

// ============================================================================
// 成员卡片组件
// ============================================================================

interface MemberCardProps {
  member: AIMember;
  compact?: boolean;
  t: ReturnType<typeof useTranslations<'member'>>;
}

const MemberCard = memo(function MemberCard({ member, compact, t }: MemberCardProps) {
  const statusColors = {
    working: 'bg-green-500',
    busy: 'bg-yellow-500',
    idle: 'bg-gray-400',
    offline: 'bg-gray-500 dark:bg-gray-600',
  } as const;

  const statusBgColors = {
    working: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    busy: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    idle: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    offline: 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500',
  } as const;

  const statusLabels = {
    working: t('status.working'),
    busy: t('status.busy'),
    idle: t('status.idle'),
    offline: t('status.offline'),
  } as const;

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src =
      `https://api.dicebear.com/7.x/bottts/svg?seed=${member.id}`;
  }, [member.id]);

  if (compact) {
    return (
      <article
        className="px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        role="listitem"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-shrink-0">
            <img
              src={member.avatar}
              alt=""
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full"
              onError={handleImageError}
            />
            <div
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white dark:border-gray-800 ${statusColors[member.status]}`}
              aria-hidden="true"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                {member.emoji} {member.name}
              </span>
              <span
                className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium ${statusBgColors[member.status]}`}
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
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-1 truncate">
                📌 {member.currentTask}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              {member.completedTasks}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              已完成
            </p>
          </div>
        </div>
      </article>
    );
  }

  // 默认卡片布局
  return (
    <article
      className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      role="listitem"
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="relative flex-shrink-0">
          <img
            src={member.avatar}
            alt=""
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full"
            onError={handleImageError}
          />
          <div
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white dark:border-gray-800 ${statusColors[member.status]}`}
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
            <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              {member.emoji} {member.name}
            </h4>
            <span
              className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium ${statusBgColors[member.status]}`}
            >
              {statusLabels[member.status]}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2">
            {member.role}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2">
            提供商：{member.provider}
          </p>
          {member.currentTask && (
            <div className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded mb-1.5 sm:mb-2 truncate">
              📌 {member.currentTask}
            </div>
          )}
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <span className="text-gray-700 dark:text-gray-300">
              <strong className="text-gray-900 dark:text-white">{member.completedTasks}</strong> 已完成
            </span>
          </div>
        </div>
      </div>
    </article>
  );
});

export default EnhancedMemberPresenceBoard;