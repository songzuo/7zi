/**
 * 优化的图片组件
 *
 * 功能特性：
 * - 自动 WebP/AVIF 格式转换
 * - 响应式图片策略
 * - 懒加载和占位符
 * - LCP 优化
 * - 错误处理和回退
 */

'use client';

import Image from 'next/image'
import { useState, useCallback } from 'react'

// Image preset type
export type ImagePreset = 'avatar' | 'thumbnail' | 'card' | 'hero' | 'content' | 'logo' | 'banner';

// 预设的图片尺寸配置
export const IMAGE_PRESETS: Record<ImagePreset, {
  sizes: string;
  width: number;
  height: number;
  priority: boolean;
}> = {
  // 头像
  avatar: {
    sizes: '(max-width: 640px) 32px, (max-width: 768px) 48px, 64px',
    width: 64,
    height: 64,
    priority: false,
  },
  
  // 缩略图
  thumbnail: {
    sizes: '(max-width: 640px) 150px, (max-width: 1024px) 200px, 300px',
    width: 300,
    height: 200,
    priority: false,
  },
  
  // 卡片图片
  card: {
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    width: 400,
    height: 300,
    priority: false,
  },
  
  // 英雄图
  hero: {
    sizes: '100vw',
    width: 1920,
    height: 1080,
    priority: true, // LCP 关键图片
  },
  
  // 内容图片
  content: {
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 800px',
    width: 800,
    height: 600,
    priority: false,
  },
  
  // Logo
  logo: {
    sizes: '(max-width: 640px) 120px, 180px',
    width: 180,
    height: 60,
    priority: true,
  },
}

// 占位符颜色（用于模糊效果）
export const PLACEHOLDER_COLORS = {
  light: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3C/svg%3E',
  dark: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%231f2937" width="400" height="300"/%3E%3C/svg%3E',
  blur: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Cfilter id="blur"%3E%3CfeGaussianBlur stdDeviation="20"/%3E%3C/filter%3E%3Crect fill="%23e5e7eb" width="400" height="300" filter="url(%23blur)"/%3E%3C/svg%3E',
}

/**
 * 优化的图片组件
 * 
 * @example
 * // 使用预设
 * <OptimizedImage
 *   src="/images/hero.jpg"
 *   alt="Hero image"
 *   preset="hero"
 * />
 * 
 * @example
 * // 自定义配置
 * <OptimizedImage
 *   src="/images/photo.jpg"
 *   alt="Photo"
 *   width={800}
 *   height={600}
 *   sizes="(max-width: 768px) 100vw, 50vw"
 * />
 */
interface OptimizedImageProps {
  src: string;
  alt: string;
  preset?: ImagePreset;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  placeholder?: 'empty' | 'blur' | 'base64';
  blurDataURL?: string;
  quality?: number;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export function OptimizedImage({
  src,
  alt,
  preset,
  width,
  height,
  sizes,
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  quality = 85,
  fill = false,
  className = '',
  style,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  
  // 获取预设配置
  const presetConfig = preset ? IMAGE_PRESETS[preset] : null
  
  // 合并配置
  const config = {
    width: width ?? presetConfig?.width ?? 800,
    height: height ?? presetConfig?.height ?? 600,
    sizes: sizes ?? presetConfig?.sizes ?? '(max-width: 768px) 100vw, 800px',
    priority: priority ?? presetConfig?.priority ?? false,
  }
  
  // 加载完成处理
  const handleLoad = useCallback((e) => {
    setIsLoading(false)
    onLoad?.(e)
  }, [onLoad])
  
  // 错误处理
  const handleError = useCallback((e) => {
    setIsLoading(false)
    setHasError(true)
    onError?.(e)
  }, [onError])
  
  // 错误状态显示
  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}
        style={{
          width: fill ? '100%' : config.width,
          height: fill ? '100%' : config.height,
          ...style,
        }}
      >
        <span className="text-gray-400 dark:text-gray-600">
          图片加载失败
        </span>
      </div>
    )
  }
  
  return (
    <div
      className={`relative overflow-hidden ${isLoading ? 'animate-pulse' : ''} ${className}`}
      style={{
        width: fill ? '100%' : config.width,
        height: fill ? '100%' : config.height,
        ...style,
      }}
    >
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : config.width}
        height={fill ? undefined : config.height}
        fill={fill}
        sizes={config.sizes}
        priority={config.priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL ?? (placeholder === 'blur' ? PLACEHOLDER_COLORS.blur : undefined)}
        quality={quality}
        loading={config.priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          objectFit: 'cover',
          transition: 'opacity 0.3s ease-in-out',
          opacity: isLoading ? 0 : 1,
        }}
        {...props}
      />
    </div>
  )
}

/**
 * 背景图片组件（用于 Hero 区域）
 */
export function BackgroundImage({
  src,
  children,
  className = '',
  overlay = true,
  overlayOpacity = 0.5,
  priority = true,
  ...props
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0">
        <OptimizedImage
          src={src}
          alt=""
          fill
          priority={priority}
          preset="hero"
          className="object-cover"
          {...props}
        />
        {overlay && (
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: overlayOpacity }}
          />
        )}
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

/**
 * 图片画廊组件
 */
export function ImageGallery({
  images,
  columns = 3,
  gap = 4,
  className = '',
}) {
  return (
    <div
      className={`grid gap-${gap} ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {images.map((image, index) => (
        <OptimizedImage
          key={image.id || index}
          src={image.src}
          alt={image.alt || `Gallery image ${index + 1}`}
          preset="card"
          className="rounded-lg"
        />
      ))}
    </div>
  )
}

export default OptimizedImage
