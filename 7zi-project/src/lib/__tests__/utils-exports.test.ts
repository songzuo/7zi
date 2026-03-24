/**
 * Tests for utils.ts re-exports
 * Verifies that all re-exported utilities are available
 */

import { describe, it, expect } from 'vitest';

describe('lib/utils re-exports', () => {
  // Load utils module once at the top level to avoid repeated requires
  let utils: any;
  beforeAll(() => {
    utils = require('../utils');
  });

  describe('ID utilities', () => {
    it('should export generateId', () => {
      expect(typeof utils.generateId).toBe('function');
      const id = utils.generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should export generateUUID', () => {
      expect(typeof utils.generateUUID).toBe('function');
      const uuid = utils.generateUUID();
      expect(typeof uuid).toBe('string');
      expect(uuid).toMatch(/^[0-9a-f-]{36}$/i);
    });
  });

  describe('Async utilities', () => {
    it('should export debounce', () => {
      expect(typeof utils.debounce).toBe('function');
    });

    it('should export throttle', () => {
      expect(typeof utils.throttle).toBe('function');
    });

    it('should export memoize', () => {
      expect(typeof utils.memoize).toBe('function');
    });

    it('should export sleep', () => {
      expect(typeof utils.sleep).toBe('function');
    });

    it('should export retry', () => {
      expect(typeof utils.retry).toBe('function');
    });
  });

  describe('Cache utilities', () => {
    it('should export LRUCache', () => {
      expect(typeof utils.LRUCache).toBe('function');
    });

    it('should export createCache', () => {
      expect(typeof utils.createCache).toBe('function');
    });
  });

  describe('Array utilities', () => {
    it('should export batch', () => {
      expect(typeof utils.batch).toBe('function');
    });

    it('should export shuffle', () => {
      expect(typeof utils.shuffle).toBe('function');
    });

    it('should export randomItem', () => {
      expect(typeof utils.randomItem).toBe('function');
    });

    it('should export unique', () => {
      expect(typeof utils.unique).toBe('function');
    });

    it('should export groupBy', () => {
      expect(typeof utils.groupBy).toBe('function');
    });

    it('should export pick', () => {
      expect(typeof utils.pick).toBe('function');
    });

    it('should export omit', () => {
      expect(typeof utils.omit).toBe('function');
    });
  });

  describe('Math utilities', () => {
    it('should export clamp', () => {
      expect(typeof utils.clamp).toBe('function');
    });

    it('should export mapRange', () => {
      expect(typeof utils.mapRange).toBe('function');
    });

    it('should export lerp', () => {
      expect(typeof utils.lerp).toBe('function');
    });
  });

  describe('Validation utilities', () => {
    it('should export isEmpty', () => {
      expect(typeof utils.isEmpty).toBe('function');
      expect(utils.isEmpty('')).toBe(true);
      expect(utils.isEmpty([])).toBe(true);
      expect(utils.isEmpty(null)).toBe(true);
      expect(utils.isEmpty('test')).toBe(false);
    });

    it('should export isValidEmail', () => {
      expect(typeof utils.isValidEmail).toBe('function');
      expect(utils.isValidEmail('test@example.com')).toBe(true);
      expect(utils.isValidEmail('invalid')).toBe(false);
    });

    it('should export isValidUrl', () => {
      expect(typeof utils.isValidUrl).toBe('function');
      expect(utils.isValidUrl('https://example.com')).toBe(true);
      expect(utils.isValidUrl('invalid-url')).toBe(false);
    });
  });

  describe('Environment detection', () => {
    it('should export isClient', () => {
      expect(typeof utils.isClient).toBe('boolean');
    });

    it('should export isServer', () => {
      expect(typeof utils.isServer).toBe('boolean');
    });

    it('should export isBrowser', () => {
      expect(typeof utils.isBrowser).toBe('boolean');
    });

    it('should export isNode', () => {
      expect(typeof utils.isNode).toBe('boolean');
    });

    it('should export isTouchDevice', () => {
      expect(typeof utils.isTouchDevice).toBe('boolean');
    });

    it('should export getDeviceType', () => {
      expect(typeof utils.getDeviceType).toBe('function');
    });

    it('should export prefersReducedMotion', () => {
      expect(typeof utils.prefersReducedMotion).toBe('boolean');
    });

    it('should export prefersDarkMode', () => {
      expect(typeof utils.prefersDarkMode).toBe('boolean');
    });

    it('should export prefersLightMode', () => {
      expect(typeof utils.prefersLightMode).toBe('boolean');
    });

    it('should export getViewportSize', () => {
      expect(typeof utils.getViewportSize).toBe('function');
    });
  });

  describe('DOM utilities', () => {
    it('should export isInViewport', () => {
      expect(typeof utils.isInViewport).toBe('function');
    });

    it('should export scrollToElement', () => {
      expect(typeof utils.scrollToElement).toBe('function');
    });

    it('should export addEventListener', () => {
      expect(typeof utils.addEventListener).toBe('function');
    });

    it('should export getElementById', () => {
      expect(typeof utils.getElementById).toBe('function');
    });

    it('should export querySelector', () => {
      expect(typeof utils.querySelector).toBe('function');
    });

    it('should export querySelectorAll', () => {
      expect(typeof utils.querySelectorAll).toBe('function');
    });

    it('should export debounceDOM', () => {
      expect(typeof utils.debounceDOM).toBe('function');
    });

    it('should export throttleDOM', () => {
      expect(typeof utils.throttleDOM).toBe('function');
    });

    it('should export observeIntersection', () => {
      expect(typeof utils.observeIntersection).toBe('function');
    });

    it('should export observeResize', () => {
      expect(typeof utils.observeResize).toBe('function');
    });

    it('should export addClassWithDelay', () => {
      expect(typeof utils.addClassWithDelay).toBe('function');
    });

    it('should export toggleClass', () => {
      expect(typeof utils.toggleClass).toBe('function');
    });

    it('should export hasAllClasses', () => {
      expect(typeof utils.hasAllClasses).toBe('function');
    });

    it('should export hasAnyClass', () => {
      expect(typeof utils.hasAnyClass).toBe('function');
    });

    it('should export getComputedStyleValue', () => {
      expect(typeof utils.getComputedStyleValue).toBe('function');
    });
  });

  describe('Browser utilities', () => {
    it('should export copyToClipboard', () => {
      expect(typeof utils.copyToClipboard).toBe('function');
    });

    it('should export readFromClipboard', () => {
      expect(typeof utils.readFromClipboard).toBe('function');
    });

    it('should export downloadFile', () => {
      expect(typeof utils.downloadFile).toBe('function');
    });

    it('should export getQueryParams', () => {
      expect(typeof utils.getQueryParams).toBe('function');
    });

    it('should export updateQueryParams', () => {
      expect(typeof utils.updateQueryParams).toBe('function');
    });
  });

  describe('Performance utilities', () => {
    it('should export optimizeImageUrl', () => {
      expect(typeof utils.optimizeImageUrl).toBe('function');
    });

    it('should export preloadResources', () => {
      expect(typeof utils.preloadResources).toBe('function');
    });

    it('should export lazyLoadComponent', () => {
      expect(typeof utils.lazyLoadComponent).toBe('function');
    });
  });

  describe('UI utilities', () => {
    it('should export cn', () => {
      expect(typeof utils.cn).toBe('function');
    });
  });
});
