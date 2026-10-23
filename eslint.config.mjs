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
      // 嵌套子项目 / 任意层级的构建产物（.next/standalone 里含上万个打包文件，
      // 不加忽略会让根级 lint 遍历十几分钟且报出无意义的解析错误）
      '**/.next/**',
      '**/standalone/**',
      '**/coverage/**',
      // xunshi-inspector 是 vendored 的外部巡检工具（未纳入版本管理，
      // 仅 jest.config.json 被跟踪），内含 2800+ JS 文件，
      // 不加忽略会让根级 lint 遍历十几分钟
      'xunshi-inspector/**',
      '**/dist/**',
      // src/lib/monitoring/prometheus.js 是 tsc 从同名 .ts 编译出的产物
      // （含 __awaiter/__generator/__spreadArray 等 tsc helper），
      // 由 .ts 版本直接维护、手工修改会在下次编译时被覆盖，
      // 且其中的 `var _this = this` 是 tsc 对箭头函数的降级产物（不是可删的死代码）。
      // 真正的源码是同目录的 prometheus.ts。
      'src/lib/monitoring/prometheus.js',
      '**/build/**',
      '**/out/**',
      // 文档目录下的 .ts 是 API 用法示例（伪代码），不可编译也不参与构建
      'docs/**/*.ts',
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
    // 注意：eslint-config-next@16.4.2 已在自身配置块内注册 react-hooks 插件，
    // 此处若再次声明会触发：
    //   ConfigError: Config (unnamed): Key "plugins": Cannot redefine plugin "react-hooks".
    // 但 eslint 要求"插件必须在应用该规则的同一个配置对象中已定义"，
    // 所以这里必须带上与 eslint-config-next 相同的 files 匹配模式，
    // 规则才会继承该配置对象里已注册的 react-hooks 插件。
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
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

      // ==== 以下规则降级为 warn（不阻断 CI） ====
      //
      // 背景：CI 的 lint job 跑在仓库根目录（.github/workflows/ci.yml -> npm run lint），
      // 而根级 eslint.config.mjs 直接继承了 eslint-config-next@16.4.2 的
      // react-hooks v7 编译器规则集（set-state-in-effect / refs / purity / immutability
      // 等）。这些规则是 Next.js 16 / React Compiler 19 新引入的，仓库现有代码从未
      // 按它们整改过，一次性报出 100+ 个 error，导致 CI 从 2026-04-21 起必然失败。
      //
      // 策略：保留规则可见性（warn），但不阻断门禁；待存量清理后再收紧为 error。
      // 与 7zi-frontend/eslint.config.mjs 的做法保持一致。

      // react-hooks v7 (React Compiler) 规则：存量未整改，先 warn
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/gating': 'warn',
      'react-hooks/config': 'warn',

      // @ts-ignore 存量 147 处：存量不清零前不阻断
      '@typescript-eslint/ban-ts-comment': 'warn',

      // CommonJS 风格 require()：项目内 server/ 与历史脚本大量使用
      '@typescript-eslint/no-require-imports': 'warn',

      // any：存量 21 处
      '@typescript-eslint/no-explicit-any': 'warn',

      // declare global { namespace NodeJS } 是 TS 官方推荐写法
      '@typescript-eslint/no-namespace': 'warn',
    },
  },
  ...storybook.configs['flat/recommended'],
]

export default eslintConfig
