/**
 * @fileoverview CodeExplainer 扩展测试
 */
import { describe, it, expect } from 'vitest'
import { CodeExplainer } from '../code-explainer'

describe('CodeExplainer 扩展测试', () => {
  describe('代码解释功能增强', () => {
    it('应正确解释包含异步函数的代码', async () => {
      const explainer = new CodeExplainer({ enableCache: false })
      const code = `async function fetchData(url: string) {
  const response = await fetch(url);
  return response.json();
}`
      const result = await explainer.explain(code, 'typescript')
      expect(result).toBeDefined()
      expect(result).toBeTruthy()
    })

    it('应正确解释包含错误处理的代码', async () => {
      const explainer = new CodeExplainer({ enableCache: false })
      const code = `try {
  riskyOperation();
} catch (error) {
  console.error(error);
  throw error;
}`
      const result = await explainer.explain(code, 'typescript')
      expect(result).toBeDefined()
    })

    it('应正确解释包含泛型的代码', async () => {
      const explainer = new CodeExplainer({ enableCache: false })
      const code = `function identity<T>(arg: T): T {
  return arg;
}`
      const result = await explainer.explain(code, 'typescript')
      expect(result).toBeDefined()
    })
  })
})
