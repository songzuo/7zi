/**
 * RoomCard Component Tests
 *
 * Tests for the RoomCard component with different layout modes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoomCard from './RoomCard';
import type { Room, RoomType, RoomVisibility } from '@/lib/websocket/rooms';

// ============================================================================
// Mock Helpers
// ============================================================================

const createMockRoom = (overrides: Partial<Room> = {}): Room => {
  return {
    id: 'room-1',
    name: '测试房间',
    type: 'chat' as RoomType,
    documentId: 'doc-1',
    visibility: 'public' as RoomVisibility,
    ownerId: 'user-1',
    participants: new Map([
      ['user-1', {
        id: 'user-1',
        name: '张三',
        avatar: 'https://example.com/avatar1.jpg',
        color: '#3b82f6',
        role: 'owner',
        joinedAt: new Date(),
        isTyping: false,
        lastActivity: new Date(),
        isOnline: true,
      }],
      ['user-2', {
        id: 'user-2',
        name: '李四',
        avatar: 'https://example.com/avatar2.jpg',
        color: '#f97316',
        role: 'member',
        joinedAt: new Date(),
        isTyping: false,
        lastActivity: new Date(),
        isOnline: true,
      }],
    ]),
    data: { content: '', revision: 0 },
    config: {
      maxParticipants: 100,
      messageHistoryEnabled: true,
      persistenceEnabled: true,
      autoCleanupMinutes: 30,
      allowGuests: false,
      enforcePermissions: true,
    },
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(),
    lastActivity: new Date(Date.now() - 3600000),
    invites: new Set(),
    ...overrides,
  };
};

// ============================================================================
// Test Suite
// ============================================================================

describe('RoomCard', () => {
  const mockOnClick = vi.fn();
  const mockOnJoin = vi.fn();
  const mockOnLeave = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Card Layout Tests (Default)
  // ==========================================================================

  describe('Card Layout (default)', () => {
    it('should render room card with room name', () => {
      const room = createMockRoom();

      render(
        <RoomCard
          room={room}
          currentUserId="user-3"
          onClick={mockOnClick}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
          onDelete={mockOnDelete}
          layout="card"
        />
      );

      // Room name
      expect(screen.getByText('测试房间')).toBeInTheDocument();
    });

    it('should show room type icon and label', () => {
      const room = createMockRoom({ type: 'project' });

      render(
        <RoomCard
          room={room}
          currentUserId="user-3"
          onClick={mockOnClick}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
          onDelete={mockOnDelete}
          layout="card"
        />
      );

      // Should show project icon and label
      expect(screen.getByText('📁')).toBeInTheDocument();
      expect(screen.getByText('项目')).toBeInTheDocument();
    });

    it('should show visibility icon', () => {
      const room = createMockRoom({ visibility: 'private' });

      render(
        <RoomCard
          room={room}
          currentUserId="user-3"
          onClick={mockOnClick}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
          onDelete={mockOnDelete}
          layout="card"
        />
      );

      // Should show lock icon for private rooms
      expect(screen.getByText('🔒')).toBeInTheDocument();
    });

    it('should show member count text', () => {
      const room = createMockRoom();

      render(
        <RoomCard
          room={room}
          currentUserId="user-3"
          onClick={mockOnClick}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
          onDelete={mockOnDelete}
          layout="card"
        />
      );

      // Should show member count text
      expect(screen.getByText(/人在线/)).toBeInTheDocument();
    });

    it('should highlight when selected', () => {
      const room = createMockRoom();

      render(
        <RoomCard
          room={room}
          currentUserId="user-3"
          isSelected={true}
          onClick={mockOnClick}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
          onDelete={mockOnDelete}
          layout="card"
        />
      );

      // Check for selected class
      const card = screen.getByText('测试房间').closest('div');
      expect(card?.className).toMatch(/border-blue-500|border-blue-400/);
    });

    it('should call onClick when card is clicked', async () => {
      const user = userEvent.setup();
      const room = createMockRoom();

      render(
        <RoomCard
          room={room}
          currentUserId="user-3"
          onClick={mockOnClick}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
          onDelete={mockOnDelete}
          layout="card"
        />
      );

      const card = screen.getByText('测试房间').closest('div');
      if (card) {
        await user.click(card);
      }

      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should show join button for non-member', async () => {
      const user = userEvent.setup();
      const room = createMockRoom();

      render(
        <RoomCard
          room={room}
          currentUserId="user-999"
          onClick={mockOnClick}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
          onDelete={mockOnDelete}
          layout="card"
          showActions={true}
        />
      );

      // Should show join button
      const joinButton = screen.getByRole('button', { name: /加入/i });
      await user.click(joinButton);

      expect(mockOnJoin).toHaveBeenCalledWith(room.id);
    });

    it('should show leave button for member', async () => {
      const user = userEvent.setup();
      const room = createMockRoom();

      render(
        <RoomCard
          room={room}
          currentUserId="user-2"
          onClick={mockOnClick}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
          onDelete={mockOnDelete}
          layout="card"
          showActions={true}
        />
      );

      // Should show leave button
      const leaveButton = screen.getByRole('button', { name: /离开/i });
      await user.click(leaveButton);

      expect(mockOnLeave).toHaveBeenCalledWith(room.id);
    });
  });

  // ==========================================================================
  // List Layout Tests
  // ==========================================================================

  describe('List Layout', () => {
    it('should render room in list format', () => {
      const room = createMockRoom();

      render(
        <RoomCard
          room={room}
          currentUserId="user-3"
          onClick={mockOnClick}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
          onDelete={mockOnDelete}
          layout="list"
        />
      );

      expect(screen.getByText('测试房间')).toBeInTheDocument();
    });

    it('should show compact info in list mode', () => {
      const room = createMockRoom();

      render(
        <RoomCard
          room={room}
          currentUserId="user-3"
          onClick={mockOnClick}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
          onDelete={mockOnDelete}
          layout="list"
        />
      );

      // Should show room type
      expect(screen.getByText('聊天')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Compact Layout Tests
  // ==========================================================================

  describe('Compact Layout', () => {
    it('should render minimal information', () => {
      const room = createMockRoom();

      render(
        <RoomCard
          room={room}
          currentUserId="user-3"
          onClick={mockOnClick}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
          onDelete={mockOnDelete}
          layout="compact"
        />
      );

      expect(screen.getByText('测试房间')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Event Handlers Tests
  // ==========================================================================

  describe('Event Handlers', () => {
    it('should handle delete button for owner', async () => {
      const user = userEvent.setup();
      const room = createMockRoom();

      render(
        <RoomCard
          room={room}
          currentUserId="user-1"
          onClick={mockOnClick}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
          onDelete={mockOnDelete}
          layout="card"
          showActions={true}
        />
      );

      // Owner should see delete option
      const deleteButton = screen.getByRole('button', { name: /删除/i });
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(room.id);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty participants', () => {
      const room = createMockRoom({
        participants: new Map(),
      });

      render(
        <RoomCard
          room={room}
          currentUserId="user-3"
          onClick={mockOnClick}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
          onDelete={mockOnDelete}
          layout="card"
        />
      );

      expect(screen.getByText('测试房间')).toBeInTheDocument();
      expect(screen.getByText('空房间')).toBeInTheDocument();
    });

    it('should handle very long room name', () => {
      const room = createMockRoom({
        name: '这是一个非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的房间名称',
      });

      render(
        <RoomCard
          room={room}
          currentUserId="user-3"
          onClick={mockOnClick}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
          onDelete={mockOnDelete}
          layout="card"
        />
      );

      expect(screen.getByText(/非常长/)).toBeInTheDocument();
    });

    it('should handle different room types', () => {
      const types: RoomType[] = ['task', 'project', 'chat', 'document', 'voice', 'video'];

      types.forEach((type) => {
        const room = createMockRoom({ type });

        render(
          <RoomCard
            room={room}
            currentUserId="user-3"
            onClick={mockOnClick}
            layout="card"
          />
        );
      });

      // Should render all room types without crashing
      expect(true).toBe(true);
    });

    it('should handle different visibility types', () => {
      const visibilities: RoomVisibility[] = ['public', 'private', 'invite-only'];

      visibilities.forEach((visibility) => {
        const room = createMockRoom({ visibility });

        render(
          <RoomCard
            room={room}
            currentUserId="user-3"
            onClick={mockOnClick}
            layout="card"
          />
        );
      });

      // Should render all visibility types without crashing
      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // Dark Mode Tests
  // ==========================================================================

  describe('Dark Mode', () => {
    it('should apply dark mode classes', () => {
      const room = createMockRoom();

      document.documentElement.classList.add('dark');

      render(
        <RoomCard
          room={room}
          currentUserId="user-3"
          onClick={mockOnClick}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
          onDelete={mockOnDelete}
          layout="card"
        />
      );

      const card = screen.getByText('测试房间').closest('div');
      expect(card?.className).toMatch(/dark:/);

      document.documentElement.classList.remove('dark');
    });
  });
});
