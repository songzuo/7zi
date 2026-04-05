/**
 * Audio STT Types - 音频语音转文字类型定义
 *
 * @package 7zi-frontend
 * @version 1.13.0
 */

/**
 * 支持的语言
 */
export type SupportedLanguage = 'zh' | 'en' | 'zh-en'

/**
 * 音频格式
 */
export type AudioFormat = 'wav' | 'mp3' | 'ogg' | 'webm' | 'flac'

/**
 * Whisper 模型大小
 */
export type WhisperModelSize = 
  | 'tiny' 
  | 'base' 
  | 'small' 
  | 'medium' 
  | 'large'
  | 'large-v2'
  | 'large-v3'

/**
 * 转录结果
 */
export interface TranscriptionResult {
  /** 转录文本 */
  text: string
  /** 语言代码 */
  language: SupportedLanguage
  /** 置信度 0-1 */
  confidence: number
  /** 时间戳 */
  timestamp: number
  /** 片段开始时间（秒） */
  startTime?: number
  /** 片段结束时间（秒） */
  endTime?: number
  /** 是否为最终结果 */
  isFinal: boolean
}

/**
 * 说话人信息
 */
export interface SpeakerInfo {
  /** 说话人ID */
  speakerId: string
  /** 说话人标签 */
  label: string
  /** 颜色标识 */
  color: string
}

/**
 * 带说话人信息的转录结果
 */
export interface TranscriptionWithSpeaker extends TranscriptionResult {
  /** 说话人信息 */
  speaker: SpeakerInfo
}

/**
 * 实时转录事件
 */
export interface TranscriptionEvent {
  /** 事件类型 */
  type: 'partial' | 'final' | 'speaker_change' | 'error' | 'ready'
  /** 转录结果 */
  result?: TranscriptionWithSpeaker
  /** 错误信息 */
  error?: string
  /** 时间戳 */
  timestamp: number
}

/**
 * 音频处理配置
 */
export interface AudioProcessorConfig {
  /** 采样率 */
  sampleRate?: number
  /** 音频通道数 */
  channels?: number
  /** 比特率 */
  bitDepth?: number
  /** 静音阈值 (0-1) */
  silenceThreshold?: number
  /** 最小静音时长 (毫秒)，用于检测语音结束 */
  silenceDuration?: number
  /** 最大音频缓冲时长 (毫秒) */
  maxBufferDuration?: number
}

/**
 * Whisper 配置
 */
export interface WhisperConfig {
  /** 模型大小 */
  modelSize: WhisperModelSize
  /** 语言 */
  language: SupportedLanguage
  /** 是否启用翻译 */
  translate?: boolean
  /** 是否启用标点符号 */
  punctuation?: boolean
  /** 温度 */
  temperature?: number
  /** 最大上下文 */
  maxContext?: number
  /** 最大长度 */
  maxLength?: number
}

/**
 * WebSocket 转录配置
 */
export interface StreamTranscriptionConfig {
  /** WebSocket URL */
  url: string
  /** API 密钥 */
  apiKey?: string
  /** 语言 */
  language: SupportedLanguage
  /** 模型 */
  model?: string
  /** 是否启用说话人分离 */
  enableDiarization?: boolean
  /** 重试次数 */
  retryAttempts?: number
  /** 重试间隔 (毫秒) */
  retryInterval?: number
}

/**
 * 说话人分离配置
 */
export interface DiarizationConfig {
  /** 最小说话时长 (秒) */
  minSpeakerDuration?: number
  /** 说话人数量 */
  numSpeakers?: number
  /** 音频 chunk 大小 */
  chunkSize?: number
}

/**
 * 音频处理器接口
 */
export interface IAudioProcessor {
  /** 开始录音 */
  startRecording(): Promise<void>
  /** 停止录音 */
  stopRecording(): Promise<AudioBuffer | null>
  /** 获取音频数据 */
  getAudioData(): Float32Array | null
  /** 获取当前音量 */
  getVolume(): number
  /** 检查是否正在录音 */
  isRecording(): boolean
  /** 销毁资源 */
  destroy(): void
}

/**
 * STT 提供商类型
 */
export type STTProvider = 'whisper' | 'browser' | 'websocket'

/**
 * STT 路由配置
 */
export interface STTRouterConfig {
  /** 默认提供商 */
  defaultProvider: STTProvider
  /** 备用提供商 */
  fallbackProviders?: STTProvider[]
  /** 语言映射 */
  languageMapping?: Partial<Record<SupportedLanguage, string>>
  /** 超时时间 (毫秒) */
  timeout?: number
}

/**
 * STT 路由结果
 */
export interface STTRouteResult {
  /** 使用的提供商 */
  provider: STTProvider
  /** 转录结果 */
  result: TranscriptionResult
  /** 是否使用了备用 */
  usedFallback: boolean
}

/**
 * 音频事件监听器
 */
export type AudioEventListener = (event: TranscriptionEvent) => void

/**
 * 音频状态
 */
export type AudioStatus = 'idle' | 'recording' | 'processing' | 'error'

/**
 * 音频状态事件
 */
export interface AudioStatusEvent {
  /** 状态 */
  status: AudioStatus
  /** 错误信息 */
  error?: string
  /** 时间戳 */
  timestamp: number
}
