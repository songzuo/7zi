# 🎨 v1.9.0 UI/UX 改进设计方案

**项目**: 7zi AI 团队管理平台  
**版本**: v1.9.0  
**设计师**: 🎨 设计师子代理  
**创建日期**: 2026-04-02  
**基于版本**: v1.8.0

---

## 📋 执行摘要

本方案基于对 7zi 项目 v1.8.0 的深入 UI/UX 审查，针对 **移动端适配**、**加载性能与视觉反馈**、**色彩与排版一致性** 三大重点方向进行优化设计。

### 改进优先级总览

| 优先级 | 改进方向              | 影响范围     | 预期收益          | 工作量 |
| ------ | --------------------- | ------------ | ----------------- | ------ |
| 🔴 P0  | 移动端触控优化        | 全站交互     | 移动端可用性 +40% | 8-10h  |
| 🔴 P0  | 骨架屏加载系统        | 数据展示页面 | 加载体验 +50%     | 6-8h   |
| 🔴 P0  | 暗色模式颜色修复      | 全站         | 可访问性达标      | 2-3h   |
| 🟡 P1  | 响应式组件系统        | 核心组件     | 响应式覆盖率 +35% | 10-12h |
| 🟡 P1  | 统一 Loading 状态     | 交互组件     | 一致性 +60%       | 4-5h   |
| 🟡 P1  | 颜色系统 CSS 变量迁移 | UI 组件      | 维护性 +80%       | 6-8h   |
| 🟢 P2  | 微交互动画系统        | 全站交互     | 体验细腻度 +30%   | 4-6h   |
| 🟢 P2  | 排版系统标准化        | 文本内容     | 可读性 +25%       | 3-4h   |

**总工作量**: 43-56 小时  
**建议完成时间**: 2-3 周

---

## 🎯 设计目标

### 1. 移动端体验优化

**目标评分**: 从 6/10 提升至 9/10

**关键指标**:

- 触控目标尺寸达标率: 60% → 100%
- 响应式组件覆盖率: 30% → 90%
- 移动端加载性能: LCP < 2.5s

### 2. 加载与反馈系统

**目标评分**: 从 7/10 提升至 9/10

**关键指标**:

- 所有数据加载有骨架屏: 30% → 100%
- 操作反馈延迟: < 100ms
- 错误状态覆盖率: 100%

### 3. 设计一致性

**目标评分**: 从 7.2/10 提升至 9/10

**关键指标**:

- CSS 变量使用率: 20% → 90%
- 暗色模式一致性: 100%
- 组件 API 一致性: 95%

---

## 📱 一、移动端适配改进方案

### 1.1 触控目标优化

#### 问题分析

当前问题:

- 部分按钮触控目标小于 44×44px（Apple 标准）
- 图标按钮缺少明确的点击区域
- 移动端链接间距过小

#### 设计方案

##### 1.1.1 触控尺寸规范

```
触控目标最小尺寸：
┌────────────────────────────────────┐
│  最小值: 44×44px (Apple 标准)        │
│  推荐值: 48×48px (Android 标准)      │
│  安全值: 56×56px (关键操作)          │
└────────────────────────────────────┘
```

##### 1.1.2 CSS 工具类

```css
/* src/styles/mobile-touch.css - 新增 */

/* 触控目标基础类 */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 安全触控目标 */
.touch-safe {
  min-height: 48px;
  min-width: 48px;
}

/* 关键操作触控目标 */
.touch-critical {
  min-height: 56px;
  min-width: 56px;
}

/* 触控扩展区域（可视化区域小，但点击区域大） */
.touch-expand {
  position: relative;
}

.touch-expand::after {
  content: '';
  position: absolute;
  top: -8px;
  right: -8px;
  bottom: -8px;
  left: -8px;
}
```

##### 1.1.3 组件修改

**Button 组件改进**:

```tsx
// src/components/ui/Button.tsx - 修改 SIZE_CONFIG

const SIZE_CONFIG: Record<ButtonSize, string> = {
  xs: 'min-h-[44px] min-w-[44px] px-3 py-2 text-xs',  // 最小触控尺寸
  sm: 'min-h-[44px] min-w-[44px] px-3 py-2.5 text-sm',
  md: 'min-h-[48px] min-w-[48px] px-4 py-3 text-base',
  lg: 'min-h-[52px] min-w-[52px] px-6 py-3 text-lg',
  xl: 'min-h-[56px] min-w-[56px] px-8 py-4 text-xl',
}

// 移动端触控提示
<button
  className={cn(
    // ... 现有样式
    'active:scale-[0.97] md:active:scale-100', // 移动端按压缩放
    'touch-manipulation', // 禁用双击缩放
  )}
>
```

**IconButton 组件改进**:

```tsx
// 新增触控安全区域
export const IconButton: FC<IconButtonProps> = ({
  icon,
  tooltip,
  size = 'md',
  className,
  ...props
}) => {
  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center rounded-lg',
        'min-h-[44px] min-w-[44px]', // 确保触控尺寸
        'focus:ring-2 focus:ring-offset-2 focus:outline-none',
        'transition-all duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'hover:bg-zinc-100 dark:hover:bg-zinc-800',
        'active:scale-[0.95] md:active:scale-100',
        className
      )}
      title={tooltip}
      {...props}
    >
      <span className="pointer-events-none">{icon}</span>
    </button>
  )
}
```

---

### 1.2 响应式组件系统

#### 1.2.1 响应式断点规范

```
断点系统：
┌──────────────────────────────────────────────────┐
│  xs: 0-479px     │ 极小手机                        │
│  sm: 480-639px   │ 小手机                          │
│  md: 640-767px   │ 大手机/小平板                    │
│  lg: 768-1023px  │ 平板竖屏                        │
│  xl: 1024-1279px │ 平板横屏/小笔记本                │
│  2xl: 1280px+    │ 桌面                            │
└──────────────────────────────────────────────────┘
```

#### 1.2.2 Card 响应式改进

```tsx
// src/components/ui/Card.tsx - 响应式版本

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  hoverable?: boolean
  responsive?: boolean
}

const CARD_STYLES = {
  base: 'rounded-xl border bg-white dark:bg-zinc-900 transition-all duration-200',
  shadow: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  },
  padding: {
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  },
  hover: 'hover:shadow-lg hover:-translate-y-0.5 dark:hover:shadow-zinc-900/50',
}

export function Card({
  children,
  className = '',
  size = 'md',
  hoverable = false,
  responsive = true,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        CARD_STYLES.base,
        CARD_STYLES.shadow[size],
        responsive
          ? CARD_STYLES.padding[size]
          : `p-${size === 'sm' ? '4' : size === 'md' ? '6' : '8'}`,
        hoverable && CARD_STYLES.hover,
        'dark:border-zinc-800',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
```

#### 1.2.3 响应式 Grid 系统

```tsx
// src/components/ui/ResponsiveGrid.tsx - 新增

interface ResponsiveGridProps {
  children: React.ReactNode
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

const GAP_STYLES = {
  sm: 'gap-2 sm:gap-3',
  md: 'gap-4 sm:gap-6',
  lg: 'gap-6 sm:gap-8',
}

export function ResponsiveGrid({
  children,
  cols = { default: 1, sm: 2, lg: 3 },
  gap = 'md',
  className,
}: ResponsiveGridProps) {
  const colClasses = cn(
    cols.default && `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`
  )

  return <div className={cn('grid', colClasses, GAP_STYLES[gap], className)}>{children}</div>
}
```

---

### 1.3 移动端导航优化

#### 1.3.1 底部导航栏设计

```
移动端底部导航结构：
┌────────────────────────────────────────────────┐
│                                                │
│  [页面内容区域]                                 │
│                                                │
├────────────────────────────────────────────────┤
│  🏠    📋    ➕    📊    👤                     │
│  首页   任务   新建   分析   我的                │
│                                                │
└────────────────────────────────────────────────┘

特点：
- 固定底部，不随页面滚动
- 安全区域内边距：padding-bottom: env(safe-area-inset-bottom)
- 触控目标：每个 56×56px
- 当前页面高亮指示
```

#### 1.3.2 底部导航组件

```tsx
// src/components/ui/MobileNav.tsx - 新增

'use client'

import { Home, ClipboardList, Plus, BarChart3, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { icon: Home, label: '首页', href: '/' },
  { icon: ClipboardList, label: '任务', href: '/tasks' },
  { icon: Plus, label: '新建', href: '/tasks/new', isMain: true },
  { icon: BarChart3, label: '分析', href: '/analytics' },
  { icon: User, label: '我的', href: '/settings' },
]

export function MobileNav({ currentPath }: { currentPath: string }) {
  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 border-t border-zinc-200 bg-white md:hidden dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {NAV_ITEMS.map(item => {
          const isActive = currentPath === item.href
          const Icon = item.icon

          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-[56px] min-w-[56px] flex-col items-center justify-center rounded-lg transition-colors',
                item.isMain
                  ? '-mt-4 rounded-full bg-blue-600 text-white shadow-lg'
                  : isActive
                    ? 'text-blue-600'
                    : 'text-zinc-500 dark:text-zinc-400',
                'active:scale-95'
              )}
            >
              <Icon className={cn('h-6 w-6', item.isMain && 'h-7 w-7')} />
              {!item.isMain && <span className="mt-1 text-xs">{item.label}</span>}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
```

---

## ⚡ 二、加载性能与视觉反馈改进方案

### 2.1 骨架屏加载系统

#### 2.1.1 骨架屏设计规范

```
骨架屏设计原则：
┌────────────────────────────────────────────────┐
│  1. 保持布局结构：与真实内容相同的占位空间        │
│  2. 灰度渐变动画：柔和的视觉反馈                 │
│  3. 圆角匹配：与真实元素圆角一致                 │
│  4. 响应式适配：根据屏幕尺寸调整                 │
└────────────────────────────────────────────────┘
```

#### 2.1.2 通用骨架屏组件

```tsx
// src/components/ui/Skeleton.tsx - 新增

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

const SKELETON_VARIANTS = {
  text: 'rounded',
  circular: 'rounded-full',
  rectangular: 'rounded-none',
  rounded: 'rounded-lg',
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-zinc-200 dark:bg-zinc-700',
        SKELETON_VARIANTS[variant],
        animation === 'pulse' && 'animate-pulse',
        animation === 'wave' && 'skeleton-wave',
        className
      )}
      style={{
        width: width,
        height: height,
      }}
    />
  )
}

/* 骨架屏预设组件 */

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" className="h-4" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      <Skeleton variant="rounded" className="h-32 w-full" />
      <Skeleton variant="text" className="h-6 w-3/4" />
      <SkeletonText lines={2} />
      <div className="flex gap-2">
        <Skeleton variant="rounded" className="h-8 w-20" />
        <Skeleton variant="rounded" className="h-8 w-16" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
      {/* 表头 */}
      <div className="flex gap-4 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" className="h-4 flex-1" />
        ))}
      </div>
      {/* 表格内容 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 border-b border-zinc-100 p-4 last:border-0 dark:border-zinc-800"
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
```

#### 2.1.3 骨架屏动画样式

```css
/* src/styles/skeleton.css - 新增 */

/* 波浪动画 */
@keyframes skeleton-wave {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton-wave {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: skeleton-wave 1.5s ease-in-out infinite;
}

/* 暗色模式波浪 */
.dark .skeleton-wave {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .skeleton-wave {
    animation: none;
  }
}
```

---

### 2.2 统一 Loading 状态系统

#### 2.2.1 Loading 状态设计规范

```
Loading 状态层级：
┌────────────────────────────────────────────────┐
│  全局 Loading  │ 页面级          │ 组件级       │
├────────────────────────────────────────────────┤
│  Spinner       │ Skeleton        │ Inline Spin │
│  全屏遮罩       │ 内容占位         │ 按钮状态     │
│  阻塞交互       │ 非阻塞           │ 非阻塞       │
└────────────────────────────────────────────────┘
```

#### 2.2.2 Loading 组件系统

```tsx
// src/components/ui/Loading.tsx - 改进版

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars'
  text?: string
  fullScreen?: boolean
  className?: string
}

const SIZE_MAP = {
  sm: { spinner: 'h-4 w-4', text: 'text-xs' },
  md: { spinner: 'h-6 w-6', text: 'text-sm' },
  lg: { spinner: 'h-8 w-8', text: 'text-base' },
  xl: { spinner: 'h-12 w-12', text: 'text-lg' },
}

export function Loading({
  size = 'md',
  variant = 'spinner',
  text,
  fullScreen = false,
  className,
}: LoadingProps) {
  const content = (
    <div className={cn('flex items-center gap-3', className)}>
      {variant === 'spinner' && (
        <svg
          className={cn('animate-spin text-blue-600', SIZE_MAP[size].spinner)}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {variant === 'dots' && <LoadingDots size={size} />}
      {variant === 'pulse' && <LoadingPulse size={size} />}
      {variant === 'bars' && <LoadingBars size={size} />}
      {text && (
        <span className={cn('text-zinc-600 dark:text-zinc-400', SIZE_MAP[size].text)}>{text}</span>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-zinc-900/80">
        {content}
      </div>
    )
  }

  return content
}

/* 点状 Loading */
function LoadingDots({ size }: { size: keyof typeof SIZE_MAP }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={cn(
            'rounded-full bg-blue-600',
            size === 'sm' && 'h-1.5 w-1.5',
            size === 'md' && 'h-2 w-2',
            size === 'lg' && 'h-2.5 w-2.5',
            size === 'xl' && 'h-3 w-3',
            'animate-bounce'
          )}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  )
}

/* 脉冲 Loading */
function LoadingPulse({ size }: { size: keyof typeof SIZE_MAP }) {
  return (
    <div className={cn('relative', SIZE_MAP[size].spinner)}>
      <div className="absolute inset-0 animate-ping rounded-full bg-blue-600/30" />
      <div className="relative h-full w-full rounded-full bg-blue-600" />
    </div>
  )
}

/* 条状 Loading */
function LoadingBars({ size }: { size: keyof typeof SIZE_MAP }) {
  return (
    <div className="flex items-end gap-0.5">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className={cn(
            'w-1 animate-pulse rounded-full bg-blue-600',
            size === 'sm' && 'h-3',
            size === 'md' && 'h-4',
            size === 'lg' && 'h-5',
            size === 'xl' && 'h-6'
          )}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  )
}
```

---

### 2.3 操作反馈系统

#### 2.3.1 反馈类型规范

```
操作反馈矩阵：
┌────────────────────────────────────────────────────────┐
│  操作类型     │ 成功反馈        │ 失败反馈         │ 进行中 │
├────────────────────────────────────────────────────────┤
│  表单提交     │ Toast + 页面跳转 │ 内联错误 + Toast │ Button │
│  数据删除     │ Toast + 列表刷新 │ Modal 错误提示   │ Button │
│  设置保存     │ Toast 成功      │ Toast 错误       │ Toggle │
│  文件上传     │ 进度条 + Toast   │ 错误弹窗         │ 进度条 │
│  搜索查询     │ 结果高亮        │ 空状态提示       │ 输入框 │
└────────────────────────────────────────────────────────┘
```

#### 2.3.2 Toast 通知改进

```tsx
// src/components/ui/Toast.tsx - 改进版

interface ToastConfig {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'loading'
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center'
}

const TOAST_STYLES = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-100 dark:bg-green-900/50',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-100 dark:bg-red-900/50',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
  },
  loading: {
    bg: 'bg-zinc-50 dark:bg-zinc-800',
    border: 'border-zinc-200 dark:border-zinc-700',
    icon: 'text-zinc-600 dark:text-zinc-400',
    iconBg: 'bg-zinc-100 dark:bg-zinc-700',
  },
}

export function Toast({ config }: { config: ToastConfig }) {
  const styles = TOAST_STYLES[config.type]

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 shadow-lg',
        'animate-in slide-in-from-right-full',
        'max-w-[420px] min-w-[320px]',
        styles.bg,
        styles.border
      )}
      role="alert"
      aria-live={config.type === 'error' ? 'assertive' : 'polite'}
    >
      {/* 图标 */}
      <div className={cn('flex-shrink-0 rounded-full p-1', styles.iconBg)}>
        <ToastIcon type={config.type} className={cn('h-5 w-5', styles.icon)} />
      </div>

      {/* 内容 */}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{config.title}</p>
        {config.description && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{config.description}</p>
        )}
        {config.action && (
          <button
            onClick={config.action.onClick}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {config.action.label}
          </button>
        )}
      </div>

      {/* 关闭按钮 */}
      <button
        className="flex-shrink-0 rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        aria-label="关闭"
      >
        <X className="h-4 w-4 text-zinc-500" />
      </button>
    </div>
  )
}
```

---

## 🎨 三、色彩与排版一致性改进方案

### 3.1 色彩系统修复

#### 3.1.1 暗色模式颜色修复

**问题**: 当前暗色模式下颜色变量定义反直觉

```css
/* 当前问题代码 (src/styles/tokens.css) */
.dark {
  --color-gray-900: #f8fafc; /* ❌ 亮色值用于 900 */
  --color-gray-50: #0f172a; /* ❌ 暗色值用于 50 */
}
```

**修复方案**:

```css
/* src/styles/tokens.css - 修复后 */

:root {
  /* 亮色模式 - 保持不变 */
  --color-gray-50: #f8fafc;
  --color-gray-900: #0f172a;

  /* 语义化颜色变量 */
  --bg-primary: var(--color-gray-50);
  --bg-secondary: var(--color-gray-100);
  --text-primary: var(--color-gray-900);
  --text-secondary: var(--color-gray-600);
  --border-primary: var(--color-gray-200);
}

.dark {
  /* 暗色模式 - 正确映射 */
  --color-gray-50: #0f172a; /* 暗色背景 */
  --color-gray-900: #f8fafc; /* 亮色文本 */

  /* 语义化颜色变量 - 暗色模式 */
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --border-primary: #334155;
}

/* 更好的方案：使用语义化变量 */
:root {
  --surface-1: #ffffff;
  --surface-2: #f8fafc;
  --surface-3: #f1f5f9;

  --on-surface-1: #0f172a;
  --on-surface-2: #475569;
  --on-surface-3: #64748b;
}

.dark {
  --surface-1: #0f172a;
  --surface-2: #1e293b;
  --surface-3: #334155;

  --on-surface-1: #f8fafc;
  --on-surface-2: #cbd5e1;
  --on-surface-3: #94a3b8;
}
```

#### 3.1.2 CSS 变量迁移

**迁移前**:

```tsx
<button className="bg-blue-600 hover:bg-blue-700 text-white">
```

**迁移后**:

```tsx
<button className="bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white">
```

**或使用 Tailwind 配置**:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
        },
      },
    },
  },
}
```

---

### 3.2 排版系统标准化

#### 3.2.1 字体层级规范

```css
/* src/styles/typography.css - 新增 */

/* 字体族 */
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  --font-display: 'Inter', var(--font-sans);
}

/* 字体大小 - 模块化缩放 (1.25) */
:root {
  --text-xs: 0.75rem; /* 12px */
  --text-sm: 0.875rem; /* 14px */
  --text-base: 1rem; /* 16px */
  --text-lg: 1.125rem; /* 18px */
  --text-xl: 1.25rem; /* 20px */
  --text-2xl: 1.5rem; /* 24px */
  --text-3xl: 1.875rem; /* 30px */
  --text-4xl: 2.25rem; /* 36px */
  --text-5xl: 3rem; /* 48px */
}

/* 行高 */
:root {
  --leading-none: 1;
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 2;
}

/* 字重 */
:root {
  --font-light: 300;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}

/* 字间距 */
:root {
  --tracking-tighter: -0.05em;
  --tracking-tight: -0.025em;
  --tracking-normal: 0;
  --tracking-wide: 0.025em;
  --tracking-wider: 0.05em;
}
```

#### 3.2.2 排版组件

```tsx
// src/components/ui/Typography.tsx - 新增

interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6
  children: React.ReactNode
  className?: string
}

const HEADING_STYLES = {
  1: 'text-4xl md:text-5xl font-bold tracking-tight',
  2: 'text-3xl md:text-4xl font-semibold tracking-tight',
  3: 'text-2xl md:text-3xl font-semibold',
  4: 'text-xl md:text-2xl font-medium',
  5: 'text-lg md:text-xl font-medium',
  6: 'text-base md:text-lg font-medium',
}

export function Heading({ level, children, className }: HeadingProps) {
  const Tag = `h${level}` as const
  return (
    <Tag className={cn(HEADING_STYLES[level], 'text-zinc-900 dark:text-zinc-100', className)}>
      {children}
    </Tag>
  )
}

interface TextProps {
  size?: 'xs' | 'sm' | 'base' | 'lg'
  weight?: 'normal' | 'medium' | 'semibold'
  color?: 'primary' | 'secondary' | 'muted'
  children: React.ReactNode
  className?: string
}

const TEXT_COLORS = {
  primary: 'text-zinc-900 dark:text-zinc-100',
  secondary: 'text-zinc-600 dark:text-zinc-400',
  muted: 'text-zinc-500 dark:text-zinc-500',
}

export function Text({
  size = 'base',
  weight = 'normal',
  color = 'primary',
  children,
  className,
}: TextProps) {
  return (
    <p className={cn(`text-${size}`, `font-${weight}`, TEXT_COLORS[color], className)}>
      {children}
    </p>
  )
}
```

---

### 3.3 间距系统标准化

```css
/* src/styles/spacing.css - 新增 */

/* 基础间距单位: 4px */
:root {
  --space-0: 0;
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-5: 1.25rem; /* 20px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */
  --space-10: 2.5rem; /* 40px */
  --space-12: 3rem; /* 48px */
  --space-16: 4rem; /* 64px */
  --space-20: 5rem; /* 80px */
  --space-24: 6rem; /* 96px */
}

/* 语义化间距 */
:root {
  --section-gap: var(--space-16);
  --card-padding: var(--space-6);
  --input-padding: var(--space-3) var(--space-4);
  --button-padding: var(--space-2) var(--space-4);
}
```

---

## 📐 四、实施计划

### 4.1 阶段一：基础设施 (Week 1)

| 任务                 | 预估时间 | 负责人      | 依赖         |
| -------------------- | -------- | ----------- | ------------ |
| 修复暗色模式颜色变量 | 2h       | 🎨 设计师   | 无           |
| 创建 skeleton.css    | 1h       | 🎨 设计师   | 无           |
| 创建 typography.css  | 1h       | 🎨 设计师   | 无           |
| 创建 spacing.css     | 1h       | 🎨 设计师   | 无           |
| 改进 Button 组件     | 2h       | ⚡ Executor | 无           |
| 改进 Card 组件       | 2h       | ⚡ Executor | 无           |
| 创建 Skeleton 组件   | 3h       | ⚡ Executor | skeleton.css |

### 4.2 阶段二：组件优化 (Week 2)

| 任务                     | 预估时间 | 负责人      | 依赖           |
| ------------------------ | -------- | ----------- | -------------- |
| 创建 Loading 组件系统    | 4h       | ⚡ Executor | 阶段一         |
| 创建 ResponsiveGrid 组件 | 2h       | ⚡ Executor | 阶段一         |
| 创建 MobileNav 组件      | 3h       | ⚡ Executor | 阶段一         |
| 改进 Toast 组件          | 2h       | ⚡ Executor | 阶段一         |
| 创建 Typography 组件     | 2h       | ⚡ Executor | typography.css |

### 4.3 阶段三：页面适配 (Week 3)

| 任务                     | 预估时间 | 负责人      | 依赖   |
| ------------------------ | -------- | ----------- | ------ |
| Dashboard 页面响应式适配 | 4h       | ⚡ Executor | 阶段二 |
| Tasks 页面响应式适配     | 3h       | ⚡ Executor | 阶段二 |
| Settings 页面响应式适配  | 2h       | ⚡ Executor | 阶段二 |
| 全局骨架屏集成           | 4h       | ⚡ Executor | 阶段二 |
| CSS 变量迁移             | 6h       | ⚡ Executor | 阶段一 |

### 4.4 验收标准

#### 移动端适配

- [ ] 所有触控目标 ≥ 44px
- [ ] 响应式断点测试通过
- [ ] 移动端 LCP < 2.5s
- [ ] 移动端 CLS < 0.1

#### 加载反馈

- [ ] 所有数据页面有骨架屏
- [ ] Loading 状态覆盖率 100%
- [ ] Toast 通知一致性

#### 设计一致性

- [ ] 暗色模式颜色正确
- [ ] CSS 变量使用率 > 80%
- [ ] 组件 API 一致性 > 95%

---

## 📊 五、设计决策记录 (ADR)

### ADR-001: 触控目标尺寸标准

**决策**: 采用 48px 作为默认最小触控目标尺寸

**原因**:

- Apple 标准 44px 是最小要求
- Android 标准 48px 提供更好的容错
- 56px 用于关键操作

**影响**: 所有按钮、链接、可点击元素需要重新评估尺寸

### ADR-002: 骨架屏 vs Loading Spinner

**决策**: 数据展示页面使用骨架屏，操作按钮使用 Spinner

**原因**:

- 骨架屏减少布局跳动 (CLS)
- Spinner 适合短暂等待 (< 1s)
- 骨架屏适合数据加载 (> 1s)

### ADR-003: CSS 变量命名规范

**决策**: 使用语义化变量名替代直接色阶名

**原因**:

- `--text-primary` 比 `--color-gray-900` 更清晰
- 便于主题切换
- 减少暗色模式混淆

---

## 🔗 六、参考资源

### 设计系统参考

- [Material Design 3](https://m3.material.io/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Tailwind UI](https://tailwindui.com/)

### 性能优化参考

- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [React Performance](https://react.dev/learn/render-and-commit)

### 可访问性参考

- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/)
- [A11y Project](https://www.a11yproject.com/)

---

## 📝 七、附录

### A. 组件清单

| 组件           | 当前状态  | v1.9.0 目标   | 优先级 |
| -------------- | --------- | ------------- | ------ |
| Button         | ✅ 良好   | 触控优化      | P0     |
| Card           | ⚠️ 需改进 | 响应式 + size | P1     |
| Input          | ✅ 良好   | 触控优化      | P1     |
| Modal          | ⚠️ 需改进 | 移动端适配    | P1     |
| Toast          | ✅ 良好   | 样式统一      | P2     |
| Loading        | ❌ 缺失   | 新增组件      | P0     |
| Skeleton       | ❌ 缺失   | 新增组件      | P0     |
| MobileNav      | ❌ 缺失   | 新增组件      | P1     |
| ResponsiveGrid | ❌ 缺失   | 新增组件      | P1     |
| Typography     | ❌ 缺失   | 新增组件      | P2     |

### B. 文件变更清单

**新增文件**:

- `src/styles/skeleton.css`
- `src/styles/typography.css`
- `src/styles/spacing.css`
- `src/styles/mobile-touch.css`
- `src/components/ui/Skeleton.tsx`
- `src/components/ui/Loading.tsx`
- `src/components/ui/MobileNav.tsx`
- `src/components/ui/ResponsiveGrid.tsx`
- `src/components/ui/Typography.tsx`

**修改文件**:

- `src/styles/tokens.css` - 修复暗色模式
- `src/components/ui/Button.tsx` - 触控优化
- `src/components/ui/Card.tsx` - 响应式 + size
- `src/components/ui/toast.tsx` - 样式统一
- `src/app/globals.css` - 动画优化

### C. 风险评估

| 风险                     | 影响 | 概率 | 缓解措施                  |
| ------------------------ | ---- | ---- | ------------------------- |
| CSS 变量迁移导致样式异常 | 高   | 中   | 分阶段迁移 + 视觉回归测试 |
| 移动端适配影响桌面端     | 中   | 低   | 响应式断点隔离            |
| 骨架屏增加包体积         | 低   | 高   | 代码分割 + Tree Shaking   |

---

**文档版本**: 1.0.0  
**最后更新**: 2026-04-02  
**下次审查**: v1.9.0 发布前

---

> 🎨 **设计师备注**: 本方案旨在提升 v1.9.0 的 UI/UX 质量，重点解决移动端体验、加载反馈和设计一致性三大问题。建议优先完成 P0 级别任务，P1 和 P2 可根据实际开发进度调整。
