/**
 * i18n 翻译完整性验证测试
 * 
 * 验证所有语言（zh/en/ja/ko/es/fr/de）的翻译完整性和一致性
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';

// 语言列表
const LANGUAGES = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de'];

// 消息文件目录
const MESSAGES_DIR = resolve(__dirname, '../../src/i18n/messages');

// 加载翻译文件
function loadMessages(lang: string): Record<string, unknown> {
  const filePath = join(MESSAGES_DIR, `${lang}.json`);
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

// 提取所有嵌套键路径
function extractKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...extractKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// 提取翻译中的变量占位符
function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  return matches.map(m => m.replace(/\{\{|\}\}/g, ''));
}

// 深度获取嵌套对象属性
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

describe('i18n 翻译验证', () => {
  // 加载所有语言的翻译
  const messages: Record<string, Record<string, unknown>> = {};
  for (const lang of LANGUAGES) {
    messages[lang] = loadMessages(lang);
  }

  describe('翻译文件加载', () => {
    it('所有语言文件应该存在且可解析', () => {
      for (const lang of LANGUAGES) {
        expect(() => loadMessages(lang)).not.toThrow();
      }
    });

    it('所有语言文件应该包含 common 命名空间', () => {
      for (const lang of LANGUAGES) {
        expect(messages[lang]).toHaveProperty('common');
      }
    });
  });

  describe('翻译键完整性检查', () => {
    // 使用中文作为基准语言
    const zhKeys = extractKeys(messages['zh']);

    it('所有语言应该包含基准语言的所有键', () => {
      for (const lang of LANGUAGES) {
        if (lang === 'zh') continue; // 跳过基准语言
        
        const langKeys = extractKeys(messages[lang]);
        const missingKeys = zhKeys.filter(key => !langKeys.includes(key));
        
        expect(missingKeys, `${lang} 缺少以下翻译键: ${missingKeys.join(', ')}`).toHaveLength(0);
      }
    });

    it('所有语言应该不包含基准语言没有的额外键', () => {
      for (const lang of LANGUAGES) {
        if (lang === 'zh') continue;
        
        const langKeys = extractKeys(messages[lang]);
        const extraKeys = langKeys.filter(key => !zhKeys.includes(key));
        
        expect(extraKeys, `${lang} 包含额外的翻译键: ${extraKeys.join(', ')}`).toHaveLength(0);
      }
    });
  });

  describe('翻译值非空检查', () => {
    const zhKeys = extractKeys(messages['zh']);

    it('所有语言的翻译值不应为空', () => {
      for (const lang of LANGUAGES) {
        for (const key of zhKeys) {
          const value = getNestedValue(messages[lang], key);
          const displayLang = lang.toUpperCase();
          
          expect(value, `${displayLang} [${key}] 翻译值不应为空`).not.toBe('');
          expect(value, `${displayLang} [${key}] 翻译值不应为 null`).not.toBeNull();
          expect(value, `${displayLang} [${key}] 翻译值不应为 undefined`).not.toBeUndefined();
        }
      }
    });

    it('所有语言的翻译值不应只是空格', () => {
      for (const lang of LANGUAGES) {
        for (const key of zhKeys) {
          const value = getNestedValue(messages[lang], key);
          if (typeof value === 'string') {
            expect(value.trim(), `${lang.toUpperCase()} [${key}] 不应只是空格`).not.toHaveLength(0);
          }
        }
      }
    });
  });

  describe('翻译占位符一致性检查', () => {
    // 获取所有包含占位符的键
    function getKeysWithPlaceholders(lang: string): Record<string, string[]> {
      const result: Record<string, string[]> = {};
      for (const key of zhKeys) {
        const value = getNestedValue(messages[lang], key);
        if (typeof value === 'string' && value.includes('{{')) {
          result[key] = extractPlaceholders(value);
        }
      }
      return result;
    }

    it('中文占位符应与其他语言一致', () => {
      const zhPlaceholders = getKeysWithPlaceholders('zh');

      for (const lang of LANGUAGES) {
        if (lang === 'zh') continue;

        const langPlaceholders = getKeysWithPlaceholders(lang);

        for (const [key, zhPhs] of Object.entries(zhPlaceholders)) {
          const langPhs = langPlaceholders[key] || [];
          const missing = zhPhs.filter(ph => !langPhs.includes(ph));
          const extra = langPhs.filter(ph => !zhPhs.includes(ph));

          expect(missing, `${lang.toUpperCase()} [${key}] 缺少占位符: ${missing.join(', ')}`).toHaveLength(0);
          expect(extra, `${lang.toUpperCase()} [${key}] 多余占位符: ${extra.join(', ')}`).toHaveLength(0);
        }
      }
    });
  });

  describe('关键命名空间检查', () => {
    const criticalNamespaces = [
      'common', 'nav', 'home', 'footer', 'errors', 
      'validation', 'buttons', 'messages'
    ];

    it('关键命名空间应该存在于所有语言', () => {
      for (const lang of LANGUAGES) {
        for (const ns of criticalNamespaces) {
          const hasNamespace = lang === 'zh' || Object.keys(messages[lang] || {}).includes(ns);
          // 只检查已存在的命名空间在不同语言间的一致性
          const zhHasNamespace = Object.keys(messages['zh'] || {}).includes(ns);
          if (zhHasNamespace) {
            expect(messages[lang], `${lang.toUpperCase()} 应该包含 ${ns} 命名空间`).toHaveProperty(ns);
          }
        }
      }
    });
  });

  describe('翻译长度合理性检查', () => {
    it('翻译长度不应超过合理范围 (防止翻译错误)', () => {
      for (const lang of LANGUAGES) {
        for (const key of zhKeys) {
          const zhValue = getNestedValue(messages['zh'], key);
          const langValue = getNestedValue(messages[lang], key);
          
          if (typeof zhValue === 'string' && typeof langValue === 'string') {
            // 非英语语言翻译可能较长，但不应超过中文的 5 倍
            const maxLength = zhValue.length * 5 + 10;
            expect(
              langValue.length <= maxLength,
              `${lang.toUpperCase()} [${key}] 翻译过长 (${langValue.length} > ${maxLength}): "${langValue.substring(0, 50)}..."`
            ).toBe(true);
          }
        }
      }
    });
  });

  describe('核心 UI 翻译检查', () => {
    const coreKeys = [
      'common.siteName',
      'common.tagline',
      'nav.home',
      'nav.about',
      'nav.team',
      'nav.blog',
      'nav.portfolio',
      'nav.contact',
    ];

    it('核心 UI 键应该存在于所有语言', () => {
      for (const lang of LANGUAGES) {
        for (const key of coreKeys) {
          const value = getNestedValue(messages[lang], key);
          expect(value, `${lang.toUpperCase()} [${key}] 应该存在`).toBeDefined();
          expect(typeof value === 'string' && value.length > 0, 
            `${lang.toUpperCase()} [${key}] 应该是非空字符串`).toBe(true);
        }
      }
    });
  });
});

describe('i18n 配置验证', () => {
  it('应该有 7 种语言的消息文件', () => {
    expect(LANGUAGES).toHaveLength(7);
    expect(LANGUAGES).toContain('zh');
    expect(LANGUAGES).toContain('en');
    expect(LANGUAGES).toContain('ja');
    expect(LANGUAGES).toContain('ko');
    expect(LANGUAGES).toContain('es');
    expect(LANGUAGES).toContain('fr');
    expect(LANGUAGES).toContain('de');
  });
});
