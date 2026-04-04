'use client'

import { lazy, Suspense, ComponentType } from 'react'
import { LucideProps } from 'lucide-react'

// 图标名称到导入路径的映射 - use named exports instead of internal paths
const iconMap = {
  // Notification icons
  Bell: () => import('lucide-react').then(m => ({ default: m.Bell })),
  MessageSquare: () => import('lucide-react').then(m => ({ default: m.MessageSquare })),
  // Form icons
  Send: () => import('lucide-react').then(m => ({ default: m.Send })),
  Trash2: () => import('lucide-react').then(m => ({ default: m.Trash2 })),
  Check: () => import('lucide-react').then(m => ({ default: m.Check })),
  Star: () => import('lucide-react').then(m => ({ default: m.Star })),
  Upload: () => import('lucide-react').then(m => ({ default: m.Upload })),
  Camera: () => import('lucide-react').then(m => ({ default: m.Camera })),
  Save: () => import('lucide-react').then(m => ({ default: m.Save })),
  Loader2: () => import('lucide-react').then(m => ({ default: m.Loader2 })),
  Lightbulb: () => import('lucide-react').then(m => ({ default: m.Lightbulb })),
  // UI icons
  X: () => import('lucide-react').then(m => ({ default: m.X })),
  Info: () => import('lucide-react').then(m => ({ default: m.Info })),
  Globe: () => import('lucide-react').then(m => ({ default: m.Globe })),
  Menu: () => import('lucide-react').then(m => ({ default: m.Menu })),
  Search: () => import('lucide-react').then(m => ({ default: m.Search })),
  ChevronDown: () => import('lucide-react').then(m => ({ default: m.ChevronDown })),
  ChevronRight: () => import('lucide-react').then(m => ({ default: m.ChevronRight })),
  // Status icons
  CheckCircle: () => import('lucide-react').then(m => ({ default: m.CheckCircle })),
  XCircle: () => import('lucide-react').then(m => ({ default: m.XCircle })),
  AlertTriangle: () => import('lucide-react').then(m => ({ default: m.AlertTriangle })),
  AlertCircle: () => import('lucide-react').then(m => ({ default: m.AlertCircle })),
  // Monitoring icons
  Activity: () => import('lucide-react').then(m => ({ default: m.Activity })),
  Clock: () => import('lucide-react').then(m => ({ default: m.Clock })),
  Zap: () => import('lucide-react').then(m => ({ default: m.Zap })),
  RefreshCw: () => import('lucide-react').then(m => ({ default: m.RefreshCw })),
  // Workflow icons
  Layout: () => import('lucide-react').then(m => ({ default: m.Layout })),
  ArrowRight: () => import('lucide-react').then(m => ({ default: m.ArrowRight })),
  ArrowDown: () => import('lucide-react').then(m => ({ default: m.ArrowDown })),
  ArrowLeft: () => import('lucide-react').then(m => ({ default: m.ArrowLeft })),
  ArrowUp: () => import('lucide-react').then(m => ({ default: m.ArrowUp })),
  Circle: () => import('lucide-react').then(m => ({ default: m.Circle })),
  GitBranch: () => import('lucide-react').then(m => ({ default: m.GitBranch })),
  MapPin: () => import('lucide-react').then(m => ({ default: m.MapPin })),
  // Misc icons
  Download: () => import('lucide-react').then(m => ({ default: m.Download })),
  FileJson: () => import('lucide-react').then(m => ({ default: m.FileJson })),
  Bug: () => import('lucide-react').then(m => ({ default: m.Bug })),
  Home: () => import('lucide-react').then(m => ({ default: m.Home })),
  FileText: () => import('lucide-react').then(m => ({ default: m.FileText })),
  Copy: () => import('lucide-react').then(m => ({ default: m.Copy })),
  Keyboard: () => import('lucide-react').then(m => ({ default: m.Keyboard })),
} as const

type IconName = keyof typeof iconMap

// 加载中的占位组件
function IconFallback({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-zinc-300 dark:bg-zinc-700 ${className}`}
      style={{ width: '1em', height: '1em' }}
    />
  )
}

// 缓存已加载的图标组件
const iconCache = new Map<IconName, ComponentType<LucideProps>>()

// Props without ref to avoid type conflicts with dynamic components
type IconProps = Omit<LucideProps, 'ref'>

/**
 * 动态图标组件
 * 按需加载图标，减少初始 bundle 大小
 *
 * @example
 * <DynamicIcon name="Bell" className="w-4 h-4" />
 */
export function DynamicIcon({ name, ...props }: { name: IconName } & IconProps) {
  // 检查缓存
  const CachedIcon = iconCache.get(name)

  if (CachedIcon) {
    return <CachedIcon {...props} />
  }

  // 动态加载图标
  const IconComponent = lazy(async () => {
    const module = await iconMap[name]()
    const Icon = module.default
    iconCache.set(name, Icon)
    return { default: Icon }
  })

  return (
    <Suspense fallback={<IconFallback className={props.className} />}>
      <IconComponent {...props} />
    </Suspense>
  )
}

// 导出图标名称类型供其他组件使用
export type { IconName }
