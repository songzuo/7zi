/**
 * React Compiler Configuration
 * 
 * 可选的 React Compiler 配置，支持细粒度控制
 * - 环境变量启用/禁用
 * - 文件级别白名单/黑名单
 * - 组件级别开关
 */

export interface ReactCompilerConfig {
  /** 是否启用 React Compiler */
  enabled: boolean;
  /** 编译模式: 'opt-in' | 'opt-out' | 'all' */
  mode: 'opt-in' | 'opt-out' | 'all';
  /** 白名单文件/目录 (mode: 'opt-in') */
  include?: string[];
  /** 黑名单文件/目录 (mode: 'opt-out') */
  exclude?: string[];
  /** 编译器选项 */
  options?: {
    /** 是否启用严格模式 */
    strictMode?: boolean;
    /** 是否生成 source map */
    sourceMaps?: boolean;
    /** 目标环境 */
    target?: 'es2015' | 'es2016' | 'es2017' | 'es2018' | 'es2019' | 'es2020' | 'es2021' | 'es2022';
  };
}

/**
 * 获取 React Compiler 配置
 */
export function getReactCompilerConfig(): ReactCompilerConfig {
  const enabled = process.env.ENABLE_REACT_COMPILER === 'true';
  const mode = (process.env.REACT_COMPILER_MODE as ReactCompilerConfig['mode']) || 'opt-out';
  
  const config: ReactCompilerConfig = {
    enabled,
    mode,
    exclude: [
      'node_modules',
      'src/components/third-party',
      'src/lib/legacy',
    ],
    options: {
      strictMode: true,
      sourceMaps: process.env.NODE_ENV === 'development',
      target: 'es2020',
    },
  };

  // 根据模式设置不同的默认值
  if (mode === 'opt-in') {
    config.include = [
      'src/components/features',
      'src/components/dashboard',
      'src/components/tasks',
    ];
  }

  return config;
}

/**
 * 检查文件是否应该被编译
 */
export function shouldCompile(filePath: string, config: ReactCompilerConfig): boolean {
  if (!config.enabled) {
    return false;
  }

  // 标准化路径
  const normalizedPath = filePath.replace(/\\/g, '/');

  // 检查黑名单
  if (config.exclude) {
    for (const excludePath of config.exclude) {
      if (normalizedPath.includes(excludePath)) {
        return false;
      }
    }
  }

  // 根据模式决定
  if (config.mode === 'all') {
    return true;
  }

  if (config.mode === 'opt-in') {
    if (config.include) {
      for (const includePath of config.include) {
        if (normalizedPath.includes(includePath)) {
          return true;
        }
      }
    }
    return false;
  }

  // mode === 'opt-out' (默认)
  return true;
}

/**
 * 获取 Next.js React Compiler 配置
 */
export function getNextReactCompilerConfig() {
  const config = getReactCompilerConfig();
  
  if (!config.enabled) {
    return {};
  }

  return {
    experimental: {
      reactCompiler: true,
      reactCompilerConfig: {
        target: config.options?.target || 'es2020',
        sources: (filename: string) => shouldCompile(filename, config),
      },
    },
  };
}

/**
 * 默认配置
 */
export const DEFAULT_REACT_COMPILER_CONFIG: ReactCompilerConfig = {
  enabled: false,
  mode: 'opt-out',
  exclude: [
    'node_modules',
    'src/components/third-party',
  ],
  options: {
    strictMode: true,
    sourceMaps: true,
    target: 'es2020',
  },
};
