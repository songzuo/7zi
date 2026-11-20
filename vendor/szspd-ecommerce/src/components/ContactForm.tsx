'use client'

import { useState, FormEvent, useEffect, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'

interface FormData {
  name: string
  email: string
  company: string
  subject: string
  message: string
}

interface FormErrors {
  name?: string
  email?: string
  message?: string
}

interface ContactFormProps {
  locale?: 'zh' | 'en'
}

export function ContactForm({ locale = 'zh' }: ContactFormProps) {
  const t = useTranslations('contact.form')

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [csrfToken, setCsrfToken] = useState<string | null>(null)

  // 获取 CSRF Token
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch('/api/csrf-token')
        if (response.ok) {
          const data = await response.json()
          setCsrfToken(data.csrfToken)
        }
      } catch (error) {
        // Silently handle error in production
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch CSRF token:', error)
        }
      }
    }

    fetchCsrfToken()
  }, [])

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = locale === 'zh' ? '请输入您的姓名' : 'Please enter your name'
    }

    if (!formData.email.trim()) {
      newErrors.email = locale === 'zh' ? '请输入您的邮箱' : 'Please enter your email'
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      newErrors.email = locale === 'zh' ? '邮箱格式不正确' : 'Invalid email format'
    }

    if (!formData.message.trim()) {
      newErrors.message = locale === 'zh' ? '请输入消息内容' : 'Please enter your message'
    } else if (formData.message.trim().length < 10) {
      newErrors.message =
        locale === 'zh' ? '消息内容至少需要 10 个字符' : 'Message must be at least 10 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, locale])

  // Empty form data object for reset
  const emptyFormData: FormData = {
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
  }

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()

      if (!validateForm()) {
        return
      }

      setIsSubmitting(true)
      setSubmitStatus('idle')

      try {
        // 调用联系表单 API，添加 CSRF 保护
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        }

        // 添加 CSRF Token 到请求头
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken
        }

        const response = await fetch('/api/contact', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...formData, locale }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || '发送失败')
        }

        // 成功处理
        setSubmitStatus('success')
        setFormData(emptyFormData)
      } catch (error) {
        // Silently handle error in production
        if (process.env.NODE_ENV === 'development') {
          console.error('Form submission error:', error)
        }
        setSubmitStatus('error')
      } finally {
        setIsSubmitting(false)
      }
    },
    [validateForm, formData, locale, csrfToken]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target
      setFormData(prev => ({ ...prev, [name]: value }))

      // Clear error for this field if it exists
      setErrors(prev => {
        if (!prev[name as keyof FormErrors]) return prev
        const { [name as keyof FormErrors]: removed, ...rest } = prev
        return rest
      })
    },
    []
  )

  // Memoize subjectOptions to prevent unnecessary recalculations
  const subjectOptions = useMemo(
    () =>
      locale === 'zh'
        ? [
            { value: '', label: '选择咨询主题' },
            { value: 'project', label: '项目咨询' },
            { value: 'cooperation', label: '商务合作' },
            { value: 'support', label: '技术支持' },
            { value: 'careers', label: '加入我们' },
            { value: 'other', label: '其他' },
          ]
        : [
            { value: '', label: 'Select a topic' },
            { value: 'project', label: 'Project Inquiry' },
            { value: 'cooperation', label: 'Business Cooperation' },
            { value: 'support', label: 'Technical Support' },
            { value: 'careers', label: 'Join Us' },
            { value: 'other', label: 'Other' },
          ],
    [locale]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {t('name')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder={locale === 'zh' ? '您的姓名' : 'Your name'}
            className={`w-full rounded-2xl border bg-zinc-50 px-6 py-4 dark:bg-zinc-800 ${
              errors.name
                ? 'border-red-500 focus:border-red-500'
                : 'border-zinc-200 focus:border-cyan-500 dark:border-zinc-700'
            } text-zinc-900 transition-colors focus:outline-none dark:text-white`}
          />
          {errors.name && <p className="mt-2 text-sm text-red-500">{errors.name}</p>}
        </div>
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {t('email')} <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your@email.com"
            className={`w-full rounded-2xl border bg-zinc-50 px-6 py-4 dark:bg-zinc-800 ${
              errors.email
                ? 'border-red-500 focus:border-red-500'
                : 'border-zinc-200 focus:border-cyan-500 dark:border-zinc-700'
            } text-zinc-900 transition-colors focus:outline-none dark:text-white`}
          />
          {errors.email && <p className="mt-2 text-sm text-red-500">{errors.email}</p>}
        </div>
      </div>

      <div>
        <label
          htmlFor="company"
          className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {t('company')}
        </label>
        <input
          type="text"
          id="company"
          name="company"
          value={formData.company}
          onChange={handleChange}
          placeholder={locale === 'zh' ? '您的公司' : 'Your company'}
          className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-4 text-zinc-900 transition-colors focus:border-cyan-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        />
      </div>

      <div>
        <label
          htmlFor="subject"
          className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {t('subject')}
        </label>
        <select
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-4 text-zinc-900 transition-colors focus:border-cyan-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        >
          {subjectOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="message"
          className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {t('message')} <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          value={formData.message}
          onChange={handleChange}
          placeholder={locale === 'zh' ? '请描述您的需求...' : 'Describe your needs...'}
          className={`w-full rounded-2xl border bg-zinc-50 px-6 py-4 dark:bg-zinc-800 ${
            errors.message
              ? 'border-red-500 focus:border-red-500'
              : 'border-zinc-200 focus:border-cyan-500 dark:border-zinc-700'
          } resize-none text-zinc-900 transition-colors focus:outline-none dark:text-white`}
        />
        {errors.message && <p className="mt-2 text-sm text-red-500">{errors.message}</p>}
      </div>

      {/* 提交状态提示 */}
      {submitStatus === 'success' && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <span>✅</span>
            {t('success')}
          </p>
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <span>❌</span>
            {t('error')}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`touch-active min-h-[56px] w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 py-4 text-lg font-semibold text-white transition-all duration-300 ${
          isSubmitting
            ? 'cursor-not-allowed opacity-70'
            : 'hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]'
        }`}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {t('sending')}
          </span>
        ) : (
          t('submit')
        )}
      </button>
    </form>
  )
}
