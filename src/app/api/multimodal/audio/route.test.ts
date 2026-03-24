/**
 * Tests for Multimodal Audio Transcription API
 * /api/multimodal/audio/route.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST, GET } from './route';
import { NextRequest } from 'next/server';
import { MultimodalService } from '@/lib/multimodal/multimodal-service';
import type { ValidationResult } from '@/lib/multimodal/audio-utils';

// Mock dependencies
vi.mock('@/lib/multimodal/multimodal-service', () => ({
  getMultimodalService: vi.fn(),
}));

vi.mock('@/lib/multimodal/audio-utils', () => ({
  audioToBuffer: vi.fn(),
  validateAudio: vi.fn(),
  formatDuration: vi.fn((seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2)}`),
}));

vi.mock('@/lib/api/error-handler', () => ({
  createValidationError: vi.fn((msg, details) => ({
    status: 400,
    json: async () => ({ success: false, error: msg, details }),
  })),
  createBadRequestError: vi.fn((msg) => ({
    status: 400,
    json: async () => ({ success: false, error: msg }),
  })),
  createErrorResponse: vi.fn((error) => ({
    status: 500,
    json: async () => ({ success: false, error: error.message || 'Internal server error' }),
  })),
}));

describe('POST /api/multimodal/audio', () => {
  let getMultimodalService: typeof import('@/lib/multimodal/multimodal-service').getMultimodalService;
  let audioToBuffer: typeof import('@/lib/multimodal/audio-utils').audioToBuffer;
  let validateAudio: typeof import('@/lib/multimodal/audio-utils').validateAudio;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import mocked functions
    const multimodalModule = await import('@/lib/multimodal/multimodal-service');
    getMultimodalService = multimodalModule.getMultimodalService;

    const utilsModule = await import('@/lib/multimodal/audio-utils');
    audioToBuffer = utilsModule.audioToBuffer;
    validateAudio = utilsModule.validateAudio;

    // Default mocks
    vi.mocked(audioToBuffer).mockResolvedValue(Buffer.from('test-audio-data'));
    vi.mocked(validateAudio).mockResolvedValue({ valid: true });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if no authentication token is provided', async () => {
      vi.mocked(getMultimodalService).mockReturnValue({
        processAudio: vi.fn(),
        processImage: vi.fn(),
        getProviders: vi.fn(),
        healthCheck: vi.fn(),
        setDefaultProvider: vi.fn(),
      } as any);

      const formData = new FormData();
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });

    it('should return 401 if authentication token is invalid', async () => {
      vi.mocked(getMultimodalService).mockReturnValue({
        processAudio: vi.fn(),
        processImage: vi.fn(),
        getProviders: vi.fn(),
        healthCheck: vi.fn(),
        setDefaultProvider: vi.fn(),
      } as any);

      const formData = new FormData();
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid authentication token');
    });
  });

  describe('Request Validation', () => {
    it('should return 400 if audio file is missing', async () => {
      vi.mocked(getMultimodalService).mockReturnValue({
        processAudio: vi.fn(),
        processImage: vi.fn(),
        getProviders: vi.fn(),
        healthCheck: vi.fn(),
        setDefaultProvider: vi.fn(),
      } as any);

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: new FormData(),
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('audio file is required');
    });

    it('should return 400 if file type is invalid', async () => {
      vi.mocked(getMultimodalService).mockReturnValue({
        processAudio: vi.fn(),
        processImage: vi.fn(),
        getProviders: vi.fn(),
        healthCheck: vi.fn(),
        setDefaultProvider: vi.fn(),
      } as any);

      const formData = new FormData();
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      formData.append('audio', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid audio file type');
    });

    it('should validate file size', async () => {
      vi.mocked(getMultimodalService).mockReturnValue({
        processAudio: vi.fn(),
        processImage: vi.fn(),
        getProviders: vi.fn(),
        healthCheck: vi.fn(),
        setDefaultProvider: vi.fn(),
      } as any);

      const formData = new FormData();
      const largeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
      const file = new File([largeBuffer], 'test.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('File size exceeds maximum allowed size');
    });
  });

  describe('Language Support', () => {
    it('should support Chinese language', async () => {
      vi.mocked(validateAudio).mockResolvedValue({ valid: true });
      vi.mocked(getMultimodalService).mockReturnValue({
        processAudio: vi.fn().mockResolvedValue({
          success: true,
          data: {
            text: '你好世界',
            segments: [],
            language: 'zh-CN',
            duration: 5.5,
            confidence: 0.95,
          },
          provider: 'default',
        }),
        processImage: vi.fn(),
        getProviders: vi.fn(),
        healthCheck: vi.fn(),
        setDefaultProvider: vi.fn(),
      } as any);

      const formData = new FormData();
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);
      formData.append('language', 'zh-CN');

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.text).toBe('你好世界');
      expect(result.data.language).toBe('zh-CN');
    });

    it('should support English language', async () => {
      vi.mocked(validateAudio).mockResolvedValue({ valid: true });
      vi.mocked(getMultimodalService).mockReturnValue({
        processAudio: vi.fn().mockResolvedValue({
          success: true,
          data: {
            text: 'Hello world',
            segments: [],
            language: 'en-US',
            duration: 5.5,
            confidence: 0.95,
          },
          provider: 'default',
        }),
        processImage: vi.fn(),
        getProviders: vi.fn(),
        healthCheck: vi.fn(),
        setDefaultProvider: vi.fn(),
      } as any);

      const formData = new FormData();
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);
      formData.append('language', 'en-US');

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.text).toBe('Hello world');
      expect(result.data.language).toBe('en-US');
    });

    it('should return 400 for unsupported language', async () => {
      vi.mocked(getMultimodalService).mockReturnValue({
        processAudio: vi.fn(),
        processImage: vi.fn(),
        getProviders: vi.fn(),
        healthCheck: vi.fn(),
        setDefaultProvider: vi.fn(),
      } as any);

      const formData = new FormData();
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);
      formData.append('language', 'invalid-language');

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported language');
    });
  });

  describe('Audio Processing', () => {
    it('should process valid audio with default options', async () => {
      vi.mocked(validateAudio).mockResolvedValue({ valid: true });
      const mockProcessAudio = vi.fn().mockResolvedValue({
        success: true,
        data: {
          text: 'Hello world',
          segments: [],
          language: 'en-US',
          duration: 5.5,
          confidence: 0.95,
        },
        provider: 'default',
      });

      vi.mocked(getMultimodalService).mockReturnValue({
        processAudio: mockProcessAudio,
        processImage: vi.fn(),
        getProviders: vi.fn(),
        healthCheck: vi.fn(),
        setDefaultProvider: vi.fn(),
      } as any);

      const formData = new FormData();
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.text).toBe('Hello world');
    });

    it('should handle transcription errors', async () => {
      vi.mocked(validateAudio).mockResolvedValue({ valid: true });
      const mockProcessAudio = vi.fn().mockRejectedValue(new Error('Transcription failed'));

      vi.mocked(getMultimodalService).mockReturnValue({
        processAudio: mockProcessAudio,
        processImage: vi.fn(),
        getProviders: vi.fn(),
        healthCheck: vi.fn(),
        setDefaultProvider: vi.fn(),
      } as any);

      const formData = new FormData();
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
    });
  });
});

describe('GET /api/multimodal/audio', () => {
  it('should return service information', async () => {
    const response = await GET();
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toHaveProperty('service');
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('endpoints');
  });
});
