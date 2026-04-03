/**
 * @fileoverview 修复建议生成器单元测试
 * @description 为 v1.12.0 AI 代码智能系统编写单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FixSuggester, fixSuggester } from '@/lib/ai/code/fix-suggester'
import type { SupportedLanguage } from '@/lib/ai/code/types'

describe('FixSuggester', () => {
  let suggester: FixSuggester

  beforeEach(() => {
    suggester = new FixSuggester({ enableCache: false })
  })

  describe('should suggest null reference fixes', () => {
    it('should suggest optional chaining for null reference', async () => {
      const code = `
const user = getUser();
const name = user.name;
      `
      const issues = [
        {
          type: 'null_reference',
          message: 'Potential null reference',
          location: {
            start: { line: 3, column: 1 },
            end: { line: 3, column: 20 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
      expect(fixes[0]).toHaveProperty('description')
      expect(fixes[0]).toHaveProperty('changes')
    })
  })

  describe('should suggest strict equality fixes', () => {
    it('should suggest strict equality', async () => {
      const code = `
if (x == null) {
  // ...
}
      `
      const issues = [
        {
          type: 'type_mismatch',
          message: 'Use strict equality',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 2, column: 15 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
      const strictEq = fixes.find(f => f.description.includes('strict equality'))
      expect(strictEq).toBeDefined()
      expect(strictEq?.changes[0].newCode).toContain('===')
    })
  })

  describe('should suggest async/await fixes', () => {
    it('should suggest adding await', async () => {
      const code = `
async function getData() {
  const result = fetchData();
  return result;
}
      `
      const issues = [
        {
          type: 'async_error',
          message: 'Missing await',
          location: {
            start: { line: 3, column: 3 },
            end: { line: 3, column: 28 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
      const awaitFix = fixes.find(f => f.description.toLowerCase().includes('await'))
      expect(awaitFix).toBeDefined()
      expect(awaitFix?.changes[0].newCode).toContain('await')
    })
  })

  describe('should suggest error handling fixes', () => {
    it('should suggest try-catch wrapper', async () => {
      const code = `
const data = JSON.parse(input);
      `
      const issues = [
        {
          type: 'unhandled_exception',
          message: 'Unhandled exception',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 2, column: 30 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
      const tryCatchFix = fixes.find(f => f.description.includes('try-catch'))
      expect(tryCatchFix).toBeDefined()
      expect(tryCatchFix?.changes[0].newCode).toContain('try')
      expect(tryCatchFix?.changes[0].newCode).toContain('catch')
    })
  })

  describe('should suggest cleanup fixes', () => {
    it('should suggest cleanup for event listener', async () => {
      const code = `
element.addEventListener('click', handleClick);
      `
      const issues = [
        {
          type: 'event_listener_leak',
          message: 'Event listener leak',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 2, column: 45 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
      const cleanupFix = fixes.find(f => f.description.includes('cleanup'))
      expect(cleanupFix).toBeDefined()
      expect(cleanupFix?.changes[0].newCode).toContain('removeEventListener')
    })

    it('should suggest cleanup for interval', async () => {
      const code = `
setInterval(() => {
  console.log('tick');
}, 1000);
      `
      const issues = [
        {
          type: 'interval_leak',
          message: 'Interval leak',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 4, column: 9 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
    })
  })

  describe('should suggest loop fixes', () => {
    it('should suggest adding break condition', async () => {
      const code = `
while (true) {
  processData();
}
      `
      const issues = [
        {
          type: 'infinite_loop',
          message: 'Infinite loop',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 4, column: 2 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
    })
  })

  describe('should generate proper fix structure', () => {
    it('should return proper FixSuggestion structure', async () => {
      const code = 'const x = eval("1");'
      const issues = [
        {
          type: 'null_reference',
          message: 'Potential issue',
          location: {
            start: { line: 1, column: 1 },
            end: { line: 1, column: 22 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
      const fix = fixes[0]

      expect(fix).toHaveProperty('id')
      expect(fix).toHaveProperty('description')
      expect(fix).toHaveProperty('changes')
      expect(fix).toHaveProperty('riskLevel')
      expect(fix).toHaveProperty('estimatedSuccessRate')
      expect(fix).toHaveProperty('explanation')

      expect(fix.changes.length).toBeGreaterThan(0)
      expect(fix.changes[0]).toHaveProperty('oldCode')
      expect(fix.changes[0]).toHaveProperty('newCode')
      expect(fix.changes[0]).toHaveProperty('reason')
    })

    it('should sort by risk and success rate', async () => {
      const code = 'const x = 1;'
      const issues = [
        {
          type: 'null_reference',
          message: 'Issue 1',
          location: { start: { line: 1, column: 1 }, end: { line: 1, column: 12 } },
        },
        {
          type: 'infinite_loop',
          message: 'Issue 2',
          location: { start: { line: 1, column: 1 }, end: { line: 1, column: 12 } },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      const riskOrder = { safe: 0, moderate: 1, risky: 2 }

      for (let i = 1; i < fixes.length; i++) {
        const prev = fixes[i - 1]
        const curr = fixes[i]

        if (riskOrder[prev.riskLevel] !== riskOrder[curr.riskLevel]) {
          expect(riskOrder[prev.riskLevel]).toBeLessThanOrEqual(riskOrder[curr.riskLevel])
        } else {
          expect(prev.estimatedSuccessRate).toBeGreaterThanOrEqual(curr.estimatedSuccessRate)
        }
      }
    })
  })

  describe('should handle generic issues', () => {
    it('should generate generic suggestion for unknown issue types', async () => {
      const code = 'const x = 1;'
      const issues = [
        {
          type: 'unknown_issue_type',
          message: 'Unknown issue',
          location: {
            start: { line: 1, column: 1 },
            end: { line: 1, column: 12 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
      const genericFix = fixes.find(f => f.id.includes('generic'))
      expect(genericFix).toBeDefined()
      expect(genericFix?.explanation).toContain('unknown_issue_type')
    })
  })

  describe('should generate diffs', () => {
    it('should generate unified diff', () => {
      const originalCode = 'const x = 1;'
      const changes = [
        {
          filePath: 'test.ts',
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 12 } },
          oldCode: 'const x = 1;',
          newCode: 'const x: number = 1;',
          reason: 'Add type annotation',
        },
      ]

      const diff = suggester.generateDiff('test.ts', originalCode, changes)

      expect(diff).toHaveProperty('filePath')
      expect(diff).toHaveProperty('diff')
      expect(diff).toHaveProperty('stats')

      expect(diff.diff).toContain('---')
      expect(diff.diff).toContain('+++')
      expect(diff.stats.additions).toBeGreaterThan(0)
    })

    it('should calculate diff stats correctly', () => {
      const originalCode = 'const x = 1;'
      const changes = [
        {
          filePath: 'test.ts',
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 12 } },
          oldCode: 'const x = 1;',
          newCode: 'const x = 2;',
          reason: 'Change value',
        },
      ]

      const diff = suggester.generateDiff('test.ts', originalCode, changes)

      expect(diff.stats.deletions).toBeGreaterThan(0)
      expect(diff.stats.additions).toBeGreaterThan(0)
    })
  })

  describe('should handle edge cases', () => {
    it('should handle empty issues', async () => {
      const fixes = await suggester.suggest('const x = 1;', [], 'typescript')

      expect(fixes).toEqual([])
    })

    it('should handle code with special characters', async () => {
      const code = 'const str = "Hello\\nWorld";'
      const issues = [
        {
          type: 'null_reference',
          message: 'Issue',
          location: { start: { line: 1, column: 1 }, end: { line: 1, column: 28 } },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(Array.isArray(fixes)).toBe(true)
    })

    it('should handle multiple issues', async () => {
      const code = `
const user = getUser();
const name = user.name;
console.log(name);
      `
      const issues = [
        {
          type: 'null_reference',
          message: 'Issue 1',
          location: { start: { line: 2, column: 1 }, end: { line: 2, column: 24 } },
        },
        {
          type: 'null_reference',
          message: 'Issue 2',
          location: { start: { line: 3, column: 1 }, end: { line: 3, column: 20 } },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
    })
  })

  describe('multi-language support', () => {
    const testCases: Array<{ language: SupportedLanguage; issueType: string }> = [
      { language: 'typescript', issueType: 'null_reference' },
      { language: 'javascript', issueType: 'null_reference' },
      { language: 'python', issueType: 'python_mutable_default' },
      { language: 'go', issueType: 'go_goroutine_loop' },
      { language: 'rust', issueType: 'rust_unwrap' },
    ]

    testCases.forEach(({ language, issueType }) => {
      it(`should generate suggestions for ${language}`, async () => {
        const code = 'const x = 1;'
        const issues = [
          {
            type: issueType,
            message: 'Issue',
            location: { start: { line: 1, column: 1 }, end: { line: 1, column: 12 } },
          },
        ]

        const fixes = await suggester.suggest(code, issues, language)

        expect(Array.isArray(fixes)).toBe(true)
      })
    })
  })

  describe('performance', () => {
    it('should handle many issues efficiently', async () => {
      const code = 'const x = 1;'
      const issues = []
      for (let i = 0; i < 100; i++) {
        issues.push({
          type: 'null_reference',
          message: `Issue ${i}`,
          location: { start: { line: 1, column: 1 }, end: { line: 1, column: 12 } },
        })
      }

      const start = Date.now()
      const fixes = await suggester.suggest(code, issues, 'typescript')
      const duration = Date.now() - start

      expect(duration).toBeLessThan(1000)
      expect(Array.isArray(fixes)).toBe(true)
    })
  })

  describe('caching', () => {
    it('should cache results when enabled', async () => {
      const cachedSuggester = new FixSuggester({ enableCache: true })
      const code = 'const x = 1;'
      const issues = [
        {
          type: 'null_reference',
          message: 'Issue',
          location: { start: { line: 1, column: 1 }, end: { line: 1, column: 12 } },
        },
      ]

      const result1 = await cachedSuggester.suggest(code, issues, 'typescript')
      const result2 = await cachedSuggester.suggest(code, issues, 'typescript')

      expect(result1).toEqual(result2)
    })
  })

  describe('default instance', () => {
    it('should export default suggester', () => {
      expect(fixSuggester).toBeDefined()
      expect(fixSuggester).toBeInstanceOf(FixSuggester)
    })
  })
})
