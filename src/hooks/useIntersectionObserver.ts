'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  triggerOnce?: boolean;
  freezeOnceVisible?: boolean;
}

interface UseIntersectionObserverReturn {
  ref: React.RefObject<HTMLElement | null>;
  isIntersecting: boolean;
  entry?: IntersectionObserverEntry;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn {
  const {
    threshold = 0,
    rootMargin = '0px',
    triggerOnce = false,
    freezeOnceVisible = false,
  } = options;

  const ref = useRef<HTMLElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry>();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([observedEntry]) => {
        setEntry(observedEntry);
        setIsIntersecting(observedEntry.isIntersecting);

        if (observedEntry.isIntersecting && (triggerOnce || freezeOnceVisible)) {
          observer.unobserve(element);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, triggerOnce, freezeOnceVisible]);

  return { ref, isIntersecting, entry };
}

// Hook for animating elements when they come into view
export function useAnimateOnView(
  animationClass: string = 'animate-in fade-in slide-up-8',
  options: UseIntersectionObserverOptions = { threshold: 0.1, triggerOnce: true }
): {
  ref: React.RefObject<HTMLElement | null>;
  isVisible: boolean;
  className: string;
} {
  const { ref, isIntersecting } = useIntersectionObserver(options);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isIntersecting && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isIntersecting, hasAnimated]);

  return {
    ref,
    isVisible: hasAnimated,
    className: hasAnimated ? animationClass : 'opacity-0',
  };
}

// Hook for counting up animation when element is visible
export function useCountUp(
  end: number,
  duration: number = 2000,
  options: UseIntersectionObserverOptions = { threshold: 0.5 }
): {
  ref: React.RefObject<HTMLElement | null>;
  count: number;
  isAnimating: boolean;
} {
  const { ref, isIntersecting } = useIntersectionObserver(options);
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isIntersecting || isAnimating) return;

    setIsAnimating(true);
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setCount(Math.floor(easeOut * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isIntersecting, end, duration, isAnimating]);

  return { ref, count, isAnimating };
}
