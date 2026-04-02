# 7zi-frontend 组件库文档

> 📚 设计师维护 - 2024年3月更新

本文档详细介绍了 `src/components/` 目录下的所有组件，包括使用方法、Props 定义、代码示例和最佳实践。

---

## 📋 目录

- [导航组件](#导航组件)
  - [Navigation](#navigation)
  - [MobileMenu](#mobilemenu)
  - [Footer](#footer)
- [UI 组件](#ui-组件)
  - [ThemeToggle](#themetoggle)
  - [ThemeProvider](#themeprovider)
  - [Skeleton 骨架屏](#skeleton-骨架屏)
  - [LazyImage](#lazyimage)
  - [LoadingSpinner](#loadingspinner)
- [数据展示](#数据展示)
  - [MemberCard](#membercard)
  - [GitHubActivity](#githubactivity)
  - [ProjectDashboard](#projectdashboard)
  - [TaskBoard](#taskboard)
- [表单组件](#表单组件)
  - [ContactForm](#contactform)
  - [SettingsPanel](#settingspanel)
- [聊天组件](#聊天组件)
  - [AIChat](#aichat)
- [错误处理](#错误处理)
  - [ErrorBoundary](#errorboundary)
  - [ErrorDisplay](#errordisplay)
- [SEO 组件](#seo-组件)
  - [SEO](#seo)
  - [StructuredData](#structureddata)
- [通知组件](#通知组件)
  - [NotificationCenter](#notificationcenter)
- [共享组件](#共享组件)
  - [Card](#card)
  - [ProgressBar](#progressbar)
  - [StatusBadge](#statusbadge)
  - [Avatar](#avatar)
  - [EmptyState](#emptystate)
  - [StatCard](#statcard)
- [其他组件](#其他组件)
  - [Hero3D](#hero3d)
  - [SocialLinks](#sociallinks)

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

#### 最佳实践

1. 放置在页面顶部，作为 `<Layout>` 的一部分
2. 使用 `sticky top-0 z-50` 保持导航栏固定
3. 移动端菜单会自动处理滚动锁定

---

### MobileMenu

独立的移动端菜单组件，用于响应式导航。

**文件位置**: `src/components/MobileMenu.tsx`

#### Props

无外部 Props。

#### 使用示例

```tsx
import { MobileMenu } from '@/components/MobileMenu'

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

#### 特性

- ✅ 触摸目标优化（48x48px 最小尺寸）
- ✅ 安全区域适配
- ✅ 流畅动画过渡
- ✅ 键盘导航支持

---

### Footer

页脚组件，包含品牌信息、快速链接、服务项目和联系方式。

**文件位置**: `src/components/Footer.tsx`

#### Props

无外部 Props。

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

#### 内置配置

```tsx
// 快速链接
const quickLinks = [
  { name: '首页', href: '/' },
  { name: '关于我们', href: '/about' },
  // ...
]

// 服务项目
const services = [
  { name: '网站开发', href: '#services' },
  { name: '品牌设计', href: '#services' },
  // ...
]

// 联系方式
const contactInfo = [
  { icon: '📧', label: '邮箱', value: 'business@7zi.studio' },
  { icon: '🌐', label: '网站', value: '7zi.studio' },
  // ...
]
```

---

## UI 组件

### ThemeToggle

主题切换按钮组件，支持亮色/暗色模式切换。

**文件位置**: `src/components/ThemeToggle.tsx`

#### Props

无外部 Props，内部使用 `SettingsContext`。

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

#### 样式定制

组件使用 CSS 变量，可通过覆盖实现主题定制：

```css
:root {
  --toggle-bg-light: #e5e5e5;
  --toggle-bg-dark: #3f3f46;
}
```

---

### ThemeProvider

主题提供者组件，包装应用以提供主题上下文。

**文件位置**: `src/components/ThemeProvider.tsx`

#### Props

```tsx
interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: 'light' | 'dark' | 'system'
  storageKey?: string // 已弃用，保留兼容性
}
```

#### 使用示例

```tsx
import { ThemeProvider } from '@/components'

export default function RootLayout({ children }) {
  return <ThemeProvider defaultTheme="system">{children}</ThemeProvider>
}
```

> ⚠️ **注意**: 已弃用，推荐使用 `SettingsProvider` 替代

```tsx
// 推荐方式
import { SettingsProvider } from '@/contexts/SettingsContext'

export default function RootLayout({ children }) {
  return <SettingsProvider defaultSettings={{ theme: 'system' }}>{children}</SettingsProvider>
}
```

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

#### Props

**SkeletonText**

```tsx
interface SkeletonTextProps {
  lines?: number // 行数，默认 1
  className?: string
  lastLineWidth?: string // 最后一行宽度，默认 '60%'
}
```

**SkeletonAvatar**

```tsx
interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}
```

**SkeletonCard**

```tsx
interface SkeletonCardProps {
  showAvatar?: boolean // 是否显示头像，默认 true
  lines?: number // 文本行数，默认 3
  className?: string
}
```

#### 使用示例

```tsx
import { SkeletonCard, SkeletonList, SkeletonTable, SkeletonPage } from '@/components'

// 卡片加载
function CardLoading() {
  return <SkeletonCard showAvatar lines={4} />
}

// 列表加载
function ListLoading() {
  return <SkeletonList items={5} showAvatar />
}

// 表格加载
function TableLoading() {
  return <SkeletonTable rows={10} columns={4} />
}

// 全页面加载
function PageLoading() {
  return <SkeletonPage showNav showFooter />
}
```

#### 最佳实践

1. 尺寸应与实际内容相近
2. 使用 `animate-pulse` 动画增强视觉效果
3. 组合多个骨架组件模拟真实布局

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
  priority?: boolean // 优先加载
  fill?: boolean // 填充父容器
  sizes?: string // 响应式尺寸
  quality?: number // 图片质量，默认 75
  objectFit?: 'contain' | 'cover' | 'fill' | 'none'
}
```

#### 使用示例

```tsx
import { LazyImage, ImageGalleryOptimized } from '@/components';

// 基础用法
<LazyImage
  src="/images/hero.jpg"
  alt="Hero image"
  width={800}
  height={600}
/>

// 填充模式
<div className="relative w-full h-64">
  <LazyImage
    src="/images/cover.jpg"
    alt="Cover"
    fill
    objectFit="cover"
  />
</div>

// 优先加载（首屏图片）
<LazyImage
  src="/images/hero.jpg"
  alt="Hero"
  priority
  fill
/>

// 图片画廊
const images = [
  { src: '/img1.jpg', alt: 'Image 1', width: 400, height: 300 },
  { src: '/img2.jpg', alt: 'Image 2', width: 400, height: 300 },
];

<ImageGalleryOptimized
  images={images}
  columns={{ mobile: 2, tablet: 3, desktop: 4 }}
/>
```

#### 最佳实践

1. **首屏图片**使用 `priority` 属性
2. **响应式图片**使用 `sizes` 属性优化加载
3. **填充模式**确保父容器有明确尺寸
4. 提供有意义的 `alt` 文本

---

### LoadingSpinner

加载指示器组件。

**文件位置**: `src/components/LoadingSpinner.tsx`

#### 使用示例

```tsx
import { LoadingSpinner } from '@/components'

function LoadingState() {
  return (
    <div className="flex h-64 items-center justify-center">
      <LoadingSpinner />
    </div>
  )
}
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
  compact?: boolean // 紧凑模式
}
```

#### 使用示例

```tsx
import { MemberCard } from '@/components';

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
};

// 标准卡片
<MemberCard member={member} />

// 紧凑模式（适合列表）
<MemberCard member={member} compact />
```

#### 状态映射

| 状态      | 颜色 | 标签   |
| --------- | ---- | ------ |
| `working` | 绿色 | 工作中 |
| `busy`    | 黄色 | 忙碌   |
| `idle`    | 灰色 | 空闲   |
| `offline` | 浅灰 | 离线   |

#### 性能优化

组件使用 `React.memo` 和自定义比较函数，只在关键字段变化时重新渲染：

```tsx
// 比较函数
;(prevProps, nextProps) => {
  return (
    prevProps.member.id === nextProps.member.id &&
    prevProps.member.status === nextProps.member.status &&
    prevProps.member.currentTask === nextProps.member.currentTask &&
    prevProps.member.completedTasks === nextProps.member.completedTasks
  )
}
```

---

### GitHubActivity

GitHub 仓库活动展示组件，显示提交记录和统计。

**文件位置**: `src/components/GitHubActivity.tsx`

#### Props

无外部 Props，内部使用 `useGitHubData` hook。

#### 使用示例

```tsx
import { GitHubActivity } from '@/components'

export function ActivitySection() {
  return (
    <section>
      <GitHubActivity />
    </section>
  )
}
```

#### 配置

组件内部配置：

```tsx
const { commits, stats, isLoading } = useGitHubData({
  owner: '7zi-studio',
  repo: '7zi-frontend',
  refreshInterval: 5 * 60 * 1000, // 5分钟刷新
})
```

---

### ProjectDashboard

项目进度看板组件，展示多个项目的进度和团队活动。

**文件位置**: `src/components/ProjectDashboard.tsx`

#### Props

无外部 Props，使用内部 mock 数据。

#### 使用示例

```tsx
import { ProjectDashboard } from '@/components'

export function DashboardPage() {
  return (
    <div className="container mx-auto">
      <ProjectDashboard />
    </div>
  )
}
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

#### 功能特性

- ✅ 状态筛选（进行中/已完成/全部）
- ✅ 进度条显示
- ✅ 标签展示
- ✅ 负责人头像

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
import { ContactForm } from '@/components';

// 中文表单
<ContactForm locale="zh" />

// 英文表单
<ContactForm locale="en" />
```

#### 表单字段

| 字段    | 必填 | 验证规则     |
| ------- | ---- | ------------ |
| name    | ✅   | 非空         |
| email   | ✅   | 邮箱格式     |
| company | ❌   | -            |
| subject | ❌   | 下拉选择     |
| message | ✅   | 最少 10 字符 |

#### API 端点

表单提交到 `/api/contact`，需确保 API 路由存在。

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
import { SettingsPanel, SettingsPanelCompact } from '@/components';

// 完整面板
<SettingsPanel onClose={() => setIsOpen(false)} />

// 紧凑版（适合弹窗）
<SettingsPanelCompact onClose={() => setIsOpen(false)} />
```

#### 功能模块

1. **主题设置**: 浅色/深色/跟随系统
2. **语言设置**: 中文/English
3. **通知设置**: 启用/声音/邮件/推送
4. **重置设置**: 恢复默认配置

---

## 聊天组件

### AIChat

AI 聊天窗口组件，支持移动端优化和团队状态显示。

**文件位置**: `src/components/AIChat.tsx`

#### Props

无外部 Props，内部管理所有状态。

#### 使用示例

```tsx
import { AIChat } from '@/components'

export function Layout({ children }) {
  return (
    <>
      {children}
      <AIChat />
    </>
  )
}
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

#### 特性

- ✅ 小屏幕自动全屏
- ✅ 触摸目标优化
- ✅ 安全区域适配
- ✅ 键盘弹出适配
- ✅ 流畅动画

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

在 `error.tsx` 中使用：

```tsx
// app/error.tsx
'use client'

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

#### 功能

- ✅ 自动记录错误到 Sentry
- ✅ 开发环境控制台输出
- ✅ 友好的错误展示

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
import { ErrorDisplay } from '@/components';

// 默认变体
<ErrorDisplay
  title="加载失败"
  message="无法获取数据，请稍后重试"
  onReset={() => refetch()}
/>

// 紧凑变体
<ErrorDisplay
  message="请求超时"
  variant="compact"
  onRetry={() => retry()}
/>

// 全屏变体
<ErrorDisplay
  title="系统错误"
  message="服务暂时不可用"
  variant="fullscreen"
  onReset={() => window.location.reload()}
/>
```

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

#### 使用示例

```tsx
import {
  StructuredData,
  ArticleSchema,
  Breadcrumbs,
  HreflangLinks
} from '@/components';

// 结构化数据
<StructuredData
  locale="zh"
  schemas={['website', 'organization']}
/>

// 文章 Schema
<ArticleSchema
  title="文章标题"
  description="文章描述"
  url="https://7zi.studio/blog/post"
  datePublished="2024-03-01"
  author="7zi Studio"
/>

// 面包屑
<Breadcrumbs
  items={[
    { name: '首页', nameEn: 'Home', path: '/' },
    { name: '博客', nameEn: 'Blog', path: '/blog' },
  ]}
  locale="zh"
/>

// 多语言链接
<HreflangLinks path="/blog/post" />
```

---

## 通知组件

### NotificationCenter

通知中心组件，展示通知列表和管理功能。

**文件位置**: `src/components/NotificationCenter/NotificationCenter.tsx`

#### Props

```tsx
interface NotificationCenterProps {
  notifications: Notification[]
  onMarkAsRead?: (id: string) => void
  onMarkAllAsRead?: () => void
  onClearAll?: () => void
  onDelete?: (id: string) => void
  showUnreadBadge?: boolean
  maxVisible?: number
  className?: string
}
```

#### 使用示例

```tsx
import { NotificationCenter } from '@/components/NotificationCenter'

const notifications = [
  {
    id: '1',
    title: '新消息',
    message: '您有一个新的任务分配',
    read: false,
    priority: 'high',
    createdAt: new Date().toISOString(),
  },
  // ...
]

;<NotificationCenter
  notifications={notifications}
  onMarkAsRead={id => markAsRead(id)}
  onMarkAllAsRead={() => markAllAsRead()}
  onClearAll={() => clearAll()}
  showUnreadBadge
/>
```

#### 子组件

- `NotificationBadge` - 未读数量徽章
- `NotificationItem` - 单个通知项

---

## 共享组件

### Card

通用卡片容器组件。

**文件位置**: `src/components/shared/ui.tsx`

#### Props

```tsx
interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean // 悬浮效果
  padding?: 'none' | 'sm' | 'md' | 'lg'
}
```

#### 使用示例

```tsx
import { Card } from '@/components/shared'
;<Card padding="lg" hover>
  <h3>卡片标题</h3>
  <p>卡片内容</p>
</Card>
```

---

### ProgressBar

进度条组件。

**文件位置**: `src/components/shared/ui.tsx`

#### Props

```tsx
interface ProgressBarProps {
  progress: number
  color?: 'default' | 'success' | 'warning'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}
```

#### 使用示例

```tsx
import { ProgressBar } from '@/components/shared'
;<ProgressBar progress={75} showLabel color="success" />
```

---

### StatusBadge

状态徽章组件。

**文件位置**: `src/components/shared/ui.tsx`

#### Props

```tsx
interface StatusBadgeProps {
  status: MemberStatus // 'idle' | 'working' | 'busy' | 'offline'
  showDot?: boolean
  size?: 'sm' | 'md'
}
```

#### 使用示例

```tsx
import { StatusBadge } from '@/components/shared'
;<StatusBadge status="working" showDot />
```

---

### Avatar

头像组件，支持状态显示。

**文件位置**: `src/components/shared/ui.tsx`

#### Props

```tsx
interface AvatarProps {
  src?: string
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  status?: MemberStatus
  showStatus?: boolean
}
```

#### 使用示例

```tsx
import { Avatar } from '@/components/shared'
;<Avatar src="/avatar.png" name="Executor" size="lg" status="working" showStatus />
```

---

### EmptyState

空状态展示组件。

**文件位置**: `src/components/shared/ui.tsx`

#### Props

```tsx
interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}
```

#### 使用示例

```tsx
import { EmptyState } from '@/components/shared'
;<EmptyState
  icon="📭"
  title="暂无数据"
  description="还没有任何内容"
  action={<button>添加内容</button>}
/>
```

---

### StatCard

统计卡片组件。

**文件位置**: `src/components/shared/ui.tsx`

#### Props

```tsx
interface StatCardProps {
  value: number | string
  label: string
  icon?: string
  color?: 'cyan' | 'purple' | 'green' | 'pink' | 'orange'
}
```

#### 使用示例

```tsx
import { StatCard } from '@/components/shared'
;<StatCard value={42} label="完成任务" icon="✅" color="cyan" />
```

---

## 其他组件

### Hero3D

3D 效果 Hero 区域组件，包含鼠标视差效果。

**文件位置**: `src/components/Hero3D.tsx`

#### 使用示例

```tsx
import { Hero3D } from '@/components'

export function HomePage() {
  return (
    <>
      <Hero3D />
      {/* 其他内容 */}
    </>
  )
}
```

#### 特性

- ✅ 鼠标视差效果
- ✅ 浮动卡片动画
- ✅ 渐变背景
- ✅ 响应式设计

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
import { SocialLinks } from '@/components';

// 水平排列
<SocialLinks variant="horizontal" size="sm" />

// 垂直排列
<SocialLinks variant="vertical" size="md" />

// 网格布局
<SocialLinks variant="grid" size="lg" />
```

#### 内置平台

| 平台       | 图标 |
| ---------- | ---- |
| 微信公众号 | 💬   |
| GitHub     | 🐙   |
| Twitter    | 🐦   |
| LinkedIn   | 💼   |
| Discord    | 🎮   |
| YouTube    | 📺   |

---

## 📦 组件导入

### 统一导入

```tsx
// 从主入口导入
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
// 导入特定组件
import { Navigation } from '@/components/Navigation'
import { MemberCard } from '@/components/MemberCard'

// 导入共享组件
import { Card, ProgressBar, EmptyState } from '@/components/shared'

// 导入聊天模块
import { useChat, ChatMessage, ChatInput } from '@/components/chat'

// 导入通知中心
import { NotificationCenter } from '@/components/NotificationCenter'
```

---

## 🎨 设计规范

### 颜色系统

组件使用 CSS 变量实现主题切换：

```css
:root {
  /* 主色 */
  --primary: #06b6d4; /* cyan-500 */
  --primary-hover: #0891b2; /* cyan-600 */

  /* 背景 */
  --bg-primary: #ffffff;
  --bg-secondary: #f4f4f5;

  /* 文本 */
  --text-primary: #18181b;
  --text-secondary: #71717a;
}

.dark {
  --bg-primary: #18181b;
  --bg-secondary: #27272a;
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
}
```

### 间距规范

```css
/* 组件内边距 */
--padding-sm: 0.75rem; /* 12px */
--padding-md: 1rem; /* 16px */
--padding-lg: 1.5rem; /* 24px */

/* 组件间距 */
--gap-sm: 0.5rem; /* 8px */
--gap-md: 1rem; /* 16px */
--gap-lg: 1.5rem; /* 24px */
```

### 圆角规范

```css
--radius-sm: 0.5rem; /* 8px */
--radius-md: 0.75rem; /* 12px */
--radius-lg: 1rem; /* 16px */
--radius-full: 9999px; /* 完全圆角 */
```

---

## ⚡ 性能优化建议

1. **懒加载组件**: 使用 `dynamic` 导入非首屏组件

```tsx
import dynamic from 'next/dynamic'

const AIChat = dynamic(() => import('@/components/AIChat'), {
  ssr: false,
})
```

2. **图片优化**: 使用 `LazyImage` 替代原生 `<img>`

3. **骨架屏**: 数据加载时展示骨架屏，提升感知性能

4. **React.memo**: 列表项组件使用 `React.memo` 避免不必要的重渲染

5. **useCallback/useMemo**: 复杂计算和回调函数使用 hooks 缓存

---

## 📝 更新日志

### 2024-03-07

- 创建完整的组件库文档
- 添加所有组件的 Props 定义
- 添加代码示例和最佳实践

---

_本文档由 🎨 设计师维护，如有问题请联系团队。_
