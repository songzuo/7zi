/**
 * 图片优化示例页面
 *
 * 展示各种优化图片的使用方式
 */

'use client';

import { OptimizedImage, BackgroundImage, ImageGallery, IMAGE_PRESETS, type ImagePreset } from '@/components/OptimizedImage'
import { usePreloadImage, useLazyImage } from '@/hooks/useImageOptimization'
import { useState } from 'react'

export default function ImageOptimizationExamplePage() {
  // 预加载关键图片
  const { isLoaded: heroLoaded } = usePreloadImage('/images/hero.jpg', { priority: true })
  const { elementRef: lazyRef, isIntersecting: lazyVisible } = useLazyImage()
  
  const [selectedPreset, setSelectedPreset] = useState<ImagePreset>('card')
  
  // 示例图片列表
  const galleryImages = [
    { id: 1, src: '/images/gallery-1.jpg', alt: 'Gallery Image 1' },
    { id: 2, src: '/images/gallery-2.jpg', alt: 'Gallery Image 2' },
    { id: 3, src: '/images/gallery-3.jpg', alt: 'Gallery Image 3' },
    { id: 4, src: '/images/gallery-4.jpg', alt: 'Gallery Image 4' },
    { id: 5, src: '/images/gallery-5.jpg', alt: 'Gallery Image 5' },
    { id: 6, src: '/images/gallery-6.jpg', alt: 'Gallery Image 6' },
  ]
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero 区域 - LCP 优化 */}
      <BackgroundImage
        src="/images/hero.jpg"
        overlayOpacity={0.4}
        className="h-screen flex items-center justify-center"
      >
        <div className="text-center text-white">
          <h1 className="text-6xl font-bold mb-4">图片优化示例</h1>
          <p className="text-xl">Next.js Image 组件最佳实践</p>
        </div>
      </BackgroundImage>
      
      <div className="container mx-auto px-4 py-16">
        {/* 1. LCP 关键图片 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">1. LCP 关键图片（Hero）</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            使用 <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">priority</code> 属性立即加载
          </p>
          <OptimizedImage
            src="/images/hero.jpg"
            alt="Hero Image"
            preset="hero"
            className="rounded-lg shadow-xl w-full"
          />
        </section>
        
        {/* 2. 头像 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">2. 头像</h2>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <OptimizedImage
                key={i}
                src={`/images/avatar-${i}.jpg`}
                alt={`User ${i}`}
                preset="avatar"
                className="rounded-full border-4 border-white shadow-lg"
                placeholder="blur"
              />
            ))}
          </div>
        </section>
        
        {/* 3. 卡片图片 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">3. 卡片图片</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <OptimizedImage
                  src={`/images/card-${i}.jpg`}
                  alt={`Card ${i}`}
                  preset="card"
                />
                <div className="p-4">
                  <h3 className="text-xl font-semibold">卡片标题 {i}</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    卡片描述内容
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        
        {/* 4. 懒加载图片 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">4. 懒加载图片</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            滚动到这里才加载
          </p>
          <div ref={lazyRef as React.RefObject<HTMLDivElement>} className="min-h-[400px]">
            {lazyVisible && (
              <OptimizedImage
                src="/images/lazy.jpg"
                alt="Lazy loaded image"
                preset="content"
                className="rounded-lg shadow-lg w-full"
                loading="lazy"
              />
            )}
          </div>
        </section>
        
        {/* 5. 图片画廊 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">5. 图片画廊</h2>
          <ImageGallery
            images={galleryImages}
            columns={3}
            className="mb-6"
          />
          <ImageGallery
            images={galleryImages}
            columns={2}
          />
        </section>
        
        {/* 6. 不同预设 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">6. 预设选择器</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">选择预设：</label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="px-4 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="avatar">Avatar</option>
              <option value="thumbnail">Thumbnail</option>
              <option value="card">Card</option>
              <option value="content">Content</option>
              <option value="hero">Hero</option>
            </select>
          </div>
          <OptimizedImage
            src="/images/preset-demo.jpg"
            alt={`Preset: ${selectedPreset}`}
            preset={selectedPreset}
            className="rounded-lg shadow-lg"
          />
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
            <pre className="text-sm overflow-x-auto">
              {JSON.stringify(IMAGE_PRESETS[selectedPreset as keyof typeof IMAGE_PRESETS], null, 2)}
            </pre>
          </div>
        </section>
        
        {/* 7. 错误处理 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">7. 错误处理</h2>
          <OptimizedImage
            src="/images/non-existent.jpg"
            alt="This will fail"
            preset="card"
            className="rounded-lg"
          />
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            如果图片加载失败，会显示友好的占位符
          </p>
        </section>
        
        {/* 8. 背景图片 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">8. 背景图片</h2>
          <BackgroundImage
            src="/images/background.jpg"
            overlayOpacity={0.3}
            className="h-96 rounded-lg overflow-hidden relative"
          >
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center">
                <h3 className="text-4xl font-bold">背景图片示例</h3>
                <p className="text-xl mt-4">带有遮罩层的背景图片</p>
              </div>
            </div>
          </BackgroundImage>
        </section>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>Next.js 图片优化示例</p>
          <p className="text-sm text-gray-400 mt-2">
            支持 WebP/AVIF · 懒加载 · 响应式 · LCP 优化
          </p>
        </div>
      </footer>
    </div>
  )
}
