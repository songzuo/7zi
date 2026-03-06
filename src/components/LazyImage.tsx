'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholderColor?: string;
  priority?: boolean;
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholderColor = '#e5e5e5',
  priority = false,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: width || '100%',
        height: height || 'auto',
        backgroundColor: placeholderColor,
      }}
    >
      {isInView && !hasError ? (
        <>
          <Image
            src={src}
            alt={alt}
            width={width || 800}
            height={height || 600}
            className={`transition-opacity duration-500 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            loading={priority ? 'eager' : 'lazy'}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {!isLoaded && (
            <div className="absolute inset-0 animate-pulse" style={{ backgroundColor: placeholderColor }} />
          )}
        </>
      ) : (
        <div className="absolute inset-0 animate-pulse" style={{ backgroundColor: placeholderColor }} />
      )}
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
          <span className="text-zinc-400">图片加载失败</span>
        </div>
      )}
    </div>
  );
}

// Optimized Image Gallery Component
interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    width: number;
    height: number;
  }>;
  className?: string;
}

export function ImageGallery({ images, className = '' }: ImageGalleryProps) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${className}`}>
      {images.map((image, index) => (
        <LazyImage
          key={index}
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          className="rounded-xl hover:shadow-lg transition-shadow duration-300"
          priority={index < 3}
        />
      ))}
    </div>
  );
}

// Skeleton Loader Component
export function Skeleton({
  className = '',
  width,
  height,
}: {
  className?: string;
  width?: number | string;
  height?: number | string;
}) {
  return (
    <div
      className={`animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded ${className}`}
      style={{
        width: width || '100%',
        height: height || '100%',
      }}
    />
  );
}

// Card Skeleton for common patterns
export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-lg">
      <Skeleton width={48} height={48} className="rounded-xl mb-4" />
      <Skeleton width="70%" height={24} className="mb-2" />
      <Skeleton width="90%" height={16} />
    </div>
  );
}
