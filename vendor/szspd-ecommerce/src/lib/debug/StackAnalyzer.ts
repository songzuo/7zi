/**
 * @fileoverview 堆栈分析器
 * 解析错误堆栈，跟踪错误传播路径，定位问题源头
 * @version v1.10.0
 */

import type {
  StackFrame,
  StackAnalysis,
  ErrorChainItem,
  SourceContext,
} from './types'

// ============================================
// 堆栈解析
// ============================================

/**
 * 解析堆栈跟踪
 */
export function parseStackTrace(error: Error | string): StackFrame[] {
  const stack = typeof error === 'string' ? error : error.stack || ''

  if (!stack) return []

  // 分割堆栈行
  const lines = stack.split('\n').filter((line: string) => line.trim())

  const frames: StackFrame[] = []

  for (const line of lines) {
    const frame = parseStackLine(line, frames.length)
    if (frame) {
      frames.push(frame)
    }
  }

  return frames
}

/**
 * 解析单行堆栈
 */
function parseStackLine(line: string, index: number): StackFrame | null {
  // Node.js 格式: at functionName (file:line:col)
  // 或: at file:line:col

  // Chrome 格式: at functionName [as alias] (file:line:col)
  // 或: at file:line:col

  // 移除 "at " 前缀
  const trimmed = line.replace(/^\s*at\s+/, '').trim()
  if (!trimmed) return null

  // 解析函数名和位置
  const locationMatch = trimmed.match(/\(([^)]+)\)$/)
  let functionName = ''
  let location = ''

  if (locationMatch) {
    functionName = trimmed.slice(0, locationMatch.index).trim()
    location = locationMatch[1]
  } else {
    // 没有函数名，只有位置
    location = trimmed
  }

  // 解析文件位置
  const locMatch = location.match(/^(?:(?:file:\/\/)?|https?:|node:)?(.+?)(?::(\d+))?(?::(\d+))?$/)
  if (!locMatch) return null

  const fileName = locMatch[1]
  const lineNumber = locMatch[2] ? parseInt(locMatch[2], 10) : 0
  const columnNumber = locMatch[3] ? parseInt(locMatch[3], 10) : 0

  // 判断是否为 Node.js 内置模块
  const isNative = fileName.startsWith('node:') || fileName.includes('node_modules')

  // 特殊构造函数标识
  const isConstructor = functionName.startsWith('new ')

  return {
    id: `frame-${index}`,
    functionName: functionName || '<anonymous>',
    fileName,
    lineNumber,
    columnNumber,
    isNative,
    isConstructor,
  }
}

// ============================================
// 堆栈分析器
// ============================================

/**
 * 堆栈分析器
 */
export class StackAnalyzer {
  /**
   * 分析错误堆栈
   */
  analyze(error: Error): StackAnalysis {
    const frames = parseStackTrace(error)

    if (frames.length === 0) {
      return {
        frames: [],
        rootFrame: null,
        errorChain: [],
        entryPoint: null,
        isRecoverable: true,
        suggestions: ['无法解析堆栈信息'],
      }
    }

    // 识别错误源头
    const rootFrame = this.findRootFrame(frames)

    // 构建错误传播链
    const errorChain = this.buildErrorChain(frames, error.message)

    // 找到入口点
    const entryPoint = this.findEntryPoint(frames)

    // 判断是否可恢复
    const isRecoverable = this.checkRecoverability(frames, error.message)

    // 生成建议
    const suggestions = this.generateSuggestions(frames, error)

    return {
      frames,
      rootFrame,
      errorChain,
      entryPoint,
      isRecoverable,
      suggestions,
    }
  }

  /**
   * 查找最可能的错误源头
   */
  private findRootFrame(frames: StackFrame[]): StackFrame | null {
    // 通常第一个非 native 的帧是错误源头
    for (const frame of frames) {
      if (!frame.isNative) {
        return frame
      }
    }

    // 如果都是 native，返回第一个
    return frames[0] || null
  }

  /**
   * 构建错误传播链
   */
  private buildErrorChain(frames: StackFrame[], message: string): ErrorChainItem[] {
    const chain: ErrorChainItem[] = []

    // 识别错误类型
    const errorType = this.identifyErrorType(message)

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      const type = this.determineChainItemType(frame, i, errorType)
      const description = this.generateChainDescription(frame, type, i)

      chain.push({ frame, type, description })
    }

    return chain
  }

  /**
   * 识别错误类型
   */
  private identifyErrorType(message: string): string {
    const lower = message.toLowerCase()

    if (lower.includes('null') || lower.includes('undefined')) return 'null-undefined'
    if (lower.includes('type')) return 'type-error'
    if (lower.includes('syntax')) return 'syntax-error'
    if (lower.includes('reference')) return 'reference-error'
    if (lower.includes('range')) return 'range-error'
    if (lower.includes('permission') || lower.includes('access')) return 'permission-error'

    return 'unknown'
  }

  /**
   * 确定链项目类型
   */
  private determineChainItemType(
    frame: StackFrame,
    index: number,
    errorType: string
  ): 'cause' | 'propagation' | 'handler' {
    // 第一个非 native 帧是原因
    if (index === 0 && !frame.isNative) {
      return 'cause'
    }

    // 包含 "catch" 或 "error" 的可能是处理器
    if (frame.functionName.toLowerCase().includes('catch')) {
      return 'handler'
    }
    if (frame.functionName.toLowerCase().includes('error')) {
      return 'handler'
    }

    return 'propagation'
  }

  /**
   * 生成链项目描述
   */
  private generateChainDescription(
    frame: StackFrame,
    type: 'cause' | 'propagation' | 'handler',
    index: number
  ): string {
    switch (type) {
      case 'cause':
        return `Error originates here: ${frame.functionName} in ${frame.fileName}:${frame.lineNumber}`

      case 'propagation':
        return `Propagated through: ${frame.functionName}`

      case 'handler':
        return `Caught/handled by: ${frame.functionName}`

      default:
        return `Frame ${index}: ${frame.functionName}`
    }
  }

  /**
   * 查找入口点
   */
  private findEntryPoint(frames: StackFrame[]): StackFrame | null {
    // 常见入口点模式
    const entryPatterns = [
      'main',
      'index',
      'App',
      'page',
      'getServerSideProps',
      'getStaticProps',
      '_app',
      '_document',
      'getInitialProps',
      'run',
      'bootstrap',
      'start',
    ]

    for (const frame of frames) {
      for (const pattern of entryPatterns) {
        if (
          frame.functionName.toLowerCase().includes(pattern.toLowerCase()) ||
          frame.fileName.toLowerCase().includes(pattern.toLowerCase())
        ) {
          return frame
        }
      }
    }

    // 返回第一个非 native 的帧
    return frames.find(f => !f.isNative) || null
  }

  /**
   * 检查是否可恢复
   */
  private checkRecoverability(frames: StackFrame[], message: string): boolean {
    const lower = message.toLowerCase()

    // 不可恢复的错误
    if (
      lower.includes('out of memory') ||
      lower.includes('heap') ||
      lower.includes('fatal') ||
      lower.includes('cannot find module')
    ) {
      return false
    }

    // 检查是否有错误处理器
    const hasHandler = frames.some(
      f =>
        f.functionName.toLowerCase().includes('catch') ||
        f.functionName.toLowerCase().includes('handle')
    )

    return hasHandler || frames.length > 3
  }

  /**
   * 生成修复建议
   */
  private generateSuggestions(frames: StackFrame[], error: Error): string[] {
    const suggestions: string[] = []
    const message = error.message.toLowerCase()

    // 基于错误类型建议
    if (message.includes('null') || message.includes('undefined')) {
      suggestions.push('检查并添加 null/undefined 校验')
      suggestions.push('使用可选链 (?. ) 访问对象属性')
      suggestions.push('使用空值合并运算符 (??) 提供默认值')
    }

    if (message.includes('not defined')) {
      suggestions.push('检查变量/函数是否已声明')
      suggestions.push('检查导入路径是否正确')
      suggestions.push('检查模块导出是否正确')
    }

    if (message.includes('is not a function')) {
      suggestions.push('检查对象类型是否正确')
      suggestions.push('检查是否正确导入/导出函数')
      suggestions.push('检查 this 上下文是否正确')
    }

    if (message.includes('async')) {
      suggestions.push('确保正确使用 await/async')
      suggestions.push('检查 Promise 是否正确处理')
      suggestions.push('添加 .catch() 处理错误')
    }

    if (frames.length > 10) {
      suggestions.push('错误传播链较长，考虑在中间层级添加错误处理')
    }

    if (!suggestions.length) {
      suggestions.push('查看堆栈中第一个非 Node.js 模块的帧')
      suggestions.push('检查错误发生时的输入参数')
    }

    return suggestions
  }
}

// ============================================
// 源代码上下文获取
// ============================================

/**
 * 获取源代码上下文
 */
export async function getSourceContext(
  filePath: string,
  line: number,
  beforeLines: number = 3,
  afterLines: number = 3
): Promise<SourceContext | null> {
  // 这是一个占位实现，实际需要文件系统访问
  // 在生产环境中，可以从源映射或文件系统读取

  try {
    // 尝试读取文件
    const fs = await import('fs/promises')
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.split('\n')

    const startLine = Math.max(0, line - beforeLines - 1)
    const endLine = Math.min(lines.length, line + afterLines)

    const contextLines = lines.slice(startLine, endLine)
    const highlightOffset = line - startLine - 1

    return {
      before: contextLines.slice(0, highlightOffset),
      line: contextLines[highlightOffset] || '',
      after: contextLines.slice(highlightOffset + 1),
      highlightLine: highlightOffset + 1,
    }
  } catch {
    // 无法读取文件
    return null
  }
}

// ============================================
// 导出
// ============================================

export const stackAnalyzer = new StackAnalyzer()

export default {
  parseStackTrace,
  StackAnalyzer,
  stackAnalyzer,
  getSourceContext,
}