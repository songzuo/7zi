import js from "@eslint/js";
import tseslint from "typescript-eslint";

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
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
