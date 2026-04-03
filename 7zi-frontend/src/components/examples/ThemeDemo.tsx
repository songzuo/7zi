'use client';

/**
 * Theme Demo Component
 * Demonstrates the theme system in action
 */

import React, { useState } from 'react';
import { ThemeSwitcher, useTheme } from '@/lib/theme';

export function ThemeDemo() {
  const { resolvedTheme, mode, timeBasedEnabled, systemTheme } = useTheme();
  const [showCode, setShowCode] = useState(false);
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Theme System Demo</h1>
        <p className="text-gray-600 dark:text-gray-400">
          v1.12.0 深色模式主题管理系统
        </p>
      </div>
      
      {/* Theme Switcher */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Theme Switcher</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <ThemeSwitcher variant="dropdown" showLabel />
          <ThemeSwitcher variant="button" showLabel />
          <ThemeSwitcher variant="icon" size="lg" />
        </div>
      </div>
      
      {/* Current Theme Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Theme Status</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Mode:</span>
              <span className="font-mono font-semibold">{mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Resolved:</span>
              <span className="font-mono font-semibold">{resolvedTheme}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">System:</span>
              <span className="font-mono font-semibold">{systemTheme}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Time-based:</span>
              <span className="font-mono font-semibold">
                {timeBasedEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Test</h2>
          <div className="space-y-4">
            <button
              onClick={() => {
                const currentHour = new Date().getHours();
                const isDay = currentHour >= 6 && currentHour < 18;
                alert(`Current time: ${currentHour}:00\n${isDay ? 'Daytime ☀️' : 'Nighttime 🌙'}`);
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            >
              Check Time-based Theme
            </button>
            <button
              onClick={() => setShowCode(!showCode)}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg ml-2"
            >
              {showCode ? 'Hide' : 'Show'} CSS Variables
            </button>
          </div>
        </div>
      </div>
      
      {/* Color Palette */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Color Palette</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Background', var: '--color-background' },
            { name: 'Surface', var: '--color-surface' },
            { name: 'Primary', var: '--color-primary' },
            { name: 'Success', var: '--color-success' },
            { name: 'Warning', var: '--color-warning' },
            { name: 'Error', var: '--color-error' },
            { name: 'Text Primary', var: '--color-text-primary' },
            { name: 'Border', var: '--color-border' },
          ].map((color) => (
            <div key={color.name} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div
                className="h-16"
                style={{ backgroundColor: `var(${color.var})` }}
              />
              <div className="p-2 text-sm">
                <div className="font-medium">{color.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                  {color.var}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Code Block Example */}
      {showCode && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Code Example</h2>
          <pre
            className="p-4 rounded-lg overflow-x-auto"
            style={{
              backgroundColor: 'var(--color-code-background)',
              color: 'var(--color-code-text)',
            }}
          >
            <code>{`// Using the theme system
import { useTheme } from '@/lib/theme';

function MyComponent() {
  const { resolvedTheme, toggle } = useTheme();
  
  return (
    <div className="bg-white dark:bg-gray-900 p-4">
      <h1>Theme: {resolvedTheme}</h1>
      <button onClick={toggle}>Toggle Theme</button>
    </div>
  );
}`}</code>
          </pre>
        </div>
      )}
      
      {/* Component Examples */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Component Examples</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Buttons */}
          <div className="space-y-2">
            <h3 className="font-medium">Buttons</h3>
            <div className="flex flex-wrap gap-2">
              <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                Primary
              </button>
              <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg">
                Success
              </button>
              <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg">
                Error
              </button>
            </div>
          </div>
          
          {/* Inputs */}
          <div className="space-y-2">
            <h3 className="font-medium">Inputs</h3>
            <input
              type="text"
              placeholder="Enter text..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
            />
          </div>
          
          {/* Cards */}
          <div className="space-y-2">
            <h3 className="font-medium">Cards</h3>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              Card content
            </div>
          </div>
          
          {/* Badges */}
          <div className="space-y-2">
            <h3 className="font-medium">Badges</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                Info
              </span>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm">
                Success
              </span>
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-sm">
                Warning
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
