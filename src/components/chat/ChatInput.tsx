/**
 * @fileoverview 聊天输入组件
 * @description 消息输入框和发送按钮
 */

'use client'

import { forwardRef } from 'react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
}

/**
 * 聊天输入组件
 * @param value - 输入值
 * @param onChange - 输入变化回调
 * @param onSend - 发送消息回调
 * @param ref - 输入框引用
 */
export const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(function ChatInput(
  { value, onChange, onSend },
  ref
) {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSend()
    }
  }

  return (
    <div className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex gap-2">
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入消息..."
          className="dark:hover:bg-zinc-750 flex-1 rounded-full bg-zinc-100 px-4 py-3 text-sm transition-all duration-200 hover:bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 focus:outline-none dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-zinc-700"
        />
        <button
          onClick={onSend}
          disabled={!value.trim()}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-cyan-500/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          aria-label="发送消息"
        >
          <span className="transition-transform group-hover:translate-x-0.5">➤</span>
        </button>
      </div>
    </div>
  )
})
