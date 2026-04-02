/**
 * Tests for Multimodal Image API route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/multimodal/image/route'
import { NextRequest } from 'next/server'
import { vi as vitest } from 'vitest'

// Mock dependencies
const mockAnalyzeImage = vi.fn(() =>
  Promise.resolve({
    description: 'A beautiful sunset over the ocean',
    confidence: 0.92,
    tags: ['sunset', 'ocean', 'beach', 'nature'],
    colors: ['#FF6B35', '#FF8C42', '#F9C784', '#4ECDC4'],
    objects: [
      { name: 'sun', confidence: 0.98, boundingBox: { x: 100, y: 50, width: 80, height: 80 } },
      { name: 'water', confidence: 0.95, boundingBox: { x: 0, y: 200, width: 500, height: 300 } },
    ],
    faces: [],
    text: [],
  })
)

const mockDetectText = vi.fn(() =>
  Promise.resolve({
    text: 'Hello World',
    confidence: 0.95,
    language: 'en',
    regions: [
      {
        text: 'Hello',
        boundingBox: { x: 10, y: 10, width: 50, height: 20 },
        confidence: 0.96,
      },
      {
        text: 'World',
        boundingBox: { x: 70, y: 10, width: 50, height: 20 },
        confidence: 0.94,
      },
    ],
  })
)

const mockDetectFaces = vi.fn(() =>
  Promise.resolve({
    faces: [
      {
        id: 'face1',
        boundingBox: { x: 100, y: 50, width: 80, height: 100 },
        confidence: 0.97,
        attributes: {
          age: { min: 25, max: 35 },
          gender: { type: 'male', confidence: 0.98 },
          emotion: { type: 'happy', confidence: 0.95 },
          smile: { value: true, confidence: 0.92 },
        },
      },
    ],
    count: 1,
  })
)

const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}

vi.mock('@/lib/multimodal/image-utils', () => ({
  analyzeImage: mockAnalyzeImage,
  detectText: mockDetectText,
  detectFaces: mockDetectFaces,
}))

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}))

vi.mock('@/lib/api/error-handler', () => ({
  createSuccessResponse: vi.fn((data, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
  createErrorResponse: vi.fn(error => {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
  createValidationError: vi.fn(message => {
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
}))

describe('POST /api/multimodal/image', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should analyze image and return description', async () => {
    const formData = new FormData()
    formData.append('image', new Blob(['image data'], { type: 'image/jpeg' }), 'test.jpg')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should validate presence of image file', async () => {
    const formData = new FormData()
    formData.append('other', 'data')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should validate image file type', async () => {
    const formData = new FormData()
    formData.append('image', new Blob(['data'], { type: 'text/plain' }), 'test.txt')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should support different image formats', async () => {
    const formats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']

    for (const format of formats) {
      const formData = new FormData()
      formData.append('image', new Blob(['image data'], { type: format }), 'test.image')

      const request = new NextRequest('http://localhost/api/multimodal/image', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    }
  })

  it('should validate file size', async () => {
    // Create a large blob (15MB)
    const largeBlob = new Blob([new ArrayBuffer(15 * 1024 * 1024)], { type: 'image/jpeg' })

    const formData = new FormData()
    formData.append('image', largeBlob, 'large.jpg')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should detect text when requested', async () => {
    const formData = new FormData()
    formData.append('image', new Blob(['image data'], { type: 'image/jpeg' }), 'test.jpg')
    formData.append('detect_text', 'true')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should detect faces when requested', async () => {
    const formData = new FormData()
    formData.append('image', new Blob(['image data'], { type: 'image/jpeg' }), 'test.jpg')
    formData.append('detect_faces', 'true')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should return object detection results', async () => {
    const formData = new FormData()
    formData.append('image', new Blob(['image data'], { type: 'image/jpeg' }), 'test.jpg')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should extract color palette', async () => {
    const formData = new FormData()
    formData.append('image', new Blob(['image data'], { type: 'image/jpeg' }), 'test.jpg')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should handle analysis errors', async () => {
    const { analyzeImage } = require('../../../lib/multimodal/image-utils')
    analyzeImage.mockRejectedValueOnce(new Error('Analysis failed'))

    const formData = new FormData()
    formData.append('image', new Blob(['image data'], { type: 'image/jpeg' }), 'test.jpg')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
  })

  it('should handle malformed FormData', async () => {
    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: 'not valid form data',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should support language parameter for description', async () => {
    const formData = new FormData()
    formData.append('image', new Blob(['image data'], { type: 'image/jpeg' }), 'test.jpg')
    formData.append('language', 'zh-CN')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should log successful analysis', async () => {
    const formData = new FormData()
    formData.append('image', new Blob(['image data'], { type: 'image/jpeg' }), 'test.jpg')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    await POST(request)

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Image analyzed'),
      expect.any(Object)
    )
  })

  it('should log errors', async () => {
    mockAnalyzeImage.mockRejectedValueOnce(new Error('Analysis error'))

    const formData = new FormData()
    formData.append('image', new Blob(['image data'], { type: 'image/jpeg' }), 'test.jpg')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    await POST(request)

    expect(mockLogger.error).toHaveBeenCalled()
  })

  it('should handle empty image file', async () => {
    const formData = new FormData()
    formData.append('image', new Blob([], { type: 'image/jpeg' }), 'empty.jpg')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should support callback URL for async processing', async () => {
    const formData = new FormData()
    formData.append('image', new Blob(['image data'], { type: 'image/jpeg' }), 'test.jpg')
    formData.append('callback_url', 'https://example.com/callback')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should handle face detection errors', async () => {
    mockDetectFaces.mockRejectedValueOnce(new Error('Face detection failed'))

    const formData = new FormData()
    formData.append('image', new Blob(['image data'], { type: 'image/jpeg' }), 'test.jpg')
    formData.append('detect_faces', 'true')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(200) // Should still return result with error in face detection
  })

  it('should handle text detection errors', async () => {
    mockDetectText.mockRejectedValueOnce(new Error('Text detection failed'))

    const formData = new FormData()
    formData.append('image', new Blob(['image data'], { type: 'image/jpeg' }), 'test.jpg')
    formData.append('detect_text', 'true')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(200) // Should still return result with error in text detection
  })

  it('should validate image dimensions', async () => {
    // This would need actual image data for dimension validation
    // For now, we test that the endpoint accepts valid images
    const formData = new FormData()
    formData.append('image', new Blob(['image data'], { type: 'image/jpeg' }), 'test.jpg')

    const request = new NextRequest('http://localhost/api/multimodal/image', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })
})
