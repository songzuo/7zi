'use client';

/**
 * Meeting Room Component
 *
 * Main UI component for voice meetings
 * Displays participants, audio levels, and control bar
 */

import React, { useEffect, useRef, useState } from 'react';
import { useWebRTCMeeting, MeetingParticipant, UseWebRTCMeetingOptions } from '@/hooks/useWebRTCMeeting';
import { Mic, MicOff, Phone, Users, Settings, Copy, Check } from 'lucide-react';

// ============================================================================
// Global Type Extensions
// ============================================================================

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

// ============================================================================
// Types
// ============================================================================

interface MeetingRoomProps {
  roomId: string;
  token: string;
  userId: string;
  userName: string;
  meetingTitle?: string;
  onLeave?: () => void;
}

interface AudioLevel {
  participantId: string;
  level: number;
}

interface AudioSettings {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: 'flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
  header: 'flex items-center justify-between px-6 py-4 bg-slate-900/50 backdrop-blur-sm border-b border-slate-700',
  meetingInfo: 'flex items-center gap-4',
  meetingTitle: 'text-xl font-semibold text-white',
  roomId: 'flex items-center gap-2 text-slate-400 text-sm font-mono',
  roomIdText: 'hover:text-slate-300 cursor-pointer transition-colors',
  copyButton: 'p-1 hover:text-slate-300 transition-colors',
  timer: 'text-slate-400 font-mono',
  leaveButton: 'flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors',
  mainContent: 'flex-1 flex overflow-hidden',
  participantGrid: 'flex-1 p-6 overflow-auto',
  grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
  participantCard: 'relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 transition-all hover:border-slate-600',
  avatarContainer: 'relative w-24 h-24 mx-auto mb-4',
  avatar: 'w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-semibold',
  speakingIndicator: 'absolute inset-0 rounded-full ring-4 ring-green-500 ring-opacity-50 animate-pulse',
  name: 'text-center text-white font-semibold text-lg mb-1',
  email: 'text-center text-slate-400 text-sm mb-4',
  audioLevelBar: 'h-1 bg-slate-700 rounded-full overflow-hidden',
  audioLevelFill: 'h-full bg-green-500 transition-all duration-100',
  muteIndicator: 'flex items-center justify-center gap-1 text-red-400 text-sm',
  sidebar: 'w-80 bg-slate-900/50 backdrop-blur-sm border-l border-slate-700 overflow-y-auto',
  sidebarHeader: 'p-4 border-b border-slate-700',
  sidebarTitle: 'text-white font-semibold flex items-center gap-2',
  participantCount: 'text-slate-400 text-sm',
  participantList: 'p-4 space-y-3',
  participantListItem: 'flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg',
  participantAvatar: 'w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold',
  participantName: 'text-white font-medium flex-1',
  participantStatus: 'text-slate-400 text-xs',
  controlBar: 'flex items-center justify-center gap-4 px-6 py-4 bg-slate-900/50 backdrop-blur-sm border-t border-slate-700',
  controlButton: 'p-4 rounded-full transition-all hover:scale-110 active:scale-95',
  micButtonEnabled: 'bg-blue-600 hover:bg-blue-700 text-white',
  micButtonDisabled: 'bg-slate-700 hover:bg-slate-600 text-white',
  iconButton: 'bg-slate-700 hover:bg-slate-600 text-white',
  leaveButtonControl: 'bg-red-600 hover:bg-red-700 text-white',
  settingsPanel: 'absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-slate-800 rounded-lg p-4 shadow-xl border border-slate-700',
  settingsTitle: 'text-white font-semibold mb-3',
  settingRow: 'flex items-center justify-between mb-2',
  settingLabel: 'text-slate-300 text-sm',
  settingToggle: 'w-12 h-6 bg-slate-700 rounded-full relative cursor-pointer transition-colors',
  settingToggleEnabled: 'bg-blue-600',
  settingToggleKnob: 'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform',
  settingToggleKnobEnabled: 'transform translate-x-6',
};

// ============================================================================
// Helper Components
// ============================================================================

function MeetingTimer() {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return <span className={styles.timer}>{formatTime(duration)}</span>;
}

function RoomIdDisplay({ roomId }: { roomId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to copy room ID:', error);
      }
    }
  };

  return (
    <div className={styles.roomId}>
      <span className="text-slate-500">Room ID:</span>
      <span className={styles.roomIdText} onClick={handleCopy}>{roomId}</span>
      <button
        className={styles.copyButton}
        onClick={handleCopy}
        title="Copy room ID"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  );
}

function ParticipantCard({ participant, isSpeaking, audioLevel }: {
  participant: MeetingParticipant;
  isSpeaking: boolean;
  audioLevel: number;
}) {
  const initials = participant.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={styles.participantCard}>
      <div className={styles.avatarContainer}>
        {isSpeaking && <div className={styles.speakingIndicator} />}
        <div className={styles.avatar}>
          {participant.avatar ? (
            <img
              src={participant.avatar}
              alt={participant.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
      </div>
      <h3 className={styles.name}>{participant.name}</h3>
      {participant.email && <p className={styles.email}>{participant.email}</p>}
      {!participant.audioEnabled && (
        <div className={styles.muteIndicator}>
          <MicOff size={14} />
          <span>Muted</span>
        </div>
      )}
      <div className={styles.audioLevelBar}>
        <div
          className={styles.audioLevelFill}
          style={{ width: `${audioLevel}%` }}
        />
      </div>
    </div>
  );
}

function ParticipantSidebar({ participants }: { participants: Map<string, MeetingParticipant> }) {
  const participantArray = Array.from(participants.values());

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>
          <Users size={20} />
          Participants
        </h2>
        <p className={styles.participantCount}>{participantArray.length} in meeting</p>
      </div>
      <div className={styles.participantList}>
        {participantArray.map((participant) => {
          const initials = participant.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <div key={participant.id} className={styles.participantListItem}>
              <div className={styles.participantAvatar}>
                {participant.avatar ? (
                  <img
                    src={participant.avatar}
                    alt={participant.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={styles.participantName}>{participant.name}</p>
                <p className={styles.participantStatus}>
                  {participant.audioEnabled ? 'Active' : 'Muted'}
                </p>
              </div>
              {!participant.audioEnabled && <MicOff size={16} className="text-red-400" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AudioLevelMonitor({
  participants,
  remoteStreams,
  onAudioLevelChange,
}: {
  participants: Map<string, MeetingParticipant>;
  remoteStreams: Map<string, MediaStream>;
  onAudioLevelChange: (audioLevels: Map<string, number>) => void;
}) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzersRef = useRef<Map<string, AnalyserNode>>(new Map());

  useEffect(() => {
    // Initialize AudioContext on user interaction
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
    };

    initAudioContext();

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    // Set up analyzers for remote streams
    remoteStreams.forEach((stream, participantId) => {
      if (!audioContextRef.current) return;

      // Check if we already have an analyzer for this participant
      if (analyzersRef.current.has(participantId)) return;

      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.8;

      source.connect(analyzer);
      analyzersRef.current.set(participantId, analyzer);
    });

    // Clean up analyzers for streams that no longer exist
    analyzersRef.current.forEach((analyzer, participantId) => {
      if (!remoteStreams.has(participantId)) {
        analyzer.disconnect();
        analyzersRef.current.delete(participantId);
      }
    });
  }, [remoteStreams]);

  useEffect(() => {
    // Monitor audio levels
    const interval = setInterval(() => {
      const audioLevels = new Map<string, number>();

      analyzersRef.current.forEach((analyzer, participantId) => {
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(dataArray);

        // Calculate average volume
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        audioLevels.set(participantId, Math.min(100, (average / 255) * 100));
      });

      onAudioLevelChange(audioLevels);
    }, 100);

    return () => clearInterval(interval);
  }, [onAudioLevelChange]);

  return null;
}

function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: AudioSettings;
  onSettingsChange: (settings: AudioSettings) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.settingsPanel}>
      <h3 className={styles.settingsTitle}>Audio Settings</h3>

      <div className={styles.settingRow}>
        <span className={styles.settingLabel}>Echo Cancellation</span>
        <button
          className={`${styles.settingToggle} ${settings.echoCancellation ? styles.settingToggleEnabled : ''}`}
          onClick={() => onSettingsChange({ ...settings, echoCancellation: !settings.echoCancellation })}
        >
          <div
            className={`${styles.settingToggleKnob} ${settings.echoCancellation ? styles.settingToggleKnobEnabled : ''}`}
          />
        </button>
      </div>

      <div className={styles.settingRow}>
        <span className={styles.settingLabel}>Noise Suppression</span>
        <button
          className={`${styles.settingToggle} ${settings.noiseSuppression ? styles.settingToggleEnabled : ''}`}
          onClick={() => onSettingsChange({ ...settings, noiseSuppression: !settings.noiseSuppression })}
        >
          <div
            className={`${styles.settingToggleKnob} ${settings.noiseSuppression ? styles.settingToggleKnobEnabled : ''}`}
          />
        </button>
      </div>

      <div className={styles.settingRow}>
        <span className={styles.settingLabel}>Auto Gain Control</span>
        <button
          className={`${styles.settingToggle} ${settings.autoGainControl ? styles.settingToggleEnabled : ''}`}
          onClick={() => onSettingsChange({ ...settings, autoGainControl: !settings.autoGainControl })}
        >
          <div
            className={`${styles.settingToggleKnob} ${settings.autoGainControl ? styles.settingToggleKnobEnabled : ''}`}
          />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function MeetingRoom({
  roomId,
  token,
  userId,
  userName,
  meetingTitle = 'Voice Meeting',
  onLeave,
}: MeetingRoomProps) {
  const [audioLevels, setAudioLevels] = useState<Map<string, number>>(new Map());
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  });

  const handleError = (error: Error) => {
    // Silently handle error in production
    if (process.env.NODE_ENV === 'development') {
      console.error('Meeting error:', error);
    }
    // TODO: Show error toast - need to implement with existing Toast component
    alert(`Meeting error: ${error.message || 'An error occurred'}`);
  };

  const {
    isConnected,
    isConnecting,
    isMuted,
    participants,
    remoteStreams,
    joinMeeting,
    leaveMeeting,
    toggleMute,
    getAudioElement,
  } = useWebRTCMeeting({
    roomId,
    token,
    userId,
    userName,
    autoJoin: true,
    onError: handleError,
  });

  // Ensure audio elements are created for remote streams
  useEffect(() => {
    remoteStreams.forEach((stream, peerId) => {
      getAudioElement(peerId);
    });
  }, [remoteStreams, getAudioElement]);

  const handleLeave = async () => {
    await leaveMeeting();
    onLeave?.();
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const participantArray = Array.from(participants.values());

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.meetingInfo}>
          <div>
            <h1 className={styles.meetingTitle}>{meetingTitle}</h1>
            <RoomIdDisplay roomId={roomId} />
          </div>
          <MeetingTimer />
        </div>
        <button
          className={styles.leaveButton}
          onClick={handleLeave}
          disabled={isConnecting}
        >
          <Phone size={20} />
          Leave
        </button>
      </header>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Participant Grid */}
        <div className={styles.participantGrid}>
          {isConnecting && (
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
                <p>Connecting to meeting...</p>
              </div>
            </div>
          )}

          {!isConnecting && participantArray.length === 0 && (
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center">
                <Users size={64} className="mx-auto mb-4 text-slate-600" />
                <h2 className="text-xl font-semibold mb-2">Waiting for participants</h2>
                <p className="text-slate-400">Share the room ID to invite others</p>
              </div>
            </div>
          )}

          {!isConnecting && participantArray.length > 0 && (
            <div className={styles.grid}>
              {participantArray.map((participant) => (
                <ParticipantCard
                  key={participant.id}
                  participant={participant}
                  isSpeaking={(audioLevels.get(participant.id) ?? 0) > 30}
                  audioLevel={audioLevels.get(participant.id) ?? 0}
                />
              ))}
            </div>
          )}

          {/* Audio Level Monitor (invisible) */}
          <AudioLevelMonitor
            participants={participants}
            remoteStreams={remoteStreams}
            onAudioLevelChange={setAudioLevels}
          />
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <ParticipantSidebar participants={participants} />
        )}
      </div>

      {/* Control Bar */}
      <div className={styles.controlBar}>
        <button
          className={`${styles.controlButton} ${isMuted ? styles.micButtonDisabled : styles.micButtonEnabled}`}
          onClick={toggleMute}
          disabled={!isConnected}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button
          className={`${styles.controlButton} ${styles.iconButton}`}
          onClick={() => setShowSidebar(!showSidebar)}
          title="Toggle participant list"
        >
          <Users size={24} />
        </button>

        <button
          className={`${styles.controlButton} ${styles.iconButton}`}
          onClick={() => setShowSettings(!showSettings)}
          title="Settings"
        >
          <Settings size={24} />
        </button>

        <button
          className={`${styles.controlButton} ${styles.leaveButtonControl}`}
          onClick={handleLeave}
          disabled={isConnecting}
          title="Leave meeting"
        >
          <Phone size={24} />
        </button>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={audioSettings}
        onSettingsChange={setAudioSettings}
      />
    </div>
  );
}
