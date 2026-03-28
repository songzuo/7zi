/**
 * 移动端优化演示页面
 * 
 * 功能展示：
 * - LazyImage 图片懒加载
 * - 响应式图片 srcset
 * - 触摸手势支持
 * - 响应式布局
 */

'use client';

import { useState } from 'react';
import { LazyImage } from '@/components/ui/LazyImage';
import { useIsMobile, useDeviceType, useSwipe } from '@/hooks/useMediaQuery';
import { useTouchGestures, usePinchToZoom } from '@/hooks/useTouchGestures';
import { Card, CardHeader, CardBody, CardTitle, CardText } from '@/components/ui/Card';

export default function MobileOptimizationDemo() {
  const isMobile = useIsMobile();
  const device = useDeviceType();
  const [imageCount, setImageCount] = useState(12);
  const [zoomLevel, setZoomLevel] = useState(1);

  // 滑动示例
  const swipeRef = useSwipe({
    onLeft: () => alert('向左滑动'),
    onRight: () => alert('向右滑动'),
  });

  // 捏合缩放示例
  const { zoomState, zoomRef, resetZoom } = usePinchToZoom({
    minZoom: 1,
    maxZoom: 3,
    onZoom: (scale) => setZoomLevel(scale),
  });

  // 触摸手势示例
  const { gestureState, gestureRef } = useTouchGestures(
    { maxZoom: 3 },
    {
      onZoom: (scale) => setZoomLevel(scale),
      onSwipe: (direction) => {
        console.log('Swipe direction:', direction);
      },
    }
  );

  // 生成演示图片
  const demoImages = Array.from({ length: imageCount }, (_, i) => ({
    id: i + 1,
    src: `/images/demo/${(i % 6) + 1}.jpg`, // 使用占位符图片
    alt: `Demo image ${i + 1}`,
    width: 400 + (i % 4) * 200,
    height: 300 + (i % 4) * 150,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero 区域 */}
      <section className="relative h-[50vh] sm:h-[60vh] md:h-[70vh]">
        <LazyImage
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85"
          alt="Hero image"
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          fadeIn
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="text-center text-white">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              移动端优化演示
            </h1>
            <p className="text-sm sm:text-base md:text-lg opacity-90">
              图片懒加载 · 响应式适配 · 触摸手势
            </p>
          </div>
        </div>
      </section>

      {/* 设备信息 */}
      <section className="container mx-auto px-4 sm:px-6 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">设备信息</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">类型:</span>{' '}
                <span className="text-blue-600">{device.type}</span>
              </div>
              <div>
                <span className="font-medium">方向:</span>{' '}
                <span className="text-blue-600">{device.orientation}</span>
              </div>
              <div>
                <span className="font-medium">触摸:</span>{' '}
                <span className="text-blue-600">{device.isTouch ? '是' : '否'}</span>
              </div>
              <div>
                <span className="font-medium">减少动画:</span>{' '}
                <span className="text-blue-600">{device.prefersReducedMotion ? '是' : '否'}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* 懒加载演示 */}
      <section className="container mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          懒加载演示
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
          向下滚动查看图片懒加载效果。图片会在进入视口时加载。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {demoImages.map((image, index) => (
            <LazyImage
              key={image.id}
              src={`https://picsum.photos/400/300?random=${index}`}
              alt={image.alt}
              width={image.width}
              height={image.height}
              placeholder="skeleton"
              fadeIn
              fadeInDuration={500}
              className="rounded-lg shadow-md"
            />
          ))}
        </div>
      </section>

      {/* 响应式图片演示 */}
      <section className="container mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          响应式图片演示
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
          根据屏幕宽度加载不同尺寸的图片。
        </p>
        <div className="mb-4">
          <LazyImage
            src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=85"
            alt="Responsive image"
            srcSet={[
              { width: 400, height: 300, breakpoint: '640w' },
              { width: 800, height: 600, breakpoint: '1024w' },
              { width: 1200, height: 900, breakpoint: '1920w' },
            ]}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            placeholder="blur"
            className="rounded-lg shadow-lg w-full"
          />
        </div>
        <p className="text-xs text-gray-500">
          当前设备宽度: {isMobile ? '移动端' : '桌面端'} - 自动加载合适尺寸
        </p>
      </section>

      {/* 触摸手势演示 */}
      <section className="container mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          触摸手势演示
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
          {device.isTouch ? '您正在使用触摸设备，试试下面的手势！' : '请在移动设备上体验触摸手势'}
        </p>

        <div className="space-y-6">
          {/* 滑动手势 */}
          <Card>
            <CardHeader>
              <CardTitle>滑动手势</CardTitle>
              <CardText>向左或向右滑动卡片</CardText>
            </CardHeader>
            <CardBody>
              <div
                ref={swipeRef}
                className="p-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center cursor-pointer"
              >
                <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
                  👆 向左或向右滑动
                </p>
              </div>
            </CardBody>
          </Card>

          {/* 捏合缩放 */}
          <Card>
            <CardHeader>
              <CardTitle>捏合缩放</CardTitle>
              <CardText>双指捏合缩放图片</CardText>
            </CardHeader>
            <CardBody>
              <div className="relative w-full h-64 overflow-hidden rounded-lg">
                <div
                  ref={zoomRef}
                  className="w-full h-full flex items-center justify-center"
                >
                  <LazyImage
                    src="https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&q=85"
                    alt="Pinch to zoom"
                    width={800}
                    height={600}
                    placeholder="blur"
                    className="object-contain"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  缩放比例: {zoomState.scale.toFixed(1)}x
                </span>
                <button
                  onClick={resetZoom}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  重置缩放
                </button>
              </div>
            </CardBody>
          </Card>

          {/* 综合手势 */}
          <Card>
            <CardHeader>
              <CardTitle>综合手势</CardTitle>
              <CardText>支持缩放、拖拽、滑动</CardText>
            </CardHeader>
            <CardBody>
              <div
                ref={gestureRef}
                className="relative w-full h-64 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
                style={{
                  cursor: gestureState.scale > 1 ? 'grab' : 'default',
                }}
              >
                <div
                  className="w-full h-full flex items-center justify-center transition-transform"
                  style={{
                    transform: `translate(${gestureState.translateX}px, ${gestureState.translateY}px) scale(${gestureState.scale})`,
                  }}
                >
                  <LazyImage
                    src="https://images.unsplash.com/photo-1682686581498-5e85c7228f25?w=800&q=85"
                    alt="Gestures"
                    width={800}
                    height={600}
                    placeholder="blur"
                    className="object-contain"
                  />
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>🔍 缩放: {gestureState.scale.toFixed(1)}x</p>
                <p>↔️ 平移: ({gestureState.translateX.toFixed(0)}, {gestureState.translateY.toFixed(0)})</p>
                <p className="text-xs opacity-75">
                  提示: 双指捏合缩放，单指拖拽平移
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* 性能优化说明 */}
      <section className="container mx-auto px-4 sm:px-6 py-8">
        <Card className="bg-green-50 dark:bg-green-900/20">
          <CardHeader>
            <CardTitle>✨ 性能优化特性</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm sm:text-base text-gray-700 dark:text-gray-300">
              <li>✅ <strong>懒加载</strong> - 只加载视口内的图片</li>
              <li>✅ <strong>响应式图片</strong> - 根据设备加载合适尺寸</li>
              <li>✅ <strong>占位符</strong> - 加载时显示骨架屏或模糊图</li>
              <li>✅ <strong>淡入动画</strong> - 图片加载完成平滑过渡</li>
              <li>✅ <strong>错误处理</strong> - 加载失败显示友好提示</li>
              <li>✅ <strong>触摸优化</strong> - 支持原生手势操作</li>
              <li>✅ <strong>性能监控</strong> - 自动收集加载指标</li>
            </ul>
          </CardBody>
        </Card>
      </section>

      {/* 加载更多按钮 */}
      <section className="container mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => setImageCount(prev => prev + 6)}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition min-h-[48px] font-medium"
        >
          加载更多图片
        </button>
      </section>

      {/* 页脚 */}
      <footer className="container mx-auto px-4 sm:px-6 py-8 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>移动端优化演示页面 - Next.js 16</p>
      </footer>
    </div>
  );
}
