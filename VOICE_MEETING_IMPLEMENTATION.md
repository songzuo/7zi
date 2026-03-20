# Voice Meeting System Implementation

## Overview

A real-time voice meeting system built on WebRTC technology, integrated with the existing Socket.IO infrastructure. This implementation provides:

- Low-latency audio streaming via WebRTC peer-to-peer connections
- Meeting room creation and management
- Participant controls (mute/unmute, leave)
- Integration with existing WebSocket infrastructure
- Responsive UI with audio level visualization

## Architecture

### Components

1. **useWebRTCMeeting Hook** (`src/hooks/useWebRTCMeeting.ts`)
   - Manages WebRTC peer connections
   - Handles signaling via Socket.IO
   - Provides audio stream management
   - State management for participants

2. **MeetingRoom Component** (`src/components/meeting/MeetingRoom.tsx`)
   - Main UI for voice meetings
   - Displays participants in a responsive grid
   - Audio level indicators
   - Control bar for mute, leave, settings
   - Participant sidebar

3. **Signaling Handler** (`src/lib/voice-meeting/signaling.ts`)
   - Server-side WebRTC signaling
   - Room management
   - Participant state tracking
   - Host controls (mute, remove, lock)

4. **Meeting Page** (`src/app/meet/[roomId]/page.tsx`)
   - Entry point for meetings
   - Server-side authentication
   - Client-side rendering with dynamic import

### WebRTC Architecture

```
Participant A                          Participant B
     |                                      |
     | 1. join-room (roomId, token)        |
     |------------------------------------->|
     |                                      |
     | 2. room-joined (peerList)           |
     |<-------------------------------------|
     |                                      |
     | 3. offer (SDP, senderId, receiverId) |
     |------------------------------------->|
     |                                      |
     | 4. answer (SDP, senderId, receiverId)|
     |<-------------------------------------|
     |                                      |
     | 5. ice-candidate (candidate, ...)    |
     |<====================================>|
     |                                      |
     | 6. Audio Stream (RTP)                |
     |<====================================>|
```

## Usage

### Joining a Meeting

Navigate to `/meet/[roomId]` where `[roomId]` is a unique room identifier.

Example:
```
https://7zi.com/meet/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Creating a Meeting

To create a new meeting, generate a unique room ID and navigate to the meeting page:

```typescript
const roomId = crypto.randomUUID();
window.location.href = `/meet/${roomId}`;
```

## Features

### Implemented

- ✅ WebRTC peer connection setup
- ✅ Basic audio streaming
- ✅ Signaling via Socket.IO
- ✅ Room creation/joining
- ✅ Participant grid UI
- ✅ Audio level indicators
- ✅ Mute/unmute controls
- ✅ Leave meeting functionality
- ✅ Participant list sidebar
- ✅ Meeting timer
- ✅ Room ID display with copy functionality
- ✅ Host controls (mute participant, remove participant, lock room)
- ✅ Responsive design

### Planned

- ⏳ Screen sharing
- ⏳ Meeting recordings
- ⏳ Meeting chat
- ⏳ Active speaker detection (enhanced)
- ⏳ Breakout rooms
- ⏳ Meeting transcription
- ⏳ TURN server integration
- ⏳ SFU for scaling to larger meetings

## API Events

### Client to Server

- `join-room` - Join a meeting room
- `leave-room` - Leave current room
- `offer` - WebRTC SDP offer
- `answer` - WebRTC SDP answer
- `ice-candidate` - ICE candidate exchange
- `mute-state-changed` - Mute state change notification
- `mute-participant` - Host mutes a participant
- `remove-participant` - Host removes a participant
- `lock-room` - Host locks/unlocks room

### Server to Client

- `room-joined` - Confirmation of room join
- `room-error` - Error joining room
- `participant-joined` - New participant joined
- `participant-left` - Participant left
- `participant-muted` - Participant mute state changed
- `removed-from-room` - Participant removed by host
- `room-locked` - Room lock state changed
- `host-changed` - Host role transferred

## Configuration

### Environment Variables

```env
# STUN/TURN Servers (optional, defaults to Google STUN)
TURN_USERNAME=your-username
TURN_CREDENTIAL=your-credential
TURN_URL=turn:your-turn-server.com:3478

# Meeting Configuration
MAX_PARTICIPANTS_PER_ROOM=8
MEETING_ROOM_TIMEOUT=14400000  # 4 hours (in milliseconds)
```

### Audio Constraints

Default audio constraints configured in `useWebRTCMeeting.ts`:

```typescript
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
```

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Security

- JWT token required for room access
- Token validation on all signaling messages
- User identity verification
- End-to-end encryption (DTLS/SRTP) via WebRTC
- Rate limiting on join attempts
- Room lock functionality

## Performance

### Targets

- **Audio Latency**: <150ms
- **Connection Setup**: <3s
- **Reconnection Time**: <5s
- **CPU Usage**: <15% per participant
- **Bandwidth**: <500kbps per participant

### Optimization

- ICE candidate pooling for faster connections
- Audio quality adaptation based on network conditions
- Automatic cleanup of idle rooms
- Efficient peer connection management

## Testing

### Manual Testing

1. Create a meeting by navigating to `/meet/[roomId]`
2. Open the same URL in a second browser window/incognito mode
3. Verify audio streams in both directions
4. Test mute/unmute functionality
5. Test leave and rejoin
6. Test host controls (mute participant, remove participant, lock room)

### Automated Testing

Unit and integration tests should be added to:

```typescript
// src/hooks/__tests__/useWebRTCMeeting.test.ts
// src/lib/voice-meeting/__tests__/signaling.test.ts
// src/components/meeting/__tests__/MeetingRoom.test.tsx
```

## Future Enhancements

### Phase 2: Enhanced Features
- Screen sharing
- Meeting recordings
- Meeting chat
- Enhanced active speaker detection
- Meeting analytics

### Phase 3: Advanced Features
- Video support
- Breakout rooms
- Meeting transcription
- AI-powered meeting notes
- Meeting scheduling

### Phase 4: Production Ready
- TURN server integration
- SFU (Selective Forwarding Unit) for scaling
- Full browser compatibility testing
- Load testing
- Monitoring and alerting

## Troubleshooting

### Audio Not Working

1. Check browser permissions for microphone access
2. Verify HTTPS is being used (required for WebRTC)
3. Check browser console for WebRTC errors
4. Verify Socket.IO connection status

### Connection Issues

1. Check network connectivity
2. Verify STUN/TURN server configuration
3. Check firewall settings for UDP traffic
4. Verify WebSocket connection status

### Poor Audio Quality

1. Check network bandwidth
2. Verify microphone quality
3. Adjust audio constraints in code
4. Check for background noise

## Contributing

When contributing to the voice meeting system:

1. Ensure all new features include tests
2. Update documentation for API changes
3. Test across multiple browsers
4. Consider performance implications
5. Follow existing code style and patterns

## References

- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)
- [ICE Framework](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceTransport)

## License

This implementation is part of the 7zi AI Team Management Platform.
