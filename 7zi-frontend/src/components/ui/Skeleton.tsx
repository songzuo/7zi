'use memo';

/**
 * 骨架屏组件
 * 用于加载状态的占位符
 * 
 * @version 1.0.0
 * @date 2026-03-29
 */

import { forwardRef, memo, useState, useEffect, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// 基础骨架屏组件
// ============================================

interface SkeletonProps {
  /** CSS 类名 */
  className?: string;
  /** 动画是否开启 */
  animate?: boolean;
  /** 自定义样式 */
  style?: CSSProperties;
  /** 子元素 */
  children?: ReactNode;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, animate = true, style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-gray-200 dark:bg-gray-800',
          animate && 'animate-pulse',
          className
        )}
        style={style}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Skeleton.displayName = 'Skeleton';

// ============================================
// 文本骨架屏
// ============================================

interface SkeletonTextProps extends Omit<SkeletonProps, 'children'> {
  /** 行数 */
  lines?: number;
  /** 每行高度 */
  height?: number;
  /** 行间距 */
  gap?: number;
  /** 最后一行宽度百分比 */
  lastLineWidth?: number;
}

export const SkeletonText = memo<SkeletonTextProps>(
  ({
    className,
    lines = 3,
    height = 16,
    gap = 8,
    lastLineWidth = 70,
    style,
    ...props
  }) => {
    return (
      <div className={cn('space-y-1', className)} style={style}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            className="rounded"
            style={{
              width:
                index === lines - 1
                  ? `${lastLineWidth}%`
                  : '100%',
              height: `${height}px`,
              marginBottom: index < lines - 1 ? `${gap}px` : 0,
            }}
          />
        ))}
      </div>
    );
  }
);
SkeletonText.displayName = 'SkeletonText';

// ============================================
// 圆形头像骨架屏
// ============================================

interface SkeletonAvatarProps extends Omit<SkeletonProps, 'children'> {
  /** 尺寸 */
  size?: number;
  /** 是否为圆形 */
  circle?: boolean;
}

export const SkeletonAvatar = memo<SkeletonAvatarProps>(
  ({ className, size = 40, circle = true, style, ...props }) => {
    return (
      <Skeleton
        className={circle ? 'rounded-full' : 'rounded'}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          ...style,
        }}
        {...props}
      />
    );
  }
);
SkeletonAvatar.displayName = 'SkeletonAvatar';

// ============================================
// 卡片骨架屏
// ============================================

interface SkeletonCardProps {
  /** CSS 类名 */
  className?: string;
  /** 是否显示头像 */
  showAvatar?: boolean;
  /** 头像大小 */
  avatarSize?: number;
  /** 是否显示标题 */
  showTitle?: boolean;
  /** 标题宽度 */
  titleWidth?: number;
  /** 是否显示描述 */
  showDescription?: boolean;
  /** 描述行数 */
  descriptionLines?: number;
  /** 是否显示底部操作栏 */
  showActions?: boolean;
  /** 动作数量 */
  actionCount?: number;
}

export const SkeletonCard = memo<SkeletonCardProps>(
  ({
    className,
    showAvatar = true,
    avatarSize = 40,
    showTitle = true,
    titleWidth = 60,
    showDescription = true,
    descriptionLines = 2,
    showActions = true,
    actionCount = 2,
  }) => {
    return (
      <div className={cn('p-4 border rounded-lg', className)}>
        {/* 头部和头像 */}
        {(showAvatar || showTitle) && (
          <div className="flex items-center gap-3 mb-3">
            {showAvatar && (
              <SkeletonAvatar size={avatarSize} />
            )}
            {showTitle && (
              <Skeleton
                className="rounded"
                style={{ width: `${titleWidth}%`, height: '20px' }}
              />
            )}
          </div>
        )}

        {/* 描述 */}
        {showDescription && (
          <SkeletonText
            lines={descriptionLines}
            height={14}
            className="mb-3"
          />
        )}

        {/* 操作栏 */}
        {showActions && (
          <div className="flex gap-2 mt-4">
            {Array.from({ length: actionCount }).map((_, index) => (
              <Skeleton
                key={index}
                className="rounded"
                style={{
                  width: index === 0 ? '30%' : '20%',
                  height: '32px',
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);
SkeletonCard.displayName = 'SkeletonCard';

// ============================================
// 列表骨架屏
// ============================================

interface SkeletonListProps extends Omit<SkeletonProps, 'children'> {
  /** 列表项数量 */
  count?: number;
  /** 列表项配置 */
  itemProps?: SkeletonCardProps;
}

export const SkeletonList = memo<SkeletonListProps>(
  ({ className, count = 3, itemProps, ...props }) => {
    return (
      <div className={cn('space-y-4', className)} {...props}>
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonCard key={index} {...itemProps} />
        ))}
      </div>
    );
  }
);
SkeletonList.displayName = 'SkeletonList';

// ============================================
// 表格骨架屏
// ============================================

interface SkeletonTableProps extends Omit<SkeletonProps, 'children'> {
  /** 行数 */
  rows?: number;
  /** 列数 */
  columns?: number;
  /** 是否显示表头 */
  showHeader?: boolean;
  /** 单元格高度 */
  cellHeight?: number;
}

export const SkeletonTable = memo<SkeletonTableProps>(
  ({
    className,
    rows = 5,
    columns = 4,
    showHeader = true,
    cellHeight = 40,
    style,
  }) => {
    return (
      <div className={cn('w-full', className)} style={style}>
        <div className="border rounded-lg overflow-hidden">
          {/* 表头 */}
          {showHeader && (
            <div className="grid bg-gray-50 dark:bg-gray-900">
              {Array.from({ length: columns }).map((_, index) => (
                <div
                  key={`header-${index}`}
                  className="border-b p-3"
                  style={{
                    width: `${100 / columns}%`,
                  }}
                >
                  <Skeleton
                    style={{ height: `${cellHeight * 0.6}px` }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 表体 */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="grid">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  className="border-b p-3 last:border-b-0"
                  style={{
                    width: `${100 / columns}%`,
                  }}
                >
                  <Skeleton style={{ height: `${cellHeight * 0.5}px` }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
);
SkeletonTable.displayName = 'SkeletonTable';

// ============================================
// 图片骨架屏
// ============================================

interface SkeletonImageProps extends Omit<SkeletonProps, 'children'> {
  /** 宽度 */
  width?: number | string;
  /** 高度 */
  height?: number | string;
  /** 圆角 */
  borderRadius?: number | string;
  /** 宽高比 (16:9, 4:3, 1:1 等) */
  aspectRatio?: string;
}

export const SkeletonImage = memo<SkeletonImageProps>(
  ({
    className,
    width = '100%',
    height,
    borderRadius,
    aspectRatio,
    style,
    ...props
  }) => {
    const aspectStyle = aspectRatio
      ? { aspectRatio }
      : { width, height };

    return (
      <Skeleton
        className={className}
        style={{
          borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
          ...aspectStyle,
          ...style,
        }}
        {...props}
      />
    );
  }
);
SkeletonImage.displayName = 'SkeletonImage';

// ============================================
// 导航骨架屏
// ============================================

interface SkeletonNavigationProps extends Omit<SkeletonProps, 'children'> {
  /** 导航项数量 */
  items?: number;
  /** 导航项高度 */
  itemHeight?: number;
  /** 是否显示 Logo */
  showLogo?: boolean;
  /** Logo 高度 */
  logoHeight?: number;
}

export const SkeletonNavigation = memo<SkeletonNavigationProps>(
  ({
    className,
    items = 5,
    itemHeight = 40,
    showLogo = true,
    logoHeight = 32,
  }) => {
    return (
      <div className={cn('flex flex-col', className)}>
        {/* Logo */}
        {showLogo && (
          <div className="mb-4">
            <Skeleton
              className="rounded"
              style={{
                width: '120px',
                height: `${logoHeight}px`,
              }}
            />
          </div>
        )}

        {/* 导航项 */}
        <div className="space-y-2">
          {Array.from({ length: items }).map((_, index) => (
            <Skeleton
              key={index}
              className="rounded"
              style={{
                height: `${itemHeight}px`,
                width: index === items - 1 ? '80%' : '100%',
              }}
            />
          ))}
        </div>
      </div>
    );
  }
);
SkeletonNavigation.displayName = 'SkeletonNavigation';

// ============================================
// 加载状态包装器
// ============================================

interface LoadingWrapperProps {
  /** 是否加载中 */
  loading: boolean;
  /** 加载中的骨架屏 */
  skeleton?: ReactNode;
  /** 加载完成后的内容 */
  children: ReactNode;
  /** 延迟显示加载状态 */
  delay?: number;
}

export function LoadingWrapper({
  loading,
  skeleton,
  children,
  delay = 200,
}: LoadingWrapperProps) {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowLoading(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setShowLoading(false);
    }
  }, [loading, delay]);

  if (showLoading) {
    return <>{skeleton}</>;
  }

  return <>{children}</>;
}

// ============================================
// 默认导出
// ============================================

export default Skeleton;
