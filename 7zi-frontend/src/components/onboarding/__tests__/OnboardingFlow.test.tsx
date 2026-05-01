/**
 * OnboardingFlow Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Import component after mocks
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

describe('OnboardingFlow Component', () => {
  const mockOnComplete = vi.fn();
  const mockOnSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Step 1: Welcome', () => {
    it('renders welcome step correctly', () => {
      render(
        <OnboardingFlow isOpen={true} onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      expect(screen.getByText('欢迎来到 7zi')).toBeInTheDocument();
      expect(screen.getByText('开始探索智能协作的未来。我们将引导您完成初始设置。')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '开始' })).toBeInTheDocument();
    });

    it('shows progress indicator with correct step', () => {
      render(
        <OnboardingFlow isOpen={true} onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      expect(screen.getByText('1/4')).toBeInTheDocument();
    });

    it('navigates to step 2 when clicking 开始 button', async () => {
      render(
        <OnboardingFlow isOpen={true} onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      const startButton = screen.getByRole('button', { name: '开始' });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('创建第一个房间')).toBeInTheDocument();
      });
      expect(screen.getByText('2/4')).toBeInTheDocument();
    });
  });

  describe('Step 2: Create Room', () => {
    beforeEach(() => {
      render(
        <OnboardingFlow isOpen={true} onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );
      // Navigate to step 2
      fireEvent.click(screen.getByRole('button', { name: '开始' }));
    });

    it('renders create room step correctly', async () => {
      await waitFor(() => {
        expect(screen.getByText('创建第一个房间')).toBeInTheDocument();
      });
      expect(screen.getByPlaceholderText('例如：项目协作室')).toBeInTheDocument();
    });

    it('enables create button when room name is entered', async () => {
      await waitFor(() => {
        expect(screen.getByText('创建第一个房间')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('例如：项目协作室');
      fireEvent.change(input, { target: { value: '测试房间' } });

      const createButton = screen.getByRole('button', { name: '创建房间' });
      expect(createButton).not.toBeDisabled();
    });

    it('disables create button when room name is empty', async () => {
      await waitFor(() => {
        expect(screen.getByText('创建第一个房间')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: '创建房间' });
      expect(createButton).toBeDisabled();
    });

    it('navigates to step 3 when creating room', async () => {
      await waitFor(() => {
        expect(screen.getByText('创建第一个房间')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('例如：项目协作室');
      fireEvent.change(input, { target: { value: '测试房间' } });

      fireEvent.click(screen.getByRole('button', { name: '创建房间' }));

      await waitFor(() => {
        expect(screen.getByText('邀请队友')).toBeInTheDocument();
      });
      expect(screen.getByText('3/4')).toBeInTheDocument();
    });

    it('skips to step 3 when skip button is clicked', async () => {
      await waitFor(() => {
        expect(screen.getByText('创建第一个房间')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: '跳过' }));

      await waitFor(() => {
        expect(screen.getByText('邀请队友')).toBeInTheDocument();
      });
    });
  });

  describe('Step 3: Invite Team', () => {
    beforeEach(() => {
      render(
        <OnboardingFlow isOpen={true} onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );
      // Navigate to step 3
      fireEvent.click(screen.getByRole('button', { name: '开始' }));
      fireEvent.click(screen.getByRole('button', { name: '跳过' }));
    });

    it('renders invite step correctly', async () => {
      await waitFor(() => {
        expect(screen.getByText('邀请队友')).toBeInTheDocument();
      });
      expect(screen.getByPlaceholderText('输入邮箱地址')).toBeInTheDocument();
    });

    it('adds email when clicking 添加 button', async () => {
      await waitFor(() => {
        expect(screen.getByText('邀请队友')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('输入邮箱地址');
      fireEvent.change(input, { target: { value: 'test@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: '添加' }));

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('adds email when pressing Enter', async () => {
      await waitFor(() => {
        expect(screen.getByText('邀请队友')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('输入邮箱地址');
      fireEvent.change(input, { target: { value: 'test@example.com' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('removes email when clicking remove button', async () => {
      await waitFor(() => {
        expect(screen.getByText('邀请队友')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('输入邮箱地址');
      fireEvent.change(input, { target: { value: 'test@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: '添加' }));

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Find and click the remove button (it's inside the email chip)
      const removeButton = screen.getByRole('button', { name: '' }).closest('button');
      if (removeButton) {
        fireEvent.click(removeButton);
      }

      await waitFor(() => {
        expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
      });
    });

    it('navigates to step 4 when sending invites', async () => {
      await waitFor(() => {
        expect(screen.getByText('邀请队友')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: '发送邀请' }));

      await waitFor(() => {
        expect(screen.getByText('设置完成！')).toBeInTheDocument();
      });
      expect(screen.getByText('4/4')).toBeInTheDocument();
    });

    it('skips to step 4 when skip button is clicked', async () => {
      await waitFor(() => {
        expect(screen.getByText('邀请队友')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: '跳过' }));

      await waitFor(() => {
        expect(screen.getByText('设置完成！')).toBeInTheDocument();
      });
    });
  });

  describe('Step 4: Complete', () => {
    beforeEach(() => {
      render(
        <OnboardingFlow isOpen={true} onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );
      // Navigate through all steps
      fireEvent.click(screen.getByRole('button', { name: '开始' }));
      fireEvent.click(screen.getByRole('button', { name: '跳过' }));
      fireEvent.click(screen.getByRole('button', { name: '跳过' }));
    });

    it('renders complete step correctly', async () => {
      await waitFor(() => {
        expect(screen.getByText('设置完成！')).toBeInTheDocument();
      });
      expect(screen.getByText('恭喜您完成初始设置，现在可以开始使用 7zi 平台了')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '进入 Dashboard' })).toBeInTheDocument();
    });

    it('calls onComplete with room data when finishing', async () => {
      await waitFor(() => {
        expect(screen.getByText('设置完成！')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: '进入 Dashboard' }));

      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          roomName: '',
          inviteEmails: [],
        })
      );
    });

    it('sets localStorage onboarding_completed to true', async () => {
      await waitFor(() => {
        expect(screen.getByText('设置完成！')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: '进入 Dashboard' }));

      expect(localStorageMock.setItem).toHaveBeenCalledWith('onboarding_completed', 'true');
    });
  });

  describe('Persistence', () => {
    it('does not render when isOpen is false', () => {
      render(
        <OnboardingFlow isOpen={false} onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      expect(screen.queryByText('欢迎来到 7zi')).not.toBeInTheDocument();
    });

    it('renders when isOpen is true after being false', async () => {
      const { rerender } = render(
        <OnboardingFlow isOpen={false} onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      expect(screen.queryByText('欢迎来到 7zi')).not.toBeInTheDocument();

      rerender(
        <OnboardingFlow isOpen={true} onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      await waitFor(() => {
        expect(screen.getByText('欢迎来到 7zi')).toBeInTheDocument();
      });
    });
  });

  describe('Data Collection', () => {
    it('collects room name data through onboarding', async () => {
      render(
        <OnboardingFlow isOpen={true} onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      // Step 1 -> 2
      fireEvent.click(screen.getByRole('button', { name: '开始' }));

      await waitFor(() => {
        expect(screen.getByText('创建第一个房间')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('例如：项目协作室');
      fireEvent.change(input, { target: { value: '我的协作室' } });

      // Step 2 -> 3
      fireEvent.click(screen.getByRole('button', { name: '创建房间' }));

      await waitFor(() => {
        expect(screen.getByText('邀请队友')).toBeInTheDocument();
      });

      // Step 3 -> 4
      fireEvent.click(screen.getByRole('button', { name: '跳过' }));

      await waitFor(() => {
        expect(screen.getByText('设置完成！')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: '进入 Dashboard' }));

      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          roomName: '我的协作室',
          inviteEmails: [],
        })
      );
    });

    it('collects email data through onboarding', async () => {
      render(
        <OnboardingFlow isOpen={true} onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      // Navigate to step 3
      fireEvent.click(screen.getByRole('button', { name: '开始' }));
      fireEvent.click(screen.getByRole('button', { name: '跳过' }));

      await waitFor(() => {
        expect(screen.getByText('邀请队友')).toBeInTheDocument();
      });

      // Add emails
      const input = screen.getByPlaceholderText('输入邮箱地址');
      fireEvent.change(input, { target: { value: 'user1@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: '添加' }));

      fireEvent.change(input, { target: { value: 'user2@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: '添加' }));

      await waitFor(() => {
        expect(screen.getByText('user1@example.com')).toBeInTheDocument();
        expect(screen.getByText('user2@example.com')).toBeInTheDocument();
      });

      // Step 3 -> 4
      fireEvent.click(screen.getByRole('button', { name: '发送邀请' }));

      await waitFor(() => {
        expect(screen.getByText('设置完成！')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: '进入 Dashboard' }));

      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          inviteEmails: ['user1@example.com', 'user2@example.com'],
        })
      );
    });
  });

  describe('Skip Functionality', () => {
    it('first step does not have skip button', async () => {
      render(
        <OnboardingFlow isOpen={true} onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      await waitFor(() => {
        expect(screen.getByText('欢迎来到 7zi')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: '跳过' })).not.toBeInTheDocument();
    });

    it('skip button advances to next step (not call onSkip)', async () => {
      render(
        <OnboardingFlow isOpen={true} onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      // Navigate to step 2
      fireEvent.click(screen.getByRole('button', { name: '开始' }));

      await waitFor(() => {
        expect(screen.getByText('创建第一个房间')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: '跳过' }));

      // Should advance to step 3 (invite), not close modal
      await waitFor(() => {
        expect(screen.getByText('邀请队友')).toBeInTheDocument();
      });
      expect(mockOnSkip).not.toHaveBeenCalled();
    });
  });
});

describe('Onboarding Types', () => {
  it('exports correct storage key', async () => {
    const { STORAGE_KEY } = await import('@/types/onboarding');
    expect(STORAGE_KEY).toBe('onboarding_completed');
  });

  it('exports correct onboarding steps count', async () => {
    const { ONBOARDING_STEPS } = await import('@/types/onboarding');
    expect(ONBOARDING_STEPS).toHaveLength(4);
  });
});

describe('Onboarding Storage Functions', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('isOnboardingCompleted returns false when key not set', async () => {
    const { isOnboardingCompleted } = await import('@/types/onboarding');
    expect(isOnboardingCompleted()).toBe(false);
  });

  it('isOnboardingCompleted returns true when key is true', async () => {
    localStorageMock.setItem('onboarding_completed', 'true');
    const { isOnboardingCompleted } = await import('@/types/onboarding');
    expect(isOnboardingCompleted()).toBe(true);
  });

  it('setOnboardingCompleted sets localStorage correctly', async () => {
    const { setOnboardingCompleted } = await import('@/types/onboarding');
    setOnboardingCompleted(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('onboarding_completed', 'true');
  });
});
