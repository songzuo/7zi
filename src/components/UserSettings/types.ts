/**
 * UserSettings 类型定义
 */

export interface UserProfile {
  nickname: string;
  avatar: string;
  bio: string;
  email: string;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  lastPasswordChange: string | null;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
  mentionNotifications: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  showEmail: boolean;
  showActivity: boolean;
  allowMessages: boolean;
  dataCollection: boolean;
}

export interface FormErrors {
  nickname?: string;
  bio?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type ThemeValue = 'light' | 'dark' | 'system';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}
