'use client';

import { useState, useEffect } from 'react';
import { Dashboard as DashboardComponent } from '@/features/dashboard/components/Dashboard';
import { OnboardingFlow, OnboardingData } from '@/components/onboarding/OnboardingFlow';
import { isOnboardingCompleted, setOnboardingCompleted } from '@/types/onboarding';

const STORAGE_KEY = 'onboarding_completed';

export default function DashboardPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if onboarding has been completed
    const completed = localStorage.getItem(STORAGE_KEY) === 'true';
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = (data?: OnboardingData) => {
    setOnboardingCompleted(true);
    setShowOnboarding(false);
    
    // Handle onboarding data here (e.g., API call to create room)
    if (data?.roomName) {
      console.log('Creating room with name:', data.roomName);
      // TODO: Call API to create room
    }
    if (data?.inviteEmails?.length) {
      console.log('Inviting emails:', data.inviteEmails);
      // TODO: Call API to send invitations
    }
  };

  const handleOnboardingSkip = () => {
    setOnboardingCompleted(true);
    setShowOnboarding(false);
  };

  // Avoid hydration mismatch - don't render onboarding until mounted
  if (!mounted) {
    return <DashboardComponent />;
  }

  return (
    <>
      <DashboardComponent />
      {showOnboarding && (
        <OnboardingFlow
          isOpen={showOnboarding}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </>
  );
}
