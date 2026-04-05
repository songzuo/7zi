/**
 * RemoteCursor 组件模块
 *
 * 提供实时协作用户光标同步功能
 *
 * @example
 * ```tsx
 * import { RemoteCursorContainer } from '@/components/Collaboration/RemoteCursor'
 *
 * function Editor() {
 *   const contentRef = useRef<HTMLDivElement>(null)
 *   const wsManager = useWebSocketManager()
 *
 *   return (
 *     <div ref={contentRef} className="relative">
 *       <RemoteCursorContainer wsManager={wsManager} contentRef={contentRef} />
 *       {/* 编辑器内容 *\/}
 *     </div>
 *   )
 * }
 * ```
 */

export { RemoteCursorComponent } from './RemoteCursor'
export type { RemoteCursorProps } from './RemoteCursor'

export { RemoteCursorContainerComponent as RemoteCursorContainer } from './RemoteCursorContainer'
export type { RemoteCursorContainerProps } from './RemoteCursorContainer'

export { useRemoteCursors } from './useRemoteCursors'
