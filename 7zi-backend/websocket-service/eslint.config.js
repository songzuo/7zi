/**
 * websocket-service 独立 ESLint 扁平配置（ESLint 9）
 *
 * 背景：
 * - 此前本子服务没有自己的配置，只能继承 7zi-backend/eslint.config.js。
 *   而父配置把 sourceType 设成 'module'，websocket-service 实际是 CommonJS
 *   （require / module.exports），规则与真实代码形态不匹配，lint 结果不可信。
 * - 单独抽出配置后，`npm run lint` 在本子服务目录内即可得到真实结果。
 *
 * 说明：eslint 二进制由仓库根 7zi-backend/node_modules 提供（workspace 提升），
 * 本配置不引入新依赖。
 */

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      eqeqeq: ['warn', 'smart'],
      'prefer-const': 'warn',
      'no-var': 'warn',
    },
  },
];
