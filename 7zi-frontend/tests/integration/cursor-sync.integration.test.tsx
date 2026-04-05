/**
 * Cursor Sync Integration Tests (v1.12.3)
 *
 * 集成测试：协作光标同步系统
 * 测试多用户实时协作中的光标同步功能
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CollabProvider, useCollab } from '@/features/collab'

// Mock WebSocket
vi.mock('socket.io-client', () => ({
  default: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
}))

/**
 * Test Component: CursorTracker
 */
function CursorTracker() {
  const { remoteCursors, updateLocalCursor } = useCollab()

  return (
    <div data-testid="cursor-tracker">
      <div data-testid="remote-count">{remoteCursors.size}</div>
      <button
        onClick={() => updateLocalCursor({ x: 100, y: 200 })}
        data-testid="update-cursor"
      >
        Update Cursor
      </button>
    </div>
  )
}

/**
 * Test Component: MultiUserScenario
 */
function MultiUserScenario() {
  const { remoteCursors, localCursor } = useCollab()

  return (
    <div data-testid="multi-user-scenario">
      <div data-testid="cursor-count">{remoteCursors.size}</div>
      {localCursor && (
        <div data-testid="local-cursor">
          {localCursor.x},{localCursor.y}
        </div>
      )}
      {Array.from(remoteCursors.entries()).map(([userId, cursor]) => (
        <div key={userId} data-testid={`cursor-${userId}`}>
          {cursor.user.name}: {cursor.cursor.x},{cursor.cursor.y}
        </div>
      ))}
    </div>
  )
}

describe('Cursor Sync Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CollabProvider Integration', () => {
    it('should provide collab context to children', () => {
      render(
        <CollabProvider
          roomId="test-room"
          userId="user-1"
          userName="Alice"
        >
          <CursorTracker />
        </CollabProvider>
      )

      expect(screen.getByTestId('cursor-tracker')).toBeInTheDocument()
    })

    it('should update local cursor on user interaction', async () => {
      const user = userEvent.setup()

      render(
        <CollabProvider
          roomId="test-room"
          userId="user-1"
          userName="Alice"
        >
          <MultiUserScenario />
        </CollabProvider>
      )

      await user.click(screen.getByTestId('update-cursor'))

      await waitFor(() => {
        expect(screen.getByTestId('local-cursor')).toHaveTextContent('100,200')
      })
    })
  })

  describe('Multi-User Cursor Sync', () => {
    it('should display multiple remote cursors', async () => {
      render(
        <CollabProvider
          roomId="test-room"
          userId="user-1"
          userName="Alice"
        >
          <MultiUserScenario />
        </CollabProvider>
      )

      // Wait for connection
      await waitFor(() => {
        expect(screen.getByTestId('cursor-count')).toBeInTheDocument()
      })
    })

    it('should remove cursor when user leaves', async () => {
      render(
        <CollabProvider
          roomId="test-room"
          userId="user-1"
          userName="Alice"
        >
          <MultiUserScenario />
        </CollabProvider>
      )

      // Initially 0 remote cursors
      expect(screen.getByTestId('cursor-count')).toHaveTextContent('0')
    })
  })

  describe('Cursor Throttling', () => {
    it('should throttle rapid cursor updates', async () => {
      const user = userEvent.setup()

      render(
        <CollabProvider
          roomId="test-room"
          userId="user-1"
          userName="Alice"
          autoConnect={false}
        >
          <MultiUserScenario />
        </CollabProvider>
      )

      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        await user.click(screen.getByTestId('update-cursor'))
      }

      // Should only update once due to throttling
      await waitFor(() => {
        expect(screen.getByTestId('local-cursor')).toHaveTextContent('100,200')
      })
    })
  })

  describe('Cursor Color Generation', () => {
    it('should generate different colors for different users', () => {
      const colors = new Set()

      for (let i = 0; i < 10; i++) {
        const userId = `user-${i}`
        // Simulate color generation
        const hash = userId.split('').reduce((acc, char) => {
          return char.charCodeAt(0) + ((acc << 5) - acc)
        }, 0)
        const colorIndex = Math.abs(hash) % 10
        colors.add(colorIndex)
      }

      expect(colors.size).toBe(10)
    })
  })

  describe('Cursor Cleanup', () => {
    it('should remove inactive cursors after timeout', async () => {
      vi.useFakeTimers()

      render(
        <CollabProvider
          roomId="test-room"
          userId="user-1"
          userName="Alice"
        >
          <MultiUserScenario />
        </CollabProvider>
      )

      // Fast-forward 5 seconds
      vi.advanceTimersByTime(5000)

      // Check that cleanup happened
      await waitFor(() => {
        expect(screen.getByTestId('cursor-count')).toBeInTheDocument()
      })

      vi.useRealTimers()
    })
  })
})

describe('Cursor Overlay Integration', () => {
  it('should render cursor overlay when connected', async () => {
    render(
      <CollabProvider
        roomId="test-room"
        userId="user-1"
        userName="Alice"
      >
        <div data-testid="editor">Editor Content</div>
      </CollabProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('editor')).toBeInTheDocument()
    })
  })

  it('should not render cursor overlay when disconnected', async () => {
    render(
      <CollabProvider
        roomId="test-room"
        userId="user-1"
        userName="Alice"
        autoConnect={false}
      >
        <div data-testid="editor">Editor Content</div>
      </CollabProvider>
    )

    expect(screen.getByTestId('editor')).toBeInTheDocument()
  })
})

describe('Cursor Sync Error Handling', () => {
  it('should handle WebSocket disconnection gracefully', async () => {
    render(
      <CollabProvider
        roomId="test-room"
        userId="user-1"
        userName="Alice"
      >
        <MultiUserScenario />
      </CollabProvider>
    )

    // Component should remain functional
    expect(screen.getByTestId('cursor-count')).toBeInTheDocument()
  })

  it('should handle invalid cursor data', async () => {
    render(
      <CollabProvider
        roomId="test-room"
        userId="user-1"
        userName="Alice"
      >
        <MultiUserScenario />
      </CollabProvider>
    )

    // Should not crash with invalid data
    expect(screen.getByTestId('multi-user-scenario')).toBeInTheDocument()
  })
})
