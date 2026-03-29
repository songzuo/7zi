/**
 * Next.js 16 Cache API Integration Tests
 *
 * Tests for new Server Actions cache API:
 * - updateTag() - Immediate cache invalidation for specific tags
 * - refresh() - Refresh uncached data
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/updateTag
 * @see https://nextjs.org/docs/app/api-reference/functions/refresh
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeEach } from 'vitest';

// Mock Next.js cache functions
vi.mock('next/cache', () => ({
  updateTag: vi.fn(),
  refresh: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
  revalidatePath: vi.fn(),
}));

import { updateTag, refresh, unstable_cache, revalidatePath } from 'next/cache';

// ============================================================================
// Test Setup
// ============================================================================

let mockCacheStore = new Map<string, { data: unknown; timestamp: number; tags: string[] }>();
let mockCalls: { function: string; args: unknown[] }[] = [];

beforeEach(() => {
  // Clear cache before each test
  mockCacheStore.clear();
  mockCalls = [];

  // Mock updateTag implementation
  vi.mocked(updateTag).mockImplementation(async (tag: string) => {
    mockCalls.push({ function: 'updateTag', args: [tag] });
    // Invalidate cache entries with matching tag
    for (const [key, entry] of mockCacheStore.entries()) {
      if (entry.tags.includes(tag)) {
        mockCacheStore.delete(key);
      }
    }
  });

  // Mock refresh implementation
  vi.mocked(refresh).mockImplementation(async () => {
    mockCalls.push({ function: 'refresh', args: [] });
    // refresh() should trigger revalidation of stale cache
    // For testing, we simulate the effect
  });

  vi.mocked(revalidatePath).mockImplementation(async (path: string) => {
    mockCalls.push({ function: 'revalidatePath', args: [path] });
  });

  vi.mocked(unstable_cache).mockImplementation((fn: (...args: unknown[]) => unknown, tags: string[]) => {
    return async (...args: unknown[]) => {
      const cacheKey = `${fn.name || 'anonymous'}-${JSON.stringify(args)}`;
      const cached = mockCacheStore.get(cacheKey);

      if (cached) {
        return cached.data;
      }

      const result = await fn(...args);
      mockCacheStore.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        tags: tags || [],
      });

      return result;
    };
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Helper Functions
// ============================================================================

async function simulateDataFetch(userId: string): Promise<{ id: string; name: string; timestamp: number }> {
  return {
    id: userId,
    name: `User ${userId}`,
    timestamp: Date.now(),
  };
}

async function simulateExpensiveQuery(query: string): Promise<{ results: number[]; duration: number }> {
  // Simulate delay
  await new Promise((resolve) => setTimeout(resolve, 10));
  return {
    results: [1, 2, 3, 4, 5],
    duration: 10,
  };
}

// ============================================================================
// updateTag() Tests
// ============================================================================

describe('updateTag() - Cache Tag Invalidation', () => {
  it('should call updateTag with correct tag', async () => {
    await updateTag('user-123');

    expect(updateTag).toHaveBeenCalledWith('user-123');
    expect(updateTag).toHaveBeenCalledTimes(1);
  });

  it('should invalidate cache entries with matching tag', async () => {
    // Create cached entries with tags
    const cachedFn1 = unstable_cache(simulateDataFetch, ['user-123']);
    const cachedFn2 = unstable_cache(simulateDataFetch, ['user-456']);

    const data1 = await cachedFn1('123');
    const data2 = await cachedFn2('456');

    expect(mockCacheStore.size).toBe(2);

    // Invalidate user-123
    await updateTag('user-123');

    // Should only invalidate entry with matching tag
    expect(mockCacheStore.size).toBe(1);
  });

  it('should support multiple tags per cache entry', async () => {
    const cachedFn = unstable_cache(simulateDataFetch, ['user-123', 'premium', 'active']);

    await cachedFn('123');

    expect(mockCacheStore.size).toBe(1);

    // Invalidating any tag should remove the entry
    await updateTag('premium');

    expect(mockCacheStore.size).toBe(0);
  });

  it('should handle dynamic tag names', async () => {
    const userId = 'dynamic-user-999';

    const cachedFn = unstable_cache(simulateDataFetch, [`user-${userId}`]);
    await cachedFn(userId);

    await updateTag(`user-${userId}`);

    expect(updateTag).toHaveBeenCalledWith(`user-${userId}`);
    expect(mockCacheStore.size).toBe(0);
  });

  it('should be callable from Server Actions', async () => {
    // Simulate a Server Action
    async function updateUserProfile(userId: string): Promise<{ success: boolean; message: string }> {
      await updateTag(`user-${userId}`);

      return { success: true, message: 'Profile updated' };
    }

    const result = await updateUserProfile('123');

    expect(result.success).toBe(true);
    expect(updateTag).toHaveBeenCalledWith('user-123');
  });

  it('should handle tag-based invalidation for multiple entries', async () => {
    // Cache multiple entries with same tag
    const entries = ['user-1', 'user-2', 'user-3'];
    const tag = 'users';

    for (const entry of entries) {
      const cachedFn = unstable_cache(
        async (id: string) => ({ id, data: `data-${id}` }),
        [tag]
      );
      await cachedFn(entry);
    }

    expect(mockCacheStore.size).toBe(3);

    // Single tag invalidation removes all matching entries
    await updateTag(tag);

    expect(mockCacheStore.size).toBe(0);
  });

  it('should not affect entries without matching tag', async () => {
    const cachedFn1 = unstable_cache(simulateDataFetch, ['user-123']);
    const cachedFn2 = unstable_cache(simulateDataFetch, ['product-456']);

    await cachedFn1('123');
    await cachedFn2('456');

    await updateTag('user-123');

    expect(mockCacheStore.size).toBe(1);
    const remainingEntry = Array.from(mockCacheStore.values())[0];
    expect(remainingEntry.tags).toContain('product-456');
  });
});

// ============================================================================
// refresh() Tests
// ============================================================================

describe('refresh() - Refresh Uncached Data', () => {
  it('should call refresh function', async () => {
    await refresh();

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('should trigger revalidation of stale cache', async () => {
    const cachedFn = unstable_cache(simulateDataFetch, ['user-123']);

    const data1 = await cachedFn('123');
    await new Promise((resolve) => setTimeout(resolve, 20)); // Wait for time difference

    await refresh();

    const data2 = await cachedFn('123');

    // After refresh, data should be refetched (timestamp updated)
    expect(data2.timestamp).toBeGreaterThan(data1.timestamp);
  });

  it('should work with cache tags', async () => {
    const cachedFn = unstable_cache(simulateDataFetch, ['user-123', 'data']);

    await cachedFn('123');
    await refresh();

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('should be callable from Server Actions', async () => {
    async function refreshUserData(userId: string): Promise<{ success: boolean; refreshed: boolean }> {
      await refresh();

      return { success: true, refreshed: true };
    }

    const result = await refreshUserData('123');

    expect(result.refreshed).toBe(true);
    expect(refresh).toHaveBeenCalled();
  });

  it('should handle concurrent refresh calls', async () => {
    const promises = [
      refresh(),
      refresh(),
      refresh(),
    ];

    await Promise.all(promises);

    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it('should refresh multiple cache entries', async () => {
    const cachedFn1 = unstable_cache(simulateDataFetch, ['user-123']);
    const cachedFn2 = unstable_cache(simulateExpensiveQuery, ['query-1']);

    await cachedFn1('123');
    await cachedFn2('test');

    await refresh();

    expect(refresh).toHaveBeenCalled();
  });
});

// ============================================================================
// Cache Invalidation Behavior Tests
// ============================================================================

describe('Cache Invalidation Behavior', () => {
  it('should verify cache is cleared after tag invalidation', async () => {
    const cachedFn = unstable_cache(simulateDataFetch, ['test-tag']);

    // Initial fetch
    const data1 = await cachedFn('123');
    expect(mockCacheStore.size).toBe(1);

    // Invalidate
    await updateTag('test-tag');
    expect(mockCacheStore.size).toBe(0);

    // Refetch after invalidation
    const data2 = await cachedFn('123');
    expect(mockCacheStore.size).toBe(1);

    // Data should be refetched (new timestamp)
    expect(data2.timestamp).toBeGreaterThan(data1.timestamp);
  });

  it('should handle partial tag invalidation', async () => {
    const cachedFn1 = unstable_cache(simulateDataFetch, ['user-123', 'profile']);
    const cachedFn2 = unstable_cache(simulateDataFetch, ['user-123', 'settings']);
    const cachedFn3 = unstable_cache(simulateDataFetch, ['user-456', 'profile']);

    await cachedFn1('123');
    await cachedFn2('123');
    await cachedFn3('456');

    expect(mockCacheStore.size).toBe(3);

    // Invalidate only user-123 profile data
    await updateTag('user-123');

    expect(mockCacheStore.size).toBe(1);
    const remainingEntry = Array.from(mockCacheStore.values())[0];
    expect(remainingEntry.tags).toContain('user-456');
  });

  it('should combine updateTag and refresh correctly', async () => {
    const cachedFn = unstable_cache(simulateDataFetch, ['user-123']);

    await cachedFn('123');

    // Update tag to invalidate
    await updateTag('user-123');

    // Refresh to ensure new data
    await refresh();

    expect(updateTag).toHaveBeenCalledWith('user-123');
    expect(refresh).toHaveBeenCalled();
  });

  it('should maintain cache isolation between different tags', async () => {
    const tags = ['tag-a', 'tag-b', 'tag-c'];
    const cacheFns = tags.map((tag) =>
      unstable_cache(
        async (id: string) => ({ id, tag }),
        [tag]
      )
    );

    for (let i = 0; i < tags.length; i++) {
      await cacheFns[i](`id-${i}`);
    }

    expect(mockCacheStore.size).toBe(3);

    // Invalidate only one tag
    await updateTag('tag-b');

    expect(mockCacheStore.size).toBe(2);

    const remainingTags = Array.from(mockCacheStore.values())
      .flatMap((entry) => entry.tags)
      .filter((tag) => tag !== 'tag-b');

    expect(remainingTags).toHaveLength(2);
  });

  it('should handle invalidation during concurrent requests', async () => {
    const cachedFn = unstable_cache(simulateDataFetch, ['test-tag']);

    // Simulate concurrent requests
    const promises = [
      cachedFn('123'),
      cachedFn('123'),
      cachedFn('123'),
    ];

    await Promise.all(promises);
    expect(mockCacheStore.size).toBe(1);

    // Invalidate
    await updateTag('test-tag');
    expect(mockCacheStore.size).toBe(0);
  });
});

// ============================================================================
// Integration with Server Actions
// ============================================================================

describe('Integration with Server Actions', () => {
  it('should work in update user action', async () => {
    async function updateUser(userId: string, updates: Record<string, unknown>) {
      // Perform update
      // Then invalidate cache
      await updateTag(`user-${userId}`);
      return { success: true, userId, updates };
    }

    const result = await updateUser('123', { name: 'Updated Name' });

    expect(result.success).toBe(true);
    expect(updateTag).toHaveBeenCalledWith('user-123');
  });

  it('should work in batch update action', async () => {
    async function batchUpdateUsers(userIds: string[]): Promise<{ updated: string[] }> {
      for (const userId of userIds) {
        await updateTag(`user-${userId}`);
      }
      return { updated: userIds };
    }

    const result = await batchUpdateUsers(['1', '2', '3']);

    expect(result.updated).toEqual(['1', '2', '3']);
    expect(updateTag).toHaveBeenCalledTimes(3);
  });

  it('should work with refresh in data sync action', async () => {
    async function syncUserData(userId: string): Promise<{ synced: boolean }> {
      // Sync data with external service
      // Then refresh cache
      await refresh();
      return { synced: true };
    }

    const result = await syncUserData('123');

    expect(result.synced).toBe(true);
    expect(refresh).toHaveBeenCalled();
  });

  it('should handle error scenarios gracefully', async () => {
    // Simulate error in cache function
    const errorFn = unstable_cache(
      async () => {
        throw new Error('Cache fetch failed');
      },
      ['test-tag']
    );

    await expect(errorFn()).rejects.toThrow('Cache fetch failed');
    expect(mockCacheStore.size).toBe(0);

    // Should still be able to call updateTag
    await updateTag('test-tag');
    expect(updateTag).toHaveBeenCalledWith('test-tag');
  });

  it('should work with revalidatePath in combination', async () => {
    async function updatePageContent(path: string, tag: string): Promise<{ success: boolean }> {
      await updateTag(tag);
      await revalidatePath(path);
      return { success: true };
    }

    const result = await updatePageContent('/dashboard/user-123', 'user-123');

    expect(result.success).toBe(true);
    expect(updateTag).toHaveBeenCalledWith('user-123');
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/user-123');
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('Edge Cases and Error Handling', () => {
  it('should handle empty tag string', async () => {
    await updateTag('');

    expect(updateTag).toHaveBeenCalledWith('');
  });

  it('should handle special characters in tags', async () => {
    const specialTags = ['user:123', 'user@domain.com', 'user/path/123', 'user-query'];

    for (const tag of specialTags) {
      await updateTag(tag);
    }

    expect(updateTag).toHaveBeenCalledTimes(specialTags.length);
  });

  it('should handle rapid successive updateTag calls', async () => {
    const promises = Array.from({ length: 100 }, (_, i) => updateTag(`tag-${i}`));

    await Promise.all(promises);

    expect(updateTag).toHaveBeenCalledTimes(100);
  });

  it('should handle refresh with no cached data', async () => {
    // No cache entries
    expect(mockCacheStore.size).toBe(0);

    await refresh();

    expect(refresh).toHaveBeenCalled();
    expect(mockCacheStore.size).toBe(0);
  });

  it('should maintain call order for cache operations', async () => {
    const cachedFn = unstable_cache(simulateDataFetch, ['test-tag']);

    await cachedFn('123');
    await updateTag('test-tag');
    await refresh();

    const functionNames = mockCalls.map((call) => call.function);
    expect(functionNames).toEqual(['updateTag', 'refresh']);
  });

  it('should work with undefined and null values', async () => {
    const cachedFn = unstable_cache(
      async (val: unknown) => ({ value: val }),
      ['test-tag']
    );

    await cachedFn(undefined);
    await cachedFn(null);

    expect(mockCacheStore.size).toBe(2);

    await updateTag('test-tag');

    expect(mockCacheStore.size).toBe(0);
  });

  it('should handle very large tag names', async () => {
    const largeTag = 'a'.repeat(10000);

    await updateTag(largeTag);

    expect(updateTag).toHaveBeenCalledWith(largeTag);
  });
});
