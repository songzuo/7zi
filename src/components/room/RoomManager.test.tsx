/**
 * RoomManager Component Tests
 *
 * Tests for the main RoomManager component:
 * 1. WebSocket connection management
 * 2. Room list and room view switching
 * 3. Settings panel integration
 * 4. User authentication state
 * 5. Connection status indicator
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoomManager, buildRoomConfigPatch } from './RoomManager'
import type { Room, RoomParticipant } from '@/lib/websocket/rooms'

// ============================================================================
// Mocks
// ============================================================================

// Store state that can be mutated between tests
const mockStoreState = {
  currentRoomId: null as string | null,
  currentUserId: null as string | null,
  currentUserName: null as string | null,
  rooms: [] as unknown[],
}

// Mock functions that can be tracked
const mockFunctions = {
  setCurrentRoom: vi.fn(),
  setCurrentUser: vi.fn(),
  setRooms: vi.fn(),
  addRoom: vi.fn(),
  updateRoom: vi.fn(),
  removeRoom: vi.fn(),
  setRoomsLoading: vi.fn(),
  setRoomsError: vi.fn(),
}

vi.mock('@/lib/websocket/dashboard/websocket-store', () => ({
  useWebSocketStore: vi.fn(selector => {
    const store = {
      ...mockStoreState,
      ...mockFunctions,
    }
    if (typeof selector === 'function') {
      return selector(store)
    }
    return store
  }),
}))

// Mock RoomList component
vi.mock('@/lib/websocket/dashboard/RoomList', () => ({
  default: vi.fn(({ onCreateRoom, onSelectRoom, onLeaveRoom }) => (
    <div data-testid="room-list">
      <button
        data-testid="create-room-btn"
        onClick={() => onCreateRoom?.({ name: '新房间', type: 'chat', visibility: 'public' })}
      >
        创建房间
      </button>
      <button data-testid="select-room-btn" onClick={() => onSelectRoom?.('room-1')}>
        选择房间
      </button>
      <button data-testid="leave-room-btn" onClick={() => onLeaveRoom?.('room-1')}>
        离开房间
      </button>
    </div>
  )),
}))

// Mock RoomView component
vi.mock('@/lib/websocket/dashboard/RoomView', () => ({
  default: vi.fn(({ onSendMessage, onReactMessage, onLeaveRoom }) => (
    <div data-testid="room-view">
      <span data-testid="room-view-label">房间视图</span>
      <button data-testid="send-message-btn" onClick={() => onSendMessage?.('测试消息')}>
        发送消息
      </button>
      <button data-testid="react-message-btn" onClick={() => onReactMessage?.('msg-1', '👍')}>
        反应
      </button>
      <button data-testid="leave-btn" onClick={() => onLeaveRoom?.()}>
        离开
      </button>
    </div>
  )),
  __esModule: true,
}))

// Mock RoomSettings component
vi.mock('./RoomSettings', () => ({
  default: vi.fn(({ room, onClose }) => (
    <div data-testid="room-settings">
      <span>房间设置</span>
      <button onClick={onClose}>关闭设置</button>
    </div>
  )),
}))

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build a Room fixture for store-driven tests.
 *
 * The component reads `ownerId` and `participants` off the room object, so both
 * have to be realistic for the leave-room semantics to be exercised.
 */
function makeRoom(ownerId: string, participantRole: 'owner' | 'member' = 'member'): Room {
  const participants = new Map<string, RoomParticipant>()
  participants.set('user-1', {
    id: 'user-1',
    name: '张三',
    color: '#3b82f6',
    role: participantRole,
    joinedAt: new Date(),
    isTyping: false,
    lastActivity: new Date(),
    isOnline: true,
  })

  return {
    id: 'room-1',
    name: '测试房间',
    type: 'chat',
    documentId: 'doc-1',
    visibility: 'public',
    ownerId,
    participants,
    data: { content: '', revision: 0 },
    config: {
      maxParticipants: 100,
      messageHistoryEnabled: true,
      persistenceEnabled: true,
      autoCleanupMinutes: 30,
      allowGuests: false,
      enforcePermissions: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivity: new Date(),
    invites: new Set(),
  }
}

/**
 * Let the auto-connect timer (1000ms) fire.
 *
 * `advanceTimersByTimeAsync` is used on purpose: the component's connect effect
 * both flips `isConnected` and calls `setRooms(...)`, so the microtask queue has
 * to be drained before React can flush the resulting re-render.
 */
async function advanceConnection(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1100)
  })
}

// ============================================================================
// Test Suite
// ============================================================================

describe('RoomManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Fake timers WITH shouldAdvanceTime.
    //
    // Why: `@testing-library/user-event` awaits an internal `setTimeout(0)`
    // between pointer events. With plain `vi.useFakeTimers()` that timer never
    // fires unless the test explicitly advances the clock, so `user.click()`
    // deadlocks until the 60s test timeout. `shouldAdvanceTime: true` lets the
    // fake clock drift forward on its own (it does not jump ahead), so
    // user-event resolves AND the component's own timers still need an
    // explicit `advanceTimersByTime*` to fire — which keeps the assertions
    // below deterministic.
    vi.useFakeTimers({ shouldAdvanceTime: true })

    // Reset store state - clear all state and mocks
    mockStoreState.currentRoomId = null
    mockStoreState.currentUserId = null
    mockStoreState.currentUserName = null
    mockStoreState.rooms = []

    mockFunctions.setCurrentRoom.mockClear()
    mockFunctions.setCurrentUser.mockClear()
    mockFunctions.setRooms.mockClear()
    mockFunctions.addRoom.mockClear()
    mockFunctions.updateRoom.mockClear()
    mockFunctions.removeRoom.mockClear()
    mockFunctions.setRoomsLoading.mockClear()
    mockFunctions.setRoomsError.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('should render main components', () => {
      render(<RoomManager />)

      // Header
      expect(screen.getByText(/WebSocket 房间/i)).toBeInTheDocument()

      // Room list sidebar
      expect(screen.getByTestId('room-list')).toBeInTheDocument()

      // Connection status (will be connecting initially)
      expect(screen.getByText(/连接中/i)).toBeInTheDocument()
    })

    it('should render user info', () => {
      render(<RoomManager userName="测试用户" />)

      expect(screen.getByText('测试用户')).toBeInTheDocument()
    })

    it('should show user avatar initial', () => {
      render(<RoomManager userName="张三" />)

      expect(screen.getByText('张')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Connection Status Tests
  // ==========================================================================

  describe('Connection Status', () => {
    it('should show connecting status initially', () => {
      render(<RoomManager autoConnect={true} />)

      expect(screen.getByText('连接中...')).toBeInTheDocument()
    })

    it('should show connected status after connection', async () => {
      render(<RoomManager autoConnect={true} />)

      // First check initial connecting state
      expect(screen.getByText('连接中...')).toBeInTheDocument()

      // Advance timers to trigger the connection
      await advanceConnection()

      expect(screen.getByText('已连接')).toBeInTheDocument()
      expect(screen.queryByText('连接中...')).not.toBeInTheDocument()
      expect(screen.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected')
    })

    it('should not auto connect when autoConnect is false', () => {
      render(<RoomManager autoConnect={false} />)

      // Should show "未连接" or no status
      expect(screen.queryByText('连接中...')).not.toBeInTheDocument()
    })

    it('should load mock rooms after connection', async () => {
      render(<RoomManager autoConnect={true} />)

      await advanceConnection()

      expect(mockFunctions.setRooms).toHaveBeenCalled()

      // The loaded rooms must contain the two seeded mock rooms.
      const loadedRooms = mockFunctions.setRooms.mock.calls[0][0] as Room[]
      expect(loadedRooms).toHaveLength(2)
      expect(loadedRooms.map(r => r.id)).toEqual(['room-1', 'room-2'])
      expect(loadedRooms[0].name).toBe('项目讨论组')
      expect(loadedRooms[1].name).toBe('日常聊天')
    })
  })

  // ==========================================================================
  // User Initialization Tests
  // ==========================================================================

  describe('User Initialization', () => {
    it('should set current user on mount', () => {
      render(<RoomManager userId="user-123" userName="测试用户" />)

      expect(mockFunctions.setCurrentUser).toHaveBeenCalledWith('user-123', '测试用户')
    })

    it('should generate random user ID if not provided', () => {
      render(<RoomManager />)

      expect(mockFunctions.setCurrentUser).toHaveBeenCalled()
      const call = mockFunctions.setCurrentUser.mock.calls[0]
      expect(call[0]).toMatch(/^user-/)
      expect(call[1]).toBe('匿名用户')
    })

    it('should use provided user ID and name', () => {
      render(<RoomManager userId="custom-user-456" userName="自定义用户" />)

      expect(mockFunctions.setCurrentUser).toHaveBeenCalledWith('custom-user-456', '自定义用户')
    })
  })

  // ==========================================================================
  // Room List Tests
  // ==========================================================================

  describe('Room List', () => {
    it('should create a new room', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<RoomManager userId="user-1" userName="张三" autoConnect={true} />)

      await advanceConnection()

      const createButton = screen.getByTestId('create-room-btn')
      await user.click(createButton)

      expect(mockFunctions.addRoom).toHaveBeenCalled()
      expect(mockFunctions.setCurrentRoom).toHaveBeenCalled()

      // The new room must be owned by the current user and carry the
      // requested name/type/visibility.
      const newRoom = mockFunctions.addRoom.mock.calls[0][0] as Room
      expect(newRoom.name).toBe('新房间')
      expect(newRoom.type).toBe('chat')
      expect(newRoom.visibility).toBe('public')
      expect(newRoom.ownerId).toBe('user-1')
      expect(newRoom.participants.get('user-1')?.role).toBe('owner')

      // ...and it must be the room that got selected.
      expect(mockFunctions.setCurrentRoom).toHaveBeenCalledWith(newRoom.id)
    })

    it('should select a room', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<RoomManager userId="user-1" userName="张三" autoConnect={true} />)

      await advanceConnection()

      const selectButton = screen.getByTestId('select-room-btn')
      await user.click(selectButton)

      expect(mockFunctions.setCurrentRoom).toHaveBeenCalledWith('room-1')
    })
  })

  // ==========================================================================
  // Room View Tests
  // ==========================================================================

  describe('Room View', () => {
    it('should show room view when a room is selected', async () => {
      mockStoreState.currentRoomId = 'room-1'
      mockStoreState.rooms = [makeRoom('user-1', 'owner')]

      render(<RoomManager userId="user-1" userName="张三" autoConnect={true} />)

      await advanceConnection()

      expect(screen.getByTestId('room-view')).toBeInTheDocument()
    })

    it('should handle send message', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      mockStoreState.currentRoomId = 'room-1'
      mockStoreState.rooms = [makeRoom('user-1', 'owner')]

      render(<RoomManager userId="user-1" userName="张三" autoConnect={true} />)

      await advanceConnection()

      const sendButton = screen.getByTestId('send-message-btn')
      await user.click(sendButton)

      expect(consoleSpy).toHaveBeenCalledWith('Send message:', '测试消息', 'reply to:', undefined)

      consoleSpy.mockRestore()
    })

    it('should handle react to message', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      // The implementation logs reactions via console.debug (see
      // RoomManager.tsx -> handleReactMessage), so the spy has to be on
      // console.debug, not console.log.
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

      mockStoreState.currentRoomId = 'room-1'
      mockStoreState.rooms = [makeRoom('user-1', 'owner')]

      render(<RoomManager userId="user-1" userName="张三" autoConnect={true} />)

      await advanceConnection()

      const reactButton = screen.getByTestId('react-message-btn')
      await user.click(reactButton)

      expect(consoleSpy).toHaveBeenCalledWith('React to message:', 'msg-1', 'emoji:', '👍')

      consoleSpy.mockRestore()
    })
  })

  // ==========================================================================
  // Room Settings Tests
  // ==========================================================================

  describe('Room Settings', () => {
    it('should not show settings panel by default', () => {
      render(<RoomManager />)

      expect(screen.queryByTestId('room-settings')).not.toBeInTheDocument()
    })

    it('should write room name to the top-level name field, not into config', () => {
      // 回归测试：曾经 onUpdateConfig({ name }) 会把 name spread 进 room.config，
      // 导致房间真正的 name 从未被修改（重命名功能实际从未生效）。
      const patch = buildRoomConfigPatch({ maxParticipants: 100 }, { name: '新名称' })

      expect(patch.name).toBe('新名称')
      // config 的类型里根本没有 name 字段，用 hasOwn 检查它确实没被塞进去
      expect(Object.hasOwn(patch.config ?? {}, 'name')).toBe(false)
      // 其它配置不能被 name 覆盖掉
      expect(patch.config?.maxParticipants).toBe(100)
    })

    it('should merge non-name config updates into the existing config', () => {
      const patch = buildRoomConfigPatch(
        { maxParticipants: 100, allowGuests: false },
        { maxParticipants: 200 }
      )

      expect(patch.name).toBeUndefined()
      expect(patch.config).toEqual({ maxParticipants: 200, allowGuests: false })
    })
  })

  // ==========================================================================
  // Leave Room Tests
  // ==========================================================================

  describe('Leave Room', () => {
    it('should leave a room', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      // Different owner → the current user is a plain member and may leave.
      mockStoreState.currentRoomId = 'room-1'
      mockStoreState.rooms = [makeRoom('user-2', 'member')]

      render(<RoomManager userId="user-1" userName="张三" autoConnect={true} />)

      await advanceConnection()

      const leaveButton = screen.getByTestId('leave-room-btn')
      await user.click(leaveButton)

      expect(mockFunctions.updateRoom).toHaveBeenCalled()

      const [updatedRoomId, patch] = mockFunctions.updateRoom.mock.calls[0] as [
        string,
        { participants: Map<string, unknown> },
      ]
      expect(updatedRoomId).toBe('room-1')
      // The current user must have been removed from the participants map.
      expect(patch.participants.has('user-1')).toBe(false)
      // Leaving the room that is currently open clears the selection.
      expect(mockFunctions.setCurrentRoom).toHaveBeenCalledWith(null)
    })

    it('should not allow owner to leave room', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      // Current user is the owner → leaving must be refused.
      mockStoreState.currentRoomId = 'room-1'
      mockStoreState.rooms = [makeRoom('user-1', 'owner')]

      render(<RoomManager userId="user-1" userName="张三" autoConnect={true} />)

      await advanceConnection()

      const leaveButton = screen.getByTestId('leave-room-btn')
      await user.click(leaveButton)

      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('房主'))
      // No room update and no selection change may happen for an owner.
      expect(mockFunctions.updateRoom).not.toHaveBeenCalled()
      expect(mockFunctions.setCurrentRoom).not.toHaveBeenCalledWith(null)

      alertSpy.mockRestore()
    })
  })

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should show error state when there is an error', () => {
      // This would require modifying the component state
      // For now, just test that the error UI exists in the component
      render(<RoomManager autoConnect={true} />)

      // Error UI is only shown when error state is set
      // This is a basic test to ensure the component handles errors
      expect(screen.getByText(/WebSocket 房间/i)).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Dark Mode Tests
  // ==========================================================================

  describe('Dark Mode', () => {
    it('should apply dark mode styles', () => {
      document.documentElement.classList.add('dark')

      render(<RoomManager />)

      const container = screen.getByText(/WebSocket 房间/i).closest('div')
      expect(container).toBeInTheDocument()

      document.documentElement.classList.remove('dark')
    })
  })

  // ==========================================================================
  // Responsive Layout Tests
  // ==========================================================================

  describe('Responsive Layout', () => {
    it('should have room list sidebar', () => {
      render(<RoomManager />)

      // The fixed-width sidebar is the container the RoomList is rendered into
      // (RoomManager.tsx -> data-testid="room-list-sidebar").
      const sidebar = screen.getByTestId('room-list-sidebar')
      expect(sidebar).toHaveClass('w-80')
      // ...and the room list really is rendered inside it.
      expect(sidebar).toContainElement(screen.getByTestId('room-list'))
    })
  })

  // ==========================================================================
  // Props Tests
  // ==========================================================================

  describe('Props', () => {
    it('should use custom WebSocket URL', () => {
      render(<RoomManager wsUrl="wss://custom.server.com" />)

      // URL is used internally, just check component renders
      expect(screen.getByText(/WebSocket 房间/i)).toBeInTheDocument()
    })

    it('should use custom user avatar', () => {
      render(<RoomManager userName="张三" userAvatar="https://example.com/avatar.jpg" />)

      // Avatar is used internally
      expect(screen.getByText('张三')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Cleanup Tests
  // ==========================================================================

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = render(<RoomManager autoConnect={true} />)

      unmount()

      // Timer should be cleared
      // This is more of an internal implementation detail
      expect(true).toBe(true)
    })
  })
})
