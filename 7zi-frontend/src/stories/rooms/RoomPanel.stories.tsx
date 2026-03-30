/**
 * RoomPanel Stories
 *
 * Storybook stories for the Room Panel component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { RoomPanel, RoomPanelProps } from '@/components/rooms/RoomPanel';
import type { Room } from '@/types/rooms';

// Mock room data
const mockRoom: Room = {
  id: 'room1',
  name: '项目讨论组',
  description: '讨论项目进度和技术问题，欢迎团队成员加入',
  ownerId: 'user1',
  ownerName: '张三',
  inviteCode: 'PROJ123',
  members: [
    {
      id: 'user1',
      name: '张三',
      role: 'owner',
      isOnline: true,
      joinedAt: Date.now() - 86400000,
      lastActiveAt: Date.now(),
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
    },
    {
      id: 'user2',
      name: '李四',
      role: 'admin',
      isOnline: true,
      joinedAt: Date.now() - 43200000,
      lastActiveAt: Date.now(),
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
    },
    {
      id: 'user3',
      name: '王五',
      role: 'member',
      isOnline: false,
      joinedAt: Date.now() - 21600000,
      lastActiveAt: Date.now() - 3600000,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3',
    },
    {
      id: 'user4',
      name: '赵六',
      role: 'member',
      isOnline: true,
      joinedAt: Date.now() - 10800000,
      lastActiveAt: Date.now(),
    },
    {
      id: 'user5',
      name: '钱七',
      role: 'member',
      isOnline: false,
      joinedAt: Date.now() - 7200000,
      lastActiveAt: Date.now() - 7200000,
    },
  ],
  onlineCount: 3,
  memberCount: 5,
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now(),
  lastActivityAt: Date.now(),
};

const meta: Meta<RoomPanelProps> = {
  title: 'Rooms/RoomPanel',
  component: RoomPanel,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Room details panel with participants list, permissions management, and settings.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    room: {
      control: 'object',
      description: 'Room data to display',
    },
    currentUserId: {
      control: 'text',
      description: 'Current user ID',
    },
    compact: {
      control: 'boolean',
      description: 'Show compact mode',
    },
  },
};

export default meta;
type Story = StoryObj<RoomPanelProps>;

/**
 * Default panel - as owner
 */
export const AsOwner: Story = {
  args: {
    room: mockRoom,
    currentUserId: 'user1',
  },
};

/**
 * Panel as admin
 */
export const AsAdmin: Story = {
  args: {
    room: mockRoom,
    currentUserId: 'user2',
  },
};

/**
 * Panel as regular member
 */
export const AsMember: Story = {
  args: {
    room: mockRoom,
    currentUserId: 'user3',
  },
};

/**
 * Compact mode
 */
export const Compact: Story = {
  args: {
    room: mockRoom,
    currentUserId: 'user1',
    compact: true,
  },
};

/**
 * With close button
 */
export const WithCloseButton: Story = {
  args: {
    room: mockRoom,
    currentUserId: 'user1',
    onClose: () => alert('Close clicked'),
  },
};

/**
 * Small room (few members)
 */
export const SmallRoom: Story = {
  args: {
    room: {
      ...mockRoom,
      name: '私密讨论',
      description: '只有少数人',
      members: [mockRoom.members[0], mockRoom.members[1]],
      onlineCount: 2,
      memberCount: 2,
    },
    currentUserId: 'user1',
  },
};

/**
 * Large room (many members)
 */
export const LargeRoom: Story = {
  args: {
    room: {
      ...mockRoom,
      name: '大型社区',
      members: Array.from({ length: 25 }, (_, i) => ({
        id: `user${i + 1}`,
        name: `用户${i + 1}`,
        role: i === 0 ? 'owner' : i < 3 ? 'admin' : 'member',
        isOnline: i % 3 !== 0,
        joinedAt: Date.now() - Math.random() * 86400000,
        lastActiveAt: Date.now() - Math.random() * 3600000,
      })),
      onlineCount: 17,
      memberCount: 25,
    },
    currentUserId: 'user1',
  },
};

/**
 * Empty room (only owner)
 */
export const EmptyRoom: Story = {
  args: {
    room: {
      ...mockRoom,
      name: '新房间',
      description: '刚创建的房间',
      members: [mockRoom.members[0]],
      onlineCount: 1,
      memberCount: 1,
    },
    currentUserId: 'user1',
  },
};
