'use client';

import { useState, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Import types
import type {
  SecuritySettings,
  PasswordForm,
  FormErrors,
  SaveStatus,
} from './types';

// Import validation utilities
import {
  validatePassword,
  validateConfirmPassword,
} from './validation';

// Import sub-components
import SectionCard from './SectionCard';
import ToggleSwitch from './ToggleSwitch';

interface AccountSettingsProps {
  activeSection: string;
}

export function AccountSettings({ activeSection }: AccountSettingsProps) {
  // State
  const [security, setSecurity] = useLocalStorage<SecuritySettings>('user-security', {
    twoFactorEnabled: false,
    lastPasswordChange: null,
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

  // Handlers
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

  return (
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
  );
}

export default AccountSettings;
