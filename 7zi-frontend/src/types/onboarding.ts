/**
 * Onboarding Flow Types
 * 
 * @package 7zi-frontend
 */

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content?: React.ReactNode;
}

export interface OnboardingData {
  roomName?: string;
  inviteEmails?: string[];
}

export interface OnboardingFlowProps {
  isOpen: boolean;
  onComplete: (data?: OnboardingData) => void;
  onSkip: () => void;
}

export interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  data: OnboardingData;
  isCompleted: boolean;
}

export const STORAGE_KEY = 'onboarding_completed';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '欢迎来到 7zi',
    description: '开始探索智能协作的未来',
  },
  {
    id: 'create-room',
    title: '创建第一个房间',
    description: '创建一个协作房间，与团队成员一起工作',
  },
  {
    id: 'invite',
    title: '邀请队友',
    description: '邀请团队成员加入您的房间',
  },
  {
    id: 'complete',
    title: '完成设置',
    description: '您已准备就绪！',
  },
];

export const isOnboardingCompleted = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

export const setOnboardingCompleted = (completed: boolean = true): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, completed.toString());
};
