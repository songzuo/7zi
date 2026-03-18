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

// Image Components
export { OptimizedImage, ResponsiveImage } from './OptimizedImage';
export type { LazyLoadImageProps as OptimizedImageProps } from './LazyLoadImage';

// Lazy Loading Components
export {
  LazyAIChat,
  LazyProjectDashboard,
  LazyGitHubActivity,
  LazyHero3D,
  LazyNotificationCenter,
  LazySettingsPanel,
  LazyTaskBoard,
  LazyContactForm,
  LazyUserSettingsPage,
  LazyPWAInstallPrompt,
  LazyViewportWrapper,
  preloadComponents,
} from './LazyComponents';

// Performance Monitoring
export { PerformanceMonitor, ResourceTimingMonitor } from './PerformanceMonitor';

// Health Dashboard
export { HealthDashboard } from './HealthDashboard';
export type { HealthMetric, HealthDashboardProps } from './HealthDashboard';

// Skeleton Loading Components (Designer Patch v4)
export { 
  SkeletonText, 
  SkeletonAvatar, 
  SkeletonCard, 
  SkeletonList, 
  SkeletonTable,
  SkeletonStatCard,
  SkeletonNav,
  SkeletonPage 
} from './Skeleton';

// Error Handling
export { ErrorBoundary } from './ErrorBoundary';
export { ErrorDisplay } from './ErrorDisplay';
export { ErrorBoundaryWrapper, withErrorBoundary } from './ErrorBoundaryWrapper';

// Error Boundary Factory (for page-level errors)
export { 
  createPageErrorBoundary,
  HomeError,
  AboutError,
  BlogError,
  BlogSlugError,
  ContactError,
  DashboardError,
  TeamError,
  LocaleError,
} from './errors';

// Contact & Social
export { ContactForm } from './ContactForm';
export { SocialLinks } from './SocialLinks';

// Analytics
export { Analytics } from './Analytics';

// Footer
export { Footer } from './Footer';

// Shared UI Components
export {
  StatusBadge,
  ProgressBar,
  Avatar,
  Card,
  EmptyState,
  StatCard,
  TimeAgo,
} from './shared';

// Animated Progress Bar Components
export { default as AnimatedProgressBar } from './AnimatedProgressBar';
export {
  WaveProgress,
  SegmentedProgress,
  GradientProgress,
  StepProgress,
} from './AnimatedProgressBar';

// Loading Components
export { LoadingSpinner } from './LoadingSpinner';
export type {
  LoadingVariant,
  LoadingSize,
  LoadingColor,
} from './LoadingSpinner';

export { GlobalLoader, MinimalLoader } from './GlobalLoader';
export type { LoaderVariant } from './GlobalLoader';
