import type { Meta, StoryObj } from '@storybook/nextjs';
import React from 'react';
import { Rating } from '@/components/Rating';

const meta = {
  title: 'Components/Rating',
  component: Rating,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '评分组件，支持半星评分、只读模式、多种尺寸，完整无障碍支持。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'number', min: 0, max: 5, step: 0.5 },
      description: '当前评分值 (0-5)',
    },
    maxStars: {
      control: { type: 'number', min: 1, max: 10 },
      description: '最大星数',
      table: {
        defaultValue: { summary: '5' },
      },
    },
    readonly: {
      control: 'boolean',
      description: '是否只读',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: '星星大小',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    showValue: {
      control: 'boolean',
      description: '是否显示评分文字',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
    label: {
      control: 'text',
      description: '自定义标签',
    },
    disabled: {
      control: 'boolean',
      description: '禁用状态',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
  },
} satisfies Meta<typeof Rating>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基础评分
export const Default: Story = {
  args: {
    value: 3,
    size: 'md',
    showValue: true,
  },
};

// 只读模式
export const ReadOnly: Story = {
  args: {
    value: 4,
    readonly: true,
    showValue: true,
  },
};

// 不同尺寸
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 w-16">Small:</span>
        <Rating value={3} size="sm" />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 w-16">Medium:</span>
        <Rating value={3} size="md" />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 w-16">Large:</span>
        <Rating value={3} size="lg" />
      </div>
    </div>
  ),
};

// 可交互评分
export const Interactive: Story = {
  render: () => {
    const [rating, setRating] = React.useState(0);
    return (
      <div className="flex flex-col gap-4">
        <Rating value={rating} onChange={setRating} size="lg" />
        <p className="text-sm text-gray-500">
          当前评分: {rating} 星
        </p>
      </div>
    );
  },
};

// 半星评分
export const HalfStar: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 w-12">0.5:</span>
        <Rating value={0.5} readonly />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 w-12">1.5:</span>
        <Rating value={1.5} readonly />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 w-12">2.5:</span>
        <Rating value={2.5} readonly />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 w-12">3.5:</span>
        <Rating value={3.5} readonly />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 w-12">4.5:</span>
        <Rating value={4.5} readonly />
      </div>
    </div>
  ),
};

// 禁用状态
export const Disabled: Story = {
  args: {
    value: 3,
    disabled: true,
  },
};

// 带标签
export const WithLabel: Story = {
  args: {
    value: 4,
    label: '服务评分',
    readonly: true,
  },
};

// 所有评分值
export const AllRatings: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {[0, 1, 2, 3, 4, 5].map((value) => (
        <div key={value} className="flex items-center gap-4">
          <span className="text-sm text-gray-500 w-8">{value}星:</span>
          <Rating value={value} readonly showValue={false} />
        </div>
      ))}
    </div>
  ),
};

// 深色模式示例
export const DarkMode: Story = {
  render: () => (
    <div className="bg-gray-900 p-6 rounded-lg">
      <Rating value={4} readonly />
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
};