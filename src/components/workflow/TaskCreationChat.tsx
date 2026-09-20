/**
 * @fileoverview 对话式任务创建组件
 * @description 让用户通过自然语言描述来创建自动化任务
 *
 * 功能:
 * - 自然语言输入
 * - 实时任务预览
 * - 一键生成工作流
 * - 编辑确认机制
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { WorkflowDefinition, NodeType } from '@/types/workflow'
import {
  parseTaskFromText,
  parsedTaskToWorkflowDefinition,
  validateParsedTask,
  TaskIntent,
  ParsedTask,
} from '@/lib/workflow/TaskParser'
import { TaskPreviewPanel } from './TaskPreviewPanel'
import { cn } from '@/lib/utils'

/**
 * 对话消息类型
 */
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  taskPreview?: ParsedTask
  actions?: ChatAction[]
}

/**
 * 聊天操作按钮
 */
interface ChatAction {
  label: string
  action: string
  variant?: 'primary' | 'secondary' | 'danger'
  icon?: string
}

/**
 * 组件属性
 */
interface TaskCreationChatProps {
  /** 任务创建成功回调 */
  onCreateTask?: (workflow: WorkflowDefinition) => void
  /** 取消回调 */
  onCancel?: () => void
  /** 初始提示 */
  initialPrompt?: string
  /** 自定义类名 */
  className?: string
}

/**
 * 意图标签颜色映射
 */
const INTENT_COLORS: Record<TaskIntent, string> = {
  automation: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  notification: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  data_processing: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  monitoring: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  integration: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  scheduled: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  webhook: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  human_approval: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  unknown: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
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
 * 示例提示词
 */
const EXAMPLE_PROMPTS = [
  '每天凌晨2点检查系统健康状态，如果发现异常发送通知给运维团队',
  '当收到新订单时，自动发送邮件通知给客户，并更新库存',
  '每周一早上9点生成销售报表并发送给销售团队',
  '监控服务器CPU使用率，超过80%时发送告警到Slack',
  '处理上传的CSV文件，清洗数据后导入数据库',
]

/**
 * 对话式任务创建组件
 */
export function TaskCreationChat({
  onCreateTask,
  onCancel,
  initialPrompt = '',
  className,
}: TaskCreationChatProps) {
  // 状态
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '你好！我是任务创建助手。请描述你想要创建的自动化任务，我会帮你生成工作流。\n\n例如：\n• 每天凌晨2点备份数据库并发送通知\n• 当收到新订单时自动处理并发送确认邮件\n• 监控服务器状态，异常时发送告警',
      timestamp: new Date(),
      actions: [
        { label: '查看示例', action: 'show_examples', icon: '💡' },
      ],
    },
  ])
  const [inputValue, setInputValue] = useState(initialPrompt)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [currentTask, setCurrentTask] = useState<ParsedTask | null>(null)

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 添加消息
  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage
  }, [])

  // 处理用户输入
  const handleSubmit = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || isProcessing) return

    // 添加用户消息
    addMessage({
      role: 'user',
      content: text,
    })

    setInputValue('')
    setIsProcessing(true)

    try {
      // 解析用户输入
      const parsedTask = parseTaskFromText(text)
      const validation = validateParsedTask(parsedTask)

      // 设置当前任务
      setCurrentTask(parsedTask)
      setShowPreview(true)

      // 构建助手回复
      let assistantContent = `我理解你想要创建一个**${INTENT_LABELS[parsedTask.intent]}**。\n\n`
      assistantContent += `**工作流名称**: ${parsedTask.workflowName}\n`
      assistantContent += `**识别节点数**: ${parsedTask.nodes.length} 个\n`
      assistantContent += `**置信度**: ${(parsedTask.confidence * 100).toFixed(0)}%\n\n`

      if (validation.errors.length > 0) {
        assistantContent += `**需要注意的问题**:\n`
        validation.errors.forEach(error => {
          assistantContent += `• ${error}\n`
        })
        assistantContent += '\n'
      }

      if (parsedTask.suggestions.length > 0) {
        assistantContent += `**改进建议**:\n`
        parsedTask.suggestions.forEach(suggestion => {
          assistantContent += `• ${suggestion}\n`
        })
        assistantContent += '\n'
      }

      assistantContent += '请查看右侧的工作流预览，确认无误后可以创建任务。'

      // 添加助手消息
      addMessage({
        role: 'assistant',
        content: assistantContent,
        taskPreview: parsedTask,
        actions: [
          { label: '创建任务', action: 'create', variant: 'primary', icon: '✅' },
          { label: '修改描述', action: 'modify', icon: '✏️' },
          { label: '取消', action: 'cancel', variant: 'secondary', icon: '❌' },
        ],
      })
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: '抱歉，我在解析您的描述时遇到了问题。请尝试提供更详细的描述，例如：\n• 任务的触发条件\n• 需要执行的动作\n• 预期的结果',
        actions: [{ label: '重试', action: 'retry', icon: '🔄' }],
      })
    } finally {
      setIsProcessing(false)
    }
  }, [inputValue, isProcessing, addMessage])

  // 处理操作按钮点击
  const handleAction = useCallback(
    (action: string, task?: ParsedTask) => {
      switch (action) {
        case 'create':
          if (task) {
            const workflow = parsedTaskToWorkflowDefinition(task)
            onCreateTask?.(workflow)
            addMessage({
              role: 'assistant',
              content: `✅ 任务"${task.workflowName}"已创建成功！\n\n你可以在工作流编辑器中进一步完善这个任务。`,
            })
            setShowPreview(false)
            setCurrentTask(null)
          }
          break

        case 'modify':
          setInputValue(task?.rawText || '')
          inputRef.current?.focus()
          break

        case 'cancel':
          onCancel?.()
          setShowPreview(false)
          setCurrentTask(null)
          break

        case 'show_examples':
          const randomExamples = EXAMPLE_PROMPTS.sort(() => Math.random() - 0.5).slice(0, 3)
          addMessage({
            role: 'assistant',
            content: `这里有一些示例任务描述：\n\n${randomExamples.map((e, i) => `${i + 1}. ${e}`).join('\n\n')}\n\n你可以直接使用或修改这些示例。`,
            actions: randomExamples.map((_, i) => ({
              label: `使用示例 ${i + 1}`,
              action: `use_example_${i}`,
              variant: 'secondary',
            })),
          })
          break

        case 'retry':
          setInputValue('')
          inputRef.current?.focus()
          break

        default:
          if (action.startsWith('use_example_')) {
            const index = parseInt(action.split('_').pop() || '0')
            const example = EXAMPLE_PROMPTS.sort(() => Math.random() - 0.5)[index]
            if (example) {
              setInputValue(example)
            }
          }
      }
    },
    [onCreateTask, onCancel, addMessage]
  )

  // 键盘事件处理
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className={cn('flex h-full', className)}>
      {/* 对话区域 */}
      <div className="flex flex-1 flex-col">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  )}
                >
                  {/* 消息内容 */}
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>

                  {/* 任务预览标签 */}
                  {message.taskPreview && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          INTENT_COLORS[message.taskPreview.intent]
                        )}
                      >
                        {INTENT_LABELS[message.taskPreview.intent]}
                      </span>
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                        {(message.taskPreview.confidence * 100).toFixed(0)}% 置信度
                      </span>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.actions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => handleAction(action.action, message.taskPreview)}
                          className={cn(
                            'rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                            action.variant === 'primary'
                              ? 'bg-white text-cyan-600 hover:bg-gray-50'
                              : action.variant === 'danger'
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                          )}
                        >
                          {action.icon && <span className="mr-1">{action.icon}</span>}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 时间戳 */}
                  <div
                    className={cn(
                      'mt-1 text-xs',
                      message.role === 'user' ? 'text-white/70' : 'text-gray-400'
                    )}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}

            {/* 处理中指示器 */}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-500 [animation-delay:0ms]"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-500 [animation-delay:150ms]"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-500 [animation-delay:300ms]"></div>
                    <span className="ml-2 text-sm text-gray-500">正在解析...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 输入区域 */}
        <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="描述你想要创建的任务..."
              disabled={isProcessing}
              className="min-h-[48px] flex-1 rounded-full bg-gray-100 px-4 py-3 text-base focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-50 dark:bg-gray-800 dark:text-white"
            />
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isProcessing}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white transition-all hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="发送"
            >
              <span className="text-lg">{isProcessing ? '⏳' : '➤'}</span>
            </button>
          </div>

          {/* 快捷提示 */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">快捷提示：</span>
            <button
              onClick={() => setInputValue('每天')}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              每天定时
            </button>
            <button
              onClick={() => setInputValue('监控')}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              监控告警
            </button>
            <button
              onClick={() => setInputValue('通知')}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              发送通知
            </button>
          </div>
        </div>
      </div>

      {/* 预览面板 */}
      {showPreview && currentTask && (
        <TaskPreviewPanel
          task={currentTask}
          onCreate={() => handleAction('create', currentTask)}
          onModify={() => handleAction('modify', currentTask)}
          onClose={() => {
            setShowPreview(false)
            setCurrentTask(null)
          }}
          className="w-96 border-l border-gray-200 dark:border-gray-800"
        />
      )}
    </div>
  )
}

export default TaskCreationChat
