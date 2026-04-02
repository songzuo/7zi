/**
 * 测试入口文件 v1.5.0
 *
 * 提供全局测试工具和配置的统一导出
 *
 * @module tests
 */

// ============================================
// 测试工具导出
// ============================================

// 从 setup 目录导出测试工具
export * from './setup/test-utils'
export * from './setup/test-env'

// ============================================
// 测试辅助函数
// ============================================

/**
 * 创建模拟的数据库连接
 */
export function createMockDb() {
  return {
    query: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(),
    close: vi.fn(),
  }
}

/**
 * 创建模拟的用户会话
 */
export function createMockSession(overrides = {}) {
  return {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    ...overrides,
  }
}

/**
 * 创建模拟的请求对象
 */
export function createMockRequest(overrides = {}) {
  return {
    method: 'GET',
    url: '/api/test',
    headers: new Headers(),
    json: vi.fn(),
    text: vi.fn(),
    ...overrides,
  }
}

/**
 * 创建模拟的响应对象
 */
export function createMockResponse(data: unknown, options: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
}

/**
 * 等待指定毫秒
 */
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 重置所有模拟
 */
export function resetAllMocks() {
  vi.clearAllMocks()
  vi.resetAllMocks()
}

// ============================================
// 测试常量
// ============================================

export const TEST_CONSTANTS = {
  // 测试用户
  TEST_USER_ID: 'test-user-id',
  TEST_EMAIL: 'test@example.com',

  // 测试项目
  TEST_PROJECT_ID: 'test-project-id',

  // 测试任务
  TEST_TASK_ID: 'test-task-id',

  // 测试时间
  TEST_TIMEOUT: 5000,
  TEST_LONG_TIMEOUT: 30000,
}

// ============================================
// 测试类型
// ============================================

export interface TestContext {
  db: ReturnType<typeof createMockDb>
  session: ReturnType<typeof createMockSession>
  request: ReturnType<typeof createMockRequest>
}

/**
 * 创建完整的测试上下文
 */
export function createTestContext(overrides = {}): TestContext {
  return {
    db: createMockDb(),
    session: createMockSession(),
    request: createMockRequest(),
    ...overrides,
  }
}
