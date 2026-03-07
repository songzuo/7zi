/**
 * useTheme Hook
 * 
 * 主题切换 Hook - 从 ThemeProvider 导出的便捷方法
 * 
 * 功能：
 * - 提供 theme, setTheme, toggleTheme 方法
 * - 访问当前解析后的主题
 * - 获取过渡状态用于动画
 * 
 * @example
 * ```tsx
 * import { useTheme } from '@/hooks/useTheme';
 * 
 * function ThemeToggle() {
 *   const { theme, resolvedTheme, setTheme, toggleTheme, isTransitioning } = useTheme();
 *   
 *   return (
 *     <div className={isTransitioning ? 'animate-theme-switch' : ''}>
 *       <p>当前主题: {theme}</p>
 *       <p>实际主题: {resolvedTheme}</p>
 *       <button onClick={toggleTheme}>切换主题</button>
 *       <button onClick={() => setTheme('light')}>浅色</button>
 *       <button onClick={() => setTheme('dark')}>深色</button>
 *       <button onClick={() => setTheme('system')}>跟随系统</button>
 *     </div>
 *   );
 * }
 * ```
 */

export { useTheme, type Theme, type ResolvedTheme } from '../components/ThemeProvider';
