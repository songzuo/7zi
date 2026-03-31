/**
 * Backup Compression Module
 * Handles compression of backup files
 */

import { createGzip, createGunzip, createBrotliCompress, createBrotliDecompress, createDeflate, createInflate } from 'zlib';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { CompressionAlgorithm } from './types';

const pipelineAsync = promisify(pipeline);

/**
 * Compress backup data
 */
export async function compressBackup(
  data: string,
  algorithm: CompressionAlgorithm
): Promise<string> {
  try {
    if (algorithm === CompressionAlgorithm.NONE) {
      return data;
    }

    const buffer = Buffer.from(data, 'utf-8');

    switch (algorithm) {
      case CompressionAlgorithm.GZIP: {
        const gzip = createGzip({ level: 9 });
        const chunks: Buffer[] = [];

        await new Promise<void>((resolve, reject) => {
          gzip.on('data', (chunk) => chunks.push(chunk));
          gzip.on('end', () => resolve());
          gzip.on('error', reject);
          gzip.write(buffer);
          gzip.end();
        });

        return Buffer.concat(chunks).toString('base64');
      }

      case CompressionAlgorithm.BROTLI: {
        const brotli = createBrotliCompress({
          params: {
            [require('zlib').constants.BROTLI_PARAM_QUALITY]: 11,
          },
        });
        const chunks: Buffer[] = [];

        await new Promise<void>((resolve, reject) => {
          brotli.on('data', (chunk) => chunks.push(chunk));
          brotli.on('end', () => resolve());
          brotli.on('error', reject);
          brotli.write(buffer);
          brotli.end();
        });

        return Buffer.concat(chunks).toString('base64');
      }

      case CompressionAlgorithm.DEFLATE: {
        const deflate = createDeflate({ level: 9 });
        const chunks: Buffer[] = [];

        await new Promise<void>((resolve, reject) => {
          deflate.on('data', (chunk) => chunks.push(chunk));
          deflate.on('end', () => resolve());
          deflate.on('error', reject);
          deflate.write(buffer);
          deflate.end();
        });

        return Buffer.concat(chunks).toString('base64');
      }

      default:
        return data;
    }
  } catch (_error) {
    console.error('Failed to compress backup:', error);
    throw new Error(`Compression failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Decompress backup data
 */
export async function decompressBackup(
  data: string,
  algorithm: CompressionAlgorithm
): Promise<string> {
  try {
    if (algorithm === CompressionAlgorithm.NONE) {
      return data;
    }

    const buffer = Buffer.from(data, 'base64');

    switch (algorithm) {
      case CompressionAlgorithm.GZIP: {
        const gunzip = createGunzip();
        const chunks: Buffer[] = [];

        await new Promise<void>((resolve, reject) => {
          gunzip.on('data', (chunk) => chunks.push(chunk));
          gunzip.on('end', () => resolve());
          gunzip.on('error', reject);
          gunzip.write(buffer);
          gunzip.end();
        });

        return Buffer.concat(chunks).toString('utf-8');
      }

      case CompressionAlgorithm.BROTLI: {
        const brotli = createBrotliDecompress();
        const chunks: Buffer[] = [];

        await new Promise<void>((resolve, reject) => {
          brotli.on('data', (chunk) => chunks.push(chunk));
          brotli.on('end', () => resolve());
          brotli.on('error', reject);
          brotli.write(buffer);
          brotli.end();
        });

        return Buffer.concat(chunks).toString('utf-8');
      }

      case CompressionAlgorithm.DEFLATE: {
        const inflate = createInflate();
        const chunks: Buffer[] = [];

        await new Promise<void>((resolve, reject) => {
          inflate.on('data', (chunk) => chunks.push(chunk));
          inflate.on('end', () => resolve());
          inflate.on('error', reject);
          inflate.write(buffer);
          inflate.end();
        });

        return Buffer.concat(chunks).toString('utf-8');
      }

      default:
        return data;
    }
  } catch (_error) {
    console.error('Failed to decompress backup:', error);
    throw new Error(`Decompression failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(
  originalSize: number,
  compressedSize: number
): number {
  if (originalSize === 0) return 0;
  return (1 - compressedSize / originalSize) * 100;
}

/**
 * Estimate compressed size
 */
export function estimateCompressedSize(
  originalSize: number,
  algorithm: CompressionAlgorithm
): number {
  // Rough estimates based on typical compression ratios
  const ratios: Record<CompressionAlgorithm, number> = {
    [CompressionAlgorithm.NONE]: 1.0,
    [CompressionAlgorithm.GZIP]: 0.3, // ~70% compression
    [CompressionAlgorithm.BROTLI]: 0.25, // ~75% compression
    [CompressionAlgorithm.DEFLATE]: 0.35, // ~65% compression
  };

  return Math.ceil(originalSize * ratios[algorithm]);
}
