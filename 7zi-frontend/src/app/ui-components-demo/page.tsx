/**
 * UI 组件演示页面
 * 展示 Loading 和 EmptyState 组件的使用方法
 */

'use client';

import React, { useState } from 'react';
import { 
  Loading, 
  Skeleton, 
  SkeletonCard, 
  SkeletonList,
  EmptyList,
  EmptySearch,
  EmptyError,
  EmptyNetwork,
  EmptyPermission,
  EmptyMaintenance,
  Button,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
} from '@/components/ui';

export default function UIComponentsDemo() {
  const [searchKeyword] = useState('测试关键词');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdd = () => {
    alert('添加按钮被点击！');
  };

  const handleRetry = () => {
    alert('重试按钮被点击！');
  };

  const handleClearSearch = () => {
    alert('清除搜索按钮被点击！');
  };

  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          🎨 UI 组件演示
        </h1>

        {/* Loading 组件演示 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            加载状态组件
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Spinner */}
            <Card>
              <CardHeader>
                <CardTitle>Spinner 类型</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col items-center gap-4">
                  <Loading type="spinner" size="sm" />
                  <Loading type="spinner" size="md" text="加载中..." />
                  <Loading type="spinner" size="lg" />
                </div>
              </CardBody>
            </Card>

            {/* Dots */}
            <Card>
              <CardHeader>
                <CardTitle>Dots 类型</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col items-center gap-4">
                  <Loading type="dots" size="sm" />
                  <Loading type="dots" size="md" text="加载中..." />
                  <Loading type="dots" size="lg" />
                </div>
              </CardBody>
            </Card>

            {/* Pulse */}
            <Card>
              <CardHeader>
                <CardTitle>Pulse 类型</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col items-center gap-4">
                  <Loading type="pulse" size="sm" />
                  <Loading type="pulse" size="md" text="加载中..." />
                  <Loading type="pulse" size="lg" />
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Skeleton */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Skeleton 骨架屏</CardTitle>
              </CardHeader>
              <CardBody>
                <Loading type="skeleton" />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skeleton 组件</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <Skeleton shape="circle" width="48px" />
                  <Skeleton shape="text" width="60%" />
                  <Skeleton shape="text" width="100%" />
                  <Skeleton shape="rect" width="100%" height="200px" />
                </div>
              </CardBody>
            </Card>
          </div>

          {/* 预设骨架屏 */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                SkeletonCard - 卡片骨架屏
              </h3>
              <SkeletonCard />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                SkeletonList - 列表骨架屏
              </h3>
              <SkeletonList count={3} />
            </div>
          </div>

          {/* 全屏加载 */}
          <div className="mt-6">
            <Button onClick={handleLoadingDemo}>
              显示全屏加载（2秒）
            </Button>
            {isLoading && <Loading type="spinner" fullscreen text="加载中..." />}
          </div>
        </section>

        {/* EmptyState 组件演示 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            空状态组件
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* EmptyList */}
            <Card>
              <CardHeader>
                <CardTitle>EmptyList - 空列表</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <EmptyList onAdd={handleAdd} />
              </CardBody>
            </Card>

            {/* EmptySearch */}
            <Card>
              <CardHeader>
                <CardTitle>EmptySearch - 空搜索</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <EmptySearch keyword={searchKeyword} onClear={handleClearSearch} />
              </CardBody>
            </Card>

            {/* EmptyError */}
            <Card>
              <CardHeader>
                <CardTitle>EmptyError - 加载错误</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <EmptyError onRetry={handleRetry} />
              </CardBody>
            </Card>

            {/* EmptyNetwork */}
            <Card>
              <CardHeader>
                <CardTitle>EmptyNetwork - 网络错误</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <EmptyNetwork onRetry={handleRetry} />
              </CardBody>
            </Card>

            {/* EmptyPermission */}
            <Card>
              <CardHeader>
                <CardTitle>EmptyPermission - 权限不足</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <EmptyPermission onBack={() => alert('返回首页')} />
              </CardBody>
            </Card>

            {/* EmptyMaintenance */}
            <Card>
              <CardHeader>
                <CardTitle>EmptyMaintenance - 系统维护</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <EmptyMaintenance 
                  estimatedTime="2026-03-29 03:00" 
                  onContact={() => alert('联系支持')} 
                />
              </CardBody>
            </Card>
          </div>
        </section>

        {/* 使用示例代码 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            📖 使用示例
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Loading 组件使用</CardTitle>
            </CardHeader>
            <CardBody>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
{`import { Loading, Skeleton, SkeletonCard } from '@/components/ui';

// 基本用法
<Loading type="spinner" text="加载中..." />

// 全屏加载
<Loading type="spinner" fullscreen />

// 骨架屏
<Loading type="skeleton" />

// 单独使用 Skeleton 组件
<Skeleton shape="circle" width="48px" />
<Skeleton shape="text" width="60%" />

// 预设骨架屏
<SkeletonCard />
<SkeletonList count={3} />`}
              </pre>
            </CardBody>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>EmptyState 组件使用</CardTitle>
            </CardHeader>
            <CardBody>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
{`import { 
  EmptyState, 
  EmptyList, 
  EmptySearch, 
  EmptyError 
} from '@/components/ui';

// 自定义空状态
<EmptyState
  icon={<CustomIcon />}
  title="自定义标题"
  description="自定义描述"
  action={{ label: '操作', onClick: handleClick }}
/>

// 使用预设变体
<EmptyList onAdd={handleAdd} />
<EmptySearch keyword="测试" onClear={handleClear} />
<EmptyError onRetry={handleRetry} />
<EmptyNetwork onRetry={handleRetry} />
<EmptyPermission onBack={handleBack} />
<EmptyMaintenance estimatedTime="2026-03-29 03:00" />`}
              </pre>
            </CardBody>
          </Card>
        </section>

        {/* 功能特性 */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            ✨ 功能特性
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardBody>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  🎨 Loading 组件
                </h3>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>✅ 4 种加载类型（spinner, dots, skeleton, pulse）</li>
                  <li>✅ 3 种尺寸（sm, md, lg）</li>
                  <li>✅ 全屏加载模式</li>
                  <li>✅ 可自定义加载文本</li>
                  <li>✅ 完整的暗色模式支持</li>
                  <li>✅ 可访问性支持（ARIA 标签）</li>
                  <li>✅ 预设骨架屏组件</li>
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  📭 EmptyState 组件
                </h3>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>✅ 可自定义图标、标题、描述</li>
                  <li>✅ 支持操作按钮</li>
                  <li>✅ 6 种预设变体</li>
                  <li>✅ 空列表、空搜索、错误状态</li>
                  <li>✅ 网络错误、权限不足、系统维护</li>
                  <li>✅ 完整的暗色模式支持</li>
                  <li>✅ 可访问性支持（ARIA 标签）</li>
                </ul>
              </CardBody>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
