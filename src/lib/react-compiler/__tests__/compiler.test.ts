/**
 * React Compiler Configuration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getReactCompilerConfig,
  shouldCompile,
  DEFAULT_REACT_COMPILER_CONFIG,
  ReactCompilerConfig,
} from '../config/compiler.config';

describe('React Compiler Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getReactCompilerConfig', () => {
    it('should return disabled config by default', () => {
      delete process.env.ENABLE_REACT_COMPILER;
      const config = getReactCompilerConfig();
      
      expect(config.enabled).toBe(false);
    });

    it('should return enabled config when ENABLE_REACT_COMPILER is true', () => {
      process.env.ENABLE_REACT_COMPILER = 'true';
      const config = getReactCompilerConfig();
      
      expect(config.enabled).toBe(true);
    });

    it('should use opt-out mode by default', () => {
      delete process.env.REACT_COMPILER_MODE;
      const config = getReactCompilerConfig();
      
      expect(config.mode).toBe('opt-out');
    });

    it('should respect REACT_COMPILER_MODE setting', () => {
      process.env.REACT_COMPILER_MODE = 'opt-in';
      const config = getReactCompilerConfig();
      
      expect(config.mode).toBe('opt-in');
    });

    it('should have default exclude patterns', () => {
      const config = getReactCompilerConfig();
      
      expect(config.exclude).toBeDefined();
      expect(config.exclude).toContain('node_modules');
    });
  });

  describe('shouldCompile', () => {
    const config: ReactCompilerConfig = {
      enabled: true,
      mode: 'opt-out',
      exclude: ['node_modules', 'src/components/third-party'],
    };

    it('should return false when compiler is disabled', () => {
      const disabledConfig = { ...config, enabled: false };
      
      expect(shouldCompile('src/components/Test.tsx', disabledConfig)).toBe(false);
    });

    it('should return false for excluded paths', () => {
      expect(shouldCompile('node_modules/react/index.tsx', config)).toBe(false);
      expect(shouldCompile('src/components/third-party/Widget.tsx', config)).toBe(false);
    });

    it('should return true for non-excluded paths in opt-out mode', () => {
      expect(shouldCompile('src/components/Test.tsx', config)).toBe(true);
      expect(shouldCompile('src/lib/utils.ts', config)).toBe(true);
    });

    it('should respect opt-in mode', () => {
      const optInConfig: ReactCompilerConfig = {
        enabled: true,
        mode: 'opt-in',
        include: ['src/components/features'],
        exclude: [],
      };

      expect(shouldCompile('src/components/features/TaskList.tsx', optInConfig)).toBe(true);
      expect(shouldCompile('src/components/other/Test.tsx', optInConfig)).toBe(false);
    });

    it('should handle Windows-style paths', () => {
      expect(shouldCompile('src\\components\\Test.tsx', config)).toBe(true);
      expect(shouldCompile('node_modules\\react\\index.tsx', config)).toBe(false);
    });
  });

  describe('DEFAULT_REACT_COMPILER_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_REACT_COMPILER_CONFIG.enabled).toBe(false);
      expect(DEFAULT_REACT_COMPILER_CONFIG.mode).toBe('opt-out');
      expect(DEFAULT_REACT_COMPILER_CONFIG.options?.strictMode).toBe(true);
    });
  });
});
