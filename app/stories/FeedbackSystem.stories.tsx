import type { Meta, StoryObj } from '@storybook/nextjs';
import React from 'react';
import {
  FeedbackSystem,
  FeedbackForm,
  FeedbackCard,
  FeedbackList,
  FeedbackStats,
  FeedbackItem,
} from '@/components/FeedbackSystem';

const meta = {
  title: 'Components/FeedbackSystem',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '完整的反馈系统，包含表单、卡片、列表和统计组件。',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;

// 模拟数据
const mockFeedbacks: FeedbackItem[] = [
  {
    id: 'fb-1',
    userId: 'user-1',
    userName: '张三',
    rating: 5,
    category: 'feature',
    title: '希望增加深色模式',
    content: '建议增加深色模式功能，这样在夜间使用时可以保护眼睛。很多现代应用都已经支持这个功能了。',
    status: 'reviewing',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    tags: ['UI', '体验优化'],
    responses: [
      {
        id: 'resp-1',
        content: '感谢您的建议，我们正在开发深色模式功能，预计下个版本上线。',
        createdAt: '2024-01-16T09:00:00Z',
        isAdmin: true,
      },
    ],
  },
  {
    id: 'fb-2',
    userId: 'user-2',
    userName: '李四',
    rating: 3,
    category: 'bug',
    title: '登录页面加载缓慢',
    content: '最近登录页面加载速度变慢了，有时候需要等待 5 秒以上才能完全加载完成。',
    status: 'pending',
    createdAt: '2024-01-14T14:20:00Z',
    updatedAt: '2024-01-14T14:20:00Z',
    tags: ['性能', '登录'],
  },
  {
    id: 'fb-3',
    userId: 'user-3',
    userName: '王五',
    rating: 4,
    category: 'improvement',
    title: '搜索功能优化建议',
    content: '建议在搜索结果中高亮显示关键词，这样可以更快找到想要的内容。',
    status: 'resolved',
    createdAt: '2024-01-10T08:15:00Z',
    updatedAt: '2024-01-12T16:30:00Z',
    tags: ['搜索', 'UX'],
    responses: [
      {
        id: 'resp-2',
        content: '已在新版本中实现关键词高亮功能。',
        createdAt: '2024-01-12T16:30:00Z',
        isAdmin: true,
      },
    ],
  },
  {
    id: 'fb-4',
    userId: 'user-4',
    userName: '赵六',
    rating: 2,
    category: 'question',
    title: '如何导出数据？',
    content: '请问如何导出我的所有数据？我在设置里没有找到相关选项。',
    status: 'resolved',
    createdAt: '2024-01-08T11:00:00Z',
    updatedAt: '2024-01-08T15:00:00Z',
    responses: [
      {
        id: 'resp-3',
        content: '您可以在"设置 > 数据管理 > 导出数据"中找到导出选项。',
        createdAt: '2024-01-08T15:00:00Z',
        isAdmin: true,
      },
    ],
  },
];

// 完整反馈系统
export const Default: StoryObj<typeof meta> = {
  render: () => <FeedbackSystem initialFeedbacks={mockFeedbacks} isAdmin />,
};

// 管理员视图
export const AdminView: StoryObj<typeof meta> = {
  render: () => <FeedbackSystem initialFeedbacks={mockFeedbacks} isAdmin />,
};

// 用户视图
export const UserView: StoryObj<typeof meta> = {
  render: () => <FeedbackSystem initialFeedbacks={mockFeedbacks} isAdmin={false} />,
};

// 表单组件
export const FeedbackFormStory: StoryObj<typeof meta> = {
  name: 'FeedbackForm',
  render: () => (
    <FeedbackForm
      onSubmit={(data) => {
        // eslint-disable-next-line no-console
        console.log('提交的数据:', data);
        alert('反馈已提交！\n' + JSON.stringify(data, null, 2));
      }}
    />
  ),
};

// 表单带取消按钮
export const FeedbackFormWithCancel: StoryObj<typeof meta> = {
  name: 'FeedbackForm With Cancel',
  render: () => (
    <FeedbackForm
      onSubmit={(data) => {
        console.log('提交的数据:', data);
        alert('反馈已提交！');
      }}
      onCancel={() => alert('已取消')}
    />
  ),
};

// 卡片组件
export const FeedbackCardStory: StoryObj<typeof meta> = {
  name: 'FeedbackCard',
  render: () => (
    <div className="max-w-2xl">
      <FeedbackCard
        feedback={mockFeedbacks[0]}
        isAdmin
        onStatusChange={(id, status) => console.log('状态变更:', id, status)}
        onRespond={(id, response) => console.log('回复:', id, response)}
      />
    </div>
  ),
};

// 不同状态的卡片
export const FeedbackCardStatuses: StoryObj<typeof meta> = {
  name: 'FeedbackCard - All Statuses',
  render: () => (
    <div className="space-y-4 max-w-2xl">
      <h3 className="text-lg font-semibold">待处理</h3>
      <FeedbackCard feedback={mockFeedbacks[1]} />
      
      <h3 className="text-lg font-semibold mt-6">处理中</h3>
      <FeedbackCard feedback={mockFeedbacks[0]} />
      
      <h3 className="text-lg font-semibold mt-6">已解决</h3>
      <FeedbackCard feedback={mockFeedbacks[2]} />
    </div>
  ),
};

// 不同分类的卡片
export const FeedbackCardCategories: StoryObj<typeof meta> = {
  name: 'FeedbackCard - All Categories',
  render: () => (
    <div className="space-y-4 max-w-2xl">
      {mockFeedbacks.map((feedback) => (
        <FeedbackCard key={feedback.id} feedback={feedback} />
      ))}
    </div>
  ),
};

// 列表组件
export const FeedbackListStory: StoryObj<typeof meta> = {
  name: 'FeedbackList',
  render: () => (
    <FeedbackList
      feedbacks={mockFeedbacks}
      isAdmin
      onStatusChange={(id, status) => console.log('状态变更:', id, status)}
      onRespond={(id, response) => console.log('回复:', id, response)}
    />
  ),
};

// 空列表
export const EmptyFeedbackList: StoryObj<typeof meta> = {
  name: 'FeedbackList - Empty',
  render: () => <FeedbackList feedbacks={[]} />,
};

// 过滤列表 - Bug 类型
export const FeedbackListFiltered: StoryObj<typeof meta> = {
  name: 'FeedbackList - Filtered (Bug)',
  render: () => (
    <FeedbackList
      feedbacks={mockFeedbacks}
      filter={{ category: 'bug' }}
    />
  ),
};

// 过滤列表 - 高评分
export const FeedbackListHighRating: StoryObj<typeof meta> = {
  name: 'FeedbackList - Filtered (High Rating)',
  render: () => (
    <FeedbackList
      feedbacks={mockFeedbacks}
      filter={{ minRating: 4 }}
    />
  ),
};

// 统计组件
export const FeedbackStatsStory: StoryObj<typeof meta> = {
  name: 'FeedbackStats',
  render: () => <FeedbackStats feedbacks={mockFeedbacks} />,
};

// 空统计
export const EmptyFeedbackStats: StoryObj<typeof meta> = {
  name: 'FeedbackStats - Empty',
  render: () => <FeedbackStats feedbacks={[]} />,
};

// 大量数据统计
export const LargeFeedbackStats: StoryObj<typeof meta> = {
  name: 'FeedbackStats - Large Dataset',
  render: () => {
    const largeDataset: FeedbackItem[] = Array.from({ length: 100 }, (_, i) => ({
      id: `fb-${i}`,
      userId: `user-${i % 10}`,
      userName: `用户${i + 1}`,
      rating: Math.floor(Math.random() * 5) + 1,
      category: (['bug', 'feature', 'improvement', 'question', 'other'] as const)[i % 5],
      title: `反馈标题 ${i + 1}`,
      content: `这是第 ${i + 1} 条反馈的详细内容描述。`,
      status: (['pending', 'reviewing', 'resolved', 'rejected'] as const)[i % 4],
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - i * 86400000).toISOString(),
    }));
    return <FeedbackStats feedbacks={largeDataset} />;
  },
};

// 深色模式
export const DarkMode: StoryObj<typeof meta> = {
  name: 'Dark Mode',
  render: () => (
    <div className="bg-gray-900 p-6 rounded-lg">
      <FeedbackStats feedbacks={mockFeedbacks} />
      <div className="mt-6">
        <FeedbackCard feedback={mockFeedbacks[0]} />
      </div>
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
};