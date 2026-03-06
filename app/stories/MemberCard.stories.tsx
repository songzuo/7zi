import type { Meta, StoryObj } from '@storybook/nextjs';
import { MemberCard } from '@/components/MemberCard';

const meta = {
  title: 'Components/MemberCard',
  component: MemberCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'AI 团队成员卡片组件，显示成员状态、任务和统计信息。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    compact: {
      control: 'boolean',
      description: '紧凑模式',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
  },
} satisfies Meta<typeof MemberCard>;

export default meta;
type Story = StoryObj<typeof MemberCard>;

const defaultMember = {
  id: 'expert-1',
  name: '智能体世界专家',
  role: '视角转换与未来布局',
  emoji: '🌟',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=expert-1',
  status: 'working' as const,
  provider: 'minimax',
  currentTask: '#123 实现自动化文档系统',
  completedTasks: 42,
};

const busyMember = {
  ...defaultMember,
  id: 'architect-1',
  name: '架构师',
  role: '架构设计',
  emoji: '🏗️',
  status: 'busy' as const,
  currentTask: '#124 重构核心模块',
  completedTasks: 38,
};

const idleMember = {
  ...defaultMember,
  id: 'designer-1',
  name: '设计师',
  role: 'UI/UX 设计',
  emoji: '🎨',
  status: 'idle' as const,
  currentTask: undefined,
  completedTasks: 15,
};

const offlineMember = {
  ...defaultMember,
  id: 'media-1',
  name: '媒体',
  role: '媒体宣传',
  emoji: '📺',
  status: 'offline' as const,
  currentTask: undefined,
  completedTasks: 25,
};

export const Working: StoryObj<typeof meta> = {
  args: {
    member: defaultMember,
  },
};

export const Busy: StoryObj<typeof meta> = {
  args: {
    member: busyMember,
  },
};

export const Idle: StoryObj<typeof meta> = {
  args: {
    member: idleMember,
  },
};

export const Offline: StoryObj<typeof meta> = {
  args: {
    member: offlineMember,
  },
};

export const Compact: StoryObj<typeof meta> = {
  args: {
    member: defaultMember,
    compact: true,
  },
};

export const AllStatuses: StoryObj<typeof meta> = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 max-w-4xl">
      <MemberCard member={defaultMember} />
      <MemberCard member={busyMember} />
      <MemberCard member={idleMember} />
      <MemberCard member={offlineMember} />
    </div>
  ),
};