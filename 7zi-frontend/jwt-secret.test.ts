/**
 * JWT Secret 安全性测试
 *
 * 验证 JWT_SECRET 环境变量的处理逻辑
 */

describe('JWT Secret Security', () => {
  // 模拟环境变量
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Production Environment', () => {
    it('should throw error when JWT_SECRET is not set', () => {
      process.env.NODE_ENV = 'production'
      delete process.env.JWT_SECRET

      expect(() => {
        // 重新导入模块以触发初始化
        require('./src/lib/auth/jwt')
      }).toThrow('[JWT] FATAL: JWT_SECRET environment variable is required in production')
    })

    it('should accept valid JWT_SECRET', () => {
      process.env.NODE_ENV = 'production'
      process.env.JWT_SECRET = 'a'.repeat(64)

      expect(() => {
        require('./src/lib/auth/jwt')
      }).not.toThrow()
    })

    it('should warn about short JWT_SECRET', () => {
      process.env.NODE_ENV = 'production'
      process.env.JWT_SECRET = 'short'

      const consoleSpy = jest.spyOn(console, 'warn')

      require('./src/lib/auth/jwt')

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('JWT_SECRET is too short'))
    })
  })

  describe('Development Environment', () => {
    it('should use temporary key when JWT_SECRET is not set', () => {
      process.env.NODE_ENV = 'development'
      delete process.env.JWT_SECRET

      const consoleSpy = jest.spyOn(console, 'warn')

      expect(() => {
        require('./src/lib/auth/jwt')
      }).not.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using temporary development key')
      )
    })

    it('should use provided JWT_SECRET in development', () => {
      process.env.NODE_ENV = 'development'
      process.env.JWT_SECRET = 'dev-secret-' + 'x'.repeat(64)

      const consoleSpy = jest.spyOn(console, 'warn')

      require('./src/lib/auth/jwt')

      // 不应该有警告，因为提供了有效的密钥
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Using temporary development key')
      )
    })
  })
})

describe('JWT Token Generation and Verification', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test'
    process.env.JWT_SECRET = 'test-secret-key-' + 'x'.repeat(64)
  })

  it('should generate and verify valid token', async () => {
    const { generateJWT, verifyJWT } = require('./src/lib/auth/jwt')

    const payload = {
      userId: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user' as const,
    }

    const token = await generateJWT(payload)
    const verified = await verifyJWT(token)

    expect(verified.userId).toBe(payload.userId)
    expect(verified.username).toBe(payload.username)
    expect(verified.email).toBe(payload.email)
    expect(verified.role).toBe(payload.role)
  })

  it('should reject token with wrong secret', async () => {
    const { generateJWT, verifyJWT } = require('./src/lib/auth/jwt')

    const payload = {
      userId: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user' as const,
    }

    // 生成令牌
    const token = await generateJWT(payload)

    // 更改密钥
    process.env.JWT_SECRET = 'different-secret-' + 'y'.repeat(64)

    // 重新加载模块
    jest.resetModules()
    const { verifyJWT: verifyJWTNew } = require('./src/lib/auth/jwt')

    await expect(verifyJWTNew(token)).rejects.toThrow('Invalid or expired token')
  })
})
