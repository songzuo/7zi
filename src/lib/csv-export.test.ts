/**
 * @fileoverview Tests for CSV export utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  convertToCSV,
  downloadCSV,
  exportToCSV,
  generateCSVFilename,
  copyCSVToClipboard,
  type CSVData,
} from './csv-export'

describe('csv-export', () => {
  const mockWriteText = vi.fn()

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('convertToCSV', () => {
    it('should return empty string for empty data', () => {
      expect(convertToCSV([])).toBe('')
      expect(convertToCSV(null as unknown as CSVData)).toBe('')
      expect(convertToCSV(undefined as unknown as CSVData)).toBe('')
    })

    it('should convert simple array of objects to CSV', () => {
      const data = [
        { name: 'John', age: 30, city: 'New York' },
        { name: 'Jane', age: 25, city: 'London' },
      ]

      const csv = convertToCSV(data)

      expect(csv).toContain('Name')
      expect(csv).toContain('Age')
      expect(csv).toContain('City')
      expect(csv).toContain('John')
      expect(csv).toContain('30')
      expect(csv).toContain('New York')
      expect(csv).toContain('Jane')
      expect(csv).toContain('25')
      expect(csv).toContain('London')
    })

    it('should use custom columns', () => {
      const data = [{ firstName: 'John', lastName: 'Doe', age: 30 }]

      const columns = [
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
      ]

      const csv = convertToCSV(data, columns)

      expect(csv).toContain('First Name')
      expect(csv).toContain('Last Name')
      expect(csv).toContain('John')
      expect(csv).toContain('Doe')
      expect(csv).not.toContain('Age')
    })

    it('should apply custom format function', () => {
      const data = [{ name: 'John', score: 0.85 }]

      const columns = [
        { key: 'name', label: 'Name' },
        {
          key: 'score',
          label: 'Score',
          format: (value: unknown) => `${Math.round(Number(value) * 100)}%`,
        },
      ]

      const csv = convertToCSV(data, columns)

      expect(csv).toContain('85%')
    })

    it('should escape values containing commas', () => {
      const data = [{ name: 'Doe, John', age: 30 }]

      const csv = convertToCSV(data)

      expect(csv).toContain('"Doe, John"')
    })

    it('should escape values containing quotes', () => {
      const data = [{ name: 'John "The Boss" Doe', age: 30 }]

      const csv = convertToCSV(data)

      expect(csv).toContain('"John ""The Boss"" Doe"')
    })

    it('should escape values containing newlines', () => {
      const data = [{ name: 'Line1\nLine2', age: 30 }]

      const csv = convertToCSV(data)

      expect(csv).toContain('"Line1\nLine2"')
    })

    it('should handle null and undefined values', () => {
      const data = [{ name: null, age: undefined }]

      const csv = convertToCSV(data)

      // With null/undefined values, we get: Name,Age\n, (header and one row with empty values)
      expect(csv).toContain('\uFEFFName,Age\n,')
    })

    it('should format dates automatically', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const data = [{ name: 'John', createdAt: date }]

      const csv = convertToCSV(data)

      expect(csv).toContain('2024-01-15')
    })

    it('should format numbers automatically', () => {
      const data = [{ name: 'John', price: 1234.567 }]

      const csv = convertToCSV(data)

      expect(csv).toContain('1,234.57')
    })

    it('should add BOM for Excel UTF-8 compatibility', () => {
      const data = [{ name: 'John' }]
      const csv = convertToCSV(data)

      expect(csv.startsWith('\uFEFF')).toBe(true)
    })

    it('should auto-detect column labels', () => {
      const data = [{ firstName: 'John', lastName: 'Doe', isActive: true }]

      const csv = convertToCSV(data)

      expect(csv).toContain('First Name')
      expect(csv).toContain('Last Name')
      expect(csv).toContain('Is Active')
    })

    it('should filter columns starting with underscore', () => {
      const data = [{ name: 'John', _internal: 'secret', age: 30 }]

      const csv = convertToCSV(data)

      expect(csv).toContain('Name')
      expect(csv).toContain('Age')
      expect(csv).not.toContain('Internal')
    })

    it('should handle empty objects', () => {
      const data = [{}]

      const csv = convertToCSV(data)

      // Should have a header but no data columns
      expect(csv).toContain('\uFEFF\n')
    })
  })

  describe('downloadCSV', () => {
    let createElementSpy: ReturnType<typeof vi.spyOn>
    let mockLink: HTMLAnchorElement

    beforeEach(() => {
      mockLink = {
        setAttribute: vi.fn(),
        click: vi.fn(),
        style: { visibility: '' },
      } as unknown as HTMLAnchorElement

      createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
      vi.spyOn(document.body, 'appendChild').mockReturnValue(mockLink)
      vi.spyOn(document.body, 'removeChild').mockReturnValue(mockLink)
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    })

    afterEach(() => {
      createElementSpy.mockRestore()
    })

    it('should create download link and trigger download', () => {
      const csv = 'Name,Age\nJohn,30'
      downloadCSV(csv, 'test.csv')

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:test')
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'test.csv')
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should clean up after download', () => {
      const csv = 'Name,Age\nJohn,30'
      downloadCSV(csv, 'test.csv')

      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink)
      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink)
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
    })
  })

  describe('exportToCSV', () => {
    let mockLink: HTMLAnchorElement
    let createElementSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      mockLink = {
        setAttribute: vi.fn(),
        click: vi.fn(),
        style: { visibility: '' },
      } as unknown as HTMLAnchorElement

      createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
      vi.spyOn(document.body, 'appendChild').mockReturnValue(mockLink)
      vi.spyOn(document.body, 'removeChild').mockReturnValue(mockLink)
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    })

    afterEach(() => {
      createElementSpy.mockRestore()
    })

    it('should convert and download CSV', () => {
      const data = [{ name: 'John', age: 30 }]
      exportToCSV(data, 'test.csv')

      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should use custom columns if provided', () => {
      const data = [{ firstName: 'John', lastName: 'Doe' }]
      const columns = [
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
      ]

      exportToCSV(data, 'test.csv', columns)

      expect(mockLink.click).toHaveBeenCalled()
    })
  })

  describe('generateCSVFilename', () => {
    it('should generate filename with timestamp', () => {
      const filename = generateCSVFilename('export')

      expect(filename).toMatch(/^export_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/)
    })

    it('should use custom prefix', () => {
      const filename = generateCSVFilename('data')

      expect(filename).toMatch(/^data_/)
    })
  })

  describe('copyCSVToClipboard', () => {
    it('should copy CSV to clipboard', async () => {
      const data = [{ name: 'John', age: 30 }]
      await copyCSVToClipboard(data)

      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('John'))
    })

    it('should use custom columns', async () => {
      const data = [{ firstName: 'John', lastName: 'Doe' }]
      const columns = [{ key: 'firstName', label: 'First Name' }]

      await copyCSVToClipboard(data, columns)

      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('First Name'))
    })

    it('should throw error on clipboard failure', async () => {
      mockWriteText.mockRejectedValue(new Error('Clipboard error'))

      const data = [{ name: 'John' }]

      await expect(copyCSVToClipboard(data)).rejects.toThrow('Failed to copy to clipboard')
    })
  })
})
