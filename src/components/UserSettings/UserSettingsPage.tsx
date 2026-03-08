'use client';

import { useState } from 'react';
import { useUserSettings } from './hooks/useUserSettings';

// Import section components
import ProfileSection from './sections/ProfileSection';
import SecuritySection from './sections/SecuritySection';
import NotificationsSection from './sections/NotificationsSection';
import PrivacySection from './sections/PrivacySection';
import ThemeSection from './sections/ThemeSection';

// ============================================================================
// Navigation Items
// ============================================================================

const NAV_ITEMS = [
  { id: 'profile', label: '个人资料', icon: '👤' },
  { id: 'security', label: '账户安全', icon: '🔒' },
  { id: 'notifications', label: '通知偏好', icon: '🔔' },
  { id: 'privacy', label: '隐私设置', icon: '🛡️' },
  { id: 'theme', label: '主题设置', icon: '🎨' },
];

// ============================================================================
// Main User Settings Page Component
// ============================================================================

interface UserSettingsPageProps {
  className?: string;
}

export function UserSettingsPage({ className = '' }: UserSettingsPageProps) {
  const {
    notifications,
    privacy,
    setPrivacy,
    activeSection,
    setActiveSection,
    handleNotificationChange,
  } = useUserSettings();

  // Theme state (local)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  return (
    <div className={`min-h-screen bg-zinc-50 dark:bg-zinc-900 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
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

        <div className="flex gap-8">
          {/* Desktop Sidebar Navigation */}
          <nav className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-4 sticky top-8">
              <ul className="space-y-2">
                {NAV_ITEMS.map(item => (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveSection(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left
                        ${activeSection === item.id
                          ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                        }
                      `}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Profile Section */}
            <section id="profile" className={`${activeSection !== 'profile' ? 'hidden lg:block' : ''}`}>
              <ProfileSection isActive={activeSection === 'profile'} />
            </section>

            {/* Security Section */}
            <section id="security" className={`${activeSection !== 'security' ? 'hidden lg:block' : ''}`}>
              <SecuritySection />
            </section>

            {/* Notifications Section */}
            <section id="notifications" className={`${activeSection !== 'notifications' ? 'hidden lg:block' : ''}`}>
              <NotificationsSection
                notifications={notifications}
                onNotificationChange={handleNotificationChange}
              />
            </section>

            {/* Privacy Section */}
            <section id="privacy" className={`${activeSection !== 'privacy' ? 'hidden lg:block' : ''}`}>
              <PrivacySection
                privacy={privacy}
                setPrivacy={setPrivacy}
              />
            </section>

            {/* Theme Section */}
            <section id="theme" className={`${activeSection !== 'theme' ? 'hidden lg:block' : ''}`}>
              <ThemeSection theme={theme} setTheme={setTheme} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserSettingsPage;