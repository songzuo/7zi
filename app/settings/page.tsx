'use client';

import React, { useState } from 'react';
import { useTheme, Theme } from '../../components/ThemeProvider';

/**
 * 设置页面
 * 
 * 功能：
 * - 主题切换（浅色/深色/跟随系统）
 * - 用户偏好设置
 * - 显示设置
 */

interface SettingItem {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: string; description: string }[] = [
  { value: 'light', label: '浅色模式', icon: '☀️', description: '始终使用浅色主题' },
  { value: 'dark', label: '深色模式', icon: '🌙', description: '始终使用深色主题' },
  { value: 'system', label: '跟随系统', icon: '💻', description: '自动跟随系统主题设置' },
];

const DISPLAY_SETTINGS: SettingItem[] = [
  { id: 'animations', label: '动画效果', description: '启用页面过渡动画', icon: '✨' },
  { id: 'compact', label: '紧凑模式', description: '减少元素间距，显示更多内容', icon: '📐' },
  { id: 'notifications', label: '桌面通知', description: '接收任务更新通知', icon: '🔔' },
  { id: 'sounds', label: '提示音', description: '操作时播放提示音', icon: '🔊' },
];

export default function SettingsPage() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [settings, setSettings] = useState<Record<string, boolean>>({
    animations: true,
    compact: false,
    notifications: false,
    sounds: false,
  });

  const toggleSetting = (id: string) => {
    setSettings(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span aria-hidden="true">⚙️</span>
            用户设置
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            自定义您的应用体验和偏好设置
          </p>
        </header>

        {/* 主题设置 */}
        <section className="mb-8" aria-labelledby="theme-heading">
          <h2 id="theme-heading" className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span aria-hidden="true">🎨</span>
            主题设置
          </h2>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`
                    p-4 rounded-xl border-2 transition-all text-left
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                    ${theme === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                  aria-pressed={theme === option.value}
                  aria-label={`选择${option.label}`}
                >
                  <div className="text-3xl mb-2" aria-hidden="true">{option.icon}</div>
                  <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{option.description}</div>
                  {theme === option.value && (
                    <div className="mt-2 text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center gap-1">
                      <span aria-hidden="true">✓</span>
                      <span>当前选择</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            {/* 当前主题状态 */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  当前应用主题:
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <span aria-hidden="true">{resolvedTheme === 'dark' ? '🌙' : '☀️'}</span>
                  {resolvedTheme === 'dark' ? '深色模式' : '浅色模式'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 显示设置 */}
        <section className="mb-8" aria-labelledby="display-heading">
          <h2 id="display-heading" className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span aria-hidden="true">🖥️</span>
            显示设置
          </h2>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg divide-y divide-gray-200 dark:divide-gray-700 transition-colors">
            {DISPLAY_SETTINGS.map((item) => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{item.label}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{item.description}</div>
                  </div>
                </div>
                
                {/* Toggle Switch */}
                <button
                  onClick={() => toggleSetting(item.id)}
                  className={`
                    relative w-14 h-8 rounded-full transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                    ${settings[item.id]
                      ? 'bg-blue-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                    }
                  `}
                  role="switch"
                  aria-checked={settings[item.id]}
                  aria-label={`切换${item.label}`}
                >
                  <span
                    className={`
                      absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200
                      ${settings[item.id] ? 'translate-x-7' : 'translate-x-1'}
                    `}
                    aria-hidden="true"
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 数据与隐私 */}
        <section className="mb-8" aria-labelledby="privacy-heading">
          <h2 id="privacy-heading" className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span aria-hidden="true">🔒</span>
            数据与隐私
          </h2>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">本地存储</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">设置保存在浏览器本地</div>
                </div>
                <span className="text-green-600 dark:text-green-400 text-sm font-medium">✓ 已启用</span>
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label="清除所有本地数据"
                >
                  🗑️ 清除所有本地数据
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 关于 */}
        <section aria-labelledby="about-heading">
          <h2 id="about-heading" className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span aria-hidden="true">ℹ️</span>
            关于
          </h2>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors">
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>版本</span>
                <span className="text-gray-900 dark:text-white font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>构建</span>
                <span className="text-gray-900 dark:text-white font-medium">Next.js 16.1.6</span>
              </div>
              <div className="flex justify-between">
                <span>团队</span>
                <span className="text-gray-900 dark:text-white font-medium">宋琢环球旅行</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <a
                href="https://7zi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                访问官网 →
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}