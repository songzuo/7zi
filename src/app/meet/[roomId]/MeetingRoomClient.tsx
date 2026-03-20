'use client';

/**
 * Voice Meeting Client Component
 *
 * Renders the MeetingRoom component with user context
 */

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// Dynamic import to avoid SSR issues with WebRTC
const MeetingRoom = dynamic(() => import('@/components/meeting/MeetingRoom'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
        <p>Loading meeting...</p>
      </div>
    </div>
  ),
});

interface MeetingRoomClientProps {
  roomId: string;
  token: string;
  userId: string;
  userName: string;
  userEmail: string;
  userImage?: string;
}

export default function MeetingRoomClient({
  roomId,
  token,
  userId,
  userName,
  userEmail,
  userImage,
}: MeetingRoomClientProps) {
  const router = useRouter();

  const handleLeave = () => {
    router.push('/dashboard');
  };

  return (
    <MeetingRoom
      roomId={roomId}
      token={token}
      userId={userId}
      userName={userName}
      meetingTitle="Voice Meeting"
      onLeave={handleLeave}
    />
  );
}
