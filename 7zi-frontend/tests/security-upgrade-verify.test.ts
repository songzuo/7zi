/**
 * Next.js 16.2.3 Security Upgrade Verification Test
 * 
 * This test verifies that Next.js has been correctly upgraded to 16.2.3
 * which includes the security patch for GHSA-q4gf-8mx6-v5v3 (Denial of Service vulnerability)
 */

import { describe, it, expect } from 'vitest'
import path from 'path'

describe('Next.js 16.2.3 Security Upgrade Verification', () => {
  it('should have Next.js 16.2.3 installed', () => {
    const nextPkg = require('next/package.json')
    expect(nextPkg.version).toBe('16.2.3')
  })

  it('should have correct Next.js version in package.json', () => {
    const pkg = require('../package.json')
    // Next.js should be 16.2.x or higher
    expect(pkg.dependencies.next).toMatch(/\^?16\./)
  })
})
