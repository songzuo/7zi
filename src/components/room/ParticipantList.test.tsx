/**
 * ParticipantList Component Tests
 *
 * Tests for the ParticipantList component with different layout modes:
 * 1. List layout (default)
 * 2. Grid layout
 * 3. Compact layout (avatar stack)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ParticipantList from './ParticipantList';
import type { RoomParticipant, UserRole } from '@/lib/websocket/rooms';

// ============================================================================
// Mock Helpers
// ============================================================================

const createMockParticipant = (overrides: Partial<RoomParticipant> = {}): RoomParticipant => {
  return {
    id: 'user-1',
    name: '张三',
    avatar: 'https://example.com/avatar.jpg',
    color: '#3b82f6',
    role: 'member',
    joinedAt: new Date(),
    isTyping: false,
    lastActivity: new Date(),
    isOnline: true,
    ...overrides,
  };
};

const createMockParticipants = (count: number): RoomParticipant[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockParticipant({
      id: `user-${i + 1}`,
      name: `用户${i + 1}`,
      role: i === 0 ? 'owner' : i === 1 ? 'admin' : 'member',
      isOnline: i < 5, // First 5 online
    })
  );
};

// ============================================================================
// Test Suite
// ============================================================================

describe('ParticipantList', () => {
  const mockOnChangeRole = vi.fn();
  const mockOnKickUser = vi.fn();
  const mockOnBanUser = vi.fn();
  const mockOnUnbanUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // List Layout Tests
  // ==========================================================================

  describe('List Layout (default)', () => {
    it('should render all participants', () => {
      const participants = createMockParticipants(5);

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      expect(screen.getByText('用户1')).toBeInTheDocument();
      expect(screen.getByText('用户2')).toBeInTheDocument();
      expect(screen.getByText('用户5')).toBeInTheDocument();
    });

    it('should show online status indicator', () => {
      const participants = [
        createMockParticipant({ name: '在线用户', isOnline: true }),
        createMockParticipant({ id: 'user-2', name: '离线用户', isOnline: false }),
      ];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      const onlineIndicator = document.querySelector('[data-status="online"]');
      const offlineIndicator = document.querySelector('[data-status="offline"]');

      expect(onlineIndicator).toBeInTheDocument();
      expect(offlineIndicator).toBeInTheDocument();
    });

    it('should show role badges', () => {
      const participants = [
        createMockParticipant({ name: '所有者', role: 'owner' }),
        createMockParticipant({ id: 'user-2', name: '管理员', role: 'admin' }),
        createMockParticipant({ id: 'user-3', name: '成员', role: 'member' }),
      ];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      expect(screen.getAllByText('所有者').length).toBeGreaterThan(0);
      expect(screen.getAllByText('管理员').length).toBeGreaterThan(0);
      expect(screen.getAllByText('成员').length).toBeGreaterThan(0);
    });

    it('should sort participants: online first, then by role', () => {
      const participants = [
        createMockParticipant({ id: 'user-1', name: '离线成员', role: 'member', isOnline: false }),
        createMockParticipant({ id: 'user-2', name: '在线管理员', role: 'admin', isOnline: true }),
        createMockParticipant({ id: 'user-3', name: '离线所有者', role: 'owner', isOnline: false }),
        createMockParticipant({ id: 'user-4', name: '在线成员', role: 'member', isOnline: true }),
      ];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-3"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      const listItems = screen.getAllByRole('listitem');
      expect(listItems[0]).toHaveTextContent('在线管理员'); // admin + online
      expect(listItems[1]).toHaveTextContent('在线成员'); // member + online
      expect(listItems[2]).toHaveTextContent('离线所有者'); // owner + offline (owner still prioritized)
      expect(listItems[3]).toHaveTextContent('离线成员'); // member + offline
    });

    it('should show management actions for admins', async () => {
      const user = userEvent.setup();
      const participants = [createMockParticipant({ role: 'member' })];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-1"
          ownerId="user-1"
          canManage={true}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      const menuButton = screen.getByRole('button', { name: /操作/i });
      await user.click(menuButton);

      // Should show management options
      expect(screen.getByText(/更改角色/i)).toBeInTheDocument();
      expect(screen.getByText(/踢出/i)).toBeInTheDocument();
      expect(screen.getByText(/封禁/i)).toBeInTheDocument();
    });

    it('should not show management actions for non-admins', () => {
      const participants = [createMockParticipant()];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      // Should not have management menu button
      expect(screen.queryByRole('button', { name: /操作/i })).not.toBeInTheDocument();
    });

    it('should handle role change', async () => {
      const user = userEvent.setup();
      const participants = [createMockParticipant({ id: 'user-2', role: 'member' })];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-1"
          ownerId="user-1"
          canManage={true}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      const menuButton = screen.getByRole('button', { name: /操作/i });
      await user.click(menuButton);

      const changeRoleButton = screen.getByText(/更改角色/i);
      await user.click(changeRoleButton);

      const adminOption = screen.getByText(/管理员/i);
      await user.click(adminOption);

      expect(mockOnChangeRole).toHaveBeenCalledWith('user-2', 'admin');
    });

    it('should handle kick user', async () => {
      const user = userEvent.setup();
      const participants = [createMockParticipant({ id: 'user-2', name: '要被踢出的用户' })];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-1"
          ownerId="user-1"
          canManage={true}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      const menuButton = screen.getByRole('button', { name: /操作/i });
      await user.click(menuButton);

      const kickButton = screen.getByText(/踢出/i);
      await user.click(kickButton);

      expect(mockOnKickUser).toHaveBeenCalledWith('user-2');
    });

    it('should handle ban user', async () => {
      const user = userEvent.setup();
      const participants = [createMockParticipant({ id: 'user-2', name: '要被封禁的用户' })];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-1"
          ownerId="user-1"
          canManage={true}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      const menuButton = screen.getByRole('button', { name: /操作/i });
      await user.click(menuButton);

      const banButton = screen.getByText(/封禁/i);
      await user.click(banButton);

      expect(mockOnBanUser).toHaveBeenCalledWith('user-2');
    });
  });

  // ==========================================================================
  // Grid Layout Tests
  // ==========================================================================

  describe('Grid Layout', () => {
    it('should render participants in grid format', () => {
      const participants = createMockParticipants(5);

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="grid"
        />
      );

      expect(screen.getByText('张三')).toBeInTheDocument();
      expect(screen.getByText('用户5')).toBeInTheDocument();

      const container = document.querySelector('[data-testid="participant-grid"]');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass(/grid/);
    });

    it('should show avatars centered in grid cells', () => {
      const participants = createMockParticipants(3);

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="grid"
        />
      );

      const avatars = document.querySelectorAll('[data-testid="participant-avatar"]');
      expect(avatars.length).toBe(3);
    });
  });

  // ==========================================================================
  // Compact Layout Tests
  // ==========================================================================

  describe('Compact Layout', () => {
    it('should render avatar stack', () => {
      const participants = createMockParticipants(5);

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="compact"
        />
      );

      const avatars = document.querySelectorAll('[data-testid="avatar-stack"]');
      expect(avatars.length).toBeGreaterThan(0);

      const container = document.querySelector('[data-testid="participant-compact"]');
      expect(container).toBeInTheDocument();
    });

    it('should limit displayed avatars', () => {
      const participants = createMockParticipants(10);

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="compact"
          maxVisible={5}
        />
      );

      const avatars = document.querySelectorAll('[data-testid="participant-avatar"]');
      expect(avatars.length).toBeLessThanOrEqual(5);
    });

    it('should show count for hidden participants', () => {
      const participants = createMockParticipants(10);

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="compact"
          maxVisible={5}
        />
      );

      // Should show "+5" or similar for remaining participants
      const countBadge = screen.queryByText(/\+5/);
      expect(countBadge).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Empty State Tests
  // ==========================================================================

  describe('Empty State', () => {
    it('should show empty state message', () => {
      render(
        <ParticipantList
          participants={[]}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      expect(screen.getByText(/没有参与者/i)).toBeInTheDocument();
    });

    it('should show empty state with custom message', () => {
      render(
        <ParticipantList
          participants={[]}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
          emptyMessage="暂无成员"
        />
      );

      expect(screen.getByText('暂无成员')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Typing Indicator Tests
  // ==========================================================================

  describe('Typing Indicator', () => {
    it('should show typing indicator', () => {
      const participants = [
        createMockParticipant({ name: '正在输入', isTyping: true }),
      ];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      const typingIndicator = document.querySelector('[data-testid="typing-indicator"]');
      expect(typingIndicator).toBeInTheDocument();
    });

    it('should not show typing indicator for non-typing users', () => {
      const participants = [
        createMockParticipant({ name: '未输入', isTyping: false }),
      ];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      const typingIndicator = document.querySelector('[data-testid="typing-indicator"]');
      expect(typingIndicator).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Current User Tests
  // ==========================================================================

  describe('Current User', () => {
    it('should highlight current user', () => {
      const participants = [
        createMockParticipant({ id: 'user-1', name: '当前用户' }),
        createMockParticipant({ id: 'user-2', name: '其他用户' }),
      ];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-1"
          ownerId="user-1"
          canManage={true}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      const currentUserItem = screen.getByText('当前用户').closest('[data-testid="participant-item"]');
      const otherUserItem = screen.getByText('其他用户').closest('[data-testid="participant-item"]');

      expect(currentUserItem).toHaveClass(/current-user/);
      expect(otherUserItem).not.toHaveClass(/current-user/);
    });

    it('should not show management actions for self', () => {
      const participants = [
        createMockParticipant({ id: 'user-1', name: '自己' }),
      ];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-1"
          ownerId="user-1"
          canManage={true}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      // Should not have management menu button for self
      expect(screen.queryByRole('button', { name: /操作/i })).not.toBeInTheDocument();
    });

    it('should show "You" badge for current user', () => {
      const participants = [
        createMockParticipant({ id: 'user-1', name: '张三' }),
      ];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-1"
          ownerId="user-2"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      expect(screen.getByText(/你/)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Banned Users Tests
  // ==========================================================================

  describe('Banned Users', () => {
    it('should show banned users section', () => {
      const participants = [createMockParticipant()];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-1"
          ownerId="user-1"
          canManage={true}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
          bannedUsers={['user-999', 'user-888']}
        />
      );

      expect(screen.getByText(/封禁用户/i)).toBeInTheDocument();
      expect(screen.getByText('user-999')).toBeInTheDocument();
      expect(screen.getByText('user-888')).toBeInTheDocument();
    });

    it('should handle unban user', async () => {
      const user = userEvent.setup();
      const participants = [createMockParticipant()];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-1"
          ownerId="user-1"
          canManage={true}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
          bannedUsers={['user-999']}
        />
      );

      const unbanButton = screen.getByRole('button', { name: /解除封禁/i });
      await user.click(unbanButton);

      expect(mockOnUnbanUser).toHaveBeenCalledWith('user-999');
    });
  });

  // ==========================================================================
  // Dark Mode Tests
  // ==========================================================================

  describe('Dark Mode', () => {
    it('should apply dark mode styles', () => {
      const participants = [createMockParticipant()];

      document.documentElement.classList.add('dark');

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      const container = document.querySelector('[data-testid="participant-list"]');
      expect(container).toHaveClass(/dark/);

      document.documentElement.classList.remove('dark');
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle participant without avatar', () => {
      const participants = [
        createMockParticipant({ avatar: undefined }),
      ];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      const avatar = document.querySelector('[data-testid="avatar-initial"]');
      expect(avatar).toBeInTheDocument();
    });

    it('should handle very long names', () => {
      const participants = [
        createMockParticipant({
          name: '这是一个非常非常非常非常非常非常非常非常非常非常非常长的名字',
        }),
      ];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      expect(screen.getByText(/非常长/)).toBeInTheDocument();
    });

    it('should handle participants with invalid role', () => {
      const participants = [
        createMockParticipant({ role: 'invalid' as UserRole }),
      ];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      // Should still render participant
      expect(screen.getByText('张三')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const participants = [createMockParticipant()];

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-99"
          ownerId="user-1"
          canManage={false}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      const list = screen.getByRole('list');
      expect(list).toHaveAttribute('aria-label', expect.stringContaining('participant'));
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      const participants = createMockParticipants(3);

      render(
        <ParticipantList
          participants={participants}
          currentUserId="user-1"
          ownerId="user-1"
          canManage={true}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          layout="list"
        />
      );

      const menuButton = screen.getAllByRole('button', { name: /操作/i })[0];
      menuButton.focus();
      expect(menuButton).toHaveFocus();

      await user.keyboard('{Enter}');
      // Menu should be visible
      await waitFor(() => {
        expect(screen.getByText(/更改角色/i)).toBeVisible();
      });
    });
  });
});
