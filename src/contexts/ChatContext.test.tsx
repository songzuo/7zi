// @ts-nocheck - Test file with complex type issues
/**
 * @fileoverview ChatContext Tests
 * @description Tests for Chat Context Provider and Hooks
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ChatProvider,
  useChatContext,
  useChatMembers,
  type UnifiedTeamMember,
  type Message,
} from './ChatContext';

// ============================================================================
// Test Data
// ============================================================================

const mockTeamMembers: UnifiedTeamMember[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '/avatar1.jpg',
    status: 'online',
    role: 'developer',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatar: '/avatar2.jpg',
    status: 'working',
    role: 'designer',
  },
  {
    id: '3',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    avatar: '/avatar3.jpg',
    status: 'offline',
    role: 'manager',
  },
];

const mockMessages: Message[] = [
  {
    id: '1',
    content: 'Hello world',
    sender: '1',
    timestamp: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: '2',
    content: 'How are you?',
    sender: '2',
    timestamp: new Date('2024-01-01T10:01:00Z'),
  },
];

// ============================================================================
// Test Utilities
// ============================================================================

const wrapper = ({
  children,
  teamMembers = mockTeamMembers,
  messages = mockMessages,
  inputValue = '',
  isTyping = false,
  selectedMemberId = '',
}: {
  children: React.ReactNode;
  teamMembers?: UnifiedTeamMember[];
  messages?: Message[];
  inputValue?: string;
  isTyping?: boolean;
  selectedMemberId?: string;
}) => {
  const setInputValue = vi.fn();
  const handleSend = vi.fn();
  const handleQuickAction = vi.fn();
  const setSelectedMemberId = vi.fn();

  return (
    <ChatProvider
      teamMembers={teamMembers}
      messages={messages}
      inputValue={inputValue}
      isTyping={isTyping}
      selectedMemberId={selectedMemberId}
      setInputValue={setInputValue}
      handleSend={handleSend}
      handleQuickAction={handleQuickAction}
      setSelectedMemberId={setSelectedMemberId}
    >
      {children}
    </ChatProvider>
  );
};

// ============================================================================
// Test Suites
// ============================================================================

describe('ChatContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useChatContext', () => {
    it('should provide chat context values', () => {
      const { result } = renderHook(() => useChatContext(), { wrapper });

      expect(result.current.teamMembers).toEqual(mockTeamMembers);
      expect(result.current.messages).toEqual(mockMessages);
      expect(result.current.inputValue).toBe('');
      expect(result.current.isTyping).toBe(false);
      expect(result.current.selectedMemberId).toBe('');
      expect(result.current.onlineCount).toBe(2); // online + working
    });

    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useChatContext());
      }).toThrow('useChatContext must be used within ChatProvider');
    });

    it('should provide all required methods', () => {
      const { result } = renderHook(() => useChatContext(), { wrapper });

      expect(typeof result.current.setInputValue).toBe('function');
      expect(typeof result.current.handleSend).toBe('function');
      expect(typeof result.current.handleQuickAction).toBe('function');
      expect(typeof result.current.setSelectedMemberId).toBe('function');
      expect(typeof result.current.getMemberById).toBe('function');
      expect(typeof result.current.getOnlineMembers).toBe('function');
    });

    it('should calculate online count correctly', () => {
      const { result } = renderHook(() => useChatContext(), {
        wrapper,
        initialProps: {
          teamMembers: mockTeamMembers,
        },
      });

      expect(result.current.onlineCount).toBe(2); // online + working
    });

    it('should calculate online count with only online members', () => {
      const onlineOnlyMembers: UnifiedTeamMember[] = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          avatar: '/avatar1.jpg',
          status: 'online',
          role: 'developer',
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          avatar: '/avatar2.jpg',
          status: 'online',
          role: 'designer',
        },
      ];

      const { result } = renderHook(() => useChatContext(), {
        wrapper: (props) =>
          wrapper({ ...props, teamMembers: onlineOnlyMembers }),
      });

      expect(result.current.onlineCount).toBe(2);
    });

    it('should calculate online count with no online members', () => {
      const offlineOnlyMembers: UnifiedTeamMember[] = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          avatar: '/avatar1.jpg',
          status: 'offline',
          role: 'developer',
        },
      ];

      const { result } = renderHook(() => useChatContext(), {
        wrapper: (props) =>
          wrapper({ ...props, teamMembers: offlineOnlyMembers }),
      });

      expect(result.current.onlineCount).toBe(0);
    });
  });

  describe('getMemberById', () => {
    it('should find member by ID', () => {
      const { result } = renderHook(() => useChatContext(), { wrapper });

      const member = result.current.getMemberById('1');
      expect(member).toEqual(mockTeamMembers[0]);
    });

    it('should return undefined for non-existent member', () => {
      const { result } = renderHook(() => useChatContext(), { wrapper });

      const member = result.current.getMemberById('999');
      expect(member).toBeUndefined();
    });

    it('should find all members', () => {
      const { result } = renderHook(() => useChatContext(), { wrapper });

      mockTeamMembers.forEach((member) => {
        const found = result.current.getMemberById(member.id);
        expect(found).toEqual(member);
      });
    });
  });

  describe('getOnlineMembers', () => {
    it('should return only online members', () => {
      const { result } = renderHook(() => useChatContext(), { wrapper });

      const onlineMembers = result.current.getOnlineMembers();
      expect(onlineMembers).toHaveLength(2);
      expect(onlineMembers[0].status).toBe('online');
      expect(onlineMembers[1].status).toBe('working');
    });

    it('should return empty array when no online members', () => {
      const offlineOnlyMembers: UnifiedTeamMember[] = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          avatar: '/avatar1.jpg',
          status: 'offline',
          role: 'developer',
        },
      ];

      const { result } = renderHook(() => useChatContext(), {
        wrapper: (props) =>
          wrapper({ ...props, teamMembers: offlineOnlyMembers }),
      });

      const onlineMembers = result.current.getOnlineMembers();
      expect(onlineMembers).toHaveLength(0);
    });

    it('should include working status as online', () => {
      const workingMembers: UnifiedTeamMember[] = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          avatar: '/avatar1.jpg',
          status: 'working',
          role: 'developer',
        },
      ];

      const { result } = renderHook(() => useChatContext(), {
        wrapper: (props) =>
          wrapper({ ...props, teamMembers: workingMembers }),
      });

      const onlineMembers = result.current.getOnlineMembers();
      expect(onlineMembers).toHaveLength(1);
      expect(onlineMembers[0].status).toBe('working');
    });
  });

  describe('Context Methods', () => {
    it('should provide setInputValue callback', () => {
      const setInputValue = vi.fn();

      const customWrapper = ({ children }: { children: React.ReactNode }) =>
        wrapper({
          children,
          teamMembers: mockTeamMembers,
          setInputValue,
        });

      const { result } = renderHook(() => useChatContext(), {
        wrapper: customWrapper,
      });

      expect(typeof result.current.setInputValue).toBe('function');
    });

    it('should provide handleSend callback', () => {
      const handleSend = vi.fn();

      const customWrapper = ({ children }: { children: React.ReactNode }) =>
        wrapper({
          children,
          teamMembers: mockTeamMembers,
          handleSend,
        });

      const { result } = renderHook(() => useChatContext(), {
        wrapper: customWrapper,
      });

      expect(typeof result.current.handleSend).toBe('function');
    });

    it('should provide handleQuickAction callback', () => {
      const handleQuickAction = vi.fn();

      const customWrapper = ({ children }: { children: React.ReactNode }) =>
        wrapper({
          children,
          teamMembers: mockTeamMembers,
          handleQuickAction,
        });

      const { result } = renderHook(() => useChatContext(), {
        wrapper: customWrapper,
      });

      expect(typeof result.current.handleQuickAction).toBe('function');
    });

    it('should provide setSelectedMemberId callback', () => {
      const setSelectedMemberId = vi.fn();

      const customWrapper = ({ children }: { children: React.ReactNode }) =>
        wrapper({
          children,
          teamMembers: mockTeamMembers,
          setSelectedMemberId,
        });

      const { result } = renderHook(() => useChatContext(), {
        wrapper: customWrapper,
      });

      expect(typeof result.current.setSelectedMemberId).toBe('function');
    });
  });
});

describe('useChatMembers', () => {
  it('should provide member-related functions', () => {
    const { result } = renderHook(() => useChatMembers(), { wrapper });

    expect(result.current.teamMembers).toEqual(mockTeamMembers);
    expect(result.current.onlineCount).toBe(2);
    expect(typeof result.current.getMemberById).toBe('function');
    expect(typeof result.current.getOnlineMembers).toBe('function');
  });

  it('should not provide chat-specific values', () => {
    const { result } = renderHook(() => useChatMembers(), { wrapper });

    expect(result.current as any).not.toHaveProperty('messages');
    expect(result.current as any).not.toHaveProperty('inputValue');
    expect(result.current as any).not.toHaveProperty('isTyping');
    expect(result.current as any).not.toHaveProperty('handleSend');
  });

  it('should find member by ID through useChatMembers', () => {
    const { result } = renderHook(() => useChatMembers(), { wrapper });

    const member = result.current.getMemberById('1');
    expect(member).toEqual(mockTeamMembers[0]);
  });

  it('should get online members through useChatMembers', () => {
    const { result } = renderHook(() => useChatMembers(), { wrapper });

    const onlineMembers = result.current.getOnlineMembers();
    expect(onlineMembers).toHaveLength(2);
  });
});
