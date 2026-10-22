import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      ".storybook/**",
      "__mocks__/**",
      "node_modules/**",
      ".next/**",
      "**/node_modules/**",
      // next-pwa 构建期生成物（非手写源码，不参与 lint）
      "public/workbox-*.js",
      "public/sw.js",
      "public/workbox-*.js.map",
      "typescript-any-fixes.ts",
      "verify-websocket-stability.ts",
      "**/*.test.ts",
      "**/*.test.tsx",
      "tests/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // 启用 exhaustive-deps（warn 级）：源码中已有多处 eslint-disable 注释引用该规则，
      // 此前规则未注册导致这些注释变成 "Unused eslint-disable directive" 警告，
      // 且 hook 依赖问题完全不可见。v7 其余推荐规则（rules-of-hooks 等）不启用。
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
    languageOptions: {
      globals: {
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        process: "readonly",
        global: "readonly",
        require: "readonly",
        module: "writable",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
      },
    },
  },
];
