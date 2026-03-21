# 未使用代码分析报告

生成时间: 2026/3/20 21:42:55

## 📊 摘要

| 指标 | 数量 |
|------|------|
| 总文件数 | 589 |
| 包含未使用导入的文件 | 60 |
| 包含未使用导出的文件 | 250 |
| 可能包含死代码的文件 | 229 |

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

- `import { NextRequest, NextResponse } from 'next/server'`
- `import { createRequestHandler } from '@/lib/a2a/jsonrpc-handler'`
- `import { getTaskStore } from '@/lib/a2a/task-store'`
- `import { createSevenZiExecutor } from '@/lib/a2a/executor'`
- `import { getAgentCard, getExtendedAgentCard } from '@/lib/a2a/agent-card'`
- `import { JsonRpcRequest, JsonRpcResponse } from '@/lib/a2a/types'`
- `import { jsonRpcRequestSchema, jsonRpcBatchRequestSchema, validateBody, formatValidationErrors } from '@/lib/api/validation'`
- `import { createValidationError, createErrorResponse, ErrorType } from '@/lib/api/error-handler'`
- `import { logger } from '@/lib/logger'`

### src/app/api/auth/login/route.ts

- `import { NextResponse } from 'next/server'`

### src/app/api/auth/logout/route.ts

- `import { NextResponse } from 'next/server'`

### src/app/api/auth/me/route.ts

- `import { NextResponse } from 'next/server'`

### src/app/api/auth/refresh/route.ts

- `import { NextResponse } from 'next/server'`

### src/app/api/auth/register/route.ts

- `import { NextResponse } from 'next/server'`
- `import { sanitizeUrlForLogging } from '@/lib/api/api-logger'`

### src/app/api/backup/route.ts

- `import { ErrorType } from '@/lib/api/error-handler'`

### src/app/api/csrf-token/route.ts

- `import { ApiError } from '@/lib/api/error-handler'`

### src/app/api/database/health/route.ts

- `import { type DatabaseHealthResult } from '@/lib/db/migrations'`
- `import { type PerformanceReport } from '@/lib/db/performance-analyzer'`

### src/app/api/database/optimize/route.ts

- `import { type PoolConfig } from '@/lib/db/connection-pool'`

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

### src/app/api/health/route.ts

- `import { createSuccessResponse } from '@/lib/api/utils'`

### src/app/api/multimodal/audio/route.ts

- `import { NextResponse } from 'next/server'`
- `import { audioToBuffer } from '@/lib/multimodal/audio-utils'`

### src/app/api/multimodal/image/route.ts

- `import { NextResponse } from 'next/server'`

### src/app/api/performance/clear/route.ts

- `import { createErrorResponse } from '@/lib/api/error-handler'`

### src/app/api/performance/report/route.ts

- `import { NextResponse } from 'next/server'`
- `import { ErrorType } from '@/lib/api/error-handler'`

### src/app/api/stream/analytics/route.ts

- `import { createUnauthorizedError } from '@/lib/api/error-handler'`

### src/app/collaboration-demo/page.tsx

- `import { useCollaboration } from '@/lib/websocket'`
- `import { ConnectionStatus, UserList } from '@/components/collaboration/ConnectionStatus'`

### src/app/page.tsx

- `import { defaultLocale } from '@/i18n/config'`

### src/components/AIChat.tsx

- `import { useCallback } from 'react'`

### src/components/Analytics.tsx

- `import { useEffect } from 'react'`

### src/components/ClientProviders.tsx

- `import { useGlobalLoading } from '@/hooks/useGlobalLoading'`

### src/components/Footer.tsx

- `import { useMemo } from 'react'`

### src/components/LanguageSwitcher.tsx

- `import React from 'react'`
- `import { type Locale } from '@/i18n/config'`

### src/components/MemberCard.tsx

- `import { MEMBER_STATUS_CONFIG } from '@/types/members'`

### src/components/SEO.tsx

- `import Script from 'next/script'`

### src/components/SettingsPanel.tsx

- `import { type Locale } from '@/i18n/config'`

### src/components/TeamActivityTracker.tsx

- `import { LoadingSpinner } from '@/components/LoadingSpinner'`

### src/components/ThemeToggle.tsx

- `import React from 'react'`

### src/components/collaboration/ConnectionStatus.tsx

- `import React from 'react'`

### src/components/meeting/MeetingRoom.tsx

- `import { UseWebRTCMeetingOptions } from '@/hooks/useWebRTCMeeting'`

### src/components/monitoring/MetricsDashboard.tsx

- `import { Database } from 'lucide-react'`

### src/components/multimodal/ImageAnalysisResult.tsx

- `import React from 'react'`

### src/hooks/useLongPress.ts

- `import { RefObject, useEffect } from 'react'`

### src/lib/a2a/executor.ts

- `import { v4 } from 'uuid'`

### src/lib/a2a/jsonrpc-handler.ts

- `import { v4 } from 'uuid'`

### src/lib/a2a/task-store.ts

- `import { v4 } from 'uuid'`

### src/lib/agents/middleware.ts

- `import { hasAllPermissions } from '@/lib/agents/auth-service'`

### src/lib/api/api-logger.ts

- `import { v4 } from 'uuid'`

*... 还有 10 个文件 *


## 📤 未使用的导出

以下文件包含导出但未被其他文件引用：

*注意：已排除 Next.js 路由文件（page.tsx, layout.tsx 等）*

### src/app/[locale]/portfolio/components/CategoryFilterWrapper.tsx

- 命名导出: `CategoryFilterWrapper`

### src/app/[locale]/portfolio/data.ts

- 命名导出: `getProjectBySlug`, `getRelatedProjects`, `getProjectsByCategory`

### src/app/[locale]/viewport.tsx

- 命名导出: `viewport`

### src/app/api/a2a/jsonrpc/route.ts

- 命名导出: `POST`, `OPTIONS`

### src/app/api/database/optimize/route.ts

- 命名导出: `PUT`

### src/app/api/multimodal/audio/route.ts

- 命名导出: `runtime`

### src/app/api/multimodal/image/route.ts

- 命名导出: `runtime`

### src/app/api/users/rbac-example-route.ts

- 命名导出: `PATCH`, `GET_ROLES`

### src/app/viewport.tsx

- 命名导出: `viewport`

### src/components/AIChat.tsx

- 默认导出: `AIChat`

### src/components/ActivityLog.tsx

- 命名导出: `ActivityLog`

### src/components/AnimatedProgressBar.tsx

- 默认导出: `AnimatedProgressBar`
- 命名导出: `WaveProgress`, `SegmentedProgress`, `GradientProgress`, `StepProgress`

### src/components/BottomNav.tsx

- 命名导出: `BottomNav`, `BottomNavWrapper`

### src/components/BugReportForm.tsx

- 默认导出: `BugReportForm`
- 命名导出: `BugReportForm`

### src/components/ClientProviders.tsx

- 命名导出: `ClientProviders`

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

- 命名导出: `LazyViewportWrapper`, `LazyHero3D`, `LazyNotificationCenter`, `LazySettingsPanel`, `LazyTaskBoard`, `LazyContactForm`, `LazyUserSettingsPage`, `LazyPWAInstallPrompt`, `preloadComponents`

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

- 默认导出: `PageLoading`
- 命名导出: `MinimalPageLoading`, `CardGridLoading`, `TableLoading`, `ListLoading`, `DashboardLoading`

### src/components/PerformanceMonitor.tsx

- 默认导出: `PerformanceMonitor`
- 命名导出: `PerformanceMonitor`, `ResourceTimingMonitor`

### src/components/ProjectDashboard.tsx

- 命名导出: `ProjectDashboard`

### src/components/RealtimeDashboard.tsx

- 默认导出: `RealtimeDashboard`
- 命名导出: `RealtimeDashboard`

### src/components/ResponsiveComponents.tsx

- 命名导出: `ResponsiveGrid`, `ResponsiveCard`, `ResponsiveContainer`, `ResponsiveText`, `ResponsiveButton`, `ResponsiveInput`

### src/components/SEO.tsx

- 命名导出: `ArticleSchema`, `ServiceSchema`, `ProductSchema`, `Breadcrumbs`, `CanonicalUrl`, `HreflangLinks`

### src/components/SettingsButton.tsx

- 默认导出: `SettingsButton`
- 命名导出: `SettingsButton`

### src/components/SettingsPanel.tsx

- 命名导出: `SettingsPanelCompact`

### src/components/Skeleton.tsx

- 默认导出: `SkeletonComponents`
- 命名导出: `SkeletonBase`, `SkeletonText`, `SkeletonAvatar`, `SkeletonCard`, `SkeletonList`, `SkeletonTable`, `SkeletonStatCard`, `SkeletonNav`, `SkeletonPage`

### src/components/SocialLinks.tsx

- 默认导出: `SocialLinks`
- 命名导出: `SocialLinks`

### src/components/StarRating.tsx

- 默认导出: `StarRating`
- 命名导出: `StarRating`

### src/components/TaskBoard.tsx

- 命名导出: `TaskBoard`

### src/components/TeamActivityTracker.tsx

- 默认导出: `TeamActivityTracker`
- 命名导出: `TeamActivityTracker`

### src/components/UserSettings/UserSettingsPage.tsx

- 默认导出: `UserSettingsPage`
- 命名导出: `UserSettingsPage`

*... 还有 200 个文件 *


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

- 未使用的函数: `getHandler`, `processSingleRequest`, `processBatchRequest`, `POST`, `determineErrorStatusCode`, `OPTIONS`

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

### src/app/api/backup/route.ts

- 未使用的常量: `GET`, `POST`

### src/app/api/csrf-token/route.ts

- 未使用的函数: `GET`, `POST`

### src/app/api/database/health/route.ts

- 未使用的函数: `GET`

### src/app/api/database/optimize/route.ts

- 未使用的函数: `GET`, `POST`, `PUT`

### src/app/api/example/route.ts

- 未使用的常量: `GET`, `POST`

### src/app/api/github/commits/route.ts

- 未使用的函数: `GET`, `parseTotalFromLinkHeader`
- 未使用的常量: `GITHUB_API_BASE`

### src/app/api/github/issues/route.ts

- 未使用的函数: `GET`, `parseTotalFromLinkHeader`
- 未使用的常量: `GITHUB_API_BASE`

### src/app/api/health/detailed/route.ts

- 未使用的函数: `GET`

### src/app/api/health/live/route.ts

- 未使用的常量: `GET`

### src/app/api/health/ready/route.ts

- 未使用的常量: `GET`

### src/app/api/health/route.ts

- 未使用的函数: `GET`

### src/app/api/metrics/performance/route.ts

- 未使用的函数: `GET`

### src/app/api/metrics/prometheus/route.ts

- 未使用的函数: `GET`

### src/app/api/multimodal/audio/route.ts

- 未使用的函数: `POST`, `GET`

### src/app/api/multimodal/image/route.ts

- 未使用的函数: `POST`, `GET`

### src/app/api/performance/clear/route.ts

- 未使用的函数: `POST`

### src/app/api/performance/report/route.ts

- 未使用的函数: `GET`, `DELETE`

### src/app/api/status/route.ts

- 未使用的函数: `GET`

### src/app/api/stream/analytics/route.ts

- 未使用的函数: `GET`

### src/app/api/stream/health/route.ts

- 未使用的函数: `GET`

*... 还有 199 个文件 *


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

