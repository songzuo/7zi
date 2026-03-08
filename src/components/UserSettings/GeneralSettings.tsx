'use client';

import { useState, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Import types
import type {
  UserProfile,
  FormErrors,
  SaveStatus,
} from './types';

// Import validation utilities
import {
  validateNickname,
  validateBio,
} from './validation';

// Import sub-components
import SectionCard from './SectionCard';
import AvatarUpload from './AvatarUpload';

interface GeneralSettingsProps {
  activeSection: string;
}

export function GeneralSettings({ activeSection }: GeneralSettingsProps) {
  // Local storage for user profile
  const [profile, setProfile] = useLocalStorage<UserProfile>('user-profile', {
    nickname: '',
    avatar: '',
    bio: '',
    email: '',
  });

  // State
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

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
  }, [setProfile]);

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
      setProfile(profile);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [profile, setProfile]);

  return (
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
  );
}

export default GeneralSettings;
