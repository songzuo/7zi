/**
 * Tests for browser utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getQueryParams,
  updateQueryParams,
  copyToClipboard,
  readFromClipboard,
  downloadFile,
} from '../browser';

// Mock env module
vi.mock('../env', () => ({
  isClient: vi.fn(() => true),
}));

describe('browser utilities', () => {
  let mockWindow: any;
  let mockDocument: any;
  let mockNavigator: any;

  beforeEach(() => {
    // Store original values
    const originalWindow = global.window;
    const originalDocument = global.document;
    const originalNavigator = global.navigator;

    // Create mocks
    mockNavigator = {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue('clipboard content'),
      },
    };

    mockDocument = {
      createElement: vi.fn(() => ({
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
        focus: vi.fn(),
        select: vi.fn(),
        remove: vi.fn(),
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
      execCommand: vi.fn(() => true),
    };

    mockWindow = {
      location: {
        href: 'https://example.com?search=test&page=1',
        search: '?search=test&page=1',
      },
      history: {
        replaceState: vi.fn(),
        pushState: vi.fn(),
      },
      URL: vi.fn(),
    };

    // Set up globals
    (global as any).window = mockWindow;
    (global as any).document = mockDocument;
    (global as any).navigator = mockNavigator;

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore originals if they existed
    if (typeof (global as any).originalWindow !== 'undefined') {
      (global as any).window = (global as any).originalWindow;
    }
    if (typeof (global as any).originalDocument !== 'undefined') {
      (global as any).document = (global as any).originalDocument;
    }
    if (typeof (global as any).originalNavigator !== 'undefined') {
      (global as any).navigator = (global as any).originalNavigator;
    }
  });

  describe('getQueryParams', () => {
    it('should parse query parameters from URL', () => {
      mockWindow.location.search = '?search=hello&page=1&sort=asc';
      const params = getQueryParams();

      expect(params).toEqual({
        search: 'hello',
        page: '1',
        sort: 'asc',
      });
    });

    it('should handle empty query string', () => {
      mockWindow.location.search = '';
      const params = getQueryParams();

      expect(params).toEqual({});
    });

    it('should decode special characters', () => {
      mockWindow.location.search = '?query=hello%20world&email=test%40example.com';
      const params = getQueryParams();

      expect(params).toEqual({
        query: 'hello world',
        email: 'test@example.com',
      });
    });
  });

  describe('updateQueryParams', () => {
    it('should add query parameters', () => {
      mockWindow.location.href = 'https://example.com';

      updateQueryParams({ search: 'hello', page: 2 });

      expect(mockWindow.history.replaceState).toHaveBeenCalled();
    });

    it('should update existing parameters', () => {
      mockWindow.location.search = '?search=old&page=1';

      updateQueryParams({ search: 'new' });

      expect(mockWindow.history.replaceState).toHaveBeenCalled();
    });

    it('should remove parameters when value is null or undefined', () => {
      mockWindow.location.search = '?search=hello&page=1';

      updateQueryParams({ page: null });

      expect(mockWindow.history.replaceState).toHaveBeenCalled();
    });

    it('should use pushState when replace is false', () => {
      mockWindow.location.href = 'https://example.com';

      updateQueryParams({ new: 'param' }, false);

      expect(mockWindow.history.pushState).toHaveBeenCalled();
    });
  });

  describe('copyToClipboard', () => {
    it('should copy text using Clipboard API', async () => {
      await copyToClipboard('Hello, World!');

      expect(mockNavigator.clipboard.writeText).toHaveBeenCalledWith('Hello, World!');
    });

    it('should return true on success', async () => {
      mockNavigator.clipboard.writeText.mockResolvedValue(undefined);

      const result = await copyToClipboard('test');

      expect(result).toBe(true);
    });

    it('should fall back to execCommand when Clipboard API fails', async () => {
      mockNavigator.clipboard = null;

      const result = await copyToClipboard('fallback test');

      expect(mockDocument.createElement).toHaveBeenCalled();
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockNavigator.clipboard.writeText.mockRejectedValue(new Error('Permission denied'));
      mockDocument.execCommand.mockReturnValue(false);

      const result = await copyToClipboard('test');

      expect(result).toBe(false);
    });
  });

  describe('readFromClipboard', () => {
    it('should read text from clipboard', async () => {
      mockNavigator.clipboard.readText.mockResolvedValue('clipboard content');

      const result = await readFromClipboard();

      expect(result).toBe('clipboard content');
    });

    it('should return null when Clipboard API fails', async () => {
      mockNavigator.clipboard.readText.mockRejectedValue(new Error('Permission denied'));

      const result = await readFromClipboard();

      expect(result).toBe(null);
    });

    it('should return null when Clipboard API is not available', async () => {
      mockNavigator.clipboard = null;

      const result = await readFromClipboard();

      expect(result).toBe(null);
    });
  });

  describe('downloadFile', () => {
    it('should create download link and click it', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn(),
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      downloadFile('https://example.com/file.pdf', 'document.pdf');

      expect(mockDocument.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('https://example.com/file.pdf');
      expect(mockLink.download).toBe('document.pdf');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.remove).toHaveBeenCalled();
    });

    it('should work without filename', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn(),
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      downloadFile('https://example.com/file.pdf');

      expect(mockLink.download).toBe('');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });
});
