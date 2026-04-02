# 7zi-frontend 组件库文档

> 📚 最后更新: 2026-03-18
> 🎨 维护者: 7zi AI 团队

本文档详细介绍了 `src/components/` 目录下的所有组件，包括使用方法、Props 定义、代码示例和最佳实践。

---

## 📋 目录

- [导航组件](#导航组件)
  - [Navigation](#navigation)
  - [MobileMenu](#mobilemenu)
  - [Footer](#footer)
- [UI 基础组件](#ui-基础组件)
  - [ThemeToggle](#themetoggle)
  - [ThemeProvider](#themeprovider)
  - [Skeleton 骨架屏](#skeleton-骨架屏)
  - [LazyImage](#lazyimage)
  - [OptimizedImage](#optimizedimage)
  - [LoadingSpinner](#loadingspinner)
  - [GlobalLoader](#globalloader)
- [数据展示](#数据展示)
  - [MemberCard](#membercard)
  - [GitHubActivity](#githubactivity)
  - [ProjectDashboard](#projectdashboard)
  - [TaskBoard](#taskboard)
  - [TaskBoardSearch](#taskboardsearch)
  - [RealtimeDashboard](#realtimedashboard)
  - [HealthDashboard](#healthdashboard)
- [表单组件](#表单组件)
  - [ContactForm](#contactform)
  - [EnhancedContactForm](#enhancedcontactform)
  - [BatchEditPanel](#batcheditpanel)
  - [SearchFilter](#searchfilter)
- [聊天组件](#聊天组件)
  - [AIChat](#aichat)
- [错误处理](#错误处理)
  - [ErrorBoundary](#errorboundary)
  - [ErrorBoundaryWrapper](#errorboundarywrapper)
  - [ErrorDisplay](#errordisplay)
  - [NetworkErrorBoundary](#networkerrorboundary)
  - [AsyncBoundary](#asyncboundary)
- [SEO 组件](#seo-组件)
  - [SEO](#seo)
- [导出功能](#导出功能)
  - [ExportPanel](#exportpanel)
- [性能监控](#性能监控)
  - [PerformanceMonitor](#performancemonitor)
- [进度展示](#进度展示)
  - [ProgressBar](#progressbar)
  - [AnimatedProgressBar](#animatedprogressbar)
- [其他功能](#其他功能)
  - [AgentWallet](#agentwallet)
  - [TeamActivityTracker](#teamactivitytracker)
  - [LanguageSwitcher](#languageswitcher)
  - [SettingsButton](#settingsbutton)
  - [SettingsPanel](#settingspanel)
  - [PWAInstallPrompt](#pwainstallprompt)
  - [ServiceWorkerRegistration](#serviceworkerregistration)
  - [Providers](#providers)
  - [ClientProviders](#clientproviders)
  - [Hero3D](#hero3d)
  - [SocialLinks](#sociallinks)
  - [LazyComponents](#lazycomponents)
  - [LazyLoadImage](#lazyloadimage)
  - [ActivityLog](#activitylog)
  - [Analytics](#analytics)

---

## 导航组件

### Navigation

主导航组件，包含桌面端导航栏和移动端滑入式菜单。

**文件位置**: `src/components/Navigation.tsx`

#### Props

无外部 Props，组件内部管理状态。

#### 使用示例

```tsx
import { Navigation } from '@/components'

export default function Layout({ children }) {
  return (
    <>
      <Navigation />
      <main>{children}</main>
    </>
  )
}
```

#### 特性

- ✅ 响应式设计（桌面/移动端自适应）
- ✅ 移动端全屏滑入式菜单
- ✅ 路由变化自动关闭菜单
- ✅ ESC 键关闭支持
- ✅ 防止背景滚动穿透
- ✅ 安全区域适配（刘海屏）

---

### MobileMenu

独立的移动端菜单组件，用于响应式导航。

**文件位置**: `src/components/MobileMenu.tsx`

#### Props

无外部 Props。

#### 使用示例

```tsx
import { MobileMenu } from '@/components'

export function Header() {
  return (
    <header className="flex items-center justify-between">
      <Logo />
      <nav className="hidden lg:flex">{/* 桌面导航 */}</nav>
      <MobileMenu />
    </header>
  )
}
```

---

### Footer

页脚组件，包含品牌信息、快速链接、服务项目和联系方式。

**文件位置**: `src/components/Footer.tsx`

#### 使用示例

```tsx
import { Footer } from '@/components'

export default function Page() {
  return (
    <>
      <Navigation />
      <main>{/* 页面内容 */}</main>
      <Footer />
    </>
  )
}
```

---

## UI 基础组件

### ThemeToggle

主题切换按钮组件，支持亮色/暗色模式切换。

**文件位置**: `src/components/ThemeToggle.tsx`

#### 使用示例

```tsx
import { ThemeToggle } from '@/components'

export function Header() {
  return (
    <header className="flex items-center gap-4">
      <Logo />
      <nav>{/* 导航 */}</nav>
      <ThemeToggle />
    </header>
  )
}
```

---

### ThemeProvider

主题提供者组件，包装应用以提供主题上下文。

**文件位置**: `src/components/ThemeProvider.tsx`

> ⚠️ **注意**: 已弃用，推荐使用 `SettingsProvider` 替代

---

### Skeleton 骨架屏

用于数据加载时的占位符，提升感知性能。

**文件位置**: `src/components/Skeleton.tsx`

#### 导出组件

| 组件               | 说明         |
| ------------------ | ------------ |
| `SkeletonText`     | 文本骨架     |
| `SkeletonAvatar`   | 头像骨架     |
| `SkeletonCard`     | 卡片骨架     |
| `SkeletonList`     | 列表骨架     |
| `SkeletonTable`    | 表格骨架     |
| `SkeletonStatCard` | 统计卡片骨架 |
| `SkeletonNav`      | 导航骨架     |
| `SkeletonPage`     | 页面骨架     |

#### 使用示例

```tsx
import { SkeletonCard, SkeletonList, SkeletonTable } from '@/components';

// 卡片加载
<SkeletonCard showAvatar lines={4} />

// 列表加载
<SkeletonList items={5} showAvatar />

// 表格加载
<SkeletonTable rows={10} columns={4} />
```

---

### LazyImage

优化的懒加载图片组件，支持渐进式加载和错误处理。

**文件位置**: `src/components/LazyImage.tsx`

#### Props

```tsx
interface LazyImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  placeholderColor?: string
  priority?: boolean
  fill?: boolean
  sizes?: string
  quality?: number
  objectFit?: 'contain' | 'cover' | 'fill' | 'none'
}
```

#### 使用示例

```tsx
import { LazyImage } from '@/components'
;<LazyImage src="/images/hero.jpg" alt="Hero image" width={800} height={600} priority />
```

---

### OptimizedImage

优化版本的图片组件。

**文件位置**: `src/components/OptimizedImage.tsx`

---

### LoadingSpinner

加载指示器组件。

**文件位置**: `src/components/LoadingSpinner.tsx`

#### 使用示例

```tsx
import { LoadingSpinner } from '@/components'
;<LoadingSpinner />
```

---

### GlobalLoader

全局加载状态组件。

**文件位置**: `src/components/GlobalLoader.tsx`

#### 使用示例

```tsx
import { GlobalLoader } from '@/components'
;<GlobalLoader />
```

---

## 数据展示

### MemberCard

AI 团队成员卡片组件，使用 React.memo 优化渲染。

**文件位置**: `src/components/MemberCard.tsx`

#### Props

```tsx
interface AIMember {
  id: string
  name: string
  role: string
  emoji: string
  avatar: string
  status: 'idle' | 'working' | 'busy' | 'offline'
  provider: string
  currentTask?: string
  completedTasks: number
}

interface MemberCardProps {
  member: AIMember
  compact?: boolean
}
```

#### 使用示例

```tsx
import { MemberCard } from '@/components'

const member: AIMember = {
  id: '1',
  name: 'Executor',
  role: '执行代理',
  emoji: '⚡',
  avatar: '/avatars/executor.png',
  status: 'working',
  provider: 'volcengine',
  currentTask: '重构官网组件',
  completedTasks: 42,
}

;<MemberCard member={member} />
```

---

### GitHubActivity

GitHub 仓库活动展示组件，显示提交记录和统计。

**文件位置**: `src/components/GitHubActivity.tsx`

#### 使用示例

```tsx
import { GitHubActivity } from '@/components'
;<GitHubActivity />
```

---

### ProjectDashboard

项目进度看板组件，展示多个项目的进度和团队活动。

**文件位置**: `src/components/ProjectDashboard.tsx`

#### 使用示例

```tsx
import { ProjectDashboard } from '@/components'
;<ProjectDashboard />
```

#### 功能特性

- ✅ 三个标签页：总览、项目、动态
- ✅ 项目进度可视化
- ✅ 团队活动日志
- ✅ 统计卡片展示

---

### TaskBoard

GitHub Issues 任务看板组件。

**文件位置**: `src/components/TaskBoard.tsx`

#### Props

```tsx
interface TaskBoardProps {
  issues: GitHubIssue[]
}
```

#### 使用示例

```tsx
import { TaskBoard } from '@/components'

const issues = await fetchGitHubIssues()

;<TaskBoard issues={issues} />
```

---

### TaskBoardSearch

任务看板搜索组件。

**文件位置**: `src/components/TaskBoardSearch.tsx`

---

### RealtimeDashboard

实时数据看板组件。

**文件位置**: `src/components/RealtimeDashboard.tsx`

#### 使用示例

```tsx
import { RealtimeDashboard } from '@/components'
;<RealtimeDashboard />
```

---

### HealthDashboard

健康监控看板组件。

**文件位置**: `src/components/HealthDashboard.tsx`

#### 使用示例

```tsx
import { HealthDashboard } from '@/components'
;<HealthDashboard />
```

---

## 表单组件

### ContactForm

联系表单组件，支持多语言和表单验证。

**文件位置**: `src/components/ContactForm.tsx`

#### Props

```tsx
interface ContactFormProps {
  locale?: 'zh' | 'en'
}
```

#### 使用示例

```tsx
import { ContactForm } from '@/components'
;<ContactForm locale="zh" />
```

---

### EnhancedContactForm

增强版联系表单组件。

**文件位置**: `src/components/EnhancedContactForm.tsx`

---

### BatchEditPanel

批量编辑面板组件。

**文件位置**: `src/components/BatchEditPanel.tsx`

#### 使用示例

```tsx
import { BatchEditPanel } from '@/components'
;<BatchEditPanel items={items} />
```

---

### SearchFilter

搜索和筛选组件。

**文件位置**: `src/components/SearchFilter.tsx`

#### 使用示例

```tsx
import { SearchFilter } from '@/components'
;<SearchFilter data={data} onFilter={handleFilter} />
```

---

## 聊天组件

### AIChat

AI 聊天窗口组件，支持移动端优化和团队状态显示。

**文件位置**: `src/components/AIChat.tsx`

#### 使用示例

```tsx
import { AIChat } from '@/components'
;<AIChat />
```

#### 子组件

聊天模块包含以下子组件（通过 `./chat` 导出）：

| 组件              | 说明         |
| ----------------- | ------------ |
| `ChatHeader`      | 聊天头部     |
| `ChatMessage`     | 消息气泡     |
| `ChatInput`       | 输入框       |
| `QuickActions`    | 快捷操作     |
| `TeamStatusPanel` | 团队状态面板 |
| `MemberSelector`  | 成员选择器   |
| `TypingIndicator` | 打字指示器   |

#### Hook

```tsx
import { useChat } from '@/components/chat'

const {
  messages,
  inputValue,
  isTyping,
  selectedMemberId,
  handleSend,
  handleQuickAction,
  setSelectedMemberId,
} = useChat(teamMembers)
```

---

## 错误处理

### ErrorBoundary

Next.js 页面级错误边界组件。

**文件位置**: `src/components/ErrorBoundary.tsx`

#### Props

```tsx
interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  showReset?: boolean
}
```

#### 使用示例

```tsx
import { ErrorBoundary } from '@/components'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorBoundary error={error} reset={reset} title="页面加载失败" />
}
```

---

### ErrorBoundaryWrapper

错误边界包装器组件。

**文件位置**: `src/components/ErrorBoundaryWrapper.tsx`

---

### ErrorDisplay

通用错误展示组件，支持多种变体。

**文件位置**: `src/components/ErrorDisplay.tsx`

#### Props

```tsx
interface ErrorDisplayProps {
  title?: string
  message?: string
  showReset?: boolean
  onReset?: () => void
  errorDigest?: string
  variant?: 'default' | 'compact' | 'fullscreen'
}
```

#### 使用示例

```tsx
import { ErrorDisplay } from '@/components'
;<ErrorDisplay title="加载失败" message="无法获取数据，请稍后重试" onReset={() => refetch()} />
```

---

### NetworkErrorBoundary

网络错误边界组件。

**文件位置**: `src/components/NetworkErrorBoundary.tsx`

---

### AsyncBoundary

异步操作边界组件。

**文件位置**: `src/components/AsyncBoundary.tsx`

---

## SEO 组件

### SEO

SEO 相关组件集合，包含结构化数据和元数据。

**文件位置**: `src/components/SEO.tsx`

#### 导出组件

| 组件             | 说明               |
| ---------------- | ------------------ |
| `StructuredData` | JSON-LD 结构化数据 |
| `ArticleSchema`  | 文章结构化数据     |
| `ServiceSchema`  | 服务结构化数据     |
| `ProductSchema`  | 产品结构化数据     |
| `Breadcrumbs`    | 面包屑导航         |
| `CanonicalUrl`   | 规范链接           |
| `HreflangLinks`  | 多语言链接         |

---

## 导出功能

### ExportPanel

数据导出面板组件。

**文件位置**: `src/components/ExportPanel.tsx`

#### 使用示例

```tsx
import { ExportPanel } from '@/components'
;<ExportPanel data={data} formats={['json', 'csv', 'pdf']} />
```

---

## 性能监控

### PerformanceMonitor

性能监控组件。

**文件位置**: `src/components/PerformanceMonitor.tsx`

#### 使用示例

```tsx
import { PerformanceMonitor } from '@/components'
;<PerformanceMonitor />
```

---

## 进度展示

### ProgressBar

进度条组件（在 `shared/ui.tsx` 中）。

---

### AnimatedProgressBar

动画进度条组件。

**文件位置**: `src/components/AnimatedProgressBar.tsx`

#### 使用示例

```tsx
import { AnimatedProgressBar } from '@/components'
;<AnimatedProgressBar progress={75} animated showLabel />
```

---

## 其他功能

### AgentWallet

Agent 钱包组件。

**文件位置**: `src/components/AgentWallet.tsx`

---

### TeamActivityTracker

团队活动追踪组件。

**文件位置**: `src/components/TeamActivityTracker.tsx`

---

### LanguageSwitcher

语言切换组件。

**文件位置**: `src/components/LanguageSwitcher.tsx`

---

### SettingsButton

设置按钮组件。

**文件位置**: `src/components/SettingsButton.tsx`

---

### SettingsPanel

设置面板组件，支持主题、语言和通知设置。

**文件位置**: `src/components/SettingsPanel.tsx`

#### Props

```tsx
interface SettingsPanelProps {
  onClose?: () => void
  className?: string
}
```

#### 使用示例

```tsx
import { SettingsPanel } from '@/components'
;<SettingsPanel onClose={() => setIsOpen(false)} />
```

---

### PWAInstallPrompt

PWA 安装提示组件。

**文件位置**: `src/components/PWAInstallPrompt.tsx`

---

### ServiceWorkerRegistration

Service Worker 注册组件。

**文件位置**: `src/components/ServiceWorkerRegistration.tsx`

---

### Providers

提供者组件。

**文件位置**: `src/components/Providers.tsx`

---

### ClientProviders

客户端提供者组件。

**文件位置**: `src/components/ClientProviders.tsx`

---

### Hero3D

3D 效果 Hero 区域组件，包含鼠标视差效果。

**文件位置**: `src/components/Hero3D.tsx`

#### 使用示例

```tsx
import { Hero3D } from '@/components'
;<Hero3D />
```

---

### SocialLinks

社交媒体链接组件。

**文件位置**: `src/components/SocialLinks.tsx`

#### Props

```tsx
interface SocialLinksProps {
  variant?: 'horizontal' | 'vertical' | 'grid'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}
```

#### 使用示例

```tsx
import { SocialLinks } from '@/components'
;<SocialLinks variant="horizontal" size="sm" />
```

---

### LazyComponents

懒加载组件集合。

**文件位置**: `src/components/LazyComponents.tsx`

---

### LazyLoadImage

懒加载图片组件。

**文件位置**: `src/components/LazyLoadImage.tsx`

---

### ActivityLog

活动日志组件。

**文件位置**: `src/components/ActivityLog.tsx`

---

### Analytics

分析组件。

**文件位置**: `src/components/Analytics.tsx`

---

## 📦 组件导入

### 统一导入

```tsx
import {
  Navigation,
  Footer,
  ThemeToggle,
  MemberCard,
  AIChat,
  ContactForm,
  ErrorBoundary,
  // ...
} from '@/components'
```

### 按需导入

```tsx
import { Navigation } from '@/components/Navigation'
import { MemberCard } from '@/components/MemberCard'
import { Card, ProgressBar, EmptyState } from '@/components/shared'
import { useChat, ChatMessage } from '@/components/chat'
```

---

## 📝 子模块组件

### chat/

聊天相关组件子目录。

**位置**: `src/components/chat/`

### errors/

错误处理组件子目录。

**位置**: `src/components/errors/`

### form/

表单组件子目录。

**位置**: `src/components/form/`

### NotificationCenter/

通知中心组件子目录。

**位置**: `src/components/NotificationCenter/`

### UserSettings/

用户设置组件子目录。

**位置**: `src/components/UserSettings/`

### shared/

共享 UI 组件子目录。

**位置**: `src/components/shared/`

**导出组件**: Card, ProgressBar, StatusBadge, Avatar, EmptyState, StatCard 等

### ui/

基础 UI 组件子目录。

**位置**: `src/components/ui/`

### optimized/

优化版本组件子目录。

**位置**: `src/components/optimized/`

---

## ⚡ 性能优化建议

1. **懒加载组件**: 使用 `dynamic` 导入非首屏组件

```tsx
import dynamic from 'next/dynamic'

const AIChat = dynamic(() => import('@/components/AIChat'), {
  ssr: false,
})
```

2. **图片优化**: 使用 `LazyImage` 或 `OptimizedImage`

3. **骨架屏**: 数据加载时展示骨架屏

4. **React.memo**: 列表项组件使用 `React.memo`

5. **useCallback/useMemo**: 复杂计算和回调函数使用 hooks 缓存

---

## 📝 更新日志

### 2026-03-18

- 完整更新组件文档
- 添加 10+ 个新组件文档
- 更新组件列表至 44 个组件
- 修正组件路径引用

### 2024-03-07

- 创建初始组件库文档

---

_本文档由 🤖 7zi AI 团队维护_
