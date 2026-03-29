/**
 * Button.stories.ts - Button 组件的 Storybook 故事
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/ui/Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success'],
      description: '按钮变体',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: '按钮大小',
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用',
    },
    loading: {
      control: 'boolean',
      description: '是否加载中',
    },
    fullWidth: {
      control: 'boolean',
      description: '是否全宽',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// 基础示例
export const Primary: Story = {
  args: {
    children: '主要按钮',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: '次要按钮',
    variant: 'secondary',
  },
};

export const Outline: Story = {
  args: {
    children: '轮廓按钮',
    variant: 'outline',
  },
};

export const Ghost: Story = {
  args: {
    children: '幽灵按钮',
    variant: 'ghost',
  },
};

export const Danger: Story = {
  args: {
    children: '危险按钮',
    variant: 'danger',
  },
};

export const Success: Story = {
  args: {
    children: '成功按钮',
    variant: 'success',
  },
};

// 大小示例
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
};

// 状态示例
export const States: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button>正常状态</Button>
      <Button disabled>禁用状态</Button>
      <Button loading>加载中</Button>
    </div>
  ),
};

// 全宽示例
export const FullWidth: Story = {
  args: {
    children: '全宽按钮',
    fullWidth: true,
  },
};

// 所有变体
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="success">Success</Button>
    </div>
  ),
};
