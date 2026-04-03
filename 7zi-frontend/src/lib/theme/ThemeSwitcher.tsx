/**
 * ThemeSwitcher Component
 * A dropdown/modal component for switching between themes
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from './ThemeContext';
import { useThemeSwitch } from './useThemeSwitch';
import type { ThemeMode } from './theme-config';

interface ThemeOption {
  value: ThemeMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface ThemeSwitcherProps {
  /** Show time-based option */
  showTimeBased?: boolean;
  /** Custom className */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show label */
  showLabel?: boolean;
  /** Variant: 'button' | 'dropdown' | 'icon' */
  variant?: 'button' | 'dropdown' | 'icon';
}

/**
 * Sun icon for light theme
 */
function SunIcon({ className = '' }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" 
      />
    </svg>
  );
}

/**
 * Moon icon for dark theme
 */
function MoonIcon({ className = '' }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" 
      />
    </svg>
  );
}

/**
 * Computer icon for system theme
 */
function ComputerIcon({ className = '' }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" 
      />
    </svg>
  );
}

/**
 * Clock icon for time-based
 */
function ClockIcon({ className = '' }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" 
      />
    </svg>
  );
}

/**
 * Chevron down icon
 */
function ChevronDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={2} 
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    icon: <SunIcon />,
    description: 'Always use light theme',
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: <MoonIcon />,
    description: 'Always use dark theme',
  },
  {
    value: 'system',
    label: 'System',
    icon: <ComputerIcon />,
    description: 'Follow system preference',
  },
];

const sizeClasses = {
  sm: {
    button: 'px-2 py-1 text-sm',
    icon: 'w-4 h-4',
    menu: 'w-48 text-sm',
  },
  md: {
    button: 'px-3 py-2 text-base',
    icon: 'w-5 h-5',
    menu: 'w-56 text-sm',
  },
  lg: {
    button: 'px-4 py-3 text-lg',
    icon: 'w-6 h-6',
    menu: 'w-64 text-base',
  },
};

export function ThemeSwitcher({
  showTimeBased = true,
  className = '',
  size = 'md',
  showLabel = false,
  variant = 'dropdown',
}: ThemeSwitcherProps) {
  const { mode, timeBasedEnabled, setTimeBasedEnabled, isLoaded } = useTheme();
  const { setMode, toggle } = useThemeSwitch();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // Close dropdown on escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);
  
  const handleModeChange = (newMode: ThemeMode) => {
    setMode(newMode);
    setIsOpen(false);
  };
  
  const handleTimeBasedToggle = () => {
    setTimeBasedEnabled(!timeBasedEnabled);
  };
  
  const currentOption = themeOptions.find(opt => opt.value === mode);
  
  // Icon-only variant
  if (variant === 'icon') {
    return (
      <button
        onClick={toggle}
        className={`
          rounded-lg transition-colors
          bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800
          text-gray-600 dark:text-gray-300
          ${sizeClasses[size].button}
          ${className}
        `}
        aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {resolvedTheme === 'dark' ? (
          <SunIcon className={sizeClasses[size].icon} />
        ) : (
          <MoonIcon className={sizeClasses[size].icon} />
        )}
      </button>
    );
  }
  
  // Button variant - simple toggle
  if (variant === 'button') {
    return (
      <button
        onClick={toggle}
        className={`
          flex items-center gap-2 rounded-lg transition-colors
          bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
          text-gray-700 dark:text-gray-200
          ${sizeClasses[size].button}
          ${className}
        `}
        aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {resolvedTheme === 'dark' ? (
          <SunIcon className={sizeClasses[size].icon} />
        ) : (
          <MoonIcon className={sizeClasses[size].icon} />
        )}
        {showLabel && (
          <span>{resolvedTheme === 'dark' ? 'Light' : 'Dark'}</span>
        )}
      </button>
    );
  }
  
  // Dropdown variant
  const { resolvedTheme } = useTheme();
  
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 rounded-lg transition-colors
          bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
          text-gray-700 dark:text-gray-200
          ${sizeClasses[size].button}
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {currentOption?.icon}
        {showLabel && <span>{currentOption?.label}</span>}
        <ChevronDownIcon className={`${sizeClasses[size].icon} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div
          className={`
            absolute right-0 mt-2 rounded-lg shadow-lg
            bg-white dark:bg-gray-900
            border border-gray-200 dark:border-gray-700
            ${sizeClasses[size].menu}
            z-50
          `}
          role="listbox"
          aria-label="Theme options"
        >
          <div className="py-1">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleModeChange(option.value)}
                className={`
                  w-full flex items-center gap-3 px-4 py-2 text-left
                  transition-colors
                  ${mode === option.value 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                  }
                `}
                role="option"
                aria-selected={mode === option.value}
              >
                <span className={sizeClasses[size].icon}>{option.icon}</span>
                <div>
                  <div className="font-medium">{option.label}</div>
                  {showLabel && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {option.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
            
            {showTimeBased && mode === 'system' && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button
                  onClick={handleTimeBasedToggle}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2 text-left
                    transition-colors
                    ${timeBasedEnabled 
                      ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                    }
                  `}
                >
                  <span className={sizeClasses[size].icon}>
                    <ClockIcon />
                  </span>
                  <div>
                    <div className="font-medium">Time-based</div>
                    {showLabel && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Auto-switch by time (day/night)
                      </div>
                    )}
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeSwitcher;