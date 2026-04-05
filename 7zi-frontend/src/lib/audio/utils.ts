/**
 * Audio Utilities - 音频工具函数
 *
 * @package 7zi-frontend
 * @version 1.13.0
 */

import type { SupportedLanguage, AudioFormat } from './types'

/**
 * 检测浏览器支持的音频格式
 */
export function getSupportedAudioFormat(): AudioFormat | null {
  if (typeof window === 'undefined') {
    return null
  }

  const audio = document.createElement('audio')
  const formats: AudioFormat[] = ['webm', 'ogg', 'mp3', 'wav', 'flac']

  for (const format of formats) {
    const mimeType = `audio/${format}`
    if (audio.canPlayType(mimeType) !== '') {
      return format
    }
  }

  return null
}

/**
 * 将 AudioBuffer 转换为 Blob
 */
export async function audioBufferToBlob(
  buffer: AudioBuffer,
  format: AudioFormat = 'webm'
): Promise<Blob> {
  const ctx = new AudioContext()
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  )

  const source = offlineCtx.createBufferSource()
  source.buffer = buffer
  source.connect(offlineCtx.destination)
  source.start()

  const renderedBuffer = await offlineCtx.startRendering()

  // 创建 MediaStream
  const mediaStream = audioBufferToMediaStream(renderedBuffer)

  return new Promise((resolve, reject) => {
    const mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: `audio/${format}`,
    })

    const chunks: Blob[] = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data)
      }
    }

    mediaRecorder.onstop = () => {
      resolve(new Blob(chunks, { type: `audio/${format}` }))
    }

    mediaRecorder.onerror = (e) => {
      reject(e)
    }

    mediaRecorder.start()
    setTimeout(() => mediaRecorder.stop(), 100)
  })
}

/**
 * 将 AudioBuffer 转换为 MediaStream
 */
export function audioBufferToMediaStream(buffer: AudioBuffer): MediaStream {
  const ctx = new AudioContext()
  const source = ctx.createBufferSource()
  source.buffer = buffer

  const dest = ctx.createMediaStreamDestination()
  source.connect(dest)
  source.start()

  return dest.stream
}

/**
 * 将 Blob 转换为 ArrayBuffer
 */
export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer()
}

/**
 * 将 Float32Array 转换为 Int16Array
 */
export function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length)

  for (let i = 0; i < float32.length; i++) {
    // 限制在 -1 到 1 之间
    const s = Math.max(-1, Math.min(1, float32[i]))
    // 转换为 16 位整数
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }

  return int16
}

/**
 * 将 Int16Array 转换为 Float32Array
 */
export function int16ToFloat32(int16: Int16Array): Float32Array {
  const float32 = new Float32Array(int16.length)

  for (let i = 0; i < int16.length; i++) {
    // 转换为 -1 到 1 之间的浮点数
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff)
  }

  return float32
}

/**
 * 计算音频 RMS
 */
export function calculateRMS(audioData: Float32Array): number {
  let sum = 0

  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i]
  }

  return Math.sqrt(sum / audioData.length)
}

/**
 * 检测音频是否包含语音
 */
export function detectSpeech(
  audioData: Float32Array,
  threshold: number = 0.01
): boolean {
  const rms = calculateRMS(audioData)
  return rms > threshold
}

/**
 * 获取语言代码映射
 */
export function getLanguageCode(language: SupportedLanguage): string {
  const mapping: Record<SupportedLanguage, string> = {
    zh: 'zh-CN',
    en: 'en-US',
    'zh-en': 'zh-CN',
  }

  return mapping[language] || 'zh-CN'
}

/**
 * 获取语言显示名称
 */
export function getLanguageName(language: SupportedLanguage): string {
  const names: Record<SupportedLanguage, string> = {
    zh: '中文',
    en: 'English',
    'zh-en': '中英混合',
  }

  return names[language] || language
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 音频录制器兼容性检查
 */
export function checkMediaRecorderSupport(): {
  supported: boolean
  mimeType: string | null
} {
  if (typeof window === 'undefined' || !navigator.mediaDevices) {
    return { supported: false, mimeType: null }
  }

  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/wav',
  ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return { supported: true, mimeType: type }
    }
  }

  return { supported: false, mimeType: null }
}

/**
 * 获取麦克风权限状态
 */
export async function getMicrophonePermission(): Promise<
  'granted' | 'denied' | 'prompt'
> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return 'denied'
  }

  try {
    const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    return permission.state as 'granted' | 'denied' | 'prompt'
  } catch {
    // 浏览器不支持权限查询
    return 'prompt'
  }
}

/**
 * 请求麦克风权限
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return false
  }

  try {
    await navigator.mediaDevices.getUserMedia({ audio: true })
    return true
  } catch {
    return false
  }
}

/**
 * 计算信噪比 (SNR)
 */
export function calculateSNR(signal: Float32Array, noise: Float32Array): number {
  const signalPower = calculateRMS(signal) ** 2
  const noisePower = calculateRMS(noise) ** 2

  if (noisePower === 0) {
    return Infinity
  }

  return 10 * Math.log10(signalPower / noisePower)
}

/**
 * 应用预加重滤波器
 */
export function preEmphasisFilter(
  audioData: Float32Array,
  coefficient: number = 0.97
): Float32Array {
  const output = new Float32Array(audioData.length)

  output[0] = audioData[0]

  for (let i = 1; i < audioData.length; i++) {
    output[i] = audioData[i] - coefficient * audioData[i - 1]
  }

  return output
}

/**
 * 归一化音频
 */
export function normalizeAudio(audioData: Float32Array): Float32Array {
  let max = 0
  const len = audioData.length
  for (let i = 0; i < len; i++) {
    const abs = Math.abs(audioData[i])
    if (abs > max) {
      max = abs
    }
  }

  if (max === 0) {
    return audioData
  }

  const normalized = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    normalized[i] = audioData[i] / max
  }

  return normalized
}