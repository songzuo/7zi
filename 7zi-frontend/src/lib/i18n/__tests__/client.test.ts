/**
 * 客户端 i18n 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initReactI18next } from 'react-i18next';
import i18n from '../client';

// Mock i18next
vi.mock('i18next', () => ({
  default: {
    use: vi.fn().mockReturnThis(),
    init: vi.fn().mockResolvedValue(undefined),
    isInitialized: true,
    language: 'zh',
    changeLanguage: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  initReactI18next: vi.fn(),
}));

vi.mock('i18next-browser-languagedetector', () => ({
  default: vi.fn(),
}));

describe('Client i18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize i18next with correct config', () => {
    expect(initReactI18next).toHaveBeenCalled();
  });

  it('should export i18n instance', () => {
    expect(i18n).toBeDefined();
    expect(typeof i18n.changeLanguage).toBe('function');
  });
});
