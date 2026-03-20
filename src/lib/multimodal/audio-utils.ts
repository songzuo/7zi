/**
 * Audio Processing Utilities
 * Helper functions for audio manipulation and validation
 */

export interface AudioMetadata {
  duration: number;
  format: string;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: string;
}

/**
 * Validate audio file
 */
export async function validateAudio(
  buffer: Buffer,
  maxSize: number = 50 * 1024 * 1024, // 50MB
  allowedTypes: string[] = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4']
): Promise<ValidationResult> {
  // Check file size
  if (buffer.length > maxSize) {
    return {
      valid: false,
      error: `Audio size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
    };
  }

  // Detect audio type (simple check based on magic bytes)
  const detectedType = detectAudioType(buffer);

  if (!detectedType) {
    return {
      valid: false,
      error: 'Unsupported or invalid audio file',
    };
  }

  if (!allowedTypes.includes(detectedType)) {
    return {
      valid: false,
      error: `Unsupported audio type: ${detectedType}. Allowed: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true, detectedType };
}

/**
 * Detect audio type from buffer
 */
function detectAudioType(buffer: Buffer): string | null {
  const magic = buffer.slice(0, 12).toString('hex');

  // MP3
  if (magic.startsWith('fffb') || magic.startsWith('fff3') || magic.startsWith('fff2')) {
    return 'audio/mpeg';
  }

  // WAV
  if (magic.startsWith('52494646') && magic.substring(16, 24) === '57415645') {
    return 'audio/wav';
  }

  // WebM
  if (magic.startsWith('1a45dfa3')) {
    return 'audio/webm';
  }

  // OGG
  if (magic.startsWith('4f676753')) {
    return 'audio/ogg';
  }

  // M4A/AAC
  if (magic.startsWith('0000001c667479704d534e56') || magic.startsWith('00000020667479704d3441')) {
    return 'audio/mp4';
  }

  return null;
}

/**
 * Get audio metadata
 */
export async function getAudioMetadata(buffer: Buffer): Promise<AudioMetadata> {
  // Simple implementation - in production, use proper audio library like node-audio-info
  const format = detectAudioType(buffer) || 'unknown';
  const duration = estimateAudioDuration(buffer, format);

  return {
    duration,
    format,
    sampleRate: 44100, // Default estimate
    channels: 2, // Default estimate
  };
}

/**
 * Estimate audio duration (simplified)
 */
function estimateAudioDuration(buffer: Buffer, format: string): number {
  // Very rough estimation - in production use proper library
  const bitrates: Record<string, number> = {
    'audio/mpeg': 128000, // 128 kbps average
    'audio/wav': 1411000, // CD quality
    'audio/webm': 128000,
    'audio/ogg': 128000,
    'audio/mp4': 128000,
  };

  const bitrate = bitrates[format] || 128000;
  const sizeInBits = buffer.length * 8;
  return sizeInBits / bitrate;
}

/**
 * Convert audio to buffer from different sources
 */
export async function audioToBuffer(file: File | Blob | string): Promise<Buffer> {
  if (typeof file === 'string') {
    // Base64 string
    const base64Data = file.replace(/^data:audio\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  } else if (file instanceof File || file instanceof Blob) {
    // File or Blob
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  throw new Error('Unsupported audio source');
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Calculate audio file size at given bitrate and duration
 */
export function calculateAudioSize(duration: number, bitrate: number = 128000): number {
  return (duration * bitrate) / 8; // in bytes
}

/**
 * Trim audio buffer (placeholder - requires proper audio library)
 */
export async function trimAudio(
  buffer: Buffer,
  startTime: number,
  endTime: number
): Promise<Buffer> {
  // In production, use a library like ffmpeg or node-wav
  // For now, return original buffer
  console.warn('trimAudio not implemented - returning original buffer');
  return buffer;
}

/**
 * Convert audio to different format (placeholder)
 */
export async function convertAudio(
  buffer: Buffer,
  targetFormat: 'mp3' | 'wav' | 'webm' | 'ogg'
): Promise<Buffer> {
  // In production, use ffmpeg
  console.warn('convertAudio not implemented - returning original buffer');
  return buffer;
}
