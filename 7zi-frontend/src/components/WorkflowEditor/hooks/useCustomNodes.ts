/**
 * useCustomNodes - 自定义节点管理 Hook
 *
 * v1.9.1 新增
 * 支持动态注册和管理自定义节点类型
 */

import { useState, useCallback, useMemo } from 'react'
import type { CustomNodeRegistration, NodeType } from '../types'

interface UseCustomNodesOptions {
  initialNodes?: CustomNodeRegistration[]
}

/**
 * 自定义节点管理 Hook
 */
export function useCustomNodes({ initialNodes = [] }: UseCustomNodesOptions = {}) {
  const [customNodes, setCustomNodes] = useState<CustomNodeRegistration[]>(initialNodes)

  /**
   * 注册自定义节点
   */
  const registerNode = useCallback((node: CustomNodeRegistration) => {
    setCustomNodes(prev => {
      // 检查是否已存在
      const exists = prev.some(n => n.type === node.type)
      if (exists) {
        console.warn(`Node type "${node.type}" already registered`)
        return prev
      }
      return [...prev, node]
    })
  }, [])

  /**
   * 批量注册自定义节点
   */
  const registerNodes = useCallback((nodes: CustomNodeRegistration[]) => {
    setCustomNodes(prev => {
      const newNodes = nodes.filter(node => !prev.some(n => n.type === node.type))
      return [...prev, ...newNodes]
    })
  }, [])

  /**
   * 注销自定义节点
   */
  const unregisterNode = useCallback((nodeType: string) => {
    setCustomNodes(prev => prev.filter(n => n.type !== nodeType))
  }, [])

  /**
   * 获取自定义节点
   */
  const getNode = useCallback(
    (nodeType: string): CustomNodeRegistration | undefined => {
      return customNodes.find(n => n.type === nodeType)
    },
    [customNodes]
  )

  /**
   * 检查节点是否已注册
   */
  const isRegistered = useCallback(
    (nodeType: string): boolean => {
      return customNodes.some(n => n.type === nodeType)
    },
    [customNodes]
  )

  /**
   * 获取所有自定义节点类型
   */
  const customNodeTypes = useMemo(() => {
    return customNodes.map(n => n.type)
  }, [customNodes])

  /**
   * 按类别获取自定义节点
   */
  const getNodesByCategory = useCallback(
    (category: string): CustomNodeRegistration[] => {
      return customNodes.filter(n => n.category === category)
    },
    [customNodes]
  )

  /**
   * 清空所有自定义节点
   */
  const clearAll = useCallback(() => {
    setCustomNodes([])
  }, [])

  return {
    customNodes,
    customNodeTypes,
    registerNode,
    registerNodes,
    unregisterNode,
    getNode,
    isRegistered,
    getNodesByCategory,
    clearAll,
  }
}

export default useCustomNodes