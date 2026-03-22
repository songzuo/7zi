/**
 * Tests for Multimodal Audio Transcription API
 * /api/multimodal/audio/route.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST, GET } from './route';
import { NextRequest } from 'next/server';

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
    json: async () => ({
      success: false,
      error: error.message || 'Internal server error',
    }),
  })),
  ErrorType: {
    VALIDATION: 'VALIDATION',
    BAD_REQUEST: 'BAD_REQUEST',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/api/utils', () => ({
  createSuccessResponse: vi.fn((data) => ({
    status: 200,
    json: async () => ({ success: true, ...data }),
  })),
}));

describe('Multimodal Audio Transcription API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/multimodal/audio', () => {
    it('should reject requests without audio file', async () => {
      const formData = new FormData();

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No audio file provided');
    });

    it('should reject unsupported audio types', async () => {
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
      expect(result.error).toContain('Unsupported audio type');
    });

    it('should reject oversized audio files', async () => {
      const formData = new FormData();
      const largeFile = new File(
        ['x'.repeat(101 * 1024 * 1024)], // 101MB
        'large.mp3',
        { type: 'audio/mpeg' }
      );
      formData.append('audio', largeFile);

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should reject unsupported language', async () => {
      const formData = new FormData();
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);
      formData.append('language', 'unsupported');

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

    it('should process valid audio with default options', async () => {
      const { validateAudio } = await import('@/lib/multimodal/audio-utils');
      vi.mocked(validateAudio).mockResolvedValue({ valid: true });

      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
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
      });

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

    it('should process audio with timestamps', async () => {
      const { validateAudio } = await import('@/lib/multimodal/audio-utils');
      vi.mocked(validateAudio).mockResolvedValue({ valid: true });

      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        processAudio: vi.fn().mockResolvedValue({
          success: true,
          data: {
            text: 'Hello world',
            segments: [
              { start: 0, end: 2.5, text: 'Hello', confidence: 0.95 },
              { start: 2.5, end: 5.5, text: 'world', confidence: 0.90 },
            ],
            language: 'en-US',
            duration: 5.5,
            confidence: 0.95,
          },
          provider: 'default',
        }),
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);
      formData.append('timestamps', 'true');

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.segments).toBeDefined();
      expect(result.data.segments).toHaveLength(2);
      expect(result.data.segments[0].startFormatted).toBeDefined();
      expect(result.data.segments[0].endFormatted).toBeDefined();
    });

    it('should process audio with speaker diarization', async () => {
      const { validateAudio } = await import('@/lib/multimodal/audio-utils');
      vi.mocked(validateAudio).mockResolvedValue({ valid: true });

      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        processAudio: vi.fn().mockResolvedValue({
          success: true,
          data: {
            text: 'Hello world',
            segments: [
              { start: 0, end: 2.5, text: 'Hello', speaker: 'A' },
              { start: 2.5, end: 5.5, text: 'world', speaker: 'B' },
            ],
            language: 'en-US',
            duration: 5.5,
            confidence: 0.95,
            speakerDiarization: true,
          },
          provider: 'default',
        }),
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);
      formData.append('speakerDiarization', 'true');

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.speakerDiarization).toBe(true);
    });

    it('should handle audio validation failure', async () => {
      const { validateAudio } = await import('@/lib/multimodal/audio-utils');
      vi.mocked(validateAudio).mockResolvedValue({
        valid: false,
        error: 'Invalid audio format',
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
    });

    it('should handle transcription timeout', async () => {
      const { validateAudio } = await import('@/lib/multimodal/audio-utils');
      vi.mocked(validateAudio).mockResolvedValue({ valid: true });

      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        processAudio: vi.fn().mockRejectedValue(new Error('timeout')),
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
    });

    it('should handle transcription failure', async () => {
      const { validateAudio } = await import('@/lib/multimodal/audio-utils');
      vi.mocked(validateAudio).mockResolvedValue({ valid: true });

      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        processAudio: vi.fn().mockResolvedValue({
          success: false,
          error: 'Language not supported',
          provider: 'default',
        }),
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Language not supported');
    });

    it('should include metadata in response', async () => {
      const { validateAudio } = await import('@/lib/multimodal/audio-utils');
      vi.mocked(validateAudio).mockResolvedValue({ valid: true, detectedType: 'mp3' });

      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
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
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg', name: 'test.mp3' });
      formData.append('audio', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.filename).toBe('test.mp3');
      expect(result.metadata.type).toBe('audio/mpeg');
      expect(result.metadata.detectedType).toBe('mp3');
      expect(result.metadata.processingTime).toBeDefined();
    });

    it('should format duration correctly', async () => {
      const { validateAudio } = await import('@/lib/multimodal/audio-utils');
      vi.mocked(validateAudio).mockResolvedValue({ valid: true });

      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        processAudio: vi.fn().mockResolvedValue({
          success: true,
          data: {
            text: 'Hello world',
            segments: [],
            language: 'en-US',
            duration: 125.75, // 2 minutes 5.75 seconds
            confidence: 0.95,
          },
          provider: 'default',
        }),
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.durationFormatted).toBeDefined();
    });

    it('should calculate word count', async () => {
      const { validateAudio } = await import('@/lib/multimodal/audio-utils');
      vi.mocked(validateAudio).mockResolvedValue({ valid: true });

      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        processAudio: vi.fn().mockResolvedValue({
          success: true,
          data: {
            text: 'Hello world this is a test',
            segments: [],
            language: 'en-US',
            duration: 5.5,
            confidence: 0.95,
          },
          provider: 'default',
        }),
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.wordCount).toBe(6);
    });
  });

  describe('GET /api/multimodal/audio', () => {
    it('should return list of audio providers', async () => {
      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        getProviders: vi.fn(() => [
          { name: 'provider1', capabilities: ['audio', 'transcription'] },
          { name: 'provider2', capabilities: ['audio'] },
          { name: 'provider3', capabilities: ['image'] },
        ]),
        healthCheck: vi.fn().mockResolvedValue({
          provider1: true,
          provider2: true,
        }),
      });

      const response = await GET();
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.providers).toHaveLength(2); // Only audio providers
      expect(result.total).toBe(2);
      expect(result.operational).toBe(2);
    });

    it('should include health status for each provider', async () => {
      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        getProviders: vi.fn(() => [
          { name: 'provider1', capabilities: ['audio'] },
        ]),
        healthCheck: vi.fn().mockResolvedValue({
          provider1: true,
        }),
      });

      const response = await GET();
      const result = await response.json();

      expect(result.providers[0].healthy).toBe(true);
      expect(result.providers[0].status).toBe('operational');
    });

    it('should include supported languages', async () => {
      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        getProviders: vi.fn(() => []),
        healthCheck: vi.fn().mockResolvedValue({}),
      });

      const response = await GET();
      const result = await response.json();

      expect(result.supportedLanguages).toBeDefined();
      expect(Array.isArray(result.supportedLanguages)).toBe(true);
      expect(result.supportedLanguages.length).toBeGreaterThan(0);
    });

    it('should include supported audio types', async () => {
      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        getProviders: vi.fn(() => []),
        healthCheck: vi.fn().mockResolvedValue({}),
      });

      const response = await GET();
      const result = await response.json();

      expect(result.supportedTypes).toBeDefined();
      expect(Array.isArray(result.supportedTypes)).toBe(true);
      expect(result.supportedTypes).toContain('audio/mpeg');
      expect(result.supportedTypes).toContain('audio/wav');
    });

    it('should include max size information', async () => {
      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        getProviders: vi.fn(() => []),
        healthCheck: vi.fn().mockResolvedValue({}),
      });

      const response = await GET();
      const result = await response.json();

      expect(result.maxSizeBytes).toBe(100 * 1024 * 1024);
      expect(result.maxSizeMB).toBe('100');
    });

    it('should handle health check failure gracefully', async () => {
      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        getProviders: vi.fn(() => [
          { name: 'provider1', capabilities: ['audio'] },
        ]),
        healthCheck: vi.fn().mockRejectedValue(new Error('Health check failed')),
      });

      const response = await GET();
      const result = await response.json();

      expect(result.providers[0].healthy).toBe(false);
      expect(result.providers[0].status).toBe('unavailable');
    });
  });
});
