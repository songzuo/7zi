'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  status: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

interface EditableFields {
  name: string;
  bio: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * UserProfile Component
 * Displays user profile with editing functionality
 */
export default function UserProfile({ userId }: { userId: string }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editedFields, setEditedFields] = useState<EditableFields>({
    name: '',
    bio: '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Load user data
  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      const data: ApiResponse<UserProfile> = await response.json();

      if (data.success && data.data) {
        setUser(data.data);
        setEditedFields({
          name: data.data.name,
          bio: '',
        });
        setAvatarPreview(data.data.avatar || null);
      } else {
        console.error('Failed to load user:', data.error);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Handle avatar file selection
  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        setSaveError('Invalid file type. Please upload JPG, PNG, GIF, or WebP.');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setSaveError('File too large. Maximum size is 5MB.');
        return;
      }

      setAvatarFile(file);
      setSaveError(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Handle avatar upload
  const handleAvatarUpload = useCallback(async () => {
    if (!avatarFile) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const response = await fetch(`/api/users/${userId}/avatar`, {
        method: 'POST',
        body: formData,
      });

      const data: ApiResponse<{ avatarUrl: string }> = await response.json();

      if (data.success && data.data) {
        // Reload user data to get updated avatar
        await loadUser();
        setAvatarFile(null);
      } else {
        setSaveError(data.error?.message || 'Failed to upload avatar');
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to upload avatar');
    } finally {
      setIsSaving(false);
    }
  }, [avatarFile, userId, loadUser]);

  // Handle avatar removal
  const handleAvatarRemove = useCallback(async () => {
    if (!user?.avatar) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch(`/api/users/${userId}/avatar`, {
        method: 'DELETE',
      });

      const data: ApiResponse<Record<string, unknown>> = await response.json();

      if (data.success) {
        await loadUser();
      } else {
        setSaveError(data.error?.message || 'Failed to remove avatar');
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to remove avatar');
    } finally {
      setIsSaving(false);
    }
  }, [user?.avatar, userId, loadUser]);

  // Handle profile edit
  const handleEdit = useCallback(() => {
    if (user) {
      setEditedFields({
        name: user.name,
        bio: '',
      });
    }
    setIsEditing(true);
    setSaveError(null);
  }, [user]);

  // Handle profile save
  const handleSave = useCallback(async () => {
    if (!editedFields.name.trim()) {
      setSaveError('Name is required');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editedFields.name.trim(),
        }),
      });

      const data: ApiResponse<UserProfile> = await response.json();

      if (data.success && data.data) {
        setUser(data.data);
        setIsEditing(false);
      } else {
        setSaveError(data.error?.message || 'Failed to update profile');
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  }, [editedFields, userId]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(user?.avatar || null);
    setSaveError(null);
    if (user) {
      setEditedFields({
        name: user.name,
        bio: '',
      });
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Failed to load user profile</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-purple-500 p-8">
          <div className="flex items-end gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden border-4 border-white dark:border-zinc-700 shadow-lg">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-5xl font-bold text-cyan-500">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Avatar upload button */}
              <label className="absolute bottom-0 right-0 bg-white dark:bg-zinc-900 rounded-full p-2 shadow-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <svg
                  className="w-5 h-5 text-zinc-700 dark:text-zinc-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>

              {/* Avatar actions */}
              {avatarFile && (
                <div className="absolute -bottom-1 left-0 right-0 flex gap-1 justify-center">
                  <button
                    onClick={handleAvatarUpload}
                    disabled={isSaving}
                    className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-green-600 disabled:opacity-50"
                  >
                    {isSaving ? 'Uploading...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(user.avatar || null);
                    }}
                    className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-red-600"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Remove avatar button */}
              {user.avatar && !avatarFile && !isEditing && (
                <button
                  onClick={handleAvatarRemove}
                  disabled={isSaving}
                  className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 disabled:opacity-50"
                  title="Remove avatar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* User info */}
            <div className="flex-1 pb-2">
              {isEditing ? (
                <input
                  type="text"
                  value={editedFields.name}
                  onChange={(e) => setEditedFields({ ...editedFields, name: e.target.value })}
                  className="text-3xl font-bold text-white bg-transparent border-b-2 border-white/50 focus:border-white outline-none placeholder-white/50"
                  placeholder="Your name"
                  autoFocus
                />
              ) : (
                <h1 className="text-3xl font-bold text-white">{user.name}</h1>
              )}
              <p className="text-white/80 mt-1">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Actions */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Member since</span>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleEdit}
                className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Error message */}
          {saveError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{saveError}</p>
            </div>
          )}

          {/* User details */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Role</h3>
              <p className="text-zinc-900 dark:text-white font-medium capitalize">{user.role}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Status</h3>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : user.status === 'inactive'
                    ? 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400'
                    : user.status === 'suspended'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}
              >
                {user.status}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Last Login</h3>
              <p className="text-zinc-900 dark:text-white">
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString()
                  : 'Never'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">User ID</h3>
              <p className="text-zinc-900 dark:text-white text-sm font-mono">{user.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
