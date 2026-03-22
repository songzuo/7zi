'use client';

import { useWebSocket } from '@/hooks/useWebSocket';

interface WebSocketStatusIndicatorProps {
  detailed?: boolean;
  className?: string;
}

/**
 * WebSocket Status Indicator
 *
 * Displays the current WebSocket connection status with visual feedback
 */
export function WebSocketStatusIndicator({ detailed = false, className = '' }: WebSocketStatusIndicatorProps) {
  const { state, reconnect } = useWebSocket();

  const getStatusColor = () => {
    if (state.connected && state.authenticated) return 'bg-green-500';
    if (state.connecting) return 'bg-yellow-500';
    if (state.error) return 'bg-red-500';
    return 'bg-zinc-400';
  };

  const getStatusText = () => {
    if (state.connecting) return 'Connecting...';
    if (state.connected) {
      return state.authenticated ? 'Connected' : 'Authenticating...';
    }
    if (state.error) return 'Error';
    return 'Disconnected';
  };

  const getStatusLabel = () => {
    if (state.connecting) return 'Connecting';
    if (state.connected && state.authenticated) return 'Online';
    if (state.connected) return 'Authenticating';
    if (state.error) return 'Offline (Error)';
    return 'Offline';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status Dot */}
      <div
        className={`w-3 h-3 rounded-full ${getStatusColor()} ${
          state.connecting ? 'animate-pulse' : ''
        }`}
        title={state.error || getStatusText()}
      />

      {/* Status Text */}
      {detailed && (
        <span className="text-sm text-zinc-600">
          {getStatusLabel()}
          {state.roomId && <span className="ml-2 text-zinc-400">({state.roomId})</span>}
        </span>
      )}

      {/* Reconnect Button (only show when disconnected) */}
      {detailed && !state.connected && !state.connecting && (
        <button
          onClick={reconnect}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Reconnect
        </button>
      )}
    </div>
  );
}
