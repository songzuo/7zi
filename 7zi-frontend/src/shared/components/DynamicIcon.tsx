'use client'

import { lazy, Suspense, ComponentType } from 'react'
import { LucideProps } from 'lucide-react'

// 图标名称到导入路径的映射 - use named exports instead of internal paths
const iconMap = {
  Bell: () => import('lucide-react').then(m => ({ default: m.Bell })),
  Send: () => import('lucide-react').then(m => ({ default: m.Send })),
  Trash2: () => import('lucide-react').then(m => ({ default: m.Trash2 })),
  Check: () => import('lucide-react').then(m => ({ default: m.Check })),
  X: () => import('lucide-react').then(m => ({ default: m.X })),
  Info: () => import('lucide-react').then(m => ({ default: m.Info })),
  CheckCircle: () => import('lucide-react').then(m => ({ default: m.CheckCircle })),
  AlertTriangle: () => import('lucide-react').then(m => ({ default: m.AlertTriangle })),
  XCircle: () => import('lucide-react').then(m => ({ default: m.XCircle })),
  MessageSquare: () => import('lucide-react').then(m => ({ default: m.MessageSquare })),
  Star: () => import('lucide-react').then(m => ({ default: m.Star })),
  Upload: () => import('lucide-react').then(m => ({ default: m.Upload })),
  Camera: () => import('lucide-react').then(m => ({ default: m.Camera })),
  Save: () => import('lucide-react').then(m => ({ default: m.Save })),
  Loader2: () => import('lucide-react').then(m => ({ default: m.Loader2 })),
  Globe: () => import('lucide-react').then(m => ({ default: m.Globe })),
  Lightbulb: () => import('lucide-react').then(m => ({ default: m.Lightbulb })),
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
