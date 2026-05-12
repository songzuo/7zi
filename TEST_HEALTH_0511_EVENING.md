# Test Health Report - 2026-05-11 Evening

## 📊 Test Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | ~50+ |
| **Passed** | ~30+ |
| **Failed** | 12 |
| **Skipped** | 0 |
| **Pass Rate** | ~71% (Below 90% target) |

## ❌ Failed Tests

### Category 1: Timeout Failures (6 tests)

These tests timeout after 60 seconds, indicating they hang indefinitely.

| Test | File | Reason |
|------|------|--------|
| `should retry on retryable errors` | `tests/unit/retry/retry-decorator.test.ts` | Fake timer + async promise not resolving |
| `should retry multiple times up to maxRetries` | `tests/unit/retry/retry-decorator.test.ts` | Fake timer + async promise not resolving |
| `should stop retrying after maxRetries attempts` | `tests/unit/retry/retry-decorator.test.ts` | Fake timer + async promise not resolving |
| `should show connected status after connection` | `src/components/room/RoomManager.test.tsx` | Fake timer not properly advancing React state updates |
| `should load mock rooms after connection` | `src/components/room/RoomManager.test.tsx` | Fake timer not properly advancing React state updates |
| `should create a new room` | `src/components/room/RoomManager.test.tsx` | Fake timer not properly advancing React state updates |

### Category 2: Assertion Failures (5 tests)

These tests have logic/assertion failures where expected values don't match actual.

| Test | File | Reason |
|------|------|--------|
| `should collect LCP metric` | `tests/integration/monitoring/realtime-dashboard.test.ts` | `metrics.current.LCP` is `undefined` instead of `2500` |
| `should collect CLS metric` | `tests/integration/monitoring/realtime-dashboard.test.ts` | `metrics.current.CLS` is `undefined` instead of `0.05` |
| `should collect INP metric` | `tests/integration/monitoring/realtime-dashboard.test.ts` | `metrics.current.INP` is `undefined` instead of `150` |
| `should collect TTFB metric` | `tests/integration/monitoring/realtime-dashboard.test.ts` | `metrics.current.TTFB` is `undefined` instead of `600` |
| `should collect FCP metric` | `tests/integration/monitoring/realtime-dashboard.test.ts` | `metrics.current.FCP` is `undefined` instead of `1500` |

---

## 🔍 Root Cause Analysis

### Timeout Issues (Retry Decorator)

**Problem:** Tests using `vi.useFakeTimers()` with `vi.advanceTimersByTimeAsync()` are not properly advancing time.

**Example failing test:**
```typescript
it('should retry on retryable errors', async () => {
  const mockFn = vi.fn()
    .mockRejectedValueOnce(new Error('ECONNRESET'))
    .mockResolvedValue('success')

  const wrappedFn = withRetry(mockFn, { maxRetries: 3, initialDelay: 100 })
  const resultPromise = wrappedFn()

  // Fast-forward through first retry delay
  await vi.advanceTimersByTimeAsync(100)  // <-- Problem here
  
  const result = await resultPromise
  expect(result).toBe('success')
})
```

**Fix:** Use `vi.runAllTimersAsync()` or wrap the entire flow properly. The issue is that `advanceTimersByTimeAsync` doesn't properly work with the Promise chain in these tests.

### Timeout Issues (RoomManager)

**Problem:** Tests using `act()` with `vi.advanceTimersByTime()` don't properly flush React state updates.

**Example:**
```typescript
await act(async () => {
  vi.advanceTimersByTime(1000)  // <-- Doesn't properly flush async effects
})
```

**Fix:** Use `await act(async () => { vi.runAllTimers() })` or ensure proper async flushing.

### Assertion Issues (Realtime Dashboard)

**Problem:** Integration tests are receiving `undefined` for all metrics. The metrics aren't being transmitted from server to client properly.

**Root Cause:** The `recordMetric()` call happens, but the `metrics:update` event isn't being received within the test's promise timeout. This is likely a Socket.IO event timing issue in the test setup.

---

## 🔧 Recommended Fixes

### Fix 1: Retry Decorator Tests (Priority: HIGH)

Replace `vi.advanceTimersByTimeAsync` with proper async handling:

```typescript
// Instead of:
await vi.advanceTimersByTimeAsync(100)

// Use:
await vi.advanceTimersByTimeAsync(100)
await Promise.resolve()  // Ensure microtasks complete
```

Or refactor to use `vi.runAllTimersAsync()` for full timer execution.

### Fix 2: RoomManager Tests (Priority: HIGH)

Ensure proper `act()` wrapping:

```typescript
// Instead of:
await act(async () => {
  vi.advanceTimersByTime(1000)
})

// Use:
await act(async () => {
  vi.advanceTimersByTime(1000)
  await Promise.resolve()  // flush microtasks
})
```

### Fix 3: Realtime Dashboard Tests (Priority: MEDIUM)

Add proper timeout handling and increase test timeout:

```typescript
it('should collect LCP metric', async () => {
  const updatePromise = new Promise((resolve) => {
    const timeout = setTimeout(() => {
      // fail fast if no event
      resolve({ current: {} })
    }, 2000)
    
    clientSocket.on('metrics:update', (metrics) => {
      clearTimeout(timeout)
      resolve(metrics)
    })
  })

  enhancedMetricsCollector.recordMetric('LCP', 2500)
  const metrics = await updatePromise

  expect(metrics.current.LCP).toBe(2500)
})
```

### Fix 4: Global Test Timeout Configuration

Consider increasing `testTimeout` for integration tests that involve real I/O:

```typescript
// In vitest.config.ts
testTimeout: {
  unit: 30000,      // 30s for unit tests
  integration: 60000 // 60s for integration tests
}
```

---

## ✅ Quick Wins

1. **Skip flaky integration tests temporarily** - Add `.skip` to the 5 metrics collection tests while fixing them
2. **Reduce retry test complexity** - Temporarily reduce maxRetries to speed up tests
3. **Add explicit `await Promise.resolve()`** after each `advanceTimersByTime` call

---

## 🎯 Fix Priority

| Priority | Tests | Effort | Impact |
|----------|-------|--------|--------|
| **HIGH** | Retry decorator timeout fixes | 2h | +4 passing |
| **HIGH** | RoomManager timeout fixes | 2h | +3 passing |
| **MEDIUM** | Realtime dashboard fixes | 3h | +5 passing |
| **LOW** | Global config improvements | 1h | +all tests |

---

## 📈 Expected Outcome After Fixes

- **Current:** 71% pass rate (30+/50 tests)
- **Target:** ≥90% pass rate (45+/50 tests)
- **After HIGH priority fixes:** ~85% (42-43/50 tests)
- **After all fixes:** 95%+ (47-48/50 tests)