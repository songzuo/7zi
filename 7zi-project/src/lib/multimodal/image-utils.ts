/**
 * Image Processing Utilities
 * Helper functions for image manipulation and validation
 */

import sharp from 'sharp';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate image file
 */
export async function validateImage(
  buffer: Buffer,
  maxSize: number = 10 * 1024 * 1024, // 10MB
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
): Promise<ValidationResult> {
  // Check file size
  if (buffer.length > maxSize) {
    return {
      valid: false,
      error: `Image size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
    };
  }

  // Detect image type
  try {
    const metadata = await sharp(buffer).metadata();
    const detectedType = `image/${metadata.format}`;

    if (!allowedTypes.includes(detectedType)) {
      return {
        valid: false,
        error: `Unsupported image type: ${detectedType}. Allowed: ${allowedTypes.join(', ')}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid image file',
    };
  }
}

/**
 * Compress image
 */
export async function compressImage(
  buffer: Buffer,
  quality: number = 0.8,
  format: 'jpeg' | 'png' | 'webp' = 'jpeg'
): Promise<Buffer> {
  let pipeline = sharp(buffer);

  // Auto-orient based on EXIF data
  pipeline = pipeline.rotate();

  // Compress based on format
  switch (format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: Math.round(quality * 100) });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: Math.round((1 - quality) * 9) });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality: Math.round(quality * 100) });
      break;
  }

  return pipeline.toBuffer();
}

/**
 * Resize image
 */
export async function resizeImage(
  buffer: Buffer,
  maxWidth?: number,
  maxHeight?: number,
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' = 'inside'
): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata();
  const currentWidth = metadata.width || 0;
  const currentHeight = metadata.height || 0;

  // Calculate new dimensions
  let width = maxWidth;
  let height = maxHeight;

  if (maxWidth && maxHeight) {
    // Calculate aspect ratio
    const aspectRatio = currentWidth / currentHeight;
    const targetRatio = maxWidth / maxHeight;

    if (aspectRatio > targetRatio) {
      width = maxWidth;
      height = Math.round(maxWidth / aspectRatio);
    } else {
      height = maxHeight;
      width = Math.round(maxHeight * aspectRatio);
    }
  }

  return sharp(buffer)
    .rotate() // Auto-orient
    .resize(width, height, { fit, withoutEnlargement: true })
    .toBuffer();
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(buffer: Buffer): Promise<ImageDimensions> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

/**
 * Convert image to buffer from different sources
 */
export async function imageToBuffer(file: File | Blob | string): Promise<Buffer> {
  if (typeof file === 'string') {
    // Base64 string
    const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  } else if (file instanceof File || file instanceof Blob) {
    // File or Blob
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  throw new Error('Unsupported image source');
}

/**
 * Generate thumbnail
 */
export async function generateThumbnail(
  buffer: Buffer,
  size: number = 150,
  quality: number = 0.8
): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize(size, size, { fit: 'cover' })
    .jpeg({ quality: Math.round(quality * 100) })
    .toBuffer();
}

/**
 * Get image metadata
 */
export async function getImageMetadata(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: buffer.length,
    hasAlpha: metadata.hasAlpha,
    orientation: metadata.orientation,
  };
}
