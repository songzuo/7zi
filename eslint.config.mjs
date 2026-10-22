// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

import { dirname } from 'path'
import { fileURLToPath } from 'url'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    // Override default ignores of eslint-config-next
    ignores: [
      // Default ignores of eslint-config-next:
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      // Additional ignores - Built/minified files
      'node_modules/**',
      'dist/**',
      'html/**',
      '**/*.min.js',
      '**/*.min.css',
      'public/**',
      // Backup and archive directories
      '_app_backup/**',
      'archive/**',
      '**/backup/**',
      // Test files (complex mock types, use @ts-nocheck)
      'src/test/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '__tests__/**',
      '__mocks__/**',
      // Config files
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
      // Migration scripts
      '*-migration*.js',
      'validate-*.js',
      'verify-*.js',
      // 7zi-frontend specific
      '7zi-frontend/html/**',
      '7zi-frontend/.next/**',
      '7zi-frontend/out/**',
      // 嵌套子项目：各自有独立 eslint 配置 / 技术栈，由各自目录的 lint 脚本负责。
      // 根级 ESLint 只检查根 src/，否则会重复 lint 且规则集不匹配
      // (例如根配置启用了 react-hooks v7 规则，子项目未启用)。
      '7zi-frontend/**',
      '7zi-backend/**',
      'workflow-engine/**',
      'botmem/**',
      'tests/**',
      'e2e/**',
      'scripts/**',
    ],
  },
  {
    rules: {
      // Allow underscore-prefixed variables to be unused
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  ...storybook.configs['flat/recommended'],
]

export default eslintConfig
