/**
 * Contact Form Component
 * Refactored for better maintainability and reusability
 */
'use client';

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { createLogger } from '@/lib/logger';
import { FormInput } from './FormInput';
import { FormTextarea } from './FormTextarea';
import { FormSelect } from './FormSelect';
import { SubmitButton } from './SubmitButton';
import { FormStatus } from './FormStatus';
import {
  FormData,
  FormErrors,
  validateContactForm,
  getSubjectOptions,
} from './validation';

const logger = createLogger('ContactForm');

interface ContactFormProps {
  locale?: 'zh' | 'en';
}

const initialFormData: FormData = {
  name: '',
  email: '',
  company: '',
  subject: '',
  message: '',
};

export function ContactForm({ locale = 'zh' }: ContactFormProps) {
  const t = useTranslations('contact.form');
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validation = validateContactForm(formData, locale);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, locale }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '发送失败');
      }

      setSubmitStatus('success');
      setFormData(initialFormData);
    } catch (error) {
      logger.error('Form submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const subjectOptions = getSubjectOptions(locale);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name & Email Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormInput
          id="name"
          name="name"
          label={t('name')}
          value={formData.name}
          onChange={handleChange}
          placeholder={locale === 'zh' ? '您的姓名' : 'Your name'}
          required
          error={errors.name}
        />
        <FormInput
          id="email"
          name="email"
          type="email"
          label={t('email')}
          value={formData.email}
          onChange={handleChange}
          placeholder="your@email.com"
          required
          error={errors.email}
        />
      </div>

      {/* Company (Optional) */}
      <FormInput
        id="company"
        name="company"
        label={locale === 'zh' ? '公司（可选）' : 'Company (Optional)'}
        value={formData.company}
        onChange={handleChange}
        placeholder={locale === 'zh' ? '您的公司' : 'Your company'}
      />

      {/* Subject Select */}
      <FormSelect
        id="subject"
        name="subject"
        label={t('subject')}
        options={subjectOptions}
        value={formData.subject}
        onChange={handleChange}
      />

      {/* Message */}
      <FormTextarea
        id="message"
        name="message"
        label={t('message')}
        rows={6}
        value={formData.message}
        onChange={handleChange}
        placeholder={locale === 'zh' ? '请描述您的需求...' : 'Describe your needs...'}
        required
        error={errors.message}
      />

      {/* Status Messages */}
      <FormStatus status={submitStatus} />

      {/* Submit Button */}
      <SubmitButton
        isSubmitting={isSubmitting}
        label={t('submit')}
        loadingLabel={t('sending')}
      />
    </form>
  );
}