'use client'

/**
 * 移动端优化示例页面
 * v1.13.0: 展示移动端深度优化功能
 */

import { useState } from 'react'
import { MobileBottomNav, MobileHeader } from '@/components/mobile/MobileBottomNav'
import { Touchable, Swipeable, PullToRefresh, MobileTouchStyles } from '@/components/mobile/MobileTouch'
import { Card, CardHeader, CardBody, CardTitle, CardText } from '@/components/ui/Card'
import { RoomCard } from '@/components/rooms/RoomCard'

export default function MobileOptimizationPage() {
  const [refreshing, setRefreshing] = useState(false)
  const [swipeCount, setSwipeCount] = useState(0)

  const handleRefresh = async () => {
    setRefreshing(true)
    // 模拟刷新
    await new Promise(resolve => setTimeout(resolve, 2000))
    setRefreshing(false)
  }

  const handleSwipeLeft = () => {
    setSwipeCount(prev => prev + 1)
  }

  const navItems = [
    { id: 'home', label: '首页', icon: '🏠', href: '/' },
    { id: 'rooms', label: '房间', icon: '💬', href: '/rooms', badge: 3 },
    { id: 'discover', label: '发现', icon: '🔍', href: '/discover' },
    { id: 'profile', label: '我的', icon: '👤', href: '/profile' },
  ]

  const sampleRooms = [
    {
      id: '1',
      name: '技术交流群',
      description: '讨论前端技术、框架和最佳实践',
      memberCount: 128,
      onlineCount: 45,
      lastActivityAt: Date.now() - 300000,
      type: 'public',
    },
    {
      id: '2',
      name: '产品讨论',
      description: '产品需求、功能设计和用户体验',
      memberCount: 86,
      onlineCount: 23,
      lastActivityAt: Date.now() - 600000,
      type: 'public',
    },
  ]

  return (
    <>
      {/* 加载移动端触摸样式 */}
      <MobileTouchStyles />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        {/* 移动端头部 */}
        <MobileHeader
          title="移动端优化"
          showMenuButton
          onMenuClick={() => console.log('Menu clicked')}
        />

        {/* 下拉刷新区域 */}
        <PullToRefresh onRefresh={handleRefresh} refreshing={refreshing}>
          <div className="p-4 space-y-4">
            {/* 触摸优化示例 */}
            <Card>
              <CardHeader>
                <CardTitle>触摸优化</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <Touchable
                    onPress={() => console.log('Pressed!')}
                    feedbackType="scale"
                    className="w-full rounded-lg bg-blue-500 p-4 text-center text-white"
                  >
                    点击我（缩放反馈）
                  </Touchable>

                  <Touchable
                    onPress={() => console.log('Pressed!')}
                    feedbackType="opacity"
                    className="w-full rounded-lg bg-green-500 p-4 text-center text-white"
                  >
                    点击我（透明度反馈）
                  </Touchable>

                  <Touchable
                    onLongPress={() => console.log('Long pressed!')}
                    longPressDelay={500}
                    className="w-full rounded-lg bg-purple-500 p-4 text-center text-white"
                  >
                    长按我（500ms）
                  </Touchable>
                </div>
              </CardBody>
            </Card>

            {/* 滑动手势示例 */}
            <Swipeable onSwipeLeft={handleSwipeLeft}>
              <Card>
                <CardHeader>
                  <CardTitle>滑动手势</CardTitle>
                </CardHeader>
                <CardBody>
                  <CardText>
                    向左滑动此卡片来触发事件。已滑动 {swipeCount} 次。
                  </CardText>
                </CardBody>
              </Card>
            </Swipeable>

            {/* 响应式卡片示例 */}
            <Card fullWidthMobile mobilePadding="lg">
              <CardHeader>
                <CardTitle>响应式卡片</CardTitle>
              </CardHeader>
              <CardBody>
                <CardText>
                  此卡片在移动端会全宽显示，并使用更大的内边距。
                  在桌面端则保持默认宽度。
                </CardText>
              </CardBody>
            </Card>

            {/* 房间卡片示例 */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                房间列表（移动端优化）
              </h2>
              {sampleRooms.map(room => (
                <RoomCard
                  key={room.id}
                  room={room as any}
                  onClick={() => console.log('Room clicked:', room.id)}
                  showDetails={false}
                />
              ))}
            </div>

            {/* Safe Area 示例 */}
            <Card>
              <CardHeader>
                <CardTitle>Safe Area 适配</CardTitle>
              </CardHeader>
              <CardBody>
                <CardText>
                  此页面已适配 iOS 刘海屏和底部安全区域。
                  在 iPhone X 及以上设备上，内容不会被刘海或底部指示条遮挡。
                </CardText>
              </CardBody>
            </Card>

            {/* 性能优化说明 */}
            <Card>
              <CardHeader>
                <CardTitle>性能优化</CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>✅ 移动端禁用 hover 效果</li>
                  <li>✅ 减少阴影渲染</li>
                  <li>✅ 优化字体渲染</li>
                  <li>✅ 图片懒加载</li>
                  <li>✅ 触摸反馈优化</li>
                  <li>✅ 平滑滚动</li>
                  <li>✅ 防止过度滚动</li>
                </ul>
              </CardBody>
            </Card>
          </div>
        </PullToRefresh>

        {/* 移动端底部导航 */}
        <MobileBottomNav items={navItems} />
      </div>
    </>
  )
}