/**
 * Retry Manager Tests
 * 测试 WebSocket 消息重试管理器
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  RetryManager,
  RetryTask,
  withRetry,
  calculateBackoffDelay,
  retryManager,
} from '../retry-manager'

describe('RetryTask', () => {
  it('should execute successfully without retries', async () => {
    const task = new RetryTask<string>()
    const action = vi.fn().mockResolvedValue('success')

    const result = await task.execute(action)

    expect(result).toBe('success')
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure', async () => {
    const task = new RetryTask<string>({
      maxRetries: 3,
      initialDelay: 10,
    })

    const action = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('success')

    const result = await task.execute(action)

    expect(result).toBe('success')
    expect(action).toHaveBeenCalledTimes(3)
  })

  it('should fail after max retries', async () => {
    const task = new RetryTask<string>({
      maxRetries: 2,
      initialDelay: 10,
    })

    const action = vi.fn().mockRejectedValue(new Error('Always fails'))

    await expect(task.execute(action)).rejects.toThrow('Always fails')
    expect(action).toHaveBeenCalledTimes(3) // Initial + 2 retries
  })

  it('should call onRetry callback', async () => {
    const onRetry = vi.fn()
    const task = new RetryTask<string>({
      maxRetries: 2,
      initialDelay: 10,
      onRetry,
    })

    const action = vi.fn().mockRejectedValueOnce(new Error('Fail')).mockResolvedValue('success')

    await task.execute(action)

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
  })

  it('should call onSuccess callback', async () => {
    const onSuccess = vi.fn()
    const task = new RetryTask<string>({
      onSuccess,
    })

    const action = vi.fn().mockResolvedValue('success')

    await task.execute(action)

    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('should call onFailure callback', async () => {
    const onFailure = vi.fn()
    const task = new RetryTask<string>({
      maxRetries: 1,
      initialDelay: 10,
      onFailure,
    })

    const action = vi.fn().mockRejectedValue(new Error('Failed'))

    await expect(task.execute(action)).rejects.toThrow()

    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(onFailure).toHaveBeenCalledWith(expect.any(Error))
  })

  it('should calculate exponential backoff delay', async () => {
    const task = new RetryTask<string>({
      initialDelay: 100,
      backoffFactor: 2,
      maxDelay: 1000,
    })

    let attempts = 0
    const action = vi.fn().mockImplementation(() => {
      attempts++
      if (attempts < 3) {
        return Promise.reject(new Error('Fail'))
      }
      return Promise.resolve('success')
    })

    const startTime = Date.now()
    await task.execute(action)
    const elapsed = Date.now() - startTime

    // First retry: 100ms, Second retry: 200ms
    // Should take at least 300ms
    expect(elapsed).toBeGreaterThanOrEqual(280)
  })

  it('should respect max delay', async () => {
    const task = new RetryTask<string>({
      initialDelay: 100,
      backoffFactor: 10,
      maxDelay: 150,
    })

    let attempts = 0
    const action = vi.fn().mockImplementation(() => {
      attempts++
      if (attempts < 3) {
        return Promise.reject(new Error('Fail'))
      }
      return Promise.resolve('success')
    })

    const startTime = Date.now()
    await task.execute(action)
    const elapsed = Date.now() - startTime

    // First retry: 100ms, Second retry: capped at 150ms
    // Total should be around 250ms
    expect(elapsed).toBeLessThan(400)
  })

  it('should return correct state', async () => {
    const task = new RetryTask<string>({
      maxRetries: 2,
      initialDelay: 10,
    })

    const action = vi.fn().mockRejectedValueOnce(new Error('Fail')).mockResolvedValue('success')

    const stateBefore = task.getState()
    expect(stateBefore.isRetrying).toBe(false)
    expect(stateBefore.attempts).toBe(0)

    await task.execute(action)

    const stateAfter = task.getState()
    expect(stateAfter.isRetrying).toBe(false)
    expect(stateAfter.attempts).toBe(0) // Reset after success
  })

  it('should cancel retry', async () => {
    const task = new RetryTask<string>({
      maxRetries: 5,
      initialDelay: 100,
    })

    let attempts = 0
    const action = vi.fn().mockImplementation(() => {
      attempts++
      if (attempts < 3) {
        return Promise.reject(new Error('Fail'))
      }
      return Promise.resolve('success')
    })

    // Cancel after first attempt
    const executePromise = task.execute(action)
    setTimeout(() => task.cancel(), 50)

    await expect(executePromise).rejects.toThrow()
  })

  it('should reset state', async () => {
    const task = new RetryTask<string>({
      maxRetries: 2,
      initialDelay: 10,
    })

    const action = vi.fn().mockResolvedValue('success')
    await task.execute(action)

    task.reset()

    const state = task.getState()
    expect(state.attempts).toBe(0)
    expect(state.lastError).toBeNull()
    expect(state.nextRetryTime).toBeNull()
    expect(state.isRetrying).toBe(false)
  })
})

describe('RetryManager', () => {
  let manager: RetryManager

  beforeEach(() => {
    manager = new RetryManager()
  })

  afterEach(() => {
    manager.cancelAll()
  })

  describe('execute', () => {
    it('should execute task successfully', async () => {
      const action = vi.fn().mockResolvedValue('success')
      const result = await manager.execute('task-1', action)

      expect(result).toBe('success')
      expect(action).toHaveBeenCalledTimes(1)
    })

    it('should retry task on failure', async () => {
      const action = vi.fn().mockRejectedValueOnce(new Error('Fail')).mockResolvedValue('success')

      const result = await manager.execute('task-1', action, {
        maxRetries: 2,
        initialDelay: 10,
      })

      expect(result).toBe('success')
      expect(action).toHaveBeenCalledTimes(2)
    })

    it('should handle multiple tasks concurrently', async () => {
      const action1 = vi.fn().mockResolvedValue('result1')
      const action2 = vi.fn().mockResolvedValue('result2')
      const action3 = vi.fn().mockResolvedValue('result3')

      const [result1, result2, result3] = await Promise.all([
        manager.execute('task-1', action1),
        manager.execute('task-2', action2),
        manager.execute('task-3', action3),
      ])

      expect(result1).toBe('result1')
      expect(result2).toBe('result2')
      expect(result3).toBe('result3')
    })

    it('should cancel existing task with same ID', async () => {
      const action1 = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('result1'), 100)))
      const action2 = vi.fn().mockResolvedValue('result2')

      const promise1 = manager.execute('task-1', action1)
      const promise2 = manager.execute('task-1', action2) // Should cancel first

      // Catch the cancellation error from promise1 since it's expected to be cancelled
      promise1.catch(() => {})

      const result = await promise2
      expect(result).toBe('result2')
      expect(action2).toHaveBeenCalledTimes(1)
    })
  })

  describe('getState', () => {
    it('should return null for non-existent task', () => {
      const state = manager.getState('non-existent')
      expect(state).toBeNull()
    })

    it('should return state for existing task', async () => {
      const action = vi.fn().mockResolvedValue('success')
      const executePromise = manager.execute('task-1', action, {
        maxRetries: 2,
        initialDelay: 10,
      })

      const state = manager.getState('task-1')
      expect(state).not.toBeNull()
      expect(state?.isRetrying).toBe(true)

      await executePromise
    })
  })

  describe('getAllStates', () => {
    it('should return all task states', async () => {
      const action1 = vi.fn().mockResolvedValue('success')
      const action2 = vi.fn().mockResolvedValue('success')

      const promise1 = manager.execute('task-1', action1, {
        maxRetries: 2,
        initialDelay: 10,
      })
      const promise2 = manager.execute('task-2', action2, {
        maxRetries: 2,
        initialDelay: 10,
      })

      const states = manager.getAllStates()
      expect(states.size).toBe(2)
      expect(states.has('task-1')).toBe(true)
      expect(states.has('task-2')).toBe(true)

      await Promise.all([promise1, promise2])
    })
  })

  describe('getEntry', () => {
    it('should return undefined for non-existent task', () => {
      const entry = manager.getEntry('non-existent')
      expect(entry).toBeUndefined()
    })

    it('should return entry metadata', async () => {
      const action = vi.fn().mockResolvedValue('success')
      const options = { maxRetries: 2 }

      const executePromise = manager.execute('task-1', action, options)

      const entry = manager.getEntry('task-1')
      expect(entry).toBeDefined()
      expect(entry?.id).toBe('task-1')
      expect(entry?.options).toEqual(options)

      await executePromise
    })
  })

  describe('getAllEntries', () => {
    it('should return all task entries', async () => {
      const action1 = vi.fn().mockResolvedValue('success')
      const action2 = vi.fn().mockResolvedValue('success')

      const promise1 = manager.execute('task-1', action1)
      const promise2 = manager.execute('task-2', action2)

      const entries = manager.getAllEntries()
      expect(entries).toHaveLength(2)

      await Promise.all([promise1, promise2])
    })
  })

  describe('cancel', () => {
    it('should cancel task and return true', async () => {
      let resolveAction: (value: string) => void
      const actionPromise = new Promise<string>(resolve => {
        resolveAction = resolve
      })
      const action = vi.fn().mockImplementation(() => actionPromise)

      const executePromise = manager.execute('task-1', action, {
        maxRetries: 5,
        initialDelay: 100,
      })

      // Wait for action to be called and start executing
      await new Promise(resolve => setTimeout(resolve, 10))
      const cancelled = manager.cancel('task-1')
      expect(cancelled).toBe(true)

      // Resolve the underlying action - it should throw since cancelled
      resolveAction!('success')

      // Verify the promise rejects with cancellation error
      await expect(executePromise).rejects.toThrow('Task cancelled')
    })

    it('should return false for non-existent task', () => {
      const cancelled = manager.cancel('non-existent')
      expect(cancelled).toBe(false)
    })
  })

  describe('cancelAll', () => {
    it('should cancel all tasks', async () => {
      const action1 = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('success'), 100)))
      const action2 = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('success'), 100)))

      const promise1 = manager.execute('task-1', action1, {
        maxRetries: 5,
        initialDelay: 100,
      })
      const promise2 = manager.execute('task-2', action2, {
        maxRetries: 5,
        initialDelay: 100,
      })

      // Wait for the actions to start
      await new Promise(resolve => setTimeout(resolve, 10))
      manager.cancelAll()

      // Capture errors
      const errors: Error[] = []
      await Promise.all([promise1.catch(e => errors.push(e)), promise2.catch(e => errors.push(e))])

      // Verify errors occurred
      expect(errors.length).toBe(2)
      expect(errors.every(e => e instanceof Error)).toBe(true)
    })

    it('should clear all tasks after cancel', async () => {
      const action = vi.fn().mockResolvedValue('success')
      await manager.execute('task-1', action)

      manager.cancelAll()

      expect(manager.getActiveTaskCount()).toBe(0)
    })
  })

  describe('reset', () => {
    it('should reset task state and return true', async () => {
      const action = vi.fn().mockRejectedValueOnce(new Error('Fail'))
      const executePromise = manager.execute('task-1', action, {
        maxRetries: 2,
        initialDelay: 10,
      })

      await executePromise.catch(() => {})

      const reset = manager.reset('task-1')
      expect(reset).toBe(true)
    })

    it('should return false for non-existent task', () => {
      const reset = manager.reset('non-existent')
      expect(reset).toBe(false)
    })
  })

  describe('getActiveTaskCount', () => {
    it('should return 0 when no tasks', () => {
      expect(manager.getActiveTaskCount()).toBe(0)
    })

    it('should return count of active tasks', async () => {
      const action1 = vi.fn().mockResolvedValue('success')
      const action2 = vi.fn().mockResolvedValue('success')

      const promise1 = manager.execute('task-1', action1)
      const promise2 = manager.execute('task-2', action2)

      expect(manager.getActiveTaskCount()).toBe(2)

      await Promise.all([promise1, promise2])
    })

    it('should decrease after task completion', async () => {
      const action = vi.fn().mockResolvedValue('success')

      await manager.execute('task-1', action)

      expect(manager.getActiveTaskCount()).toBe(0)
    })
  })
})

describe('withRetry', () => {
  it('should execute with default options', async () => {
    const action = vi.fn().mockResolvedValue('success')
    const result = await withRetry(action)

    expect(result).toBe('success')
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('should retry with custom options', async () => {
    const action = vi.fn().mockRejectedValueOnce(new Error('Fail')).mockResolvedValue('success')

    const result = await withRetry(action, {
      maxRetries: 2,
      initialDelay: 10,
    })

    expect(result).toBe('success')
    expect(action).toHaveBeenCalledTimes(2)
  })

  it('should throw after max retries', async () => {
    const action = vi.fn().mockRejectedValue(new Error('Always fails'))

    await expect(
      withRetry(action, {
        maxRetries: 1,
        initialDelay: 10,
      })
    ).rejects.toThrow('Always fails')
  })
})

describe('calculateBackoffDelay', () => {
  it('should calculate correct backoff delay', () => {
    const delay1 = calculateBackoffDelay(1, { initialDelay: 100, backoffFactor: 2 })
    expect(delay1).toBe(100)

    const delay2 = calculateBackoffDelay(2, { initialDelay: 100, backoffFactor: 2 })
    expect(delay2).toBe(200)

    const delay3 = calculateBackoffDelay(3, { initialDelay: 100, backoffFactor: 2 })
    expect(delay3).toBe(400)
  })

  it('should respect max delay', () => {
    const delay = calculateBackoffDelay(10, {
      initialDelay: 100,
      backoffFactor: 2,
      maxDelay: 300,
    })
    expect(delay).toBe(300)
  })

  it('should use default values', () => {
    const delay = calculateBackoffDelay(2)
    expect(delay).toBeGreaterThan(0)
    expect(delay).toBeLessThanOrEqual(30000)
  })
})

describe('retryManager (global instance)', () => {
  it('should be a singleton instance', () => {
    expect(retryManager).toBeInstanceOf(RetryManager)
  })

  it('should execute tasks', async () => {
    const action = vi.fn().mockResolvedValue('success')
    const result = await retryManager.execute('global-task-1', action)

    expect(result).toBe('success')
  })

  afterEach(() => {
    retryManager.cancelAll()
  })
})
