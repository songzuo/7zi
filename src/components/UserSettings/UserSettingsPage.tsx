'use client'

import { useState, useCallback, useEffect, memo } from 'react'
import { useTheme } from '@/stores/preferencesStore'
import { useNotificationPreferences as useStoreNotificationPreferences } from '@/stores/preferencesStore'
import { useLocalStorage } from '@/hooks/useLocalStorage'

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
} from './types'

// Import validation utilities
import {
  validateNickname,
  validateBio,
  validatePassword,
  validateConfirmPassword,
} from './validation'

// Import sub-components
import ToggleSwitch from './ToggleSwitch'
import SectionCard from './SectionCard'
import AvatarUpload from './AvatarUpload'
import { NotificationPreferences as NewNotificationPreferences } from '@/components/settings/NotificationPreferences'

// ============================================================================
// Navigation Items
// ============================================================================

const NAV_ITEMS: NavItem[] = [
  { id: 'profile', label: '个人资料', icon: '👤' },
  { id: 'security', label: '账户安全', icon: '🔒' },
  { id: 'notifications', label: '通知偏好', icon: '🔔' },
  { id: 'privacy', label: '隐私设置', icon: '🛡️' },
  { id: 'theme', label: '主题设置', icon: '🎨' },
]

// ============================================================================
// Theme Options
// ============================================================================

const THEME_OPTIONS = [
  { value: 'light' as const, label: '浅色模式', icon: '☀️', desc: '适合白天使用' },
  { value: 'dark' as const, label: '深色模式', icon: '🌙', desc: '适合夜间使用' },
  { value: 'system' as const, label: '跟随系统', icon: '💻', desc: '自动适应系统设置' },
]

// ============================================================================
// Privacy Visibility Options
// ============================================================================

const VISIBILITY_OPTIONS = [
  { value: 'public' as const, label: '公开', desc: '所有人可见' },
  { value: 'friends' as const, label: '仅好友', desc: '仅好友可见' },
  { value: 'private' as const, label: '私密', desc: '仅自己可见' },
]

// ============================================================================
// Main User Settings Page Component
// ============================================================================

interface UserSettingsPageProps {
  className?: string
}

export const UserSettingsPage = memo(function UserSettingsPage({
  className = '',
}: UserSettingsPageProps) {
  const { theme, setTheme } = useTheme()
  const { setNotifications: setStoreNotifications } = useStoreNotificationPreferences()

  // Local storage for user profile
  const [storedProfile, setStoredProfile] = useLocalStorage<UserProfile>('user-profile', {
    nickname: '',
    avatar: '',
    bio: '',
    email: '',
  })

  // State
  const [profile, setProfile] = useState<UserProfile>(storedProfile)
  const [security, setSecurity] = useLocalStorage<SecuritySettings>('user-security', {
    twoFactorEnabled: false,
    lastPasswordChange: null,
  })
  const [notifications, setNotifications] = useLocalStorage<NotificationPreferences>(
    'user-notifications',
    {
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
      weeklyDigest: true,
      mentionNotifications: true,
    }
  )
  const [privacy, setPrivacy] = useLocalStorage<PrivacySettings>('user-privacy', {
    profileVisibility: 'public',
    showEmail: false,
    showActivity: true,
    allowMessages: true,
    dataCollection: true,
  })

  // Password change state
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Form errors
  const [errors, setErrors] = useState<FormErrors>({})

  // Save status
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  // Active section for mobile navigation
  const [activeSection, setActiveSection] = useState<string>('profile')

  // Sync profile with local storage
  useEffect(() => {
    setProfile(storedProfile)
  }, [storedProfile])

  // Handlers
  const handleProfileChange = useCallback((field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))

    // Validate on change
    if (field === 'nickname') {
      const error = validateNickname(value)
      setErrors(prev => ({ ...prev, nickname: error }))
    } else if (field === 'bio') {
      const error = validateBio(value)
      setErrors(prev => ({ ...prev, bio: error }))
    }
  }, [])

  const handlePasswordChange = useCallback(
    (field: keyof PasswordForm, value: string) => {
      setPasswordForm(prev => ({ ...prev, [field]: value }))

      // Validate on change
      if (field === 'newPassword') {
        const error = validatePassword(value)
        setErrors(prev => ({ ...prev, newPassword: error, confirmPassword: undefined }))
      } else if (field === 'confirmPassword') {
        const error = validateConfirmPassword(passwordForm.newPassword, value)
        setErrors(prev => ({ ...prev, confirmPassword: error }))
      }
    },
    [passwordForm.newPassword]
  )

  const handleSaveProfile = useCallback(async () => {
    // Validate all fields
    const nicknameError = validateNickname(profile.nickname)
    const bioError = validateBio(profile.bio)

    if (nicknameError || bioError) {
      setErrors({ nickname: nicknameError, bio: bioError })
      return
    }

    setSaveStatus('saving')

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setStoredProfile(profile)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }, [profile, setStoredProfile])

  const handleChangePassword = useCallback(async () => {
    // Validate passwords
    const newPasswordError = validatePassword(passwordForm.newPassword)
    const confirmPasswordError = validateConfirmPassword(
      passwordForm.newPassword,
      passwordForm.confirmPassword
    )

    if (newPasswordError || confirmPasswordError) {
      setErrors({ newPassword: newPasswordError, confirmPassword: confirmPasswordError })
      return
    }

    setSaveStatus('saving')

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setSecurity(prev => ({ ...prev, lastPasswordChange: new Date().toISOString() }))
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }, [passwordForm, setSecurity])

  const handleToggle2FA = useCallback(() => {
    setSecurity(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }))
  }, [setSecurity])

  const handleNotificationChange = useCallback(
    (key: keyof NotificationPreferences) => {
      setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
    },
    [setNotifications]
  )

  const handlePrivacyChange = useCallback(
    (key: keyof PrivacySettings, value?: boolean | string) => {
      setPrivacy(prev => ({
        ...prev,
        [key]: value !== undefined ? value : !prev[key],
      }))
    },
    [setPrivacy]
  )

  return (
    <div className={`min-h-screen bg-zinc-50 dark:bg-zinc-900 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">用户设置</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">管理您的账户设置和偏好</p>
        </div>

        {/* Mobile Navigation */}
        <div className="mb-6 overflow-x-auto lg:hidden">
          <div className="flex gap-2 pb-2">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 whitespace-nowrap transition-colors ${
                  activeSection === item.id
                    ? 'bg-cyan-500 text-white'
                    : 'bg-white text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                } `}
              >
                <span>{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar Navigation */}
          <nav className="hidden w-64 flex-shrink-0 lg:block">
            <div className="sticky top-8 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <ul className="space-y-2">
                {NAV_ITEMS.map(item => (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveSection(item.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                        activeSection === item.id
                          ? 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400'
                          : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
                      } `}
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
            <section
              id="profile"
              className={`${activeSection !== 'profile' ? 'hidden lg:block' : ''}`}
            >
              <SectionCard title="个人资料" icon="👤">
                <div className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <AvatarUpload
                      avatar={profile.avatar}
                      onAvatarChange={url => handleProfileChange('avatar', url)}
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
                    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      昵称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profile.nickname}
                      onChange={e => handleProfileChange('nickname', e.target.value)}
                      placeholder="请输入您的昵称"
                      className={`w-full rounded-xl border bg-zinc-50 px-4 py-3 dark:bg-zinc-700 ${
                        errors.nickname
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-zinc-200 focus:border-cyan-500 dark:border-zinc-600'
                      } text-zinc-900 transition-colors focus:outline-none dark:text-white`}
                    />
                    {errors.nickname && (
                      <p className="mt-2 text-sm text-red-500">{errors.nickname}</p>
                    )}
                  </div>

                  {/* Email (Read-only) */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      邮箱
                    </label>
                    <input
                      type="email"
                      value={profile.email || 'user@example.com'}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                    />
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                      邮箱地址不可更改，如需帮助请联系客服
                    </p>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      个人简介
                    </label>
                    <textarea
                      value={profile.bio}
                      onChange={e => handleProfileChange('bio', e.target.value)}
                      placeholder="介绍一下自己..."
                      rows={4}
                      className={`w-full rounded-xl border bg-zinc-50 px-4 py-3 dark:bg-zinc-700 ${
                        errors.bio
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-zinc-200 focus:border-cyan-500 dark:border-zinc-600'
                      } resize-none text-zinc-900 transition-colors focus:outline-none dark:text-white`}
                    />
                    <div className="mt-2 flex justify-between">
                      {errors.bio && <p className="text-sm text-red-500">{errors.bio}</p>}
                      <p className="ml-auto text-sm text-zinc-500 dark:text-zinc-400">
                        {profile.bio.length}/200
                      </p>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saveStatus === 'saving'}
                      className={`rounded-xl px-6 py-3 font-medium transition-all ${
                        saveStatus === 'saving'
                          ? 'cursor-not-allowed bg-zinc-300 text-zinc-500 dark:bg-zinc-600'
                          : 'bg-cyan-500 text-white hover:bg-cyan-600 hover:shadow-lg'
                      } `}
                    >
                      {saveStatus === 'saving' ? '保存中...' : '保存更改'}
                    </button>
                    {saveStatus === 'saved' && (
                      <span className="flex items-center gap-1 text-green-500">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
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
            <section
              id="security"
              className={`${activeSection !== 'security' ? 'hidden lg:block' : ''}`}
            >
              <SectionCard title="账户安全" icon="🔒">
                <div className="space-y-8">
                  {/* Change Password */}
                  <div>
                    <h3 className="mb-4 text-lg font-medium text-zinc-900 dark:text-white">
                      修改密码
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          当前密码
                        </label>
                        <input
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={e => handlePasswordChange('currentPassword', e.target.value)}
                          placeholder="请输入当前密码"
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 transition-colors focus:border-cyan-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          新密码
                        </label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={e => handlePasswordChange('newPassword', e.target.value)}
                          placeholder="请输入新密码"
                          className={`w-full rounded-xl border bg-zinc-50 px-4 py-3 dark:bg-zinc-700 ${
                            errors.newPassword
                              ? 'border-red-500 focus:border-red-500'
                              : 'border-zinc-200 focus:border-cyan-500 dark:border-zinc-600'
                          } text-zinc-900 transition-colors focus:outline-none dark:text-white`}
                        />
                        {errors.newPassword && (
                          <p className="mt-2 text-sm text-red-500">{errors.newPassword}</p>
                        )}
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                          密码需包含至少 8 个字符，包括大小写字母和数字
                        </p>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          确认新密码
                        </label>
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={e => handlePasswordChange('confirmPassword', e.target.value)}
                          placeholder="请再次输入新密码"
                          className={`w-full rounded-xl border bg-zinc-50 px-4 py-3 dark:bg-zinc-700 ${
                            errors.confirmPassword
                              ? 'border-red-500 focus:border-red-500'
                              : 'border-zinc-200 focus:border-cyan-500 dark:border-zinc-600'
                          } text-zinc-900 transition-colors focus:outline-none dark:text-white`}
                        />
                        {errors.confirmPassword && (
                          <p className="mt-2 text-sm text-red-500">{errors.confirmPassword}</p>
                        )}
                      </div>
                      <button
                        onClick={handleChangePassword}
                        disabled={saveStatus === 'saving'}
                        className="rounded-xl bg-cyan-500 px-6 py-3 font-medium text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        更新密码
                      </button>
                    </div>
                    {security.lastPasswordChange && (
                      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                        上次修改密码:{' '}
                        {new Date(security.lastPasswordChange).toLocaleDateString('zh-CN')}
                      </p>
                    )}
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="border-t border-zinc-200 pt-6 dark:border-zinc-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                          两步验证
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
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
                      <div className="mt-4 rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
                        <p className="flex items-center gap-2 text-green-700 dark:text-green-400">
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
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
            <section
              id="notifications"
              className={`${activeSection !== 'notifications' ? 'hidden lg:block' : ''}`}
            >
              <NewNotificationPreferences userId={profile.email || 'demo-user'} />
            </section>

            {/* Privacy Section */}
            <section
              id="privacy"
              className={`${activeSection !== 'privacy' ? 'hidden lg:block' : ''}`}
            >
              <SectionCard title="隐私设置" icon="🛡️">
                <div className="space-y-6">
                  {/* Profile Visibility */}
                  <div>
                    <h4 className="mb-3 font-medium text-zinc-900 dark:text-white">
                      个人资料可见性
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {VISIBILITY_OPTIONS.map(option => (
                        <button
                          key={option.value}
                          onClick={() => handlePrivacyChange('profileVisibility', option.value)}
                          className={`rounded-xl border-2 p-4 text-left transition-all ${
                            privacy.profileVisibility === option.value
                              ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                              : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                          } `}
                        >
                          <div className="font-medium text-zinc-900 dark:text-white">
                            {option.label}
                          </div>
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">
                            {option.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Other Privacy Options */}
                  <div className="space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <h4 className="font-medium text-zinc-900 dark:text-white">显示邮箱地址</h4>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          在个人主页显示您的邮箱
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={privacy.showEmail}
                        onChange={() => handlePrivacyChange('showEmail')}
                        label="显示邮箱地址"
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-200 py-3 dark:border-zinc-700">
                      <div>
                        <h4 className="font-medium text-zinc-900 dark:text-white">显示活动状态</h4>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          让其他人看到您的在线状态
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={privacy.showActivity}
                        onChange={() => handlePrivacyChange('showActivity')}
                        label="显示活动状态"
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-200 py-3 dark:border-zinc-700">
                      <div>
                        <h4 className="font-medium text-zinc-900 dark:text-white">允许私信</h4>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          允许其他用户给您发送私信
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={privacy.allowMessages}
                        onChange={() => handlePrivacyChange('allowMessages')}
                        label="允许私信"
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-200 py-3 dark:border-zinc-700">
                      <div>
                        <h4 className="font-medium text-zinc-900 dark:text-white">数据收集</h4>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          允许收集匿名使用数据以改进产品
                        </p>
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
                    <h4 className="mb-4 font-medium text-zinc-900 dark:text-white">选择主题</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {THEME_OPTIONS.map(option => (
                        <button
                          key={option.value}
                          onClick={() => setTheme(option.value)}
                          className={`rounded-xl border-2 p-6 text-center transition-all ${
                            theme === option.value
                              ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                              : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                          } `}
                        >
                          <div className="mb-3 text-4xl">{option.icon}</div>
                          <div className="font-medium text-zinc-900 dark:text-white">
                            {option.label}
                          </div>
                          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {option.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Theme Preview */}
                  <div className="border-t border-zinc-200 pt-6 dark:border-zinc-700">
                    <h4 className="mb-4 font-medium text-zinc-900 dark:text-white">预览</h4>
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
                      <div className="mb-4 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500" />
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-white">示例用户</div>
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">
                            这是主题预览
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg bg-zinc-100 p-4 dark:bg-zinc-700">
                        <p className="text-zinc-700 dark:text-zinc-300">
                          当前主题:{' '}
                          {theme === 'light'
                            ? '浅色模式'
                            : theme === 'dark'
                              ? '深色模式'
                              : '跟随系统'}
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
  )
})

export default UserSettingsPage
