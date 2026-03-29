/**
 * RoomView Component
 *
 * Main room view with messages, input, and member panel
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useWebSocketStore } from './websocket-store';
import type { Room, RoomType } from '@/lib/websocket/rooms';
import type { StoredMessage, MessageReaction } from '@/lib/websocket/message-store';

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function isOwnMessage(message: StoredMessage, currentUserId: string | null): boolean {
  return message.userId === currentUserId;
}

function getReactionUsers(reaction: MessageReaction, currentUserName: string | null): string {
  const users = [reaction.userName];
  if (reaction.userName !== currentUserName && currentUserName) {
    users.push(currentUserName);
  }
  return users.slice(0, 3).join(', ') + (users.length > 3 ? ' 等' : '');
}

// ============================================================================
// Message Item Component
// ============================================================================

interface MessageItemProps {
  message: StoredMessage;
  currentUserId: string | null;
  currentUserName: string | null;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (messageId: string) => void;
}

function MessageItem({ message, currentUserId, currentUserName, onReact, onReply }: MessageItemProps) {
  const isOwn = isOwnMessage(message, currentUserId);
  const [showReactions, setShowReactions] = useState(false);

  // Common emojis for quick reactions
  const commonEmojis = ['👍', '❤️', '😂', '🎉', '👏', '🤔'];

  return (
    <div
      className={`
        flex gap-3 mb-4 p-3 rounded-lg transition-all duration-200
        ${isOwn ? 'flex-row-reverse' : ''}
        ${message.pinned ? 'bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800' : ''}
      `}
    >
      {/* Avatar */}
      <div className={`
        flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold
        ${isOwn ? 'bg-blue-500' : 'bg-gray-400'}
      `}>
        {message.userName.charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isOwn ? 'text-right' : ''}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {message.userName}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatMessageTime(message.timestamp)}
          </span>
          {message.edited && (
            <span className="text-xs text-gray-500 dark:text-gray-400">(已编辑)</span>
          )}
          {message.pinned && (
            <span className="text-xs">📌</span>
          )}
        </div>

        {/* Message Content */}
        <div className={`
          p-3 rounded-lg max-w-[70%]
          ${isOwn 
            ? 'bg-blue-500 text-white ml-auto' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
          }
        `}>
          {message.content}
        </div>

        {/* Reply Reference */}
        {message.replyTo && (
          <div className={`mt-2 text-sm text-gray-600 dark:text-gray-400 ${isOwn ? 'text-right' : ''}`}>
            <span className="font-medium">回复消息</span>
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={`mt-2 flex gap-1 flex-wrap ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {message.reactions.map((reaction, idx) => (
              <button
                key={`${reaction.emoji}-${reaction.userId}-${idx}`}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                onClick={() => onReact?.(message.id, reaction.emoji)}
              >
                <span>{reaction.emoji}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {message.reactions!.filter(r => r.emoji === reaction.emoji).length}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        {isOwn && (
          <div className={`mt-2 flex gap-2 text-xs ${isOwn ? 'justify-end' : ''}`}>
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              😊 表情
            </button>
            <button
              onClick={() => onReply?.(message.id)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              ↩️ 回复
            </button>
          </div>
        )}

        {/* Quick Reactions */}
        {showReactions && (
          <div className={`mt-2 flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {commonEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact?.(message.id, emoji);
                  setShowReactions(false);
                }}
                className="px-2 py-1 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Message Input Component
// ============================================================================

interface MessageInputProps {
  disabled?: boolean;
  replyingTo?: StoredMessage | null;
  onCancelReply?: () => void;
  onSendMessage: (content: string, replyTo?: string) => void;
}

function MessageInput({ disabled, replyingTo, onCancelReply, onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim(), replyingTo?.id);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
      {/* Reply Context */}
      {replyingTo && (
        <div className="flex items-center justify-between mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">回复:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[300px]">
              {replyingTo.userName}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
              {replyingTo.content}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            disabled={disabled}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       resize-none min-h-[50px] max-h-[150px]
                       disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors flex items-center gap-2"
        >
          <span>发送</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mt-3 text-sm text-gray-500 dark:text-gray-400">
        <button
          disabled={disabled}
          className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
        >
          📎 附件
        </button>
        <button
          disabled={disabled}
          className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
        >
          😊 表情
        </button>
        <button
          disabled={disabled}
          className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
        >
          @ 提及
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Room Header Component
// ============================================================================

interface RoomHeaderProps {
  room: Room;
  onToggleSettings: () => void;
  onToggleMembers: () => void;
  memberCount: number;
}

function RoomHeader({ room, onToggleSettings, onToggleMembers, memberCount }: RoomHeaderProps) {
  const ROOM_TYPE_ICONS: Record<RoomType, string> = {
    task: '📋',
    project: '📁',
    chat: '💬',
    document: '📄',
    voice: '🎤',
    video: '📹',
  };

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between">
        {/* Room Info */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">{ROOM_TYPE_ICONS[room.type]}</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {room.name}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>{room.type === 'chat' ? '聊天' : room.type === 'task' ? '任务' : '项目'}</span>
              <span>•</span>
              <span>{memberCount} 位成员</span>
              <span>•</span>
              <span>{formatTime(room.lastActivity)}活跃</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMembers}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100
                       hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="成员列表"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
          <button
            onClick={onToggleSettings}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100
                       hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="房间设置"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Member Panel Component
// ============================================================================

interface MemberPanelProps {
  isOpen: boolean;
  onClose: () => void;
  participants: import('@/lib/websocket/rooms').RoomParticipant[];
  currentUserId: string | null;
}

function MemberPanel({ isOpen, onClose, participants, currentUserId }: MemberPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-white dark:bg-gray-900 z-10 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            成员列表 ({participants.length})
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Member List */}
      <div className="flex-1 overflow-y-auto p-4">
        {participants.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            暂无成员
          </div>
        ) : (
          <div className="space-y-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {/* Avatar */}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: participant.color }}
                >
                  {participant.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {participant.name}
                    </span>
                    {participant.id === currentUserId && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">(你)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className={`w-2 h-2 rounded-full ${participant.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span>{participant.isOnline ? '在线' : '离线'}</span>
                    <span>•</span>
                    <span className="capitalize">{participant.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main RoomView Component
// ============================================================================

export interface RoomViewProps {
  onSendMessage?: (content: string, replyTo?: string) => void;
  onReactMessage?: (messageId: string, emoji: string) => void;
  onLeaveRoom?: () => void;
}

export function RoomView({ onSendMessage, onReactMessage, onLeaveRoom }: RoomViewProps) {
  const [replyingTo, setReplyingTo] = useState<StoredMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const {
    currentRoomId,
    currentUserId,
    currentUserName,
    showMemberPanel,
    showRoomSettings,
    toggleRoomSettings,
    toggleMemberPanel,
    getCurrentRoom,
    getCurrentMessages,
    getCurrentParticipants,
  } = useWebSocketStore();

  const currentRoom = getCurrentRoom();
  const messages = getCurrentMessages();
  const participants = getCurrentParticipants();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleSendMessage = useCallback((content: string, replyTo?: string) => {
    onSendMessage?.(content, replyTo);
    setReplyingTo(null);
  }, [onSendMessage]);

  const handleReact = useCallback((messageId: string, emoji: string) => {
    onReactMessage?.(messageId, emoji);
  }, [onReactMessage]);

  const handleReply = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setReplyingTo(message);
      // Focus input
      const input = document.querySelector('textarea');
      if (input instanceof HTMLTextAreaElement) {
        input.focus();
      }
    }
  }, [messages]);

  // No room selected
  if (!currentRoom) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-900">
        <span className="text-6xl mb-4">👋</span>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          欢迎来到 WebSocket 房间
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          从左侧选择一个房间，或创建新房间开始聊天
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 relative">
      {/* Header */}
      <RoomHeader
        room={currentRoom}
        onToggleSettings={toggleRoomSettings}
        onToggleMembers={toggleMemberPanel}
        memberCount={participants.length}
      />

      {/* Member Panel Overlay */}
      <MemberPanel
        isOpen={showMemberPanel}
        onClose={() => toggleMemberPanel(false)}
        participants={participants}
        currentUserId={currentUserId}
      />

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-4xl mb-4">💬</span>
            <p className="text-gray-600 dark:text-gray-400">
              暂无消息，开始第一条对话吧！
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                onReact={handleReact}
                onReply={handleReply}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <MessageInput
        disabled={!currentRoom}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSendMessage={handleSendMessage}
      />

      {/* Room Settings Overlay */}
      {showRoomSettings && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              房间设置
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              房间设置功能正在开发中...
            </p>
            <button
              onClick={() => toggleRoomSettings(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomView;
