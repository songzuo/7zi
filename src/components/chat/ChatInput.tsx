/**
 * @fileoverview 聊天输入组件
 * @description 消息输入框和发送按钮
 */

'use client';

import { forwardRef } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

/**
 * 聊天输入组件
 * @param value - 输入值
 * @param onChange - 输入变化回调
 * @param onSend - 发送消息回调
 * @param ref - 输入框引用
 */
export const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
  function ChatInput({ value, onChange, onSend }, ref) {
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onSend();
      }
    };

    return (
      <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-2">
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white dark:placeholder-zinc-500 transition-all duration-200 focus:bg-white dark:focus:bg-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750"
          />
          <button
            onClick={onSend}
            disabled={!value.trim()}
            className="w-11 h-11 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white flex items-center justify-center hover:shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110 active:scale-95 disabled:hover:scale-100"
            aria-label="发送消息"
          >
            <span className="transition-transform group-hover:translate-x-0.5">➤</span>
          </button>
        </div>
      </div>
    );
  }
);