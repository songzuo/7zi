/**
 * @fileoverview 快速任务创建模态框
 * @description 在工作流编辑器中快速创建任务的模态框组件
 *
 * 功能:
 * - 对话式任务创建
 * - 实时预览
 * - 一键添加到画布
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { WorkflowDefinition, NodeType, WorkflowNode, WorkflowEdge } from '@/types/workflow'
import {
  parseTaskFromText,
  parsedTaskToWorkflowDefinition,
  validateParsedTask,
  TaskIntent,
  ParsedTask,
} from '@/lib/workflow/TaskParser'
import { cn } from '@/lib/utils'

/**
 * 意图标签样式
 */
const INTENT_STYLES: Record<TaskIntent, { bg: string; text: string; icon: string }> = {
  automation: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300', icon: '⚙️' },
  notification: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', icon: '📧' },
  data_processing: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300', icon: '📊' },
  monitoring: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300', icon: '📡' },
  integration: { bg: 'bg-indigo-100 dark:bg-indigo-900', text: 'text-indigo-700 dark:text-indigo-300', icon: '🔗' },
  scheduled: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-700 dark:text-orange-300', icon: '⏰' },
  webhook: { bg: 'bg-pink-100 dark:bg-pink-900', text: 'text-pink-700 dark:text-pink-300', icon: '🪝' },
  human_approval: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300', icon: '✋' },
  unknown: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', icon: '❓' },
}

/**
 * 意图中文名称
 */
const INTENT_LABELS: Record<TaskIntent, string> = {
  automation: '自动化任务',
  notification: '通知任务',
  data_processing: '数据处理',
  monitoring: '监控任务',
  integration: '集成任务',
  scheduled: '定时任务',
  webhook: 'Webhook',
  human_approval: '人工审批',
  unknown: '未知类型',
}

/**
 * 组件属性
 */
interface QuickTaskModalProps {
  /** 是否显示 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 创建成功回调 */
  onCreate: (workflow: WorkflowDefinition) => void
  /** 自定义类名 */
  className?: string
}

/**
 * 快速任务创建模态框
 */
export function QuickTaskModal({ isOpen, onClose, onCreate, className }: QuickTaskModalProps) {
  // 状态
  const [step, setStep] = useState<'input' | 'preview'>('input')
  const [inputValue, setInputValue] = useState('')
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // 重置状态
  const resetState = useCallback(() => {
    setStep('input')
    setInputValue('')
    setParsedTask(null)
    setIsProcessing(false)
    setError(null)
  }, [])

  // 关闭时重置
  useEffect(() => {
    if (!isOpen) {
      resetState()
    }
  }, [isOpen, resetState])

  // 解析输入
  const handleParse = useCallback(async () => {
    if (!inputValue.trim()) {
      setError('请输入任务描述')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const task = parseTaskFromText(inputValue)
      const validation = validateParsedTask(task)

      if (!validation.isValid && validation.errors.length > 0) {
        // 即使有警告，也允许继续
        console.warn('Validation warnings:', validation.errors)
      }

      setParsedTask(task)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }, [inputValue])

  // 创建任务
  const handleCreate = useCallback(() => {
    if (!parsedTask) return

    const workflow = parsedTaskToWorkflowDefinition(parsedTask)
    onCreate(workflow)
    onClose()
  }, [parsedTask, onCreate, onClose])

  // 返回编辑
  const handleBack = useCallback(() => {
    setStep('input')
    setParsedTask(null)
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 模态框内容 */}
      <div
        className={cn(
          'relative z-10 flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900',
          className
        )}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {step === 'input' ? 'AI 任务创建助手' : '任务预览'}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {step === 'input'
                ? '用自然语言描述你想要创建的任务'
                : '确认工作流结构'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' ? (
            /* 输入步骤 */
            <div className="space-y-4">
              {/* 输入框 */}
              <div>
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="例如：每天凌晨2点检查系统健康状态，如果发现异常发送通知给运维团队"
                  className="h-32 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  disabled={isProcessing}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-500">{error}</p>
                )}
              </div>

              {/* 示例提示 */}
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  💡 示例描述
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>
                    <button
                      onClick={() => setInputValue('每天凌晨2点备份数据库并发送邮件通知')}
                      className="text-cyan-600 hover:underline dark:text-cyan-400"
                    >
                      每天凌晨2点备份数据库并发送邮件通知
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setInputValue('监控服务器CPU使用率，超过80%时发送告警到Slack')}
                      className="text-cyan-600 hover:underline dark:text-cyan-400"
                    >
                      监控服务器CPU使用率，超过80%时发送告警到Slack
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setInputValue('当收到新订单时，自动发送确认邮件并更新库存')}
                      className="text-cyan-600 hover:underline dark:text-cyan-400"
                    >
                      当收到新订单时，自动发送确认邮件并更新库存
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            /* 预览步骤 */
            <div className="space-y-6">
              {/* 任务概览 */}
              {parsedTask && (
                <div className="rounded-xl bg-gradient-to-r from-cyan-50 to-purple-50 p-4 dark:from-cyan-900/20 dark:to-purple-900/20">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{INTENT_STYLES[parsedTask.intent].icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {parsedTask.workflowName}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className={cn('rounded-full px-2 py-0.5 text-xs', INTENT_STYLES[parsedTask.intent].bg, INTENT_STYLES[parsedTask.intent].text)}>
                          {INTENT_LABELS[parsedTask.intent]}
                        </span>
                        <span>•</span>
                        <span>置信度 {(parsedTask.confidence * 100).toFixed(0)}%</span>
                        <span>•</span>
                        <span>{parsedTask.nodes.length} 节点</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 节点预览 */}
              {parsedTask && (
                <div>
                  <h4 className="mb-3 font-medium text-gray-900 dark:text-white">工作流节点</h4>
                  <div className="space-y-2">
                    {parsedTask.nodes.map((node, index) => (
                      <div
                        key={node.id || index}
                        className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {node.name}
                          </span>
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                            ({node.type})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 原始描述 */}
              {parsedTask && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">原始描述: </span>
                    {parsedTask.rawText}
                  </p>
                </div>
              )}

              {/* 改进建议 */}
              {parsedTask && parsedTask.suggestions.length > 0 && (
                <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                  <p className="mb-2 text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    💡 改进建议
                  </p>
                  <ul className="space-y-1 text-sm text-yellow-600 dark:text-yellow-400">
                    {parsedTask.suggestions.map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          {step === 'input' ? (
            <>
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                取消
              </button>
              <button
                onClick={handleParse}
                disabled={!inputValue.trim() || isProcessing}
                className="rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-2 text-sm font-medium text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? '解析中...' : '解析并预览'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleBack}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                ← 返回修改
              </button>
              <button
                onClick={handleCreate}
                className="rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
              >
                ✅ 创建任务
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuickTaskModal
