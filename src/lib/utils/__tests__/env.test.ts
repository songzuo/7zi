/**
 * @fileoverview Tests for environment detection utilities
 */

import { describe, it, expect, vi } from 'vitest';
import {
  isClient,
  isServer,
  isBrowser,
  isNode,
  prefersReducedMotion,
  prefersDarkMode,
  prefersLightMode,
  isTouchDevice,
  getDeviceType,
  getViewportSize,
} from '../env';

// Note: These tests are basic smoke tests since we can't easily mock window/process in Vitest

describe('env', () => {
  describe('isClient', () => {
    it('should return a boolean', () => {
      expect(typeof isClient()).toBe('boolean');
    });
  });

  describe('isServer', () => {
    it('should return the opposite of isClient', () => {
      expect(isServer()).toBe(!isClient());
    });
  });

  describe('isBrowser', () => {
    it('should return a boolean', () => {
      expect(typeof isBrowser()).toBe('boolean');
    });
  });

  describe('isNode', () => {
    it('should return a boolean', () => {
      expect(typeof isNode()).toBe('boolean');
    });
  });

  describe('prefersReducedMotion', () => {
    it('should return a boolean', () => {
      expect(typeof prefersReducedMotion()).toBe('boolean');
    });

    it('should return false in non-browser environment', () => {
      // In Node.js, there's no matchMedia
      expect(prefersReducedMotion()).toBe(false);
    });
  });

  describe('prefersDarkMode', () => {
    it('should return a boolean', () => {
      expect(typeof prefersDarkMode()).toBe('boolean');
    });

    it('should return false in non-browser environment', () => {
      expect(prefersDarkMode()).toBe(false);
    });
  });

  describe('prefersLightMode', () => {
    it('should return a boolean', () => {
      expect(typeof prefersLightMode()).toBe('boolean');
    });

    it('should return false in non-browser environment', () => {
      expect(prefersLightMode()).toBe(false);
    });
  });

  describe('isTouchDevice', () => {
    it('should return a boolean', () => {
      expect(typeof isTouchDevice()).toBe('boolean');
    });
  });

  describe('getDeviceType', () => {
    it('should return one of the valid device types', () => {
      const result = getDeviceType();
      expect(['desktop', 'tablet', 'mobile']).toContain(result);
    });
  });

  describe('getViewportSize', () => {
    it('should return an object with width and height', () => {
      const size = getViewportSize();
      expect(typeof size.width).toBe('number');
      expect(typeof size.height).toBe('number');
    });

    it('should return an object with width and height properties', () => {
      const size = getViewportSize();
      expect(typeof size.width).toBe('number');
      expect(typeof size.height).toBe('number');
    });
  });
});
