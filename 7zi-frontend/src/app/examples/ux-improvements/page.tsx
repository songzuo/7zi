'use client';
'use memo';

/**
 * 用户体验改进 v1.4.0 - 组件使用示例
 * 展示所有新增和改进组件的使用方法
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { SmartPrefetch, PrefetchLink, useSmartPrefetch } from '@/components/performance/SmartPrefetch';
import { Button, IconButton, ButtonGroup } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardFooter, CardImage, CardBadge, CardActions } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { Skeleton, SkeletonText, SkeletonCard, SkeletonList, LoadingWrapper } from '@/components/ui/Skeleton';
import { NavigationWithSkeleton } from '@/components/ui/NavigationSkeleton';
import { TaskCard, TaskList, TaskStatusToggle } from '@/components/ui/TaskCard';

// ============================================
// 页面预加载示例
// ============================================

function PageWithPrefetchExample() {
  const prefetchConfigs = [
    { url: '/dashboard', type: 'page' as const, priority: 8 },
    { url: '/api/user', type: 'api' as const, priority: 6 },
    { url: '/settings', type: 'page' as const, priority: 5 },
  ];

  return (
    <SmartPrefetch
      configs={prefetchConfigs}
      enableHoverPrefetch
      hoverThreshold={100}
      enableViewportPrefetch
      viewportDistance={200}
      maxConcurrent={3}
      onPrefetch={(url, type) => console.log(`预加载: ${url} (${type})`)}
    >
      <div>
        <PrefetchLink href="/dashboard" prefetchType="page">
          仪表盘
        </PrefetchLink>
        <PrefetchLink href="/settings" prefetchType="page">
          设置
        </PrefetchLink>
      </div>
    </SmartPrefetch>
  );
}

// ============================================
// 按钮示例
// ============================================

function ButtonExample() {
  return (
    <div className="space-y-6">
      {/* 不同变体 */}
      <div className="flex gap-3 flex-wrap">
        <Button variant="primary" ripple>主要按钮</Button>
        <Button variant="secondary">次要按钮</Button>
        <Button variant="outline">轮廓按钮</Button>
        <Button variant="ghost">幽灵按钮</Button>
        <Button variant="danger">危险按钮</Button>
        <Button variant="success">成功按钮</Button>
      </div>

      {/* 不同尺寸 */}
      <div className="flex gap-3 items-center">
        <Button size="xs">XS</Button>
        <Button size="sm">SM</Button>
        <Button size="md">MD</Button>
        <Button size="lg">LG</Button>
        <Button size="xl">XL</Button>
      </div>

      {/* 加载状态 */}
      <div className="flex gap-3">
        <Button loading>加载中...</Button>
        <Button loading variant="outline">提交中</Button>
      </div>

      {/* 按钮组 */}
      <ButtonGroup gap="sm">
        <Button variant="primary">保存</Button>
        <Button variant="outline">取消</Button>
        <Button variant="danger">删除</Button>
      </ButtonGroup>
    </div>
  );
}

// ============================================
// 卡片示例
// ============================================

function CardExample() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 基础卡片 */}
      <Card hoverable bordered>
        <CardHeader>
          <h3>基础卡片</h3>
        </CardHeader>
        <CardBody>
          <p>这是一个基础卡片，带有悬停效果和边框高亮。</p>
        </CardBody>
      </Card>

      {/* 带图片的卡片 */}
      <Card hoverable>
        <CardImage
          src="/example.jpg"
          alt="示例图片"
          height="md"
          zoomOnHover
        />
        <CardHeader>
          <div className="flex justify-between items-start">
            <h3>图片卡片</h3>
            <CardBadge color="green" variant="soft" size="sm">
              新
            </CardBadge>
          </div>
        </CardHeader>
        <CardBody padding="sm">
          <p className="text-gray-600">
            带有图片的卡片，图片支持悬停缩放效果。
          </p>
        </CardBody>
        <CardActions align="right">
          <Button variant="primary" size="sm">查看详情</Button>
        </CardActions>
      </Card>

      {/* 状态卡片 */}
      <Card hoverable>
        <CardHeader bordered>
          <div className="flex justify-between items-center">
            <h3>任务卡片</h3>
            <CardBadge color="yellow" variant="soft" size="md">
              进行中
            </CardBadge>
          </div>
        </CardHeader>
        <CardBody padding="sm">
          <p>完成用户体验改进 v1.4.0 的实现。</p>
          <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
            <span>👤 张三</span>
            <span>📅 2026-03-29</span>
          </div>
        </CardBody>
        <CardActions align="right">
          <Button variant="outline" size="sm">编辑</Button>
          <Button variant="primary" size="sm">标记完成</Button>
        </CardActions>
      </Card>
    </div>
  );
}

// ============================================
// 表单示例
// ============================================

function FormExample() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });

  const validateEmail = (value: string) => {
    if (!value) return '邮箱不能为空';
    if (!/\S+@\S+\.\S+/.test(value)) return '邮箱格式不正确';
    return '';
  };

  return (
    <div className="space-y-6 max-w-md">
      <Input
        id="email"
        type="email"
        label="邮箱地址"
        placeholder="example@mail.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          const error = validateEmail(e.target.value);
          setErrors(prev => ({ ...prev, email: error }));
        }}
        error={errors.email}
        success={!errors.email && email ? '邮箱格式正确' : undefined}
        validationState={errors.email ? 'invalid' : !errors.email && email ? 'valid' : 'none'}
        showValidationIcon
        helperText="请输入您的工作邮箱"
        prefix={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>}
      />

      <Input
        id="password"
        type="password"
        label="密码"
        placeholder="请输入密码"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        warning={password.length > 0 && password.length < 8 ? '密码长度至少8位' : undefined}
        validationState={errors.password ? 'invalid' : password.length >= 8 ? 'valid' : 'none'}
        showValidationIcon
        helperText="密码长度至少8位"
      />

      <Textarea
        id="bio"
        label="个人简介"
        placeholder="介绍一下你自己..."
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        showCount
        maxLength={500}
        helperText="最多500字"
      />

      <Button variant="primary" fullWidth size="lg">
        提交
      </Button>
    </div>
  );
}

// ============================================
// 骨架屏示例
// ============================================

function SkeletonExample() {
  const [loading, setLoading] = useState(true);

  // 模拟加载
  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* 基础骨架屏 */}
      <div>
        <h3 className="mb-4">基础骨架屏</h3>
        <Skeleton className="w-full h-32 rounded" />
      </div>

      {/* 卡片骨架列表 */}
      <div>
        <h3 className="mb-4">卡片列表骨架</h3>
        <LoadingWrapper
          loading={loading}
          skeleton={<SkeletonList count={3} />}
          delay={200}
        >
          <div className="grid gap-4">
            {[1, 2, 3].map((item) => (
              <Card key={item}>
                <CardHeader>
                  <h3>卡片 {item}</h3>
                </CardHeader>
                <CardBody>
                  <p>这是一个加载完成后的卡片内容。</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </LoadingWrapper>
      </div>

      {/* 文本骨架 */}
      <div>
        <h3 className="mb-4">文本骨架</h3>
        <SkeletonText lines={4} height={16} />
      </div>
    </div>
  );
}

// ============================================
// 任务卡片示例
// ============================================

function TaskCardExample() {
  const [status, setStatus] = useState<'todo' | 'in-progress' | 'review' | 'done'>('in-progress');

  const tasks = [
    {
      id: '1',
      title: '完成 React Compiler 集成',
      description: '检查并配置 React Compiler，实现自动性能优化。',
      status: 'done' as const,
      priority: 'high' as const,
      assignee: '张三',
      dueDate: '2026-03-29',
      createdAt: '2026-03-20',
    },
    {
      id: '2',
      title: '实现智能预加载功能',
      description: '基于用户行为预测的预加载系统，提升页面切换速度。',
      status: 'in-progress' as const,
      priority: 'high' as const,
      assignee: '李四',
      dueDate: '2026-03-30',
      createdAt: '2026-03-21',
    },
    {
      id: '3',
      title: '优化交互反馈',
      description: '改进按钮、卡片、表单等组件的交互体验。',
      status: 'todo' as const,
      priority: 'medium' as const,
      assignee: '王五',
      dueDate: '2026-03-31',
      createdAt: '2026-03-22',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 状态切换器 */}
      <div>
        <h3 className="mb-4">任务状态切换器</h3>
        <TaskStatusToggle
          currentStatus={status}
          onStatusChange={setStatus}
        />
        <p className="mt-2 text-gray-600">当前状态: {status}</p>
      </div>

      {/* 任务列表 */}
      <div>
        <h3 className="mb-4">任务列表</h3>
        <TaskList
          tasks={tasks}
          onEdit={(task) => console.log('编辑任务:', task)}
          onDelete={(id) => console.log('删除任务:', id)}
          onStatusChange={(id, newStatus) => console.log('状态变更:', id, newStatus)}
        />
      </div>
    </div>
  );
}

// ============================================
// 导航骨架屏示例
// ============================================

function NavigationExample() {
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // 实际项目中应该导入你的 Navigation 组件
  // import { Navigation } from '@/components/Navigation';
  const NavigationComponent = () => <div>实际导航组件</div>;

  return (
    <NavigationWithSkeleton
      loading={loading}
      delay={200}
    >
      <NavigationComponent />
    </NavigationWithSkeleton>
  );
}

// ============================================
// 智能预加载 Hook 示例
// ============================================

function PrefetchHookExample() {
  const { prefetchNow } = useSmartPrefetch([
    { url: '/api/data', type: 'api', priority: 8 },
    { url: '/settings', type: 'page', priority: 6 },
  ]);

  return (
    <div className="space-y-4">
      <h3>手动触发预加载</h3>
      <Button onClick={() => prefetchNow('/api/data', 'api')}>
        预加载数据
      </Button>
      <Button onClick={() => prefetchNow('/settings', 'page')}>
        预加载设置页
      </Button>
    </div>
  );
}

// ============================================
// 完整页面示例
// ============================================

export default function UXImprovementsExample() {
  const [activeTab, setActiveTab] = useState('buttons');

  const tabs = [
    { id: 'buttons', label: '按钮' },
    { id: 'cards', label: '卡片' },
    { id: 'forms', label: '表单' },
    { id: 'skeleton', label: '骨架屏' },
    { id: 'tasks', label: '任务卡片' },
    { id: 'prefetch', label: '预加载' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 导航骨架屏 */}
      <NavigationExample />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            用户体验改进 v1.4.0
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            展示所有新增和改进的组件
          </p>
        </div>

        {/* 标签页导航 */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium transition-all duration-200',
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          {activeTab === 'buttons' && <ButtonExample />}
          {activeTab === 'cards' && <CardExample />}
          {activeTab === 'forms' && <FormExample />}
          {activeTab === 'skeleton' && <SkeletonExample />}
          {activeTab === 'tasks' && <TaskCardExample />}
          {activeTab === 'prefetch' && (
            <div className="space-y-6">
              <PageWithPrefetchExample />
              <PrefetchHookExample />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
