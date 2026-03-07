/**
 * AI 聊天状态管理 - Zustand Store
 */

import { create } from 'zustand';
import type { ChatMessage, ChatSession, ChatSettings, ChatState } from './types';

const generateId = () => Math.random().toString(36).substring(2, 15);

const createNewSession = (): ChatSession => ({
  id: generateId(),
  title: '新对话',
  messages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

const defaultSettings: ChatSettings = {
  provider: 'openai',
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2048,
  streamEnabled: true,
};

export const useChatStore = create<ChatState & {
  // Actions
  createSession: () => string;
  deleteSession: (sessionId: string) => void;
  setCurrentSession: (sessionId: string | null) => void;
  addMessage: (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (sessionId: string, messageId: string, content: string) => void;
  setStreaming: (sessionId: string, messageId: string, isStreaming: boolean) => void;
  clearMessages: (sessionId: string) => void;
  updateSettings: (settings: Partial<ChatSettings>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
}>((set, get) => ({
  // State
  sessions: [],
  currentSessionId: null,
  settings: defaultSettings,
  isLoading: false,
  error: null,

  // Actions
  createSession: () => {
    const session = createNewSession();
    set((state) => ({
      sessions: [session, ...state.sessions],
      currentSessionId: session.id,
    }));
    return session.id;
  },

  deleteSession: (sessionId: string) => {
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== sessionId);
      const currentSessionId = state.currentSessionId === sessionId
        ? sessions[0]?.id || null
        : state.currentSessionId;
      return { sessions, currentSessionId };
    });
  },

  setCurrentSession: (sessionId: string | null) => {
    set({ currentSessionId: sessionId });
  },

  addMessage: (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const messageId = generateId();
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: [
                ...session.messages,
                { ...message, id: messageId, timestamp: new Date() },
              ],
              updatedAt: new Date(),
            }
          : session
      ),
    }));
    return messageId;
  },

  updateMessage: (sessionId: string, messageId: string, content: string) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: session.messages.map((msg) =>
                msg.id === messageId ? { ...msg, content } : msg
              ),
              updatedAt: new Date(),
            }
          : session
      ),
    }));
  },

  setStreaming: (sessionId: string, messageId: string, isStreaming: boolean) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: session.messages.map((msg) =>
                msg.id === messageId ? { ...msg, isStreaming } : msg
              ),
              updatedAt: new Date(),
            }
          : session
      ),
    }));
  },

  clearMessages: (sessionId: string) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? { ...session, messages: [], updatedAt: new Date() }
          : session
      ),
    }));
  },

  updateSettings: (newSettings: Partial<ChatSettings>) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  updateSessionTitle: (sessionId: string, title: string) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId ? { ...session, title } : session
      ),
    }));
  },
}));
