/**
 * Voice Meeting Types
 *
 * Type definitions for the voice meeting system
 */

// ============================================================================
// Meeting Types
// ============================================================================

export type MeetingStatus = 'active' | 'ended' | 'scheduled' | 'cancelled';

export type ParticipantRole = 'host' | 'co-host' | 'participant';

export interface MeetingSettings {
  enableRecording: boolean;
  enableTranscription: boolean;
  maxParticipants: number;
  muteOnEntry: boolean;
  waitingRoom: boolean;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  scheduledTime?: Date;
  settings?: Partial<MeetingSettings>;
}

export interface CreateMeetingResponse {
  meeting: Meeting;
  roomId: string;
}

export interface JoinMeetingRequest {
  roomId: string;
  password?: string;
}

export interface JoinMeetingResponse {
  meeting: Meeting;
  token: string;
}

// ============================================================================
// Participant Types
// ============================================================================

export interface Participant {
  id: string;
  userId: string;
  name: string;
  email?: string;
  avatar?: string;
  role: ParticipantRole;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  joinedAt: Date;
  lastActive: Date;
}

export interface ParticipantState {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  isSpeaking: boolean;
  audioLevel: number;
}

// ============================================================================
// Meeting Types
// ============================================================================

export interface Meeting {
  id: string;
  roomId: string;
  title: string;
  description?: string;
  hostId: string;
  status: MeetingStatus;
  settings: MeetingSettings;
  scheduledTime?: Date;
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
  updatedAt: Date;
  participants: Participant[];
}

// ============================================================================
// Recording Types
// ============================================================================

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'processing' | 'completed' | 'failed';

export interface Recording {
  id: string;
  meetingId: string;
  startedBy: string;
  status: RecordingStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  fileSize?: number;
  filePath?: string;
  transcriptionId?: string;
  createdAt: Date;
}

export interface CreateRecordingRequest {
  meetingId: string;
}

export interface UpdateRecordingRequest {
  recordingId: string;
  status: RecordingStatus;
  duration?: number;
  fileSize?: number;
  filePath?: string;
  transcriptionId?: string;
}

// ============================================================================
// WebRTC Signaling Types
// ============================================================================

export interface WebRTCSignal {
  type: 'offer' | 'answer' | 'ice-candidate';
  senderId: string;
  receiverId: string;
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  stream: MediaStream | null;
}

// ============================================================================
// Room Types (for in-memory room management)
// ============================================================================

export interface MeetingRoom {
  id: string;
  meetingId?: string;
  hostId: string;
  locked: boolean;
  createdAt: Date;
  lastActivity: Date;
  participants: Map<string, Participant>;
}

export interface JoinRoomPayload {
  roomId: string;
  token: string;
  userId: string;
  userName: string;
  capabilities: {
    audio: boolean;
    video: boolean;
    screenShare: boolean;
  };
}

export interface OfferPayload {
  sdp: RTCSessionDescriptionInit;
  senderId: string;
  receiverId: string;
}

export interface AnswerPayload {
  sdp: RTCSessionDescriptionInit;
  senderId: string;
  receiverId: string;
}

export interface IceCandidatePayload {
  candidate: RTCIceCandidateInit;
  senderId: string;
  receiverId: string;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface MeetingStatistics {
  meetingId: string;
  totalParticipants: number;
  peakParticipants: number;
  duration: number;
  recordingsCount: number;
  averageAudioLevel?: number;
  transcriptionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface ParticipantStatistics {
  participantId: string;
  meetingId: string;
  speakingTime: number;
  muteCount: number;
  unmuteCount: number;
  audioEnabledTime: number;
  audioDisabledTime: number;
}

// ============================================================================
// Error Types
// ============================================================================

export type MeetingErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_LOCKED'
  | 'INVALID_TOKEN'
  | 'UNAUTHORIZED'
  | 'RECORDING_FAILED'
  | 'TRANSCRIPTION_FAILED'
  | 'PEER_CONNECTION_FAILED'
  | 'MEDIA_ACCESS_DENIED';

export interface MeetingError {
  code: MeetingErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Audio Configuration Types
// ============================================================================

export interface AudioConstraints extends MediaTrackConstraints {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  sampleRate?: number;
  channelCount?: number;
}

export interface AudioSettings {
  inputDeviceId?: string;
  outputDeviceId?: string;
  constraints: AudioConstraints;
}

// ============================================================================
// Socket Event Types
// ============================================================================

export type VoiceMeetingSocketEvent =
  | 'join-room'
  | 'leave-room'
  | 'room-joined'
  | 'room-error'
  | 'participant-joined'
  | 'participant-left'
  | 'participant-muted'
  | 'host-changed'
  | 'removed-from-room'
  | 'room-locked'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'mute-state-changed'
  | 'mute-participant'
  | 'remove-participant'
  | 'lock-room';
