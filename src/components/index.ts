// Client Providers
export { ClientProviders, ThemeToggle, AIChat } from './ClientProviders';

// Theme (backward compatible - now delegates to SettingsContext)
export { ThemeProvider, useTheme } from './ThemeProvider';

// Settings (recommended - unified context)
export { 
  SettingsProvider, 
  useSettings, 
  useSettingsSafe,
  useTheme as useThemeFromSettings 
} from '@/contexts/SettingsContext';
export type { Theme, UserSettings, NotificationPreferences } from '@/contexts/SettingsContext';

// Settings
export { SettingsPanel, SettingsPanelCompact } from './SettingsPanel';
export { SettingsButton } from './SettingsButton';

// AI & Chat
export { AIChat as AIChatComponent } from './AIChat';

// Data Display
export { GitHubActivity } from './GitHubActivity';
export { ProjectDashboard } from './ProjectDashboard';

// UI Components
export { Hero3D } from './Hero3D';
export { LazyImage, ImageGalleryOptimized, SkeletonOptimized, CardSkeletonOptimized } from './LazyImage';

// Error Handling
export { ErrorBoundary } from './ErrorBoundary';
export { ErrorDisplay } from './ErrorDisplay';
export { ErrorBoundaryWrapper, withErrorBoundary } from './ErrorBoundaryWrapper';

// Contact & Social
export { ContactForm } from './ContactForm';
export { SocialLinks } from './SocialLinks';

// Analytics
export { Analytics } from './Analytics';

// Footer
export { Footer } from './Footer';
