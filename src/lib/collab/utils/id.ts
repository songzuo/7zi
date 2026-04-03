/**
 * Utility functions for collaboration system
 */

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate color from string
 */
export function stringToColor(str: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8B500', '#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9',
  ];

  const hash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge vector clocks
 */
export function mergeVectorClocks(
  clock1: Map<string, number>,
  clock2: Map<string, number>
): Map<string, number> {
  const merged = new Map<string, number>();

  for (const [key, value] of Array.from(clock1.entries())) {
    merged.set(key, value);
  }

  for (const [key, value] of Array.from(clock2.entries())) {
    const existing = merged.get(key) || 0;
    merged.set(key, Math.max(existing, value));
  }

  return merged;
}

/**
 * Compare vector clocks
 * Returns: 1 if clock1 > clock2, -1 if clock1 < clock2, 0 if equal
 */
export function compareVectorClocks(
  clock1: Map<string, number>,
  clock2: Map<string, number>
): number {
  let greater = false;
  let lesser = false;

  const allKeys = new Set([...Array.from(clock1.keys()), ...Array.from(clock2.keys())]);

  for (const key of Array.from(allKeys)) {
    const v1 = clock1.get(key) || 0;
    const v2 = clock2.get(key) || 0;

    if (v1 > v2) {
      greater = true;
    } else if (v1 < v2) {
      lesser = true;
    }
  }

  if (greater && !lesser) return 1;
  if (lesser && !greater) return -1;
  return 0;
}

/**
 * Calculate position from line and column
 */
export function positionFromLineColumn(
  text: string,
  line: number,
  column: number
): number {
  const lines = text.split('\n');
  let position = 0;

  for (let i = 0; i < line && i < lines.length; i++) {
    position += lines[i].length + 1; // +1 for newline
  }

  // Clamp position to text length
  return Math.min(position + column, text.length);
}

/**
 * Calculate line and column from position
 */
export function lineColumnFromPosition(
  text: string,
  position: number
): { line: number; column: number } {
  const lines = text.split('\n');
  let currentPos = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1; // +1 for newline

    if (currentPos + lineLength > position) {
      return {
        line: i,
        column: position - currentPos,
      };
    }

    currentPos += lineLength;
  }

  return {
    line: lines.length - 1,
    column: lines[lines.length - 1]?.length || 0,
  };
}

/**
 * Format timestamp
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

/**
 * Calculate time difference
 */
export function timeDifference(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}