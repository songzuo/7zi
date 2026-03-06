'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseFetchOptions {
  revalidateOnFocus?: boolean;
  revalidateInterval?: number;
  initialData?: any;
}

export function useFetch<T>(
  url: string,
  options: UseFetchOptions = {}
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const {
    revalidateOnFocus = true,
    revalidateInterval = 0,
    initialData,
  } = options;

  const [data, setData] = useState<T | null>(initialData || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Revalidate on focus
  useEffect(() => {
    if (!revalidateOnFocus) return;

    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchData, revalidateOnFocus]);

  // Revalidate on interval
  useEffect(() => {
    if (!revalidateInterval) return;

    const interval = setInterval(fetchData, revalidateInterval);
    return () => clearInterval(interval);
  }, [fetchData, revalidateInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

// Hook specifically for GitHub API with rate limit handling
export function useGitHub<T>(
  endpoint: string,
  options?: UseFetchOptions
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  rateLimit: {
    remaining: number;
    reset: number;
  } | null;
  refetch: () => Promise<void>;
} {
  const [rateLimit, setRateLimit] = useState<{
    remaining: number;
    reset: number;
  } | null>(null);

  const { data, loading, error, refetch } = useFetch<T>(
    `https://api.github.com/${endpoint}`,
    {
      ...options,
      revalidateInterval: options?.revalidateInterval || 5 * 60 * 1000, // 5 minutes default
    }
  );

  // Extract rate limit info from response headers would require a custom fetch
  // For now, we'll return null and can enhance later

  return {
    data,
    loading,
    error,
    rateLimit,
    refetch,
  };
}
