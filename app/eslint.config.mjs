// ESLint Flat Config for Next.js + TypeScript + Storybook
import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import storybook from "eslint-plugin-storybook";

export default [
  // Ignore patterns
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "docs/**",
      "*.config.js",
      "*.config.mjs",
      "coverage/**",
    ],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript files
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Node.js globals
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "writable",
        global: "writable",
        
        // Browser globals
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        FormData: "readonly",
        Headers: "readonly",
        Request: "readonly",
        Response: "readonly",
        AbortController: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        alert: "readonly",
        confirm: "readonly",
        prompt: "readonly",
        React: "readonly",
        memo: "readonly",
        useMemo: "readonly",
        useCallback: "readonly",
        useEffect: "readonly",
        useState: "readonly",
        useRef: "readonly",
        useReducer: "readonly",
        useContext: "readonly",
        useLayoutEffect: "readonly",
        JSX: "readonly",
        
        // DOM and Browser API types
        HTMLImageElement: "readonly",
        HTMLCanvasElement: "readonly",
        MediaQueryListEvent: "readonly",
        Image: "readonly",
        Event: "readonly",
        CustomEvent: "readonly",
        MutationObserver: "readonly",
        IntersectionObserver: "readonly",
        ResizeObserver: "readonly",
        PerformanceObserver: "readonly",
        PerformanceObserverEntryList: "readonly",
        WebSocket: "readonly",
        Worker: "readonly",
        File: "readonly",
        Blob: "readonly",
        FileReader: "readonly",
        FileList: "readonly",
        HTMLSelectElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLAnchorElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLFormElement: "readonly",
        HTMLElement: "readonly",
        HTMLScriptElement: "readonly",
        SVGGElement: "readonly",
        Node: "readonly",
        EventTarget: "readonly",
        KeyboardEvent: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        performance: "readonly",
        PerformanceEntry: "readonly",
        FrameRequestCallback: "readonly",
        HeadersInit: "readonly",
        NodeJS: "readonly",
        
        // WebSocket events
        MessageEvent: "readonly",
        CloseEvent: "readonly",
        
        // Notification API
        Notification: "readonly",
        NotificationPermission: "readonly",
        NotificationOptions: "readonly",
        
        // Export types (used in components)
        ExportFormat: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
    },
    rules: {
      // TypeScript rules
      ...typescript.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "off",

      // General rules
      "no-console": "warn",
      "no-debugger": "warn",
      "no-unused-vars": "off", // Use TypeScript's version
      "no-undef": "off", // TypeScript handles this
      "no-redeclare": "off", // TypeScript handles this
      
      // TypeScript specific
      "@typescript-eslint/ban-ts-comment": "warn",
    },
  },

  // Storybook rules
  ...storybook.configs["flat/recommended"],
];