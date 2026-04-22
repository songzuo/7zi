/**
 * Response Compression Middleware
 *
 * 提供 Brotli/Gzip 自适应压缩，支持动态压缩级别调整和流式压缩
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * 压缩算法类型
 */
export type CompressionAlgorithm = 'br' | 'gzip' | 'none'

/**
 * 压缩配置接口
 */
export interface CompressionConfig {
  // 启用的压缩算法（按优先级排序）
  algorithms: CompressionAlgorithm[]

  // 压缩级别（0-9，数字越大压缩率越高但速度越慢）
  level: number

  // 最小压缩大小（字节）
  threshold: number

  // 不压缩的内容类型
  skipContentTypes: string[]

  // 不压缩的路径模式
  skipPaths: RegExp[]

  // 是否启用流式压缩
  enableStreaming: boolean

  // 是否启用动态压缩级别调整
  enableDynamicLevel: boolean

  // 动态调整的响应时间阈值（毫秒）
  responseTimeThreshold: number

  // 压缩字典（可选）
  dictionary?: Buffer
}

/**
 * 压缩统计接口
 */
export interface CompressionStats {
  totalRequests: number
  compressedRequests: number
  compressionRate: number
  totalOriginalSize: number
  totalCompressedSize: number
  averageCompressionRatio: number
  algorithmUsage: Record<CompressionAlgorithm, number>
  averageCompressionTime: number
}

/**
 * 压缩结果接口
 */
export interface CompressionResult {
  algorithm: CompressionAlgorithm
  originalSize: number
  compressedSize: number
  compressionRatio: number
  compressionTime: number
}

/**
 * 响应压缩中间件类
 */
export class ResponseCompressionMiddleware {
  private config: Required<CompressionConfig>
  private stats: CompressionStats = {
    totalRequests: 0,
    compressedRequests: 0,
    compressionRate: 0,
    totalOriginalSize: 0,
    totalCompressedSize: 0,
    averageCompressionRatio: 0,
    algorithmUsage: { br: 0, gzip: 0, none: 0 },
    averageCompressionTime: 0,
  }

  private compressionTimes: number[] = []
  private currentLevel: number

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = {
      algorithms: config.algorithms || ['br', 'gzip', 'none'],
      level: config.level || 6,
      threshold: config.threshold || 1024, // 1KB
      skipContentTypes: config.skipContentTypes || [
        'image/',
        'video/',
        'audio/',
        'application/zip',
        'application/x-gzip',
        'application/x-tar',
        'application/x-rar-compressed',
      ],
      skipPaths: config.skipPaths || [],
      enableStreaming: config.enableStreaming ?? true,
      enableDynamicLevel: config.enableDynamicLevel ?? true,
      responseTimeThreshold: config.responseTimeThreshold || 100,
      dictionary: config.dictionary ?? undefined,
    } as Required<CompressionConfig>

    this.currentLevel = this.config.level
  }

  /**
   * 中间件处理函数
   */
  async middleware(request: NextRequest): Promise<NextResponse | null> {
    // 检查是否跳过压缩
    if (this.shouldSkipCompression(request)) {
      return null
    }

    // 记录请求开始时间
    const startTime = Date.now()

    // 获取响应
    const response = await this.getResponse(request)

    if (!response) {
      return null
    }

    // 检查响应是否应该压缩
    if (!this.shouldCompressResponse(response)) {
      return response
    }

    // 获取客户端支持的压缩算法
    const acceptEncoding = request.headers.get('accept-encoding') || ''
    const supportedAlgorithms = this.getSupportedAlgorithms(acceptEncoding)

    if (supportedAlgorithms.length === 0) {
      return response
    }

    // 选择最佳压缩算法
    const algorithm = this.selectAlgorithm(supportedAlgorithms)

    if (algorithm === 'none') {
      return response
    }

    // 执行压缩
    const compressionResult = await this.compressResponse(response, algorithm)

    // 更新统计
    this.updateStats(compressionResult, Date.now() - startTime)

    // 动态调整压缩级别
    if (this.config.enableDynamicLevel) {
      this.adjustCompressionLevel(compressionResult.compressionTime)
    }

    // 返回压缩后的响应
    return this.createCompressedResponse(response, compressionResult)
  }

  /**
   * 检查是否应该跳过压缩
   */
  private shouldSkipCompression(request: NextRequest): boolean {
    const url = request.nextUrl.pathname

    // 检查路径模式
    for (const pattern of this.config.skipPaths) {
      if (pattern.test(url)) {
        return true
      }
    }

    return false
  }

  /**
   * 获取响应（模拟，实际使用时需要传入响应）
   */
  private async getResponse(request: NextRequest): Promise<NextResponse | null> {
    // 这里应该返回实际的响应
    // 在实际使用时，这个方法会被替换为获取真实响应的逻辑
    return null
  }

  /**
   * 检查响应是否应该压缩
   */
  private shouldCompressResponse(response: NextResponse): boolean {
    const contentType = response.headers.get('content-type') || ''

    // 检查内容类型
    for (const skipType of this.config.skipContentTypes) {
      if (contentType.startsWith(skipType)) {
        return false
      }
    }

    // 检查响应大小
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) < this.config.threshold) {
      return false
    }

    return true
  }

  /**
   * 获取客户端支持的压缩算法
   */
  private getSupportedAlgorithms(acceptEncoding: string): CompressionAlgorithm[] {
    const supported: CompressionAlgorithm[] = []

    if (acceptEncoding.includes('br')) {
      supported.push('br')
    }

    if (acceptEncoding.includes('gzip')) {
      supported.push('gzip')
    }

    return supported
  }

  /**
   * 选择最佳压缩算法
   */
  private selectAlgorithm(supportedAlgorithms: CompressionAlgorithm[]): CompressionAlgorithm {
    // 按配置的优先级选择第一个支持的算法
    for (const algorithm of this.config.algorithms) {
      if (supportedAlgorithms.includes(algorithm)) {
        return algorithm
      }
    }

    return 'none'
  }

  /**
   * 压缩响应
   */
  private async compressResponse(
    response: NextResponse,
    algorithm: CompressionAlgorithm
  ): Promise<CompressionResult> {
    const startTime = Date.now()

    // 获取响应体
    const body = await response.text()
    const originalSize = Buffer.byteLength(body)

    // 执行压缩
    let compressedBody: string
    let compressedSize: number

    if (algorithm === 'br') {
      compressedBody = await this.compressBrotli(body)
      compressedSize = Buffer.byteLength(compressedBody)
    } else if (algorithm === 'gzip') {
      compressedBody = await this.compressGzip(body)
      compressedSize = Buffer.byteLength(compressedBody)
    } else {
      compressedBody = body
      compressedSize = originalSize
    }

    const compressionTime = Date.now() - startTime

    return {
      algorithm,
      originalSize,
      compressedSize,
      compressionRatio: originalSize > 0 ? compressedSize / originalSize : 1,
      compressionTime,
    }
  }

  /**
   * Brotli 压缩
   */
  private async compressBrotli(data: string): Promise<string> {
    // 在 Node.js 环境中使用 zlib
    try {
      const zlib = await import('zlib')
      const compressed = zlib.brotliCompressSync(Buffer.from(data), {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: this.currentLevel,
        },
      })
      return compressed.toString('base64')
    } catch (error) {
      console.error('Brotli compression failed:', error)
      return data
    }
  }

  /**
   * Gzip 压缩
   */
  private async compressGzip(data: string): Promise<string> {
    try {
      const zlib = await import('zlib')
      const compressed = zlib.gzipSync(Buffer.from(data), {
        level: this.currentLevel,
      })
      return compressed.toString('base64')
    } catch (error) {
      console.error('Gzip compression failed:', error)
      return data
    }
  }

  /**
   * 创建压缩后的响应
   */
  private createCompressedResponse(
    originalResponse: NextResponse,
    compressionResult: CompressionResult
  ): NextResponse {
    const response = new NextResponse(originalResponse.body, {
      status: originalResponse.status,
      statusText: originalResponse.statusText,
      headers: originalResponse.headers,
    })

    // 设置压缩头
    response.headers.set('content-encoding', compressionResult.algorithm)
    response.headers.set('x-compression-ratio', compressionResult.compressionRatio.toFixed(2))
    response.headers.set('x-compression-time', compressionResult.compressionTime.toString())

    return response
  }

  /**
   * 更新统计信息
   */
  private updateStats(result: CompressionResult, totalTime: number): void {
    this.stats.totalRequests++
    this.stats.compressedRequests++
    this.stats.compressionRate = this.stats.compressedRequests / this.stats.totalRequests
    this.stats.totalOriginalSize += result.originalSize
    this.stats.totalCompressedSize += result.compressedSize
    this.stats.averageCompressionRatio =
      this.stats.totalOriginalSize > 0
        ? this.stats.totalCompressedSize / this.stats.totalOriginalSize
        : 0
    this.stats.algorithmUsage[result.algorithm]++
    this.compressionTimes.push(result.compressionTime)

    // 计算平均压缩时间
    if (this.compressionTimes.length > 100) {
      this.compressionTimes.shift()
    }
    this.stats.averageCompressionTime =
      this.compressionTimes.reduce((a, b) => a + b, 0) / this.compressionTimes.length
  }

  /**
   * 动态调整压缩级别
   */
  private adjustCompressionLevel(compressionTime: number): void {
    if (compressionTime > this.config.responseTimeThreshold) {
      // 压缩时间过长，降低压缩级别
      this.currentLevel = Math.max(1, this.currentLevel - 1)
    } else if (compressionTime < this.config.responseTimeThreshold / 2) {
      // 压缩时间很短，可以提高压缩级别
      this.currentLevel = Math.min(9, this.currentLevel + 1)
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): CompressionStats {
    return { ...this.stats }
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      compressedRequests: 0,
      compressionRate: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      averageCompressionRatio: 0,
      algorithmUsage: { br: 0, gzip: 0, none: 0 },
      averageCompressionTime: 0,
    }
    this.compressionTimes = []
  }

  /**
   * 获取当前压缩级别
   */
  getCurrentLevel(): number {
    return this.currentLevel
  }

  /**
   * 设置压缩级别
   */
  setLevel(level: number): void {
    this.currentLevel = Math.max(1, Math.min(9, level))
  }

  /**
   * 流式压缩（用于大文件）
   */
  async *streamCompress(
    stream: ReadableStream<Uint8Array>,
    algorithm: CompressionAlgorithm
  ): AsyncGenerator<Uint8Array> {
    if (!this.config.enableStreaming) {
      // Manually iterate to avoid async iterator issue
      const reader = stream.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          yield value
        }
      } finally {
        reader.releaseLock()
      }
      return
    }

    try {
      const zlib = await import('zlib')

      let compressor: any

      if (algorithm === 'br') {
        compressor = zlib.createBrotliCompress({
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: this.currentLevel,
          },
        })
      } else if (algorithm === 'gzip') {
        compressor = zlib.createGzip({
          level: this.currentLevel,
        })
      } else {
        // Pass through uncompressed
        const reader = stream.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            yield value
          }
        } finally {
          reader.releaseLock()
        }
        return
      }

      const reader = stream.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          compressor.write(value)

          while (compressor.readableLength > 0) {
            const chunk = compressor.read()
            if (chunk) {
              yield chunk
            } else {
              break
            }
          }
        }

        compressor.end()

        while (compressor.readableLength > 0) {
          const chunk = compressor.read()
          if (chunk) {
            yield chunk
          } else {
            break
          }
        }
      } finally {
        reader.releaseLock()
        compressor.destroy()
      }
    } catch (error) {
      console.error('Stream compression failed:', error)
      // 降级到不压缩 - manually iterate to avoid async iterator issue
      const reader = stream.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          yield value
        }
      } finally {
        reader.releaseLock()
      }
    }
  }
}

/**
 * 创建默认的压缩中间件实例
 */
export const createCompressionMiddleware = (
  config?: Partial<CompressionConfig>
): ResponseCompressionMiddleware => {
  return new ResponseCompressionMiddleware(config)
}

/**
 * 预定义的压缩配置
 */
export const CompressionPresets = {
  // 快速压缩（低压缩率，高速度）
  FAST: {
    algorithms: ['gzip', 'br', 'none'],
    level: 1,
    threshold: 1024,
    enableStreaming: true,
    enableDynamicLevel: true,
    responseTimeThreshold: 50,
  },

  // 平衡压缩（中等压缩率和速度）
  BALANCED: {
    algorithms: ['br', 'gzip', 'none'],
    level: 6,
    threshold: 1024,
    enableStreaming: true,
    enableDynamicLevel: true,
    responseTimeThreshold: 100,
  },

  // 最大压缩（高压缩率，低速度）
  MAX: {
    algorithms: ['br', 'gzip', 'none'],
    level: 9,
    threshold: 512,
    enableStreaming: true,
    enableDynamicLevel: true,
    responseTimeThreshold: 200,
  },
}

/**
 * Next.js 中间件包装器
 */
export function withCompression(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: Partial<CompressionConfig>
) {
  const middleware = createCompressionMiddleware(config)

  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()

    // 调用原始处理器
    const response = await handler(request)

    // 检查是否应该压缩
    if (!middleware['shouldCompressResponse'](response)) {
      return response
    }

    // 获取客户端支持的压缩算法
    const acceptEncoding = request.headers.get('accept-encoding') || ''
    const supportedAlgorithms = middleware['getSupportedAlgorithms'](acceptEncoding)

    if (supportedAlgorithms.length === 0) {
      return response
    }

    // 选择最佳压缩算法
    const algorithm = middleware['selectAlgorithm'](supportedAlgorithms)

    if (algorithm === 'none') {
      return response
    }

    // 执行压缩
    const compressionResult = await middleware['compressResponse'](response, algorithm)

    // 更新统计
    middleware['updateStats'](compressionResult, Date.now() - startTime)

    // 返回压缩后的响应
    return middleware['createCompressedResponse'](response, compressionResult)
  }
}