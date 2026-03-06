import type { Meta, StoryObj } from '@storybook/nextjs';
import ProgressBar from '@/components/ProgressBar';

const meta = {
  title: 'Components/ProgressBar',
  component: ProgressBar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '进度条组件，支持多种颜色、尺寸和动画效果。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'range',
      min: 0,
      max: 100,
      description: '当前进度值',
    },
    max: {
      control: 'number',
      description: '最大值',
      table: {
        defaultValue: { summary: '100' },
      },
    },
    label: {
      control: 'text',
      description: '标签文本',
    },
    showPercentage: {
      control: 'boolean',
      description: '显示百分比',
    },
    color: {
      control: 'select',
      options: ['blue', 'green', 'red', 'yellow', 'purple', 'gradient'],
      description: '进度条颜色',
      table: {
        defaultValue: { summary: 'blue' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: '进度条尺寸',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    animated: {
      control: 'boolean',
      description: '启用动画',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
    striped: {
      control: 'boolean',
      description: '条纹效果',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Default: StoryObj<typeof meta> = {
  args: {
    value: 60,
    label: '任务进度',
    showPercentage: true,
  },
};

export const Colors: StoryObj<typeof meta> = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <ProgressBar value={75} color="blue" label="Blue" showPercentage />
      <ProgressBar value={60} color="green" label="Green" showPercentage />
      <ProgressBar value={45} color="red" label="Red" showPercentage />
      <ProgressBar value={80} color="yellow" label="Yellow" showPercentage />
      <ProgressBar value={55} color="purple" label="Purple" showPercentage />
      <ProgressBar value={70} color="gradient" label="Gradient" showPercentage />
    </div>
  ),
};

export const Sizes: StoryObj<typeof meta> = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <ProgressBar value={70} size="sm" label="Small" showPercentage />
      <ProgressBar value={70} size="md" label="Medium" showPercentage />
      <ProgressBar value={70} size="lg" label="Large" showPercentage />
    </div>
  ),
};

export const Striped: StoryObj<typeof meta> = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <ProgressBar value={65} color="blue" striped label="Striped Blue" showPercentage />
      <ProgressBar value={80} color="green" striped label="Striped Green" showPercentage />
    </div>
  ),
};

export const TaskProgress: StoryObj<typeof meta> = {
  render: () => (
    <div className="space-y-6 max-w-md">
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">已完成任务</span>
          <span className="text-sm text-gray-500">42/50</span>
        </div>
        <ProgressBar value={42} max={50} color="green" showPercentage />
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">进行中</span>
          <span className="text-sm text-gray-500">5/50</span>
        </div>
        <ProgressBar value={5} max={50} color="blue" showPercentage />
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">待办</span>
          <span className="text-sm text-gray-500">3/50</span>
        </div>
        <ProgressBar value={3} max={50} color="yellow" showPercentage />
      </div>
    </div>
  ),
};