import { dirname } from "path";
import { fileURLToPath } from "url";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    // Override default ignores of eslint-config-next
    ignores: [
      // Default ignores of eslint-config-next:
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Additional ignores
      "app/.next/**",
      "node_modules/**",
      "dist/**",
      "html/**",
      // Backup directories
      "_app_backup/**",
      // Test files (complex mock types, use @ts-nocheck)
      "src/test/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "__tests__/**",
      "__mocks__/**",
    ],
  },
];

export default eslintConfig;
