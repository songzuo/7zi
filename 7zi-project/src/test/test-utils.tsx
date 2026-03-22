/**
 * @fileoverview Test utilities for wrapping components with providers
 */
import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';

// Mock messages for testing
const testMessages = {
  'common': {
    'loading': 'Loading...',
    'error': 'Error',
  },
  'Navigation': {
    'home': '首页',
    'dashboard': '实时看板',
    'subagents': '子代理',
    'tasks': '任务',
    'memory': '记忆',
  },
};

/**
 * Creates a test wrapper with all necessary providers
 * @param children - React children to wrap
 * @param locale - Locale to use (default: 'zh')
 * @param messages - Optional custom messages
 */
export function createTestWrapper(
  children: ReactNode,
  locale: string = 'zh',
  messages: Record<string, Record<string, string>> = testMessages
) {
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}

/**
 * Default test wrapper for components that need next-intl
 */
export const TestWrapper = {
  /**
   * Wrap component with full providers
   */
  withProviders: createTestWrapper,
  
  /**
   * Wrap component with only NextIntlClientProvider (lightweight)
   */
  withIntl: (children: ReactNode, locale: string = 'zh') => (
    <NextIntlClientProvider messages={testMessages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  ),
};
