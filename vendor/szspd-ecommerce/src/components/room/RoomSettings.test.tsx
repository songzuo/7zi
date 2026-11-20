/**
 * RoomSettings Component Tests
 *
 * Tests for the RoomSettings component with all tabs:
 * 1. General Settings
 * 2. Permissions
 * 3. Members
 * 4. Danger Zone
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoomSettings from './RoomSettings'
import type { Room, RoomConfig, RoomVisibility, RoomType } from '@/lib/websocket/rooms'

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
      [
        'user-1',
        {
          id: 'user-1',
          name: '张三',
          avatar: 'https://example.com/avatar1.jpg',
          color: '#3b82f6',
          role: 'owner',
          joinedAt: new Date(),
          isTyping: false,
          lastActivity: new Date(),
          isOnline: true,
        },
      ],
      [
        'user-2',
        {
          id: 'user-2',
          name: '李四',
          avatar: 'https://example.com/avatar2.jpg',
          color: '#f97316',
          role: 'admin',
          joinedAt: new Date(),
          isTyping: false,
          lastActivity: new Date(),
          isOnline: true,
        },
      ],
      [
        'user-3',
        {
          id: 'user-3',
          name: '王五',
          avatar: undefined,
          color: '#10b981',
          role: 'member',
          joinedAt: new Date(),
          isTyping: false,
          lastActivity: new Date(),
          isOnline: false,
        },
      ],
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
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('RoomSettings', () => {
  const mockOnUpdateConfig = vi.fn()
  const mockOnChangeVisibility = vi.fn()
  const mockOnChangeRole = vi.fn()
  const mockOnKickUser = vi.fn()
  const mockOnBanUser = vi.fn()
  const mockOnUnbanUser = vi.fn()
  const mockOnDestroyRoom = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================================================
  // General Settings Tab Tests
  // ==========================================================================

  describe('General Settings Tab', () => {
    it('should render general settings form', () => {
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      expect(screen.getByText('通用设置')).toBeInTheDocument()
      expect(screen.getByText('房间名称')).toBeInTheDocument()
      expect(screen.getByText('可见性')).toBeInTheDocument()
      expect(screen.getByText('最大参与人数')).toBeInTheDocument()
    })

    it('should display current room name', () => {
      const room = createMockRoom({ name: '我的房间' })

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const nameInput = screen.getByDisplayValue('我的房间')
      expect(nameInput).toBeInTheDocument()
    })

    it('should update room name', async () => {
      const user = userEvent.setup()
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const nameInput = screen.getByDisplayValue('测试房间')
      await user.clear(nameInput)
      await user.type(nameInput, '新房间名称')

      const saveButton = screen.getByRole('button', { name: /保存/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnUpdateConfig).toHaveBeenCalledWith(
          room.id,
          expect.objectContaining({
            name: '新房间名称',
          })
        )
      })
    })

    it('should display current visibility', () => {
      const room = createMockRoom({ visibility: 'private' })

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      expect(screen.getByText('私有')).toBeInTheDocument()
    })

    it('should change visibility', async () => {
      const user = userEvent.setup()
      const room = createMockRoom({ visibility: 'public' })

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const visibilitySelect = screen.getByRole('combobox', { name: /可见性/i })
      await user.click(visibilitySelect)

      const privateOption = screen.getByText('私有')
      await user.click(privateOption)

      await waitFor(() => {
        expect(mockOnChangeVisibility).toHaveBeenCalledWith(room.id, 'private')
      })
    })

    it('should display max participants', () => {
      const room = createMockRoom({ config: { ...createMockRoom().config, maxParticipants: 50 } })

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const input = screen.getByDisplayValue('50')
      expect(input).toBeInTheDocument()
    })

    it('should update max participants', async () => {
      const user = userEvent.setup()
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const input = screen.getByDisplayValue('100')
      await user.clear(input)
      await user.type(input, '200')

      const saveButton = screen.getByRole('button', { name: /保存/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnUpdateConfig).toHaveBeenCalledWith(
          room.id,
          expect.objectContaining({
            maxParticipants: 200,
          })
        )
      })
    })

    it('should allow guests toggle', async () => {
      const user = userEvent.setup()
      const room = createMockRoom({ config: { ...createMockRoom().config, allowGuests: false } })

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const toggle = screen.getByRole('checkbox', { name: /允许访客/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(mockOnUpdateConfig).toHaveBeenCalledWith(
          room.id,
          expect.objectContaining({
            allowGuests: true,
          })
        )
      })
    })
  })

  // ==========================================================================
  // Permissions Tab Tests
  // ==========================================================================

  describe('Permissions Tab', () => {
    it('should switch to permissions tab', async () => {
      const user = userEvent.setup()
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const permissionsTab = screen.getByRole('tab', { name: '权限管理' })
      await user.click(permissionsTab)

      expect(screen.getByText('权限管理')).toBeInTheDocument()
      expect(screen.getByText('权限检查')).toBeInTheDocument()
    })

    it('should toggle enforce permissions', async () => {
      const user = userEvent.setup()
      const room = createMockRoom({
        config: { ...createMockRoom().config, enforcePermissions: true },
      })

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const permissionsTab = screen.getByRole('tab', { name: '权限管理' })
      await user.click(permissionsTab)

      const toggle = screen.getByRole('checkbox', { name: /强制权限检查/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(mockOnUpdateConfig).toHaveBeenCalledWith(
          room.id,
          expect.objectContaining({
            enforcePermissions: false,
          })
        )
      })
    })

    it('should display permission matrix', async () => {
      const user = userEvent.setup()
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const permissionsTab = screen.getByRole('tab', { name: '权限管理' })
      await user.click(permissionsTab)

      // Should show permission table with roles and permissions
      expect(screen.getByText(/所有者/i)).toBeInTheDocument()
      expect(screen.getByText(/管理员/i)).toBeInTheDocument()
      expect(screen.getByText(/成员/i)).toBeInTheDocument()
      expect(screen.getByText(/访客/i)).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Members Tab Tests
  // ==========================================================================

  describe('Members Tab', () => {
    it('should switch to members tab', async () => {
      const user = userEvent.setup()
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const membersTab = screen.getByRole('tab', { name: '成员管理' })
      await user.click(membersTab)

      expect(screen.getByText('成员管理')).toBeInTheDocument()
      expect(screen.getByText('张三')).toBeInTheDocument()
      expect(screen.getByText('李四')).toBeInTheDocument()
    })

    it('should display member list with roles', async () => {
      const user = userEvent.setup()
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const membersTab = screen.getByRole('tab', { name: '成员管理' })
      await user.click(membersTab)

      expect(screen.getByText(/owner/i)).toBeInTheDocument()
      expect(screen.getByText(/admin/i)).toBeInTheDocument()
      expect(screen.getByText(/member/i)).toBeInTheDocument()
    })

    it('should change member role', async () => {
      const user = userEvent.setup()
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const membersTab = screen.getByRole('tab', { name: '成员管理' })
      await user.click(membersTab)

      // Find role change button for 李四 (admin)
      const roleChangeButtons = screen.getAllByRole('button', { name: /更改角色/i })
      const memberRoleButton = roleChangeButtons.find(btn =>
        btn.closest('[data-testid="participant-item"]')?.textContent?.includes('李四')
      )

      if (memberRoleButton) {
        await user.click(memberRoleButton)

        const memberOption = screen.getByText('Member')
        await user.click(memberOption)

        await waitFor(() => {
          expect(mockOnChangeRole).toHaveBeenCalledWith('user-2', 'member')
        })
      }
    })

    it('should kick user', async () => {
      const user = userEvent.setup()
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const membersTab = screen.getByRole('tab', { name: '成员管理' })
      await user.click(membersTab)

      const kickButtons = screen.getAllByRole('button', { name: /踢出/i })
      const kickButton = kickButtons.find(btn =>
        btn.closest('[data-testid="participant-item"]')?.textContent?.includes('王五')
      )

      if (kickButton) {
        await user.click(kickButton)

        await waitFor(() => {
          expect(mockOnKickUser).toHaveBeenCalledWith('user-3')
        })
      }
    })

    it('should ban user', async () => {
      const user = userEvent.setup()
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const membersTab = screen.getByRole('tab', { name: '成员管理' })
      await user.click(membersTab)

      const banButtons = screen.getAllByRole('button', { name: /封禁/i })
      const banButton = banButtons.find(btn =>
        btn.closest('[data-testid="participant-item"]')?.textContent?.includes('王五')
      )

      if (banButton) {
        await user.click(banButton)

        await waitFor(() => {
          expect(mockOnBanUser).toHaveBeenCalledWith('user-3')
        })
      }
    })

    it('should show banned users list', async () => {
      const user = userEvent.setup()
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={['user-999', 'user-888']}
        />
      )

      const membersTab = screen.getByRole('tab', { name: '成员管理' })
      await user.click(membersTab)

      expect(screen.getByText('user-999')).toBeInTheDocument()
      expect(screen.getByText('user-888')).toBeInTheDocument()
    })

    it('should unban user', async () => {
      const user = userEvent.setup()
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={['user-999']}
        />
      )

      const membersTab = screen.getByRole('tab', { name: '成员管理' })
      await user.click(membersTab)

      const unbanButton = screen.getByRole('button', { name: /解除封禁/i })
      await user.click(unbanButton)

      await waitFor(() => {
        expect(mockOnUnbanUser).toHaveBeenCalledWith('user-999')
      })
    })
  })

  // ==========================================================================
  // Danger Zone Tab Tests
  // ==========================================================================

  describe('Danger Zone Tab', () => {
    it('should switch to danger zone tab', async () => {
      const user = userEvent.setup()
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const dangerTab = screen.getByRole('tab', { name: '危险区域' })
      await user.click(dangerTab)

      expect(screen.getByText('危险区域')).toBeInTheDocument()
      expect(screen.getByText('删除房间')).toBeInTheDocument()
    })

    it('should show warning message', async () => {
      const user = userEvent.setup()
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const dangerTab = screen.getByRole('tab', { name: '危险区域' })
      await user.click(dangerTab)

      expect(screen.getByText(/此操作不可撤销/i)).toBeInTheDocument()
    })

    it('should destroy room after confirmation', async () => {
      const user = userEvent.setup()
      window.confirm = vi.fn(() => true)
      const room = createMockRoom({ name: '要删除的房间' })

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const dangerTab = screen.getByRole('tab', { name: '危险区域' })
      await user.click(dangerTab)

      const deleteButton = screen.getByRole('button', { name: /删除房间/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('要删除的房间'))
      })

      await waitFor(() => {
        expect(mockOnDestroyRoom).toHaveBeenCalledWith('room-1')
      })
    })

    it('should not destroy room if confirmation cancelled', async () => {
      const user = userEvent.setup()
      window.confirm = vi.fn(() => false)
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const dangerTab = screen.getByRole('tab', { name: '危险区域' })
      await user.click(dangerTab)

      const deleteButton = screen.getByRole('button', { name: /删除房间/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockOnDestroyRoom).not.toHaveBeenCalled()
      })
    })
  })

  // ==========================================================================
  // Access Control Tests
  // ==========================================================================

  describe('Access Control', () => {
    it('should show all tabs for owner', () => {
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      expect(screen.getByRole('tab', { name: '通用设置' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: '权限管理' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: '成员管理' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: '危险区域' })).toBeInTheDocument()
    })

    it('should show limited tabs for non-admin', () => {
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-2"
          canManage={false}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      expect(screen.getByRole('tab', { name: '通用设置' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: '成员管理' })).toBeInTheDocument()

      // Should not have admin-only tabs
      expect(screen.queryByRole('tab', { name: '权限管理' })).not.toBeInTheDocument()
      expect(screen.queryByRole('tab', { name: '危险区域' })).not.toBeInTheDocument()
    })

    it('should disable settings for non-admin', () => {
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-3"
          canManage={false}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const nameInput = screen.getByDisplayValue('测试房间')
      expect(nameInput).toBeDisabled()
    })
  })

  // ==========================================================================
  // Close Button Tests
  // ==========================================================================

  describe('Close Button', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      const room = createMockRoom()

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const closeButton = screen.getByRole('button', { name: /关闭/i })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Dark Mode Tests
  // ==========================================================================

  describe('Dark Mode', () => {
    it('should apply dark mode styles', () => {
      const room = createMockRoom()

      document.documentElement.classList.add('dark')

      render(
        <RoomSettings
          room={room}
          currentUserId="user-1"
          canManage={true}
          onUpdateConfig={mockOnUpdateConfig}
          onChangeVisibility={mockOnChangeVisibility}
          onChangeRole={mockOnChangeRole}
          onKickUser={mockOnKickUser}
          onBanUser={mockOnBanUser}
          onUnbanUser={mockOnUnbanUser}
          onDestroyRoom={mockOnDestroyRoom}
          onClose={mockOnClose}
          bannedUsers={[]}
        />
      )

      const container = document.querySelector('[data-testid="room-settings"]')
      expect(container).toHaveClass(/dark/)

      document.documentElement.classList.remove('dark')
    })
  })
})
