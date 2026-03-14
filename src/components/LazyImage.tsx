'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';

interface LazyImageOptimizedProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholderColor?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
}

/**
 * 优化的懒加载图片组件
 * 
 * 改进点:
 * 1. 更精细的 sizes 属性
 * 2. 设备像素比支持
 * 3. 渐进式加载
 * 4. 更好的占位符
 * 5. 错误处理增强
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholderColor,
  priority = false,
  fill = false,
  sizes,
  quality = 75,
  objectFit = 'cover',
}: LazyImageOptimizedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLDivElement>(null);

  // 默认占位符颜色（CSS 变量）
  const defaultPlaceholder = 'var(--color-placeholder, #e5e5e5)';
  const bgColor = placeholderColor || defaultPlaceholder;

  // Generate blurDataURL using useMemo
  const blurDataURL = useMemo(() => {
    if (typeof window === 'undefined' || !priority) return null;
    // 生成一个简单的 base64 色块作为 blur placeholder
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = bgColor.includes('var') ? '#e5e5e5' : bgColor;
      ctx.fillRect(0, 0, 10, 10);
      return canvas.toDataURL('image/jpeg', 0.1);
    }
    return null;
  }, [priority, bgColor]);

  // Intersection Observer 懒加载
  useEffect(() => {
    if (priority) {
      // For priority images, they are already in view
      return;
    }

    const currentRef = imgRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Use requestAnimationFrame to defer setState
          requestAnimationFrame(() => {
            setIsInView(true);
          });
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // 提前 200px 开始加载
        threshold: 0.01,
      }
    );

    observer.observe(currentRef);

    return () => observer.disconnect();
  }, [priority]);

  // 响应式 sizes 属性
  const responsiveSizes = sizes || `
    (max-width: 480px) 100vw,
    (max-width: 768px) 50vw,
    (max-width: 1024px) 33vw,
    (max-width: 1280px) 25vw,
    20vw
  `;

  // 图片加载成功
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  // 图片加载失败
  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: fill ? '100%' : (width || '100%'),
        height: fill ? '100%' : (height || 'auto'),
        backgroundColor: bgColor,
      }}
    >
      {/* 加载中占位符 */}
      {!isLoaded && !hasError && (
        <div 
          className="absolute inset-0 animate-pulse"
          style={{ backgroundColor: bgColor }}
          aria-hidden="true"
        />
      )}

      {/* 图片 */}
      {isInView && !hasError && (
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : (width || 800)}
          height={fill ? undefined : (height || 600)}
          fill={fill}
          sizes={responsiveSizes}
          quality={quality}
          placeholder={blurDataURL ? 'blur' : 'empty'}
          blurDataURL={blurDataURL || undefined}
          className={`
            transition-all duration-500 ease-out
            ${objectFit === 'cover' ? 'object-cover' : ''}
            ${objectFit === 'contain' ? 'object-contain' : ''}
            ${objectFit === 'fill' ? 'object-fill' : ''}
            ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}
          `}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}

      {/* 错误状态 */}
      {hasError && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 p-4"
          role="img"
          aria-label={`图片加载失败: ${alt}`}
        >
          <span className="text-3xl mb-2" aria-hidden="true">🖼️</span>
          <span className="text-sm text-center">图片加载失败</span>
        </div>
      )}
    </div>
  );
}

/**
 * 优化的图片画廊组件
 */
interface GalleryImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

interface ImageGalleryOptimizedProps {
  images: GalleryImage[];
  className?: string;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

export function ImageGalleryOptimized({ 
  images, 
  className = '',
  columns = { mobile: 2, tablet: 3, desktop: 4 },
}: ImageGalleryOptimizedProps) {
  const { mobile = 2, tablet = 3, desktop = 4 } = columns;

  return (
    <div 
      className={`grid gap-3 sm:gap-4 ${className}`}
      style={{
        gridTemplateColumns: `repeat(${mobile}, 1fr)`,
      }}
    >
      {images.map((image, index) => (
        <div
          key={index}
          className="relative aspect-square sm:aspect-[4/3] rounded-xl overflow-hidden group"
        >
          <LazyImage
            src={image.src}
            alt={image.alt}
            fill
            sizes={`
              (max-width: 639px) ${100 / mobile}vw,
              (max-width: 1023px) ${100 / tablet}vw,
              ${100 / desktop}vw
            `}
            priority={index < 4}
            className="group-hover:scale-105 transition-transform duration-300"
          />
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
        </div>
      ))}
    </div>
  );
}

/**
 * 骨架加载组件
 */
export function SkeletonOptimized({
  className = '',
  width,
  height,
  variant = 'rect',
}: {
  className?: string;
  width?: number | string;
  height?: number | string;
  variant?: 'rect' | 'circle' | 'text';
}) {
  const variantClasses = {
    rect: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded h-4',
  };

  return (
    <div
      className={`animate-pulse bg-zinc-200 dark:bg-zinc-700 ${variantClasses[variant]} ${className}`}
      style={{
        width: width || '100%',
        height: height || (variant === 'text' ? '1rem' : '100%'),
      }}
      aria-hidden="true"
    />
  );
}

/**
 * 卡片骨架组件
 */
export function CardSkeletonOptimized() {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-lg">
      <SkeletonOptimized width={48} height={48} variant="rect" className="mb-4" />
      <SkeletonOptimized width="70%" height={24} variant="rect" className="mb-2" />
      <SkeletonOptimized width="90%" height={16} variant="text" />
      <div className="flex gap-2 mt-4">
        <SkeletonOptimized width={60} height={24} variant="rect" />
        <SkeletonOptimized width={60} height={24} variant="rect" />
      </div>
    </div>
  );
}

export default LazyImage;