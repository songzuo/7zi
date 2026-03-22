/**
 * useWebRTCMeeting Hook
 * WebRTC meeting functionality
 */

'use client';

import { useState, useCallback } from 'react';

export function useWebRTCMeeting() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinMeeting = useCallback((roomId: string) => {
    console.log('Joining meeting:', roomId);
    setIsConnected(true);
  }, []);

  const leaveMeeting = useCallback(() => {
    console.log('Leaving meeting');
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    error,
    joinMeeting,
    leaveMeeting,
  };
}
