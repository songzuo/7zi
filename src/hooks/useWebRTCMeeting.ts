'use client';

/**
 * WebRTC Audio Meeting Hook
 *
 * Manages WebRTC peer connections for voice meetings
 * Integrates with existing Socket.IO infrastructure
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// ============================================================================
// Types
// ============================================================================

export interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  stream: MediaStream | null;
}

export interface MeetingParticipant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  audioEnabled: boolean;
  isSpeaking: boolean;
  joinedAt: Date;
}

export interface UseWebRTCMeetingOptions {
  roomId: string;
  token: string;
  userId: string;
  userName: string;
  autoJoin?: boolean;
  onError?: (error: Error) => void;
  onParticipantJoined?: (participant: MeetingParticipant) => void;
  onParticipantLeft?: (participantId: string) => void;
  onMuteStateChanged?: (participantId: string, muted: boolean) => void;
}

export interface UseWebRTCMeetingReturn {
  // State
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  participants: Map<string, MeetingParticipant>;
  remoteStreams: Map<string, MediaStream>;

  // Actions
  joinMeeting: () => Promise<void>;
  leaveMeeting: () => Promise<void>;
  toggleMute: () => Promise<void>;
  enableAudio: () => Promise<void>;
  disableAudio: () => Promise<void>;

  // Audio elements
  getAudioElement: (peerId: string) => HTMLAudioElement | null;
}

// ============================================================================
// Constants
// ============================================================================

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
};

const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
  },
  video: false,
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useWebRTCMeeting(options: UseWebRTCMeetingOptions): UseWebRTCMeetingReturn {
  const {
    roomId,
    token,
    userId,
    userName,
    autoJoin = false,
    onError,
    onParticipantJoined,
    onParticipantLeft,
    onMuteStateChanged,
  } = options;

  // Refs for persistent values
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const isCleanupRef = useRef(false);

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<Map<string, MeetingParticipant>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  /**
   * Initialize Socket.IO connection
   */
  const initializeSocket = useCallback(async () => {
    if (socketRef.current?.connected) {
      return;
    }

    const socket = io('/api/ws', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on('connect', () => {
      console.log('[WebRTC] Socket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebRTC] Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[WebRTC] Socket connection error:', error);
      onError?.(new Error(`Socket connection error: ${error.message}`));
    });

    // Meeting room handlers
    socket.on('room-joined', (data: { roomId: string; participants: MeetingParticipant[] }) => {
      console.log('[WebRTC] Joined room:', data.roomId);
      const newParticipants = new Map<string, MeetingParticipant>();
      data.participants.forEach((p) => newParticipants.set(p.id, p));
      setParticipants(newParticipants);
    });

    socket.on('participant-joined', (participant: MeetingParticipant) => {
      console.log('[WebRTC] Participant joined:', participant.name);
      setParticipants((prev) => {
        const next = new Map(prev);
        next.set(participant.id, participant);
        return next;
      });
      onParticipantJoined?.(participant);
    });

    socket.on('participant-left', (data: { participantId: string }) => {
      console.log('[WebRTC] Participant left:', data.participantId);
      setParticipants((prev) => {
        const next = new Map(prev);
        next.delete(data.participantId);
        return next;
      });
      onParticipantLeft?.(data.participantId);

      // Clean up peer connection
      cleanupPeerConnection(data.participantId);
    });

    // Signaling handlers
    socket.on('offer', async (data: { sdp: RTCSessionDescriptionInit; senderId: string }) => {
      console.log('[WebRTC] Received offer from:', data.senderId);
      await handleOffer(data);
    });

    socket.on('answer', async (data: { sdp: RTCSessionDescriptionInit; senderId: string }) => {
      console.log('[WebRTC] Received answer from:', data.senderId);
      await handleAnswer(data);
    });

    socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit; senderId: string }) => {
      console.log('[WebRTC] Received ICE candidate from:', data.senderId);
      await handleIceCandidate(data);
    });

    socket.on('participant-muted', (data: { participantId: string; muted: boolean }) => {
      console.log('[WebRTC] Participant mute state changed:', data);
      setParticipants((prev) => {
        const next = new Map(prev);
        const participant = next.get(data.participantId);
        if (participant) {
          next.set(data.participantId, { ...participant, audioEnabled: !data.muted });
        }
        return next;
      });
      onMuteStateChanged?.(data.participantId, data.muted);
    });
  }, [token, onError, onParticipantJoined, onParticipantLeft, onMuteStateChanged]);

  /**
   * Get local audio stream
   */
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error('[WebRTC] Error getting local stream:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to get audio stream'));
      throw error;
    }
  }, [onError]);

  /**
   * Create peer connection
   */
  const createPeerConnection = useCallback(async (
    peerId: string,
    isInitiator: boolean = false
  ): Promise<RTCPeerConnection> => {
    console.log('[WebRTC] Creating peer connection for:', peerId, 'Initiator:', isInitiator);

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionsRef.current.set(peerId, pc);

    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.connected) {
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          senderId: userId,
          receiverId: peerId,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state for', peerId, ':', pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        cleanupPeerConnection(peerId);
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote stream from:', peerId);
      const remoteStream = event.streams[0];
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.set(peerId, remoteStream);
        return next;
      });
    };

    // Create offer if initiator
    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait for ICE gathering to complete
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === 'complete') {
            resolve();
          } else {
            pc.onicegatheringstatechange = () => {
              if (pc.iceGatheringState === 'complete') {
                resolve();
              }
            };
          }
        });

        // Send offer
        if (socketRef.current?.connected) {
          socketRef.current.emit('offer', {
            sdp: pc.localDescription,
            senderId: userId,
            receiverId: peerId,
          });
        }
      } catch (error) {
        console.error('[WebRTC] Error creating offer:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to create offer'));
      }
    }

    return pc;
  }, [userId, onError]);

  /**
   * Handle incoming offer
   */
  const handleOffer = useCallback(async (data: { sdp: RTCSessionDescriptionInit; senderId: string }) => {
    const { sdp, senderId } = data;

    let pc = peerConnectionsRef.current.get(senderId);
    if (!pc) {
      pc = await createPeerConnection(senderId, false);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Wait for ICE gathering to complete
      await new Promise<void>((resolve) => {
        if (pc!.iceGatheringState === 'complete') {
          resolve();
        } else {
          pc!.onicegatheringstatechange = () => {
            if (pc!.iceGatheringState === 'complete') {
              resolve();
            }
          };
        }
      });

      // Send answer
      if (socketRef.current?.connected) {
        socketRef.current.emit('answer', {
          sdp: pc.localDescription,
          senderId: userId,
          receiverId: senderId,
        });
      }
    } catch (error) {
      console.error('[WebRTC] Error handling offer:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to handle offer'));
    }
  }, [userId, createPeerConnection, onError]);

  /**
   * Handle incoming answer
   */
  const handleAnswer = useCallback(async (data: { sdp: RTCSessionDescriptionInit; senderId: string }) => {
    const { sdp, senderId } = data;
    const pc = peerConnectionsRef.current.get(senderId);

    if (!pc) {
      console.warn('[WebRTC] Received answer for unknown peer:', senderId);
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      console.log('[WebRTC] Set remote description for:', senderId);
    } catch (error) {
      console.error('[WebRTC] Error handling answer:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to handle answer'));
    }
  }, [onError]);

  /**
   * Handle ICE candidate
   */
  const handleIceCandidate = useCallback(async (data: { candidate: RTCIceCandidateInit; senderId: string }) => {
    const { candidate, senderId } = data;
    const pc = peerConnectionsRef.current.get(senderId);

    if (!pc) {
      console.warn('[WebRTC] Received ICE candidate for unknown peer:', senderId);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('[WebRTC] Added ICE candidate from:', senderId);
    } catch (error) {
      console.error('[WebRTC] Error adding ICE candidate:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to add ICE candidate'));
    }
  }, [onError]);

  /**
   * Clean up peer connection
   */
  const cleanupPeerConnection = useCallback((peerId: string) => {
    console.log('[WebRTC] Cleaning up peer connection for:', peerId);

    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }

    // Clean up audio element
    const audioElement = audioElementsRef.current.get(peerId);
    if (audioElement) {
      audioElement.pause();
      audioElement.srcObject = null;
      audioElement.remove();
      audioElementsRef.current.delete(peerId);
    }

    // Clean up remote stream
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  /**
   * Join meeting room
   */
  const joinMeeting = useCallback(async () => {
    if (isConnecting || isConnected) {
      return;
    }

    setIsConnecting(true);
    isCleanupRef.current = false;

    try {
      // Initialize socket
      await initializeSocket();

      // Get local stream
      await getLocalStream();

      // Join room
      if (socketRef.current?.connected) {
        socketRef.current.emit('join-room', {
          roomId,
          token,
          userId,
          userName,
          capabilities: {
            audio: true,
            video: false,
            screenShare: false,
          },
        });
      }
    } catch (error) {
      console.error('[WebRTC] Error joining meeting:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to join meeting'));
      setIsConnecting(false);
    } finally {
      setIsConnecting(false);
    }
  }, [roomId, token, userId, userName, isConnecting, isConnected, initializeSocket, getLocalStream, onError]);

  /**
   * Leave meeting room
   */
  const leaveMeeting = useCallback(async () => {
    console.log('[WebRTC] Leaving meeting');
    isCleanupRef.current = true;

    // Leave room
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-room', { roomId });
    }

    // Clean up all peer connections
    peerConnectionsRef.current.forEach((pc, peerId) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();

    // Clean up audio elements
    audioElementsRef.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
      audio.remove();
    });
    audioElementsRef.current.clear();

    // Clean up local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Clean up socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Reset state
    setIsConnected(false);
    setIsConnecting(false);
    setParticipants(new Map());
    setRemoteStreams(new Map());
  }, [roomId]);

  /**
   * Toggle mute state
   */
  const toggleMute = useCallback(async () => {
    if (isMuted) {
      await enableAudio();
    } else {
      await disableAudio();
    }
  }, [isMuted]);

  /**
   * Enable audio
   */
  const enableAudio = useCallback(async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      setIsMuted(false);

      // Notify other participants
      if (socketRef.current?.connected) {
        socketRef.current.emit('mute-state-changed', { muted: false });
      }
    }
  }, []);

  /**
   * Disable audio
   */
  const disableAudio = useCallback(async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      setIsMuted(true);

      // Notify other participants
      if (socketRef.current?.connected) {
        socketRef.current.emit('mute-state-changed', { muted: true });
      }
    }
  }, []);

  /**
   * Get or create audio element for remote stream
   */
  const getAudioElement = useCallback((peerId: string): HTMLAudioElement | null => {
    let audioElement = audioElementsRef.current.get(peerId);

    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.autoplay = true;
      audioElement.playsInline = true;
      audioElement.style.display = 'none';
      document.body.appendChild(audioElement);
      audioElementsRef.current.set(peerId, audioElement);
    }

    const stream = remoteStreams.get(peerId);
    if (stream && audioElement.srcObject !== stream) {
      audioElement.srcObject = stream;
    }

    return audioElement;
  }, [remoteStreams]);

  // Auto-join on mount if enabled
  useEffect(() => {
    if (autoJoin && !isCleanupRef.current) {
      joinMeeting();
    }

    return () => {
      if (!isCleanupRef.current) {
        leaveMeeting();
      }
    };
  }, [autoJoin, joinMeeting, leaveMeeting]);

  return {
    // State
    isConnected,
    isConnecting,
    isMuted,
    participants,
    remoteStreams,

    // Actions
    joinMeeting,
    leaveMeeting,
    toggleMute,
    enableAudio,
    disableAudio,

    // Audio elements
    getAudioElement,
  };
}
