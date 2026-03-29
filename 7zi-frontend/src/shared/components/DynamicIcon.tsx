'use client';

import { lazy, Suspense, ComponentType } from 'react';
import { LucideProps } from 'lucide-react';

// 图标名称到导入路径的映射
const iconMap = {
  Bell: () => import('lucide-react/dist/esm/icons/bell'),
  Send: () => import('lucide-react/dist/esm/icons/send'),
  Trash2: () => import('lucide-react/dist/esm/icons/trash-2'),
  Check: () => import('lucide-react/dist/esm/icons/check'),
  X: () => import('lucide-react/dist/esm/icons/x'),
  Info: () => import('lucide-react/dist/esm/icons/info'),
  CheckCircle: () => import('lucide-react/dist/esm/icons/check-circle'),
  AlertTriangle: () => import('lucide-react/dist/esm/icons/alert-triangle'),
  XCircle: () => import('lucide-react/dist/esm/icons/x-circle'),
  MessageSquare: () => import('lucide-react/dist/esm/icons/message-square'),
  Star: () => import('lucide-react/dist/esm/icons/star'),
  Upload: () => import('lucide-react/dist/esm/icons/upload'),
  Camera: () => import('lucide-react/dist/esm/icons/camera'),
  Save: () => import('lucide-react/dist/esm/icons/save'),
  Loader2: () => import('lucide-react/dist/esm/icons/loader-2'),
  Globe: () => import('lucide-react/dist/esm/icons/globe'),
  Lightbulb: () => import('lucide-react/dist/esm/icons/lightbulb'),
} as const;

type IconName = keyof typeof iconMap;

// 加载中的占位组件
function IconFallback({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-zinc-300 dark:bg-zinc-700 rounded ${className}`}
      style={{ width: '1em', height: '1em' }}
    />
  );
}

// 缓存已加载的图标组件
const iconCache = new Map<IconName, ComponentType<LucideProps>>();

/**
 * 动态图标组件
 * 按需加载图标，减少初始 bundle 大小
 * 
 * @example
 * <DynamicIcon name="Bell" className="w-4 h-4" />
 */
export function DynamicIcon({ 
  name, 
  ...props 
}: { name: IconName } & LucideProps) {
  // 检查缓存
  const CachedIcon = iconCache.get(name);
  
  if (CachedIcon) {
    return <CachedIcon {...props} />;
  }

  // 动态加载图标
  const IconComponent = lazy(async () => {
    const module = await iconMap[name]();
    const Icon = module.default;
    iconCache.set(name, Icon);
    return { default: Icon };
  });

  return (
    <Suspense fallback={<IconFallback className={props.className} />}>
      <IconComponent {...props} />
    </Suspense>
  );
}

// 导出图标名称类型供其他组件使用
export type { IconName };
