/**
 * Tabs Component
 *
 * A responsive tab component with horizontal and vertical layouts.
 *
 * @module components/ui/Tabs
 */

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

/**
 * Tabs context interface
 */
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  variant: 'underline' | 'enclosed' | 'soft-rounded';
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Tabs context
 */
const TabsContext = createContext<TabsContextValue | undefined>(undefined);

/**
 * Hook to use tabs context
 */
function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within Tabs provider');
  }
  return context;
}

/**
 * Tabs root component props
 */
export interface TabsProps {
  /** Currently active tab */
  defaultValue?: string;
  /** Controlled active tab */
  value?: string;
  /** On change callback */
  onChange?: (tab: string) => void;
  /** Tab variant (default: 'underline') */
  variant?: 'underline' | 'enclosed' | 'soft-rounded';
  /** Tab orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Children components */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * Tabs root component
 */
export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value: controlledValue,
  onChange,
  variant = 'underline',
  orientation = 'horizontal',
  children,
  className,
}) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || '');
  const isControlled = controlledValue !== undefined;
  const activeTab = isControlled ? controlledValue : uncontrolledValue;

  const setActiveTab = useCallback((tab: string) => {
    if (!isControlled) {
      setUncontrolledValue(tab);
    }
    onChange?.(tab);
  }, [isControlled, onChange]);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant, orientation }}>
      <div
        className={cn(
          'w-full',
          orientation === 'vertical' && 'flex gap-4',
          className
        )}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
};

/**
 * Tabs list component props
 */
export interface TabsListProps {
  /** Children components */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * Tabs list component
 */
export const TabsList: React.FC<TabsListProps> = ({ children, className }) => {
  const { variant } = useTabsContext();
  const context = useContext(TabsContext);
  const orientation = context?.orientation ?? 'horizontal';

  const variantClasses = {
    underline: 'border-b border-gray-200 dark:border-gray-700',
    enclosed: 'p-1 bg-gray-100 dark:bg-gray-800 rounded-lg',
    'soft-rounded': '',
  };

  return (
    <div
      role="tablist"
      className={cn(
        'flex',
        orientation === 'vertical' ? 'flex-col' : 'flex-row',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Tab trigger component props
 */
export interface TabTriggerProps {
  /** Tab value */
  value: string;
  /** Tab label */
  label?: string;
  /** Children components */
  children: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Tab trigger component
 */
export const TabTrigger: React.FC<TabTriggerProps> = ({
  value,
  label,
  children,
  disabled = false,
  className,
}) => {
  const { activeTab, setActiveTab, variant } = useTabsContext();
  const tabContext = useContext(TabsContext);
  const orientation = tabContext?.orientation ?? 'horizontal';
  const isActive = activeTab === value;

  const variantClasses = {
    underline: cn(
      'px-4 py-2 font-medium transition-colors border-b-2 -mb-px',
      'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
      'border-transparent hover:border-gray-300 dark:hover:border-gray-600',
      isActive && 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
    ),
    enclosed: cn(
      'px-4 py-2 font-medium transition-all rounded-md',
      'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
      isActive && 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
    ),
    'soft-rounded': cn(
      'px-4 py-2 font-medium transition-colors rounded-lg',
      'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
      isActive && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
    ),
  };

  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(value)}
      className={cn(
        variantClasses[variant],
        disabled && 'opacity-50 cursor-not-allowed',
        orientation === 'vertical' && 'w-full text-left',
        className
      )}
    >
      {label || children}
    </button>
  );
};

/**
 * Tab content component props
 */
export interface TabContentProps {
  /** Tab value */
  value: string;
  /** Children components */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * Tab content component
 */
export const TabContent: React.FC<TabContentProps> = ({ value, children, className }) => {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === value;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      className={cn('py-4', className)}
    >
      {children}
    </div>
  );
};

/**
 * Tab panel component - Alternative to TabContent with animation
 */
export const TabPanel: React.FC<TabContentProps> = ({ value, children, className }) => {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <div
      role="tabpanel"
      className={cn(
        'py-4 transition-all duration-200',
        isActive ? 'animate-in fade-in slide-in-from-bottom-2' : 'hidden',
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Responsive Tabs - Automatically switches to vertical layout on mobile
 */
export const ResponsiveTabs: React.FC<TabsProps & { breakpoint?: 'sm' | 'md' | 'lg' }> = ({
  breakpoint = 'md',
  children,
  ...props
}) => {
  const [isMobile, setIsMobile] = React.useState(true);

  React.useEffect(() => {
    const handleResize = () => {
      const breakpoints = { sm: 640, md: 768, lg: 1024 };
      setIsMobile(window.innerWidth < breakpoints[breakpoint]);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return (
    <Tabs
      orientation={isMobile ? 'vertical' : 'horizontal'}
      {...props}
    >
      {children}
    </Tabs>
  );
};

export default Tabs;
