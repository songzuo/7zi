/**
 * LazyImage - 图片懒加载组件
 * 
 * 功能特性：
 * - Intersection Observer API 实现懒加载
 * - 支持响应式图片 srcset
 * - 懒加载占位符和动画
 * - 移动端优化
 * - TypeScript 类型支持
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';

// 图片尺寸配置
export interface ImageSize {
  width: number;
  height: number;
  breakpoint?: string;
}

export interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty' | 'skeleton';
  blurDataURL?: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  rootMargin?: string;
  threshold?: number;
  fadeIn?: boolean;
  fadeInDuration?: number;
  skeletonColor?: string;
  // 响应式图片支持
  srcSet?: ImageSize[];
  // 触摸手势支持
  enableTouchGestures?: boolean;
  onZoom?: (scale: number) => void;
  maxZoom?: number;
}

// 默认占位符
const DEFAULT_SKELETON = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3C/svg%3E';

// 默认模糊占位符
const DEFAULT_BLUR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Cfilter id="blur"%3E%3CfeGaussianBlur stdDeviation="20"/%3E%3C/filter%3E%3Crect fill="%23e5e7eb" width="400" height="300" filter="url(%23blur)"/%3E%3C/svg%3E';

/**
 * LazyImage 组件
 * 
 * @example
 * // 基础用法
 * <LazyImage
 *   src="/images/photo.jpg"
 *   alt="Photo"
 *   width={800}
 *   height={600}
 * />
 * 
 * @example
 * // 响应式图片
 * <LazyImage
 *   src="/images/photo.jpg"
 *   alt="Photo"
 *   srcSet={[
 *     { width: 400, height: 300, breakpoint: '640w' },
 *     { width: 800, height: 600, breakpoint: '1024w' },
 *     { width: 1200, height: 900, breakpoint: '1920w' },
 *   ]}
 * />
 * 
 * @example
 * // 触摸手势支持
 * <LazyImage
 *   src="/images/photo.jpg"
 *   alt="Photo"
 *   enableTouchGestures
 *   maxZoom={3}
 * />
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  fill = false,
  sizes,
  priority = false,
  quality = 85,
  placeholder = 'skeleton',
  blurDataURL,
  className = '',
  style,
  onLoad,
  onError,
  rootMargin = '200px',
  threshold = 0.01,
  fadeIn = true,
  fadeInDuration = 300,
  skeletonColor = '#f3f4f6',
  srcSet,
  enableTouchGestures = false,
  onZoom,
  maxZoom = 3,
}: LazyImageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; scale: number } | null>(null);

  // Intersection Observer 设置
  useEffect(() => {
    if (priority || isVisible) return;

    const currentRef = imgRef.current;
    if (!currentRef) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    observerRef.current.observe(currentRef);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority, rootMargin, threshold, isVisible]);

  // 图片加载完成
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  // 图片加载错误
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  // 触摸手势处理
  useEffect(() => {
    if (!enableTouchGestures || !imgRef.current) return;

    const element = imgRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        touchStartRef.current = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2,
          scale: distance,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || e.touches.length !== 2) return;
      e.preventDefault();

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      const newScale = Math.min(
        Math.max((distance / touchStartRef.current.scale) * scale, 1),
        maxZoom
      );

      setScale(newScale);
      onZoom?.(newScale);
    };

    const handleTouchEnd = () => {
      touchStartRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enableTouchGestures, maxZoom, onZoom, scale]);

  // 生成 srcSet
  const generateSrcSet = useCallback(() => {
    if (!srcSet) return undefined;
    
    return srcSet
      .map((size) => `${src}?w=${size.width}&q=${quality} ${size.breakpoint || `${size.width}w`}`)
      .join(', ');
  }, [srcSet, src, quality]);

  // 错误状态
  if (hasError) {
    return (
      <div
        className={clsx(
          'flex items-center justify-center bg-gray-100 dark:bg-gray-800',
          className
        )}
        style={{
          width: fill ? '100%' : width,
          height: fill ? '100%' : height,
          ...style,
        }}
      >
        <div className="text-center p-4">
          <svg
            className="w-12 h-12 mx-auto mb-2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-sm text-gray-500">图片加载失败</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={imgRef}
      className={clsx('relative overflow-hidden', className)}
      style={{
        width: fill ? '100%' : width,
        height: fill ? '100%' : height,
        ...style,
      }}
    >
      {/* 占位符 */}
      {(isLoading || !isVisible) && (
        <div
          className={clsx(
            'absolute inset-0',
            placeholder === 'skeleton' && 'animate-pulse bg-gray-200 dark:bg-gray-700',
            placeholder === 'blur' && 'blur-lg'
          )}
          style={{
            backgroundColor: placeholder === 'skeleton' ? skeletonColor : undefined,
          }}
        >
          {placeholder === 'blur' && blurDataURL && (
            <Image
              src={blurDataURL}
              alt=""
              fill
              className="object-cover"
            />
          )}
        </div>
      )}

      {/* 图片 */}
      {isVisible && (
        <div
          className={clsx(
            'w-full h-full',
            fadeIn && 'transition-opacity',
            isLoading && 'opacity-0'
          )}
          style={{
            transitionDuration: fadeIn ? `${fadeInDuration}ms` : undefined,
            transform: enableTouchGestures ? `scale(${scale})` : undefined,
            transformOrigin: 'center center',
          }}
        >
          <Image
            src={src}
            alt={alt}
            width={fill ? undefined : width}
            height={fill ? undefined : height}
            fill={fill}
            sizes={sizes}
            priority={priority}
            quality={quality}
            placeholder={blurDataURL ? 'blur' : 'empty'}
            blurDataURL={blurDataURL}
            loading={priority ? 'eager' : 'lazy'}
            onLoad={handleLoad}
            onError={handleError}
            className="object-cover w-full h-full"
          />
        </div>
      )}
    </div>
  );
}

export default LazyImage;
