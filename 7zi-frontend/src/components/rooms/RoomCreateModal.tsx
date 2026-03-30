/**
 * Room Create Modal Component
 *
 * Modal for creating a new room with customizable settings
 *
 * Features:
 * - Room name input (required)
 * - Description input (optional)
 * - Visibility selection (public/private)
 * - Password protection option
 * - Form validation
 * - Loading state during creation
 * - i18n support
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CreateRoomRequest } from '@/types/rooms';

export interface RoomCreateModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Create room callback */
  onCreateRoom: (request: CreateRoomRequest) => Promise<void>;
  /** Is creation in progress */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Visibility option type
 */
type Visibility = 'public' | 'private';

/**
 * Room Create Modal Component
 */
export function RoomCreateModal({
  isOpen,
  onClose,
  onCreateRoom,
  isLoading = false,
  className,
}: RoomCreateModalProps) {
  const { t } = useTranslation('rooms');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate form
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = t('validation.nameRequired', '房间名称不能为空');
    } else if (name.length < 2) {
      newErrors.name = t('validation.nameTooShort', '房间名称至少需要2个字符');
    } else if (name.length > 50) {
      newErrors.name = t('validation.nameTooLong', '房间名称不能超过50个字符');
    }

    if (description.length > 200) {
      newErrors.description = t('validation.descriptionTooLong', '描述不能超过200个字符');
    }

    if (visibility === 'private' && !password.trim()) {
      newErrors.password = t('validation.passwordRequired', '私密房间需要设置密码');
    }

    if (password && password.length < 4) {
      newErrors.password = t('validation.passwordTooShort', '密码至少需要4个字符');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, description, visibility, password, t]);

  /**
   * Handle form submit
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const request: CreateRoomRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      password: visibility === 'private' ? password : undefined,
    };

    try {
      await onCreateRoom(request);
      handleReset();
      onClose();
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  /**
   * Reset form state
   */
  const handleReset = () => {
    setName('');
    setDescription('');
    setVisibility('public');
    setPassword('');
    setShowPassword(false);
    setErrors({});
  };

  /**
   * Handle close with reset
   */
  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('create', '创建房间')}
      size="md"
      className={className}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Room Name */}
        <div>
          <Input
            label={t('roomName', '房间名称')}
            placeholder={t('placeholder.enterRoomName', '输入房间名称')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            required
            maxLength={50}
            disabled={isLoading}
          />
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
            {name.length}/50
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('roomDescription', '描述')}
          </label>
          <textarea
            placeholder={t('placeholder.enterDescription', '输入描述（可选）')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={clsx(
              'w-full px-3 py-2 border rounded-lg transition-colors',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-gray-100',
              'placeholder-gray-400 dark:placeholder-gray-500',
              errors.description
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
            )}
            rows={3}
            maxLength={200}
            disabled={isLoading}
          />
          <div className="mt-1 flex justify-between text-xs">
            {errors.description && (
              <span className="text-red-500">{errors.description}</span>
            )}
            <span className="text-gray-500 dark:text-gray-400 ml-auto">
              {description.length}/200
            </span>
          </div>
        </div>

        {/* Visibility Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('visibility', '可见性')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setVisibility('public')}
              disabled={isLoading}
              className={clsx(
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                visibility === 'public'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <span className="text-2xl">🌍</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('visibilityPublic', '公开')}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('visibilityPublicDesc', '任何人可通过搜索找到')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setVisibility('private')}
              disabled={isLoading}
              className={clsx(
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                visibility === 'private'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <span className="text-2xl">🔒</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('visibilityPrivate', '私密')}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('visibilityPrivateDesc', '需要邀请码和密码')}
              </span>
            </button>
          </div>
        </div>

        {/* Password (for private rooms) */}
        {visibility === 'private' && (
          <div className="animate-fadeIn">
            <Input
              label={t('roomPassword', '密码')}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('placeholder.enterPassword', '输入密码')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              required
              disabled={isLoading}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              }
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            onClick={handleClose}
            type="button"
            disabled={isLoading}
          >
            {t('cancel', '取消')}
          </Button>
          <Button
            type="submit"
            loading={isLoading}
            disabled={!name.trim() || (visibility === 'private' && !password.trim())}
          >
            {t('create', '创建')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default RoomCreateModal;
