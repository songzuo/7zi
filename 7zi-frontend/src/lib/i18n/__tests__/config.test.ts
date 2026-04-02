/**
 * i18n 配置测试
 */

import { describe, it, expect } from 'vitest'
import {
  defaultLanguage,
  supportedLanguages,
  languageNames,
  normalizeLanguage,
  isSupportedLanguage,
  getLanguageDirection,
} from '../config'

describe('i18n Config', () => {
  describe('defaultLanguage', () => {
    it('should have default language as zh', () => {
      expect(defaultLanguage).toBe('zh')
    })
  })

  describe('supportedLanguages', () => {
    it('should support zh and en', () => {
      expect(supportedLanguages).toEqual(['zh', 'en'])
    })

    it('should have exactly 2 supported languages', () => {
      expect(supportedLanguages).toHaveLength(2)
    })
  })

  describe('languageNames', () => {
    it('should have correct language names', () => {
      expect(languageNames.zh).toBe('中文')
      expect(languageNames.en).toBe('English')
    })
  })

  describe('normalizeLanguage', () => {
    it('should normalize zh variants to zh', () => {
      expect(normalizeLanguage('zh-CN')).toBe('zh')
      expect(normalizeLanguage('zh-TW')).toBe('zh')
      expect(normalizeLanguage('zh-HK')).toBe('zh')
      expect(normalizeLanguage('zh')).toBe('zh')
    })

    it('should normalize en variants to en', () => {
      expect(normalizeLanguage('en-US')).toBe('en')
      expect(normalizeLanguage('en-GB')).toBe('en')
      expect(normalizeLanguage('en-AU')).toBe('en')
      expect(normalizeLanguage('en')).toBe('en')
    })

    it('should return default language for unsupported languages', () => {
      expect(normalizeLanguage('fr')).toBe(defaultLanguage)
      expect(normalizeLanguage('de')).toBe(defaultLanguage)
      expect(normalizeLanguage('ja')).toBe(defaultLanguage)
    })
  })

  describe('isSupportedLanguage', () => {
    it('should return true for supported languages', () => {
      expect(isSupportedLanguage('zh')).toBe(true)
      expect(isSupportedLanguage('en')).toBe(true)
    })

    it('should return false for unsupported languages', () => {
      expect(isSupportedLanguage('fr')).toBe(false)
      expect(isSupportedLanguage('de')).toBe(false)
      expect(isSupportedLanguage('zh-CN')).toBe(false)
      expect(isSupportedLanguage('en-US')).toBe(false)
    })
  })

  describe('getLanguageDirection', () => {
    it('should return ltr for zh', () => {
      expect(getLanguageDirection('zh')).toBe('ltr')
    })

    it('should return ltr for en', () => {
      expect(getLanguageDirection('en')).toBe('ltr')
    })
  })
})
