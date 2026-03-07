/**
 * AI 聊天组件 - 支持流式响应
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trash2, Plus, Settings, Loader2, Bot, User, Copy, Check } from 'lucide-react';
import { useChatStore } from './store';
import type { ChatMessage } from './types';

// 消息气泡组件
function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming && message.role === 'assistant';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          className={`inline-block px-4 py-2 rounded-2xl ${
            isUser
              ? 'bg-blue-500 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-800 rounded-bl-md'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">
            {message.content}
            {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />}
          </p>
        </div>
        <div className="mt-1 text-xs text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="ml-2 hover:text-gray-600 transition-colors"
              title="复制"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 设置面板组件
function SettingsPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { settings, updateSettings } = useChatStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">聊天设置</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI 提供商
            </label>
            <select
              value={settings.provider}
              onChange={(e) => updateSettings({ provider: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="minimax">MiniMax</option>
              <option value="volcengine">火山引擎</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              模型
            </label>
            <select
              value={settings.model}
              onChange={(e) => updateSettings({ model: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {settings.provider === 'openai' && (
                <>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </>
              )}
              {settings.provider === 'anthropic' && (
                <>
                  <option value="claude-3-opus">Claude 3 Opus</option>
                  <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  <option value="claude-3-haiku">Claude 3 Haiku</option>
                </>
              )}
              {settings.provider === 'minimax' && (
                <>
                  <option value="abab6.5s-chat">ABAB 6.5s</option>
                  <option value="abab5.5-chat">ABAB 5.5</option>
                </>
              )}
              {settings.provider === 'volcengine' && (
                <>
                  <option value="doubao-pro-32k">豆包 Pro 32K</option>
                  <option value="doubao-pro-128k">豆包 Pro 128K</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              温度: {settings.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>精确</span>
              <span>创意</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              启用流式响应
            </label>
            <button
              onClick={() => updateSettings({ streamEnabled: !settings.streamEnabled })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.streamEnabled ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  settings.streamEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          完成
        </button>
      </div>
    </div>
  );
}

// 会话列表组件
function SessionList() {
  const { sessions, currentSessionId, setCurrentSession, createSession, deleteSession } = useChatStore();

  return (
    <div className="w-64 bg-gray-50 border-r flex flex-col h-full">
      <div className="p-3 border-b">
        <button
          onClick={() => createSession()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={18} />
          <span>新对话</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              currentSessionId === session.id
                ? 'bg-blue-100 text-blue-700'
                : 'hover:bg-gray-200'
            }`}
            onClick={() => setCurrentSession(session.id)}
          >
            <Bot size={16} className="flex-shrink-0" />
            <span className="flex-1 truncate text-sm">{session.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSession(session.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        
        {sessions.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            点击上方按钮开始新对话
          </div>
        )}
      </div>
    </div>
  );
}

// 主聊天组件
export default function AIChat() {
  const {
    sessions,
    currentSessionId,
    settings,
    isLoading,
    error,
    createSession,
    addMessage,
    updateMessage,
    setStreaming,
    setLoading,
    setError,
    updateSessionTitle,
    clearMessages,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 获取当前会话
  const currentSession = sessions.find((s) => s.id === currentSessionId);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // 初始化会话
  useEffect(() => {
    if (sessions.length === 0) {
      createSession();
    }
  }, []);

  // 发送消息
  const sendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || !currentSessionId || isLoading) return;

    setInput('');
    setLoading(true);
    setError(null);

    // 添加用户消息
    addMessage(currentSessionId, { role: 'user', content });

    // 更新会话标题
    if (currentSession?.title === '新对话') {
      updateSessionTitle(currentSessionId, content.slice(0, 20));
    }

    try {
      // 准备消息历史
      const messages = [
        ...(currentSession?.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user' as const, content },
      ];

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          provider: settings.provider,
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          stream: settings.streamEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      // 流式响应
      if (settings.streamEnabled && response.body) {
        const assistantMessageId = addMessage(currentSessionId, {
          role: 'assistant',
          content: '',
        });
        setStreaming(currentSessionId, assistantMessageId, true);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  accumulatedContent += data.content;
                  updateMessage(currentSessionId, assistantMessageId, accumulatedContent);
                }
                if (data.done) {
                  setStreaming(currentSessionId, assistantMessageId, false);
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      } else {
        // 非流式响应
        const data = await response.json();
        addMessage(currentSessionId, {
          role: 'assistant',
          content: data.content,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setLoading(false);
    }
  }, [input, currentSessionId, isLoading, currentSession, settings]);

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full bg-white rounded-xl shadow-lg overflow-hidden">
      {/* 会话列表 */}
      <SessionList />

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <h1 className="font-semibold text-gray-800">
            {currentSession?.title || 'AI 助手'}
          </h1>
          <div className="flex items-center gap-2">
            {currentSession && (
              <button
                onClick={() => clearMessages(currentSessionId!)}
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="清空对话"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              title="设置"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {currentSession?.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Bot size={48} className="mb-4" />
              <p className="text-lg">有什么可以帮助你的吗？</p>
              <p className="text-sm mt-2">输入问题开始对话</p>
            </div>
          )}

          {currentSession?.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isLoading && !settings.streamEnabled && (
            <div className="flex items-center gap-2 text-gray-400 mb-4">
              <Loader2 size={18} className="animate-spin" />
              <span>思考中...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-500 px-4 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="border-t p-4">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Shift+Enter 换行)"
              className="flex-1 resize-none border rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none max-h-32"
              rows={1}
              style={{
                height: 'auto',
                minHeight: '44px',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {settings.provider} / {settings.model} · 温度: {settings.temperature}
          </p>
        </div>
      </div>

      {/* 设置面板 */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}