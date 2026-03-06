/**
 * UserSettings 组件导出
 */

// Types
export type {
  UserProfile,
  SecuritySettings,
  NotificationPreferences,
  PrivacySettings,
  FormErrors,
  PasswordForm,
  SaveStatus,
  ThemeValue,
  NavItem,
} from './types';

// Validation utilities
export {
  validateNickname,
  validateBio,
  validatePassword,
  validateConfirmPassword,
} from './validation';

// Components
export { default as ToggleSwitch } from './ToggleSwitch';
export type { ToggleSwitchProps } from './ToggleSwitch';

export { default as SectionCard } from './SectionCard';
export type { SectionCardProps } from './SectionCard';

export { default as AvatarUpload } from './AvatarUpload';
export type { AvatarUploadProps } from './AvatarUpload';

// Main component
export { UserSettingsPage } from './UserSettingsPage';
export { default as default } from './UserSettingsPage';
