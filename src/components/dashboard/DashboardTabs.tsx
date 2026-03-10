'use client';

import { memo, useCallback } from 'react';

export type TabId = 'overview' | 'projects' | 'activity';

interface DashboardTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS = [
  { id: 'overview' as const, label: '总览', emoji: '📈' },
  { id: 'projects' as const, label: '任务', emoji: '📁' },
  { id: 'activity' as const, label: '动态', emoji: '🔔' },
] as const;

/**
 * @fileoverview Dashboard 标签组件
 * @description 使用 React.memo 和 useCallback 优化渲染性能
 * - 标签数据使用常量，避免重新创建
 * - 点击回调使用 useCallback 缓存
 * - 组件使用 memo 防止不必要的重渲染
 */
const TabButton = memo(function TabButton({ 
  tab, 
  isActive, 
  onClick 
}: { 
  tab: typeof TABS[number]; 
  isActive: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-full font-medium transition-all ${
        isActive
          ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg'
          : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:shadow-md'
      }`}
      aria-pressed={isActive}
    >
      <span className="mr-2" aria-hidden="true">{tab.emoji}</span>
      {tab.label}
    </button>
  );
});

export const DashboardTabs = memo(function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <div className="flex gap-2 mb-8 justify-center" role="tablist">
      {TABS.map((tab) => (
        <TabButton
          key={tab.id}
          tab={tab}
          isActive={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
        />
      ))}
    </div>
  );
});