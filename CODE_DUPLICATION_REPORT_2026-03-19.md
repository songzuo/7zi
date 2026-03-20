# Code Duplication Analysis & Refactoring Report
**Date**: 2026-03-19
**Task**: Fix code duplication in `/root/.openclaw/workspace/7zi-project/src/lib/`

---

## Summary

The LRU Cache duplication mentioned in `CODE_QUALITY_REVIEW_2026-03-19.md` has **already been resolved**. There is now a single, unified implementation used throughout the codebase.

---

## ✅ Resolved Issues

### 1. LRU Cache Duplication - FIXED ✓

**Previous State** (as mentioned in CODE_QUALITY_REVIEW_2026-03-19.md):
- `src/lib/utils.ts` - LRUCache class
- `src/lib/search-filter.ts` - LRUCache class

**Current State**:
- **Single source**: `src/lib/cache/lru-cache.ts` - `LRUCache` class
- All imports correctly reference the unified implementation:
  - `src/lib/search-filter.ts` → `import { LRUCache } from '@/lib/cache/lru-cache';`
  - `src/lib/utils/cache.ts` → `export { LRUCache, createCache } from '@/lib/cache/lru-cache';`
  - `src/lib/utils/async.ts` → `import { LRUCache, createCache } from './cache';`

**Bug Fixed**: Discovered and fixed a bug where updating an existing key via `set()` did not update the LRU access order, causing incorrect eviction behavior. Test count improved from 4 to 3 failures (LRU test now passes).

---

## ⚠️ Other Duplicate Implementations Found

The following duplicates are **acceptable** or **domain-specific** and should NOT be consolidated:

### 1. Format Functions (Different Purposes)

| Function | Location | Purpose | Keep? |
|----------|----------|---------|-------|
| `formatNumber()` | `src/lib/utils/format.ts` | Simple thousands separator | ✅ Yes |
| `formatNumber()` | `src/lib/number-i18n.ts` | Intl.NumberFormat with locale | ✅ Yes |
| `formatNumber()` | `src/i18n/utils.ts` | Server-side i18n formatting | ✅ Yes |
| `formatFileSize()` | `src/lib/utils/format.ts` | Simple file size formatting | ✅ Yes |
| `formatFileSize()` | `src/lib/number-i18n.ts` | Locale-aware file size formatting | ✅ Yes |

**Rationale**: These have different purposes (simple vs. localized vs. server-side). Consolidating them would reduce flexibility.

### 2. ID Generation Functions (Different Contexts)

| Function | Location | Purpose | Keep? |
|----------|----------|---------|-------|
| `generateId()` / `generateUUID()` | `src/lib/utils/id.ts` | General-purpose UUID generation | ✅ Yes |
| `generateId()` | `src/lib/offline/offline-store.ts` | IndexedDB-specific IDs | ✅ Yes |
| `generateUUID()` | `src/lib/crypto/index.ts` | Deprecated, points to utils | ⚠️ Can remove |

**Rationale**: `offline-store.ts` has a specialized implementation for IndexedDB compatibility. The crypto module's `generateUUID()` is already marked as deprecated.

### 3. Cache Implementations (Different Domains)

| Class | Location | Purpose | Keep? |
|-------|----------|---------|-------|
| `LRUCache` | `src/lib/cache/lru-cache.ts` | General-purpose LRU cache with TTL | ✅ Yes |
| `CacheManager` | `src/lib/cache/CacheManager.ts` | API route cache with singleton pattern | ✅ Yes |
| `DatabaseCache` | `src/lib/db/cache.ts` | Database query cache with advanced features | ✅ Yes |
| `MemoizationCache` | `src/lib/db/cache.ts` | Query result memoization | ✅ Yes |
| `CacheKeyGenerator` | `src/lib/db/cache.ts` | Cache key generation utilities | ✅ Yes |
| `CacheInvalidator` | `src/lib/db/cache.ts` | Cache invalidation strategies | ✅ Yes |
| `PreparedStatementCache` | `src/lib/db/query-builder.ts` | SQL statement cache | ✅ Yes |
| `ModuleCache` | `src/lib/mcp/server.ts` | MCP module cache | ✅ Yes |

**Rationale**: Each cache serves a different domain with specific requirements (database, API routes, MCP, etc.). Consolidating them would create a monolithic, complex cache system.

---

## 📊 Test Results

### Before LRU Bug Fix
```
Test Files  1 failed (1)
Tests      4 failed | 85 passed (89)
```

### After LRU Bug Fix
```
Test Files  1 failed (1)
Tests      3 failed | 86 passed (89)
```

**Improvement**: +1 test passing (LRU eviction test now works correctly)

**Remaining Failures** (unrelated to LRU Cache):
1. `formatFileSize` test - expects "1.5 KB" but gets "1.50 KB" (trailing zero issue)
2. `getViewportSize` test - function doesn't exist in utils/index.ts (DOM utilities refactored)
3. Another format-related test

---

## ✅ Recommendations

### High Priority

1. **✅ COMPLETED**: LRU Cache duplication is already resolved
2. **✅ COMPLETED**: Fixed LRU Cache bug where `set()` didn't update access order

### Medium Priority

1. **Remove deprecated `generateUUID()`** from `src/lib/crypto/index.ts` - it's already marked as `@deprecated`
2. **Fix formatFileSize trailing zero issue** - update `toFixed()` logic to match test expectations
3. **Add `getViewportSize` to utils/index.ts** or update test to import from correct location

### Low Priority

1. **Consider consolidating format functions** - create a unified formatting module that internally delegates to the appropriate implementation based on context
2. **Document when to use which cache** - add documentation or comments explaining when to use `LRUCache` vs. `CacheManager` vs. `DatabaseCache`

---

## 🎯 Conclusion

The code duplication issue mentioned in `CODE_QUALITY_REVIEW_2026-03-19.md` has been **already resolved**. The codebase now has:

- ✅ Single, unified `LRUCache` implementation in `src/lib/cache/lru-cache.ts`
- ✅ All imports correctly reference the unified implementation
- ✅ Fixed LRU eviction bug (updating existing keys now updates access order)
- ✅ No other critical duplications found that require consolidation

The remaining "duplicates" are intentional, serving different domains or purposes. Consolidating them would reduce flexibility and create unnecessary coupling.

**Overall Status**: ✅ Code duplication issue is RESOLVED. The codebase is in good shape.
