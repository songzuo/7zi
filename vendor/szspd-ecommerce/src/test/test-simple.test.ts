/**
 * Simple test to verify test environment
 */

import { describe, it, expect } from 'vitest'

describe('Test Environment', () => {
  it('should run a simple test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should verify vitest is working', () => {
    expect(typeof describe).toBe('function')
    expect(typeof it).toBe('function')
    expect(typeof expect).toBe('function')
  })
})
