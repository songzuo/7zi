'use client';

// Import types
import type { NavItem } from './types';

// ============================================================================
// Navigation Items
// ============================================================================

const NAV_ITEMS: NavItem[] = [
  { id: 'profile', label: '个人资料', icon: '👤' },
  { id: 'security', label: '账户安全', icon: '🔒' },
  { id: 'notifications', label: '通知偏好', icon: '🔔' },
  { id: 'privacy', label: '隐私设置', icon: '🛡️' },
  { id: 'theme', label: '主题设置', icon: '🎨' },
];

interface SettingsHeaderProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export function SettingsHeader({ activeSection, setActiveSection }: SettingsHeaderProps) {
  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">用户设置</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">管理您的账户设置和偏好</p>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden mb-6 overflow-x-auto">
        <div className="flex gap-2 pb-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-colors
                ${activeSection === item.id
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }
              `}
            >
              <span>{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default SettingsHeader;