import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Backup folders with build artifacts:
    "_app_backup/**",
    // Non-project directories:
    "botmem/**",
    "projects/**",
    "scripts/**",
    "performance/**",
    "ecosystem.config.js",
  ]),
  // Disable unused vars and img warnings for test files
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "e2e/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@next/next/no-img-element": "off",
    },
  },
  // Allow unused vars starting with underscore for all files
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
]);

export default eslintConfig;
