/**
 * Audio Utils - 音频工具函数
 *
 * 提供音频降噪、增益控制、波形生成等功能
 *
 * @package 7zi-frontend
 * @version 1.13.0
 */

import type { AudioFormat } from './types'

/**
 * 音频降噪配置
 */
export interface NoiseReductionOptions {
  /** 降噪强度 (0-1) */
  strength?: number
  /** 噪声门限 (0-1) */
  gateThreshold?: number
  /** 噪声采样时长 (毫秒) */
  noiseSampleDuration?: number
  /** 是否自适应 */
  adaptive?: boolean
}

/**
 * 音频增益配置
 */
export interface GainControlOptions {
  /** 增益值 (0-2, 1为原始) */
  gain?: number
  /** 是否自动增益 */
  autoGain?: boolean
  /** 目标音量 (0-1) */
  targetLevel?: number
  /** 攻击时间 (毫秒) */
  attackTime?: number
  /** 释放时间 (毫秒) */
  releaseTime?: number
}

/**
 * 波形生成配置
 */
export interface WaveformOptions {
  /** 波形类型 */
  type?: 'sine' | 'square' | 'sawtooth' | 'triangle'
  /** 频率 (Hz) */
  frequency?: number
  /** 振幅 (0-1) */
  amplitude?: number
  /** 持续时间 (秒) */
  duration?: number
  /** 采样率 */
  sampleRate?: number
}

/**
 * 音频可视化数据
 */
export interface WaveformData {
  /** 时间点 */
  time: number
  /** 振幅 (-1 到 1) */
  amplitude: number
}

/**
 * 频谱数据
 */
export interface SpectrumData {
  /** 频率 (Hz) */
  frequency: number
  /** 幅度 (0-1) */
  magnitude: number
}

/**
 * 音频元数据
 */
export interface AudioMetadata {
  /** 时长 (秒) */
  duration: number
  /** 采样率 */
  sampleRate: number
  /** 通道数 */
  channels: number
  /** 比特深度 */
  bitDepth: number
  /** 格式 */
  format: AudioFormat
  /** 文件大小 (字节) */
  fileSize: number
}

/**
 * 音频工具类
 */
export class AudioUtils {
  /**
   * 音频降噪
   */
  static async reduceNoise(
    audioBuffer: AudioBuffer,
    options: NoiseReductionOptions = {}
  ): Promise<AudioBuffer> {
    const {
      strength = 0.5,
      gateThreshold = 0.01,
      noiseSampleDuration = 100,
      adaptive = true,
    } = options

    const numChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const noiseSampleCount = Math.floor((noiseSampleDuration / 1000) * sampleRate)

    // 创建新的 AudioBuffer
    const outputBuffer = new AudioContext({
      sampleRate,
    }).createBuffer(numChannels, audioBuffer.length, sampleRate)

    // 对每个通道进行处理
    for (let channel = 0; channel < numChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel)
      const outputData = outputBuffer.getChannelData(channel)

      // 估计噪声（使用前 N 个样本）
      let noiseLevel = 0
      for (let i = 0; i < Math.min(noiseSampleCount, inputData.length); i++) {
        noiseLevel += Math.abs(inputData[i])
      }
      noiseLevel /= noiseSampleCount

      // 自适应噪声估计
      if (adaptive) {
        const windowSize = 1024
        for (let i = 0; i < inputData.length; i += windowSize) {
          const windowEnd = Math.min(i + windowSize, inputData.length)
          let windowLevel = 0
          for (let j = i; j < windowEnd; j++) {
            windowLevel += Math.abs(inputData[j])
          }
          windowLevel /= windowEnd - i

          // 如果窗口音量低于噪声门限，更新噪声估计
          if (windowLevel < gateThreshold) {
            noiseLevel = noiseLevel * 0.9 + windowLevel * 0.1
          }
        }
      }

      // 应用降噪
      for (let i = 0; i < inputData.length; i++) {
        const sample = inputData[i]
        const absSample = Math.abs(sample)

        // 噪声门限
        if (absSample < gateThreshold) {
          outputData[i] = sample * (1 - strength)
        } else {
          // 谱减法（简化版）
          const reduction = Math.min(strength, noiseLevel / (absSample + 1e-10))
          outputData[i] = sample * (1 - reduction * 0.5)
        }
      }
    }

    return outputBuffer
  }

  /**
   * 音频增益控制
   */
  static async applyGain(
    audioBuffer: AudioBuffer,
    options: GainControlOptions = {}
  ): Promise<AudioBuffer> {
    const {
      gain = 1,
      autoGain = false,
      targetLevel = 0.7,
      attackTime = 10,
      releaseTime = 100,
    } = options

    const numChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const attackSamples = Math.floor((attackTime / 1000) * sampleRate)
    const releaseSamples = Math.floor((releaseTime / 1000) * sampleRate)

    // 创建新的 AudioBuffer
    const outputBuffer = new AudioContext({
      sampleRate,
    }).createBuffer(numChannels, audioBuffer.length, sampleRate)

    // 计算目标增益
    let targetGain = gain
    if (autoGain) {
      // 计算当前音频的 RMS
      let totalRMS = 0
      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel)
        let sum = 0
        for (let i = 0; i < channelData.length; i++) {
          sum += channelData[i] * channelData[i]
        }
        totalRMS += Math.sqrt(sum / channelData.length)
      }
      totalRMS /= numChannels

      // 计算需要的增益
      if (totalRMS > 0) {
        targetGain = targetLevel / totalRMS
        // 限制增益范围
        targetGain = Math.max(0.1, Math.min(10, targetGain))
      }
    }

    // 对每个通道应用增益
    for (let channel = 0; channel < numChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel)
      const outputData = outputBuffer.getChannelData(channel)

      if (autoGain) {
        // 自动增益控制（压缩器）
        let currentGain = 1
        for (let i = 0; i < inputData.length; i++) {
          const absSample = Math.abs(inputData[i])

          // 计算目标增益
          const desiredGain = absSample > targetLevel ? targetLevel / absSample : 1

          // 平滑过渡
          if (desiredGain < currentGain) {
            // 攻击阶段
            currentGain +=
              (desiredGain - currentGain) / attackSamples
          } else {
            // 释放阶段
            currentGain +=
              (desiredGain - currentGain) / releaseSamples
          }

          outputData[i] = inputData[i] * currentGain * targetGain
        }
      } else {
        // 简单增益
        for (let i = 0; i < inputData.length; i++) {
          outputData[i] = inputData[i] * targetGain
        }
      }
    }

    return outputBuffer
  }

  /**
   * 生成波形
   */
  static generateWaveform(options: WaveformOptions = {}): AudioBuffer {
    const {
      type = 'sine',
      frequency = 440,
      amplitude = 0.5,
      duration = 1,
      sampleRate = 44100,
    } = options

    const numSamples = Math.floor(duration * sampleRate)
    const audioContext = new AudioContext({ sampleRate })
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate
      const phase = 2 * Math.PI * frequency * t

      switch (type) {
        case 'sine':
          data[i] = amplitude * Math.sin(phase)
          break
        case 'square':
          data[i] = amplitude * (Math.sin(phase) >= 0 ? 1 : -1)
          break
        case 'sawtooth':
          data[i] = amplitude * (2 * ((t * frequency) % 1) - 1)
          break
        case 'triangle':
          data[i] =
            amplitude *
            (2 * Math.abs(2 * ((t * frequency) % 1) - 1) - 1)
          break
      }
    }

    return buffer
  }

  /**
   * 提取波形数据（用于可视化）
   */
  static extractWaveformData(
    audioBuffer: AudioBuffer,
    samples: number = 1000
  ): WaveformData[] {
    const channelData = audioBuffer.getChannelData(0)
    const step = Math.floor(channelData.length / samples)
    const waveform: WaveformData[] = []

    for (let i = 0; i < samples; i++) {
      const start = i * step
      const end = Math.min(start + step, channelData.length)

      // 计算该段的峰值
      let peak = 0
      for (let j = start; j < end; j++) {
        peak = Math.max(peak, Math.abs(channelData[j]))
      }

      waveform.push({
        time: (i / samples) * audioBuffer.duration,
        amplitude: peak,
      })
    }

    return waveform
  }

  /**
   * 提取频谱数据（用于可视化）
   */
  static extractSpectrumData(
    audioBuffer: AudioBuffer,
    fftSize: number = 2048
  ): SpectrumData[] {
    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = fftSize

    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(analyser)
    source.start()

    const frequencyData = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(frequencyData)

    const spectrum: SpectrumData[] = []
    const nyquist = audioBuffer.sampleRate / 2
    const binWidth = nyquist / frequencyData.length

    for (let i = 0; i < frequencyData.length; i++) {
      spectrum.push({
        frequency: i * binWidth,
        magnitude: frequencyData[i] / 255,
      })
    }

    return spectrum
  }

  /**
   * 计算音频的 RMS（均方根）
   */
  static calculateRMS(audioBuffer: AudioBuffer): number {
    let totalRMS = 0
    const numChannels = audioBuffer.numberOfChannels

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel)
      let sum = 0
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i]
      }
      totalRMS += Math.sqrt(sum / channelData.length)
    }

    return totalRMS / numChannels
  }

  /**
   * 计算音频的峰值
   */
  static calculatePeak(audioBuffer: AudioBuffer): number {
    let peak = 0
    const numChannels = audioBuffer.numberOfChannels

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel)
      for (let i = 0; i < channelData.length; i++) {
        peak = Math.max(peak, Math.abs(channelData[i]))
      }
    }

    return peak
  }

  /**
   * 计算音频的动态范围
   */
  static calculateDynamicRange(audioBuffer: AudioBuffer): number {
    const peak = this.calculatePeak(audioBuffer)
    const rms = this.calculateRMS(audioBuffer)

    if (rms === 0) {
      return 0
    }

    // 动态范围 = 峰值 / RMS
    return peak / rms
  }

  /**
   * 检测静音段
   */
  static detectSilence(
    audioBuffer: AudioBuffer,
    threshold: number = 0.01,
    minDuration: number = 0.1
  ): Array<{ start: number; end: number }> {
    const channelData = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate
    const minSamples = Math.floor(minDuration * sampleRate)

    const silences: Array<{ start: number; end: number }> = []
    let inSilence = false
    let silenceStart = 0
    let silenceSamples = 0

    for (let i = 0; i < channelData.length; i++) {
      const absSample = Math.abs(channelData[i])

      if (absSample < threshold) {
        if (!inSilence) {
          inSilence = true
          silenceStart = i
          silenceSamples = 0
        }
        silenceSamples++
      } else {
        if (inSilence && silenceSamples >= minSamples) {
          silences.push({
            start: silenceStart / sampleRate,
            end: i / sampleRate,
          })
        }
        inSilence = false
      }
    }

    // 检查最后的静音段
    if (inSilence && silenceSamples >= minSamples) {
      silences.push({
        start: silenceStart / sampleRate,
        end: channelData.length / sampleRate,
      })
    }

    return silences
  }

  /**
   * 裁剪静音段
   */
  static async trimSilence(
    audioBuffer: AudioBuffer,
    threshold: number = 0.01,
    padding: number = 0.05
  ): Promise<AudioBuffer> {
    const channelData = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate
    const paddingSamples = Math.floor(padding * sampleRate)

    // 找到开始位置
    let start = 0
    for (let i = 0; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) >= threshold) {
        start = Math.max(0, i - paddingSamples)
        break
      }
    }

    // 找到结束位置
    let end = channelData.length
    for (let i = channelData.length - 1; i >= 0; i--) {
      if (Math.abs(channelData[i]) >= threshold) {
        end = Math.min(channelData.length, i + paddingSamples)
        break
      }
    }

    // 如果整个音频都是静音，返回原始音频
    if (start >= end) {
      return audioBuffer
    }

    // 创建新的 AudioBuffer
    const outputBuffer = new AudioContext({
      sampleRate,
    }).createBuffer(
      audioBuffer.numberOfChannels,
      end - start,
      sampleRate
    )

    // 复制数据
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel)
      const outputData = outputBuffer.getChannelData(channel)
      outputData.set(inputData.slice(start, end))
    }

    return outputBuffer
  }

  /**
   * 淡入淡出
   */
  static async applyFade(
    audioBuffer: AudioBuffer,
    fadeInDuration: number = 0,
    fadeOutDuration: number = 0
  ): Promise<AudioBuffer> {
    const sampleRate = audioBuffer.sampleRate
    const fadeInSamples = Math.floor(fadeInDuration * sampleRate)
    const fadeOutSamples = Math.floor(fadeOutDuration * sampleRate)

    // 创建新的 AudioBuffer
    const outputBuffer = new AudioContext({
      sampleRate,
    }).createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      sampleRate
    )

    // 对每个通道应用淡入淡出
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel)
      const outputData = outputBuffer.getChannelData(channel)

      for (let i = 0; i < inputData.length; i++) {
        let gain = 1

        // 淡入
        if (i < fadeInSamples) {
          gain = i / fadeInSamples
        }
        // 淡出
        else if (i > inputData.length - fadeOutSamples) {
          gain = (inputData.length - i) / fadeOutSamples
        }

        outputData[i] = inputData[i] * gain
      }
    }

    return outputBuffer
  }

  /**
   * 混合多个音频
   */
  static async mixAudioBuffers(
    buffers: AudioBuffer[],
    gains?: number[]
  ): Promise<AudioBuffer> {
    if (buffers.length === 0) {
      throw new Error('No audio buffers to mix')
    }

    // 找到最长的音频
    const maxLength = Math.max(...buffers.map((b) => b.length))
    const sampleRate = buffers[0].sampleRate
    const numChannels = buffers[0].numberOfChannels

    // 创建新的 AudioBuffer
    const outputBuffer = new AudioContext({
      sampleRate,
    }).createBuffer(numChannels, maxLength, sampleRate)

    // 混合所有音频
    for (let channel = 0; channel < numChannels; channel++) {
      const outputData = outputBuffer.getChannelData(channel)

      for (let i = 0; i < buffers.length; i++) {
        const buffer = buffers[i]
        const gain = gains?.[i] ?? 1
        const inputData = buffer.getChannelData(channel)

        for (let j = 0; j < inputData.length; j++) {
          outputData[j] += inputData[j] * gain
        }
      }

      // 限制在 -1 到 1 之间
      for (let i = 0; i < outputData.length; i++) {
        outputData[i] = Math.max(-1, Math.min(1, outputData[i]))
      }
    }

    return outputBuffer
  }

  /**
   * 改变音高（简单实现）
   */
  static async changePitch(
    audioBuffer: AudioBuffer,
    semitones: number
  ): Promise<AudioBuffer> {
    const ratio = Math.pow(2, semitones / 12)
    const newLength = Math.floor(audioBuffer.length / ratio)

    const outputBuffer = new AudioContext({
      sampleRate: audioBuffer.sampleRate,
    }).createBuffer(
      audioBuffer.numberOfChannels,
      newLength,
      audioBuffer.sampleRate
    )

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel)
      const outputData = outputBuffer.getChannelData(channel)

      // 线性插值
      for (let i = 0; i < newLength; i++) {
        const sourceIndex = i * ratio
        const index = Math.floor(sourceIndex)
        const fraction = sourceIndex - index

        if (index + 1 < inputData.length) {
          outputData[i] =
            inputData[index] * (1 - fraction) +
            inputData[index + 1] * fraction
        } else {
          outputData[i] = inputData[index]
        }
      }
    }

    return outputBuffer
  }

  /**
   * 改变速度
   */
  static async changeSpeed(
    audioBuffer: AudioBuffer,
    speed: number
  ): Promise<AudioBuffer> {
    const newLength = Math.floor(audioBuffer.length / speed)

    const outputBuffer = new AudioContext({
      sampleRate: audioBuffer.sampleRate,
    }).createBuffer(
      audioBuffer.numberOfChannels,
      newLength,
      audioBuffer.sampleRate
    )

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel)
      const outputData = outputBuffer.getChannelData(channel)

      for (let i = 0; i < newLength; i++) {
        const sourceIndex = Math.floor(i * speed)
        outputData[i] = inputData[sourceIndex]
      }
    }

    return outputBuffer
  }

  /**
   * 获取音频元数据
   */
  static async getMetadata(
    blob: Blob
  ): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
      const audio = new Audio()
      const url = URL.createObjectURL(blob)

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url)

        resolve({
          duration: audio.duration,
          sampleRate: 0, // Blob 无法直接获取采样率
          channels: 0,
          bitDepth: 0,
          format: blob.type.split('/')[1] as AudioFormat,
          fileSize: blob.size,
        })
      }

      audio.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load audio metadata'))
      }

      audio.src = url
    })
  }

  /**
   * 将 AudioBuffer 转换为 WAV Blob
   */
  static audioBufferToWav(audioBuffer: AudioBuffer): Blob {
    const numChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const format = 1 // PCM
    const bitDepth = 16

    const bytesPerSample = bitDepth / 8
    const blockAlign = numChannels * bytesPerSample

    const dataLength = audioBuffer.length * blockAlign
    const bufferLength = 44 + dataLength

    const arrayBuffer = new ArrayBuffer(bufferLength)
    const view = new DataView(arrayBuffer)

    // WAV 头部
    this.writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + dataLength, true)
    this.writeString(view, 8, 'WAVE')
    this.writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, format, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitDepth, true)
    this.writeString(view, 36, 'data')
    view.setUint32(40, dataLength, true)

    // 写入音频数据
    const channels: Float32Array[] = []
    for (let i = 0; i < numChannels; i++) {
      channels.push(audioBuffer.getChannelData(i))
    }

    let offset = 44
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]))
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
        view.setInt16(offset, intSample, true)
        offset += 2
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }

  /**
   * 写入字符串到 DataView
   */
  private static writeString(
    view: DataView,
    offset: number,
    string: string
  ): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  /**
   * 将 Float32Array 转换为 Int16Array
   */
  static float32ToInt16(float32: Float32Array): Int16Array {
    const int16 = new Int16Array(float32.length)

    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]))
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }

    return int16
  }

  /**
   * 将 Int16Array 转换为 Float32Array
   */
  static int16ToFloat32(int16: Int16Array): Float32Array {
    const float32 = new Float32Array(int16.length)

    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff)
    }

    return float32
  }
}

/**
 * 便捷函数：降噪
 */
export async function reduceNoise(
  audioBuffer: AudioBuffer,
  options?: NoiseReductionOptions
): Promise<AudioBuffer> {
  return AudioUtils.reduceNoise(audioBuffer, options)
}

/**
 * 便捷函数：增益控制
 */
export async function applyGain(
  audioBuffer: AudioBuffer,
  options?: GainControlOptions
): Promise<AudioBuffer> {
  return AudioUtils.applyGain(audioBuffer, options)
}

/**
 * 便捷函数：生成波形
 */
export function generateWaveform(options?: WaveformOptions): AudioBuffer {
  return AudioUtils.generateWaveform(options)
}

/**
 * 便捷函数：提取波形数据
 */
export function extractWaveformData(
  audioBuffer: AudioBuffer,
  samples?: number
): WaveformData[] {
  return AudioUtils.extractWaveformData(audioBuffer, samples)
}

/**
 * 便捷函数：提取频谱数据
 */
export function extractSpectrumData(
  audioBuffer: AudioBuffer,
  fftSize?: number
): SpectrumData[] {
  return AudioUtils.extractSpectrumData(audioBuffer, fftSize)
}