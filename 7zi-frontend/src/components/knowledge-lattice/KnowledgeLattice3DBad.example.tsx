'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * ⚠️ This is a BAD example - imports THREE directly at the top level
 * This would cause Three.js (~38MB) to be bundled in the main chunk,
 * affecting all pages' initial load time
 */
export function KnowledgeLattice3DBad({ nodes = [] }: { nodes?: any[] }) {
  // Component logic (same as the good version)
  // ... but THREE is imported at the top, causing bundle bloat
  return <div>Bad implementation - see page.tsx for the fix</div>;
}
