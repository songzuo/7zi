import js from "@eslint/js";

/**
 * 7zi-backend ESLint 扁平配置（ESLint 9）
 *
 * 背景：仓库根 eslint.config.mjs 把 `7zi-backend/**` 列入 ignores，
 * 而本目录此前没有自己的配置 —— 导致 `npm run lint`（CI 门禁依赖它）
 * 以 exit=2 报 "all of the files matching the glob pattern are ignored"，
 * 等于后端从未被任何 ESLint 检查过。
 */
export default [
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "**/node_modules/**",
      // 示例片段：仅供复制粘贴，不是可运行模块（引用了外部的 server/engine/app 变量）
      "workflow-engine/websocket-integration-example.js",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        process: "readonly",
        require: "readonly",
        module: "writable",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        URL: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        fetch: "readonly",
        jest: "readonly",
        describe: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        it: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
];
