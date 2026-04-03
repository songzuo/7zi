// Client Providers
export { ClientProviders } from './ClientProviders'

// Theme (backward compatible - now delegates to Zustand preferencesStore)
export { ThemeProvider, useTheme } from './ThemeProvider'

// Settings (recommended - use Zustand stores)
export {
  useSettings,
  useTheme as useThemeFromSettings,
  useLanguage,
  useNotificationPreferences,
  usePreferencesLoaded,
  useDarkMode,
} from '@/stores/preferencesStore'
export type {
  Theme,
  Locale,
  UserSettings,
  NotificationPreferences,
} from '@/stores/preferencesStore'

// Settings Components
export { SettingsPanel, SettingsPanelCompact } from './SettingsPanel'
export { SettingsButton } from './SettingsButton'

// AI & Chat
export { default as AIChatComponent } from './AIChat'

// AI Report Generator (v1.10.0)
export { 
  AIReportGenerator, 
  AIRaportSimple,
  parseQuery,
  useQueryParser,
  generateSuggestions,
  generateSQL,
  useSQLGenerator,
  validateSQL,
  formatSQL,
  ChartRenderer,
  recommendChartType,
  generateChartConfig,
  ReportExporter,
  ExportPanel,
  useReportExport,
  useQueryState,
  useReportConfig,
  useDataFetch,
  useChartConfig,
} from './ai-report'
export type {
  QueryIntent,
  ChartType,
  ExportFormat,
  QueryStatus,
  TimeRange,
  DataField,
  ParsedQuery,
  QueryFilter,
  Aggregation,
  GeneratedSQL,
  ChartConfig,
  ChartSeries,
  QueryResult,
  ReportConfig,
  ReportTemplate,
  ExportOptions,
  AIReportGeneratorProps,
  QueryInputProps,
  ChartRendererProps,
  ExportPanelProps,
  HistoryItem,
  APIResponse,
} from './ai-report'

// Data Display
export { GitHubActivity } from './GitHubActivity'
export { ProjectDashboard } from './ProjectDashboard'

// UI Components
// Note: Hero3D has been removed - unused component

// New UI Components (Note: Modal, Tabs, Toast, ErrorBoundary, FilterDropdown, SearchInput have been removed)
export {
  Button,
  ButtonGroup,
  IconButton,
  Tooltip,
  SimpleTooltip,
  withTooltip,
  InfoTooltip,
} from './ui'
export type {
  ButtonProps,
  ButtonGroupProps,
  IconButtonProps,
  ButtonVariant,
  ButtonSize,
  TooltipProps,
  SimpleTooltipProps,
  InfoTooltipProps,
  TooltipPosition,
  TooltipSize,
} from './ui'

// Image Components
export { OptimizedImage, ResponsiveImage } from './OptimizedImage'
export type { LazyLoadImageProps as OptimizedImageProps } from './LazyLoadImage'

// Lazy Loading Components
export {
  LazyAIChat,
  LazyProjectDashboard,
  LazyGitHubActivity,
  LazyTaskBoard,
  LazyRealtimeDashboard,
  LazyTeamActivityTracker,
  LazyAnalyticsDashboard,
  LazyMetricsDashboard,
  LazyKnowledgeLatticeScene,
  LazyMeetingRoom,
  LazyDataExportImport,
  LazyGlobalSearch,
  LazyAnimatedProgressBar,
  LazyUserSettings,
  LazyFeedbackManagement,
  LazyEnhancedFeedbackModal,
  LazyLazyLoadImage,
  preloadComponents,
} from './LazyComponents'

// Performance Monitoring
export { PerformanceMonitor, ResourceTimingMonitor } from './PerformanceMonitor'

// Health Dashboard
export { HealthDashboard } from './HealthDashboard'
export type { HealthMetric, HealthDashboardProps } from './HealthDashboard'

// Skeleton Loading Components (Designer Patch v4)
export {
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonList,
  SkeletonTable,
  SkeletonStatCard,
  SkeletonNav,
  SkeletonPage,
} from './Skeleton'

// Error Handling
export { ErrorBoundary } from './ErrorBoundary'
export { ErrorDisplay } from './ErrorDisplay'
export { ErrorBoundaryWrapper, withErrorBoundary } from './ErrorBoundaryWrapper'

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
} from './errors'

// Contact & Social
export { ContactForm } from './ContactForm'
export { SocialLinks } from './SocialLinks'

// Analytics
export { Analytics } from './Analytics'

// Footer
export { Footer } from './Footer'

// Shared UI Components
export { StatusBadge, ProgressBar, Avatar, Card, EmptyState, StatCard, TimeAgo } from './shared'

// Loading Components
export { LoadingSpinner } from './LoadingSpinner'
export type { LoadingVariant, LoadingSize, LoadingColor } from './LoadingSpinner'

export { GlobalLoader, MinimalLoader } from './GlobalLoader'
export type { LoaderVariant } from './GlobalLoader'
