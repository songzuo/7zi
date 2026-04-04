/**
 * MultiStepFeedbackForm - 多步骤反馈表单
 *
 * Features:
 * - 分步骤表单（问题类型 → 详细描述 → 截图/附件 → 联系方式）
 * - 进度指示器
 * - 步骤验证
 * - 自动保存草稿
 * - 支持国际化
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/client'
import type { FeedbackType, FeedbackPriority, FeedbackData } from '@/lib/db/feedback-types'
import { ScreenshotAnnotation } from './ScreenshotAnnotation'
import { EmotionSelector } from './EmotionSelector'

interface MultiStepFeedbackFormProps {
  onSubmit: (feedback: FeedbackData) => Promise<void>
  onCancel: () => void
  currentUser?: {
    id: string
    name: string
    email: string
  }
  initialData?: Partial<FeedbackData>
}

type Step = 'type' | 'description' | 'attachments' | 'contact' | 'review'

const STEPS: Step[] = ['type', 'description', 'attachments', 'contact', 'review']

const STEP_TITLES: Record<Step, string> = {
  type: 'feedback.steps.type.title',
  description: 'feedback.steps.description.title',
  attachments: 'feedback.steps.attachments.title',
  contact: 'feedback.steps.contact.title',
  review: 'feedback.steps.review.title',
}

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: string; color: string }[] = [
  { value: 'bug', label: 'feedback.types.bug', icon: '🐛', color: 'bg-red-500' },
  { value: 'feature', label: 'feedback.types.feature', icon: '💡', color: 'bg-blue-500' },
  { value: 'improvement', label: 'feedback.types.improvement', icon: '✨', color: 'bg-purple-500' },
  { value: 'complaint', label: 'feedback.types.complaint', icon: '⚠️', color: 'bg-orange-500' },
  { value: 'praise', label: 'feedback.types.praise', icon: '👍', color: 'bg-green-500' },
  { value: 'other', label: 'feedback.types.other', icon: '📝', color: 'bg-gray-500' },
]

const PRIORITIES: { value: FeedbackPriority; label: string; color: string }[] = [
  { value: 'low', label: 'feedback.priorities.low', color: 'bg-gray-400' },
  { value: 'medium', label: 'feedback.priorities.medium', color: 'bg-blue-400' },
  { value: 'high', label: 'feedback.priorities.high', color: 'bg-orange-400' },
  { value: 'urgent', label: 'feedback.priorities.urgent', color: 'bg-red-500' },
]

export default function MultiStepFeedbackForm({
  onSubmit,
  onCancel,
  currentUser,
  initialData,
}: MultiStepFeedbackFormProps) {
  const { t } = useTranslation('feedback')
  const [currentStep, setCurrentStep] = useState<Step>('type')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

  const [feedback, setFeedback] = useState<FeedbackData>({
    type: 'bug',
    priority: 'medium',
    title: '',
    description: '',
    attachments: [],
    tags: [],
  })

  const [contactInfo, setContactInfo] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: '',
  })

  const [emotion, setEmotion] = useState<'very-dissatisfied' | 'dissatisfied' | 'neutral' | 'satisfied' | 'very-satisfied'>('neutral')

  // Load initial data
  useEffect(() => {
    if (initialData) {
      setFeedback(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem('feedback-draft')
    if (draft && !initialData) {
      try {
        const parsed = JSON.parse(draft)
        setFeedback(prev => ({ ...prev, ...parsed.feedback }))
        setContactInfo(prev => ({ ...prev, ...parsed.contactInfo }))
        setEmotion(parsed.emotion || 'neutral')
      } catch (error) {
        console.error('Failed to load draft:', error)
      }
    }
  }, [initialData])

  // Auto-save draft
  const saveDraft = useCallback(async () => {
    setIsSaving(true)
    try {
      const dataToSave = {
        feedback,
        contactInfo,
        emotion,
      }
      localStorage.setItem('feedback-draft', JSON.stringify(dataToSave))
      setShowSaveSuccess(true)
      setTimeout(() => setShowSaveSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to save draft:', error)
    } finally {
      setIsSaving(false)
    }
  }, [feedback, contactInfo, emotion])

  // Auto-save on changes
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft()
    }, 2000)

    return () => clearTimeout(timer)
  }, [feedback, contactInfo, emotion, saveDraft])

  const getCurrentStepIndex = () => STEPS.indexOf(currentStep)

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 'type':
        return true
      case 'description':
        return feedback.title.trim().length > 0 && feedback.description.trim().length >= 10
      case 'attachments':
        return true
      case 'contact':
        return contactInfo.name.trim().length > 0 && contactInfo.email.trim().length > 0
      case 'review':
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    const currentIndex = getCurrentStepIndex()
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1])
    }
  }

  const handlePrevious = () => {
    const currentIndex = getCurrentStepIndex()
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1])
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const dataToSubmit: FeedbackData = {
        ...feedback,
        tags: [...feedback.tags, emotion],
      }

      await onSubmit(dataToSubmit)

      // Clear draft
      localStorage.removeItem('feedback-draft')
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAttachmentAdd = (url: string) => {
    setFeedback(prev => ({
      ...prev,
      attachments: [...prev.attachments, url],
    }))
  }

  const handleAttachmentRemove = (url: string) => {
    setFeedback(prev => ({
      ...prev,
      attachments: prev.attachments.filter(u => u !== url),
    }))
  }

  // Step 1: Type Selection
  const renderTypeStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-medium text-gray-900">{t('steps.type.subtitle')}</h3>
        <div className="grid grid-cols-3 gap-4">
          {FEEDBACK_TYPES.map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => setFeedback(prev => ({ ...prev, type: type.value }))}
              className={`flex flex-col items-center rounded-lg border-2 p-6 transition-all ${
                feedback.type === type.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="mb-2 text-3xl">{type.icon}</span>
              <span className="text-sm font-medium">{t(type.label)}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-medium text-gray-900">{t('steps.type.priority')}</h3>
        <div className="grid grid-cols-4 gap-3">
          {PRIORITIES.map(priority => (
            <button
              key={priority.value}
              type="button"
              onClick={() => setFeedback(prev => ({ ...prev, priority: priority.value }))}
              className={`rounded-lg border-2 px-4 py-3 font-medium transition-all ${
                feedback.priority === priority.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {t(priority.label)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-medium text-gray-900">{t('steps.type.emotion')}</h3>
        <EmotionSelector value={emotion} onChange={setEmotion} />
      </div>
    </div>
  )

  // Step 2: Description
  const renderDescriptionStep = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="title" className="mb-2 block text-sm font-medium text-gray-700">
          {t('steps.description.title')} <span className="text-red-500">*</span>
        </label>
        <Input
          id="title"
          type="text"
          value={feedback.title}
          onChange={e => setFeedback(prev => ({ ...prev, title: e.target.value }))}
          placeholder={t('steps.description.titlePlaceholder')}
          required
          maxLength={100}
        />
        <p className="mt-1 text-xs text-gray-500">
          {feedback.title.length} / 100 {t('steps.description.characters')}
        </p>
      </div>

      <div>
        <label htmlFor="description" className="mb-2 block text-sm font-medium text-gray-700">
          {t('steps.description.description')} <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          value={feedback.description}
          onChange={e => setFeedback(prev => ({ ...prev, description: e.target.value }))}
          placeholder={t('steps.description.descriptionPlaceholder')}
          required
          minLength={10}
          maxLength={1000}
          rows={8}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          {feedback.description.length} / 1000 {t('steps.description.characters')}
        </p>
      </div>

      <div>
        <label htmlFor="url" className="mb-2 block text-sm font-medium text-gray-700">
          {t('steps.description.url')}
        </label>
        <Input
          id="url"
          type="url"
          value={feedback.url || ''}
          onChange={e => setFeedback(prev => ({ ...prev, url: e.target.value }))}
          placeholder={t('steps.description.urlPlaceholder')}
        />
      </div>
    </div>
  )

  // Step 3: Attachments
  const renderAttachmentsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-medium text-gray-900">{t('steps.attachments.subtitle')}</h3>
        <ScreenshotAnnotation
          onImageAdd={handleAttachmentAdd}
          onImageRemove={handleAttachmentRemove}
          images={feedback.attachments}
        />
      </div>

      {feedback.attachments.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-700">{t('steps.attachments.list')}</h3>
          <div className="grid grid-cols-4 gap-3">
            {feedback.attachments.map((url, index) => (
              <div key={index} className="group relative">
                <img
                  src={url}
                  alt={`Attachment ${index + 1}`}
                  className="h-32 w-full rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleAttachmentRemove(url)}
                  className="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <ChevronLeft className="h-4 w-4 rotate-180" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // Step 4: Contact Info
  const renderContactStep = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
          {t('steps.contact.name')} <span className="text-red-500">*</span>
        </label>
        <Input
          id="name"
          type="text"
          value={contactInfo.name}
          onChange={e => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
          placeholder={t('steps.contact.namePlaceholder')}
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
          {t('steps.contact.email')} <span className="text-red-500">*</span>
        </label>
        <Input
          id="email"
          type="email"
          value={contactInfo.email}
          onChange={e => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
          placeholder={t('steps.contact.emailPlaceholder')}
          required
        />
      </div>

      <div>
        <label htmlFor="phone" className="mb-2 block text-sm font-medium text-gray-700">
          {t('steps.contact.phone')}
        </label>
        <Input
          id="phone"
          type="tel"
          value={contactInfo.phone}
          onChange={e => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
          placeholder={t('steps.contact.phonePlaceholder')}
        />
      </div>

      {!currentUser && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            ℹ️ {t('steps.contact.loginHint')}
          </p>
        </div>
      )}
    </div>
  )

  // Step 5: Review
  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h3 className="mb-4 text-lg font-medium text-gray-900">{t('steps.review.summary')}</h3>

        <div className="space-y-4">
          <div>
            <span className="text-sm font-medium text-gray-600">{t('steps.review.type')}:</span>
            <span className="ml-2 text-sm text-gray-900">
              {FEEDBACK_TYPES.find(t => t.value === feedback.type)?.icon} {t(FEEDBACK_TYPES.find(t => t.value === feedback.type)?.label || '')}
            </span>
          </div>

          <div>
            <span className="text-sm font-medium text-gray-600">{t('steps.review.priority')}:</span>
            <span className="ml-2 text-sm text-gray-900">
              {t(PRIORITIES.find(p => p.value === feedback.priority)?.label || '')}
            </span>
          </div>

          <div>
            <span className="text-sm font-medium text-gray-600">{t('steps.review.emotion')}:</span>
            <span className="ml-2 text-sm text-gray-900">
              {emotion}
            </span>
          </div>

          <div>
            <span className="text-sm font-medium text-gray-600">{t('steps.review.title')}:</span>
            <p className="mt-1 text-sm text-gray-900">{feedback.title}</p>
          </div>

          <div>
            <span className="text-sm font-medium text-gray-600">{t('steps.review.description')}:</span>
            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{feedback.description}</p>
          </div>

          {feedback.url && (
            <div>
              <span className="text-sm font-medium text-gray-600">{t('steps.review.url')}:</span>
              <a
                href={feedback.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-sm text-blue-600 hover:underline"
              >
                {feedback.url}
              </a>
            </div>
          )}

          {feedback.attachments.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-600">{t('steps.review.attachments')}:</span>
              <span className="ml-2 text-sm text-gray-900">{feedback.attachments.length} {t('steps.review.files')}</span>
            </div>
          )}

          <div>
            <span className="text-sm font-medium text-gray-600">{t('steps.review.contact')}:</span>
            <p className="mt-1 text-sm text-gray-900">
              {contactInfo.name} ({contactInfo.email})
              {contactInfo.phone && ` - ${contactInfo.phone}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep = () => {
    switch (currentStep) {
      case 'type':
        return renderTypeStep()
      case 'description':
        return renderDescriptionStep()
      case 'attachments':
        return renderAttachmentsStep()
      case 'contact':
        return renderContactStep()
      case 'review':
        return renderReviewStep()
      default:
        return null
    }
  }

  return (
    <div className="w-full">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-medium transition-all ${
                    index <= getCurrentStepIndex()
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {index < getCurrentStepIndex() ? '✓' : index + 1}
                </div>
                <span
                  className={`mt-2 text-xs ${
                    index <= getCurrentStepIndex() ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  {t(STEP_TITLES[step])}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all ${
                    index < getCurrentStepIndex() ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-8">{renderStep()}</div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-6">
        <div className="flex items-center space-x-2">
          {getCurrentStepIndex() > 0 && (
            <Button type="button" variant="outline" onClick={handlePrevious}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              {t('actions.previous')}
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={saveDraft} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {t('actions.saveDraft')}
          </Button>
          {showSaveSuccess && (
            <span className="text-sm text-green-600">{t('actions.saved')}</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('actions.cancel')}
          </Button>
          {getCurrentStepIndex() < STEPS.length - 1 ? (
            <Button type="button" onClick={handleNext} disabled={!canGoNext()}>
              {t('actions.next')}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('actions.submitting')}
                </>
              ) : (
                t('actions.submit')
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}