/**
 * 图片预加载 Hook
 *
 * 用于提前加载关键图片，优化用户体验
 */

'use client';

import { useEffect, useRef, useState } from 'react'

interface PreloadImageOptions {
  priority?: boolean
  quality?: number
}

interface PreloadImageResult {
  isLoaded: boolean
  hasError: boolean
  progress: number
}

/**
 * 预加载单个图片
 */
export function usePreloadImage(
  src: string,
  options: PreloadImageOptions = {}
): PreloadImageResult {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [progress, setProgress] = useState(0)
  
  const isLoadingRef = useRef(false)
  
  useEffect(() => {
    // 已经加载中
    if (isLoadingRef.current) return
    
    // 空源
    if (!src) return
    
    isLoadingRef.current = true
    setHasError(false)
    setProgress(0)
    
    const img = new Image()
    
    const handleProgress = (e: ProgressEvent) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    
    const handleLoad = () => {
      setIsLoaded(true)
      setProgress(100)
      isLoadingRef.current = false
    }
    
    const handleError = () => {
      setHasError(true)
      setIsLoaded(false)
      isLoadingRef.current = false
    }
    
    // 添加事件监听
    img.addEventListener('load', handleLoad)
    img.addEventListener('error', handleError)
    img.addEventListener('progress', handleProgress)
    
    // 设置源
    img.src = src
    
    return () => {
      img.removeEventListener('load', handleLoad)
      img.removeEventListener('error', handleError)
      img.removeEventListener('progress', handleProgress)
    }
  }, [src])
  
  return { isLoaded, hasError, progress }
}

/**
 * 预加载多个图片
 */
export function usePreloadImages(
  sources: string[],
  options: PreloadImageOptions = {}
): {
  loadedCount: number
  total: number
  isLoading: boolean
  allLoaded: boolean
  errors: string[]
} {
  const [loadedCount, setLoadedCount] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  
  const { isLoaded: firstLoaded } = usePreloadImage(sources[0] || '', options)
  
  useEffect(() => {
    if (!sources.length) return
    
    let loaded = 0
    const errorSources: string[] = []
    
    sources.forEach((src) => {
      const img = new Image()
      
      img.onload = () => {
        loaded += 1
        setLoadedCount(loaded)
      }
      
      img.onerror = () => {
        errorSources.push(src)
        loaded += 1
        setLoadedCount(loaded)
        setErrors([...errorSources])
      }
      
      img.src = src
    })
  }, [sources])
  
  return {
    loadedCount,
    total: sources.length,
    isLoading: loadedCount < sources.length,
    allLoaded: loadedCount === sources.length,
    errors,
  }
}

/**
 * 图片懒加载 Hook（ Intersection Observer ）
 */
export function useLazyImage(threshold = 0.1) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const elementRef = useRef<HTMLImageElement>(null)
  
  useEffect(() => {
    const element = elementRef.current
    if (!element) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          observer.unobserve(element)
        }
      },
      { threshold }
    )
    
    observer.observe(element)
    
    return () => {
      observer.disconnect()
    }
  }, [threshold])
  
  return { elementRef, isIntersecting }
}

/**
 * 响应式图片尺寸计算 Hook
 */
export function useResponsiveImageSize(
  baseWidth: number,
  breakpoints: { [key: string]: number } = {
    '640px': baseWidth,
    '768px': baseWidth * 1.2,
    '1024px': baseWidth * 1.5,
    '1280px': baseWidth * 2,
  }
) {
  const [currentSize, setCurrentSize] = useState(baseWidth)
  
  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth
      
      // 找到最接近的断点
      let size = baseWidth
      const sortedBreakpoints = Object.entries(breakpoints)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
      
      for (const [breakpoint, value] of sortedBreakpoints) {
        if (width >= parseInt(breakpoint)) {
          size = value
        }
      }
      
      setCurrentSize(size)
    }
    
    updateSize()
    window.addEventListener('resize', updateSize)
    
    return () => {
      window.removeEventListener('resize', updateSize)
    }
  }, [baseWidth, breakpoints])
  
  return currentSize
}

/**
 * 图片压缩工具函数
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
  } = {}
): Promise<Blob> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
  } = options
  
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    
    const handleReaderError = (error: ProgressEvent<FileReader>) => {
      const err = new Error(`[ImageOptimization] Failed to read file: ${file.name}`)
      console.error(err, error)
      reject(err)
    }
    
    const handleImageError = () => {
      const err = new Error(`[ImageOptimization] Failed to load image: ${file.name}`)
      console.error(err)
      reject(err)
    }
    
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    
    reader.onerror = handleReaderError
    reader.readAsDataURL(file)
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height
      
      // 计算新尺寸
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }
      
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        const err = new Error('[ImageOptimization] Failed to get canvas context')
        console.error(err)
        reject(err)
        return
      }
      
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            const err = new Error(`[ImageOptimization] Failed to compress image: ${file.name}`)
            console.error(err)
            reject(err)
          }
        },
        'image/webp',
        quality
      )
    }
    
    img.onerror = handleImageError
  })
}

/**
 * 检测支持的图片格式
 */
export function getSupportedImageFormats(): {
  webp: boolean
  avif: boolean
} {
  const canvas = document.createElement('canvas')
  
  return {
    webp: canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0,
    avif: canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0,
  }
}
