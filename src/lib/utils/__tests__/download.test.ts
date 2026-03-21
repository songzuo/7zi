/**
 * Tests for download utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  downloadText,
  downloadJSON,
  downloadCSV,
  downloadBlob,
  downloadImage,
  downloadWithProgress,
  formatBytes,
  getMimeType,
  validateFileSize,
  createDownloadLink,
  triggerDownload,
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

  describe('downloadText', () => {
    it('should download text file', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      downloadText('test.txt', 'Hello, World!');

      expect(mockDocument.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe('test.txt');
      expect(mockLink.href).toContain('data:text/plain');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockDocument.body.removeChild).toHaveBeenCalledWith(mockLink);
    });

    it('should use custom MIME type', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      downloadText('test.md', '# Hello', 'text/markdown');

      expect(mockLink.href).toContain('data:text/markdown');
    });
  });

  describe('downloadJSON', () => {
    it('should download JSON file', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      const data = { name: 'Test', value: 42 };
      downloadJSON('data.json', data);

      expect(mockLink.download).toBe('data.json');
      expect(mockLink.href).toContain('data:application/json');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should pretty print JSON', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      const data = { name: 'Test', value: 42 };
      downloadJSON('data.json', data, { pretty: true });

      expect(mockLink.href).toContain('{\\n');
    });
  });

  describe('downloadCSV', () => {
    it('should download CSV file', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      const data = [
        ['Name', 'Age', 'City'],
        ['John', 30, 'NYC'],
        ['Jane', 25, 'LA'],
      ];
      downloadCSV('data.csv', data);

      expect(mockLink.download).toBe('data.csv');
      expect(mockLink.href).toContain('data:text/csv');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should handle array of objects', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      const data = [
        { name: 'John', age: 30, city: 'NYC' },
        { name: 'Jane', age: 25, city: 'LA' },
      ];
      downloadCSV('data.csv', data);

      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should use custom delimiter', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      const data = [['A', 'B'], ['1', '2']];
      downloadCSV('data.csv', data, { delimiter: ';' });

      expect(mockLink.href).toContain('A;B');
    });
  });

  describe('downloadBlob', () => {
    it('should download blob', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      const blob = new Blob(['test content'], { type: 'text/plain' });
      downloadBlob('blob.txt', blob);

      expect(mockLink.download).toBe('blob.txt');
      expect(mockWindow.URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(mockLink.href).toBe('blob:mock-url');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockWindow.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  describe('downloadImage', () => {
    it('should download image from URL', async () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        blob: vi.fn().mockResolvedValue(new Blob(['image data'], { type: 'image/png' })),
      });

      await downloadImage('https://example.com/image.png', 'image.png');

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/image.png');
      expect(mockLink.download).toBe('image.png');
    });

    it('should handle fetch errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        downloadImage('https://example.com/image.png', 'image.png')
      ).rejects.toThrow('Network error');
    });
  });

  describe('downloadWithProgress', () => {
    it('should download with progress callback', async () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      const progressCallback = vi.fn();

      // Mock fetch with progress support
      const mockResponse = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === 'content-length') return '1000';
            return null;
          }),
        },
        body: {
          getReader: vi.fn().mockReturnValue({
            read: vi.fn()
              .mockResolvedValueOnce({ value: new Uint8Array([1, 2, 3]), done: false })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
        blob: vi.fn().mockResolvedValue(new Blob(['data'])),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await downloadWithProgress('https://example.com/file', 'file.txt', progressCallback);

      expect(progressCallback).toHaveBeenCalled();
    });

    it('should call onCompletion callback', async () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      const onCompletion = vi.fn();

      global.fetch = vi.fn().mockResolvedValue({
        headers: {
          get: vi.fn(() => '100'),
        },
        body: {
          getReader: vi.fn().mockReturnValue({
            read: vi.fn().mockResolvedValue({ done: true }),
          }),
        },
        blob: vi.fn().mockResolvedValue(new Blob(['data'])),
      });

      await downloadWithProgress('https://example.com/file', 'file.txt', undefined, onCompletion);

      expect(onCompletion).toHaveBeenCalled();
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1099511627776)).toBe('1 TB');
    });

    it('should use custom decimals', () => {
      expect(formatBytes(1536, 2)).toBe('1.5 KB');
      expect(formatBytes(1536, 0)).toBe('2 KB');
    });

    it('should handle negative values', () => {
      expect(formatBytes(-1024)).toBe('-1 KB');
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME type for common extensions', () => {
      expect(getMimeType('txt')).toBe('text/plain');
      expect(getMimeType('json')).toBe('application/json');
      expect(getMimeType('pdf')).toBe('application/pdf');
      expect(getMimeType('png')).toBe('image/png');
      expect(getMimeType('jpg')).toBe('image/jpeg');
      expect(getMimeType('jpeg')).toBe('image/jpeg');
      expect(getMimeType('gif')).toBe('image/gif');
      expect(getMimeType('svg')).toBe('image/svg+xml');
      expect(getMimeType('html')).toBe('text/html');
      expect(getMimeType('css')).toBe('text/css');
      expect(getMimeType('js')).toBe('application/javascript');
      expect(getMimeType('csv')).toBe('text/csv');
    });

    it('should return default for unknown extensions', () => {
      expect(getMimeType('xyz')).toBe('application/octet-stream');
    });

    it('should handle case insensitive extensions', () => {
      expect(getMimeType('PDF')).toBe('application/pdf');
      expect(getMimeType('JSON')).toBe('application/json');
    });
  });

  describe('validateFileSize', () => {
    it('should validate file size', () => {
      expect(validateFileSize(1024, '1 MB')).toBe(true);
      expect(validateFileSize(1048576, '1 MB')).toBe(true);
      expect(validateFileSize(2097152, '1 MB')).toBe(false);
    });

    it('should handle different units', () => {
      expect(validateFileSize(512, '1 KB')).toBe(false);
      expect(validateFileSize(1024, '1 KB')).toBe(true);
      expect(validateFileSize(1073741824, '1 GB')).toBe(true);
      expect(validateFileSize(2147483648, '1 GB')).toBe(false);
    });

    it('should handle bytes directly', () => {
      expect(validateFileSize(100, 200)).toBe(true);
      expect(validateFileSize(300, 200)).toBe(false);
    });
  });

  describe('createDownloadLink', () => {
    it('should create download link element', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      const link = createDownloadLink('data', 'file.txt');

      expect(link).toBe(mockLink);
      expect(mockLink.download).toBe('file.txt');
    });

    it('should set custom attributes', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      createDownloadLink('data', 'file.txt', {
        target: '_blank',
        className: 'download-link',
      });

      expect(mockLink.target).toBe('_blank');
      expect(mockLink.className).toBe('download-link');
    });
  });

  describe('triggerDownload', () => {
    it('should trigger download click', () => {
      const mockLink = {
        click: vi.fn(),
      };

      triggerDownload(mockLink as any);

      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should append and remove link if autoRemove is true', () => {
      const mockLink = {
        click: vi.fn(),
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      triggerDownload(mockLink as any, { autoRemove: true });

      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockDocument.body.removeChild).toHaveBeenCalledWith(mockLink);
    });
  });

  describe('edge cases', () => {
    it('should handle empty data', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      downloadText('empty.txt', '');

      expect(mockLink.href).toContain('data:,');
    });

    it('should handle special characters in filename', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      downloadText('file with spaces & special!@#.txt', 'content');

      expect(mockLink.download).toBe('file with spaces & special!@#.txt');
    });

    it('should handle unicode content', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      downloadText('unicode.txt', 'Hello 世界 🌍');

      expect(mockLink.click).toHaveBeenCalled();
    });
  });
});
