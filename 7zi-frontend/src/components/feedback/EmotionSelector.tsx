/**
 * EmotionSelector - 情绪/满意度选择器
 *
 * Features:
 * - 5级情绪选择（非常不满意 → 非常满意）
 * - 表情图标
 * - 自定义颜色和样式
 * - 支持禁用状态
 * - 支持国际化
 */

'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Send, Loader2 } from 'lucide-react'

type EmotionLevel = 'very-dissatisfied' | 'dissatisfied' | 'neutral' | 'satisfied' | 'very-satisfied'

interface EmotionSelectorProps {
  value: EmotionLevel
  onChange: (value: EmotionLevel) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

interface EmotionOption {
  value: EmotionLevel
  icon: string
  labelKey: string
  color: string
  hoverColor: string
}

const EMOTION_OPTIONS: EmotionOption[] = [
  {
    value: 'very-dissatisfied',
    icon: '😠',
    labelKey: 'feedback.emotions.veryDissatisfied',
    color: 'bg-red-500',
    hoverColor: 'hover:bg-red-100',
  },
  {
    value: 'dissatisfied',
    icon: '😕',
    labelKey: 'feedback.emotions.dissatisfied',
    color: 'bg-orange-500',
    hoverColor: 'hover:bg-orange-100',
  },
  {
    value: 'neutral',
    icon: '😐',
    labelKey: 'feedback.emotions.neutral',
    color: 'bg-yellow-500',
    hoverColor: 'hover:bg-yellow-100',
  },
  {
    value: 'satisfied',
    icon: '🙂',
    labelKey: 'feedback.emotions.satisfied',
    color: 'bg-lime-500',
    hoverColor: 'hover:bg-lime-100',
  },
  {
    value: 'very-satisfied',
    icon: '😄',
    labelKey: 'feedback.emotions.verySatisfied',
    color: 'bg-green-500',
    hoverColor: 'hover:bg-green-100',
  },
]

const SIZE_CLASSES = {
  sm: {
    container: 'gap-2',
    button: 'p-2',
    icon: 'text-2xl',
  },
  md: {
    container: 'gap-3',
    button: 'p-3',
    icon: 'text-3xl',
  },
  lg: {
    container: 'gap-4',
    button: 'p-4',
    icon: 'text-4xl',
  },
}

export function EmotionSelector({
  value,
  onChange,
  disabled = false,
  size = 'md',
  showLabel = true,
}: EmotionSelectorProps) {
  const { t } = useTranslation('feedback')
  const sizeClasses = SIZE_CLASSES[size]

  return (
    <div className="space-y-3">
      {showLabel && (
        <p className="text-sm text-gray-600">
          {t('feedback.emotions.selectPrompt')}
        </p>
      )}

      <div className={`flex ${sizeClasses.container}`}>
        {EMOTION_OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            className={`
              ${sizeClasses.button}
              ${sizeClasses.icon}
              relative
              flex
              flex-col
              items-center
              rounded-xl
              border-2
              transition-all
              ${option.hoverColor}
              ${
                value === option.value
                  ? `${option.color} border-transparent text-white shadow-md scale-110`
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            `}
            title={t(option.labelKey)}
          >
            <span
              className={value === option.value ? 'filter drop-shadow-sm' : ''}
            >
              {option.icon}
            </span>

            {showLabel && (
              <span
                className={`mt-1 text-xs font-medium ${
                  value === option.value ? 'text-white' : 'text-gray-600'
                }`}
              >
                {t(option.labelKey)}
              </span>
            )}

            {/* Selection indicator */}
            {value === option.value && (
              <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-blue-500">
                <svg
                  className="h-3 w-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Selected emotion description */}
      {value && (
        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          {t('feedback.emotions.selected')}: {t(EMOTION_OPTIONS.find(o => o.value === value)?.labelKey || '')}
        </p>
      )}
    </div>
  )
}

/**
 * SatisfactionRating - 星级满意度评价
 *
 * 简化的星级评分组件
 */

interface SatisfactionRatingProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  maxStars?: number
  showLabel?: boolean
}

export function SatisfactionRating({
  value,
  onChange,
  disabled = false,
  maxStars = 5,
  showLabel = true,
}: SatisfactionRatingProps) {
  const { t } = useTranslation('feedback')

  const handleClick = (rating: number) => {
    if (!disabled) {
      // Toggle off if clicking the same star
      onChange(value === rating ? 0 : rating)
    }
  }

  return (
    <div className="space-y-2">
      {showLabel && (
        <p className="text-sm text-gray-600">
          {t('feedback.rating.selectPrompt')}
        </p>
      )}

      <div className="flex items-center space-x-1">
        {Array.from({ length: maxStars }, (_, index) => {
          const starValue = index + 1
          const isFilled = starValue <= value

          return (
            <button
              key={starValue}
              type="button"
              onClick={() => handleClick(starValue)}
              disabled={disabled}
              className={`focus:outline-none ${
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              <svg
                className={`h-8 w-8 transition-all ${
                  isFilled
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-200 text-gray-300'
                } ${!disabled && 'hover:scale-110'}`}
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          )
        })}

        {value > 0 && (
          <span className="ml-3 text-sm font-medium text-gray-700">
            {value} / {maxStars} {t('feedback.rating.stars')}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * FeedbackSatisfactionModal - 反馈满意度评价弹窗
 *
 * 在反馈处理完成后弹出，收集用户满意度
 */


interface FeedbackSatisfactionModalProps {
  isOpen: boolean
  feedbackId: string
  onSubmit: (satisfaction: {
    rating: number
    emotion: string
    comment: string
  }) => Promise<void>
  onClose: () => void
}

export function FeedbackSatisfactionModal({
  isOpen,
  feedbackId,
  onSubmit,
  onClose,
}: FeedbackSatisfactionModalProps) {
  const { t } = useTranslation('feedback')
  const [rating, setRating] = useState(0)
  const [emotion, setEmotion] = useState<'very-dissatisfied' | 'dissatisfied' | 'neutral' | 'satisfied' | 'very-satisfied'>('neutral')
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit({
        rating,
        emotion,
        comment,
      })
      setSubmitted(true)
      setTimeout(() => {
        onClose()
        // Reset state for next time
        setRating(0)
        setEmotion('neutral')
        setComment('')
        setSubmitted(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to submit satisfaction:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('feedback.satisfaction.title')}
      size="md"
    >
      {submitted ? (
        <div className="py-8 text-center">
          <div className="mb-4 text-5xl">🎉</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            {t('feedback.satisfaction.thankYou')}
          </h3>
          <p className="text-sm text-gray-600">
            {t('feedback.satisfaction.submitted')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            {t('feedback.satisfaction.prompt')}
          </p>

          {/* Rating */}
          <SatisfactionRating
            value={rating}
            onChange={setRating}
          />

          {/* Emotion */}
          <EmotionSelector
            value={emotion}
            onChange={setEmotion}
            size="sm"
          />

          {/* Comment */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t('feedback.satisfaction.commentLabel')}
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={t('feedback.satisfaction.commentPlaceholder')}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              {t('feedback.satisfaction.skip')}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('feedback.satisfaction.submitting')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('feedback.satisfaction.submit')}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
