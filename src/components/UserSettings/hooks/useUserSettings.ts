'use client';

import { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type {
  UserProfile,
  SecuritySettings,
  NotificationPreferences,
  PrivacySettings,
  SaveStatus,
} from '../types';

export function useUserSettings() {
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

  // Save status
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  
  // Active section state
  const [activeSection, setActiveSection] = useState<string>('profile');

  // Sync profile with local storage
  useEffect(() => {
    setProfile(storedProfile);
  }, [storedProfile]);

  // Handler to sync notifications with app settings
  const handleNotificationChange = useCallback((key: keyof NotificationPreferences) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  }, [setNotifications]);

  // Handler for profile changes
  const handleProfileChange = useCallback((field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  }, [setProfile]);

  // Handler for privacy changes
  const handlePrivacyChange = useCallback((key: keyof PrivacySettings, value: boolean | string) => {
    setPrivacy(prev => ({ ...prev, [key]: value }));
  }, [setPrivacy]);

  // Handler to save profile
  const handleSaveProfile = useCallback(async () => {
    setSaveStatus('saving');
    try {
      setStoredProfile(profile);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [profile, setStoredProfile]);

  // Handler for password change
  const handleChangePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setSaveStatus('saving');
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setSecurity(prev => ({ ...prev, lastPasswordChange: new Date().toISOString() }));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [setSecurity]);

  // Handler for 2FA toggle
  const handleToggle2FA = useCallback(() => {
    setSecurity(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }));
  }, [setSecurity]);

  return {
    profile,
    setProfile,
    storedProfile,
    setStoredProfile,
    security,
    setSecurity,
    notifications,
    setNotifications,
    privacy,
    setPrivacy,
    saveStatus,
    setSaveStatus,
    activeSection,
    setActiveSection,
    handleNotificationChange,
    handleProfileChange,
    handlePrivacyChange,
    handleSaveProfile,
    handleChangePassword,
    handleToggle2FA,
  };
}