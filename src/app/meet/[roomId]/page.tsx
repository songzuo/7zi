/**
 * Voice Meeting Page
 *
 * Entry point for voice meetings
 */

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

interface MeetingPageProps {
  params: {
    roomId: string;
  };
}

export default async function VoiceMeetingPage({ params }: MeetingPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session?.user?.email) {
    redirect('/auth/login?redirect=/meet/' + params.roomId);
  }

  // Get token for WebSocket authentication
  // Note: In production, this should be a short-lived token specific to the meeting
  const token = session.accessToken || session.user.id;

  return (
    <div className="h-screen w-full">
      <MeetingRoomClient
        roomId={params.roomId}
        token={token}
        userId={session.user.id}
        userName={session.user.name || 'User'}
        userEmail={session.user.email}
        userImage={session.user.image}
      />
    </div>
  );
}
