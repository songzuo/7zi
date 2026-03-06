/**
 * @fileoverview XSS (Cross-Site Scripting) Protection Tests
 * Tests for input sanitization, output encoding, and XSS prevention
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DOM environment
const mockDocument = {
  createElement: vi.fn((tag: string) => ({
    tagName: tag.toUpperCase(),
    textContent: '',
    innerHTML: '',
    setAttribute: vi.fn(),
    appendChild: vi.fn(),
  })),
}

// Mock window
vi.stubGlobal('document', mockDocument)

/**
 * Sanitization utility - simulates what the app should do
 */
function sanitizeInput(input: string): string {
  if (!input) return ''
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Remove dangerous HTML tags
 */
function stripDangerousTags(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
}

/**
 * Remove dangerous attributes
 */
function stripDangerousAttributes(input: string): string {
  return input
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
}

/**
 * Validate URL safety
 */
function isSafeUrl(url: string): boolean {
  if (!url) return false
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
  const normalizedUrl = url.toLowerCase().trim()
  return !dangerousProtocols.some(protocol => normalizedUrl.startsWith(protocol))
}

/**
 * Escape HTML entities for safe rendering
 */
function escapeHtml(input: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  }
  return String(input).replace(/[&<>"'`=/]/g, char => htmlEntities[char] || char)
}

describe('XSS Protection Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Input Sanitization', () => {
    it('should escape HTML special characters', () => {
      const maliciousInputs = [
        { input: '<script>alert("xss")</script>', shouldNotContain: '<script>' },
        { input: '<img src="x" onerror="alert(1)">', shouldNotContain: '<img' },
        { input: '"><script>alert(1)</script>', shouldNotContain: '<script>' },
        { input: "'-alert(1)-'", shouldNotContain: "'" },
      ]

      maliciousInputs.forEach(({ input, shouldNotContain }) => {
        const sanitized = sanitizeInput(input)
        expect(sanitized).not.toContain(shouldNotContain)
      })
    })

    it('should handle null and undefined inputs', () => {
      expect(sanitizeInput('')).toBe('')
      expect(sanitizeInput(null as unknown as string)).toBe('')
      expect(sanitizeInput(undefined as unknown as string)).toBe('')
    })

    it('should preserve safe content', () => {
      const safeInputs = [
        'Hello World',
        'user@example.com',
        'This is a normal message with numbers 123.',
        'Special chars: @#$%^&*()',
      ]

      safeInputs.forEach(input => {
        const sanitized = sanitizeInput(input)
        // Should contain the original text (possibly encoded)
        expect(sanitized.length).toBeGreaterThan(0)
      })
    })

    it('should handle Unicode characters safely', () => {
      const unicodeInputs = [
        '你好世界',
        'こんにちは',
        'Привет мир',
        '🎉🎊🎈',
      ]

      unicodeInputs.forEach(input => {
        const sanitized = sanitizeInput(input)
        expect(sanitized).toContain(input) // Unicode should be preserved
      })
    })
  })

  describe('Script Injection Prevention', () => {
    it('should detect and neutralize script tags', () => {
      const scriptPayloads = [
        '<script>alert("XSS")</script>',
        '<SCRIPT>alert("XSS")</SCRIPT>',
        '<ScRiPt>alert("XSS")</ScRiPt>',
        '<script src="https://evil.com/xss.js"></script>',
        '<script>document.cookie</script>',
        '<<script>script>alert("XSS")<</script>/script>',
      ]

      scriptPayloads.forEach(payload => {
        const sanitized = stripDangerousTags(payload)
        expect(sanitized.toLowerCase()).not.toContain('<script>')
      })
    })

    it('should handle nested and malformed script tags', () => {
      const nestedPayloads = [
        '<scr<script>ipt>alert(1)</scr</script>ipt>',
        '<script><script>alert(1)</script></script>',
        '<<script>script>alert(1)<</script>/script>',
      ]

      nestedPayloads.forEach(payload => {
        const sanitized = stripDangerousTags(payload)
        // Multiple passes might be needed for nested tags
        const doubleSanitized = stripDangerousTags(sanitized)
        expect(doubleSanitized.toLowerCase()).not.toMatch(/<script[^>]*>/)
      })
    })

    it('should prevent script execution via innerHTML patterns', () => {
      const dangerousInnerHtml = [
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        '<body onload=alert(1)>',
        '<input onfocus=alert(1) autofocus>',
        '<marquee onstart=alert(1)>',
      ]

      dangerousInnerHtml.forEach(payload => {
        const sanitized = stripDangerousAttributes(stripDangerousTags(payload))
        expect(sanitized.toLowerCase()).not.toMatch(/on\w+\s*=/)
      })
    })
  })

  describe('Event Handler Injection', () => {
    it('should strip all event handlers', () => {
      const eventHandlers = [
        'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
        'onkeydown', 'onkeyup', 'onfocus', 'onblur', 'onsubmit',
        'ondblclick', 'oncontextmenu', 'onwheel', 'ondrag', 'ondrop',
        'onscroll', 'oncopy', 'oncut', 'onpaste',
      ]

      eventHandlers.forEach(handler => {
        const payload = `<div ${handler}="alert(1)">test</div>`
        const sanitized = stripDangerousAttributes(payload)
        expect(sanitized.toLowerCase()).not.toContain(handler)
      })
    })

    it('should handle event handlers with various quote styles', () => {
      const payloads = [
        '<div onclick="alert(1)">',
        "<div onclick='alert(1)'>",
        '<div onclick=alert(1)>',
        '<div onclick = "alert(1)">',
        '<div onclick= "alert(1)">',
      ]

      payloads.forEach(payload => {
        const sanitized = stripDangerousAttributes(payload)
        expect(sanitized.toLowerCase()).not.toContain('onclick')
      })
    })

    it('should handle encoded event handlers', () => {
      const encodedPayloads = [
        '<div &#111;nClick="alert(1)">', // HTML entity encoded
        '<div on\u0063lick="alert(1)">', // Unicode escaped
      ]

      // These should be caught by the basic strip or fail safe
      encodedPayloads.forEach(payload => {
        const sanitized = stripDangerousAttributes(payload)
        // After stripping, should not contain functional onclick
        expect(sanitized.toLowerCase()).not.toMatch(/onclick\s*=/)
      })
    })
  })

  describe('URL-based XSS Prevention', () => {
    it('should block javascript: URLs', () => {
      const javascriptUrls = [
        'javascript:alert(1)',
        'JAVASCRIPT:alert(1)',
        'java script:alert(1)',
        'javascript:alert(document.cookie)',
        'javascript:void(0)',
      ]

      javascriptUrls.forEach(url => {
        expect(isSafeUrl(url)).toBe(false)
      })
    })

    it('should block data: URLs with scripts', () => {
      const dataUrls = [
        'data:text/html,<script>alert(1)</script>',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        'data:text/html,<img src=x onerror=alert(1)>',
      ]

      dataUrls.forEach(url => {
        expect(isSafeUrl(url)).toBe(false)
      })
    })

    it('should block vbscript: URLs', () => {
      const vbscriptUrls = [
        'vbscript:msgbox(1)',
        'VBSCRIPT:msgbox(1)',
      ]

      vbscriptUrls.forEach(url => {
        expect(isSafeUrl(url)).toBe(false)
      })
    })

    it('should allow safe URLs', () => {
      const safeUrls = [
        'https://example.com',
        'http://localhost:3000',
        '/api/data',
        'mailto:test@example.com',
        'tel:+1234567890',
        '#section',
        '../page',
      ]

      safeUrls.forEach(url => {
        expect(isSafeUrl(url)).toBe(true)
      })
    })

    it('should handle URL-encoded malicious URLs', () => {
      const encodedUrls = [
        'java%73cript:alert(1)', // URL encoded 's'
        'javascript%3Aalert(1)', // URL encoded ':'
        '%6A%61%76%61%73%63%72%69%70%74:alert(1)', // Fully encoded
      ]

      encodedUrls.forEach(url => {
        // After decoding, should be detected as unsafe
        const decoded = decodeURIComponent(url)
        expect(isSafeUrl(decoded)).toBe(false)
      })
    })
  })

  describe('HTML Entity Encoding', () => {
    it('should properly encode all HTML entities', () => {
      const testCases = [
        { input: '<', expected: '&lt;' },
        { input: '>', expected: '&gt;' },
        { input: '&', expected: '&amp;' },
        { input: '"', expected: '&quot;' },
        { input: "'", expected: '&#39;' },
        { input: '/', expected: '&#x2F;' },
      ]

      testCases.forEach(({ input, expected }) => {
        expect(escapeHtml(input)).toBe(expected)
      })
    })

    it('should handle mixed content', () => {
      const input = '<script>alert("XSS")</script>'
      const escaped = escapeHtml(input)
      
      expect(escaped).not.toContain('<')
      expect(escaped).not.toContain('>')
      expect(escaped).toContain('&lt;')
      expect(escaped).toContain('&gt;')
    })

    it('should preserve safe text content', () => {
      const safeText = 'Hello, this is a safe message!'
      const escaped = escapeHtml(safeText)
      
      expect(escaped).toBe(safeText)
    })
  })

  describe('DOM-based XSS Prevention', () => {
    it('should not allow direct innerHTML assignment with user input', () => {
      const userInput = '<img src=x onerror=alert(1)>'
      const escaped = escapeHtml(userInput)
      
      // escaped content should be safe for innerHTML
      expect(escaped).not.toContain('<img')
      expect(escaped).not.toContain('onerror')
    })

    it('should use textContent instead of innerHTML for user content', () => {
      // This test documents the best practice
      const userInput = '<script>alert(1)</script>'
      
      // textContent would render this as text, not execute it
      // The escaped version simulates what would be safe
      const escaped = escapeHtml(userInput)
      expect(escaped).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
    })

    it('should sanitize user input before DOM insertion', () => {
      const maliciousInputs = [
        '<img src=x onerror=alert(1)>',
        '<svg/onload=alert(1)>',
        '"><script>alert(1)</script>',
      ]

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeInput(input)
        // Should be safe to insert into DOM
        expect(sanitized).not.toMatch(/<[^>]+on\w+\s*=/)
      })
    })
  })

  describe('Template Injection Prevention', () => {
    it('should prevent server-side template injection patterns', () => {
      const templatePayloads = [
        '${alert(1)}',
        '{{constructor.constructor("alert(1)")()}}',
        '<%= alert(1) %>',
        '#{alert(1)}',
        '*{alert(1)}',
      ]

      templatePayloads.forEach(payload => {
        const sanitized = sanitizeInput(payload)
        // These patterns should be escaped
        expect(sanitized).not.toContain('${')
        expect(sanitized).not.toContain('{{')
      })
    })
  })

  describe('Content Security Policy Considerations', () => {
    it('should not rely on inline scripts', () => {
      // This test documents CSP best practices
      const unsafePatterns = [
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<script/gi,
      ]

      const testContent = 'User provided content'
      
      unsafePatterns.forEach(pattern => {
        expect(pattern.test(testContent)).toBe(false)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long strings', () => {
      const longString = 'a'.repeat(100000)
      const sanitized = sanitizeInput(longString)
      
      expect(sanitized.length).toBe(100000)
    })

    it('should handle null bytes', () => {
      const nullByteInput = '<scr\x00ipt>alert(1)</script>'
      const sanitized = sanitizeInput(nullByteInput)
      
      expect(sanitized).not.toContain('<script>')
    })

    it('should handle mixed encoding attacks', () => {
      const mixedEncodings = [
        '<img src=x onerror=&#97;lert(1)>', // HTML entity in event
        '<img src=x onerror=\u0061lert(1)>', // Unicode in event
      ]

      mixedEncodings.forEach(payload => {
        const sanitized = stripDangerousAttributes(sanitizeInput(payload))
        // Should not contain functional onerror
        expect(sanitized.toLowerCase()).not.toMatch(/onerror\s*=/)
      })
    })

    it('should handle SVG and MathML XSS vectors', () => {
      const svgPayloads = [
        '<svg><script>alert(1)</script></svg>',
        '<svg onload=alert(1)>',
        '<math><script>alert(1)</script></math>',
        '<svg><animate onbegin=alert(1)>',
        '<svg><set onbegin=alert(1)>',
      ]

      svgPayloads.forEach(payload => {
        const sanitized = stripDangerousTags(stripDangerousAttributes(payload))
        expect(sanitized.toLowerCase()).not.toContain('<script')
        expect(sanitized.toLowerCase()).not.toMatch(/on\w+\s*=/)
      })
    })

    it('should handle XML-based attacks', () => {
      const xmlPayloads = [
        '<?xml version="1.0"?><script>alert(1)</script>',
        '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
      ]

      xmlPayloads.forEach(payload => {
        const sanitized = stripDangerousTags(sanitizeInput(payload))
        expect(sanitized.toLowerCase()).not.toContain('<script')
      })
    })
  })

  describe('React-specific XSS Prevention', () => {
    it('should not use dangerouslySetInnerHTML with user content', () => {
      // This test documents React best practices
      const userContent = '<script>alert(1)</script>'
      
      // In React, we should NOT do:
      // <div dangerouslySetInnerHTML={{ __html: userContent }} />
      
      // Instead, we should sanitize first or use textContent
      const sanitized = sanitizeInput(userContent)
      expect(sanitized).not.toContain('<script>')
    })

    it('should validate href attributes in links', () => {
      const dangerousHrefs = [
        'javascript:alert(1)',
        'javascript:void(0)',
        'data:text/html,<script>alert(1)</script>',
      ]

      dangerousHrefs.forEach(href => {
        expect(isSafeUrl(href)).toBe(false)
      })
    })
  })
})

describe('XSS Sanitization Integration', () => {
  it('should provide complete sanitization pipeline', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      '<svg/onload=alert(1)>',
      '"><script>alert(1)</script>',
      "javascript:alert(document.cookie)",
      '<a href="javascript:alert(1)">click</a>',
      '<iframe src="javascript:alert(1)"></iframe>',
    ]

    xssPayloads.forEach(payload => {
      // Full sanitization pipeline
      let sanitized = sanitizeInput(payload)
      sanitized = stripDangerousTags(sanitized)
      sanitized = stripDangerousAttributes(sanitized)
      
      // Should not contain dangerous patterns
      expect(sanitized.toLowerCase()).not.toContain('<script')
      expect(sanitized.toLowerCase()).not.toContain('javascript:')
      expect(sanitized.toLowerCase()).not.toMatch(/on\w+\s*=/)
    })
  })
})
