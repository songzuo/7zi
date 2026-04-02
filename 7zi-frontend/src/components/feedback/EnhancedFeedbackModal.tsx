/**
 * EnhancedFeedbackModal - Advanced feedback submission with AI assistance
 *
 * Features:
 * - AI-powered feedback categorization
 * - Similar feedback detection
 * - Rich text editor for descriptions
 * - Template suggestions
 * - Priority prediction
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  X,
  Star,
  Upload,
  Camera,
  Send,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Lightbulb,
  Wand2,
  Copy,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import FeedbackModal, { FeedbackType, FeedbackPriority, FeedbackData } from './FeedbackModal'

interface EnhancedFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (feedback: FeedbackData) => Promise<void>
  currentUser?: {
    id: string
    name: string
    email: string
  }
  onCheckSimilar?: (title: string) => Promise<SimilarFeedback[]>
}

interface SimilarFeedback {
  id: string
  title: string
  status: string
  similarity: number
}

interface FeedbackTemplate {
  id: string
  type: FeedbackType
  title: string
  description: string
  tags: string[]
}

const TEMPLATES: FeedbackTemplate[] = [
  {
    id: 'bug-report',
    type: 'bug',
    title: 'Bug: ',
    description: `**问题描述**\n\n描述你遇到的问题...\n\n**复现步骤**\n1. 步骤一\n2. 步骤二\n3. 步骤三\n\n**期望结果**\n\n应该发生什么...\n\n**实际结果**\n\n实际发生了什么...`,
    tags: ['bug', 'need-investigation'],
  },
  {
    id: 'feature-request',
    type: 'feature',
    title: '功能建议: ',
    description: `**功能描述**\n\n请描述你希望添加的功能...\n\n**使用场景**\n\n在什么情况下会用到这个功能...\n\n**建议方案**\n\n如何实现这个功能...`,
    tags: ['feature', 'needs-discussion'],
  },
  {
    id: 'performance-issue',
    type: 'improvement',
    title: '性能问题: ',
    description: `**问题描述**\n\n性能问题...\n\n**环境信息**\n- 浏览器:\n- 操作系统:\n- 网络环境:\n\n**性能数据**\n\n页面加载时间、内存使用等...`,
    tags: ['performance', 'needs-optimization'],
  },
]

export default function EnhancedFeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  currentUser,
  onCheckSimilar,
}: EnhancedFeedbackModalProps) {
  const [showEnhanced, setShowEnhanced] = useState(true)
  const [feedback, setFeedback] = useState<FeedbackData>({
    type: 'bug',
    priority: 'medium',
    title: '',
    description: '',
    attachments: [],
    tags: [],
  })
  const [similarFeedbacks, setSimilarFeedbacks] = useState<SimilarFeedback[]>([])
  const [isCheckingSimilar, setIsCheckingSimilar] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<{
    type?: FeedbackType
    priority?: FeedbackPriority
    tags?: string[]
  } | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const titleCheckTimer = useRef<NodeJS.Timeout | null>(null)

  // Check for similar feedback when title changes
  useEffect(() => {
    if (!onCheckSimilar || !feedback.title.trim()) {
      setSimilarFeedbacks([])
      return
    }

    if (titleCheckTimer.current) {
      clearTimeout(titleCheckTimer.current)
    }

    titleCheckTimer.current = setTimeout(async () => {
      setIsCheckingSimilar(true)
      try {
        const results = await onCheckSimilar(feedback.title)
        setSimilarFeedbacks(results.filter(r => r.similarity > 0.7))
      } catch (error) {
        console.error('Failed to check similar feedback:', error)
      } finally {
        setIsCheckingSimilar(false)
      }
    }, 500)

    return () => {
      if (titleCheckTimer.current) {
        clearTimeout(titleCheckTimer.current)
      }
    }
  }, [feedback.title, onCheckSimilar])

  // AI-powered feedback analysis
  const analyzeFeedback = async (text: string) => {
    if (!text.trim() || text.length < 20) {
      setAiSuggestion(null)
      return
    }

    setIsAnalyzing(true)
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 500))

      // Simple keyword-based analysis
      const keywords = {
        bug: ['错误', 'bug', '崩溃', '无法', '失败', '异常', '问题'],
        feature: ['建议', '希望', '能否', '添加', '新功能', '支持'],
        improvement: ['优化', '改进', '提升', '性能', '速度', '体验'],
        complaint: ['投诉', '不满', '差', '糟糕', '失望'],
        praise: ['很好', '优秀', '喜欢', '感谢', '棒'],
      }

      const priorityKeywords = {
        urgent: ['紧急', '立刻', '马上', '严重'],
        high: ['重要', '尽快', '影响'],
        medium: ['一般', '中等'],
        low: ['小', '建议', '可选'],
      }

      let detectedType: FeedbackType = 'other'
      let detectedPriority: FeedbackPriority = 'medium'
      const suggestedTags: string[] = []

      // Detect type
      for (const [type, words] of Object.entries(keywords)) {
        if (words.some(word => text.toLowerCase().includes(word))) {
          detectedType = type as FeedbackType
          break
        }
      }

      // Detect priority
      for (const [priority, words] of Object.entries(priorityKeywords)) {
        if (words.some(word => text.toLowerCase().includes(word))) {
          detectedPriority = priority as FeedbackPriority
          break
        }
      }

      // Generate tags
      if (text.includes('浏览器')) suggestedTags.push('browser')
      if (text.includes('移动端')) suggestedTags.push('mobile')
      if (text.includes('API')) suggestedTags.push('api')
      if (text.includes('UI')) suggestedTags.push('ui')

      setAiSuggestion({
        type: detectedType,
        priority: detectedPriority,
        tags: suggestedTags.length > 0 ? suggestedTags : undefined,
      })
    } catch (error) {
      console.error('AI analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return

    setFeedback(prev => ({
      ...prev,
      type: aiSuggestion.type || prev.type,
      priority: aiSuggestion.priority || prev.priority,
      tags: aiSuggestion.tags ? [...new Set([...prev.tags, ...aiSuggestion.tags])] : prev.tags,
    }))

    setAiSuggestion(null)
  }

  const applyTemplate = (template: FeedbackTemplate) => {
    setFeedback(prev => ({
      ...prev,
      type: template.type,
      title: template.title,
      description: template.description,
      tags: [...new Set([...prev.tags, ...template.tags])],
    }))
    setShowTemplates(false)
  }

  const handleSubmit = async (data: FeedbackData) => {
    await onSubmit(data)
    setShowEnhanced(true)
    setSimilarFeedbacks([])
    setAiSuggestion(null)
  }

  if (!showEnhanced) {
    return (
      <FeedbackModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={handleSubmit}
        currentUser={currentUser}
        initialData={feedback}
      />
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="智能反馈助手" size="xl">
      <div className="space-y-6">
        {/* Mode Toggle */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEnhanced(false)}
            className="text-gray-500"
          >
            切换到普通模式
          </Button>
        </div>

        {/* Similar Feedback Warning */}
        {similarFeedbacks.length > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <h4 className="mb-1 text-sm font-medium text-blue-900">发现相似反馈</h4>
                <p className="mb-2 text-sm text-blue-700">
                  已找到 {similarFeedbacks.length} 条相似的反馈，可能您的问题已经被报告过了。
                </p>
                <div className="space-y-2">
                  {similarFeedbacks.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded border border-blue-200 bg-white p-2"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500">
                          状态: {item.status} | 相似度: {(item.similarity * 100).toFixed(0)}%
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        查看详情
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Templates */}
        {showTemplates && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">快速模板</h4>
              <Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="rounded-lg border border-gray-200 bg-white p-3 text-left transition-all hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="mb-1 flex items-center space-x-2">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {template.type === 'bug'
                        ? '问题报告'
                        : template.type === 'feature'
                          ? '功能建议'
                          : '性能问题'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {template.type === 'bug'
                      ? '结构化的问题描述模板'
                      : template.type === 'feature'
                        ? '新功能建议模板'
                        : '性能问题报告模板'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title Input */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              标题 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-2">
              {isCheckingSimilar && (
                <span className="flex items-center text-xs text-gray-500">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  检查相似反馈...
                </span>
              )}
              {!showTemplates && (
                <Button variant="ghost" size="sm" onClick={() => setShowTemplates(true)}>
                  <Copy className="mr-1 h-4 w-4" />
                  使用模板
                </Button>
              )}
            </div>
          </div>
          <Input
            type="text"
            value={feedback.title}
            onChange={e => {
              setFeedback(prev => ({ ...prev, title: e.target.value }))
              analyzeFeedback(e.target.value + ' ' + feedback.description)
            }}
            placeholder="简要描述问题或建议..."
            required
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              详细描述 <span className="text-red-500">*</span>
            </label>
            {isAnalyzing && (
              <span className="flex items-center text-xs text-gray-500">
                <Sparkles className="mr-1 h-3 w-3 animate-pulse" />
                AI 分析中...
              </span>
            )}
          </div>
          <textarea
            value={feedback.description}
            onChange={e => {
              setFeedback(prev => ({ ...prev, description: e.target.value }))
              analyzeFeedback(feedback.title + ' ' + e.target.value)
            }}
            placeholder="请详细描述您遇到的问题或建议...&#10;&#10;支持 Markdown 格式"
            required
            minLength={10}
            maxLength={1000}
            rows={8}
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* AI Suggestion */}
        {aiSuggestion && (
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
            <div className="flex items-start space-x-3">
              <Wand2 className="mt-0.5 h-5 w-5 text-purple-600" />
              <div className="flex-1">
                <h4 className="mb-2 text-sm font-medium text-purple-900">AI 建议</h4>
                <div className="space-y-2 text-sm text-purple-700">
                  {aiSuggestion.type && (
                    <p>
                      • 建议分类: <strong>{aiSuggestion.type}</strong>
                    </p>
                  )}
                  {aiSuggestion.priority && (
                    <p>
                      • 建议优先级: <strong>{aiSuggestion.priority}</strong>
                    </p>
                  )}
                  {aiSuggestion.tags && aiSuggestion.tags.length > 0 && (
                    <p>
                      • 建议标签: <strong>{aiSuggestion.tags.join(', ')}</strong>
                    </p>
                  )}
                </div>
                <div className="mt-3 flex space-x-2">
                  <Button size="sm" onClick={applyAiSuggestion}>
                    <ThumbsUp className="mr-1 h-4 w-4" />
                    应用建议
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAiSuggestion(null)}>
                    <ThumbsDown className="mr-1 h-4 w-4" />
                    忽略
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Type Selection */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">反馈类型</label>
          <div className="grid grid-cols-3 gap-2">
            {['bug', 'feature', 'improvement', 'complaint', 'praise', 'other'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFeedback(prev => ({ ...prev, type: type as FeedbackType }))}
                className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                  feedback.type === type
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {type === 'bug'
                  ? '🐛 问题'
                  : type === 'feature'
                    ? '💡 功能'
                    : type === 'improvement'
                      ? '✨ 改进'
                      : type === 'complaint'
                        ? '⚠️ 投诉'
                        : type === 'praise'
                          ? '👍 表扬'
                          : '📝 其他'}
              </button>
            ))}
          </div>
        </div>

        {/* Priority Selection */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">优先级</label>
          <div className="grid grid-cols-4 gap-2">
            {['low', 'medium', 'high', 'urgent'].map(priority => (
              <button
                key={priority}
                type="button"
                onClick={() =>
                  setFeedback(prev => ({ ...prev, priority: priority as FeedbackPriority }))
                }
                className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                  feedback.priority === priority
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {priority === 'low'
                  ? '低'
                  : priority === 'medium'
                    ? '中'
                    : priority === 'high'
                      ? '高'
                      : '紧急'}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">标签</label>
          <div className="flex flex-wrap gap-2">
            {feedback.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
              >
                {tag}
                <button
                  type="button"
                  onClick={() =>
                    setFeedback(prev => ({
                      ...prev,
                      tags: prev.tags.filter(t => t !== tag),
                    }))
                  }
                  className="ml-2 focus:outline-none"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="添加标签..."
              className="rounded-full border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const value = (e.target as HTMLInputElement).value.trim()
                  if (value && !feedback.tags.includes(value)) {
                    setFeedback(prev => ({
                      ...prev,
                      tags: [...prev.tags, value.toLowerCase()],
                    }))
                    ;(e.target as HTMLInputElement).value = ''
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={() => handleSubmit(feedback)}
            disabled={!feedback.title.trim() || !feedback.description.trim()}
          >
            <Send className="mr-2 h-4 w-4" />
            提交反馈
          </Button>
        </div>
      </div>
    </Modal>
  )
}
