/**
 * 剪贴板管理 Hook
 *
 * 🎨 设计师: Designer
 * 创建日期: 2026-04-03
 * 版本: v1.10.0
 *
 * 提供复制、粘贴、剪切功能
 */

import { useCallback, useState } from 'react'
import type { Node, Edge } from 'reactflow'
import type { WorkflowNodeData, WorkflowEdgeData } from '../types'

// ============================================
// 类型定义
// ============================================

interface ClipboardData {
  nodes: Node<WorkflowNodeData>[]
  edges: Edge<WorkflowEdgeData>[]
  timestamp: number
}
import { generateSecureId } from '@/lib/utils'

/** JSON 剪贴板节点数据（简化版） */
interface JsonClipboardNode {
  id: string
  type?: string
  position: { x: number; y: number }
  data: WorkflowNodeData
}

/** JSON 剪贴板边数据（简化版） */
interface JsonClipboardEdge {
  id: string
  source: string
  target: string
  data?: WorkflowEdgeData
}

/** JSON 剪贴板数据格式 */
interface JsonClipboardData {
  nodes: JsonClipboardNode[]
  edges?: JsonClipboardEdge[]
}

const CLIPBOARD_KEY = 'workflow-clipboard'

export function useClipboard() {
  const [clipboardData, setClipboardData] = useState<ClipboardData | null>(null)

  /**
   * 复制节点
   */
  const copyNodes = useCallback(
    (
      nodes: Node<WorkflowNodeData>[],
      edges: Edge<WorkflowEdgeData>[],
      selectedNodeIds: string[]
    ) => {
      // 过滤选中的节点
      const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id))

      // 获取相关边（两端都在选中节点中的边）
      const selectedNodeIdsSet = new Set(selectedNodeIds)
      const relatedEdges = edges.filter(
        (e) => selectedNodeIdsSet.has(e.source) && selectedNodeIdsSet.has(e.target)
      )

      const data: ClipboardData = {
        nodes: selectedNodes,
        edges: relatedEdges,
        timestamp: Date.now(),
      }

      // 保存到内存
      setClipboardData(data)

      // 保存到 localStorage
      try {
        localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(data))
      } catch (error) {
        console.warn('Failed to save clipboard to localStorage:', error)
      }

      return data
    },
    []
  )

  /**
   * 粘贴节点
   */
  const pasteNodes = useCallback(
    (offset: { x: number; y: number } = { x: 50, y: 50 }) => {
      // 尝试从内存获取
      let data = clipboardData

      // 尝试从 localStorage 获取
      if (!data) {
        try {
          const stored = localStorage.getItem(CLIPBOARD_KEY)
          if (stored) {
            data = JSON.parse(stored) as ClipboardData
            setClipboardData(data)
          }
        } catch (error) {
          console.warn('Failed to load clipboard from localStorage:', error)
        }
      }

      if (!data || data.nodes.length === 0) {
        return null
      }

      // 创建 ID 映射
      const idMap: Record<string, string> = {}

      // 创建新节点
      const newNodes: Node<WorkflowNodeData>[] = data.nodes.map((node) => {
        const newId = generateSecureId(node.type)
        idMap[node.id] = newId

        return {
          ...node,
          id: newId,
          position: {
            x: node.position.x + offset.x,
            y: node.position.y + offset.y,
          },
          data: {
            ...node.data,
            id: newId,
            label: `${node.data.label} (Copy)`,
          },
          selected: true, // 粘贴后自动选中
        }
      })

      // 创建新边
      const newEdges: Edge<WorkflowEdgeData>[] = data.edges.map((edge) => {
        const newId = generateSecureId('edge')
        return {
          ...edge,
          id: newId,
          source: idMap[edge.source] || edge.source,
          target: idMap[edge.target] || edge.target,
        }
      })

      return {
        nodes: newNodes,
        edges: newEdges,
        sourceNodeIds: data.nodes.map((n) => n.id),
      }
    },
    [clipboardData]
  )

  /**
   * 剪切节点
   */
  const cutNodes = useCallback(
    (
      nodes: Node<WorkflowNodeData>[],
      edges: Edge<WorkflowEdgeData>[],
      selectedNodeIds: string[]
    ) => {
      // 先复制
      const data = copyNodes(nodes, edges, selectedNodeIds)

      // 返回要删除的节点 ID
      return {
        clipboardData: data,
        nodesToDelete: selectedNodeIds,
        edgesToDelete: edges
          .filter((e) => selectedNodeIds.includes(e.source) || selectedNodeIds.includes(e.target))
          .map((e) => e.id),
      }
    },
    [copyNodes]
  )

  /**
   * 复制为 JSON
   */
  const copyAsJSON = useCallback(
    (
      nodes: Node<WorkflowNodeData>[],
      edges: Edge<WorkflowEdgeData>[],
      selectedNodeIds: string[]
    ) => {
      const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id))
      const selectedNodeIdsSet = new Set(selectedNodeIds)
      const relatedEdges = edges.filter(
        (e) => selectedNodeIdsSet.has(e.source) && selectedNodeIdsSet.has(e.target)
      )

      const jsonData = {
        nodes: selectedNodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        })),
        edges: relatedEdges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          data: e.data,
        })),
      }

      const jsonString = JSON.stringify(jsonData, null, 2)

      // 复制到系统剪贴板
      navigator.clipboard.writeText(jsonString).catch((error) => {
        console.warn('Failed to copy to clipboard:', error)
      })

      return jsonString
    },
    []
  )

  /**
   * 从 JSON 粘贴
   */
  const pasteFromJSON = useCallback(
    async (offset: { x: number; y: number } = { x: 50, y: 50 }) => {
      try {
        const text = await navigator.clipboard.readText()
        const jsonData = JSON.parse(text) as JsonClipboardData

        if (!jsonData.nodes || !Array.isArray(jsonData.nodes)) {
          return null
        }

        // 创建 ID 映射
        const idMap: Record<string, string> = {}

        // 创建新节点
        const newNodes: Node<WorkflowNodeData>[] = jsonData.nodes.map((node: JsonClipboardNode) => {
          const newId = generateSecureId(node.type || 'node')
          idMap[node.id] = newId

          return {
            ...node,
            id: newId,
            position: {
              x: node.position.x + offset.x,
              y: node.position.y + offset.y,
            },
            data: {
              ...node.data,
              id: newId,
            },
            selected: true,
          }
        })

        // 创建新边
        const newEdges: Edge<WorkflowEdgeData>[] = (jsonData.edges || []).map((edge: JsonClipboardEdge) => {
          const newId = generateSecureId('edge')
          return {
            ...edge,
            id: newId,
            source: idMap[edge.source] || edge.source,
            target: idMap[edge.target] || edge.target,
          }
        })

        return {
          nodes: newNodes,
          edges: newEdges,
        }
      } catch (error) {
        console.warn('Failed to paste from clipboard:', error)
        return null
      }
    },
    []
  )

  /**
   * 检查剪贴板是否有数据
   */
  const hasClipboardData = useCallback(() => {
    if (clipboardData && clipboardData.nodes.length > 0) {
      return true
    }

    try {
      const stored = localStorage.getItem(CLIPBOARD_KEY)
      if (stored) {
        const data = JSON.parse(stored) as ClipboardData
        return data && data.nodes && data.nodes.length > 0
      }
    } catch (error) {
      // Ignore
    }

    return false
  }, [clipboardData])

  /**
   * 清空剪贴板
   */
  const clearClipboard = useCallback(() => {
    setClipboardData(null)
    try {
      localStorage.removeItem(CLIPBOARD_KEY)
    } catch (error) {
      // Ignore
    }
  }, [])

  return {
    copyNodes,
    pasteNodes,
    cutNodes,
    copyAsJSON,
    pasteFromJSON,
    hasClipboardData,
    clearClipboard,
    clipboardData,
  }
}

export default useClipboard