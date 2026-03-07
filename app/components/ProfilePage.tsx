'use client';

import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { User, UserProfile } from '@/lib/users/types';
import AvatarUpload from './AvatarUpload';

// ============================================================================
// 类型定义
// ============================================================================

interface ProfilePageProps {
  userId: string;
}

interface FormData {
  name: string;
  email: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
}

// ============================================================================
// 消息提示组件 - 提取并使用 memo
// ============================================================================

interface MessageBannerProps {
  type: 'error' | 'success';
  message: string;
}

const MessageBanner = memo(function MessageBanner({ type, message }: MessageBannerProps) {
  const baseClasses = 'mb-4 p-4 rounded-lg';
  const typeClasses = type === 'error'
    ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400';

  return <div className={`${baseClasses} ${typeClasses}`}>{message}</div>;
});

// ============================================================================
// 表单输入组件 - 提取并使用 memo
// ============================================================================

interface FormInputProps {
  id: string;
  name: string;
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FormInput = memo(function FormInput({
  id,
  name,
  label,
  value,
  type = 'text',
  placeholder,
  disabled = false,
  required = false,
  onChange,
}: FormInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && '*'}
      </label>
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white ${
          disabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : ''
        }`}
      />
    </div>
  );
});

// ============================================================================
// 加载指示器组件
// ============================================================================

const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
});

// ============================================================================
// 主组件
// ============================================================================

export const ProfilePage: React.FC<ProfilePageProps> = memo(function ProfilePage({ userId }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    displayName: '',
    bio: '',
    location: '',
    website: '',
  });

  // ============================================================================
  // 使用 useCallback 缓存所有事件处理函数
  // ============================================================================

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [userRes, profileRes] = await Promise.all([
        fetch(`/api/users/${userId}`),
        fetch(`/api/users/${userId}/profile`),
      ]);

      if (!userRes.ok) {
        throw new Error('Failed to load user');
      }

      const userData = await userRes.json();
      setUser(userData.user);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.profile);
      }

      // 填充表单
      setFormData({
        name: userData.user.name || '',
        email: userData.user.email || '',
        displayName: profile?.displayName || userData.user.name || '',
        bio: profile?.bio || userData.user.bio || '',
        location: profile?.location || '',
        website: profile?.website || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [userId, profile?.displayName, profile?.bio, profile?.location, profile?.website]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // 更新用户基本信息
      const userRes = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          bio: formData.bio,
        }),
      });

      if (!userRes.ok) {
        throw new Error('Failed to update user');
      }

      // 更新用户资料
      const profileRes = await fetch(`/api/users/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: formData.displayName,
          bio: formData.bio,
          location: formData.location,
          website: formData.website,
        }),
      });

      if (!profileRes.ok) {
        throw new Error('Failed to update profile');
      }

      const userData = await userRes.json();
      const profileData = await profileRes.json();

      setUser(userData.user);
      setProfile(profileData.profile);
      setSuccess('个人资料已更新！');

      // 3秒后清除成功消息
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [userId, formData]);

  const handleAvatarUpload = useCallback(async (file: File) => {
    try {
      setUploading(true);
      setError(null);

      const formDataObj = new FormData();
      formDataObj.append('avatar', file);

      const res = await fetch(`/api/users/${userId}/avatar`, {
        method: 'POST',
        body: formDataObj,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload avatar');
      }

      const data = await res.json();

      // 更新用户头像
      if (user) {
        setUser({ ...user, avatar: data.avatarUrl });
      }

      setSuccess('头像已更新！');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  }, [userId, user]);

  // ============================================================================
  // 使用 useMemo 缓存计算结果
  // ============================================================================

  const accountInfo = useMemo(() => {
    if (!user) return null;
    return {
      role: user.role,
      provider: user.provider,
      createdAt: new Date(user.createdAt).toLocaleDateString('zh-CN'),
    };
  }, [user]);

  // ============================================================================
  // 生命周期
  // ============================================================================

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // ============================================================================
  // 渲染
  // ============================================================================

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">用户不存在</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        个人资料
      </h1>

      {/* 消息提示 */}
      {error && <MessageBanner type="error" message={error} />}
      {success && <MessageBanner type="success" message={success} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 头像上传 - 使用新的 AvatarUpload 组件 */}
        <div className="flex items-center gap-6">
          <AvatarUpload
            userId={userId}
            avatarUrl={user.avatar}
            uploading={uploading}
            onUpload={handleAvatarUpload}
            enableCrop={true}
            cropAspectRatio={1}
            size="lg"
            hint="支持 JPG, PNG, GIF, WebP，最大 5MB"
          />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              头像
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              点击更换头像，支持拖拽上传
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              上传后可裁剪为正方形
            </p>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            id="name"
            name="name"
            label="姓名"
            value={formData.name}
            onChange={handleInputChange}
            required
          />

          <FormInput
            id="email"
            name="email"
            label="邮箱"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            disabled
          />

          <FormInput
            id="displayName"
            name="displayName"
            label="显示名称"
            value={formData.displayName}
            onChange={handleInputChange}
          />

          <FormInput
            id="location"
            name="location"
            label="位置"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="例如：北京，中国"
          />
        </div>

        {/* 网站 */}
        <FormInput
          id="website"
          name="website"
          label="个人网站"
          type="url"
          value={formData.website}
          onChange={handleInputChange}
          placeholder="https://example.com"
        />

        {/* 个人简介 */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            个人简介
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            rows={4}
            placeholder="介绍一下你自己..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white resize-none"
          />
        </div>

        {/* 提交按钮 */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={loadUserData}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            重置
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                保存中...
              </>
            ) : (
              '保存'
            )}
          </button>
        </div>
      </form>

      {/* 用户信息卡片 */}
      {accountInfo && (
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">账户信息</h3>
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <p>角色: <span className="text-gray-900 dark:text-white">{accountInfo.role}</span></p>
            <p>提供商: <span className="text-gray-900 dark:text-white">{accountInfo.provider}</span></p>
            <p>创建时间: <span className="text-gray-900 dark:text-white">{accountInfo.createdAt}</span></p>
          </div>
        </div>
      )}
    </div>
  );
});

export default ProfilePage;