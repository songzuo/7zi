/**
 * Audio STT Library - 音频语音转文字库
 *
 * 提供完整的音频处理和语音转文字功能
 *
 * @package 7zi-frontend
 * @version 1.13.0
 */

// 类型定义
export type {
  SupportedLanguage,
  AudioFormat,
  WhisperModelSize,
  TranscriptionResult,
  SpeakerInfo,
  TranscriptionWithSpeaker,
  TranscriptionEvent,
  AudioProcessorConfig,
  WhisperConfig,
  StreamTranscriptionConfig,
  DiarizationConfig,
  IAudioProcessor,
  STTProvider,
  STTRouterConfig,
  STTRouteResult,
  AudioEventListener,
  AudioStatus,
  AudioStatusEvent,
} from './types'

// 核心类
export { AudioProcessor } from './AudioProcessor'
export { WhisperClient, WhisperError } from './WhisperClient'
export { SpeakerDiarization, DiarizationError } from './SpeakerDiarization'
export { TranscriptionStream, TranscriptionStreamError } from './TranscriptionStream'
export { STTRouter, createSTTRouter, sttRouter } from './STTRouter'

// v1.13.0 新增模块
export {
  SpeechToText,
  createSTT,
  type STTOptions,
  type RealtimeTranscriptionConfig,
  type BatchTranscriptionConfig,
} from './speech-to-text'

export {
  AudioRecorder,
  createAudioRecorder,
  type RecordingOptions,
  type RecordingState,
  type RecordingEvent,
  type RecordingEventListener,
  type FormatConversionOptions,
} from './audio-recorder'

export {
  AudioUtils,
  reduceNoise,
  applyGain,
  generateWaveform,
  extractWaveformData,
  extractSpectrumData,
  type NoiseReductionOptions,
  type GainControlOptions,
  type WaveformOptions,
  type WaveformData,
  type SpectrumData,
  type AudioMetadata,
} from './audio-utils'

// 常量
export const DEFAULT_SAMPLE_RATE = 16000
export const DEFAULT_CHANNELS = 1
export const DEFAULT_BIT_DEPTH = 16
export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh'
export const DEFAULT_MODEL: WhisperModelSize = 'tiny'

// 工具函数
export * from './utils'