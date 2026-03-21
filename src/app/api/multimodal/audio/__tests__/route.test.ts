/**
 * Tests for Multimodal Audio API route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/multimodal/audio/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/multimodal/bailian-provider', () => ({
  processAudio: vi.fn(() =>
    Promise.resolve({
      text: 'Transcribed audio content',
      confidence: 0.95,
      language: 'en',
      duration: 12.5,
    })
  ),
  recognizeEmotion: vi.fn(() =>
    Promise.resolve({
      emotion: 'happy',
      confidence: 0.88,
      timestamps: [
        { start: 0, end: 5, emotion: 'neutral', confidence: 0.9 },
        { start: 5, end: 12.5, emotion: 'happy', confidence: 0.88 },
      ],
    })
  ),
}));

vi.mock('@/lib/multimodal/volcengine-provider', () => ({
  processAudio: vi.fn(() =>
    Promise.resolve({
      text: 'Transcribed audio content',
      confidence: 0.95,
      language: 'en',
      duration: 12.5,
    })
  ),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/api/error-handler', () => ({
  createSuccessResponse: vi.fn((data, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
  createErrorResponse: vi.fn((error) => {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }),
  createValidationError: vi.fn((message) => {
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }),
}));

describe('POST /api/multimodal/audio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process audio and return transcription', async () => {
    const formData = new FormData();
    formData.append('audio', new Blob(['audio data'], { type: 'audio/mpeg' }), 'test.mp3');

    const request = new NextRequest('http://localhost/api/multimodal/audio', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it('should validate presence of audio file', async () => {
    const formData = new FormData();
    formData.append('other', 'data');

    const request = new NextRequest('http://localhost/api/multimodal/audio', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('should validate audio file type', async () => {
    const formData = new FormData();
    formData.append('audio', new Blob(['data'], { type: 'text/plain' }), 'test.txt');

    const request = new NextRequest('http://localhost/api/multimodal/audio', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('should support different audio formats', async () => {
    const formats = [
      'audio/mpeg',
      'audio/wav',
      'audio/wave',
      'audio/ogg',
      'audio/mp4',
      'audio/x-m4a',
      'audio/aac',
    ];

    for (const format of formats) {
      const formData = new FormData();
      formData.append('audio', new Blob(['audio data'], { type: format }), 'test.audio');

      const request = new NextRequest('http://localhost/api/multimodal/audio', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    }
  });

  it('should validate file size', async () => {
    // Create a large blob (25MB)
    const largeBlob = new Blob([new ArrayBuffer(25 * 1024 * 1024)], { type: 'audio/mpeg' });

    const formData = new FormData();
    formData.append('audio', largeBlob, 'large.mp3');

    const request = new NextRequest('http://localhost/api/multimodal/audio', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('should handle transcription errors', async () => {
    const { processAudio } = require('@/lib/multimodal/bailian-provider');
    processAudio.mockRejectedValueOnce(new Error('Transcription failed'));

    const formData = new FormData();
    formData.append('audio', new Blob(['audio data'], { type: 'audio/mpeg' }), 'test.mp3');

    const request = new NextRequest('http://localhost/api/multimodal/audio', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
  });

  it('should support language parameter', async () => {
    const formData = new FormData();
    formData.append('audio', new Blob(['audio data'], { type: 'audio/mpeg' }), 'test.mp3');
    formData.append('language', 'zh-CN');

    const request = new NextRequest('http://localhost/api/multimodal/audio', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it('should support emotion recognition', async () => {
    const formData = new FormData();
    formData.append('audio', new Blob(['audio data'], { type: 'audio/mpeg' }), 'test.mp3');
    formData.append('detect_emotion', 'true');

    const request = new NextRequest('http://localhost/api/multimodal/audio', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it('should handle malformed FormData', async () => {
    const request = new NextRequest('http://localhost/api/multimodal/audio', {
      method: 'POST',
      body: 'not valid form data',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('should log successful processing', async () => {
    const { logger } = require('@/lib/logger');

    const formData = new FormData();
    formData.append('audio', new Blob(['audio data'], { type: 'audio/mpeg' }), 'test.mp3');

    const request = new NextRequest('http://localhost/api/multimodal/audio', {
      method: 'POST',
      body: formData,
    });

    await POST(request);

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Audio processed'),
      expect.any(Object)
    );
  });

  it('should log errors', async () => {
    const { logger } = require('@/lib/logger');
    const { processAudio } = require('@/lib/multimodal/bailian-provider');
    processAudio.mockRejectedValueOnce(new Error('Processing error'));

    const formData = new FormData();
    formData.append('audio', new Blob(['audio data'], { type: 'audio/mpeg' }), 'test.mp3');

    const request = new NextRequest('http://localhost/api/multimodal/audio', {
      method: 'POST',
      body: formData,
    });

    await POST(request);

    expect(logger.error).toHaveBeenCalled();
  });

  it('should support provider selection', async () => {
    const formData = new FormData();
    formData.append('audio', new Blob(['audio data'], { type: 'audio/mpeg' }), 'test.mp3');
    formData.append('provider', 'volcengine');

    const request = new NextRequest('http://localhost/api/multimodal/audio', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it('should handle empty audio file', async () => {
    const formData = new FormData();
    formData.append('audio', new Blob([], { type: 'audio/mpeg' }), 'empty.mp3');

    const request = new NextRequest('http://localhost/api/multimodal/audio', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('should support callback URL for async processing', async () => {
    const formData = new FormData();
    formData.append('audio', new Blob(['audio data'], { type: 'audio/mpeg' }), 'test.mp3');
    formData.append('callback_url', 'https://example.com/callback');

    const request = new NextRequest('http://localhost/api/multimodal/audio', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});
