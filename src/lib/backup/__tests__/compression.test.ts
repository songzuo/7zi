/**
 * Compression Module Tests
 */

import { describe, it, expect } from 'vitest'
import {
  compressBackup,
  decompressBackup,
  calculateCompressionRatio,
  estimateCompressedSize,
} from '../compression'
import { CompressionAlgorithm } from '../types'

describe('Compression Module', () => {
  const testData = JSON.stringify({
    users: Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      createdAt: new Date().toISOString(),
    })),
    tasks: Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      title: `Task ${i + 1}`,
      description: `This is a description for task ${i + 1}`.repeat(10),
      status: 'pending',
      userId: (i % 10) + 1,
    })),
  })

  describe('compressBackup', () => {
    it('should return original data for NONE algorithm', async () => {
      const compressed = await compressBackup(testData, CompressionAlgorithm.NONE)

      expect(compressed).toBe(testData)
    })

    it('should compress data with GZIP', async () => {
      const compressed = await compressBackup(testData, CompressionAlgorithm.GZIP)

      expect(compressed).not.toBe(testData)
      expect(compressed.length).toBeLessThan(testData.length)
    })

    it('should compress data with Brotli', async () => {
      const compressed = await compressBackup(testData, CompressionAlgorithm.BROTLI)

      expect(compressed).not.toBe(testData)
      expect(compressed.length).toBeLessThan(testData.length)
    })

    it('should compress data with Deflate', async () => {
      const compressed = await compressBackup(testData, CompressionAlgorithm.DEFLATE)

      expect(compressed).not.toBe(testData)
      expect(compressed.length).toBeLessThan(testData.length)
    })

    it('should return valid base64 for compression', async () => {
      const compressed = await compressBackup(testData, CompressionAlgorithm.GZIP)

      // Should be valid base64
      expect(() => Buffer.from(compressed, 'base64')).not.toThrow()
    })

    it('should handle empty string', async () => {
      const compressed = await compressBackup('', CompressionAlgorithm.GZIP)

      expect(compressed).toBeDefined()
    })
  })

  describe('decompressBackup', () => {
    it('should return original data for NONE algorithm', async () => {
      const decompressed = await decompressBackup(testData, CompressionAlgorithm.NONE)

      expect(decompressed).toBe(testData)
    })

    it('should decompress GZIP compressed data', async () => {
      const compressed = await compressBackup(testData, CompressionAlgorithm.GZIP)
      const decompressed = await decompressBackup(compressed, CompressionAlgorithm.GZIP)

      expect(decompressed).toBe(testData)
    })

    it('should decompress Brotli compressed data', async () => {
      const compressed = await compressBackup(testData, CompressionAlgorithm.BROTLI)
      const decompressed = await decompressBackup(compressed, CompressionAlgorithm.BROTLI)

      expect(decompressed).toBe(testData)
    })

    it('should decompress Deflate compressed data', async () => {
      const compressed = await compressBackup(testData, CompressionAlgorithm.DEFLATE)
      const decompressed = await decompressBackup(compressed, CompressionAlgorithm.DEFLATE)

      expect(decompressed).toBe(testData)
    })

    it('should handle multiple compression/decompression cycles', async () => {
      let data = testData

      for (let i = 0; i < 3; i++) {
        const compressed = await compressBackup(data, CompressionAlgorithm.GZIP)
        data = await decompressBackup(compressed, CompressionAlgorithm.GZIP)
      }

      expect(data).toBe(testData)
    })
  })

  describe('calculateCompressionRatio', () => {
    it('should calculate correct compression ratio', () => {
      const ratio = calculateCompressionRatio(1000, 300)

      expect(ratio).toBe(70) // 70% compression
    })

    it('should handle zero original size', () => {
      const ratio = calculateCompressionRatio(0, 0)

      expect(ratio).toBe(0)
    })

    it('should return 0 when no compression', () => {
      const ratio = calculateCompressionRatio(1000, 1000)

      expect(ratio).toBe(0)
    })

    it('should return positive ratio when compression achieved', () => {
      const ratio = calculateCompressionRatio(1000, 500)

      expect(ratio).toBeGreaterThan(0)
      expect(ratio).toBeLessThanOrEqual(100)
    })

    it('should return negative ratio when size increased', () => {
      const ratio = calculateCompressionRatio(1000, 1200)

      expect(ratio).toBeLessThan(0)
    })
  })

  describe('estimateCompressedSize', () => {
    it('should estimate size for NONE compression', () => {
      const estimated = estimateCompressedSize(1000, CompressionAlgorithm.NONE)

      expect(estimated).toBe(1000)
    })

    it('should estimate size for GZIP compression', () => {
      const estimated = estimateCompressedSize(1000, CompressionAlgorithm.GZIP)

      expect(estimated).toBeGreaterThan(0)
      expect(estimated).toBeLessThan(1000)
    })

    it('should estimate size for Brotli compression', () => {
      const estimated = estimateCompressedSize(1000, CompressionAlgorithm.BROTLI)

      expect(estimated).toBeGreaterThan(0)
      expect(estimated).toBeLessThan(1000)
    })

    it('should estimate size for Deflate compression', () => {
      const estimated = estimateCompressedSize(1000, CompressionAlgorithm.DEFLATE)

      expect(estimated).toBeGreaterThan(0)
      expect(estimated).toBeLessThan(1000)
    })

    it('should handle zero size', () => {
      const estimated = estimateCompressedSize(0, CompressionAlgorithm.GZIP)

      expect(estimated).toBe(0)
    })
  })

  describe('compression algorithms comparison', () => {
    it('should compare GZIP and Brotli compression', async () => {
      const gzipCompressed = await compressBackup(testData, CompressionAlgorithm.GZIP)
      const brotliCompressed = await compressBackup(testData, CompressionAlgorithm.BROTLI)

      // Brotli should achieve better compression than GZIP
      expect(brotliCompressed.length).toBeLessThanOrEqual(gzipCompressed.length)
    })

    it('should compare all algorithms for same data', async () => {
      const noneCompressed = await compressBackup(testData, CompressionAlgorithm.NONE)
      const gzipCompressed = await compressBackup(testData, CompressionAlgorithm.GZIP)
      const brotliCompressed = await compressBackup(testData, CompressionAlgorithm.BROTLI)
      const deflateCompressed = await compressBackup(testData, CompressionAlgorithm.DEFLATE)

      expect(noneCompressed.length).toBe(testData.length)
      expect(gzipCompressed.length).toBeLessThan(noneCompressed.length)
      expect(brotliCompressed.length).toBeLessThan(noneCompressed.length)
      expect(deflateCompressed.length).toBeLessThan(noneCompressed.length)
    })
  })
})
