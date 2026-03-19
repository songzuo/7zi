import { useState, useEffect } from 'react';

/**
 * Options for useDebounce hook
 */
export interface UseDebounceOptions<T> {
  /** Delay in milliseconds before updating the debounced value (default: 500ms) */
  delay?: number;
  /** Whether to enable debouncing (default: true) */
  enabled?: boolean;
  /** Callback function called when debounced value updates */
  onChange?: (debouncedValue: T) => void;
  /** Maximum wait time (for leading edge, optional) */
  maxWait?: number;
}

/**
 * useDebounce Hook
 *
 * A custom React hook that delays updating a value until after a specified delay
 * has passed since the last time the value changed. This is useful for:
 * - Search input fields (debounce user typing)
 * - Auto-save functionality
 * - API call throttling
 * - Window resize handlers
 * - Scroll event handlers
 *
 * @template T - Type of the value to debounce
 * @param value - The value to debounce
 * @param options - Configuration options (delay, enabled, onChange, maxWait)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * // Basic usage
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, { delay: 300 });
 *
 * // With onChange callback
 * const [email, setEmail] = useState('');
 * useDebounce(email, {
 *   delay: 500,
 *   onChange: (debouncedEmail) => {
 *     // Validate or save email
 *     validateEmail(debouncedEmail);
 *   }
 * });
 *
 * // With enabled flag (useful for conditional debouncing)
 * const [content, setContent] = useState('');
 * const [isEditing, setIsEditing] = useState(false);
 * const debouncedContent = useDebounce(content, {
 *   delay: 1000,
 *   enabled: isEditing
 * });
 * ```
 */
export function useDebounce<T>(
  value: T,
  options: UseDebounceOptions<T> = {}
): T {
  const { delay = 500, enabled = true, onChange, maxWait } = options;
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // If debouncing is disabled, handle onChange callback only
    if (!enabled) {
      if (onChange && debouncedValue !== value) {
        onChange(value);
      }
      return;
    }

    // Skip if value hasn't changed
    if (debouncedValue === value) {
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;
    let maxWaitTimeoutId: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const updateDebouncedValue = () => {
      if (!isCancelled) {
        setDebouncedValue(value);
        if (onChange) {
          onChange(value);
        }
      }
    };

    // Set up max wait timer if specified
    if (maxWait && maxWait > delay) {
      maxWaitTimeoutId = setTimeout(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        updateDebouncedValue();
      }, maxWait);
    }

    // Set up main debounce timer
    timeoutId = setTimeout(() => {
      if (maxWaitTimeoutId) {
        clearTimeout(maxWaitTimeoutId);
        maxWaitTimeoutId = null;
      }
      updateDebouncedValue();
    }, delay);

    // Cleanup function
    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (maxWaitTimeoutId) {
        clearTimeout(maxWaitTimeoutId);
      }
    };
  }, [value, delay, enabled, onChange, maxWait, debouncedValue]);

  // When disabled, return value directly; otherwise return debounced value
  return enabled ? debouncedValue : value;
}

/**
 * useDebounceWithCancel Hook
 *
 * Returns the debounced value and a cancel function to cancel pending updates.
 *
 * @template T - Type of the value to debounce
 * @param value - The value to debounce
 * @param options - Configuration options
 * @returns A tuple containing the debounced value and a cancel function
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState('');
 * const [debouncedQuery, cancelDebounce] = useDebounceWithCancel(query, {
 *   delay: 300
 * });
 *
 * const handleCancel = () => {
 *   cancelDebounce();
 *   // Do something else
 * };
 * ```
 */
export function useDebounceWithCancel<T>(
  value: T,
  options: UseDebounceOptions<T> = {}
): [T, () => void] {
  const { delay = 500, enabled = true, onChange, maxWait } = options;
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [cancelKey, setCancelKey] = useState(0);

  useEffect(() => {
    // If debouncing is disabled, handle onChange callback only
    if (!enabled) {
      if (onChange && debouncedValue !== value) {
        onChange(value);
      }
      return;
    }

    if (debouncedValue === value) {
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;
    let maxWaitTimeoutId: NodeJS.Timeout | null = null;
    let isCancelled = false;
    const localCancelKey = cancelKey;

    const updateDebouncedValue = () => {
      if (!isCancelled && localCancelKey === cancelKey) {
        setDebouncedValue(value);
        if (onChange) {
          onChange(value);
        }
      }
    };

    if (maxWait && maxWait > delay) {
      maxWaitTimeoutId = setTimeout(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        updateDebouncedValue();
      }, maxWait);
    }

    timeoutId = setTimeout(() => {
      if (maxWaitTimeoutId) {
        clearTimeout(maxWaitTimeoutId);
        maxWaitTimeoutId = null;
      }
      updateDebouncedValue();
    }, delay);

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (maxWaitTimeoutId) {
        clearTimeout(maxWaitTimeoutId);
      }
    };
  }, [value, delay, enabled, onChange, maxWait, debouncedValue, cancelKey]);

  const cancel = () => {
    setCancelKey(prev => prev + 1);
  };

  // When disabled, return value directly; otherwise return debounced value
  return [enabled ? debouncedValue : value, cancel];
}
