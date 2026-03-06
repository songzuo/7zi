'use client';

import { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { locales, type Locale } from '@/i18n/config';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';

const languageNames: Record<Locale, { name: string; nativeName: string; flag: string }> = {
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
};

interface SettingsPanelProps {
  onClose?: () => void;
  className?: string;
}

export function SettingsPanel({ onClose, className = '' }: SettingsPanelProps) {
  const { settings, setNotifications, resetSettings, setTheme } = useSettings();
  const theme = settings.theme;
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 切换语言
  const handleLanguageChange = (newLocale: Locale) => {
    router.replace(
      pathname,
      { locale: newLocale }
    );
  };

  // 切换主题
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };

  // 切换通知选项
  const handleNotificationToggle = (key: keyof typeof settings.notifications) => {
    setNotifications({
      [key]: !settings.notifications[key],
    });
  };

  // 重置设置
  const handleReset = () => {
    resetSettings();
    setTheme('system');
    setShowResetConfirm(false);
  };

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
          ⚙️ 设置
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="关闭设置"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-6 space-y-8">
        {/* 主题设置 */}
        <section>
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
            🎨 主题
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleThemeChange(t)}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                  ${theme === t
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-300'
                  }
                `}
              >
                <span className="text-2xl">
                  {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻'}
                </span>
                <span className="text-sm font-medium">
                  {t === 'light' ? '浅色' : t === 'dark' ? '深色' : '跟随系统'}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 语言设置 */}
        <section>
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
            🌐 语言
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {locales.map((locale) => (
              <button
                key={locale}
                onClick={() => handleLanguageChange(locale)}
                className={`
                  flex items-center gap-3 p-4 rounded-xl border-2 transition-all
                  ${currentLocale === locale
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-300'
                  }
                `}
              >
                <span className="text-2xl">{languageNames[locale].flag}</span>
                <div className="text-left">
                  <div className="text-sm font-medium">{languageNames[locale].nativeName}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{languageNames[locale].name}</div>
                </div>
                {currentLocale === locale && (
                  <svg className="w-5 h-5 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* 通知设置 */}
        <section>
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
            🔔 通知
          </h3>
          <div className="space-y-3">
            {/* 通知总开关 */}
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔔</span>
                <div>
                  <div className="font-medium text-zinc-900 dark:text-white">启用通知</div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">接收系统通知</div>
                </div>
              </div>
              <ToggleSwitch
                checked={settings.notifications.enabled}
                onChange={() => handleNotificationToggle('enabled')}
              />
            </div>

            {/* 通知子选项 */}
            {settings.notifications.enabled && (
              <div className="ml-4 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700 space-y-2">
                <NotificationToggle
                  icon="🔊"
                  label="声音"
                  description="播放通知声音"
                  checked={settings.notifications.sound}
                  onChange={() => handleNotificationToggle('sound')}
                />
                <NotificationToggle
                  icon="📧"
                  label="邮件"
                  description="发送邮件通知"
                  checked={settings.notifications.email}
                  onChange={() => handleNotificationToggle('email')}
                />
                <NotificationToggle
                  icon="📲"
                  label="推送"
                  description="浏览器推送通知"
                  checked={settings.notifications.push}
                  onChange={() => handleNotificationToggle('push')}
                />
              </div>
            )}
          </div>
        </section>

        {/* 重置设置 */}
        <section className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
          {showResetConfirm ? (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <span className="text-red-500">⚠️</span>
              <p className="flex-1 text-sm text-red-700 dark:text-red-300">确定要重置所有设置吗？</p>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
              >
                确认重置
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重置为默认设置
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

// 切换开关组件
interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${checked ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
}

// 通知选项组件
interface NotificationToggleProps {
  icon: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function NotificationToggle({ icon, label, description, checked, onChange }: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <div>
          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{description}</div>
        </div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

// 简洁版设置面板（用于弹窗）
export function SettingsPanelCompact({ onClose, className = '' }: SettingsPanelProps) {
  return (
    <SettingsPanel
      onClose={onClose}
      className={`max-w-md ${className}`}
    />
  );
}

export default SettingsPanel;
