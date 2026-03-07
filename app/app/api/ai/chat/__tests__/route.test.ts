/**
 * AI Chat API 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AI Chat API', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('GET /api/ai/chat', () => {
    it('should return supported providers', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.providers).toBeDefined();
      expect(Array.isArray(data.providers)).toBe(true);
      expect(data.providers.length).toBeGreaterThan(0);
    });

    it('should include provider names and models', async () => {
      const response = await GET();
      const data = await response.json();

      const openai = data.providers.find((p: { name: string }) => p.name === 'openai');
      expect(openai).toBeDefined();
      expect(openai.models).toContain('gpt-4');
    });
  });

  describe('POST /api/ai/chat', () => {
    it('should return error for empty messages', async () => {
      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [] }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return mock response in development mode', async () => {
      // 在开发模式下没有 API Key 时返回模拟响应
      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toBeDefined();
      expect(data.role).toBe('assistant');
    });

    it('should return error for unsupported provider', async () => {
      // 临时设置 API Key 来绕过 mock
      const originalEnv = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-key';

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
          provider: 'unsupported_provider',
          stream: false,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('不支持的 AI 提供商');

      // 恢复环境变量
      process.env.OPENAI_API_KEY = originalEnv;
    });

    it('should handle stream request', async () => {
      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
          stream: true,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    });
  });
});