/**
 * @fileoverview Touch gesture hooks for mobile interactions
 */

import { RefObject, useState, useRef, useCallback, useEffect } from 'react';

interface UseSwipeGesturesOptions {
  threshold?: number;
  restraint?: number;
  allowedTime?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeState {
  isDragging: boolean;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
}

/**
 * Hook for swipe gesture detection
 * Supports touch and mouse events
 */
export function useSwipeGestures<T extends HTMLElement>(
  ref: RefObject<T>,
  options: UseSwipeGesturesOptions = {}
) {
  const {
    threshold = 50,
    restraint = 100,
    allowedTime = 300,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  } = options;

  const [swipeState, setSwipeState] = useState<SwipeState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0,
  });

  const startTimeRef = useRef(0);
  const isSwipeTriggeredRef = useRef(false);

  const handleStart = useCallback(
    (x: number, y: number) => {
      startTimeRef.current = Date.now();
      isSwipeTriggeredRef.current = false;
      setSwipeState({
        isDragging: true,
        startX: x,
        startY: y,
        deltaX: 0,
        deltaY: 0,
      });
    },
    []
  );

  const handleMove = useCallback(
    (x: number, y: number) => {
      if (!swipeState.isDragging) return;

      const deltaX = x - swipeState.startX;
      const deltaY = y - swipeState.startY;

      // Check if swipe should trigger
      const elapsedTime = Date.now() - startTimeRef.current;
      if (elapsedTime > allowedTime && !isSwipeTriggeredRef.current) {
        // Check swipe direction
        if (Math.abs(deltaX) > threshold && Math.abs(deltaY) < restraint) {
          if (deltaX > 0) {
            onSwipeRight?.();
          } else {
            onSwipeLeft?.();
          }
          isSwipeTriggeredRef.current = true;
        } else if (Math.abs(deltaY) > threshold && Math.abs(deltaX) < restraint) {
          if (deltaY > 0) {
            onSwipeDown?.();
          } else {
            onSwipeUp?.();
          }
          isSwipeTriggeredRef.current = true;
        }
      }

      setSwipeState((prev) => ({
        ...prev,
        deltaX,
        deltaY,
      }));
    },
    [swipeState.isDragging, swipeState.startX, swipeState.startY, threshold, restraint, allowedTime, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]
  );

  const handleEnd = useCallback(() => {
    setSwipeState({
      isDragging: false,
      startX: 0,
      startY: 0,
      deltaX: 0,
      deltaY: 0,
    });
  }, []);

  // Touch events
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const onTouchEnd = () => {
      handleEnd();
    };

    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: true });
    element.addEventListener('touchend', onTouchEnd);
    element.addEventListener('touchcancel', onTouchEnd);

    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [ref, handleStart, handleMove, handleEnd]);

  // Mouse events (for desktop testing)
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const onMouseDown = (e: MouseEvent) => {
      handleStart(e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      handleEnd();
    };

    const onMouseLeave = () => {
      handleEnd();
    };

    element.addEventListener('mousedown', onMouseDown);
    element.addEventListener('mousemove', onMouseMove);
    element.addEventListener('mouseup', onMouseUp);
    element.addEventListener('mouseleave', onMouseLeave);

    return () => {
      element.removeEventListener('mousedown', onMouseDown);
      element.removeEventListener('mousemove', onMouseMove);
      element.removeEventListener('mouseup', onMouseUp);
      element.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [ref, handleStart, handleMove, handleEnd]);

  return { swipeState };
}
