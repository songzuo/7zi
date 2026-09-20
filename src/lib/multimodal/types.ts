/**
 * Multimodal AI Types
 * Defines types for image and audio processing operations
 */

export interface ImageUploadOptions {
  maxSize?: number // in bytes
  allowedTypes?: string[]
  compress?: boolean
  quality?: number // 0-1
}

export interface ImageRecognitionResult {
  success: boolean
  data?: ImageData
  error?: string
  provider?: string
}

export interface ImageData {
  objects: DetectedObject[]
  text?: string // OCR result
  tags: string[]
  confidence: number
}

export interface DetectedObject {
  label: string
  confidence: number
  bbox: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface AudioTranscriptionOptions {
  language?: string
  model?: string
  timestamps?: boolean
  speakerDiarization?: boolean
  maxSize?: number // in bytes
}

export interface AudioTranscriptionResult {
  success: boolean
  data?: TranscriptionData
  error?: string
  provider?: string
}

export interface TranscriptionData {
  text: string
  segments?: TranscriptionSegment[]
  language: string
  language_code?: string
  duration: number
  audio_duration?: number
  confidence: number
  confidence_score?: number
  speakerDiarization?: boolean
  model?: string
  tags?: string[]
}

export interface TranscriptionSegment {
  text: string
  start: number
  end: number
  speaker?: string
  confidence: number
  [key: string]: unknown
}

export interface MultimodalProvider {
  name: string
  type: 'volcengine' | 'bailian' | 'minimax'
  config: ProviderConfig
  status: 'active' | 'inactive' | 'error'
  capabilities: string[]
}

/**
 * Interface for provider implementations
 * All providers must implement these methods
 */
export interface ProviderImplementation {
  recognizeImage(imageBuffer: Buffer): Promise<ImageRecognitionResult>
  transcribeAudio(
    audioBuffer: Buffer,
    options: AudioTranscriptionOptions
  ): Promise<AudioTranscriptionResult>
  healthCheck(): Promise<boolean>
}

export interface ProviderConfig {
  apiKey?: string
  endpoint?: string
  region?: string
  options?: Record<string, unknown>
}

export interface ImageProcessingProgress {
  stage: 'uploading' | 'processing' | 'analyzing' | 'completed' | 'error'
  progress: number // 0-100
  message?: string
}

export interface AudioProcessingProgress {
  stage: 'uploading' | 'transcribing' | 'analyzing' | 'completed' | 'error'
  progress: number // 0-100
  message?: string
  currentTime?: number
}

// Bailian API response types
export interface BailianImageObject {
  name: string
  score: number
  box: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface BailianImageOutput {
  objects?: BailianImageObject[]
  ocr_text?: string
  tags?: string[]
  confidence?: number
}

export interface BailianImageResponse {
  output?: BailianImageOutput
}

export interface BailianTranscriptionSegment {
  text: string
  begin_time: number
  end_time: number
  speaker?: string
  confidence: number
}

export interface BailianTranscriptionOutput {
  text?: string
  sentences?: BailianTranscriptionSegment[]
  language?: string
  duration?: number
  confidence?: number
}

export interface BailianTranscriptionResponse {
  output?: BailianTranscriptionOutput
}

// Volcengine API response types
export interface VolcengineBBox {
  xmin: number
  ymin: number
  xmax: number
  ymax: number
}

export interface VolcengineObject {
  label: string
  score: number
  bbox: VolcengineBBox
}

export interface VolcengineImageResponse {
  objects?: VolcengineObject[]
  ocr_text?: string
  tags?: string[]
  confidence?: number
}

export interface VolcengineTranscriptionSegment {
  text: string
  start_time: number
  end_time: number
  speaker?: string
  confidence: number
}

export interface VolcengineTranscriptionResponse {
  text: string
  segments?: VolcengineTranscriptionSegment[]
  language: string
  duration: number
  confidence?: number
}
