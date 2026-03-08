'use client';

import { useState, useCallback } from 'react';
import type { PasswordForm, FormErrors, SaveStatus } from '../types';
import { validatePassword, validateConfirmPassword } from '../validation';

interface PasswordFormProps {
  onSave: (passwordForm: PasswordForm) => Promise<void>;
  saveStatus: SaveStatus;
}

export function PasswordForm({ onSave, saveStatus }: PasswordFormProps) {
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({
    newPassword: '',
    confirmPassword: '',
  });

  const handleChangePassword = useCallback(async () => {
    // Validate passwords
    const newPasswordError = validatePassword(passwordForm.newPassword);
    const confirmPasswordError = validateConfirmPassword(passwordForm.newPassword, passwordForm.confirmPassword);
    
    if (newPasswordError || confirmPasswordError) {
      setErrors({ newPassword: newPasswordError || '', confirmPassword: confirmPasswordError || '' });
      return;
    }

    await onSave(passwordForm);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setErrors({ newPassword: '', confirmPassword: '' });
  }, [passwordForm, onSave]);

  const handlePasswordChange = useCallback((field: keyof PasswordForm, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    
    // Validate on change
    if (field === 'newPassword') {
      const error = validatePassword(value);
      setErrors(prev => ({ ...prev, newPassword: error || '', confirmPassword: '' }));
    } else if (field === 'confirmPassword') {
      const error = validateConfirmPassword(passwordForm.newPassword, value);
      setErrors(prev => ({ ...prev, confirmPassword: error || '' }));
    }
  }, [passwordForm.newPassword]);

  return (
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
  );
}

export default PasswordForm;