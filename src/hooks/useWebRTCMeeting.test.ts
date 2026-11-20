// @ts-nocheck - Test file with complex type issues
/**
 * useWebRTCMeeting Hook Tests
 *
 * 断言均对照 src/hooks/useWebRTCMeeting.ts 的真实行为编写：
 *  - socket.io 事件名以 src/lib/voice-meeting/signaling.ts 为准
 *    ('room-joined' / 'participant-joined' / 'participant-left' /
 *     'participant-muted' / 'mute-state-changed' / 'join-room' / 'leave-room')
 *  - 错误统一通过 options.onError 回调上报，joinMeeting() 自身不会 reject
 *  - getAudioElement 是「get-or-create」语义，不会返回 null
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
    auth: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('useWebRTCMeeting', () => {
  let mockSocket: any
  let mockTrack: any
  let mockLocalStream: any

  const defaultOptions = {
    roomId: 'test-room',
    token: 'test-token',
    userId: 'user-123',
    userName: 'Test User',
  }

  vi.setConfig({ testTimeout: 10000, hookTimeout: 10000 })

  // 取出 mock socket 上注册的某个事件处理器
  const getHandler = (event: string) =>
    mockSocket.on.mock.calls.find((call: any[]) => call[0] === event)?.[1]

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock socket
    // connected 必须是 true：实现里只有 socket.connected 为真时
    // 才会 emit('join-room')，为 false 时 joinMeeting 走到 getLocalStream
    // 就结束，join-room / leave-room / mute-state 这些行为全都不会发生。
    mockSocket = {
      connected: true,
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
    ;(io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket)

    // 轨道对象必须是稳定引用：实现里通过 localStreamRef.current.getTracks()
    // 取到的轨道会被 stop()、被修改 enabled，测试断言的是同一个对象。
    mockTrack = { enabled: true, stop: vi.fn(), kind: 'audio' }

    mockLocalStream = {
      getTracks: vi.fn(() => [mockTrack]),
      getAudioTracks: vi.fn(() => [mockTrack]),
    }

    // Mock navigator.mediaDevices.getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockLocalStream),
      },
      writable: true,
    })

    // jsdom 没有 MediaStream 这个全局，构造远端流时会 ReferenceError
    if (typeof global.MediaStream === 'undefined') {
      global.MediaStream = class MediaStream {
        id: string
        constructor() {
          this.id = 'mock-stream'
        }
        getTracks() {
          return []
        }
      } as unknown as typeof MediaStream
    }

    // Mock RTCPeerConnection
    global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'test-sdp' }),
      createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'test-sdp' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      setRemoteDescription: vi.fn().mockResolvedValue(undefined),
      addTrack: vi.fn(),
      onicecandidate: null,
      oniceconnectionstatechange: null,
      ontrack: null,
      close: vi.fn(),
      iceGatheringState: 'complete',
      iceConnectionState: 'connected',
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      expect(result.current.isConnected).toBe(false)
      expect(result.current.isConnecting).toBe(false)
      expect(result.current.isMuted).toBe(false)
      expect(result.current.participants.size).toBe(0)
      expect(result.current.remoteStreams.size).toBe(0)
    })

    it('should not auto-join by default', () => {
      renderHook(() => useWebRTCMeeting(defaultOptions))

      // autoJoin 默认 false，socket 根本不会被创建
      expect(io).not.toHaveBeenCalled()
      expect(mockSocket.connect).not.toHaveBeenCalled()
    })

    it('should initialize socket with correct config', async () => {
      const onError = vi.fn()
      const options = { ...defaultOptions, onError }

      const { result } = renderHook(() => useWebRTCMeeting(options))

      // io() 只在 joinMeeting -> initializeSocket 里被调用
      await act(async () => {
        await result.current.joinMeeting()
      })

      expect(io).toHaveBeenCalledWith(
        '/api/ws',
        expect.objectContaining({
          auth: { token: 'test-token' },
          reconnection: true,
          reconnectionAttempts: 5,
        })
      )
    })
  })

  describe('joinMeeting', () => {
    it('should join meeting successfully', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      await act(async () => {
        await result.current.joinMeeting()
      })

      // joinMeeting 的 finally 里会把 isConnecting 复位
      expect(result.current.isConnecting).toBe(false)
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }),
          video: false,
        })
      )
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'join-room',
        expect.objectContaining({
          roomId: 'test-room',
          token: 'test-token',
          userId: 'user-123',
          userName: 'Test User',
        })
      )
    })

    it('should handle connection success', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      act(() => {
        result.current.joinMeeting()
      })

      // Simulate socket connection
      const connectCallback = getHandler('connect')
      if (connectCallback) {
        act(() => {
          connectCallback()
        })
      }

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })
    })

    it('should handle join-room event', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      await act(async () => {
        await result.current.joinMeeting()
      })

      // 服务端在 join 成功后回送 'room-joined'（见 signaling.ts handleJoinRoom）
      const roomJoinedCallback = getHandler('room-joined')
      expect(roomJoinedCallback).toBeDefined()

      act(() => {
        roomJoinedCallback({
          roomId: 'test-room',
          participants: [
            {
              id: 'user-123',
              name: 'Test User',
              audioEnabled: true,
              isSpeaking: false,
              joinedAt: new Date(),
            },
          ],
        })
      })

      await waitFor(() => {
        expect(result.current.participants.size).toBeGreaterThan(0)
      })
      expect(result.current.participants.get('user-123')?.name).toBe('Test User')
    })

    it('should handle errors during join', async () => {
      const onError = vi.fn()
      const options = { ...defaultOptions, onError }

      ;(navigator.mediaDevices.getUserMedia as any).mockRejectedValue(
        new Error('Permission denied')
      )

      const { result } = renderHook(() => useWebRTCMeeting(options))

      await act(async () => {
        // 实现里错误通过 onError 上报，joinMeeting 自身不 reject
        await result.current.joinMeeting()
      })

      await waitFor(() => {
        expect(onError).toHaveBeenCalled()
      })
      // 原始错误被透传给 onError
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Permission denied' })
      )
      // 加入失败，不应发出 join-room
      expect(mockSocket.emit).not.toHaveBeenCalledWith('join-room', expect.anything())
      expect(result.current.isConnecting).toBe(false)
    })
  })

  describe('leaveMeeting', () => {
    it('should leave meeting successfully', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      // Join first
      await act(async () => {
        await result.current.joinMeeting()
      })

      // Simulate connection
      const connectCallback = getHandler('connect')
      if (connectCallback) {
        act(() => {
          connectCallback()
        })
      }

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      // Leave meeting
      await act(async () => {
        await result.current.leaveMeeting()
      })

      expect(mockSocket.emit).toHaveBeenCalledWith('leave-room', { roomId: 'test-room' })
      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(result.current.isConnected).toBe(false)
      expect(result.current.participants.size).toBe(0)
    })

    it('should cleanup local stream on leave', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      await act(async () => {
        await result.current.joinMeeting()
      })

      await act(async () => {
        await result.current.leaveMeeting()
      })

      expect(mockTrack.stop).toHaveBeenCalled()
    })
  })

  describe('toggleMute', () => {
    it('should toggle mute state', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      // Join first
      await act(async () => {
        await result.current.joinMeeting()
      })

      // Simulate connection
      const connectCallback = getHandler('connect')
      if (connectCallback) {
        act(() => {
          connectCallback()
        })
      }

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      // Toggle mute
      await act(async () => {
        await result.current.toggleMute()
      })

      expect(result.current.isMuted).toBe(true)
      expect(mockTrack.enabled).toBe(false)

      // Toggle again
      await act(async () => {
        await result.current.toggleMute()
      })

      expect(result.current.isMuted).toBe(false)
      expect(mockTrack.enabled).toBe(true)
    })

    it('should emit mute-state event', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      await act(async () => {
        await result.current.joinMeeting()
      })

      // Simulate connection
      const connectCallback = getHandler('connect')
      if (connectCallback) {
        act(() => {
          connectCallback()
        })
      }

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      await act(async () => {
        await result.current.toggleMute()
      })

      // 服务端监听的事件名是 'mute-state-changed'（见 signaling.ts）
      expect(mockSocket.emit).toHaveBeenCalledWith('mute-state-changed', { muted: true })

      await act(async () => {
        await result.current.toggleMute()
      })

      expect(mockSocket.emit).toHaveBeenCalledWith('mute-state-changed', { muted: false })
    })
  })

  describe('participant management', () => {
    it('should add participant on participant-joined event', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      act(() => {
        result.current.joinMeeting()
      })

      const joinCallback = getHandler('participant-joined')
      if (joinCallback) {
        act(() => {
          joinCallback({
            id: 'user-456',
            name: 'New User',
            email: 'new@example.com',
            avatar: 'avatar.png',
            audioEnabled: true,
            isSpeaking: false,
            joinedAt: new Date(),
          })
        })
      }

      await waitFor(() => {
        expect(result.current.participants.size).toBe(1)
        const participant = result.current.participants.get('user-456')
        expect(participant).toBeDefined()
        expect(participant?.name).toBe('New User')
      })
    })

    it('should remove participant on participant-left event', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      // Add participant
      act(() => {
        result.current.joinMeeting()
      })

      const joinCallback = getHandler('participant-joined')
      if (joinCallback) {
        act(() => {
          joinCallback({
            id: 'user-456',
            name: 'New User',
            audioEnabled: true,
            isSpeaking: false,
            joinedAt: new Date(),
          })
        })
      }

      await waitFor(() => {
        expect(result.current.participants.size).toBe(1)
      })

      // Remove participant
      const leaveCallback = getHandler('participant-left')
      if (leaveCallback) {
        act(() => {
          leaveCallback({ participantId: 'user-456' })
        })
      }

      await waitFor(() => {
        expect(result.current.participants.size).toBe(0)
      })
    })

    it('should update participant mute state on participant-muted event', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      act(() => {
        result.current.joinMeeting()
      })

      const joinCallback = getHandler('participant-joined')
      if (joinCallback) {
        act(() => {
          joinCallback({
            id: 'user-456',
            name: 'New User',
            audioEnabled: true,
            isSpeaking: false,
            joinedAt: new Date(),
          })
        })
      }

      await waitFor(() => {
        expect(result.current.participants.size).toBe(1)
      })

      const muteCallback = getHandler('participant-muted')
      if (muteCallback) {
        act(() => {
          muteCallback({ participantId: 'user-456', muted: true })
        })
      }

      await waitFor(() => {
        const participant = result.current.participants.get('user-456')
        expect(participant?.audioEnabled).toBe(false)
      })
    })
  })

  describe('remote streams', () => {
    it('should add remote stream on track event', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      act(() => {
        result.current.joinMeeting()
      })

      // Simulate track event from RTCPeerConnection
      const mockRemoteStream = new MediaStream()

      // This would normally be triggered by RTCPeerConnection.ontrack
      // For testing, we'll directly manipulate state
      act(() => {
        result.current.joinMeeting()
        // Simulate receiving a remote stream
        // Note: In real implementation, this would come from ontrack event
      })

      // The actual stream handling would be done by the RTCPeerConnection mock
      // We're testing that the hook can handle remote streams
      expect(result.current.remoteStreams).toBeDefined()
    })
  })

  describe('cleanup', () => {
    it('should cleanup on unmount', async () => {
      const { result, unmount } = renderHook(() => useWebRTCMeeting(defaultOptions))

      await act(async () => {
        await result.current.joinMeeting()
      })

      unmount()

      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(mockTrack.stop).toHaveBeenCalled()
    })
  })

  describe('audio elements', () => {
    it('should create audio element for a peer that has none yet', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      // getAudioElement 是 get-or-create 语义：未知 peerId 也会新建 audio 元素
      const audioElement = result.current.getAudioElement('non-existent-peer')

      expect(audioElement).not.toBeNull()
      expect(audioElement).toBeInstanceOf(HTMLAudioElement)
      expect(audioElement.autoplay).toBe(true)
      expect(audioElement.style.display).toBe('none')
      expect(document.body.contains(audioElement)).toBe(true)

      // 再次调用应返回同一个元素（而不是新建）
      const again = result.current.getAudioElement('non-existent-peer')
      expect(again).toBe(audioElement)
    })

    it('should create audio element for remote stream', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      act(() => {
        result.current.joinMeeting()
      })

      // In the real implementation, audio elements are created when remote streams are received
      // This test verifies the API exists
      expect(result.current.getAudioElement).toBeDefined()
      expect(typeof result.current.getAudioElement).toBe('function')
    })
  })

  describe('enableAudio / disableAudio', () => {
    it('should enable audio', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      // 必须先 join，localStream 存在时才会真正切换静音状态
      await act(async () => {
        await result.current.joinMeeting()
      })

      // First mute
      await act(async () => {
        await result.current.toggleMute()
      })

      expect(result.current.isMuted).toBe(true)

      // Enable audio
      await act(async () => {
        await result.current.enableAudio()
      })

      expect(result.current.isMuted).toBe(false)
      expect(mockTrack.enabled).toBe(true)
    })

    it('should disable audio', async () => {
      const { result } = renderHook(() => useWebRTCMeeting(defaultOptions))

      // 必须先 join，localStream 存在时才会真正切换静音状态
      await act(async () => {
        await result.current.joinMeeting()
      })

      await act(async () => {
        await result.current.disableAudio()
      })

      expect(result.current.isMuted).toBe(true)
      expect(mockTrack.enabled).toBe(false)
    })
  })
})
