/**
 * Tests for Multimodal Image Processing API
 * /api/multimodal/image/route.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST, GET } from './route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/multimodal/multimodal-service', () => ({
  getMultimodalService: vi.fn(),
}));

vi.mock('@/lib/multimodal/image-utils', () => ({
  validateImage: vi.fn(),
  compressImage: vi.fn(),
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
    INTERNAL: 'INTERNAL',
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

describe('Multimodal Image Processing API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/multimodal/image', () => {
    it('should reject requests without image file', async () => {
      const formData = new FormData();
      formData.append('maxSize', '10485760');

      const request = new NextRequest('http://localhost:3000/api/multimodal/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
    });

    it('should reject unsupported image types', async () => {
      const formData = new FormData();
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      formData.append('image', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported image type');
    });

    it('should validate maxSize parameter', async () => {
      const formData = new FormData();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);
      formData.append('maxSize', 'invalid');

      const request = new NextRequest('http://localhost:3000/api/multimodal/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid maxSize value');
    });

    it('should validate quality parameter', async () => {
      const formData = new FormData();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);
      formData.append('quality', '2.0');

      const request = new NextRequest('http://localhost:3000/api/multimodal/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid quality value');
    });

    it('should process valid image with default options', async () => {
      const { validateImage, compressImage } = await import('@/lib/multimodal/image-utils');
      vi.mocked(validateImage).mockResolvedValue({ valid: true });

      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        processImage: vi.fn().mockResolvedValue({
          success: true,
          data: { url: 'https://example.com/image.jpg' },
          provider: 'default',
        }),
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should compress image when requested', async () => {
      const { validateImage, compressImage } = await import('@/lib/multimodal/image-utils');
      vi.mocked(validateImage).mockResolvedValue({ valid: true });
      vi.mocked(compressImage).mockResolvedValue(Buffer.from('compressed'));

      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        processImage: vi.fn().mockResolvedValue({
          success: true,
          data: { url: 'https://example.com/image.jpg' },
          provider: 'default',
        }),
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);
      formData.append('compress', 'true');
      formData.append('quality', '0.8');

      const request = new NextRequest('http://localhost:3000/api/multimodal/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(compressImage).toHaveBeenCalled();
    });

    it('should handle image validation failure', async () => {
      const { validateImage } = await import('@/lib/multimodal/image-utils');
      vi.mocked(validateImage).mockResolvedValue({
        valid: false,
        error: 'Image file too large',
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
    });

    it('should handle processing failure', async () => {
      const { validateImage } = await import('@/lib/multimodal/image-utils');
      vi.mocked(validateImage).mockResolvedValue({ valid: true });

      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        processImage: vi.fn().mockResolvedValue({
          success: false,
          error: 'Unsupported image format',
          provider: 'default',
        }),
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
    });

    it('should include metadata in response', async () => {
      const { validateImage } = await import('@/lib/multimodal/image-utils');
      vi.mocked(validateImage).mockResolvedValue({ valid: true });

      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        processImage: vi.fn().mockResolvedValue({
          success: true,
          data: { url: 'https://example.com/image.jpg' },
          provider: 'default',
        }),
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg', name: 'test.jpg' });
      formData.append('image', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.filename).toBe('test.jpg');
      expect(result.metadata.type).toBe('image/jpeg');
      expect(result.metadata.processingTime).toBeDefined();
    });
  });

  describe('GET /api/multimodal/image', () => {
    it('should return list of providers', async () => {
      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        getProviders: vi.fn(() => [
          { name: 'provider1', capabilities: ['image'] },
          { name: 'provider2', capabilities: ['image'] },
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
      expect(result.providers).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.operational).toBe(2);
    });

    it('should include health status for each provider', async () => {
      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        getProviders: vi.fn(() => [
          { name: 'provider1', capabilities: ['image'] },
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

    it('should handle health check failure gracefully', async () => {
      const { getMultimodalService } = await import('@/lib/multimodal/multimodal-service');
      vi.mocked(getMultimodalService).mockReturnValue({
        getProviders: vi.fn(() => [
          { name: 'provider1', capabilities: ['image'] },
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
