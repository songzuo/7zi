/**
 * useWebRTCMeeting Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useWebRTCMeeting } from './useWebRTCMeeting';

describe('useWebRTCMeeting', () => {
  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useWebRTCMeeting());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.joinMeeting).toBeDefined();
      expect(result.current.leaveMeeting).toBeDefined();
    });

    it('should have all required functions', () => {
      const { result } = renderHook(() => useWebRTCMeeting());

      expect(typeof result.current.joinMeeting).toBe('function');
      expect(typeof result.current.leaveMeeting).toBe('function');
    });
  });

  describe('joinMeeting', () => {
    it('should set isConnected to true when joining a meeting', () => {
      const { result } = renderHook(() => useWebRTCMeeting());

      act(() => {
        result.current.joinMeeting('room-123');
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should log room name when joining', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const { result } = renderHook(() => useWebRTCMeeting());

      act(() => {
        result.current.joinMeeting('test-room');
      });

      expect(consoleSpy).toHaveBeenCalledWith('Joining meeting:', 'test-room');
      consoleSpy.mockRestore();
    });

    it('should handle different room IDs', () => {
      const { result } = renderHook(() => useWebRTCMeeting());

      act(() => {
        result.current.joinMeeting('room-1');
      });

      expect(result.current.isConnected).toBe(true);

      act(() => {
        result.current.joinMeeting('room-2');
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should handle empty room ID', () => {
      const { result } = renderHook(() => useWebRTCMeeting());

      act(() => {
        result.current.joinMeeting('');
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should not set error when joining', () => {
      const { result } = renderHook(() => useWebRTCMeeting());

      act(() => {
        result.current.joinMeeting('room-123');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('leaveMeeting', () => {
    it('should set isConnected to false when leaving a meeting', () => {
      const { result } = renderHook(() => useWebRTCMeeting());

      // First join
      act(() => {
        result.current.joinMeeting('room-123');
      });

      expect(result.current.isConnected).toBe(true);

      // Then leave
      act(() => {
        result.current.leaveMeeting();
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should log when leaving a meeting', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const { result } = renderHook(() => useWebRTCMeeting());

      act(() => {
        result.current.joinMeeting('room-123');
        result.current.leaveMeeting();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Leaving meeting');
      consoleSpy.mockRestore();
    });

    it('should handle leaving when not connected', () => {
      const { result } = renderHook(() => useWebRTCMeeting());

      expect(result.current.isConnected).toBe(false);

      act(() => {
        result.current.leaveMeeting();
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should handle multiple join/leave cycles', () => {
      const { result } = renderHook(() => useWebRTCMeeting());

      // Cycle 1
      act(() => {
        result.current.joinMeeting('room-1');
      });
      expect(result.current.isConnected).toBe(true);

      act(() => {
        result.current.leaveMeeting();
      });
      expect(result.current.isConnected).toBe(false);

      // Cycle 2
      act(() => {
        result.current.joinMeeting('room-2');
      });
      expect(result.current.isConnected).toBe(true);

      act(() => {
        result.current.leaveMeeting();
      });
      expect(result.current.isConnected).toBe(false);
    });

    it('should not set error when leaving', () => {
      const { result } = renderHook(() => useWebRTCMeeting());

      act(() => {
        result.current.joinMeeting('room-123');
        result.current.leaveMeeting();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should have error state initially null', () => {
      const { result } = renderHook(() => useWebRTCMeeting());

      expect(result.current.error).toBeNull();
    });

    it('should maintain error state through operations', () => {
      const { result } = renderHook(() => useWebRTCMeeting());

      act(() => {
        result.current.joinMeeting('room-123');
      });

      expect(result.current.error).toBeNull();

      act(() => {
        result.current.leaveMeeting();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('state persistence', () => {
    it('should maintain state across hook calls', () => {
      const { result } = renderHook(() => useWebRTCMeeting());

      act(() => {
        result.current.joinMeeting('room-123');
      });

      expect(result.current.isConnected).toBe(true);

      // Verify state is still true
      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle joining with special characters in room ID', () => {
      const { result } = renderHook(() => useWebRTCMeeting());

      act(() => {
        result.current.joinMeeting('room-with-special-@#$-chars');
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should handle joining with long room ID', () => {
      const { result } = renderHook(() => useWebRTCMeeting());
      const longRoomId = 'a'.repeat(1000);

      act(() => {
        result.current.joinMeeting(longRoomId);
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should handle rapid join/leave calls', () => {
      const { result } = renderHook(() => useWebRTCMeeting());

      // Rapid succession
      act(() => {
        result.current.joinMeeting('room-1');
        result.current.leaveMeeting();
        result.current.joinMeeting('room-2');
        result.current.leaveMeeting();
        result.current.joinMeeting('room-3');
      });

      expect(result.current.isConnected).toBe(true);
    });
  });
});
