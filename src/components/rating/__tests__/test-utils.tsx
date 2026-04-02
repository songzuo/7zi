/**
 * Test Utilities for Rating Components
 */

import React from 'react'
import { NextIntlClientProvider } from 'next-intl'

/**
 * Wrapper component that provides necessary context for tests
 * Including next-intl provider
 */
export function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={{}}>
      {children}
    </NextIntlClientProvider>
  )
}

/**
 * Custom render function that includes TestWrapper
 */
export function renderWithProviders(ui: React.ReactElement) {
  return <TestWrapper>{ui}</TestWrapper>
}
