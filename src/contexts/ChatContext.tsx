/**
 * @fileoverview Chat Context - 减少组件间的 Prop Drilling
 * @description 通过 React Context 提供聊天相关的共享状态，避免逐层传递 props
 *
 * 问题解决:
 * - 消除 teamMembers 通过 4 层组件传递的问题
 * - AIChat → ChatHeader/TeamStatusPanel/ChatMessage → useChat
 * - 提供统一的类型和安全的状态访问
 */

'use client';

import { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { UnifiedTeamMember } from '@/types/members';
import { Message } from '@/components/chat/types';

// ============================================================================
// Context Value Interface
// ============================================================================

/**
 * Chat Context 提供的值接口
 */
interface ChatContextValue {
  /** 团队成员列表 */
  teamMembers: UnifiedTeamMember[];

  /** 聊天消息列表 */
  messages: Message[];

  /** 当前输入值 */
  inputValue: string;

  /** 是否正在输入（AI打字状态） */
  isTyping: boolean;

  /** 选中的成员ID */
  selectedMemberId: string;

  /** 在线成员数量 */
  onlineCount: number;

  /** 设置输入值 */
  setInputValue: (value: string) => void;

  /** 发送消息 */
  handleSend: () => void;

  /** 快捷操作 */
  handleQuickAction: (action: string) => void;

  /** 选择成员 */
  setSelectedMemberId: (memberId: string) => void;

  /** 根据ID查找成员 */
  getMemberById: (memberId: string) => UnifiedTeamMember | undefined;

  /** 获取在线成员列表 */
  getOnlineMembers: () => UnifiedTeamMember[];
}

// ============================================================================
// Context Creation
// ============================================================================

const ChatContext = createContext<ChatContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

interface ChatProviderProps {
  children: ReactNode;
  teamMembers: UnifiedTeamMember[];
  messages: Message[];
  inputValue: string;
  isTyping: boolean;
  selectedMemberId: string;
  setInputValue: (value: string) => void;
  handleSend: () => void;
  handleQuickAction: (action: string) => void;
  setSelectedMemberId: (memberId: string) => void;
}

/**
 * Chat Provider 组件
 * @description 包裹需要访问聊天状态的子组件
 */
export function ChatProvider({
  children,
  teamMembers,
  messages,
  inputValue,
  isTyping,
  selectedMemberId,
  setInputValue,
  handleSend,
  handleQuickAction,
  setSelectedMemberId,
}: ChatProviderProps) {
  // 计算在线成员数量
  const onlineCount = teamMembers.filter((m) => m.status === 'online' || m.status === 'working').length;

  // 根据ID查找成员
  const getMemberById = useCallback((memberId: string): UnifiedTeamMember | undefined => {
    return teamMembers.find((m) => m.id === memberId);
  }, [teamMembers]);

  // 获取在线成员列表
  const getOnlineMembers = useCallback((): UnifiedTeamMember[] => {
    return teamMembers.filter((m) => m.status === 'online' || m.status === 'working');
  }, [teamMembers]);

  // 使用 useMemo 优化 context value，避免每次渲染都创建新对象
  const contextValue = useMemo(() => ({
    teamMembers,
    messages,
    inputValue,
    isTyping,
    selectedMemberId,
    onlineCount,
    setInputValue,
    handleSend,
    handleQuickAction,
    setSelectedMemberId,
    getMemberById,
    getOnlineMembers,
  }), [
    teamMembers,
    messages,
    inputValue,
    isTyping,
    selectedMemberId,
    onlineCount,
    setInputValue,
    handleSend,
    handleQuickAction,
    setSelectedMemberId,
    getMemberById,
    getOnlineMembers,
  ]);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

// ============================================================================
// Custom Hook
// ============================================================================

/**
 * useChat Hook - 访问 Chat Context
 * @description 在组件中使用聊天上下文状态和方法
 * @throws Error 如果在 ChatProvider 外部使用
 */
export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
}

/**
 * useChatMembers Hook - 快速访问团队成员相关功能
 * @description 便捷 hook，只返回团队成员相关的数据
 */
export function useChatMembers() {
  const { teamMembers, onlineCount, getMemberById, getOnlineMembers } = useChatContext();
  return {
    teamMembers,
    onlineCount,
    getMemberById,
    getOnlineMembers,
  };
}
