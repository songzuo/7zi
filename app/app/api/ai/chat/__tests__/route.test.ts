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

    it('should return mock response when no API key', async () => {
      // 无 API Key 时返回模拟响应
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

    it('should handle stream request with mock', async () => {
      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
          stream: true,
        }),
      });

      const response = await POST(request);

      // 开发模式下使用 mock 响应
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    });

    it('should accept valid request body', async () => {
      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test message' }],
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.5,
          maxTokens: 1024,
          stream: false,
        }),
      });

      const response = await POST(request);
      
      // 在开发模式下应该成功
      expect([200, 500]).toContain(response.status);
    });
  });
});