/**
 * RoomList Stories
 *
 * Storybook stories for the Room List component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { RoomList, RoomListProps } from '@/components/rooms/RoomList';
import { useRoomStore } from '@/stores/room-store';
import type { Room } from '@/types/rooms';

// Mock data
const mockRooms: Room[] = [
  {
    id: '1',
    name: '项目讨论组',
    description: '讨论项目进度和技术问题',
    ownerId: 'user1',
    ownerName: '张三',
    inviteCode: 'PROJ123',
    members: [
      { id: 'user1', name: '张三', role: 'owner', isOnline: true, joinedAt: Date.now() - 86400000, lastActiveAt: Date.now() },
      { id: 'user2', name: '李四', role: 'admin', isOnline: true, joinedAt: Date.now() - 43200000, lastActiveAt: Date.now() },
      { id: 'user3', name: '王五', role: 'member', isOnline: false, joinedAt: Date.now() - 21600000, lastActiveAt: Date.now() - 3600000 },
    ],
    onlineCount: 2,
    memberCount: 3,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
    lastActivityAt: Date.now(),
  },
  {
    id: '2',
    name: '技术分享',
    description: '每周技术分享和讨论',
    ownerId: 'user2',
    ownerName: '李四',
    inviteCode: 'TECH456',
    members: [
      { id: 'user2', name: '李四', role: 'owner', isOnline: true, joinedAt: Date.now() - 172800000, lastActiveAt: Date.now() },
      { id: 'user4', name: '赵六', role: 'member', isOnline: true, joinedAt: Date.now() - 86400000, lastActiveAt: Date.now() },
      { id: 'user5', name: '钱七', role: 'member', isOnline: false, joinedAt: Date.now() - 43200000, lastActiveAt: Date.now() - 7200000 },
      { id: 'user6', name: '孙八', role: 'member', isOnline: false, joinedAt: Date.now() - 21600000, lastActiveAt: Date.now() - 10800000 },
    ],
    onlineCount: 2,
    memberCount: 4,
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now(),
    lastActivityAt: Date.now() - 3600000,
  },
  {
    id: '3',
    name: '闲聊群',
    description: '日常闲聊和吐槽',
    ownerId: 'user1',
    ownerName: '张三',
    inviteCode: 'CHAT789',
    members: [
      { id: 'user1', name: '张三', role: 'owner', isOnline: true, joinedAt: Date.now() - 604800000, lastActiveAt: Date.now() },
    ],
    onlineCount: 1,
    memberCount: 1,
    createdAt: Date.now() - 604800000,
    updatedAt: Date.now(),
    lastActivityAt: Date.now() - 86400000,
  },
];

const meta: Meta<RoomListProps> = {
  title: 'Rooms/RoomList',
  component: RoomList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Display all rooms with filtering, search, and room management actions.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      // Reset and populate store for each story
      const store = useRoomStore.getState();
      store.setRooms([]);
      store.setCurrentUserId('user1');
      store.setRooms(mockRooms);
      return <Story />;
    },
  ],
};

export default meta;
type Story = StoryObj<RoomListProps>;

/**
 * Default room list with sample rooms
 */
export const Default: Story = {};

/**
 * Empty state - no rooms
 */
export const Empty: Story = {
  decorators: [
    (Story) => {
      const store = useRoomStore.getState();
      store.setRooms([]);
      return <Story />;
    },
  ],
};

/**
 * Loading state
 */
export const Loading: Story = {
  decorators: [
    (Story) => {
      const store = useRoomStore.getState();
      store.setLoading(true);
      return <Story />;
    },
  ],
};

/**
 * With current room selected
 */
export const WithCurrentRoom: Story = {
  decorators: [
    (Story) => {
      const store = useRoomStore.getState();
      store.setCurrentRoom(mockRooms[0]);
      return <Story />;
    },
  ],
};

/**
 * With error message
 */
export const WithError: Story = {
  decorators: [
    (Story) => {
      const store = useRoomStore.getState();
      store.setError('无法加载房间列表，请稍后重试');
      return <Story />;
    },
  ],
};

/**
 * Filter: My Created Rooms
 */
export const FilterMyCreated: Story = {
  decorators: [
    (Story) => {
      const store = useRoomStore.getState();
      store.setFilter('myCreated');
      return <Story />;
    },
  ],
};

/**
 * Filter: My Joined Rooms
 */
export const FilterMyJoined: Story = {
  decorators: [
    (Story) => {
      const store = useRoomStore.getState();
      store.setFilter('myJoined');
      return <Story />;
    },
  ],
};

/**
 * With search query
 */
export const WithSearch: Story = {
  decorators: [
    (Story) => {
      const store = useRoomStore.getState();
      store.setSearchQuery('技术');
      return <Story />;
    },
  ],
};
