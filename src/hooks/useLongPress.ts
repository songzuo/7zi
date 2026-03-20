/**
 * @fileoverview Long press gesture hook for mobile interactions
 */

import { RefObject, useCallback, useRef, useState, useEffect } from 'react';

interface UseLongPressOptions {
  delay?: number;
  threshold?: number; // Max movement allowed (pixels)
  onLongPress?: (e: React.TouchEvent | React.MouseEvent) => void;
  onClick?: (e: React.TouchEvent | React.MouseEvent) => void;
  shouldPreventDefault?: boolean;
}

/**
 * Hook for long press gesture detection
 * Prevents click from firing after long press
 */
export function useLongPress<T extends HTMLElement>(
  options: UseLongPressOptions = {}
) {
  const {
    delay = 500,
    threshold = 10,
    onLongPress,
    onClick,
    shouldPreventDefault = true,
  } = options;

  const [isLongPressing, setIsLongPressing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>(undefined);
  const startPosRef = useRef({ x: 0, y: 0 });
  const isLongPressTriggeredRef = useRef(false);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault?.();

      // Get start position
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
      startPosRef.current = { x, y };

      isLongPressTriggeredRef.current = false;

      // Set timeout for long press
      timeoutRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        setIsLongPressing(true);
        onLongPress?.(e);

        // Haptic feedback (vibrate)
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }, delay);
    },
    [delay, onLongPress]
  );

  const move = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!shouldPreventDefault) return;

      // Check if movement exceeds threshold
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = Math.abs(x - startPosRef.current.x);
      const deltaY = Math.abs(y - startPosRef.current.y);

      // If moved too much, cancel long press
      if (deltaX > threshold || deltaY > threshold) {
        clearTimeout(timeoutRef.current);
      }
    },
    [shouldPreventDefault, threshold]
  );

  const end = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      clearTimeout(timeoutRef.current);

      // If long press was triggered, prevent click
      if (isLongPressTriggeredRef.current) {
        e.preventDefault?.();
        setIsLongPressing(false);
        return;
      }

      // Otherwise, trigger click
      onClick?.(e);
    },
    [onClick]
  );

  const clear = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setIsLongPressing(false);
    isLongPressTriggeredRef.current = false;
  }, []);

  // Memoized event handlers
  const handlers = {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
    onTouchCancel: clear,
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: end,
    onMouseLeave: clear,
  };

  return {
    handlers,
    isLongPressing,
  };
}
