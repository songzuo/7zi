'use client';

/**
 * Optimized Image Component with WebP Support
 *
 * Automatically uses WebP format when available with PNG fallback
 */

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  webpSrc?: string;
  alt: string;
}

export function OptimizedImage({
  src,
  webpSrc,
  alt,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Auto-generate WebP source if not provided
  const webpSource = webpSrc || src.replace(/\.(png|jpg|jpeg)$/i, '.webp');

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 ${props.className}`}
        style={props.style}
      >
        <span className="text-zinc-400 text-sm">Image unavailable</span>
      </div>
    );
  }

  return (
    <picture>
      <source srcSet={webpSource} type="image/webp" />
      <Image
        src={src}
        alt={alt}
        onLoad={() => setIsLoading(false)}
        onError={() => setHasError(true)}
        {...props}
        className={`${props.className || ''} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      />
    </picture>
  );
}

/**
 * Preload critical images for better LCP
 */
export function preloadCriticalImages() {
  const criticalImages = ['/logo.png', '/icon-192.png'];

  criticalImages.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  });
}
