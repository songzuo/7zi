/**
 * @fileoverview Debounce utility tests
 * @description Tests for debounce, throttle, and DebounceManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  debounce,
  debounceLeading,
  debounceCancellable,
  throttle,
  createSearchDebounce,
  DebounceManager,
  getGlobalDebounceManager,
  resetGlobalDebounceManager,
  SEARCH_DEBOUNCE_DELAYS,
} from '../debounce'

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should delay function execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()

    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should reset timer on repeated calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    vi.advanceTimersByTime(50)
    debounced()
    vi.advanceTimersByTime(50)
    debounced()

    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should pass arguments to debounced function', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('arg1', 'arg2')

    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('should preserve this context', () => {
    const obj = {
      value: 42,
      fn: vi.fn(function (this: typeof obj) {
        return this.value
      }),
    }

    const debounced = debounce(obj.fn.bind(obj), 100)
    debounced()

    vi.advanceTimersByTime(100)

    expect(obj.fn).toHaveBeenCalled()
  })
})

describe('debounceLeading', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should execute first call immediately', () => {
    const fn = vi.fn()
    const debounced = debounceLeading(fn, 100)

    debounced()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should debounce subsequent calls', () => {
    const fn = vi.fn()
    const debounced = debounceLeading(fn, 100)

    debounced()
    debounced()
    debounced()

    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(2)
  })
})

describe('debounceCancellable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should allow canceling pending execution', () => {
    const fn = vi.fn()
    const debounced = debounceCancellable(fn, 100)

    debounced()
    debounced.cancel()

    vi.advanceTimersByTime(100)

    expect(fn).not.toHaveBeenCalled()
  })

  it('should allow flushing pending execution', () => {
    const fn = vi.fn()
    const debounced = debounceCancellable(fn, 100)

    debounced()
    debounced.flush()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should clear pending args on cancel', () => {
    const fn = vi.fn()
    const debounced = debounceCancellable(fn, 100)

    debounced('first')
    debounced.cancel()
    debounced.flush()

    expect(fn).not.toHaveBeenCalled()
  })
})

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should limit function execution frequency', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled()
    throttled()
    throttled()

    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)

    throttled()

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should execute first call immediately', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled()

    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('createSearchDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should use default delay', () => {
    const fn = vi.fn()
    const debounced = createSearchDebounce(fn)

    debounced()
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_DELAYS.STANDARD)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should use custom delay', () => {
    const fn = vi.fn()
    const debounced = createSearchDebounce(fn, SEARCH_DEBOUNCE_DELAYS.FAST)

    debounced()
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_DELAYS.FAST)

    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('DebounceManager', () => {
  let manager: DebounceManager

  beforeEach(() => {
    manager = new DebounceManager()
  })

  afterEach(() => {
    manager.dispose()
  })

  describe('register and execute', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should register and execute debounced function', () => {
      const fn = vi.fn()

      manager.register('test', fn, 100)
      manager.execute('test', 'arg1', 'arg2')

      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('should replace existing registration', () => {
      const fn1 = vi.fn()
      const fn2 = vi.fn()

      manager.register('test', fn1, 100)
      manager.register('test', fn2, 100)

      manager.execute('test')

      vi.advanceTimersByTime(100)

      expect(fn1).not.toHaveBeenCalled()
      expect(fn2).toHaveBeenCalledTimes(1)
    })
  })

  describe('cancel', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should cancel pending execution', () => {
      const fn = vi.fn()

      manager.register('test', fn, 100)
      manager.execute('test')
      manager.cancel('test')

      vi.advanceTimersByTime(100)

      expect(fn).not.toHaveBeenCalled()
    })

    it('should remove registered function', () => {
      const fn = vi.fn()

      manager.register('test', fn, 100)
      manager.cancel('test')

      expect(manager.has('test')).toBe(false)
    })
  })

  describe('flush', () => {
    it('should execute immediately', () => {
      const fn = vi.fn()

      manager.register('test', fn, 100)
      manager.execute('test')
      manager.flush('test')

      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('cancelAll', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should cancel all pending executions', () => {
      const fn1 = vi.fn()
      const fn2 = vi.fn()

      manager.register('test1', fn1, 100)
      manager.register('test2', fn2, 100)

      manager.execute('test1')
      manager.execute('test2')
      manager.cancelAll()

      vi.advanceTimersByTime(100)

      expect(fn1).not.toHaveBeenCalled()
      expect(fn2).not.toHaveBeenCalled()
    })
  })

  describe('dispose', () => {
    it('should cancel all and clear map', () => {
      const fn = vi.fn()

      manager.register('test', fn, 100)
      manager.dispose()

      expect(manager.has('test')).toBe(false)
    })
  })
})

describe('Global DebounceManager', () => {
  afterEach(() => {
    resetGlobalDebounceManager()
  })

  it('should return same instance', () => {
    const manager1 = getGlobalDebounceManager()
    const manager2 = getGlobalDebounceManager()

    expect(manager1).toBe(manager2)
  })

  it('should create new instance when requested', () => {
    const manager1 = getGlobalDebounceManager()
    const manager2 = getGlobalDebounceManager(true)

    expect(manager1).not.toBe(manager2)
  })

  it('should reset global instance', () => {
    const manager1 = getGlobalDebounceManager()
    resetGlobalDebounceManager()
    const manager2 = getGlobalDebounceManager()

    expect(manager1).not.toBe(manager2)
  })
})

describe('SEARCH_DEBOUNCE_DELAYS', () => {
  it('should have predefined delays', () => {
    expect(SEARCH_DEBOUNCE_DELAYS.FAST).toBe(150)
    expect(SEARCH_DEBOUNCE_DELAYS.STANDARD).toBe(300)
    expect(SEARCH_DEBOUNCE_DELAYS.SLOW).toBe(500)
    expect(SEARCH_DEBOUNCE_DELAYS.VERY_SLOW).toBe(800)
  })
})
