'use client';

/**
 * @fileoverview 高级图片懒加载组件
 * @description 支持多种占位符效果、渐进加载、骨架屏
 * 
 * 特性:
 * 1. Intersection Observer 懒加载
 * 2. 多种占位符效果（shimmer, blur, skeleton）
 * 3. 渐进式加载动画
 * 4. 错误处理和重试
 * 5. 响应式图片支持
 * 6. 性能优化（memo, useCallback）
 */

import { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import Image from 'next/image';

// ============================================================================
// 类型定义
// ============================================================================

export type PlaceholderType = 'shimmer' | 'blur' | 'skeleton' | 'color' | 'none';
export type ImageFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

export interface LazyLoadImageProps {
  /** 图片地址 */
  src: string;
  /** 替代文本 */
  alt: string;
  /** 宽度 */
  width?: number;
  /** 高度 */
  height?: number;
  /** 是否填充容器 */
  fill?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 占位符类型 */
  placeholderType?: PlaceholderType;
  /** 占位符颜色（用于 color 类型） */
  placeholderColor?: string;
  /** 模糊数据 URL（用于 blur 类型） */
  blurDataURL?: string;
  /** 图片适应方式 */
  objectFit?: ImageFit;
  /** 图片质量 1-100 */
  quality?: number;
  /** 响应式尺寸 */
  sizes?: string;
  /** 是否优先加载 */
  priority?: boolean;
  /** 加载阈值距离 */
  threshold?: string;
  /** 加载完成回调 */
  onLoad?: () => void;
  /** 加载失败回调 */
  onError?: () => void;
  /** 重试次数 */
  retryCount?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 圆角 */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 骨架动画 */
  skeletonAnimate?: boolean;
}

// ============================================================================
// Shimmer 占位符组件
// ============================================================================

interface ShimmerPlaceholderProps {
  className?: string;
  rounded?: string;
}

const ShimmerPlaceholder: React.FC<ShimmerPlaceholderProps> = memo(({ 
  className = '',
  rounded = 'rounded-lg'
}) => {
  return (
    <div 
      className={`
        absolute inset-0 overflow-hidden ${rounded} ${className}
        bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200
        dark:from-zinc-700 dark:via-zinc-600 dark:to-zinc-700
      `}
      aria-hidden="true"
    >
      {/* Shimmer 动画效果 */}
      <div 
        className="
          absolute inset-0 -translate-x-full
          bg-gradient-to-r from-transparent via-white/40 to-transparent
          dark:via-white/10
          animate-[shimmer_2s_infinite]
        "
        style={{
          animation: 'shimmer 2s infinite',
        }}
      />
    </div>
  );
});

ShimmerPlaceholder.displayName = 'ShimmerPlaceholder';

// ============================================================================
// Blur 占位符组件
// ============================================================================

interface BlurPlaceholderProps {
  blurDataURL?: string;
  className?: string;
  rounded?: string;
}

const BlurPlaceholder: React.FC<BlurPlaceholderProps> = memo(({ 
  blurDataURL,
  className = '',
  rounded = 'rounded-lg'
}) => {
  return (
    <div 
      className={`absolute inset-0 overflow-hidden ${rounded} ${className}`}
      aria-hidden="true"
    >
      {blurDataURL ? (
        <img
          src={blurDataURL}
          alt=""
          className="w-full h-full object-cover blur-xl scale-110 opacity-60"
        />
      ) : (
        <div className="w-full h-full bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
      )}
    </div>
  );
});

BlurPlaceholder.displayName = 'BlurPlaceholder';

// ============================================================================
// Skeleton 占位符组件
// ============================================================================

interface SkeletonPlaceholderProps {
  className?: string;
  rounded?: string;
  animate?: boolean;
}

const SkeletonPlaceholder: React.FC<SkeletonPlaceholderProps> = memo(({ 
  className = '',
  rounded = 'rounded-lg',
  animate = true
}) => {
  return (
    <div 
      className={`
        absolute inset-0 ${rounded} ${className}
        bg-zinc-200 dark:bg-zinc-700
        ${animate ? 'animate-pulse' : ''}
      `}
      aria-hidden="true"
    >
      {/* 图标 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg 
          className="w-12 h-12 text-zinc-300 dark:text-zinc-600" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
      </div>
    </div>
  );
});

SkeletonPlaceholder.displayName = 'SkeletonPlaceholder';

// ============================================================================
// Color 占位符组件
// ============================================================================

interface ColorPlaceholderProps {
  color?: string;
  className?: string;
  rounded?: string;
}

const ColorPlaceholder: React.FC<ColorPlaceholderProps> = memo(({ 
  color = '#e5e5e5',
  className = '',
  rounded = 'rounded-lg'
}) => {
  return (
    <div 
      className={`absolute inset-0 ${rounded} ${className} animate-pulse`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
});

ColorPlaceholder.displayName = 'ColorPlaceholder';

// ============================================================================
// 错误占位符组件
// ============================================================================

interface ErrorPlaceholderProps {
  alt: string;
  onRetry?: () => void;
  className?: string;
  rounded?: string;
}

const ErrorPlaceholder: React.FC<ErrorPlaceholderProps> = memo(({ 
  alt,
  onRetry,
  className = '',
  rounded = 'rounded-lg'
}) => {
  return (
    <div 
      className={`
        absolute inset-0 ${rounded} ${className}
        flex flex-col items-center justify-center
        bg-zinc-100 dark:bg-zinc-800
        text-zinc-400 dark:text-zinc-500
        p-4
      `}
      role="img"
      aria-label={`图片加载失败: ${alt}`}
    >
      <svg 
        className="w-12 h-12 mb-2" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={1.5} 
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
        />
      </svg>
      <span className="text-sm text-center mb-2">图片加载失败</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="
            px-3 py-1 text-xs
            bg-zinc-200 dark:bg-zinc-700
            hover:bg-zinc-300 dark:hover:bg-zinc-600
            rounded-md transition-colors
          "
        >
          重试
        </button>
      )}
    </div>
  );
});

ErrorPlaceholder.displayName = 'ErrorPlaceholder';

// ============================================================================
// 主组件：LazyLoadImage
// ============================================================================

export const LazyLoadImage: React.FC<LazyLoadImageProps> = memo(({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  placeholderType = 'shimmer',
  placeholderColor = '#e5e5e5',
  blurDataURL,
  objectFit = 'cover',
  quality = 75,
  sizes,
  priority = false,
  threshold = '200px',
  onLoad,
  onError,
  retryCount = 2,
  retryDelay = 1000,
  rounded = 'lg',
  skeletonAnimate = true,
}) => {
  // 状态
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [retryAttempt, setRetryAttempt] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // 圆角类名映射
  const roundedClasses = useMemo(() => ({
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  }), []);

  const roundedClass = roundedClasses[rounded] || 'rounded-lg';

  // objectFit 类名映射
  const objectFitClasses = useMemo(() => ({
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none',
    'scale-down': 'object-scale-down',
  }), []);

  // Intersection Observer 懒加载
  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: threshold,
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, threshold]);

  // 加载成功处理
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  // 加载失败处理
  const handleError = useCallback(() => {
    if (retryAttempt < retryCount) {
      // 重试
      setTimeout(() => {
        setRetryAttempt(prev => prev + 1);
      }, retryDelay);
    } else {
      setHasError(true);
      onError?.();
    }
  }, [retryAttempt, retryCount, retryDelay, onError]);

  // 手动重试
  const handleRetry = useCallback(() => {
    setHasError(false);
    setRetryAttempt(0);
    setIsLoaded(false);
  }, []);

  // 默认响应式 sizes
  const responsiveSizes = sizes || useMemo(() => `
    (max-width: 480px) 100vw,
    (max-width: 768px) 50vw,
    (max-width: 1024px) 33vw,
    (max-width: 1280px) 25vw,
    20vw
  `, []);

  // 渲染占位符
  const renderPlaceholder = useCallback(() => {
    if (isLoaded || hasError) return null;

    switch (placeholderType) {
      case 'shimmer':
        return <ShimmerPlaceholder rounded={roundedClass} />;
      case 'blur':
        return <BlurPlaceholder blurDataURL={blurDataURL} rounded={roundedClass} />;
      case 'skeleton':
        return <SkeletonPlaceholder rounded={roundedClass} animate={skeletonAnimate} />;
      case 'color':
        return <ColorPlaceholder color={placeholderColor} rounded={roundedClass} />;
      case 'none':
      default:
        return null;
    }
  }, [isLoaded, hasError, placeholderType, blurDataURL, placeholderColor, roundedClass, skeletonAnimate]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${roundedClass} ${className}`}
      style={{
        width: fill ? '100%' : (width ? `${width}px` : '100%'),
        height: fill ? '100%' : (height ? `${height}px` : 'auto'),
      }}
    >
      {/* 占位符 */}
      {renderPlaceholder()}

      {/* 错误状态 */}
      {hasError && (
        <ErrorPlaceholder 
          alt={alt} 
          onRetry={retryCount > 0 ? handleRetry : undefined}
          rounded={roundedClass}
        />
      )}

      {/* 图片 */}
      {isInView && !hasError && (
        <Image
          key={retryAttempt} // 用于重试时重新加载
          src={src}
          alt={alt}
          width={fill ? undefined : (width || 800)}
          height={fill ? undefined : (height || 600)}
          fill={fill}
          sizes={responsiveSizes}
          quality={quality}
          className={`
            transition-all duration-500 ease-out
            ${objectFitClasses[objectFit]}
            ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}
          `}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          placeholder={blurDataURL ? 'blur' : 'empty'}
          blurDataURL={blurDataURL}
        />
      )}
    </div>
  );
});

LazyLoadImage.displayName = 'LazyLoadImage';

// ============================================================================
// 画廊组件
// ============================================================================

export interface GalleryImageItem {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

interface ImageGalleryProps {
  images: GalleryImageItem[];
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: number;
  className?: string;
  placeholderType?: PlaceholderType;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const ImageGallery: React.FC<ImageGalleryProps> = memo(({
  images,
  columns = { mobile: 2, tablet: 3, desktop: 4 },
  gap = 12,
  className = '',
  placeholderType = 'shimmer',
  rounded = 'lg',
}) => {
  const { mobile = 2, tablet = 3, desktop = 4 } = columns;

  return (
    <div 
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${mobile}, 1fr)`,
        gap: `${gap}px`,
      }}
    >
      {images.map((image, index) => (
        <div
          key={`${image.src}-${index}`}
          className="relative aspect-square group cursor-pointer overflow-hidden"
          style={{ borderRadius: rounded === 'none' ? 0 : undefined }}
        >
          <LazyLoadImage
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            fill
            placeholderType={placeholderType}
            rounded={rounded}
            priority={index < 4}
            sizes={`
              (max-width: 639px) ${100 / mobile}vw,
              (max-width: 1023px) ${100 / tablet}vw,
              ${100 / desktop}vw
            `}
            className="group-hover:scale-105 transition-transform duration-300"
          />
          {/* Hover 遮罩 */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none" />
        </div>
      ))}
    </div>
  );
});

ImageGallery.displayName = 'ImageGallery';

// ============================================================================
// 响应式图片组件
// ============================================================================

interface ResponsiveLazyImageProps extends Omit<LazyLoadImageProps, 'fill'> {
  aspectRatio?: '16/9' | '4/3' | '1/1' | '3/4' | '2/3' | '21/9';
}

export const ResponsiveLazyImage: React.FC<ResponsiveLazyImageProps> = memo(({
  aspectRatio = '16/9',
  className = '',
  ...props
}) => {
  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio }}
    >
      <LazyLoadImage {...props} fill className="w-full h-full" />
    </div>
  );
});

ResponsiveLazyImage.displayName = 'ResponsiveLazyImage';

// ============================================================================
// 导出
// ============================================================================

export default LazyLoadImage;
