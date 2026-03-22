/**
 * Tests for Multimodal Image Recognition API
 * /api/multimodal/image/route.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST, GET } from './route';
import { NextRequest } from 'next/server';
import { MultimodalService } from '@/lib/multimodal/multimodal-service';
import type { ValidationResult } from '@/lib/multimodal/image-utils';

// Mock dependencies
vi.mock('@/lib/multimodal/multimodal-service', () => ({
  getMultimodalService: vi.fn(),
}));

vi.mock('@/lib/multimodal/image-utils', () => ({
  validateImage: vi.fn(),
  formatImageMetadata: vi.fn((data) => ({
    format: 'jpeg',
    width: data.width || 0,
    height: data.height || 0,
  })),
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

describe('POST /api/multimodal/image', () => {
  let getMultimodalService: typeof import('@/lib/multimodal/multimodal-service').getMultimodalService;
  let validateImage: typeof import('@/lib/multimodal/image-utils').validateImage;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import mocked functions
    const multimodalModule = await import('@/lib/multimodal/multimodal-service');
    getMultimodalService = multimodalModule.getMultimodalService;

    const utilsModule = await import('@/lib/multimodal/image-utils');
    validateImage = utilsModule.validateImage;

    // Default mocks
    vi.mocked(validateImage).mockResolvedValue({ valid: true });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if no authentication token is provided', async () => {
      vi.mocked(getMultimodalService).mockReturnValue({
        processImage: vi.fn(),
        processAudio: vi.fn(),
        getProviders: vi.fn(),
        healthCheck: vi.fn(),
        setDefaultProvider: vi.fn(),
      } as any);

      const formData = new FormData();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });
  });

  describe('Request Validation', () => {
    it('should return 400 if image file is missing', async () => {
      vi.mocked(getMultimodalService).mockReturnValue({
        processImage: vi.fn(),
        processAudio: vi.fn(),
        getProviders: vi.fn(),
        healthCheck: vi.fn(),
        setDefaultProvider: vi.fn(),
      } as any);

      const request = new NextRequest('http://localhost:3000/api/multimodal/image', {
        method: 'POST',
        body: new FormData(),
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('image file is required');
    });

    it('should return 400 if file type is invalid', async () => {
      vi.mocked(getMultimodalService).mockReturnValue({
        processImage: vi.fn(),
        processAudio: vi.fn(),
        getProviders: vi.fn(),
        healthCheck: vi.fn(),
        setDefaultProvider: vi.fn(),
      } as any);

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
      expect(result.error).toContain('Invalid image file type');
    });

    it('should validate file size', async () => {
      vi.mocked(getMultimodalService).mockReturnValue({
        processImage: vi.fn(),
        processAudio: vi.fn(),
        getProviders: vi.fn(),
        healthCheck: vi.fn(),
        setDefaultProvider: vi.fn(),
      } as any);

      const formData = new FormData();
      const largeBuffer = Buffer.alloc(20 * 1024 * 1024); // 20MB
      const file = new File([largeBuffer], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/image', {
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

  describe('Image Processing', () => {
    it('should process valid image', async () => {
      vi.mocked(validateImage).mockResolvedValue({ valid: true });
      const mockProcessImage = vi.fn().mockResolvedValue({
        success: true,
        data: {
          objects: [
            { label: 'cat', confidence: 0.95, bbox: { x: 10, y: 10, width: 100, height: 100 } },
            { label: 'dog', confidence: 0.85, bbox: { x: 120, y: 10, width: 100, height: 100 } },
          ],
          text: '',
          tags: ['cat', 'dog'],
          confidence: 0.95,
        },
        provider: 'default',
      });

      vi.mocked(getMultimodalService).mockReturnValue({
        processImage: mockProcessImage,
        processAudio: vi.fn(),
        getProviders: vi.fn(),
        healthCheck: vi.fn(),
        setDefaultProvider: vi.fn(),
      } as any);

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
      expect(result.data.objects).toHaveLength(2);
    });

    it('should handle processing errors', async () => {
      vi.mocked(validateImage).mockResolvedValue({ valid: true });
      const mockProcessImage = vi.fn().mockRejectedValue(new Error('Image processing failed'));

      vi.mocked(getMultimodalService).mockReturnValue({
        processImage: mockProcessImage,
        processAudio: vi.fn(),
        getProviders: vi.fn(),
        healthCheck: vi.fn(),
        setDefaultProvider: vi.fn(),
      } as any);

      const formData = new FormData();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);

      const request = new NextRequest('http://localhost:3000/api/multimodal/image', {
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

describe('GET /api/multimodal/image', () => {
  it('should return service information', async () => {
    const request = new NextRequest('http://localhost:3000/api/multimodal/image');

    const response = await GET(request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toHaveProperty('service');
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('endpoints');
  });
});
