import type { Meta, StoryObj } from '@storybook/nextjs';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const meta = {
  title: 'Components/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '加载动画组件，支持三种尺寸。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: '加载动画尺寸',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
  },
} satisfies Meta<typeof LoadingSpinner>;

export default meta;
// type Story = StoryObj<typeof meta>; // Unused - using StoryObj directly

export const Small: StoryObj<typeof meta> = {
  args: {
    size: 'sm',
  },
};

export const Medium: StoryObj<typeof meta> = {
  args: {
    size: 'md',
  },
};

export const Large: StoryObj<typeof meta> = {
  args: {
    size: 'lg',
  },
};

export const AllSizes: StoryObj<typeof meta> = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <LoadingSpinner size="sm" />
        <p className="mt-2 text-sm text-gray-500">Small</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" />
        <p className="mt-2 text-sm text-gray-500">Medium</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-2 text-sm text-gray-500">Large</p>
      </div>
    </div>
  ),
};