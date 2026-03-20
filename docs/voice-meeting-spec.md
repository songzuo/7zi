# Voice Meeting System Specification

## Version
- **Version**: 1.0.0
- **Created**: 2026-03-20
- **Project**: 7zi AI Team Management Platform

---

## 1. Overview

A real-time voice meeting system built on WebRTC technology, integrated with the existing Socket.IO infrastructure. The system enables audio-only meetings with participant controls, room management, and seamless integration with the 7zi platform's collaboration features.

### Key Features
- Low-latency audio streaming via WebRTC
- Meeting room creation and management
- Participant controls (mute/unmute, screen share, leave)
- Integration with existing WebSocket infrastructure
- Cross-browser compatibility
- Scalable architecture for multiple simultaneous meetings

---

## 2. WebRTC Audio Streaming Architecture

### 2.1 Architecture Components

#### 2.1.1 Signaling Server (Socket.IO)
- **Purpose**: Establish peer connections and exchange SDP offers/answers
- **Protocol**: Socket.IO events over WebSocket
- **Location**: `/api/ws` endpoint
- **Authentication**: JWT-based via existing auth system

#### 2.1.2 WebRTC Peer Connections
- **Type**: Mesh topology (peer-to-peer)
- **Scale**: Optimized for 2-8 participants per room
- **Codecs**: Opus (preferred), PCMU, PCMA fallback
- **ICE Servers**: STUN/TURN for NAT traversal

#### 2.1.3 Media Server (Future Enhancement)
- **Purpose**: SFU (Selective Forwarding Unit) for larger meetings
- **Implementation**: mediasoup or LiveKit
- **Threshold**: Required for >8 participants

### 2.2 Signaling Flow

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

### 2.3 WebRTC Configuration

```typescript
const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:turn.example.com:3478',
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL
    }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all'
};
```

### 2.4 Audio Constraints

```typescript
const audioConstraints: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
    latency: 0,
    deviceId: 'default'
  }
};
```

---

## 3. Meeting Room Management UI

### 3.1 Room Creation Flow

1. **User Initiates Meeting**
   - Click "Start Meeting" button
   - Enter meeting title (optional)
   - Select meeting type (audio/audio+screen)
   - Generate unique room ID

2. **Room Initialization**
   - Create room on server
   - Generate room access URL
   - Set up WebSocket connection
   - Initialize WebRTC context

3. **Room URL Format**
   ```
   https://7zi.com/meet/[roomId]
   ```

### 3.2 UI Components

#### 3.2.1 Meeting Room Header
- Meeting title
- Room ID (with copy button)
- Participant count
- Duration timer
- Leave button

#### 3.2.2 Video/Audio Grid
- Dynamic grid layout based on participant count
- Active speaker highlighting
- Audio level indicators
- Screen share display (when applicable)

#### 3.2.3 Participant List Sidebar
- Collapsible participant list
- Participant avatars
- Online/offline status
- Mute indicators
- Mute/unmute controls (for host)

#### 3.2.4 Control Bar
- Microphone toggle (mute/unmute)
- Camera toggle (future video support)
- Screen share toggle
- Chat toggle
- Participants toggle
- Leave meeting button
- Settings button

### 3.3 Responsive Design

- **Desktop**: Full video grid with sidebar
- **Tablet**: Smaller grid, collapsible sidebar
- **Mobile**: Single active speaker view with controls overlay
- **Grid Layout**: CSS Grid with auto-fit

```css
.meeting-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  max-width: 1920px;
}
```

---

## 4. Participant Controls

### 4.1 Local Controls

#### 4.1.1 Microphone
- **Toggle**: Mute/unmute local microphone
- **Visual Feedback**: Icon change + audio level indicator
- **Shortcut**: 'M' key
- **Persistence**: Remember preference

#### 4.1.2 Camera (Future)
- **Toggle**: Enable/disable video
- **Device Selection**: Switch between cameras
- **Blur Background**: Virtual background support

#### 4.1.3 Screen Share
- **Toggle**: Share entire screen or specific window
- **Notification**: Show sharing indicator
- **Privacy**: Ask for confirmation before sharing

#### 4.1.4 Leave Meeting
- **Confirmation**: Dialog before leaving
- **Cleanup**: Disconnect all peers, close streams
- **Redirect**: Return to previous page

### 4.2 Remote Controls (Host Only)

#### 4.2.1 Mute Participant
- **Permission**: Host can mute any participant
- **Notification**: Participant notified of mute
- **Override**: Participant can unmute themselves

#### 4.2.2 Remove Participant
- **Permission**: Host can remove participants
- **Notification**: Participant notified and disconnected
- **Ban Option**: Temporarily ban from rejoining

#### 4.2.3 Lock Meeting
- **Prevent**: New participants cannot join
- **Status**: Show lock icon on room
- **Toggle**: Host can lock/unlock

### 4.3 Control States

```typescript
interface ParticipantControls {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  isMutedByHost: boolean;
}

interface MeetingControls {
  canMuteParticipants: boolean;
  canRemoveParticipants: boolean;
  canLockMeeting: boolean;
}
```

---

## 5. WebSocket Integration

### 5.1 Event Types

#### 5.1.1 Room Management
- `join-room` - Join a meeting room
- `leave-room` - Leave current room
- `room-joined` - Confirmation of room join
- `room-left` - Notification of participant leaving

#### 5.1.2 Signaling
- `offer` - WebRTC SDP offer
- `answer` - WebRTC SDP answer
- `ice-candidate` - ICE candidate exchange
- `negotiation-needed` - Renegotiation request

#### 5.1.3 Participant State
- `participant-joined` - New participant joined
- `participant-left` - Participant left
- `participant-muted` - Participant muted state changed
- `participant-speaking` - Active speaker detection

#### 5.1.4 Room Control
- `mute-participant` - Host mutes participant
- `remove-participant` - Host removes participant
- `lock-room` - Lock/unlock meeting

### 5.2 Message Payloads

```typescript
// Join Room
interface JoinRoomPayload {
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

// WebRTC Offer
interface OfferPayload {
  sdp: RTCSessionDescriptionInit;
  senderId: string;
  receiverId: string;
}

// ICE Candidate
interface IceCandidatePayload {
  candidate: RTCIceCandidateInit;
  senderId: string;
  receiverId: string;
}
```

### 5.3 Integration with Existing WebSocket Infrastructure

The voice meeting system will extend the existing Socket.IO server:

```typescript
// Extend existing socket types
declare module 'socket.io' {
  interface Socket {
    joinMeetingRoom(roomId: string): Promise<void>;
    leaveMeetingRoom(roomId: string): Promise<void>;
  }
}

// Add meeting room type to existing room system
type RoomType = 'task' | 'project' | 'chat' | 'document' | 'meeting';
```

### 5.4 Meeting Room State Management

```typescript
interface MeetingRoom {
  id: string;
  name: string;
  type: 'meeting';
  createdAt: Date;
  hostId: string;
  locked: boolean;
  maxParticipants: number;
  participants: Map<string, MeetingParticipant>;
}

interface MeetingParticipant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  joinedAt: Date;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  isHost: boolean;
}
```

---

## 6. Implementation Roadmap

### Phase 1: Core MVP (Week 1-2)
- [x] WebRTC peer connection setup
- [x] Basic audio streaming
- [x] Signaling via Socket.IO
- [x] Room creation/joining
- [ ] Basic UI (audio grid, controls)

### Phase 2: Enhanced Features (Week 3-4)
- [ ] Participant controls (mute, leave)
- [ ] Screen sharing
- [ ] Meeting room UI polish
- [ ] Audio level indicators
- [ ] Active speaker detection

### Phase 3: Advanced Features (Week 5-6)
- [ ] Host controls (mute/remove participants)
- [ ] Meeting lock
- [ ] Meeting recordings
- [ ] Meeting chat
- [ ] Performance optimizations

### Phase 4: Production Ready (Week 7-8)
- [ ] TURN server setup
- [ ] SFU integration for scaling
- [ ] Full browser compatibility testing
- [ ] Load testing
- [ ] Documentation and deployment

---

## 7. Technical Requirements

### 7.1 Browser Support
- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

### 7.2 Dependencies
- `socket.io-client` (existing)
- `socket.io` (existing)
- No additional WebRTC libraries needed (native API)

### 7.3 Environment Variables
```env
# STUN/TURN Servers
TURN_USERNAME=your-username
TURN_CREDENTIAL=your-credential
TURN_URL=turn:your-turn-server.com:3478

# Meeting Configuration
MAX_PARTICIPANTS_PER_ROOM=8
MEETING_ROOM_TIMEOUT=14400000  # 4 hours
```

### 7.4 Performance Targets
- **Audio Latency**: <150ms
- **Connection Setup**: <3s
- **Reconnection Time**: <5s
- **CPU Usage**: <15% per participant
- **Bandwidth**: <500kbps per participant

---

## 8. Security Considerations

### 8.1 Authentication
- JWT token required for room access
- Token validation on all signaling messages
- User identity verification

### 8.2 Room Access Control
- Room ID complexity (UUID-based)
- Optional password protection
- Host approval for new participants

### 8.3 Data Privacy
- End-to-end encryption (DTLS/SRTP)
- No server-side audio recording (unless enabled)
- Secure ICE candidates (TURN over TLS)

### 8.4 Rate Limiting
- Limit join attempts per user
- Prevent room flooding
- DDoS protection on signaling server

---

## 9. Error Handling

### 9.1 Connection Errors
- **Peer Connection Failed**: Retry with new offer/answer
- **ICE Connection Failed**: Switch to TURN server
- **Signaling Timeout**: Attempt reconnection with backoff

### 9.2 Media Errors
- **Microphone Access Denied**: Show permission UI
- **No Audio Devices**: Fallback to listen-only mode
- **Device Disconnected**: Notify user and re-initialize

### 9.3 Fallback Strategies
- WebRTC not supported → Show error message
- Poor connection → Reduce audio quality
- Network unstable → Show connection status

---

## 10. Testing Strategy

### 10.1 Unit Tests
- WebRTC connection logic
- Signaling message handling
- Room state management
- Participant control logic

### 10.2 Integration Tests
- Full meeting flow (join, connect, speak, leave)
- Multi-participant scenarios
- Reconnection scenarios
- Cross-browser compatibility

### 10.3 E2E Tests
- Meeting creation and joining
- Control bar interactions
- Participant management
- Network interruption handling

### 10.4 Performance Tests
- Latency measurement
- Bandwidth usage
- CPU/memory profiling
- Concurrent user load

---

## 11. Future Enhancements

### 11.1 Video Support
- Add video streaming
- Grid layout optimization
- Video quality controls

### 11.2 Advanced Features
- Meeting recordings
- Transcription services
- AI-powered meeting notes
- Breakout rooms
- Polls and Q&A

### 11.3 Integrations
- Calendar integration
- Meeting reminders
- File sharing
- Whiteboard collaboration

---

## 12. References

- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)
- [ICE Framework](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceTransport)
