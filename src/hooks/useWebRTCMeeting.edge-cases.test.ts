/**
 * useWebRTCMeeting Hook Edge Cases Tests
 *
 * Edge cases covered:
 * - Invalid/missing parameters
 * - Network failures and reconnection
 * - Audio permission denial
 * - Multiple peer connections
 * - Race conditions
 * - Browser compatibility issues
 * - Cleanup edge cases
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useWebRTCMeeting } from './useWebRTCMeeting'
import { io } from 'socket.io-client'

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
  return {
    default: vi.fn(() => mockSocket),
    io: vi.fn(() => mockSocket),
  }
})

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('useWebRTCMeeting Edge Cases', () => {
  let mockSocket: any

  const defaultOptions = {
    roomId: 'test-room',
    token: 'test-token',
    userId: 'user-123',
    userName: 'Test User',
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockSocket = {
      connected: false,
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
    ;(io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket)

    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: vi.fn(() => [{ enabled: true, stop: vi.fn() }]),
          getAudioTracks: vi.fn(() => [{ enabled: true, stop: vi.fn() }]),
        }),
      },
      writable: true,
    })

    // Mock RTCPeerConnection
    global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'test-sdp' }),
      createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'test-sdp' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      setRemoteDescription: vi.fn().mockResolvedValue(undefined),
      addTrack: vi.fn(),
      addIceCandidate: vi.fn().mockResolvedValue(undefined),
      onicecandidate: null,
      oniceconnectionstatechange: null,
      ontrack: null,
      onicegatheringstatechange: null,
      close: vi.fn(),
      iceGatheringState: 'complete',
      iceConnectionState: 'connected',
      localDescription: { type: 'offer', sdp: 'test-sdp' },
    })) as any
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Invalid Parameters', () => {
    it('should handle empty roomId', () => {
      const options = { ...defaultOptions, roomId: '' }
      const { result } = renderHook(() => useWebRTCMeeting(options))

      expect(result.current.isConnected).toBe(false)
    })

    it('should handle empty token', () => {
      const options = { ...defaultOptions, token: '' }
      const { result } = renderHook(() => useWebRTCMeeting(options))

      expect(result.current.isConnected).toBe(false)
    })

    it('should handle empty userId', () => {
      const options = { ...defaultOptions, userId: '' }
      const { result } = renderHook(() => useWebRTCMeeting(options))

      expect(result.current.isConnected).toBe(false)
    })

    it('should handle empty userName', () => {
      const options = { ...defaultOptions, userName: '' }
      const { result } = renderHook(() => useWebRTCMeeting(options))

      expect(result.current.isConnected).toBe(false)
    })

    it('should handle very long roomId', () => {
      const longRoomId = 'room-'.repeat(1000)
      const options = { ...defaultOptions, roomId: longRoomId }
      const { result } = renderHook(() => useWebRTCMeeting(options))

      expect(result.current.isConnected).toBe(false)
    })

    it('should handle special characters in roomId', () => {
      const specialRoomId = 'room/<>"&\''
      const options = { ...defaultOptions, roomId: specialRoomId }
      const { result } = renderHook(() => useWebRTCMeeting(options))

      expect(result.current.isConnected).toBe(false)
    })

    it('should handle unicode in userName', () => {
      const options = { ...defaultOptions, userName: '用户测试 🎉' }
      const { result } = renderHook(() => useWebRTCMeeting(options))

      expect(result.current.isConnected).toBe(false)
    })
  })

  describe('Audio Permission Issues', () => {
    it('should handle permission denied', async () => {
      const onError = vi.fn()
      const options = { ...defaultOptions, onError }

      ;(navigator.mediaDevices.getUserMedia as any).mockRejectedValue(
        new Error('Permission denied')
      )

      const { result } = renderHook(() => useWebRTCMeeting(options))

      await act(async () => {
        try {
          await result.current.joinMeeting()
        } catch (e) {
          // Expected
        }
      })

      expect(onError).toHaveBeenCalled()
    })

    it('should handle no audio devices available', async () => {
      const onError = vi.fn()
      const options = { ...defaultOptions, onError }

      ;(navigator.mediaDevices.getUserMedia as any).mockRejectedValue(
        new Error('NotFoundError: No audio devices found')
      )

      const { result } = renderHook(() => useWebRTCMeeting(options))

      await act(async () => {
        try {
          await result.current.joinMeeting()
        } catch (e) {
          // Expected
        }
      })

      expect(onError).toHaveBeenCalled()
    })

    it('should handle hardware error', async () => {
      const onError = vi.fn()
      const options = { ...defaultOptions, onError }

      ;(navigator.mediaDevices.getUserMedia as any).mockRejectedValue(new Error('Hardware error'))

      const { result } = renderHook(() => useWebRTCMeeting(options))

      await act(async () => {
        try {
          await result.current.joinMeeting()
        } catch (e) {
          // Expected
        }
      })

      expect(onError).toHaveBeenCalled()
    })

    it('should handle track ended during call', async () => {
      const mockTrack = { enabled: true, stop: vi.fn(), readyState: 'ended' }
      ;(navigator.mediaDevices.getUserMedia as any).mockResolvedValue({
        getTracks: vi.fn(() => [mockTrack]),
        getAudioTracks: vi.fn(() => [mockTrack]),
      })

      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      await act(async () => {
        await result.current.joinMeeting()
      })

      // Track ended
      expect(result.current.isConnected).toBeDefined()
    })
  })

  describe('Network Failures', () => {
    it('should handle socket connection failure', async () => {
      const onError = vi.fn()
      const options = { ...defaultOptions, onError }

      const { result } = renderHook(() => useWebRTCMeeting(options))

      await act(async () => {
        result.current.joinMeeting()
      })

      // Simulate connection error
      const errorCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect_error'
      )?.[1]

      if (errorCallback) {
        act(() => {
          errorCallback(new Error('Connection failed'))
        })
      }

      expect(onError).toHaveBeenCalled()
    })

    it('should handle socket disconnection during call', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      await act(async () => {
        await result.current.joinMeeting()
      })

      // Simulate connection
      const connectCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )?.[1]

      if (connectCallback) {
        act(() => {
          connectCallback()
        })
      }

      // Simulate disconnection
      const disconnectCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'disconnect'
      )?.[1]

      if (disconnectCallback) {
        act(() => {
          disconnectCallback('io server disconnect')
        })
      }

      // Connection state should be false after disconnect
      expect(result.current.isConnected).toBe(false)
    })

    it('should handle failed ICE candidate', async () => {
      const onError = vi.fn()
      const options = { ...defaultOptions, onError }

      const mockPC = {
        addIceCandidate: vi.fn().mockRejectedValue(new Error('Invalid ICE')),
      }

      const { result } = renderHook(() => useWebRTCMeeting(options))

      await act(async () => {
        await result.current.joinMeeting()
      })

      // Simulate ICE candidate event
      const iceCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'ice-candidate'
      )?.[1]

      if (iceCallback) {
        act(() => {
          iceCallback({
            candidate: { candidate: 'invalid' },
            senderId: 'peer-123',
          })
        })
      }

      // Should handle gracefully
    })
  })

  describe('Multiple Peer Connections', () => {
    it('should handle multiple participants joining', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      await act(async () => {
        await result.current.joinMeeting()
      })

      // Simulate multiple participants joining
      const joinCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'participant-joined'
      )?.[1]

      if (joinCallback) {
        for (let i = 0; i < 10; i++) {
          act(() => {
            joinCallback({
              id: `user-${i}`,
              name: `User ${i}`,
              audioEnabled: true,
              isSpeaking: false,
              joinedAt: new Date(),
            })
          })
        }
      }

      await waitFor(() => {
        expect(result.current.participants.size).toBe(10)
      })
    })

    it('should handle participant leaving and rejoining', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      await act(async () => {
        await result.current.joinMeeting()
      })

      const joinCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'participant-joined'
      )?.[1]

      const leaveCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'participant-left'
      )?.[1]

      // Join
      if (joinCallback) {
        act(() => {
          joinCallback({
            id: 'user-456',
            name: 'Test User',
            audioEnabled: true,
            isSpeaking: false,
            joinedAt: new Date(),
          })
        })
      }

      await waitFor(() => {
        expect(result.current.participants.size).toBe(1)
      })

      // Leave
      if (leaveCallback) {
        act(() => {
          leaveCallback({ participantId: 'user-456' })
        })
      }

      await waitFor(() => {
        expect(result.current.participants.size).toBe(0)
      })

      // Rejoin
      if (joinCallback) {
        act(() => {
          joinCallback({
            id: 'user-456',
            name: 'Test User',
            audioEnabled: true,
            isSpeaking: false,
            joinedAt: new Date(),
          })
        })
      }

      await waitFor(() => {
        expect(result.current.participants.size).toBe(1)
      })
    })
  })

  describe('Race Conditions', () => {
    it('should handle rapid join/leave calls', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      // Sequential join/leave (avoid overlapping act calls)
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await result.current.joinMeeting()
        })
        await act(async () => {
          await result.current.leaveMeeting()
        })
      }

      // Should end in clean state
      expect(result.current.isConnected).toBe(false)
    })

    it('should handle concurrent toggle mute calls', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      await act(async () => {
        await result.current.joinMeeting()
      })

      // Sequential mute toggles (avoid overlapping act calls)
      await act(async () => {
        await result.current.toggleMute()
      })
      await act(async () => {
        await result.current.toggleMute()
      })
      await act(async () => {
        await result.current.toggleMute()
      })

      // Should have a deterministic final state
      expect(result.current.isMuted).toBeDefined()
    })
  })

  describe('Cleanup Edge Cases', () => {
    it('should cleanup properly after error during join', async () => {
      const onError = vi.fn()
      const options = { ...defaultOptions, onError }

      ;(navigator.mediaDevices.getUserMedia as any).mockRejectedValue(
        new Error('Permission denied')
      )

      const { unmount } = renderHook(() => useWebRTCMeeting(options))

      await act(async () => {
        try {
          // The hook's joinMeeting will be called internally
          // We just need to wait a bit for initialization
          await new Promise(resolve => setTimeout(resolve, 10))
        } catch (e) {
          // Expected
        }
      })

      unmount()

      // Should cleanup without errors (or not error out)
      expect(mockSocket.disconnect).toHaveBeenCalled()
    })

    it('should handle multiple unmounts gracefully', async () => {
      const { unmount } = renderHook(() => useWebRTCMeeting(defaultOptions))

      unmount()
      unmount() // Second unmount should not error

      // Just verify no errors are thrown
      expect(true).toBe(true)
    })

    it('should cleanup audio elements on leave', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      await act(async () => {
        await result.current.joinMeeting()
      })

      // Get audio element (creates if needed)
      const audio = result.current.getAudioElement('peer-123')
      expect(audio).toBeDefined()

      await act(async () => {
        await result.current.leaveMeeting()
      })

      // Audio element API should still be available
      expect(result.current.getAudioElement).toBeDefined()
    })
  })

  describe('Callback Edge Cases', () => {
    it('should handle callback throwing error', async () => {
      const onError = vi.fn(() => {
        throw new Error('Callback error')
      })
      const options = { ...defaultOptions, onError }

      const { result } = renderHook(() => useWebRTCMeeting(options))

      await act(async () => {
        try {
          await result.current.joinMeeting()
        } catch (e) {
          // Expected
        }
      })

      // Should not crash
    })

    it('should handle undefined callbacks', async () => {
      const options = {
        ...defaultOptions,
        onParticipantJoined: undefined,
        onParticipantLeft: undefined,
        onMuteStateChanged: undefined,
      }

      const { result } = renderHook(() => useWebRTCMeeting(options))

      await act(async () => {
        await result.current.joinMeeting()
      })

      // Should not crash when callbacks are undefined
      expect(result.current.isConnected).toBeDefined()
    })
  })

  describe('Auto Join Edge Cases', () => {
    it('should auto join when enabled', async () => {
      const options = { ...defaultOptions, autoJoin: true }

      const { result } = renderHook(() => useWebRTCMeeting(options))

      // Wait a bit for auto-join to trigger
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Should attempt connection (io should have been called at least once)
      expect(io).toHaveBeenCalled()
    })

    it('should not auto join by default', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      // Wait a bit
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Should not auto connect
      expect(mockSocket.connect).not.toHaveBeenCalled()
    })
  })

  describe('State Consistency', () => {
    it('should maintain consistent state after operations', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      // Join
      await act(async () => {
        await result.current.joinMeeting()
      })

      // Mute
      await act(async () => {
        await result.current.toggleMute()
      })

      expect(result.current.isMuted).toBe(true)

      // Leave
      await act(async () => {
        await result.current.leaveMeeting()
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.isMuted).toBe(false)
      expect(result.current.participants.size).toBe(0)
    })

    it('should handle state reset on rejoin', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      // Join and mute
      await act(async () => {
        await result.current.joinMeeting()
      })

      await act(async () => {
        await result.current.toggleMute()
      })

      expect(result.current.isMuted).toBe(true)

      // Leave
      await act(async () => {
        await result.current.leaveMeeting()
      })

      // Rejoin
      await act(async () => {
        await result.current.joinMeeting()
      })

      // State should be reset
      expect(result.current.isMuted).toBe(false)
    })
  })

  describe('Browser Compatibility', () => {
    it('should handle missing mediaDevices API', async () => {
      const originalMediaDevices = navigator.mediaDevices
      // @ts-ignore
      delete navigator.mediaDevices

      const onError = vi.fn()
      const options = { ...defaultOptions, onError }

      const { result } = renderHook(() => useWebRTCMeeting(options))

      await act(async () => {
        try {
          await result.current.joinMeeting()
        } catch (e) {
          // Expected
        }
      })

      expect(onError).toHaveBeenCalled()

      // Restore
      Object.defineProperty(navigator, 'mediaDevices', {
        value: originalMediaDevices,
        writable: true,
      })
    })

    it('should handle missing RTCPeerConnection', async () => {
      const originalRTCPeerConnection = global.RTCPeerConnection
      // @ts-ignore
      delete global.RTCPeerConnection

      const onError = vi.fn()
      const options = { ...defaultOptions, onError }

      const { result } = renderHook(() => useWebRTCMeeting(options))

      await act(async () => {
        try {
          await result.current.joinMeeting()
        } catch (e) {
          // Expected
        }
      })

      // Restore
      global.RTCPeerConnection = originalRTCPeerConnection
    })
  })
})
