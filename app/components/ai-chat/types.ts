/**
 * AI 聊天类型定义
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AIProvider {
  name: string;
  models: string[];
  defaultModel: string;
}

export interface ChatSettings {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  streamEnabled: boolean;
}

export interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  settings: ChatSettings;
  isLoading: boolean;
  error: string | null;
}

export interface StreamingChunk {
  content: string;
  done: boolean;
  error?: string;
}
