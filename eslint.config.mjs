// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { dirname } from "path";
import { fileURLToPath } from "url";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [...nextVitals, ...nextTs, {
  // Override default ignores of eslint-config-next
  ignores: [
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional ignores - Built/minified files
    "node_modules/**",
    "dist/**",
    "html/**",
    "**/*.min.js",
    "**/*.min.css",
    "public/**",
    // Backup and archive directories
    "_app_backup/**",
    "archive/**",
    "**/backup/**",
    // Test files (complex mock types, use @ts-nocheck)
    "src/test/**",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "__tests__/**",
    "__mocks__/**",
    // Config files
    "*.config.js",
    "*.config.ts",
    "*.config.mjs",
    // Migration scripts
    "*-migration*.js",
    "validate-*.js",
    "verify-*.js",
    // 7zi-frontend specific
    "7zi-frontend/html/**",
    "7zi-frontend/.next/**",
    "7zi-frontend/out/**",
  ],
}, {
  rules: {
    // Allow underscore-prefixed variables to be unused
    "@typescript-eslint/no-unused-vars": ["warn", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_",
      "caughtErrorsIgnorePattern": "^_"
    }]
  }
}, ...storybook.configs["flat/recommended"]];

export default eslintConfig;
