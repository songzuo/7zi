/**
 * Input.stories.ts - Input 组件的 Storybook 故事
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../components/ui/Input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: '输入框大小',
    },
    label: {
      control: 'text',
      description: '标签文本',
    },
    error: {
      control: 'text',
      description: '错误信息',
    },
    helperText: {
      control: 'text',
      description: '帮助文本',
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

// 基础示例
export const Default: Story = {
  args: {
    placeholder: '请输入内容...',
  },
};

// 带标签
export const WithLabel: Story = {
  args: {
    label: '用户名',
    placeholder: '请输入用户名',
  },
};

// 带帮助文本
export const WithHelperText: Story = {
  args: {
    label: '邮箱地址',
    type: 'email',
    placeholder: 'example@email.com',
    helperText: '我们不会分享您的邮箱地址',
  },
};

// 错误状态
export const WithError: Story = {
  args: {
    label: '密码',
    type: 'password',
    error: '密码长度至少为8位',
  },
};

// 禁用状态
export const Disabled: Story = {
  args: {
    label: '禁用输入框',
    placeholder: '此输入框已被禁用',
    disabled: true,
  },
};

// 密码输入框
export const PasswordInput: Story = {
  args: {
    label: '密码',
    type: 'password',
    placeholder: '请输入密码',
  },
};

// 带前缀图标
export const WithPrefix: Story = {
  args: {
    label: '搜索',
    type: 'search',
    placeholder: '搜索...',
    prefix: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
};

// 带后缀图标
export const WithSuffix: Story = {
  args: {
    label: '金额',
    type: 'number',
    placeholder: '0.00',
    suffix: 'CNY',
  },
};

// 大小变体
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input size="sm" label="Small" placeholder="Small input" />
      <Input size="md" label="Medium" placeholder="Medium input" />
      <Input size="lg" label="Large" placeholder="Large input" />
    </div>
  ),
};

// 所有状态
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="正常状态" placeholder="Normal" />
      <Input label="错误状态" error="这是一条错误信息" />
      <Input label="帮助文本" helperText="这是一条帮助信息" />
      <Input label="禁用状态" disabled />
    </div>
  ),
};

// 表单示例
export const FormExample: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-md">
      <Input label="姓名" placeholder="请输入您的姓名" />
      <Input label="邮箱" type="email" placeholder="example@email.com" />
      <Input label="密码" type="password" placeholder="至少8位字符" />
      <Input label="确认密码" type="password" placeholder="再次输入密码" />
    </div>
  ),
};
