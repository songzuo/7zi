/**
 * @fileoverview 健康检查测试 - 验证代码分析器在边界情况下的行为
 */
import { describe, it, expect } from 'vitest'
import { CodeAnalyzer } from '../code-analyzer'

describe('CodeAnalyzer 健康检查', () => {
  describe('边界情况处理', () => {
    it('应正确处理空字符串', async () => {
      const analyzer = new CodeAnalyzer({ enableCache: false })
      const result = await analyzer.analyze('', 'typescript')
      expect(result.stats.linesOfCode).toBe(0)
    })

    it('应正确处理仅包含注释的代码', async () => {
      const analyzer = new CodeAnalyzer({ enableCache: false })
      const code = `// This is a comment
        /* Block comment */
        /// <reference path="test.ts" />`
      const result = await analyzer.analyze(code, 'typescript')
      // 仅包含注释的代码，linesOfCode 应该为 0（因为注释被移除后没有实际代码）
      expect(result.stats.linesOfCode).toBe(0)
      expect(result.stats.commentLines).toBeGreaterThan(0)
    })

    it('应正确处理大量空行的代码', async () => {
      const analyzer = new CodeAnalyzer({ enableCache: false })
      const code = `function test() {}


      function test2() {}`
      const result = await analyzer.analyze(code, 'typescript')
      expect(result.complexity.cyclomatic).toBeGreaterThan(0)
    })
  })
})
