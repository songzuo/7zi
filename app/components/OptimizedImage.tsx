'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  showSkeleton?: boolean;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  [key: string]: any;
}

/**
 * 优化的 Image 组件
 * 
 * 增强功能：
 * - 加载状态骨架屏
 * - 错误时显示占位图
 * - 懒加载优化
 * - 渐进式加载效果
 */
export function OptimizedImage({
  src,
  alt,
  fallbackSrc = '/placeholder.svg',
  showSkeleton = true,
  className = '',
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
    setIsLoading(false);
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* 加载骨架屏 */}
      {showSkeleton && isLoading && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse z-10"
          aria-hidden="true"
        />
      )}
      
      {/* 图片 */}
      <Image
        src={error ? fallbackSrc : src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        {...props}
      />
      
      {/* 加载指示器 (可选) */}
      {showSkeleton && isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-20"
          role="status"
          aria-label="加载中"
        >
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

export default OptimizedImage;
