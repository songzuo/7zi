/**
 * Tests for browser utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isBrowser,
  isServer,
  isMobile,
  isTouch,
  isIOS,
  isAndroid,
  isSafari,
  isChrome,
  isFirefox,
  isEdge,
  getUserAgent,
  canUseDOM,
  getViewportSize,
  getScrollPosition,
  scrollTo,
  copyToClipboard,
  downloadFile,
  openLink,
  print,
  fullscreen,
  exitFullscreen,
  isFullscreen,
  registerFullscreenChange,
} from '../browser';

// Spy on window and document
describe('browser utilities', () => {
  let originalUserAgent: string | undefined;
  let originalMaxTouchPoints: number | undefined;
  let originalPlatform: string | undefined;
  let originalClientWidth: number | undefined;
  let originalClientHeight: number | undefined;
  let originalScrollX: number | undefined;
  let originalScrollY: number | undefined;
  let originalFullscreenElement: any;
  let originalRequestFullscreen: any;
  let originalExitFullscreen: any;

  beforeEach(() => {
    // Store original values
    if (typeof window !== 'undefined') {
      originalUserAgent = window.navigator.userAgent;
      originalMaxTouchPoints = window.navigator.maxTouchPoints;
      originalPlatform = window.navigator.platform;
      originalClientWidth = window.documentElement?.clientWidth;
      originalClientHeight = window.documentElement?.clientHeight;
      originalScrollX = window.scrollX;
      originalScrollY = window.scrollY;
      originalFullscreenElement = window.document?.fullscreenElement;
      originalRequestFullscreen = window.document?.documentElement?.requestFullscreen;
      originalExitFullscreen = window.document?.exitFullscreen;
    }

    // Mock window properties
    Object.defineProperty(global, 'window', {
      value: {
        navigator: {
          userAgent: '',
          maxTouchPoints: 0,
          platform: '',
        },
        document: {
          documentElement: {
            clientWidth: 1024,
            clientHeight: 768,
            requestFullscreen: vi.fn(),
          },
          fullscreenElement: null,
          exitFullscreen: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
        innerWidth: 1024,
        innerHeight: 768,
        scrollX: 0,
        scrollY: 0,
        scrollTo: vi.fn(),
        screen: {
          width: 1920,
          height: 1080,
        },
        open: vi.fn(),
        print: vi.fn(),
        URL: {
          createObjectURL: vi.fn(() => 'blob:mock-url'),
          revokeObjectURL: vi.fn(),
        },
        location: {
          href: 'https://example.com',
        },
      },
      writable: true,
    });

    Object.defineProperty(global, 'document', {
      value: {
        documentElement: {
          clientWidth: 1024,
          clientHeight: 768,
          requestFullscreen: vi.fn(),
        },
        fullscreenElement: null,
        exitFullscreen: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        createElement: vi.fn(() => ({
          href: '',
          download: '',
          click: vi.fn(),
          style: {},
        })),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      },
      writable: true,
    });

    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: '',
        maxTouchPoints: 0,
        platform: '',
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      },
      writable: true,
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original values
    if (typeof originalUserAgent !== 'undefined' && typeof window !== 'undefined') {
      window.navigator.userAgent = originalUserAgent;
      window.navigator.maxTouchPoints = originalMaxTouchPoints || 0;
      window.navigator.platform = originalPlatform || '';
      if (window.documentElement) {
        window.documentElement.clientWidth = originalClientWidth || 1024;
        window.documentElement.clientHeight = originalClientHeight || 768;
      }
      window.scrollX = originalScrollX || 0;
      window.scrollY = originalScrollY || 0;
      if (window.document) {
        window.document.fullscreenElement = originalFullscreenElement;
        if (window.document.documentElement) {
          window.document.documentElement.requestFullscreen = originalRequestFullscreen;
        }
        window.document.exitFullscreen = originalExitFullscreen;
      }
    }

    vi.clearAllMocks();
  });

  describe('environment detection', () => {
    describe('isBrowser', () => {
      it('should return true when window is defined', () => {
        expect(isBrowser()).toBe(true);
      });

      it('should return false when window is undefined', () => {
        delete (global as any).window;
        expect(isBrowser()).toBe(false);
        global.window = mockWindow;
      });
    });

    describe('isServer', () => {
      it('should return false when window is defined', () => {
        expect(isServer()).toBe(false);
      });

      it('should return true when window is undefined', () => {
        delete (global as any).window;
        expect(isServer()).toBe(true);
        global.window = mockWindow;
      });
    });

    describe('canUseDOM', () => {
      it('should return true when document is available', () => {
        expect(canUseDOM()).toBe(true);
      });

      it('should return false when document is not available', () => {
        delete (global as any).document;
        expect(canUseDOM()).toBe(false);
        global.window = mockWindow;
      });
    });
  });

  describe('device detection', () => {
    describe('isMobile', () => {
      it('should detect mobile devices', () => {
        global.navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
        expect(isMobile()).toBe(true);

        global.navigator.userAgent = 'Mozilla/5.0 (Linux; Android 10)';
        expect(isMobile()).toBe(true);
      });

      it('should return false for desktop devices', () => {
        global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
        expect(isMobile()).toBe(false);
      });
    });

    describe('isTouch', () => {
      it('should detect touch devices', () => {
        global.navigator.maxTouchPoints = 5;
        expect(isTouch()).toBe(true);
      });

      it('should return false for non-touch devices', () => {
        global.navigator.maxTouchPoints = 0;
        expect(isTouch()).toBe(false);
      });
    });

    describe('isIOS', () => {
      it('should detect iOS devices', () => {
        global.navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
        expect(isIOS()).toBe(true);

        global.navigator.userAgent = 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)';
        expect(isIOS()).toBe(true);
      });

      it('should return false for non-iOS devices', () => {
        global.navigator.userAgent = 'Mozilla/5.0 (Linux; Android 10)';
        expect(isIOS()).toBe(false);
      });
    });

    describe('isAndroid', () => {
      it('should detect Android devices', () => {
        global.navigator.userAgent = 'Mozilla/5.0 (Linux; Android 10)';
        expect(isAndroid()).toBe(true);
      });

      it('should return false for non-Android devices', () => {
        global.navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
        expect(isAndroid()).toBe(false);
      });
    });
  });

  describe('browser detection', () => {
    describe('isSafari', () => {
      it('should detect Safari', () => {
        global.navigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15';
        expect(isSafari()).toBe(true);
      });

      it('should return false for non-Safari browsers', () => {
        global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124';
        expect(isSafari()).toBe(false);
      });
    });

    describe('isChrome', () => {
      it('should detect Chrome', () => {
        global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124';
        expect(isChrome()).toBe(true);
      });

      it('should return false for non-Chrome browsers', () => {
        global.navigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/89.0';
        expect(isChrome()).toBe(false);
      });
    });

    describe('isFirefox', () => {
      it('should detect Firefox', () => {
        global.navigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/89.0';
        expect(isFirefox()).toBe(true);
      });

      it('should return false for non-Firefox browsers', () => {
        global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124';
        expect(isFirefox()).toBe(false);
      });
    });

    describe('isEdge', () => {
      it('should detect Edge', () => {
        global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/91.0.864.59';
        expect(isEdge()).toBe(true);
      });

      it('should return false for non-Edge browsers', () => {
        global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124';
        expect(isEdge()).toBe(false);
      });
    });

    describe('getUserAgent', () => {
      it('should return user agent string', () => {
        global.navigator.userAgent = 'Mozilla/5.0 Test User Agent';
        expect(getUserAgent()).toBe('Mozilla/5.0 Test User Agent');
      });

      it('should return empty string when window is undefined', () => {
        delete (global as any).window;
        expect(getUserAgent()).toBe('');
        global.window = { navigator: { userAgent: '' } } as any;
      });
    });
  });

  describe('viewport and scroll', () => {
    describe('getViewportSize', () => {
      it('should return viewport dimensions', () => {
        const size = getViewportSize();
        expect(size).toEqual({
          width: 1024,
          height: 768,
        });
      });

      it('should return default values when window is undefined', () => {
        delete (global as any).window;
        const size = getViewportSize();
        expect(size).toEqual({
          width: 0,
          height: 0,
        });
        global.window = mockWindow;
      });
    });

    describe('getScrollPosition', () => {
      it('should return scroll position', () => {
        mockWindow.scrollX = 100;
        mockWindow.scrollY = 200;

        const position = getScrollPosition();
        expect(position).toEqual({
          x: 100,
          y: 200,
        });
      });

      it('should return default values when window is undefined', () => {
        delete (global as any).window;
        const position = getScrollPosition();
        expect(position).toEqual({
          x: 0,
          y: 0,
        });
        global.window = mockWindow;
      });
    });

    describe('scrollTo', () => {
      it('should scroll to position', () => {
        scrollTo(100, 200);
        expect(mockWindow.scrollTo).toHaveBeenCalledWith(100, 200);
      });

      it('should scroll to top when no arguments provided', () => {
        scrollTo();
        expect(mockWindow.scrollTo).toHaveBeenCalledWith(0, 0);
      });
    });
  });

  describe('clipboard', () => {
    describe('copyToClipboard', () => {
      it('should copy text to clipboard', async () => {
        const mockWriteText = vi.fn().mockResolvedValue(undefined);
        global.navigator = {
          ...mockWindow.navigator,
          clipboard: { writeText: mockWriteText },
        };

        await copyToClipboard('test text');
        expect(mockWriteText).toHaveBeenCalledWith('test text');
      });

      it('should handle clipboard errors', async () => {
        const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard error'));
        global.navigator = {
          ...mockWindow.navigator,
          clipboard: { writeText: mockWriteText },
        };

        await expect(copyToClipboard('test text')).rejects.toThrow('Clipboard error');
      });
    });
  });

  describe('file operations', () => {
    describe('downloadFile', () => {
      it('should trigger file download', () => {
        const mockLink = {
          href: '',
          download: '',
          click: vi.fn(),
        };

        global.document = {
          ...mockWindow.document,
          createElement: vi.fn(() => mockLink),
          body: {
            appendChild: vi.fn(),
            removeChild: vi.fn(),
          },
        } as any;

        downloadFile('test.txt', 'content', 'text/plain');

        expect(mockLink.href).toContain('blob:');
        expect(mockLink.download).toBe('test.txt');
        expect(mockLink.click).toHaveBeenCalled();
      });
    });
  });

  describe('link operations', () => {
    describe('openLink', () => {
      it('should open link in new tab', () => {
        openLink('https://example.com');
        expect(mockWindow.open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
      });

      it('should open link in same tab', () => {
        openLink('https://example.com', { target: '_self' });
        expect(mockWindow.open).toHaveBeenCalledWith('https://example.com', '_self', 'noopener,noreferrer');
      });
    });
  });

  describe('print', () => {
    it('should trigger print dialog', () => {
      print();
      expect(mockWindow.print).toHaveBeenCalled();
    });
  });

  describe('fullscreen', () => {
    describe('fullscreen', () => {
      it('should request fullscreen', async () => {
        await fullscreen();
        expect(mockWindow.document.documentElement.requestFullscreen).toHaveBeenCalled();
      });
    });

    describe('exitFullscreen', () => {
      it('should exit fullscreen', async () => {
        await exitFullscreen();
        expect(mockWindow.document.exitFullscreen).toHaveBeenCalled();
      });
    });

    describe('isFullscreen', () => {
      it('should return true when in fullscreen', () => {
        mockWindow.document.fullscreenElement = mockWindow.document.documentElement;
        expect(isFullscreen()).toBe(true);
      });

      it('should return false when not in fullscreen', () => {
        mockWindow.document.fullscreenElement = null;
        expect(isFullscreen()).toBe(false);
      });
    });

    describe('registerFullscreenChange', () => {
      it('should register fullscreen change listener', () => {
        const callback = vi.fn();
        const unregister = registerFullscreenChange(callback);

        expect(mockWindow.document.addEventListener).toHaveBeenCalledWith('fullscreenchange', callback);

        unregister();
        expect(mockWindow.document.removeEventListener).toHaveBeenCalledWith('fullscreenchange', callback);
      });
    });
  });
});
