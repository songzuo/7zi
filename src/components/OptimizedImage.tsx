'use client';

/**
 * @fileoverview 性能优化 - 懒加载图片组件
 * @description 提供优化的图片加载体验
 * 
 * 优化策略:
 * 1. 视口懒加载 - 只有进入视口才加载
 * 2. 模糊占位符 - 加载前显示模糊预览
 * 3. 渐进加载 - 平滑过渡效果
 * 4. 错误处理 - 加载失败时显示占位符
 */

import { useState, useRef, useEffect, CSSProperties } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  blurDataURL?: string;
  placeholder?: 'blur' | 'empty';
  quality?: number;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * 优化的懒加载图片组件
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  style,
  priority = false,
  blurDataURL,
  placeholder = 'empty',
  quality = 75,
  sizes,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLDivElement>(null);

  // 视口检测
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
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // 构建优化后的 URL (如果使用 Next.js Image Optimization API)
  const optimizedSrc = src.startsWith('http') || src.startsWith('/')
    ? src
    : `/_next/image?url=${encodeURIComponent(src)}&w=${width || 640}&q=${quality}`;

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
        ...style,
      }}
    >
      {/* 占位符 */}
      {(!isLoaded || hasError) && (
        <div
          className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800 animate-pulse"
          aria-hidden="true"
        >
          {placeholder === 'blur' && blurDataURL && !hasError && (
            <img
              src={blurDataURL}
              alt=""
              className="w-full h-full object-cover blur-sm scale-110"
              aria-hidden="true"
            />
          )}
          {hasError && (
            <div className="w-full h-full flex items-center justify-center text-zinc-400">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* 实际图片 */}
      {isInView && !hasError && (
        <img
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}

/**
 * 响应式图片组件
 */
interface ResponsiveImageProps extends Omit<OptimizedImageProps, 'width' | 'height'> {
  aspectRatio?: '16/9' | '4/3' | '1/1' | '3/4' | '2/3';
  fill?: boolean;
}

export function ResponsiveImage({
  aspectRatio = '16/9',
  fill = false,
  className = '',
  ...props
}: ResponsiveImageProps) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        aspectRatio,
        ...(fill && { position: 'absolute', inset: 0 }),
      }}
    >
      <OptimizedImage
        {...props}
        className="w-full h-full"
        style={{ objectFit: 'cover' }}
      />
    </div>
  );
}

export default OptimizedImage;