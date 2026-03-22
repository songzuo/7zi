'use client';

import { useState, useEffect, RefObject } from 'react';

export function useIntersectionObserver(
  ref: RefObject<Element>,
  options?: IntersectionObserverInit
): [IntersectionObserverEntry | null, boolean] {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      setEntry(e);
      setIsVisible(e.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return [entry, isVisible];
}
