/**
 * 客户端 i18n 测试
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// Mock modules before importing client
const mockInit = vi.fn().mockResolvedValue(undefined);
const mockUse = vi.fn().mockReturnThis();
const mockChangeLanguage = vi.fn().mockResolvedValue(undefined);
const mockOn = vi.fn();

vi.mock('i18next', () => ({
  default: {
    use: mockUse,
    init: mockInit,
    isInitialized: true,
    language: 'zh',
    changeLanguage: mockChangeLanguage,
    on: mockOn,
  },
}));

const mockInitReactI18next = vi.fn();
vi.mock('react-i18next', () => ({
  initReactI18next: mockInitReactI18next,
}));

vi.mock('i18next-browser-languagedetector', () => ({
  default: vi.fn(),
}));

// Import after mocks are set up
let i18n: any;

describe('Client i18n', () => {
  beforeAll(async () => {
    // Import the module which triggers initialization
    const module = await import('../client');
    i18n = module.default;
  });

  afterAll(() => {
    vi.resetModules();
  });

  it('should call initReactI18next.use() during initialization', () => {
    expect(mockUse).toHaveBeenCalledWith(mockInitReactI18next);
  });

  it('should export i18n instance', () => {
    expect(i18n).toBeDefined();
    expect(typeof i18n.changeLanguage).toBe('function');
  });
});
