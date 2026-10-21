'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useTranslation } from 'react-i18next'
import { EmotionSelector, SatisfactionRating } from './EmotionSelector'
import { Send, Loader2 } from 'lucide-react'

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

export default function FeedbackSatisfactionModal({
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
