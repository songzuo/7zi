// @ts-nocheck - Test file with complex type issues
/**
 * Tests for download utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  downloadFile,
  downloadJson,
  downloadCsv,
  createDownloadLink,
  downloadFromUrl,
  downloadInChunks,
} from '../download';

// Mock window and document
const mockDocument = {
  createElement: vi.fn(),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
  querySelector: vi.fn(),
};

const mockWindow = {
  URL: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  },
  location: {
    origin: 'https://example.com',
  },
};

describe('download utilities', () => {
  let originalDocument: any;
  let originalWindow: any;

  beforeEach(() => {
    originalDocument = global.document;
    originalWindow = global.window;
    global.document = mockDocument as any;
    global.window = mockWindow as any;

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.document = originalDocument;
    global.window = originalWindow;
  });

  describe('downloadFile', () => {
    it('should download text file', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      downloadFile('Hello, World!', 'test.txt', 'text/plain');

      expect(mockDocument.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe('test.txt');
      expect(mockLink.href).toContain('blob:mock-url');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockDocument.body.removeChild).toHaveBeenCalledWith(mockLink);
      expect(mockWindow.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should use default MIME type if not provided', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      downloadFile('content', 'file.txt');

      expect(mockLink.download).toBe('file.txt');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('downloadJson', () => {
    it('should download JSON file', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      const data = { name: 'Test', value: 42 };
      downloadJson(data, 'data.json');

      expect(mockLink.download).toBe('data.json');
      expect(mockLink.click).toHaveBeenCalled();

      // Verify JSON content was created
      const callArgs = mockWindow.URL.createObjectURL.mock.calls[0];
      const blob = callArgs[0] as Blob;
      expect(blob.type).toBe('application/json');
    });
  });

  describe('downloadCsv', () => {
    it('should download CSV file', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      const csvContent = 'name,value\nTest,42';
      downloadCsv(csvContent, 'data.csv');

      expect(mockLink.download).toBe('data.csv');
      expect(mockLink.click).toHaveBeenCalled();

      // Verify CSV content was created with correct MIME type
      const callArgs = mockWindow.URL.createObjectURL.mock.calls[0];
      const blob = callArgs[0] as Blob;
      expect(blob.type).toBe('text/csv; charset=utf-8');
    });
  });

  describe('createDownloadLink', () => {
    it('should create download link with default target', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      const link = createDownloadLink('http://example.com/file.pdf', 'file.pdf');

      expect(mockDocument.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('http://example.com/file.pdf');
      expect(mockLink.download).toBe('file.pdf');
      expect(mockLink.target).toBe('_self');
      expect(link).toBe(mockLink);
    });

    it('should create download link with custom target', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      const link = createDownloadLink('http://example.com/file.pdf', 'file.pdf', '_blank');

      expect(mockLink.target).toBe('_blank');
      expect(link).toBe(mockLink);
    });
  });

  describe('downloadFromUrl', () => {
    it('should download file from URL', async () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'text/plain';
            return null;
          }),
        },
        text: vi.fn().mockResolvedValue('File content'),
      } as any);

      await downloadFromUrl('http://example.com/file.txt', 'custom-name.txt');

      expect(fetch).toHaveBeenCalledWith('http://example.com/file.txt');
      expect(mockLink.download).toBe('custom-name.txt');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should extract filename from URL if not provided', async () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: vi.fn(() => null),
        },
        text: vi.fn().mockResolvedValue('File content'),
      } as any);

      await downloadFromUrl('http://example.com/files/data.txt');

      expect(mockLink.download).toBe('data.txt');
    });

    it('should handle fetch errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(downloadFromUrl('http://example.com/file.txt')).rejects.toThrow();
    });
  });

  describe('downloadInChunks', () => {
    it('should download file in chunks', async () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      // Mock fetch to return chunked data
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: vi.fn(() => 'application/octet-stream'),
        },
        body: {
          getReader: vi.fn(() => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
              .mockResolvedValueOnce({ done: false, value: new Uint8Array([4, 5, 6]) })
              .mockResolvedValueOnce({ done: true, value: undefined }),
          })),
        },
      } as any);

      await downloadInChunks('http://example.com/largefile.bin', 'file.bin', 1024);

      expect(mockLink.download).toBe('file.bin');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should handle errors during chunk download', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Download failed'));

      await expect(
        downloadInChunks('http://example.com/file.bin', 'file.bin', 1024)
      ).rejects.toThrow('Download failed');
    });
  });
});
