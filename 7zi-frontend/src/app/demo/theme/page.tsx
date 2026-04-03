'use client';

/**
 * Theme Demo Page
 * Demonstrates the theme management system
 */

import { ThemeDemo } from '@/components/examples/ThemeDemo';

export default function ThemeDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <ThemeDemo />
    </div>
  );
}
