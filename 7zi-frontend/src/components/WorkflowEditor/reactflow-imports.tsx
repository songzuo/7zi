/**
 * React Flow 动态导入 - 统一入口
 * 
 * 问题: React Flow 整体导入 ~200-300KB，必须动态导入
 * 
 * 使用方式:
 *   import { ReactFlow, Background, Controls } from './reactflow-imports'
 * 
 * 对于 Hooks 和枚举值，直接从 'reactflow' 导入:
 *   import { useReactFlow, Position } from 'reactflow'
 */

import dynamic from 'next/dynamic'

// ============================================================
// React Flow 核心组件 (必须动态导入 - 约 200-300KB)
// ============================================================

export const ReactFlow = dynamic(
  () => import('reactflow').then(mod => mod.default),
  { ssr: false }
)

export const ReactFlowProvider = dynamic(
  () => import('reactflow').then(mod => mod.ReactFlowProvider),
  { ssr: false }
)

export const Background = dynamic(
  () => import('reactflow').then(mod => mod.Background),
  { ssr: false }
)

export const Controls = dynamic(
  () => import('reactflow').then(mod => mod.Controls),
  { ssr: false }
)

export const MiniMap = dynamic(
  () => import('reactflow').then(mod => mod.MiniMap),
  { ssr: false }
)

export const Panel = dynamic(
  () => import('reactflow').then(mod => mod.Panel),
  { ssr: false }
)

// ============================================================
// React Flow 组件 (必须动态导入)
// ============================================================

export const Handle = dynamic(
  () => import('reactflow').then(mod => mod.Handle),
  { ssr: false }
)

export const EdgeLabelRenderer = dynamic(
  () => import('reactflow').then(mod => mod.EdgeLabelRenderer),
  { ssr: false }
)

export const getBezierPath = dynamic(
  () => import('reactflow').then(mod => mod.getBezierPath),
  { ssr: false }
)

// ============================================================
// React Flow 类型 (静态导入 - 编译时会被擦除，不影响 bundle)
// ============================================================

export type { Node, Edge, Connection } from 'reactflow'
export type { NodeProps, EdgeProps } from 'reactflow'
export type { NodeChange, EdgeChange } from 'reactflow'
export type { BackgroundVariant, SelectionMode } from 'reactflow'