/**
 * API Response Compression Middleware
 * 自动压缩 API 响应以减少带宽使用
 *
 * 支持的压缩格式:
 * - gzip (广泛支持，压缩率中等)
 *
 * 特性:
 * - 自动检测 Accept-Encoding 头
 * - 可配置压缩阈值
 * - 压缩统计和日志
 * - 跳过已压缩的内容
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { gzip, gunzip, constants } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// ============================================================================
// Configuration Schema
// ============================================================================

const CompressionConfigSchema = z.object({
  enabled: z.boolean().default(true),
  threshold: z.number().min(0).default(1024), // Bytes - 最小压缩阈值
  level: z.number().min(0).max(9).default(6), // Compression level (0-9 for gzip)
  chunkSize: z.number().min(1024).default(16384), // Bytes
  memLevel: z.number().min(1).max(9).default(8),
  windowBits: z.number().min(8).max(15).default(15),
});

export type CompressionConfig = z.infer<typeof CompressionConfigSchema>;

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  enabled: true,
  threshold: 1024, // Compress responses >= 1KB
  level: 6,
  chunkSize: 16384,
  memLevel: 8,
  windowBits: 15,
};

// ============================================================================
// Compression Statistics
// ============================================================================

interface CompressionStats {
  totalRequests: number;
  compressedResponses: number;
  skippedResponses: number;
  originalSize: number; // Total original size in bytes
  compressedSize: number; // Total compressed size in bytes
  byEncoding: {
    gzip: number;
    uncompressed: number;
  };
}

class CompressionStatsCollector {
  private stats: CompressionStats = {
    totalRequests: 0,
    compressedResponses: 0,
    skippedResponses: 0,
    originalSize: 0,
    compressedSize: 0,
    byEncoding: {
      gzip: 0,
      uncompressed: 0,
    },
  };

  record(originalSize: number, compressedSize: number | null, encoding: string): void {
    this.stats.totalRequests++;

    if (compressedSize !== null) {
      this.stats.compressedResponses++;
      this.stats.originalSize += originalSize;
      this.stats.compressedSize += compressedSize;

      // Brotli removed, using gzip only
      this.stats.byEncoding.gzip++;
    } else {
      this.stats.skippedResponses++;
      this.stats.byEncoding.uncompressed++;
    }
  }

  getStats(): CompressionStats {
    return { ...this.stats };
  }

  getCompressionRatio(): number {
    if (this.stats.originalSize === 0) return 0;
    return 1 - this.stats.compressedSize / this.stats.originalSize;
  }

  reset(): void {
    this.stats = {
      totalRequests: 0,
      compressedResponses: 0,
      skippedResponses: 0,
      originalSize: 0,
      compressedSize: 0,
      byEncoding: {
        gzip: 0,
        uncompressed: 0,
      },
    };
  }
}

// Global stats collector
const statsCollector = new CompressionStatsCollector();

// ============================================================================
// Compression Utilities
// ============================================================================

/**
 * Detect supported compression encoding from Accept-Encoding header
 */
export function detectEncoding(acceptEncoding: string | null): 'br' | 'gzip' | null {
  if (!acceptEncoding) return null;

  const encodings = acceptEncoding.toLowerCase().split(',').map(e => e.trim());

  if (encodings.includes('br') || encodings.includes('br;q=1')) {
    return 'br';
  }

  if (encodings.includes('gzip') || encodings.includes('gzip;q=1')) {
    return 'gzip';
  }

  return null;
}

/**
 * Check if content should be compressed
 */
function shouldCompress(
  contentType: string | null,
  contentLength: number,
  config: CompressionConfig
): boolean {
  // Skip if compression is disabled
  if (!config.enabled) return false;

  // Skip if content is too small
  if (contentLength < config.threshold) return false;

  // Skip if content type is not compressible
  if (contentType) {
    const compressibleTypes = [
      'text/',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/xhtml+xml',
      'image/svg+xml',
    ];

    const isCompressible = compressibleTypes.some(type => contentType.startsWith(type));
    if (!isCompressible) return false;
  }

  // Skip if already compressed
  const alreadyCompressed = [
    'application/gzip',
    'application/x-gzip',
    'application/zip',
    'application/x-compress',
    'application/x-compressed',
    'application/x-zip-compressed',
  ];

  if (contentType && alreadyCompressed.some(type => contentType.includes(type))) {
    return false;
  }

  return true;
}

/**
 * Compress data using specified encoding
 */
async function compressData(
  data: Buffer,
  encoding: 'gzip' | 'br',
  config: CompressionConfig
): Promise<Buffer> {
  // Use gzip for both encodings (brotli package removed)
  return await gzipAsync(data, {
    level: Math.min(config.level, 9),
    chunkSize: config.chunkSize,
    memLevel: config.memLevel,
    windowBits: config.windowBits,
  });
}

/**
 * Decompress data (for testing/debugging)
 */
export async function decompressData(
  data: Buffer,
  encoding: 'gzip' | 'br'
): Promise<Buffer> {
  // Brotli removed, using gzip only
  return await gunzipAsync(data);
}

// ============================================================================
// Middleware Wrapper
// ============================================================================

/**
 * Wrap an API handler with compression middleware
 */
export function withCompression<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  config: Partial<CompressionConfig> = {}
): (...args: T) => Promise<NextResponse> {
  const fullConfig: CompressionConfig = {
    ...DEFAULT_COMPRESSION_CONFIG,
    ...config,
  };

  return async (...args: T): Promise<NextResponse> => {
    const response = await handler(...args);

    // Check if response should be compressed
    const contentType = response.headers.get('Content-Type');
    const contentLength = parseInt(response.headers.get('Content-Length') || '0');

    // Skip if no content
    if (contentLength === 0) {
      return response;
    }

    // Detect client's supported encoding
    const encoding = detectEncoding(response.headers.get('Accept-Encoding'));

    // Skip if client doesn't support compression or content shouldn't be compressed
    if (!encoding || !shouldCompress(contentType, contentLength, fullConfig)) {
      statsCollector.record(contentLength, null, 'uncompressed');
      return response;
    }

    try {
      // Get response body
      const body = await response.arrayBuffer();
      const buffer = Buffer.from(body);

      // Compress the body
      const compressed = await compressData(buffer, encoding, fullConfig);

      // Record statistics
      statsCollector.record(buffer.length, compressed.length, encoding);

      // Create new response with compressed body
      const compressedResponse = new NextResponse(new Uint8Array(compressed), {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'Content-Encoding': encoding,
          'Content-Length': compressed.length.toString(),
          'X-Compression-Ratio': (
            (1 - compressed.length / buffer.length) *
            100
          ).toFixed(2) + '%',
          'Vary': 'Accept-Encoding',
        },
      });

      return compressedResponse;
    } catch (error) {
      // If compression fails, return original response
      console.error('Compression failed:', error);
      statsCollector.record(contentLength, null, 'uncompressed');
      return response;
    }
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get compression statistics
 */
export function getCompressionStats(): CompressionStats {
  return statsCollector.getStats();
}

/**
 * Get compression ratio (0-1)
 */
export function getCompressionRatio(): number {
  return statsCollector.getCompressionRatio();
}

/**
 * Reset compression statistics
 */
export function resetCompressionStats(): void {
  statsCollector.reset();
}

/**
 * Format compression statistics for logging
 */
export function formatCompressionStats(): string {
  const stats = statsCollector.getStats();
  const ratio = statsCollector.getCompressionRatio();

  return [
    'Compression Statistics:',
    `  Total Requests: ${stats.totalRequests}`,
    `  Compressed: ${stats.compressedResponses} (${((stats.compressedResponses / stats.totalRequests) * 100).toFixed(1)}%)`,
    `  Skipped: ${stats.skippedResponses} (${((stats.skippedResponses / stats.totalRequests) * 100).toFixed(1)}%)`,
    `  Original Size: ${(stats.originalSize / 1024).toFixed(2)} KB`,
    `  Compressed Size: ${(stats.compressedSize / 1024).toFixed(2)} KB`,
    `  Compression Ratio: ${(ratio * 100).toFixed(1)}%`,
    `  By Encoding:`,
    `    Gzip: ${stats.byEncoding.gzip}`,
    `    Uncompressed: ${stats.byEncoding.uncompressed}`,
  ].join('\n');
}

// ============================================================================
// Exports
// ============================================================================

export {
  CompressionConfigSchema,
  CompressionStatsCollector,
};

// Export singleton stats collector for testing
export { statsCollector };
