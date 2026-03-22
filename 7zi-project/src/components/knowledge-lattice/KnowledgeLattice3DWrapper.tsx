'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

/**
 * KnowledgeLattice3D Component Wrapper
 *
 * Uses dynamic import to avoid loading three.js (~38MB) on initial page load.
 * This component is only used on the /knowledge-lattice page.
 */
const KnowledgeLattice3D: ComponentType = dynamic(
  () => import('./KnowledgeLattice3D').then((mod) => mod.KnowledgeLattice3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading 3D visualization...</p>
        </div>
      </div>
    ),
  }
);

export { KnowledgeLattice3D };
