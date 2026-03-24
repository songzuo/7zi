'use client';

import dynamic from 'next/dynamic';

const LazyAnalytics = dynamic(() => import('@/components/Analytics'), {
  ssr: false,
  loading: () => null,
});

export function ClientAnalytics() {
  return <LazyAnalytics />;
}
