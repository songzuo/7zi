/**
 * @fileoverview 聊天消息组件
 * @description 显示单条聊天消息，支持用户和助手两种角色
 */

'use client';

import { Message, TeamMember } from './types';

interface ChatMessageProps {
  message: Message;
  teamMembers: TeamMember[];
}

/**
 * 聊天消息组件
 * @param message - 消息数据
 * @param teamMembers - 团队成员列表（用于显示发送者信息）
 */
export function ChatMessage({ message, teamMembers }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const member = message.memberId 
    ? teamMembers.find(m => m.id === message.memberId) 
    : null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] p-3 rounded-2xl ${
          isUser
            ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
            : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-md'
        }`}
      >
        {/* 显示回复的团队成员 */}
        {!isUser && member && (
          <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-1">
            {member.emoji} {member.name}
          </div>
        )}
        
        {/* 消息内容 */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        
        {/* 时间戳 */}
        <span
          className={`text-[10px] mt-1 block ${
            isUser ? 'text-white/70' : 'text-zinc-400'
          }`}
        >
          {message.timestamp.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

/**
 * 打字指示器组件
 * @description 显示 AI 正在输入的动画效果
 */
export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white dark:bg-zinc-800 p-3 rounded-2xl shadow-md">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
          <span
            className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
            style={{ animationDelay: '0.1s' }}
          />
          <span
            className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
            style={{ animationDelay: '0.2s' }}
          />
        </div>
      </div>
    </div>
  );
}