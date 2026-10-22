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
      // 仅注册规则定义（源码中的 eslint-disable 注释引用了 exhaustive-deps）。
      // 不启用 react-hooks v7 的推荐规则集，避免一次性引入 200+ 新错误。
      "react-hooks/exhaustive-deps": "off",
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
