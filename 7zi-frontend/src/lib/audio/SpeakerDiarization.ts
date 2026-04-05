/**
 * SpeakerDiarization - 说话人分离
 *
 * 实现多说话人识别和分离功能
 *
 * @package 7zi-frontend
 * @version 1.13.0
 */

import type { DiarizationConfig, SpeakerInfo } from './types'

/**
 * 说话人片段
 */
interface SpeakerSegment {
  speakerId: string
  startTime: number
  endTime: number
  embedding: number[]
}

/**
 * 说话人分离错误
 */
export class DiarizationError extends Error {
  constructor(message: string, public code: string, public details?: unknown) {
    super(message)
    this.name = 'DiarizationError'
  }
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<DiarizationConfig> = {
  minSpeakerDuration: 1.0,
  numSpeakers: 2,
  chunkSize: 1024,
}

/**
 * SpeakerDiarization - 说话人分离器
 *
 * 使用简化的能量分析进行说话人分离
 * 实际生产环境应使用更复杂的算法如 pyannote.audio
 */
export class SpeakerDiarization {
  private config: Required<DiarizationConfig>
  private speakers: Map<string, SpeakerInfo> = new Map()
  private segments: SpeakerSegment[] = []
  private embeddingHistory: Map<string, number[]> = new Map()

  constructor(config: DiarizationConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeSpeakers()
  }

  /**
   * 初始化说话人
   */
  private initializeSpeakers(): void {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // yellow
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
    ]

    for (let i = 0; i < this.config.numSpeakers; i++) {
      const speakerId = `speaker_${i + 1}`
      this.speakers.set(speakerId, {
        speakerId,
        label: `说话人 ${i + 1}`,
        color: colors[i % colors.length],
      })
    }
  }

  /**
   * 执行说话人分离
   *
   * @param audioData 音频数据 (Float32Array)
   * @param sampleRate 采样率
   * @returns 分离后的说话人片段
   */
  process(
    audioData: Float32Array,
    sampleRate: number
  ): Array<{
    speaker: SpeakerInfo
    startTime: number
    endTime: number
  }> {
    if (audioData.length === 0) {
      return []
    }

    this.segments = []
    this.embeddingHistory.clear()

    // 计算每帧的能量
    const frameLength = this.config.chunkSize
    const hopLength = frameLength / 2
    const numFrames = Math.floor((audioData.length - frameLength) / hopLength)

    let currentSpeaker: string | null = null
    let segmentStart = 0

    for (let i = 0; i < numFrames; i++) {
      const startIdx = i * hopLength
      const endIdx = startIdx + frameLength
      const frame = audioData.slice(startIdx, endIdx)

      // 计算帧能量
      const energy = this.calculateEnergy(frame)

      // 简单的能量阈值判断说话人
      const threshold = 0.05
      const isSpeech = energy > threshold

      if (!isSpeech) {
        // 静音，跳过
        continue
      }

      // 提取简化的声音特征
      const embedding = this.extractFeatures(frame)

      // 判断是否切换说话人
      const newSpeaker = this.classifySpeaker(embedding)

      if (newSpeaker !== currentSpeaker) {
        // 记录之前的片段
        if (currentSpeaker !== null && segmentStart < startIdx) {
          const duration = (startIdx - segmentStart) / sampleRate
          if (duration >= this.config.minSpeakerDuration) {
            this.segments.push({
              speakerId: currentSpeaker,
              startTime: segmentStart / sampleRate,
              endTime: startIdx / sampleRate,
              embedding,
            })
          }
        }

        currentSpeaker = newSpeaker
        segmentStart = startIdx
      }
    }

    // 添加最后一个片段
    if (currentSpeaker !== null) {
      const lastFrameIdx = Math.floor(audioData.length / hopLength) * hopLength
      const duration = (lastFrameIdx - segmentStart) / sampleRate
      if (duration >= this.config.minSpeakerDuration) {
        this.segments.push({
          speakerId: currentSpeaker,
          startTime: segmentStart / sampleRate,
          endTime: audioData.length / sampleRate,
          embedding: [],
        })
      }
    }

    // 合并相邻的同一说话人片段
    return this.mergeSegments()
  }

  /**
   * 计算帧能量
   */
  private calculateEnergy(frame: Float32Array): number {
    let sum = 0
    for (let i = 0; i < frame.length; i++) {
      sum += frame[i] * frame[i]
    }
    return Math.sqrt(sum / frame.length)
  }

  /**
   * 提取简化的声音特征
   */
  private extractFeatures(frame: Float32Array): number[] {
    // 计算过零率
    let zeroCrossings = 0
    for (let i = 1; i < frame.length; i++) {
      if ((frame[i] >= 0 && frame[i - 1] < 0) || (frame[i] < 0 && frame[i - 1] >= 0)) {
        zeroCrossings++
      }
    }

    // 计算频谱重心
    const energy = this.calculateEnergy(frame)

    // 返回简化的特征向量
    return [
      zeroCrossings / frame.length,
      energy,
      this.calculateSpectralCentroid(frame),
    ]
  }

  /**
   * 计算频谱重心
   */
  private calculateSpectralCentroid(frame: Float32Array): number {
    // 简化的频谱分析
    const fft = this.simpleFFT(frame)
    let weightedSum = 0
    let sum = 0

    for (let i = 0; i < fft.length; i++) {
      const magnitude = Math.abs(fft[i])
      weightedSum += i * magnitude
      sum += magnitude
    }

    return sum > 0 ? weightedSum / sum / fft.length : 0
  }

  /**
   * 简化的 FFT 实现
   */
  private simpleFFT(signal: Float32Array): number[] {
    const n = signal.length
    const fft = new Array(n).fill(0)

    // 简化的频域变换（仅用于特征提取）
    for (let k = 0; k < n / 2; k++) {
      let real = 0
      let imag = 0

      for (let t = 0; t < n; t++) {
        const angle = (-2 * Math.PI * k * t) / n
        real += signal[t] * Math.cos(angle)
        imag += signal[t] * Math.sin(angle)
      }

      fft[k] = Math.sqrt(real * real + imag * imag)
    }

    return fft
  }

  /**
   * 分类说话人（基于特征相似度）
   */
  private classifySpeaker(embedding: number[]): string {
    // 如果没有历史记录，使用第一个说话人
    if (this.embeddingHistory.size === 0) {
      const speakerId = 'speaker_1'
      this.embeddingHistory.set(speakerId, embedding)
      return speakerId
    }

    // 找到最相似的说话人
    let bestSpeaker = 'speaker_1'
    let bestSimilarity = -Infinity

    const embeddingEntries = Array.from(this.embeddingHistory.entries())
    for (const [speakerId, history] of embeddingEntries) {
      const similarity = this.cosineSimilarity(embedding, history)
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity
        bestSpeaker = speakerId
      }
    }

    // 如果相似度太低，可能是新说话人
    if (bestSimilarity < 0.5 && this.embeddingHistory.size < this.config.numSpeakers) {
      const newSpeakerId = `speaker_${this.embeddingHistory.size + 1}`
      this.embeddingHistory.set(newSpeakerId, embedding)
      return newSpeakerId
    }

    // 更新历史记录（指数移动平均）
    const alpha = 0.3
    const currentHistory = this.embeddingHistory.get(bestSpeaker) || embedding
    const newHistory = embedding.map((val, i) => {
      const prev = currentHistory[i] || 0
      return alpha * val + (1 - alpha) * prev
    })
    this.embeddingHistory.set(bestSpeaker, newHistory)

    return bestSpeaker
  }

  /**
   * 余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) {
      return 0
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    const norm = Math.sqrt(normA) * Math.sqrt(normB)
    return norm > 0 ? dotProduct / norm : 0
  }

  /**
   * 合并相邻的同一说话人片段
   */
  private mergeSegments(): Array<{
    speaker: SpeakerInfo
    startTime: number
    endTime: number
  }> {
    if (this.segments.length === 0) {
      return []
    }

    const merged: Array<{
      speaker: SpeakerInfo
      startTime: number
      endTime: number
    }> = []

    let currentSegment = this.segments[0]

    for (let i = 1; i < this.segments.length; i++) {
      const segment = this.segments[i]

      if (segment.speakerId === currentSegment.speakerId) {
        // 合并相邻片段
        currentSegment = {
          ...currentSegment,
          endTime: segment.endTime,
        }
      } else {
        // 保存当前片段，开始新片段
        const speakerInfo = this.speakers.get(currentSegment.speakerId)
        if (speakerInfo) {
          merged.push({
            speaker: speakerInfo,
            startTime: currentSegment.startTime,
            endTime: currentSegment.endTime,
          })
        }
        currentSegment = segment
      }
    }

    // 添加最后一个片段
    const speakerInfo = this.speakers.get(currentSegment.speakerId)
    if (speakerInfo) {
      merged.push({
        speaker: speakerInfo,
        startTime: currentSegment.startTime,
        endTime: currentSegment.endTime,
      })
    }

    return merged
  }

  /**
   * 获取所有说话人信息
   */
  getSpeakers(): SpeakerInfo[] {
    return Array.from(this.speakers.values())
  }

  /**
   * 获取指定说话人信息
   */
  getSpeaker(speakerId: string): SpeakerInfo | undefined {
    return this.speakers.get(speakerId)
  }

  /**
   * 设置说话人数量
   */
  setNumSpeakers(num: number): void {
    this.config.numSpeakers = Math.max(1, Math.min(num, 6))
    this.initializeSpeakers()
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.segments = []
    this.embeddingHistory.clear()
    this.initializeSpeakers()
  }

  /**
   * 销毁资源
   */
  destroy(): void {
    this.reset()
    this.speakers.clear()
  }
}
