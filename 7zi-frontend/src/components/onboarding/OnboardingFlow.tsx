'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  OnboardingFlowProps,
  OnboardingData,
  ONBOARDING_STEPS,
  setOnboardingCompleted,
} from '@/types/onboarding';

const TOTAL_STEPS = ONBOARDING_STEPS.length;

/**
 * Step 1: Welcome
 */
const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <div className="text-center py-8 animate-fadeIn">
    <div className="mb-6">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        欢迎来到 7zi
      </h2>
      <p className="text-gray-500 dark:text-gray-400">
        开始探索智能协作的未来。我们将引导您完成初始设置。
      </p>
    </div>
    <Button onClick={onNext} size="lg" className="mt-4">
      开始
    </Button>
  </div>
);

/**
 * Step 2: Create First Room
 */
const CreateRoomStep: React.FC<{
  roomName: string;
  onRoomNameChange: (name: string) => void;
  onNext: () => void;
  onSkip: () => void;
}> = ({ roomName, onRoomNameChange, onNext, onSkip }) => (
  <div className="py-4 animate-fadeIn">
    <div className="text-center mb-6">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-blue-600 dark:text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        创建第一个房间
      </h2>
      <p className="text-gray-500 dark:text-gray-400">
        房间是您与团队协作的空间，命名一个专属房间开始吧
      </p>
    </div>
    <div className="space-y-4">
      <Input
        label="房间名称"
        placeholder="例如：项目协作室"
        value={roomName}
        onChange={(e) => onRoomNameChange(e.target.value)}
        fullWidth
      />
    </div>
    <div className="flex gap-3 mt-6">
      <Button variant="ghost" onClick={onSkip} className="flex-1">
        跳过
      </Button>
      <Button
        onClick={onNext}
        className="flex-1"
        disabled={!roomName.trim()}
      >
        创建房间
      </Button>
    </div>
  </div>
);

/**
 * Step 3: Invite Team Members
 */
const InviteStep: React.FC<{
  emails: string[];
  onEmailAdd: (email: string) => void;
  onEmailRemove: (email: string) => void;
  onNext: () => void;
  onSkip: () => void;
}> = ({ emails, onEmailAdd, onEmailRemove, onNext, onSkip }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddEmail = () => {
    const email = inputValue.trim();
    if (email && !emails.includes(email)) {
      onEmailAdd(email);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  return (
    <div className="py-4 animate-fadeIn">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          邀请队友
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          添加邮箱地址邀请团队成员加入您的房间
        </p>
      </div>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="输入邮箱地址"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            fullWidth
          />
          <Button variant="outline" onClick={handleAddEmail}>
            添加
          </Button>
        </div>
        {emails.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {emails.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm"
              >
                {email}
                <button
                  onClick={() => onEmailRemove(email)}
                  className="hover:text-blue-900 dark:hover:text-blue-100"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-3 mt-6">
        <Button variant="ghost" onClick={onSkip} className="flex-1">
          跳过
        </Button>
        <Button onClick={onNext} className="flex-1">
          发送邀请
        </Button>
      </div>
    </div>
  );
};

/**
 * Step 4: Complete
 */
const CompleteStep: React.FC<{ onFinish: () => void }> = ({ onFinish }) => (
  <div className="text-center py-8 animate-fadeIn">
    <div className="mb-6">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
 stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        设置完成！
      </h2>
      <p className="text-gray-500 dark:text-gray-400">
        恭喜您完成初始设置，现在可以开始使用 7zi 平台了
      </p>
    </div>
    <Button onClick={onFinish} size="lg" className="mt-4">
      进入 Dashboard
    </Button>
  </div>
);

/**
 * Progress Indicator Component
 */
const ProgressIndicator: React.FC<{
  currentStep: number;
  totalSteps: number;
}> = ({ currentStep, totalSteps }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {Array.from({ length: totalSteps }).map((_, index) => (
      <div
        key={index}
        className={`h-1.5 rounded-full transition-all duration-300 ${
          index === currentStep
            ? 'w-8 bg-blue-600 dark:bg-blue-400'
            : index < currentStep
            ? 'w-4 bg-blue-600 dark:bg-blue-400'
            : 'w-4 bg-gray-300 dark:bg-gray-600'
        }`}
      />
    ))}
    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
      {currentStep + 1}/{totalSteps}
    </span>
  </div>
);

/**
 * OnboardingFlow Component
 */
export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  isOpen,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    roomName: '',
    inviteEmails: [],
  });

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const handleRoomNameChange = useCallback((roomName: string) => {
    setData((prev) => ({ ...prev, roomName }));
  }, []);

  const handleEmailAdd = useCallback((email: string) => {
    setData((prev) => ({
      ...prev,
      inviteEmails: [...(prev.inviteEmails || []), email],
    }));
  }, []);

  const handleEmailRemove = useCallback((email: string) => {
    setData((prev) => ({
      ...prev,
      inviteEmails: (prev.inviteEmails || []).filter((e) => e !== email),
    }));
  }, []);

  const handleComplete = useCallback(() => {
    setOnboardingCompleted(true);
    onComplete(data);
  }, [data, onComplete]);

  const handleSkipAll = useCallback(() => {
    setOnboardingCompleted(false);
    onSkip();
  }, [onSkip]);

  const handleSkip = useCallback(() => {
    // Skip button on steps 2-3 advances to next step (not close modal)
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep onNext={handleNext} />;
      case 1:
        return (
          <CreateRoomStep
            roomName={data.roomName || ''}
            onRoomNameChange={handleRoomNameChange}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        );
      case 2:
        return (
          <InviteStep
            emails={data.inviteEmails || []}
            onEmailAdd={handleEmailAdd}
            onEmailRemove={handleEmailRemove}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        );
      case 3:
        return <CompleteStep onFinish={handleComplete} />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn" />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <ProgressIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
