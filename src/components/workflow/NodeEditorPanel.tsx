'use client'

/**
 * 节点编辑面板组件
 * 支持双击节点打开编辑面板，配置节点参数
 */

import React, { useState, useCallback, useEffect } from 'react'
import { WorkflowNode, NodeType } from '@/types/workflow'
import { cn } from '@/lib/utils'

/**
 * 节点编辑面板属性
 */
export interface NodeEditorPanelProps {
  node: WorkflowNode | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (nodeId: string, updates: Partial<WorkflowNode>) => void
  onDelete?: (nodeId: string) => void
  className?: string
}

/**
 * 删除确认对话框属性
 */
interface DeleteConfirmDialogProps {
  isOpen: boolean
  nodeName: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * 删除确认对话框
 */
function DeleteConfirmDialog({ isOpen, nodeName, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-96 rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">确认删除节点</h3>
        <p className="mb-6 text-gray-600">
          确定要删除节点 <span className="font-medium text-gray-900">"{nodeName}"</span> 吗？此操作无法撤销。
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 节点字段配置
 */
interface NodeFieldConfig {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select'
  required?: boolean
  placeholder?: string
  options?: string[]
  default?: string | number
}

/**
 * 节点类型配置
 */
const NODE_TYPE_CONFIG: Record<NodeType, {
  label: string
  icon: string
  color: string
  fields: NodeFieldConfig[]
}> = {
  [NodeType.START]: {
    label: '开始节点',
    icon: '▶️',
    color: 'bg-green-100 border-green-500 text-green-700',
    fields: [],
  },
  [NodeType.END]: {
    label: '结束节点',
    icon: '⏹️',
    color: 'bg-red-100 border-red-500 text-red-700',
    fields: [],
  },
  [NodeType.AGENT]: {
    label: 'Agent 节点',
    icon: '🤖',
    color: 'bg-blue-100 border-blue-500 text-blue-700',
    fields: [
      { key: 'agentId', label: 'Agent ID', type: 'text', required: true },
      { key: 'agentType', label: 'Agent 类型', type: 'select', options: ['default', 'custom'] },
      { key: 'prompt', label: '提示词', type: 'textarea' },
      { key: 'model', label: '模型', type: 'select', options: ['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'custom'] },
      { key: 'timeout', label: '超时时间(秒)', type: 'number', default: 60 },
      { key: 'retryCount', label: '重试次数', type: 'number', default: 3 },
    ],
  },
  [NodeType.CONDITION]: {
    label: '条件节点',
    icon: '⚡',
    color: 'bg-yellow-100 border-yellow-500 text-yellow-700',
    fields: [
      { key: 'expression', label: '条件表达式', type: 'textarea', required: true, placeholder: '{{input.status}} === "success"' },
      { key: 'trueLabel', label: 'True 分支标签', type: 'text', default: 'true' },
      { key: 'falseLabel', label: 'False 分支标签', type: 'text', default: 'false' },
    ],
  },
  [NodeType.PARALLEL]: {
    label: '并行节点',
    icon: '⚡',
    color: 'bg-purple-100 border-purple-500 text-purple-700',
    fields: [
      { key: 'maxParallelism', label: '最大并行数', type: 'number', default: 5 },
    ],
  },
  [NodeType.WAIT]: {
    label: '等待节点',
    icon: '⏱️',
    color: 'bg-gray-100 border-gray-500 text-gray-700',
    fields: [
      { key: 'duration', label: '等待时间(秒)', type: 'number', default: 10 },
      { key: 'waitForEvent', label: '等待事件', type: 'text' },
    ],
  },
  [NodeType.HUMAN_INPUT]: {
    label: '人工输入节点',
    icon: '👤',
    color: 'bg-orange-100 border-orange-500 text-orange-700',
    fields: [
      { key: 'formSchema', label: '表单 Schema (JSON)', type: 'textarea', placeholder: '{"fields": [...]}' },
      { key: 'requiredApprovals', label: '需要审批人数', type: 'number', default: 1 },
    ],
  },
}

/**
 * 节点编辑面板组件
 */
export function NodeEditorPanel({
  node,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  className,
}: NodeEditorPanelProps) {
  const [editedNode, setEditedNode] = useState<WorkflowNode | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // 同步节点数据
  useEffect(() => {
    if (node) {
      setEditedNode({ ...node })
    } else {
      setEditedNode(null)
    }
    setValidationErrors({})
  }, [node])

  // 关闭面板
  const handleClose = useCallback(() => {
    onClose()
    setEditedNode(null)
    setValidationErrors({})
  }, [onClose])

  // 验证表单
  const validateForm = useCallback((): boolean => {
    if (!editedNode) return false

    const errors: Record<string, string> = {}
    const typeConfig = NODE_TYPE_CONFIG[editedNode.type as NodeType]

    if (!editedNode.name?.trim()) {
      errors.name = '节点名称不能为空'
    }

    typeConfig.fields.forEach(field => {
      if (field.required) {
        const value = editedNode.agentConfig?.[field.key as keyof typeof editedNode.agentConfig] ||
          editedNode.conditionConfig?.[field.key as keyof typeof editedNode.conditionConfig] ||
          editedNode.waitConfig?.[field.key as keyof typeof editedNode.waitConfig]

        if (!value && field.type === 'text') {
          errors[field.key] = `${field.label} 不能为空`
        }
      }
    })

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [editedNode])

  // 保存更改
  const handleSave = useCallback(() => {
    if (!editedNode || !validateForm()) return

    onUpdate(editedNode.id, editedNode)
    handleClose()
  }, [editedNode, validateForm, onUpdate, handleClose])

  // 更新字段值
  const updateField = useCallback((key: string, value: unknown, configType?: string) => {
    if (!editedNode) return

    setEditedNode(prev => {
      if (!prev) return prev

      const updates: Partial<WorkflowNode> = {}

      if (key === 'name' || key === 'description') {
        updates[key] = value as string
      } else {
        // 根据节点类型更新对应的配置
        if (prev.type === NodeType.AGENT) {
          updates.agentConfig = { ...prev.agentConfig, [key]: value } as any
        } else if (prev.type === NodeType.CONDITION) {
          updates.conditionConfig = { ...prev.conditionConfig, [key]: value } as any
        } else if (prev.type === NodeType.WAIT) {
          updates.waitConfig = { ...prev.waitConfig, [key]: value } as any
        } else if (prev.type === NodeType.HUMAN_INPUT) {
          updates.humanInputConfig = { ...prev.humanInputConfig, [key]: value } as any
        }
      }

      return { ...prev, ...updates }
    })
  }, [editedNode])

  // 删除节点
  const handleDelete = useCallback(() => {
    if (!editedNode || !onDelete) return
    setShowDeleteConfirm(true)
  }, [editedNode, onDelete])

  const confirmDelete = useCallback(() => {
    if (!editedNode || !onDelete) return
    onDelete(editedNode.id)
    setShowDeleteConfirm(false)
    handleClose()
  }, [editedNode, onDelete, handleClose])

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  if (!isOpen || !editedNode) return null

  const typeConfig = NODE_TYPE_CONFIG[editedNode.type as NodeType] || NODE_TYPE_CONFIG[NodeType.AGENT]

  return (
    <>
      <div
        className={cn(
          'fixed right-0 top-0 z-40 h-full w-96 overflow-y-auto border-l border-gray-200 bg-white shadow-xl',
          className
        )}
      >
        {/* 头部 */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">编辑节点</h2>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {/* 节点类型标识 */}
          <div className="mb-6">
            <div className={cn('inline-flex items-center gap-2 rounded-lg border px-3 py-2', typeConfig.color)}>
              <span>{typeConfig.icon}</span>
              <span className="text-sm font-medium">{typeConfig.label}</span>
            </div>
          </div>

          {/* 基本信息表单 */}
          <div className="space-y-4">
            {/* 节点名称 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                节点名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editedNode.name}
                onChange={e => updateField('name', e.target.value)}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none',
                  validationErrors.name ? 'border-red-500' : 'border-gray-300'
                )}
                placeholder="输入节点名称"
              />
              {validationErrors.name && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.name}</p>
              )}
            </div>

            {/* 节点描述 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">节点描述</label>
              <textarea
                value={editedNode.description || ''}
                onChange={e => updateField('description', e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="输入节点描述（可选）"
              />
            </div>

            {/* 位置信息（只读） */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">位置</label>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  X: {Math.round(editedNode.position.x)}
                </div>
                <div className="flex-1 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  Y: {Math.round(editedNode.position.y)}
                </div>
              </div>
            </div>

            {/* 类型特定配置 */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="mb-4 text-sm font-medium text-gray-900">节点配置</h3>
              <div className="space-y-4">
                {typeConfig.fields.map(field => (
                  <div key={field.key}>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {field.label}
                      {field.required && <span className="text-red-500"> *</span>}
                    </label>

                    {field.type === 'text' && (
                      <input
                        type="text"
                        value={
                          (editedNode.agentConfig?.[field.key as keyof typeof editedNode.agentConfig] ||
                            editedNode.conditionConfig?.[field.key as keyof typeof editedNode.conditionConfig] ||
                            editedNode.waitConfig?.[field.key as keyof typeof editedNode.waitConfig] ||
                            '') as string
                        }
                        onChange={e => updateField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className={cn(
                          'w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none',
                          validationErrors[field.key] ? 'border-red-500' : 'border-gray-300'
                        )}
                      />
                    )}

                    {field.type === 'textarea' && (
                      <textarea
                        value={
                          (editedNode.agentConfig?.[field.key as keyof typeof editedNode.agentConfig] ||
                            editedNode.conditionConfig?.[field.key as keyof typeof editedNode.conditionConfig] ||
                            '') as string
                        }
                        onChange={e => updateField(field.key, e.target.value)}
                        rows={3}
                        placeholder={field.placeholder}
                        className={cn(
                          'w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none',
                          validationErrors[field.key] ? 'border-red-500' : 'border-gray-300'
                        )}
                      />
                    )}

                    {field.type === 'number' && (
                      <input
                        type="number"
                        value={
                          (editedNode.agentConfig?.[field.key as keyof typeof editedNode.agentConfig] ||
                            editedNode.waitConfig?.[field.key as keyof typeof editedNode.waitConfig] ||
                            field.default) as number
                        }
                        onChange={e => updateField(field.key, parseInt(e.target.value) || field.default)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    )}

                    {field.type === 'select' && field.options && (
                      <select
                        value={
                          (editedNode.agentConfig?.[field.key as keyof typeof editedNode.agentConfig] ||
                            '') as string
                        }
                        onChange={e => updateField(field.key, e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">选择...</option>
                        {field.options.map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}

                    {validationErrors[field.key] && (
                      <p className="mt-1 text-xs text-red-500">{validationErrors[field.key]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作按钮 */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex justify-between">
            {onDelete && editedNode.type !== NodeType.START && editedNode.type !== NodeType.END && (
              <button
                onClick={handleDelete}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                删除节点
              </button>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        nodeName={editedNode.name}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}

export default NodeEditorPanel