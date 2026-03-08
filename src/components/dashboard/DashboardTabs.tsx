'use client';

export type TabId = 'overview' | 'projects' | 'activity';

interface DashboardTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS = [
  { id: 'overview' as const, label: '总览', emoji: '📈' },
  { id: 'projects' as const, label: '任务', emoji: '📁' },
  { id: 'activity' as const, label: '动态', emoji: '🔔' },
];

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <div className="flex gap-2 mb-8 justify-center">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-6 py-3 rounded-full font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg'
              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:shadow-md'
          }`}
        >
          <span className="mr-2">{tab.emoji}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}