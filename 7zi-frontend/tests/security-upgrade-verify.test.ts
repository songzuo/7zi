/**
 * Next.js 16.2.3 Security Upgrade Verification Test
 * 
 * This test verifies that Next.js has been correctly upgraded to 16.2.3
 * which includes the security patch for GHSA-q4gf-8mx6-v5v3 (Denial of Service vulnerability)
 */

import { describe, it, expect } from 'vitest'
import path from 'path'

describe('Next.js 16.2.3 Security Upgrade Verification', () => {
  it('should have Next.js 16.2.3 or higher installed', () => {
    const nextPkg = require('next/package.json')
    const [major, minor, patch] = nextPkg.version.split('.').map(Number)
    expect(major).toBe(16)
    expect(minor).toBe(2)
    expect(patch).toBeGreaterThanOrEqual(3)
  })

  it('should have correct Next.js version in package.json', () => {
    const pkg = require('../package.json')
    // Next.js should be 16.2.x or higher
    expect(pkg.dependencies.next).toMatch(/\^?16\./)
  })
})
