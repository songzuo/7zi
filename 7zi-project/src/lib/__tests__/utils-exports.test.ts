/**
 * Tests for utils.ts re-exports
 * Verifies that all re-exported utilities are available
 */

import { describe, it, expect } from 'vitest';

describe('lib/utils re-exports', () => {
  describe('ID utilities', () => {
    it('should export generateId', () => {
      const { generateId } = require('../utils');
      expect(typeof generateId).toBe('function');
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should export generateUUID', () => {
      const { generateUUID } = require('../utils');
      expect(typeof generateUUID).toBe('function');
      const uuid = generateUUID();
      expect(typeof uuid).toBe('string');
      expect(uuid).toMatch(/^[0-9a-f-]{36}$/i);
    });
  });

  describe('Async utilities', () => {
    it('should export debounce', () => {
      const { debounce } = require('../utils');
      expect(typeof debounce).toBe('function');
    });

    it('should export throttle', () => {
      const { throttle } = require('../utils');
      expect(typeof throttle).toBe('function');
    });

    it('should export memoize', () => {
      const { memoize } = require('../utils');
      expect(typeof memoize).toBe('function');
    });

    it('should export sleep', () => {
      const { sleep } = require('../utils');
      expect(typeof sleep).toBe('function');
    });

    it('should export retry', () => {
      const { retry } = require('../utils');
      expect(typeof retry).toBe('function');
    });
  });

  describe('Cache utilities', () => {
    it('should export LRUCache', () => {
      const { LRUCache } = require('../utils');
      expect(typeof LRUCache).toBe('function');
    });

    it('should export createCache', () => {
      const { createCache } = require('../utils');
      expect(typeof createCache).toBe('function');
    });
  });

  describe('Array utilities', () => {
    it('should export batch', () => {
      const { batch } = require('../utils');
      expect(typeof batch).toBe('function');
    });

    it('should export shuffle', () => {
      const { shuffle } = require('../utils');
      expect(typeof shuffle).toBe('function');
    });

    it('should export randomItem', () => {
      const { randomItem } = require('../utils');
      expect(typeof randomItem).toBe('function');
    });

    it('should export unique', () => {
      const { unique } = require('../utils');
      expect(typeof unique).toBe('function');
    });

    it('should export groupBy', () => {
      const { groupBy } = require('../utils');
      expect(typeof groupBy).toBe('function');
    });

    it('should export pick', () => {
      const { pick } = require('../utils');
      expect(typeof pick).toBe('function');
    });

    it('should export omit', () => {
      const { omit } = require('../utils');
      expect(typeof omit).toBe('function');
    });
  });

  describe('Math utilities', () => {
    it('should export clamp', () => {
      const { clamp } = require('../utils');
      expect(typeof clamp).toBe('function');
    });

    it('should export mapRange', () => {
      const { mapRange } = require('../utils');
      expect(typeof mapRange).toBe('function');
    });

    it('should export lerp', () => {
      const { lerp } = require('../utils');
      expect(typeof lerp).toBe('function');
    });
  });

  describe('Validation utilities', () => {
    it('should export isEmpty', () => {
      const { isEmpty } = require('../utils');
      expect(typeof isEmpty).toBe('function');
      expect(isEmpty('')).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty('test')).toBe(false);
    });

    it('should export isValidEmail', () => {
      const { isValidEmail } = require('../utils');
      expect(typeof isValidEmail).toBe('function');
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid')).toBe(false);
    });

    it('should export isValidUrl', () => {
      const { isValidUrl } = require('../utils');
      expect(typeof isValidUrl).toBe('function');
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('invalid-url')).toBe(false);
    });
  });

  describe('Environment detection', () => {
    it('should export isClient', () => {
      const { isClient } = require('../utils');
      expect(typeof isClient).toBe('boolean');
    });

    it('should export isServer', () => {
      const { isServer } = require('../utils');
      expect(typeof isServer).toBe('boolean');
    });

    it('should export isBrowser', () => {
      const { isBrowser } = require('../utils');
      expect(typeof isBrowser).toBe('boolean');
    });

    it('should export isNode', () => {
      const { isNode } = require('../utils');
      expect(typeof isNode).toBe('boolean');
    });

    it('should export isTouchDevice', () => {
      const { isTouchDevice } = require('../utils');
      expect(typeof isTouchDevice).toBe('boolean');
    });

    it('should export getDeviceType', () => {
      const { getDeviceType } = require('../utils');
      expect(typeof getDeviceType).toBe('function');
    });

    it('should export prefersReducedMotion', () => {
      const { prefersReducedMotion } = require('../utils');
      expect(typeof prefersReducedMotion).toBe('boolean');
    });

    it('should export prefersDarkMode', () => {
      const { prefersDarkMode } = require('../utils');
      expect(typeof prefersDarkMode).toBe('boolean');
    });

    it('should export prefersLightMode', () => {
      const { prefersLightMode } = require('../utils');
      expect(typeof prefersLightMode).toBe('boolean');
    });

    it('should export getViewportSize', () => {
      const { getViewportSize } = require('../utils');
      expect(typeof getViewportSize).toBe('function');
    });
  });

  describe('DOM utilities', () => {
    it('should export isInViewport', () => {
      const { isInViewport } = require('../utils');
      expect(typeof isInViewport).toBe('function');
    });

    it('should export scrollToElement', () => {
      const { scrollToElement } = require('../utils');
      expect(typeof scrollToElement).toBe('function');
    });

    it('should export addEventListener', () => {
      const { addEventListener } = require('../utils');
      expect(typeof addEventListener).toBe('function');
    });

    it('should export getElementById', () => {
      const { getElementById } = require('../utils');
      expect(typeof getElementById).toBe('function');
    });

    it('should export querySelector', () => {
      const { querySelector } = require('../utils');
      expect(typeof querySelector).toBe('function');
    });

    it('should export querySelectorAll', () => {
      const { querySelectorAll } = require('../utils');
      expect(typeof querySelectorAll).toBe('function');
    });

    it('should export debounceDOM', () => {
      const { debounceDOM } = require('../utils');
      expect(typeof debounceDOM).toBe('function');
    });

    it('should export throttleDOM', () => {
      const { throttleDOM } = require('../utils');
      expect(typeof throttleDOM).toBe('function');
    });

    it('should export observeIntersection', () => {
      const { observeIntersection } = require('../utils');
      expect(typeof observeIntersection).toBe('function');
    });

    it('should export observeResize', () => {
      const { observeResize } = require('../utils');
      expect(typeof observeResize).toBe('function');
    });

    it('should export addClassWithDelay', () => {
      const { addClassWithDelay } = require('../utils');
      expect(typeof addClassWithDelay).toBe('function');
    });

    it('should export toggleClass', () => {
      const { toggleClass } = require('../utils');
      expect(typeof toggleClass).toBe('function');
    });

    it('should export hasAllClasses', () => {
      const { hasAllClasses } = require('../utils');
      expect(typeof hasAllClasses).toBe('function');
    });

    it('should export hasAnyClass', () => {
      const { hasAnyClass } = require('../utils');
      expect(typeof hasAnyClass).toBe('function');
    });

    it('should export getComputedStyleValue', () => {
      const { getComputedStyleValue } = require('../utils');
      expect(typeof getComputedStyleValue).toBe('function');
    });
  });

  describe('Browser utilities', () => {
    it('should export copyToClipboard', () => {
      const { copyToClipboard } = require('../utils');
      expect(typeof copyToClipboard).toBe('function');
    });

    it('should export readFromClipboard', () => {
      const { readFromClipboard } = require('../utils');
      expect(typeof readFromClipboard).toBe('function');
    });

    it('should export downloadFile', () => {
      const { downloadFile } = require('../utils');
      expect(typeof downloadFile).toBe('function');
    });

    it('should export getQueryParams', () => {
      const { getQueryParams } = require('../utils');
      expect(typeof getQueryParams).toBe('function');
    });

    it('should export updateQueryParams', () => {
      const { updateQueryParams } = require('../utils');
      expect(typeof updateQueryParams).toBe('function');
    });
  });

  describe('Performance utilities', () => {
    it('should export optimizeImageUrl', () => {
      const { optimizeImageUrl } = require('../utils');
      expect(typeof optimizeImageUrl).toBe('function');
    });

    it('should export preloadResources', () => {
      const { preloadResources } = require('../utils');
      expect(typeof preloadResources).toBe('function');
    });

    it('should export lazyLoadComponent', () => {
      const { lazyLoadComponent } = require('../utils');
      expect(typeof lazyLoadComponent).toBe('function');
    });
  });

  describe('UI utilities', () => {
    it('should export cn', () => {
      const { cn } = require('../utils');
      expect(typeof cn).toBe('function');
    });
  });
});
