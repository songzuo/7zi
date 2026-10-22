import js from '@eslint/js'
import globals from 'globals'

/**
 * 7zi-backend ESLint flat config
 *
 * 注意：ESLint 9 flat config 中，某个 config 对象若带 `files` 却缺少 `ignores`，
 * 会被视为「全局忽略」该模式下的所有文件 —— 表现为 `npx eslint .` 报
 * "all files ignored"、lint 实际空跑。这里显式声明 ignores 避免该陷阱。
 */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/coverage/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/standalone/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      eqeqeq: ['warn', 'smart'],
      'prefer-const': 'warn',
      'no-var': 'warn',
    },
  },
]
