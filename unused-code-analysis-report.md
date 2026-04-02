# 未使用代码分析报告

生成时间: 2026/3/22 11:22:23

## 📊 摘要

| 指标                 | 数量 |
| -------------------- | ---- |
| 总文件数             | 897  |
| 包含未使用导入的文件 | 107  |
| 包含未使用导出的文件 | 376  |
| 可能包含死代码的文件 | 362  |

## 📥 未使用的导入

以下文件包含未使用的导入语句：

### src/app/[locale]/about/page.tsx

- `import MobileMenu from '@/components/MobileMenu'`
- `import { setRequestLocale, getTranslations } from 'next-intl/server'`
- `import { Locale, locales } from '@/i18n/config'`
- `import { Link } from '@/i18n/routing'`
- `import { LanguageSwitcher } from '@/components/LanguageSwitcher'`
- `import { ThemeToggle } from '@/components/ThemeToggle'`
- `import { StructuredData } from '@/components/SEO'`

### src/app/[locale]/analytics/page.tsx

- `import { LazyAnalyticsDashboard } from '@/components/LazyComponents'`

### src/app/[locale]/analytics/test/page.tsx

- `import { AnalyticsChart, DateRangePicker, FilterPanel, MetricCard } from '@/components/analytics'`

### src/app/[locale]/blog/[slug]/page.tsx

- `import Link from 'next/link'`

### src/app/[locale]/blog/page.tsx

- `import { setRequestLocale, getTranslations } from 'next-intl/server'`
- `import { Locale, locales } from '@/i18n/config'`
- `import { Link } from '@/i18n/routing'`

### src/app/[locale]/contact/page.tsx

- `import MobileMenu from '@/components/MobileMenu'`
- `import { setRequestLocale, getTranslations } from 'next-intl/server'`
- `import { Locale, locales } from '@/i18n/config'`
- `import { Link } from '@/i18n/routing'`
- `import { LanguageSwitcher } from '@/components/LanguageSwitcher'`
- `import { ThemeToggle } from '@/components/ThemeToggle'`
- `import { StructuredData } from '@/components/SEO'`
- `import { ContactForm } from '@/components/ContactForm'`
- `import { SocialLinks } from '@/components/SocialLinks'`

### src/app/[locale]/dashboard/DashboardClient.tsx

- `import { TaskBoard } from '@/components/TaskBoard'`
- `import { ActivityLog } from '@/components/ActivityLog'`
- `import { RealtimeDashboard } from '@/components/RealtimeDashboard'`
- `import { TeamActivityTracker } from '@/components/TeamActivityTracker'`
- `import { useDashboardData } from '@/hooks/useDashboardData'`
- `import { LoadingSpinner } from '@/components/LoadingSpinner'`
- `import { Link } from '@/i18n/routing'`

### src/app/[locale]/layout.tsx

- `import PerformanceOptimizer from '@/components/PerformanceOptimizer'`
- `import { useGlobalLoading } from '@/hooks/useGlobalLoading'`
- `import { getMessages, setRequestLocale } from 'next-intl/server'`
- `import { notFound } from 'next/navigation'`
- `import { Locale, locales } from '@/i18n/config'`
- `import { StructuredData } from '@/components/SEO'`

### src/app/[locale]/page.tsx

- `import MobileMenu from '@/components/MobileMenu'`
- `import { setRequestLocale, getTranslations } from 'next-intl/server'`
- `import { Locale, locales } from '@/i18n/config'`
- `import { LazyAIChat, LazyGitHubActivity, LazyProjectDashboard } from '@/components/LazyComponents'`
- `import { LanguageSwitcher } from '@/components/LanguageSwitcher'`
- `import { ThemeToggle } from '@/components/ThemeToggle'`
- `import { StructuredData } from '@/components/SEO'`

### src/app/[locale]/performance/page.tsx

- `import { LineChart, Line, BarChart, Bar, Legend, Cell } from 'recharts'`
- `import { Download, Filter, Bell, Shield } from 'lucide-react'`
- `import { Button } from '@/components/ui/Button'`

### src/app/[locale]/portfolio/[slug]/page.tsx

- `import MobileMenu from '@/components/MobileMenu'`
- `import Image from 'next/image'`
- `import { setRequestLocale, getTranslations } from 'next-intl/server'`
- `import { Locale, locales } from '@/i18n/config'`
- `import { ThemeToggle } from '@/components/ThemeToggle'`
- `import { LanguageSwitcher } from '@/components/LanguageSwitcher'`
- `import { StructuredData } from '@/components/SEO'`
- `import { notFound } from 'next/navigation'`

### src/app/[locale]/portfolio/page.tsx

- `import MobileMenu from '@/components/MobileMenu'`
- `import { setRequestLocale, getTranslations } from 'next-intl/server'`
- `import { Locale, locales } from '@/i18n/config'`
- `import { LanguageSwitcher } from '@/components/LanguageSwitcher'`
- `import { ThemeToggle } from '@/components/ThemeToggle'`
- `import { StructuredData } from '@/components/SEO'`
- `import { Suspense } from 'react'`

### src/app/[locale]/team/page.tsx

- `import MobileMenu from '@/components/MobileMenu'`
- `import { setRequestLocale, getTranslations } from 'next-intl/server'`
- `import { Locale, locales } from '@/i18n/config'`
- `import { Link } from '@/i18n/routing'`
- `import { LanguageSwitcher } from '@/components/LanguageSwitcher'`
- `import { ThemeToggle } from '@/components/ThemeToggle'`
- `import { StructuredData } from '@/components/SEO'`

### src/app/api/a2a/jsonrpc/route.ts

- `import { createValidationError, createErrorResponse, ErrorType } from '@/lib/api/error-handler'`

### src/app/api/a2a/registry/route.ts

- `import { validateBody, formatValidationErrors } from '@/lib/api/validation'`

### src/app/api/analytics/export/route.ts

- `import { type ExportOptions, type ExportFormat, type AnalyticsFilters, type TimeSeriesDataPoint, type AnalyticsResponse } from '@/lib/types/analytics'`

### src/app/api/analytics/metrics/route.ts

- `import { type AnalyticsMetrics, type AnalyticsFilters, type TimeSeriesDataPoint, type AnalyticsResponse, type PaginatedResponse } from '@/lib/types/analytics'`

### src/app/api/auth/login/route.ts

- `import { NextResponse } from 'next/server'`

### src/app/api/auth/logout/route.ts

- `import { NextResponse } from 'next/server'`

### src/app/api/auth/refresh/route.ts

- `import { NextResponse } from 'next/server'`

### src/app/api/auth/register/route.ts

- `import { NextResponse } from 'next/server'`
- `import { sanitizeUrlForLogging } from '@/lib/api/api-logger'`

### src/app/api/backup/export/route.ts

- `import { NextResponse } from 'next/server'`
- `import { ExportFormat } from '@/lib/backup/types'`

### src/app/api/backup/import/route.ts

- `import { ExportFormat } from '@/lib/backup/types'`
- `import { createBadRequestError } from '@/lib/api/error-handler'`

### src/app/api/backup/restore/route.ts

- `import { BackupStatus } from '@/lib/backup/types'`

### src/app/api/backup/route.ts

- `import { ErrorType } from '@/lib/api/error-handler'`

### src/app/api/backup/schedule/[id]/route.ts

- `import { NextResponse } from 'next/server'`
- `import { createBadRequestError } from '@/lib/api/error-handler'`

### src/app/api/backup/schedule/[id]/trigger/route.ts

- `import { NextResponse } from 'next/server'`

### src/app/api/backup/schedule/route.ts

- `import { NextResponse } from 'next/server'`
- `import { BackupFrequency, CompressionAlgorithm, EncryptionAlgorithm } from '@/lib/backup/types'`

### src/app/api/csrf-token/route.ts

- `import { ApiError } from '@/lib/api/error-handler'`

### src/app/api/data/export/route.ts

- `import { _exportData, type ExportFormat, type ExportOptions } from '@/lib/data-import-export'`

### src/app/api/data/import/route.ts

- `import { _importData, type ImportMode, type ImportOptions, type ExportResult } from '@/lib/data-import-export'`

### src/app/api/database/health/route.ts

- `import { type DatabaseHealthResult } from '@/lib/db/migrations'`
- `import { type PerformanceReport } from '@/lib/db/performance-analyzer'`

### src/app/api/database/optimize/route.ts

- `import { type PoolConfig } from '@/lib/db/connection-pool'`

### src/app/api/feedback/route.ts

- `import { NextResponse } from 'next/server'`

### src/app/api/github/commits/route.ts

- `import { NextRequest, NextResponse } from 'next/server'`
- `import { githubCommitsQuerySchema, validateQuery, formatValidationErrors } from '@/lib/api/validation'`
- `import { createValidationError, createUnauthorizedError, createNotFoundError, createRateLimitError } from '@/lib/api/error-handler'`
- `import { logger } from '@/lib/logger'`

### src/app/api/github/issues/route.ts

- `import { NextRequest, NextResponse } from 'next/server'`
- `import { githubIssuesQuerySchema, validateQuery, formatValidationErrors } from '@/lib/api/validation'`
- `import { createValidationError, createUnauthorizedError, createNotFoundError, createRateLimitError } from '@/lib/api/error-handler'`
- `import { logger } from '@/lib/logger'`

### src/app/api/multimodal/audio/route.ts

- `import { NextResponse } from 'next/server'`
- `import { audioToBuffer } from '@/lib/multimodal/audio-utils'`

### src/app/api/multimodal/image/route.ts

- `import { NextResponse } from 'next/server'`

### src/app/api/performance/clear/route.ts

- `import { createErrorResponse } from '@/lib/api/error-handler'`

### src/app/api/ratings/[id]/helpful/route.ts

- `import { NextResponse } from 'next/server'`
- `import { logger } from '@/lib/logger'`

### src/app/api/ratings/route.ts

- `import { NextResponse } from 'next/server'`

### src/app/api/rbac/roles/[roleId]/route.ts

- `import { removePermissionsFromRole } from '@/lib/permissions/repository'`
- `import { getRoleDefinition } from '@/lib/permissions/rbac'`

### src/app/api/rbac/roles/route.ts

- `import { updateRole, deleteRole, assignPermissionsToRole, getPermissionsByRole } from '@/lib/permissions/repository'`
- `import { getRoleDefinition } from '@/lib/permissions/rbac'`

### src/app/api/rbac/users/[userId]/permissions/route.ts

- `import { hasPermission, hasRole } from '@/lib/permissions/rbac'`

### src/app/api/rbac/users/[userId]/roles/route.ts

- `import { getAllRolesWithCount } from '@/lib/permissions/repository'`

### src/app/api/stream/analytics/route.ts

- `import { createUnauthorizedError } from '@/lib/api/error-handler'`

### src/app/api/users/batch/route.ts

- `import { getAllUsers } from '@/lib/auth/repository'`
- `import { batchInsert, batchUpdate, batchDelete } from '@/lib/db/batch-operations'`

### src/app/api/users/route.optimized.ts

- `import { NextResponse } from 'next/server'`
- `import { getUsersByStatus, getUsersByRole, searchUsers, getUserStatistics } from '@/lib/auth/repository-optimized'`

### src/app/api/users/route.ts

- `import { NextResponse } from 'next/server'`

### src/app/collaboration-demo/page.tsx

- `import { useCollaboration } from '@/lib/websocket'`
- `import { ConnectionStatus, UserList } from '@/components/collaboration/ConnectionStatus'`

_... 还有 57 个文件 _

## 📤 未使用的导出

以下文件包含导出但未被其他文件引用：

_注意：已排除 Next.js 路由文件（page.tsx, layout.tsx 等）_

### src/app/[locale]/portfolio/components/CategoryFilterWrapper.tsx

- 命名导出: `CategoryFilterWrapper`

### src/app/[locale]/portfolio/data.ts

- 命名导出: `getProjectBySlug`, `getRelatedProjects`, `getProjectsByCategory`

### src/app/[locale]/viewport.tsx

- 命名导出: `viewport`

### src/app/api/a2a/jsonrpc/route.ts

- 命名导出: `POST`, `OPTIONS`

### src/app/api/analytics/export/route.ts

- 命名导出: `POST`, `GET`

### src/app/api/backup/route.optimized.ts

- 命名导出: `GET_BACKUP`

### src/app/api/feedback/route.ts

- 命名导出: `GET_FEEDBACK`, `DELETE_FEEDBACK`

### src/app/api/health/route.ts

- 命名导出: `HEAD`

### src/app/api/multimodal/audio/route.ts

- 命名导出: `runtime`

### src/app/api/multimodal/image/route.ts

- 命名导出: `runtime`

### src/app/api/ratings/route.ts

- 命名导出: `POST_HELPFUL`

### src/app/api/users/rbac-example-route.ts

- 命名导出: `GET_ROLES`

### src/app/api/ws/route.ts

- 命名导出: `GET_STATS`

### src/app/viewport.tsx

- 命名导出: `viewport`

### src/components/AIChat.tsx

- 默认导出: `AIChat`

### src/components/ActivityLog.tsx

- 命名导出: `ActivityLog`

### src/components/AnimatedProgressBar.tsx

- 默认导出: `AnimatedProgressBar`
- 命名导出: `WaveProgress`, `SegmentedProgress`, `GradientProgress`, `StepProgress`

### src/components/BackupList.tsx

- 命名导出: `BackupList`

### src/components/BottomNav.tsx

- 命名导出: `BottomNav`, `BottomNavWrapper`

### src/components/BugReportForm.tsx

- 默认导出: `BugReportForm`
- 命名导出: `BugReportForm`

### src/components/ClientProviders.tsx

- 命名导出: `ClientProviders`

### src/components/DataExportImport/index.tsx

- 命名导出: `DataExportImport`

### src/components/DataExportPanel.tsx

- 命名导出: `DataExportPanel`

### src/components/EnhancedFeedbackModal.tsx

- 默认导出: `EnhancedFeedbackModal`
- 命名导出: `EnhancedFeedbackModal`

### src/components/ErrorBoundaryWrapper.tsx

- 默认导出: `ErrorBoundaryWrapper`
- 命名导出: `ErrorBoundaryWrapper`, `withErrorBoundary`, `AsyncErrorBoundary`

### src/components/ErrorDisplay.tsx

- 默认导出: `ErrorDisplay`
- 命名导出: `ErrorDisplay`

### src/components/ExportPanel.tsx

- 默认导出: `ExportPanel`
- 命名导出: `ExportPanel`, `QuickExportButton`

### src/components/FeedbackModal.tsx

- 默认导出: `FeedbackModal`
- 命名导出: `FeedbackModal`

### src/components/FeedbackWidget.tsx

- 默认导出: `FeedbackWidget`
- 命名导出: `FeedbackWidget`

### src/components/GitHubActivity.tsx

- 命名导出: `GitHubActivity`

### src/components/GlobalLoader.tsx

- 默认导出: `GlobalLoader`
- 命名导出: `GlobalLoader`, `MinimalLoader`

### src/components/HealthDashboard.tsx

- 命名导出: `HealthDashboard`
- 类型导出: `HealthMetric`, `HealthDashboardProps`

### src/components/Hero3D.tsx

- 命名导出: `Hero3D`

### src/components/LanguageSwitcher.tsx

- 命名导出: `LanguageSwitcherCompact`

### src/components/LazyComponents.tsx

- 命名导出: `LazyViewportWrapper`, `LazyHero3D`, `LazyKnowledgeLatticeScene`, `LazyNotificationCenter`, `LazySettingsPanel`, `LazyTaskBoard`, `LazyContactForm`, `LazyUserSettingsPage`, `LazyPWAInstallPrompt`, `LazyAnalyticsDashboard`, `LazyMeetingRoom`, `preloadComponents`

### src/components/LazyLoadImage.tsx

- 默认导出: `LazyLoadImage`
- 命名导出: `LazyLoadImage`, `ImageGallery`, `ResponsiveLazyImage`

### src/components/LoadingSpinner.enhanced.tsx

- 命名导出: `ANIMATION_TIMING`

### src/components/MemberCard.tsx

- 命名导出: `MemberCard`

### src/components/NetworkErrorBoundary.tsx

- 默认导出: `NetworkErrorBoundary`
- 命名导出: `NetworkErrorBoundary`

### src/components/NotificationCenter/NotificationBadge.tsx

- 默认导出: `NotificationBadge`
- 命名导出: `NotificationBadge`

### src/components/NotificationCenter/NotificationCenter.tsx

- 默认导出: `NotificationCenter`
- 命名导出: `NotificationCenter`

### src/components/NotificationCenter/NotificationFilter.tsx

- 默认导出: `NotificationFilter`
- 命名导出: `NotificationFilter`

### src/components/NotificationCenter/NotificationItem.tsx

- 默认导出: `NotificationItem`
- 命名导出: `NotificationItem`

### src/components/NotificationCenter/index.ts

- 命名导出: `NotificationCenter`, `NotificationItem`, `NotificationBadge`
- 类型导出: `NotificationCenterProps`, `NotificationItemProps`, `NotificationBadgeProps`

### src/components/OptimizedImage.tsx

- 默认导出: `OptimizedImage`
- 命名导出: `OptimizedImage`, `ResponsiveImage`

### src/components/OptimizedImageWithWebP.tsx

- 命名导出: `OptimizedImage`, `preloadCriticalImages`

### src/components/PageLoadingTemplate.tsx

- 命名导出: `MinimalPageLoading`, `TableLoading`, `ListLoading`, `DashboardLoading`, `TasksLoading`

### src/components/PerformanceMonitor.tsx

- 默认导出: `PerformanceMonitor`
- 命名导出: `PerformanceMonitor`, `ResourceTimingMonitor`

### src/components/PerformanceOptimizer.tsx

- 默认导出: `PerformanceOptimizer`
- 命名导出: `PerformanceOptimizer`, `useComponentRenderTiming`, `useApiTiming`, `useResourceTiming`

### src/components/ProjectDashboard.tsx

- 命名导出: `ProjectDashboard`

_... 还有 326 个文件 _

## 💀 潜在的死代码

以下文件可能包含未使用的函数或常量：

### src/app/[locale]/dashboard/DashboardClient.tsx

- 未使用的函数: `DashboardClient`, `StatCard`, `MemberStatus`
- 未使用的常量: `REFRESH_INTERVAL`, `GITHUB_OWNER`, `GITHUB_REPO`, `AI_MEMBERS`

### src/app/[locale]/portfolio/components/CategoryFilterWrapper.tsx

- 未使用的函数: `CategoryFilterWrapper`

### src/app/[locale]/portfolio/data.ts

- 未使用的函数: `getProjectBySlug`, `getRelatedProjects`, `getProjectsByCategory`

### src/app/api/a2a/jsonrpc/route.ts

- 未使用的函数: `POST`, `OPTIONS`

### src/app/api/a2a/queue/route.ts

- 未使用的函数: `GET`, `POST`, `DELETE`

### src/app/api/a2a/registry/[id]/heartbeat/route.ts

- 未使用的函数: `POST`

### src/app/api/a2a/registry/[id]/route.ts

- 未使用的函数: `GET`, `PUT`, `DELETE`, `PATCH`

### src/app/api/a2a/registry/route.ts

- 未使用的函数: `GET`, `POST`

### src/app/api/analytics/export/route.ts

- 未使用的函数: `POST`, `GET`

### src/app/api/analytics/metrics/route.ts

- 未使用的函数: `GET`, `POST`

### src/app/api/auth/login/route.ts

- 未使用的函数: `POST`

### src/app/api/auth/logout/route.ts

- 未使用的函数: `POST`

### src/app/api/auth/me/route.ts

- 未使用的函数: `GET`

### src/app/api/auth/refresh/route.ts

- 未使用的函数: `POST`

### src/app/api/auth/register/route.ts

- 未使用的函数: `POST`

### src/app/api/backup/[id]/route.ts

- 未使用的函数: `GET`, `DELETE`

### src/app/api/backup/export/download/[filename]/route.ts

- 未使用的函数: `GET`

### src/app/api/backup/export/route.ts

- 未使用的函数: `GET`, `POST`

### src/app/api/backup/import/route.ts

- 未使用的函数: `POST`

### src/app/api/backup/jobs/route.ts

- 未使用的函数: `GET`

### src/app/api/backup/restore/route.ts

- 未使用的函数: `POST`

### src/app/api/backup/route.optimized.ts

- 未使用的函数: `GET_BACKUP`
- 未使用的常量: `GET`, `POST`

### src/app/api/backup/route.ts

- 未使用的常量: `GET`, `POST`

### src/app/api/backup/schedule/[id]/route.ts

- 未使用的函数: `PATCH`, `DELETE`

### src/app/api/backup/schedule/[id]/trigger/route.ts

- 未使用的函数: `POST`

### src/app/api/backup/schedule/route.ts

- 未使用的函数: `GET`, `POST`

### src/app/api/backup/statistics/route.ts

- 未使用的函数: `GET`

### src/app/api/csp-violation/route.ts

- 未使用的函数: `POST`, `GET`

### src/app/api/csrf-token/route.ts

- 未使用的函数: `GET`, `POST`

### src/app/api/data/export/route.ts

- 未使用的函数: `GET`, `POST`

_... 还有 332 个文件 _

## ⚠️ 注意事项

1. 此报告基于静态分析，可能存在误报
2. 某些导出可能仅用于类型检查
3. 某些函数可能通过字符串引用（如事件处理器）
4. 建议在删除代码前运行完整测试套件
5. 清理后请验证应用功能正常

## 🔧 建议步骤

1. 仔细审查此报告
2. 运行测试: `npm test`
3. 清理未使用的导入
4. 评估未使用的导出是否可以删除
5. 清理死代码
6. 再次运行测试确保一切正常
7. 提交更改
