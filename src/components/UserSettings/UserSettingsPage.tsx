'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useSettings } from '@/contexts/SettingsContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Import types
import type {
  UserProfile,
  SecuritySettings,
  NotificationPreferences,
  PrivacySettings,
  FormErrors,
  PasswordForm,
  SaveStatus,
  NavItem,
} from './types';

// Import validation utilities
import {
  validateNickname,
  validateBio,
  validatePassword,
  validateConfirmPassword,
} from './validation';

// Import sub-components
import ToggleSwitch from './ToggleSwitch';
import SectionCard from './SectionCard';
import AvatarUpload from './AvatarUpload';

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

// ============================================================================
// Theme Options
// ============================================================================

const THEME_OPTIONS = [
  { value: 'light' as const, label: '浅色模式', icon: '☀️', desc: '适合白天使用' },
  { value: 'dark' as const, label: '深色模式', icon: '🌙', desc: '适合夜间使用' },
  { value: 'system' as const, label: '跟随系统', icon: '💻', desc: '自动适应系统设置' },
];

// ============================================================================
// Privacy Visibility Options
// ============================================================================

const VISIBILITY_OPTIONS = [
  { value: 'public' as const, label: '公开', desc: '所有人可见' },
  { value: 'friends' as const, label: '仅好友', desc: '仅好友可见' },
  { value: 'private' as const, label: '私密', desc: '仅自己可见' },
];

// ============================================================================
// Main User Settings Page Component
// ============================================================================

interface UserSettingsPageProps {
  className?: string;
}

export function UserSettingsPage({ className = '' }: UserSettingsPageProps) {
  const { theme, setTheme } = useTheme();
  const { setNotifications: setAppNotifications } = useSettings();

  // Local storage for user profile
  const [storedProfile, setStoredProfile] = useLocalStorage<UserProfile>('user-profile', {
    nickname: '',
    avatar: '',
    bio: '',
    email: '',
  });

  // State
  const [profile, setProfile] = useState<UserProfile>(storedProfile);
  const [security, setSecurity] = useLocalStorage<SecuritySettings>('user-security', {
    twoFactorEnabled: false,
    lastPasswordChange: null,
  });
  const [notifications, setNotifications] = useLocalStorage<NotificationPreferences>('user-notifications', {
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    weeklyDigest: true,
    mentionNotifications: true,
  });
  const [privacy, setPrivacy] = useLocalStorage<PrivacySettings>('user-privacy', {
    profileVisibility: 'public',
    showEmail: false,
    showActivity: true,
    allowMessages: true,
    dataCollection: true,
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Form errors
  const [errors, setErrors] = useState<FormErrors>({});

  // Save status
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Active section for mobile navigation
  const [activeSection, setActiveSection] = useState<string>('profile');

  // Sync profile with local storage
  useEffect(() => {
    setProfile(storedProfile);
  }, [storedProfile]);

  // Handlers
  const handleProfileChange = useCallback((field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    
    // Validate on change
    if (field === 'nickname') {
      const error = validateNickname(value);
      setErrors(prev => ({ ...prev, nickname: error }));
    } else if (field === 'bio') {
      const error = validateBio(value);
      setErrors(prev => ({ ...prev, bio: error }));
    }
  }, []);

  const handlePasswordChange = useCallback((field: keyof PasswordForm, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    
    // Validate on change
    if (field === 'newPassword') {
      const error = validatePassword(value);
      setErrors(prev => ({ ...prev, newPassword: error, confirmPassword: undefined }));
    } else if (field === 'confirmPassword') {
      const error = validateConfirmPassword(passwordForm.newPassword, value);
      setErrors(prev => ({ ...prev, confirmPassword: error }));
    }
  }, [passwordForm.newPassword]);

  const handleSaveProfile = useCallback(async () => {
    // Validate all fields
    const nicknameError = validateNickname(profile.nickname);
    const bioError = validateBio(profile.bio);
    
    if (nicknameError || bioError) {
      setErrors({ nickname: nicknameError, bio: bioError });
      return;
    }

    setSaveStatus('saving');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setStoredProfile(profile);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [profile, setStoredProfile]);

  const handleChangePassword = useCallback(async () => {
    // Validate passwords
    const newPasswordError = validatePassword(passwordForm.newPassword);
    const confirmPasswordError = validateConfirmPassword(passwordForm.newPassword, passwordForm.confirmPassword);
    
    if (newPasswordError || confirmPasswordError) {
      setErrors({ newPassword: newPasswordError, confirmPassword: confirmPasswordError });
      return;
    }

    setSaveStatus('saving');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setSecurity(prev => ({ ...prev, lastPasswordChange: new Date().toISOString() }));
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [passwordForm, setSecurity]);

  const handleToggle2FA = useCallback(() => {
    setSecurity(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }));
  }, [setSecurity]);

  const handleNotificationChange = useCallback((key: keyof NotificationPreferences) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    // Sync with app settings
    if (key === 'pushNotifications') {
      setAppNotifications({ push: !notifications.pushNotifications });
    }
  }, [notifications.pushNotifications, setAppNotifications, setNotifications]);

  const handlePrivacyChange = useCallback((key: keyof PrivacySettings, value?: boolean | string) => {
    setPrivacy(prev => ({
      ...prev,
      [key]: value !== undefined ? value : !prev[key],
    }));
  }, [setPrivacy]);

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
              <SectionCard title="个人资料" icon="👤">
                <div className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <AvatarUpload
                      avatar={profile.avatar}
                      onAvatarChange={(url) => handleProfileChange('avatar', url)}
                    />
                    <div>
                      <h3 className="text-lg font-medium text-zinc-900 dark:text-white">头像</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        支持 JPG、PNG 格式，建议尺寸 200x200 像素
                      </p>
                    </div>
                  </div>

                  {/* Nickname */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      昵称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profile.nickname}
                      onChange={(e) => handleProfileChange('nickname', e.target.value)}
                      placeholder="请输入您的昵称"
                      className={`
                        w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-700 border
                        ${errors.nickname
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-zinc-200 dark:border-zinc-600 focus:border-cyan-500'
                        }
                        text-zinc-900 dark:text-white focus:outline-none transition-colors
                      `}
                    />
                    {errors.nickname && (
                      <p className="mt-2 text-sm text-red-500">{errors.nickname}</p>
                    )}
                  </div>

                  {/* Email (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      邮箱
                    </label>
                    <input
                      type="email"
                      value={profile.email || 'user@example.com'}
                      disabled
                      className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                    />
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                      邮箱地址不可更改，如需帮助请联系客服
                    </p>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      个人简介
                    </label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => handleProfileChange('bio', e.target.value)}
                      placeholder="介绍一下自己..."
                      rows={4}
                      className={`
                        w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-700 border
                        ${errors.bio
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-zinc-200 dark:border-zinc-600 focus:border-cyan-500'
                        }
                        text-zinc-900 dark:text-white focus:outline-none transition-colors resize-none
                      `}
                    />
                    <div className="flex justify-between mt-2">
                      {errors.bio && (
                        <p className="text-sm text-red-500">{errors.bio}</p>
                      )}
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 ml-auto">
                        {profile.bio.length}/200
                      </p>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saveStatus === 'saving'}
                      className={`
                        px-6 py-3 rounded-xl font-medium transition-all
                        ${saveStatus === 'saving'
                          ? 'bg-zinc-300 dark:bg-zinc-600 text-zinc-500 cursor-not-allowed'
                          : 'bg-cyan-500 text-white hover:bg-cyan-600 hover:shadow-lg'
                        }
                      `}
                    >
                      {saveStatus === 'saving' ? '保存中...' : '保存更改'}
                    </button>
                    {saveStatus === 'saved' && (
                      <span className="text-green-500 flex items-center gap-1">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        已保存
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-red-500">保存失败，请重试</span>
                    )}
                  </div>
                </div>
              </SectionCard>
            </section>

            {/* Security Section */}
            <section id="security" className={`${activeSection !== 'security' ? 'hidden lg:block' : ''}`}>
              <SectionCard title="账户安全" icon="🔒">
                <div className="space-y-8">
                  {/* Change Password */}
                  <div>
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">修改密码</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          当前密码
                        </label>
                        <input
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                          placeholder="请输入当前密码"
                          className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          新密码
                        </label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                          placeholder="请输入新密码"
                          className={`
                            w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-700 border
                            ${errors.newPassword
                              ? 'border-red-500 focus:border-red-500'
                              : 'border-zinc-200 dark:border-zinc-600 focus:border-cyan-500'
                            }
                            text-zinc-900 dark:text-white focus:outline-none transition-colors
                          `}
                        />
                        {errors.newPassword && (
                          <p className="mt-2 text-sm text-red-500">{errors.newPassword}</p>
                        )}
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                          密码需包含至少 8 个字符，包括大小写字母和数字
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          确认新密码
                        </label>
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                          placeholder="请再次输入新密码"
                          className={`
                            w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-700 border
                            ${errors.confirmPassword
                              ? 'border-red-500 focus:border-red-500'
                              : 'border-zinc-200 dark:border-zinc-600 focus:border-cyan-500'
                            }
                            text-zinc-900 dark:text-white focus:outline-none transition-colors
                          `}
                        />
                        {errors.confirmPassword && (
                          <p className="mt-2 text-sm text-red-500">{errors.confirmPassword}</p>
                        )}
                      </div>
                      <button
                        onClick={handleChangePassword}
                        disabled={saveStatus === 'saving'}
                        className="px-6 py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        更新密码
                      </button>
                    </div>
                    {security.lastPasswordChange && (
                      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                        上次修改密码: {new Date(security.lastPasswordChange).toLocaleDateString('zh-CN')}
                      </p>
                    )}
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="pt-6 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white">两步验证</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                          为您的账户添加额外的安全保护
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={security.twoFactorEnabled}
                        onChange={handleToggle2FA}
                        label="两步验证"
                      />
                    </div>
                    {security.twoFactorEnabled && (
                      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <p className="text-green-700 dark:text-green-400 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          两步验证已启用
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>
            </section>

            {/* Notifications Section */}
            <section id="notifications" className={`${activeSection !== 'notifications' ? 'hidden lg:block' : ''}`}>
              <SectionCard title="通知偏好" icon="🔔">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white">邮件通知</h4>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">接收重要更新和提醒邮件</p>
                    </div>
                    <ToggleSwitch
                      checked={notifications.emailNotifications}
                      onChange={() => handleNotificationChange('emailNotifications')}
                      label="邮件通知"
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-t border-zinc-200 dark:border-zinc-700">
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white">推送通知</h4>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">浏览器推送通知</p>
                    </div>
                    <ToggleSwitch
                      checked={notifications.pushNotifications}
                      onChange={() => handleNotificationChange('pushNotifications')}
                      label="推送通知"
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-t border-zinc-200 dark:border-zinc-700">
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white">营销邮件</h4>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">接收产品更新和优惠信息</p>
                    </div>
                    <ToggleSwitch
                      checked={notifications.marketingEmails}
                      onChange={() => handleNotificationChange('marketingEmails')}
                      label="营销邮件"
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-t border-zinc-200 dark:border-zinc-700">
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white">每周摘要</h4>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">每周活动汇总邮件</p>
                    </div>
                    <ToggleSwitch
                      checked={notifications.weeklyDigest}
                      onChange={() => handleNotificationChange('weeklyDigest')}
                      label="每周摘要"
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-t border-zinc-200 dark:border-zinc-700">
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white">@提及通知</h4>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">当有人@您时收到通知</p>
                    </div>
                    <ToggleSwitch
                      checked={notifications.mentionNotifications}
                      onChange={() => handleNotificationChange('mentionNotifications')}
                      label="@提及通知"
                    />
                  </div>
                </div>
              </SectionCard>
            </section>

            {/* Privacy Section */}
            <section id="privacy" className={`${activeSection !== 'privacy' ? 'hidden lg:block' : ''}`}>
              <SectionCard title="隐私设置" icon="🛡️">
                <div className="space-y-6">
                  {/* Profile Visibility */}
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-white mb-3">个人资料可见性</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {VISIBILITY_OPTIONS.map(option => (
                        <button
                          key={option.value}
                          onClick={() => handlePrivacyChange('profileVisibility', option.value)}
                          className={`
                            p-4 rounded-xl border-2 text-left transition-all
                            ${privacy.profileVisibility === option.value
                              ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                            }
                          `}
                        >
                          <div className="font-medium text-zinc-900 dark:text-white">{option.label}</div>
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">{option.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Other Privacy Options */}
                  <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <h4 className="font-medium text-zinc-900 dark:text-white">显示邮箱地址</h4>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">在个人主页显示您的邮箱</p>
                      </div>
                      <ToggleSwitch
                        checked={privacy.showEmail}
                        onChange={() => handlePrivacyChange('showEmail')}
                        label="显示邮箱地址"
                      />
                    </div>

                    <div className="flex items-center justify-between py-3 border-t border-zinc-200 dark:border-zinc-700">
                      <div>
                        <h4 className="font-medium text-zinc-900 dark:text-white">显示活动状态</h4>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">让其他人看到您的在线状态</p>
                      </div>
                      <ToggleSwitch
                        checked={privacy.showActivity}
                        onChange={() => handlePrivacyChange('showActivity')}
                        label="显示活动状态"
                      />
                    </div>

                    <div className="flex items-center justify-between py-3 border-t border-zinc-200 dark:border-zinc-700">
                      <div>
                        <h4 className="font-medium text-zinc-900 dark:text-white">允许私信</h4>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">允许其他用户给您发送私信</p>
                      </div>
                      <ToggleSwitch
                        checked={privacy.allowMessages}
                        onChange={() => handlePrivacyChange('allowMessages')}
                        label="允许私信"
                      />
                    </div>

                    <div className="flex items-center justify-between py-3 border-t border-zinc-200 dark:border-zinc-700">
                      <div>
                        <h4 className="font-medium text-zinc-900 dark:text-white">数据收集</h4>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">允许收集匿名使用数据以改进产品</p>
                      </div>
                      <ToggleSwitch
                        checked={privacy.dataCollection}
                        onChange={() => handlePrivacyChange('dataCollection')}
                        label="数据收集"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>
            </section>

            {/* Theme Section */}
            <section id="theme" className={`${activeSection !== 'theme' ? 'hidden lg:block' : ''}`}>
              <SectionCard title="主题设置" icon="🎨">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-white mb-4">选择主题</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {THEME_OPTIONS.map(option => (
                        <button
                          key={option.value}
                          onClick={() => setTheme(option.value)}
                          className={`
                            p-6 rounded-xl border-2 text-center transition-all
                            ${theme === option.value
                              ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                            }
                          `}
                        >
                          <div className="text-4xl mb-3">{option.icon}</div>
                          <div className="font-medium text-zinc-900 dark:text-white">{option.label}</div>
                          <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{option.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Theme Preview */}
                  <div className="pt-6 border-t border-zinc-200 dark:border-zinc-700">
                    <h4 className="font-medium text-zinc-900 dark:text-white mb-4">预览</h4>
                    <div className="p-6 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500" />
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-white">示例用户</div>
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">这是主题预览</div>
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-700">
                        <p className="text-zinc-700 dark:text-zinc-300">
                          当前主题: {theme === 'light' ? '浅色模式' : theme === 'dark' ? '深色模式' : '跟随系统'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserSettingsPage;