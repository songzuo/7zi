'use client';

import { FeedbackSystem } from '@/components/FeedbackSystem';
import { FeedbackItem } from '@/components/FeedbackSystem';

// 模拟初始数据
const initialFeedbacks: FeedbackItem[] = [
  {
    id: 'fb-demo-1',
    userId: 'user-1',
    userName: '张三',
    rating: 4,
    category: 'feature',
    title: '希望增加深色模式',
    content: '建议增加深色模式功能，这样在夜间使用时可以减少眼睛疲劳。深色模式应该可以自动跟随系统设置，也支持手动切换。',
    status: 'reviewing',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    tags: ['UI', '用户体验'],
    responses: [
      {
        id: 'resp-1',
        content: '感谢您的建议！我们正在开发深色模式功能，预计下个版本上线。',
        createdAt: new Date(Date.now() - 43200000).toISOString(),
        isAdmin: true,
      },
    ],
  },
  {
    id: 'fb-demo-2',
    userId: 'user-2',
    userName: '李四',
    rating: 2,
    category: 'bug',
    title: '任务列表无法加载',
    content: '在某些情况下，任务列表会一直显示加载中，刷新页面后仍然无法正常显示。浏览器控制台显示网络请求超时错误。',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    tags: ['任务', '性能'],
  },
  {
    id: 'fb-demo-3',
    userId: 'user-3',
    userName: '王五',
    rating: 5,
    category: 'improvement',
    title: '搜索功能体验很好',
    content: '新版本的搜索功能响应速度很快，结果也很准确，大大提高了工作效率。希望能继续保持这种优化。',
    status: 'resolved',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    tags: ['搜索', '性能'],
  },
  {
    id: 'fb-demo-4',
    userId: 'user-4',
    userName: '赵六',
    rating: 3,
    category: 'question',
    title: '如何导出数据报表？',
    content: '我想导出项目的数据报表，但没有找到相关功能入口。请问是否支持导出功能？支持哪些格式？',
    status: 'resolved',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    tags: ['导出', '报表'],
    responses: [
      {
        id: 'resp-2',
        content: '您好！可以在设置页面的数据管理模块中找到导出功能，目前支持 CSV 和 Excel 格式。',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        isAdmin: true,
      },
    ],
  },
  {
    id: 'fb-demo-5',
    userId: 'user-5',
    userName: '孙七',
    rating: 4.5,
    category: 'feature',
    title: '建议增加团队协作功能',
    content: '希望可以增加团队协作相关的功能，比如实时协作编辑、评论、@提醒等，这样团队沟通会更高效。',
    status: 'reviewing',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
    tags: ['协作', '团队'],
  },
];

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            用户反馈中心
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            查看和管理所有用户反馈，持续改进产品体验
          </p>
        </div>

        {/* 反馈系统 */}
        <FeedbackSystem
          initialFeedbacks={initialFeedbacks}
          isAdmin={true}
        />
      </div>
    </div>
  );
}
