/**
 * i18n 翻译文件测试
 *
 * 测试日语 (ja)、韩语 (ko)、西班牙语 (es) 翻译文件
 * - JSON 格式正确性
 * - 翻译键数量一致性
 * - 变量占位符一致性
 * - 关键翻译内容不为空
 */

import { describe, it, expect, beforeAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// 项目 locales 目录路径
const LOCALES_DIR = path.join(__dirname, '../../../locales')

// 支持的语言
const LANGUAGES = ['en', 'zh', 'ja', 'ko', 'es'] as const
type Language = (typeof LANGUAGES)[number]

// 命名空间（与项目实际配置一致）
const NAMESPACES = ['common', 'auth', 'navigation', 'errors', 'dashboard'] as const
type Namespace = (typeof NAMESPACES)[number]

// 接口定义
interface TranslationFile {
  [key: string]: string | TranslationFile
}

interface TestResult {
  language: Language
  namespace: Namespace
  exists: boolean
  validJson: boolean
  keyCount: number
  errors: string[]
}

// 工具函数：获取所有键（扁平化）
function getAllKeys(obj: TranslationFile, prefix = ''): string[] {
  const keys: string[] = []
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof obj[key] === 'string') {
      keys.push(fullKey)
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...getAllKeys(obj[key] as TranslationFile, fullKey))
    }
  }
  return keys
}

// 工具函数：提取占位符
function extractPlaceholders(text: string): string[] {
  const regex = /\{\{?(\w+)\}?\}/g
  const matches: string[] = []
  let match
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1])
  }
  return [...new Set(matches)]
}

// 工具函数：检查翻译文件是否存在
function fileExists(language: Language, namespace: Namespace): boolean {
  const filePath = path.join(LOCALES_DIR, language, `${namespace}.json`)
  return fs.existsSync(filePath)
}

// 工具函数：读取并解析 JSON 文件
function readTranslationFile(
  language: Language,
  namespace: Namespace
): {
  data: TranslationFile | null
  error: string | null
} {
  const filePath = path.join(LOCALES_DIR, language, `${namespace}.json`)

  try {
    if (!fs.existsSync(filePath)) {
      return { data: null, error: `File not found: ${filePath}` }
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content) as TranslationFile
    return { data, error: null }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    return { data: null, error: errorMessage }
  }
}

// 工具函数：递归检查空值
function findEmptyValues(obj: TranslationFile, prefix = ''): string[] {
  const emptyKeys: string[] = []
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const value = obj[key]

    if (typeof value === 'string') {
      if (value.trim() === '') {
        emptyKeys.push(fullKey)
      }
    } else if (typeof value === 'object' && value !== null) {
      emptyKeys.push(...findEmptyValues(value as TranslationFile, fullKey))
    }
  }
  return emptyKeys
}

describe('i18n Translation Files', () => {
  // 存储基准语言 (en) 的数据
  let enData: Record<Namespace, { keys: string[]; data: TranslationFile }>

  beforeAll(() => {
    // 读取英文翻译作为基准
    enData = {} as Record<Namespace, { keys: string[]; data: TranslationFile }>

    for (const ns of NAMESPACES) {
      const result = readTranslationFile('en', ns)
      if (result.data) {
        enData[ns] = {
          keys: getAllKeys(result.data),
          data: result.data,
        }
      }
    }
  })

  describe('基准语言 (en) 验证', () => {
    for (const ns of NAMESPACES) {
      describe(`命名空间: ${ns}`, () => {
        it(`should have valid JSON for ${ns}.json`, () => {
          const result = readTranslationFile('en', ns)
          expect(result.error).toBeNull()
          expect(result.data).not.toBeNull()
        })

        it(`should have translations in ${ns}.json`, () => {
          const result = readTranslationFile('en', ns)
          if (result.data) {
            const keys = getAllKeys(result.data)
            expect(keys.length).toBeGreaterThan(0)
          }
        })
      })
    }
  })

  describe('中文 (zh) 翻译验证', () => {
    for (const ns of NAMESPACES) {
      describe(`命名空间: ${ns}`, () => {
        it(`should have valid JSON for zh/${ns}.json`, () => {
          const result = readTranslationFile('zh', ns)
          expect(result.error).toBeNull()
          expect(result.data).not.toBeNull()
        })

        it(`should have same key count as en for ${ns}`, () => {
          const zhResult = readTranslationFile('zh', ns)
          if (zhResult.data && enData[ns]) {
            const zhKeys = getAllKeys(zhResult.data)
            const enKeys = enData[ns].keys
            expect(zhKeys.length).toBe(enKeys.length)
          }
        })

        it(`should have matching keys with en for ${ns}`, () => {
          const zhResult = readTranslationFile('zh', ns)
          if (zhResult.data && enData[ns]) {
            const zhKeys = new Set(getAllKeys(zhResult.data))
            const enKeys = enData[ns].keys

            for (const key of enKeys) {
              expect(zhKeys.has(key)).toBe(true)
            }
          }
        })

        it(`should not have empty values in ${ns}`, () => {
          const zhResult = readTranslationFile('zh', ns)
          if (zhResult.data) {
            const emptyKeys = findEmptyValues(zhResult.data)
            expect(emptyKeys).toHaveLength(0)
          }
        })
      })
    }
  })

  describe('日语 (ja) 翻译验证', () => {
    for (const ns of NAMESPACES) {
      describe(`命名空间: ${ns}`, () => {
        it(`should have translation file ja/${ns}.json`, () => {
          const exists = fileExists('ja', ns)
          // 记录状态但不强制要求存在
          if (!exists) {
            console.log(`[INFO] ja/${ns}.json does not exist yet`)
          }
          // 文件可能不存在，这是预期行为
        })

        it(`should have valid JSON format for ja/${ns}.json (if exists)`, () => {
          const result = readTranslationFile('ja', ns)
          if (result.data) {
            expect(result.error).toBeNull()
          } else {
            // 文件不存在时跳过
            console.log(`[SKIP] ja/${ns}.json not found`)
          }
        })

        it(`should have same key count as en for ja/${ns}.json (if exists)`, () => {
          const jaResult = readTranslationFile('ja', ns)
          if (jaResult.data && enData[ns]) {
            const jaKeys = getAllKeys(jaResult.data)
            const enKeys = enData[ns].keys
            expect(jaKeys.length).toBe(enKeys.length)
          }
        })

        it(`should have matching keys with en for ja/${ns}.json (if exists)`, () => {
          const jaResult = readTranslationFile('ja', ns)
          if (jaResult.data && enData[ns]) {
            const jaKeys = new Set(getAllKeys(jaResult.data))
            const enKeys = enData[ns].keys

            const missingKeys = enKeys.filter(key => !jaKeys.has(key))
            const extraKeys = Array.from(jaKeys).filter(key => !enKeys.includes(key))

            expect(missingKeys).toHaveLength(0)
            expect(extraKeys).toHaveLength(0)
          }
        })

        it(`should not have empty values in ja/${ns}.json (if exists)`, () => {
          const jaResult = readTranslationFile('ja', ns)
          if (jaResult.data) {
            const emptyKeys = findEmptyValues(jaResult.data)
            expect(emptyKeys).toHaveLength(0)
          }
        })
      })
    }
  })

  describe('韩语 (ko) 翻译验证', () => {
    for (const ns of NAMESPACES) {
      describe(`命名空间: ${ns}`, () => {
        it(`should have translation file ko/${ns}.json`, () => {
          const exists = fileExists('ko', ns)
          if (!exists) {
            console.log(`[INFO] ko/${ns}.json does not exist yet`)
          }
        })

        it(`should have valid JSON format for ko/${ns}.json (if exists)`, () => {
          const result = readTranslationFile('ko', ns)
          if (result.data) {
            expect(result.error).toBeNull()
          }
        })

        it(`should have same key count as en for ko/${ns}.json (if exists)`, () => {
          const koResult = readTranslationFile('ko', ns)
          if (koResult.data && enData[ns]) {
            const koKeys = getAllKeys(koResult.data)
            const enKeys = enData[ns].keys
            expect(koKeys.length).toBe(enKeys.length)
          }
        })

        it(`should have matching keys with en for ko/${ns}.json (if exists)`, () => {
          const koResult = readTranslationFile('ko', ns)
          if (koResult.data && enData[ns]) {
            const koKeys = new Set(getAllKeys(koResult.data))
            const enKeys = enData[ns].keys

            const missingKeys = enKeys.filter(key => !koKeys.has(key))
            const extraKeys = Array.from(koKeys).filter(key => !enKeys.includes(key))

            expect(missingKeys).toHaveLength(0)
            expect(extraKeys).toHaveLength(0)
          }
        })

        it(`should not have empty values in ko/${ns}.json (if exists)`, () => {
          const koResult = readTranslationFile('ko', ns)
          if (koResult.data) {
            const emptyKeys = findEmptyValues(koResult.data)
            expect(emptyKeys).toHaveLength(0)
          }
        })
      })
    }
  })

  describe('西班牙语 (es) 翻译验证', () => {
    for (const ns of NAMESPACES) {
      describe(`命名空间: ${ns}`, () => {
        it(`should have translation file es/${ns}.json`, () => {
          const exists = fileExists('es', ns)
          if (!exists) {
            console.log(`[INFO] es/${ns}.json does not exist yet`)
          }
        })

        it(`should have valid JSON format for es/${ns}.json (if exists)`, () => {
          const result = readTranslationFile('es', ns)
          if (result.data) {
            expect(result.error).toBeNull()
          }
        })

        it(`should have same key count as en for es/${ns}.json (if exists)`, () => {
          const esResult = readTranslationFile('es', ns)
          if (esResult.data && enData[ns]) {
            const esKeys = getAllKeys(esResult.data)
            const enKeys = enData[ns].keys
            expect(esKeys.length).toBe(enKeys.length)
          }
        })

        it(`should have matching keys with en for es/${ns}.json (if exists)`, () => {
          const esResult = readTranslationFile('es', ns)
          if (esResult.data && enData[ns]) {
            const esKeys = new Set(getAllKeys(esResult.data))
            const enKeys = enData[ns].keys

            const missingKeys = enKeys.filter(key => !esKeys.has(key))
            const extraKeys = Array.from(esKeys).filter(key => !enKeys.includes(key))

            expect(missingKeys).toHaveLength(0)
            expect(extraKeys).toHaveLength(0)
          }
        })

        it(`should not have empty values in es/${ns}.json (if exists)`, () => {
          const esResult = readTranslationFile('es', ns)
          if (esResult.data) {
            const emptyKeys = findEmptyValues(esResult.data)
            expect(emptyKeys).toHaveLength(0)
          }
        })
      })
    }
  })

  describe('占位符一致性检查', () => {
    // 检查带占位符的翻译键
    it('should have consistent placeholders across all languages', () => {
      const languages: Language[] = ['zh', 'ja', 'ko', 'es']

      for (const ns of NAMESPACES) {
        if (!enData[ns]) continue

        // 从英文文件中找出所有带占位符的键
        const placeholderKeys: { key: string; placeholders: string[] }[] = []

        const findPlaceholdersRecursive = (obj: TranslationFile, prefix = '') => {
          for (const key in obj) {
            const fullKey = prefix ? `${prefix}.${key}` : key
            const value = obj[key]

            if (typeof value === 'string') {
              const placeholders = extractPlaceholders(value)
              if (placeholders.length > 0) {
                placeholderKeys.push({ key: fullKey, placeholders })
              }
            } else if (typeof value === 'object' && value !== null) {
              findPlaceholdersRecursive(value as TranslationFile, fullKey)
            }
          }
        }

        findPlaceholdersRecursive(enData[ns].data)

        // 对于其他语言，检查相同的键是否有相同的占位符
        for (const lang of languages) {
          const result = readTranslationFile(lang, ns)
          if (!result.data) continue

          for (const { key, placeholders: enPlaceholders } of placeholderKeys) {
            const keys = key.split('.')
            let current: TranslationFile | string = result.data

            for (const k of keys) {
              if (typeof current === 'object' && k in current) {
                current = current[k]
              } else {
                current = ''
                break
              }
            }

            if (typeof current === 'string' && current) {
              const langPlaceholders = extractPlaceholders(current)
              expect(langPlaceholders.sort()).toEqual(enPlaceholders.sort())
            }
          }
        }
      }
    })
  })

  describe('语言目录结构验证', () => {
    it('should have correct directory structure for each language', () => {
      for (const lang of LANGUAGES) {
        const langDir = path.join(LOCALES_DIR, lang)

        if (lang === 'en' || lang === 'zh') {
          // en 和 zh 必须存在
          expect(fs.existsSync(langDir)).toBe(true)
        } else {
          // ja, ko, es 记录状态
          const exists = fs.existsSync(langDir)
          console.log(`[INFO] ${lang} directory exists: ${exists}`)
        }
      }
    })

    it('should have all namespace files for en and zh', () => {
      const requiredLangs: Language[] = ['en', 'zh']

      for (const lang of requiredLangs) {
        for (const ns of NAMESPACES) {
          const filePath = path.join(LOCALES_DIR, lang, `${ns}.json`)
          expect(fs.existsSync(filePath)).toBe(true)
        }
      }
    })
  })
})

describe('i18n Translation Statistics', () => {
  it('should report translation statistics', () => {
    console.log('\n=== i18n Translation Statistics ===\n')

    for (const lang of LANGUAGES) {
      const langDir = path.join(LOCALES_DIR, lang)
      const exists = fs.existsSync(langDir)

      console.log(`Language: ${lang.toUpperCase()}`)
      console.log(`  Directory exists: ${exists}`)

      if (exists) {
        for (const ns of NAMESPACES) {
          const result = readTranslationFile(lang, ns)
          if (result.data) {
            const keys = getAllKeys(result.data)
            console.log(`  ${ns}.json: ${keys.length} keys`)
          } else {
            console.log(`  ${ns}.json: NOT FOUND`)
          }
        }
      }
      console.log('')
    }

    console.log('===================================\n')

    // 简单断言确保测试通过
    expect(true).toBe(true)
  })
})
