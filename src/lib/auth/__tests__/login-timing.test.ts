/**
 * @fileoverview Login timing side-channel regression tests
 *
 * Guards against user enumeration via response-time differences:
 *   - "unknown email" must perform the same password verification work as
 *     "known email + wrong password"
 *   - both branches must return exactly the same error message
 *   - both branches must use the same pbkdf2 work factor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import cryptoDefault from 'crypto'

const { mockGetUserByEmail } = vi.hoisted(() => ({
  mockGetUserByEmail: vi.fn(),
}))

// Mock only the data-access function; the real password primitives stay in
// place so the pbkdf2 work factor is genuinely exercised.
vi.mock('../repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../repository')>()
  return {
    ...actual,
    getUserByEmail: mockGetUserByEmail,
  }
})

// Wrap (but keep the real implementation of) the dummy verification helper so
// that it can be spied on without losing the real pbkdf2 work.
vi.mock('../password', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../password')>()
  return {
    ...actual,
    verifyPasswordWithDummyHash: vi.fn(actual.verifyPasswordWithDummyHash),
  }
})

import { loginUser } from '../service'
import { hashPassword, verifyPasswordWithDummyHash } from '../password'
import { UserRole, UserStatus } from '../types'

const knownEmail = 'known@example.com'
const unknownEmail = 'ghost@example.com'
const wrongPassword = 'WrongPassword123!'
const correctPassword = 'CorrectPassword123!'

function buildActiveUser(passwordHash: string) {
  return {
    id: 'user-1',
    email: knownEmail,
    password: passwordHash,
    name: 'Known User',
    role: UserRole.MEMBER,
    roles: [],
    status: UserStatus.ACTIVE,
    permissions: [],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe('login timing side channel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret-key-for-testing'
  })

  afterEach(() => {
    delete process.env.JWT_SECRET
    vi.restoreAllMocks()
  })

  it('returns the exact same error message for unknown email and wrong password', async () => {
    mockGetUserByEmail.mockResolvedValue(null)
    const unknownResult = await loginUser({ email: unknownEmail, password: wrongPassword })

    mockGetUserByEmail.mockResolvedValue(buildActiveUser(hashPassword(correctPassword)))
    const wrongResult = await loginUser({ email: knownEmail, password: wrongPassword })

    expect(unknownResult.success).toBe(false)
    expect(wrongResult.success).toBe(false)
    if (!unknownResult.success && !wrongResult.success) {
      expect(unknownResult.error).toBe('Invalid email or password')
      expect(wrongResult.error).toBe(unknownResult.error)
    }
  })

  it('runs the dummy password verification when the account does not exist', async () => {
    mockGetUserByEmail.mockResolvedValue(null)

    await loginUser({ email: unknownEmail, password: wrongPassword })

    expect(verifyPasswordWithDummyHash).toHaveBeenCalledTimes(1)
    expect(verifyPasswordWithDummyHash).toHaveBeenCalledWith(wrongPassword)
  })

  it('does not run the dummy verification when the account exists', async () => {
    mockGetUserByEmail.mockResolvedValue(buildActiveUser(hashPassword(correctPassword)))

    await loginUser({ email: knownEmail, password: wrongPassword })

    expect(verifyPasswordWithDummyHash).not.toHaveBeenCalled()
  })

  it('uses the same pbkdf2 work factor on both failure paths', async () => {
    // Build the fixture before spying so only the login call itself is measured.
    const realHash = hashPassword(correctPassword)
    const pbkdf2Spy = vi.spyOn(cryptoDefault, 'pbkdf2Sync')

    mockGetUserByEmail.mockResolvedValue(null)
    await loginUser({ email: unknownEmail, password: wrongPassword })

    const unknownCalls = pbkdf2Spy.mock.calls.slice()
    expect(unknownCalls.length).toBeGreaterThan(0)
    for (const call of unknownCalls) {
      // pbkdf2Sync(password, salt, iterations, keylen, digest)
      expect(call[2]).toBe(10000)
      expect(call[3]).toBe(64)
      expect(call[4]).toBe('sha512')
    }

    pbkdf2Spy.mockClear()

    mockGetUserByEmail.mockResolvedValue(buildActiveUser(realHash))
    await loginUser({ email: knownEmail, password: wrongPassword })

    const knownCalls = pbkdf2Spy.mock.calls.slice()
    expect(knownCalls.length).toBe(unknownCalls.length)
    for (const call of knownCalls) {
      expect(call[2]).toBe(10000)
      expect(call[3]).toBe(64)
      expect(call[4]).toBe('sha512')
    }
  })

  it('takes a comparable amount of time on both failure paths', async () => {
    const realHash = hashPassword(correctPassword)

    // warm up
    mockGetUserByEmail.mockResolvedValue(null)
    await loginUser({ email: unknownEmail, password: wrongPassword })

    mockGetUserByEmail.mockResolvedValue(null)
    const unknownStart = Date.now()
    await loginUser({ email: unknownEmail, password: wrongPassword })
    const unknownDuration = Date.now() - unknownStart

    mockGetUserByEmail.mockResolvedValue(buildActiveUser(realHash))
    const knownStart = Date.now()
    await loginUser({ email: knownEmail, password: wrongPassword })
    const knownDuration = Date.now() - knownStart

    // Generous bound: the dummy path must not be an order of magnitude faster.
    // Before the fix the unknown-account path skipped pbkdf2 entirely.
    expect(unknownDuration).toBeGreaterThan(knownDuration / 3)
  })
})
