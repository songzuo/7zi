/**
 * AI Chat Store 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../store';

describe('AI Chat Store', () => {
  beforeEach(() => {
    // 重置 store 状态
    useChatStore.setState({
      sessions: [],
      currentSessionId: null,
      settings: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2048,
        streamEnabled: true,
      },
      isLoading: false,
      error: null,
    });
  });

  describe('createSession', () => {
    it('should create a new session', () => {
      const { createSession, sessions } = useChatStore.getState();
      
      createSession();
      
      const newSessions = useChatStore.getState().sessions;
      expect(newSessions.length).toBe(1);
      expect(newSessions[0].title).toBe('新对话');
      expect(newSessions[0].messages.length).toBe(0);
    });

    it('should set new session as current', () => {
      const { createSession } = useChatStore.getState();
      
      const sessionId = createSession();
      
      expect(useChatStore.getState().currentSessionId).toBe(sessionId);
    });

    it('should add multiple sessions', () => {
      const { createSession } = useChatStore.getState();
      
      createSession();
      createSession();
      createSession();
      
      expect(useChatStore.getState().sessions.length).toBe(3);
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', () => {
      const { createSession, deleteSession } = useChatStore.getState();
      
      const id = createSession();
      deleteSession(id);
      
      expect(useChatStore.getState().sessions.length).toBe(0);
    });

    it('should switch to another session when deleting current', () => {
      const { createSession, deleteSession, setCurrentSession } = useChatStore.getState();
      
      const id1 = createSession();
      const id2 = createSession();
      setCurrentSession(id1);
      
      deleteSession(id1);
      
      const state = useChatStore.getState();
      expect(state.currentSessionId).toBe(id2);
    });
  });

  describe('addMessage', () => {
    it('should add a message to session', () => {
      const { createSession, addMessage } = useChatStore.getState();
      
      const sessionId = createSession();
      addMessage(sessionId, { role: 'user', content: 'Hello' });
      
      const session = useChatStore.getState().sessions.find(s => s.id === sessionId);
      expect(session?.messages.length).toBe(1);
      expect(session?.messages[0].content).toBe('Hello');
      expect(session?.messages[0].role).toBe('user');
    });

    it('should auto-generate message id and timestamp', () => {
      const { createSession, addMessage } = useChatStore.getState();
      
      const sessionId = createSession();
      addMessage(sessionId, { role: 'assistant', content: 'Hi there' });
      
      const session = useChatStore.getState().sessions.find(s => s.id === sessionId);
      const message = session?.messages[0];
      
      expect(message?.id).toBeDefined();
      expect(message?.timestamp).toBeInstanceOf(Date);
    });

    it('should return message id', () => {
      const { createSession, addMessage } = useChatStore.getState();
      
      const sessionId = createSession();
      const messageId = addMessage(sessionId, { role: 'user', content: 'Test' });
      
      expect(messageId).toBeDefined();
      expect(typeof messageId).toBe('string');
    });
  });

  describe('updateMessage', () => {
    it('should update message content', () => {
      const { createSession, addMessage, updateMessage } = useChatStore.getState();
      
      const sessionId = createSession();
      const messageId = addMessage(sessionId, { role: 'assistant', content: 'Initial' });
      updateMessage(sessionId, messageId, 'Updated');
      
      const session = useChatStore.getState().sessions.find(s => s.id === sessionId);
      expect(session?.messages[0].content).toBe('Updated');
    });
  });

  describe('setStreaming', () => {
    it('should set streaming flag on message', () => {
      const { createSession, addMessage, setStreaming } = useChatStore.getState();
      
      const sessionId = createSession();
      const messageId = addMessage(sessionId, { role: 'assistant', content: '' });
      setStreaming(sessionId, messageId, true);
      
      const session = useChatStore.getState().sessions.find(s => s.id === sessionId);
      expect(session?.messages[0].isStreaming).toBe(true);
    });
  });

  describe('clearMessages', () => {
    it('should clear all messages in session', () => {
      const { createSession, addMessage, clearMessages } = useChatStore.getState();
      
      const sessionId = createSession();
      addMessage(sessionId, { role: 'user', content: 'Hello' });
      addMessage(sessionId, { role: 'assistant', content: 'Hi' });
      clearMessages(sessionId);
      
      const session = useChatStore.getState().sessions.find(s => s.id === sessionId);
      expect(session?.messages.length).toBe(0);
    });
  });

  describe('updateSettings', () => {
    it('should update settings partially', () => {
      const { updateSettings } = useChatStore.getState();
      
      updateSettings({ temperature: 0.5 });
      
      const settings = useChatStore.getState().settings;
      expect(settings.temperature).toBe(0.5);
      expect(settings.provider).toBe('openai'); // 保持其他设置
    });

    it('should update provider and model', () => {
      const { updateSettings } = useChatStore.getState();
      
      updateSettings({ provider: 'anthropic', model: 'claude-3-opus' });
      
      const settings = useChatStore.getState().settings;
      expect(settings.provider).toBe('anthropic');
      expect(settings.model).toBe('claude-3-opus');
    });
  });

  describe('updateSessionTitle', () => {
    it('should update session title', () => {
      const { createSession, updateSessionTitle } = useChatStore.getState();
      
      const sessionId = createSession();
      updateSessionTitle(sessionId, 'New Title');
      
      const session = useChatStore.getState().sessions.find(s => s.id === sessionId);
      expect(session?.title).toBe('New Title');
    });
  });

  describe('setLoading and setError', () => {
    it('should set loading state', () => {
      const { setLoading } = useChatStore.getState();
      
      setLoading(true);
      expect(useChatStore.getState().isLoading).toBe(true);
      
      setLoading(false);
      expect(useChatStore.getState().isLoading).toBe(false);
    });

    it('should set error state', () => {
      const { setError } = useChatStore.getState();
      
      setError('Test error');
      expect(useChatStore.getState().error).toBe('Test error');
      
      setError(null);
      expect(useChatStore.getState().error).toBe(null);
    });
  });
});