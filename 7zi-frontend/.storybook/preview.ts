import type { Preview, ReactRenderer } from '@storybook/nextjs-vite'
import { withThemeFromJSXProvider } from '@storybook/addon-themes'
import type { DecoratorFunction } from '@storybook/types'
import React from 'react'
import '../src/styles/tokens.css'
import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1a1a1a' },
        { name: 'gray', value: '#f3f4f6' },
      ],
    },
    layout: 'padded',
    docs: {
      toc: true,
    },
    options: {
      storySort: {
        order: [
          'Design Tokens',
          ['Colors', 'Typography', 'Spacing', 'Breakpoints'],
          'Components',
          ['Button', 'Input', 'Card', 'Modal'],
        ],
      },
    },
  },
}

export default preview
