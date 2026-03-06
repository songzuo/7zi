/**
 * @fileoverview 聊天组件模块导出
 * @description 统一导出所有聊天相关组件和工具
 */

// 类型
export * from './types';

// 数据
export { teamMembers, quickActions, initialMessage } from './data';

// 组件
export { ChatMessage, TypingIndicator } from './ChatMessage';
export { ChatInput } from './ChatInput';
export { QuickActions } from './QuickActions';
export { TeamStatusPanel } from './TeamStatusPanel';
export { MemberSelector } from './MemberSelector';
export { ChatHeader } from './ChatHeader';

// Hook
export { useChat } from './useChat';