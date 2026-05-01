'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import type { OnboardingData } from '@/types/onboarding';

interface OnboardingContextValue {
  showOnboarding: boolean;
  isOnboardingCompleted: boolean;
  startOnboarding: () => void;
  completeOnboarding: (data?: OnboardingData) => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

const STORAGE_KEY = 'onboarding_completed';

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);

  useEffect(() => {
    // Check if onboarding has been completed
    const completed = localStorage.getItem(STORAGE_KEY) === 'true';
    setIsOnboardingCompleted(completed);
    
    // Show onboarding if not completed
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);

  const startOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  const completeOnboarding = useCallback((data?: OnboardingData) => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOnboardingCompleted(true);
    setShowOnboarding(false);
    
    // Here you could handle the onboarding data (e.g., create room, send invites)
    if (data?.roomName) {
      console.log('Creating room:', data.roomName);
    }
    if (data?.inviteEmails?.length) {
      console.log('Inviting emails:', data.inviteEmails);
    }
  }, []);

  const skipOnboarding = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOnboardingCompleted(true);
    setShowOnboarding(false);
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIsOnboardingCompleted(false);
    setShowOnboarding(true);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        showOnboarding,
        isOnboardingCompleted,
        startOnboarding,
        completeOnboarding,
        skipOnboarding,
        resetOnboarding,
      }}
    >
      {children}
      <OnboardingFlow
        isOpen={showOnboarding}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
      />
    </OnboardingContext.Provider>
  );
};
