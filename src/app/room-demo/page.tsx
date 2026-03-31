/**
 * Room System Demo Page
 *
 * Demo page showcasing the WebSocket room system UI components
 */

'use client';

import { RoomManager } from '@/components/room';

export default function RoomSystemDemoPage() {
  return (
    <div className="h-screen overflow-hidden">
      <RoomManager
        wsUrl="ws://localhost:3001"
        userId="demo-user-123"
        userName="演示用户"
        userAvatar="/avatar.png"
        autoConnect={true}
      />
    </div>
  );
}
