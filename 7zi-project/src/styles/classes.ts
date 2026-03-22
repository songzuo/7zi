/**
 * @fileoverview 共享样式类
 * @description 统一管理重复使用的 Tailwind 样式类组合
 */

// ============================================================================
// 表单输入样式
// ============================================================================

export const inputBaseClasses = `
  w-full px-6 py-4 rounded-2xl
  bg-zinc-50 dark:bg-zinc-800
  border border-zinc-200 dark:border-zinc-700
  text-zinc-900 dark:text-white
  focus:outline-none focus:border-cyan-500
  transition-colors
`;

export const inputErrorClasses = `
  border-red-500 focus:border-red-500
`;

export const labelClasses = `
  block text-sm font-medium
  text-zinc-700 dark:text-zinc-300
  mb-2
`;

export const errorMessageClasses = `
  mt-2 text-sm text-red-500
`;

// ============================================================================
// 按钮样式
// ============================================================================

export const buttonPrimaryClasses = `
  px-6 py-3
  bg-gradient-to-r from-cyan-500 to-purple-600
  text-white rounded-full font-semibold
  hover:shadow-lg hover:shadow-cyan-500/25
  transition-all hover:-translate-y-0.5
  disabled:opacity-70 disabled:cursor-not-allowed
`;

export const buttonSecondaryClasses = `
  px-6 py-3
  border-2 border-zinc-300 dark:border-zinc-700
  text-zinc-700 dark:text-zinc-300
  rounded-full font-semibold
  hover:border-cyan-500 hover:text-cyan-500
  transition-all
`;

export const buttonGhostClasses = `
  p-2
  text-zinc-500 hover:text-zinc-700
  hover:bg-zinc-100 dark:hover:bg-zinc-800
  rounded-lg transition-colors
`;

// ============================================================================
// 卡片样式
// ============================================================================

export const cardBaseClasses = `
  bg-white dark:bg-zinc-800
  rounded-2xl shadow-lg
  border border-zinc-100 dark:border-zinc-700
`;

export const cardHoverClasses = `
  hover:shadow-xl hover:-translate-y-1
  transition-all duration-300
`;

// ============================================================================
// 徽章/标签样式
// ============================================================================

export const badgeBaseClasses = `
  inline-flex items-center px-2 py-0.5
  rounded text-xs font-medium
`;

// ============================================================================
// 渐变背景
// ============================================================================

export const gradientPrimary = `
  bg-gradient-to-r from-cyan-500 to-purple-600
`;

export const gradientSecondary = `
  bg-gradient-to-br from-zinc-50 to-zinc-100
  dark:from-zinc-900 dark:to-zinc-950
`;

// ============================================================================
// 文本样式
// ============================================================================

export const textGradientClasses = `
  bg-clip-text text-transparent
  bg-gradient-to-r from-cyan-500 to-purple-600
`;

// ============================================================================
// 动画类
// ============================================================================

export const fadeInClasses = `
  animate-in fade-in duration-300
`;

export const slideInClasses = `
  animate-in slide-in-from-bottom-4 duration-300
`;