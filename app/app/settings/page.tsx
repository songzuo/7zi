'use client';

import React, { useState } from 'react';
import { useTheme, Theme } from '../../components/ThemeProvider';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { ThemeCustomizer } from '../../components/ThemeCustomizer';

/**
 * 开关组件
 */
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, label, description, icon, disabled }: ToggleSwitchProps) {
  return (
    <div className={`flex items-center justify-between gap-4 p-4 rounded-lg ${disabled ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'} transition-colors`}>
      <div className="flex items-center gap-3">
        {icon && <span className="text-2xl" aria-hidden="true">{icon}</span>}
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{label}</div>
          {description && <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>}
        </div>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative w-14 h-8 rounded-full transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
          ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
        role="switch"
        aria-checked={checked}
        aria-label={`切换${label}`}
        disabled={disabled}
      >
        <span
          className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${checked ? 'translate-x-7' : 'translate-x-1'}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

/**
 * 选择器组件
 */
interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  description?: string;
  icon?: string;
}

function SelectField({ label, value, options, onChange, description, icon }: SelectFieldProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex items-center gap-3">
        {icon && <span className="text-2xl" aria-hidden="true">{icon}</span>}
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{label}</div>
          {description && <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>}
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[140px]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

/**
 * 设置页面
 */
export default function SettingsPage() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { 
    preferences, 
    mounted, 
    updatePreference, 
    resetPreferences,
    exportPreferences,
    importPreferences,
  } = useUserPreferences();
  
  const [activeSection, setActiveSection] = useState<'general' | 'display' | 'notifications' | 'locale' | 'privacy' | 'theme' | 'advanced'>('general');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState('');
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  // 主题选项
  const THEME_OPTIONS: { value: Theme; label: string; icon: string; description: string }[] = [
    { value: 'light', label: '浅色模式', icon: '☀️', description: '始终使用浅色主题' },
    { value: 'dark', label: '深色模式', icon: '🌙', description: '始终使用深色主题' },
    { value: 'system', label: '跟随系统', icon: '💻', description: '自动跟随系统主题设置' },
  ];

  // 字体大小选项
  const FONT_SIZE_OPTIONS = [
    { value: 'small', label: '小' },
    { value: 'medium', label: '中' },
    { value: 'large', label: '大' },
  ];

  // 日期格式选项
  const DATE_FORMAT_OPTIONS = [
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  ];

  // 时间格式选项
  const TIME_FORMAT_OPTIONS = [
    { value: '24h', label: '24 小时制' },
    { value: '12h', label: '12 小时制' },
  ];

  // 每周起始日选项
  const WEEK_START_OPTIONS = [
    { value: '0', label: '周日' },
    { value: '1', label: '周一' },
    { value: '6', label: '周六' },
  ];

  // 导出设置
  const handleExport = () => {
    const data = exportPreferences();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-preferences-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入设置
  const handleImport = () => {
    const result = importPreferences(importData);
    if (result.success) {
      setImportResult({ success: true, message: '设置导入成功！' });
      setTimeout(() => {
        setShowImportDialog(false);
        setImportResult(null);
      }, 1500);
    } else {
      setImportResult({ success: false, message: result.error || '导入失败' });
    }
  };

  // 侧边栏菜单项
  const menuItems = [
    { id: 'general', label: '通用', icon: '⚙️' },
    { id: 'display', label: '显示', icon: '🖥️' },
    { id: 'notifications', label: '通知', icon: '🔔' },
    { id: 'locale', label: '语言和地区', icon: '🌍' },
    { id: 'privacy', label: '隐私', icon: '🔒' },
    { id: 'theme', label: '主题定制', icon: '🎨' },
    { id: 'advanced', label: '高级', icon: '🔧' },
  ];

  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-8">
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

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 侧边栏菜单 */}
          <nav className="lg:w-56 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sticky top-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as typeof activeSection)}
                  className={`
                    w-full px-4 py-3 rounded-lg text-left flex items-center gap-3 transition-colors
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${activeSection === item.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                  aria-current={activeSection === item.id ? 'page' : undefined}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* 内容区域 */}
          <div className="flex-1 min-w-0">
            {/* 通用设置 */}
            {activeSection === 'general' && (
              <div className="space-y-6">
                {/* 主题选择 */}
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span aria-hidden="true">🎨</span>
                    外观主题
                  </h2>
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
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }
                        `}
                        aria-pressed={theme === option.value}
                      >
                        <div className="text-3xl mb-2">{option.icon}</div>
                        <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{option.description}</div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">当前应用主题:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <span>{resolvedTheme === 'dark' ? '🌙' : '☀️'}</span>
                      {resolvedTheme === 'dark' ? '深色模式' : '浅色模式'}
                    </span>
                  </div>
                </section>

                {/* 快速设置 */}
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg divide-y divide-gray-200 dark:divide-gray-700">
                  <ToggleSwitch
                    checked={preferences.display.animations}
                    onChange={(v) => updatePreference('display', { animations: v })}
                    label="动画效果"
                    description="启用页面过渡和交互动画"
                    icon="✨"
                  />
                  <ToggleSwitch
                    checked={preferences.display.compactMode}
                    onChange={(v) => updatePreference('display', { compactMode: v })}
                    label="紧凑模式"
                    description="减少元素间距，显示更多内容"
                    icon="📐"
                  />
                  <ToggleSwitch
                    checked={preferences.display.sidebarExpanded}
                    onChange={(v) => updatePreference('display', { sidebarExpanded: v })}
                    label="展开侧边栏"
                    description="默认展开侧边栏"
                    icon="📑"
                  />
                </section>
              </div>
            )}

            {/* 显示设置 */}
            {activeSection === 'display' && (
              <div className="space-y-6">
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg divide-y divide-gray-200 dark:divide-gray-700">
                  <SelectField
                    label="字体大小"
                    value={preferences.display.fontSize}
                    options={FONT_SIZE_OPTIONS}
                    onChange={(v) => updatePreference('display', { fontSize: v as 'small' | 'medium' | 'large' })}
                    description="调整界面文字大小"
                    icon="🔤"
                  />
                  <ToggleSwitch
                    checked={preferences.display.showAvatars}
                    onChange={(v) => updatePreference('display', { showAvatars: v })}
                    label="显示头像"
                    description="在列表中显示用户头像"
                    icon="👤"
                  />
                  <ToggleSwitch
                    checked={preferences.display.showStatusIndicators}
                    onChange={(v) => updatePreference('display', { showStatusIndicators: v })}
                    label="状态指示器"
                    description="显示在线状态和活动指示器"
                    icon="🟢"
                  />
                </section>
              </div>
            )}

            {/* 通知设置 */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg divide-y divide-gray-200 dark:divide-gray-700">
                  <ToggleSwitch
                    checked={preferences.notifications.enabled}
                    onChange={(v) => updatePreference('notifications', { enabled: v })}
                    label="启用通知"
                    description="接收桌面通知"
                    icon="🔔"
                  />
                  <ToggleSwitch
                    checked={preferences.notifications.taskUpdates}
                    onChange={(v) => updatePreference('notifications', { taskUpdates: v })}
                    label="任务更新"
                    description="任务状态变更时通知"
                    icon="📋"
                    disabled={!preferences.notifications.enabled}
                  />
                  <ToggleSwitch
                    checked={preferences.notifications.mentions}
                    onChange={(v) => updatePreference('notifications', { mentions: v })}
                    label="提及通知"
                    description="有人@你时通知"
                    icon="💬"
                    disabled={!preferences.notifications.enabled}
                  />
                  <ToggleSwitch
                    checked={preferences.notifications.system}
                    onChange={(v) => updatePreference('notifications', { system: v })}
                    label="系统通知"
                    description="重要系统消息通知"
                    icon="📢"
                    disabled={!preferences.notifications.enabled}
                  />
                  <ToggleSwitch
                    checked={preferences.notifications.sounds}
                    onChange={(v) => updatePreference('notifications', { sounds: v })}
                    label="提示音"
                    description="通知时播放声音"
                    icon="🔊"
                    disabled={!preferences.notifications.enabled}
                  />
                </section>
              </div>
            )}

            {/* 语言和地区 */}
            {activeSection === 'locale' && (
              <div className="space-y-6">
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg divide-y divide-gray-200 dark:divide-gray-700">
                  <SelectField
                    label="界面语言"
                    value={preferences.locale.language}
                    options={[
                      { value: 'zh-CN', label: '简体中文' },
                      { value: 'zh-TW', label: '繁體中文' },
                      { value: 'en', label: 'English' },
                      { value: 'ja', label: '日本語' },
                    ]}
                    onChange={(v) => updatePreference('locale', { language: v })}
                    description="选择界面显示语言"
                    icon="🌍"
                  />
                  <SelectField
                    label="时区"
                    value={preferences.locale.timezone}
                    options={[
                      { value: 'Asia/Shanghai', label: '中国标准时间 (UTC+8)' },
                      { value: 'Asia/Tokyo', label: '日本标准时间 (UTC+9)' },
                      { value: 'America/New_York', label: '美国东部时间' },
                      { value: 'America/Los_Angeles', label: '美国太平洋时间' },
                      { value: 'Europe/London', label: '伦敦时间' },
                      { value: 'Europe/Berlin', label: '柏林时间' },
                    ]}
                    onChange={(v) => updatePreference('locale', { timezone: v })}
                    description="设置您的时区"
                    icon="🕐"
                  />
                  <SelectField
                    label="日期格式"
                    value={preferences.locale.dateFormat}
                    options={DATE_FORMAT_OPTIONS}
                    onChange={(v) => updatePreference('locale', { dateFormat: v as typeof preferences.locale.dateFormat })}
                    description="日期显示格式"
                    icon="📅"
                  />
                  <SelectField
                    label="时间格式"
                    value={preferences.locale.timeFormat}
                    options={TIME_FORMAT_OPTIONS}
                    onChange={(v) => updatePreference('locale', { timeFormat: v as '24h' | '12h' })}
                    description="时间显示格式"
                    icon="⏰"
                  />
                  <SelectField
                    label="每周起始日"
                    value={String(preferences.locale.weekStartsOn)}
                    options={WEEK_START_OPTIONS}
                    onChange={(v) => updatePreference('locale', { weekStartsOn: Number(v) as 0 | 1 | 6 })}
                    description="日历周的起始日"
                    icon="📆"
                  />
                </section>
              </div>
            )}

            {/* 隐私设置 */}
            {activeSection === 'privacy' && (
              <div className="space-y-6">
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg divide-y divide-gray-200 dark:divide-gray-700">
                  <ToggleSwitch
                    checked={preferences.privacy.showOnlineStatus}
                    onChange={(v) => updatePreference('privacy', { showOnlineStatus: v })}
                    label="显示在线状态"
                    description="允许他人看到您的在线状态"
                    icon="🟢"
                  />
                  <ToggleSwitch
                    checked={preferences.privacy.allowAnalytics}
                    onChange={(v) => updatePreference('privacy', { allowAnalytics: v })}
                    label="允许数据分析"
                    description="帮助我们改进产品体验"
                    icon="📊"
                  />
                  <ToggleSwitch
                    checked={preferences.privacy.publicProfile}
                    onChange={(v) => updatePreference('privacy', { publicProfile: v })}
                    label="公开个人资料"
                    description="允许他人查看您的公开信息"
                    icon="👤"
                  />
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">数据管理</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">本地存储</span>
                      <span className="text-green-600 dark:text-green-400 text-sm">✓ 已启用</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      您的设置安全存储在本地浏览器中，不会上传到服务器。
                    </p>
                    <button
                      onClick={resetPreferences}
                      className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      🗑️ 清除所有设置
                    </button>
                  </div>
                </section>
              </div>
            )}

            {/* 主题定制 */}
            {activeSection === 'theme' && (
              <ThemeCustomizer />
            )}

            {/* 高级设置 */}
            {activeSection === 'advanced' && (
              <div className="space-y-6">
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg divide-y divide-gray-200 dark:divide-gray-700">
                  <SelectField
                    label="每页显示数量"
                    value={String(preferences.advanced.pageSize)}
                    options={[
                      { value: '10', label: '10 条' },
                      { value: '20', label: '20 条' },
                      { value: '50', label: '50 条' },
                      { value: '100', label: '100 条' },
                    ]}
                    onChange={(v) => updatePreference('advanced', { pageSize: Number(v) })}
                    description="列表每页显示的项目数量"
                    icon="📄"
                  />
                  <ToggleSwitch
                    checked={preferences.advanced.experimentalFeatures}
                    onChange={(v) => updatePreference('advanced', { experimentalFeatures: v })}
                    label="实验性功能"
                    description="启用正在开发中的新功能"
                    icon="🧪"
                  />
                  <ToggleSwitch
                    checked={preferences.advanced.debugMode}
                    onChange={(v) => updatePreference('advanced', { debugMode: v })}
                    label="调试模式"
                    description="显示详细的调试信息"
                    icon="🐛"
                  />
                </section>

                {/* 导入导出 */}
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">导入/导出设置</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleExport}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      📤 导出设置
                    </button>
                    <button
                      onClick={() => setShowImportDialog(true)}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                    >
                      📥 导入设置
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    导出您的设置为 JSON 文件，方便备份或在其他设备导入。
                  </p>
                </section>

                {/* 关于 */}
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">关于</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">版本</span>
                      <span className="text-gray-900 dark:text-white font-medium">1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">框架</span>
                      <span className="text-gray-900 dark:text-white font-medium">Next.js 16.1.6</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">团队</span>
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
                </section>
              </div>
            )}
          </div>
        </div>

        {/* 导入对话框 */}
        {showImportDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                导入设置
              </h3>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="粘贴导出的 JSON 设置..."
                className="w-full h-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
              {importResult && (
                <div className={`mt-2 text-sm ${importResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {importResult.success ? '✓' : '✗'} {importResult.message}
                </div>
              )}
              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={() => { setShowImportDialog(false); setImportData(''); setImportResult(null); }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importData.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  导入
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}