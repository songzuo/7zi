/**
 * 增强版联系表单
 * 使用新的表单验证系统，支持实时验证
 */
"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useFormValidation } from "@/lib/validation";
import { validators } from "@/lib/validation/validators";
import { FormField, Input, Textarea, Select } from "@/components/form";

interface FormData {
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
}

interface EnhancedContactFormProps {
  locale?: 'zh' | 'en';
  onSubmitSuccess?: () => void;
  onSubmitError?: (error: Error) => void;
}

export function EnhancedContactForm({ 
  locale = 'zh',
  onSubmitSuccess,
  onSubmitError,
}: EnhancedContactFormProps) {
  const t = useTranslations('contact.form');
  
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  // 验证规则
  const schema = {
    name: {
      required: locale === 'zh' ? '请输入您的姓名' : 'Please enter your name',
      minLength: 2,
    },
    email: {
      required: locale === 'zh' ? '请输入您的邮箱' : 'Please enter your email',
      custom: validators.email(locale === 'zh' ? '请输入有效的邮箱地址' : 'Please enter a valid email address'),
    },
    company: {
      // 可选字段
    },
    subject: {
      // 可选字段
    },
    message: {
      required: locale === 'zh' ? '请输入消息内容' : 'Please enter your message',
      minLength: 10,
    },
  };

  const initialValues: FormData = {
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
  };

  const {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
  } = useFormValidation(initialValues, schema, {
    validateOnBlur: true,
    validateOnChange: true,
    validateOnSubmit: true,
  });

  // 获取 CSRF Token
  useState(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch('/api/csrf-token');
        if (response.ok) {
          const data = await response.json();
          setCsrfToken(data.csrfToken);
        }
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
      }
    };
    
    fetchCsrfToken();
  });

  // 提交表单
  const submitForm = useCallback(async (formData: FormData) => {
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
      }

      const response = await fetch("/api/contact", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...formData, locale }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "发送失败");
      }

      setSubmitStatus("success");
      reset();
      onSubmitSuccess?.();
    } catch (error) {
      console.error("Form submission error:", error);
      setSubmitStatus("error");
      onSubmitError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsSubmitting(false);
    }
  }, [csrfToken, locale, reset, onSubmitSuccess, onSubmitError]);

  // 主题选项
  const subjectOptions = locale === 'zh' 
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
      ];

  return (
    <form onSubmit={handleSubmit(submitForm)} className="space-y-6" noValidate>
      {/* 姓名和邮箱 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label={t('name')}
          required
          error={errors.name}
          touched={touched.name}
        >
          <Input
            name="name"
            value={values.name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={locale === 'zh' ? "您的姓名" : "Your name"}
            error={errors.name}
            touched={touched.name}
            autoComplete="name"
          />
        </FormField>

        <FormField
          label={t('email')}
          required
          error={errors.email}
          touched={touched.email}
        >
          <Input
            type="email"
            name="email"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="your@email.com"
            error={errors.email}
            touched={touched.email}
            autoComplete="email"
          />
        </FormField>
      </div>

      {/* 公司 */}
      <FormField
        label={locale === 'zh' ? '公司（可选）' : 'Company (Optional)'}
        error={errors.company}
        touched={touched.company}
      >
        <Input
          name="company"
          value={values.company}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={locale === 'zh' ? "您的公司" : "Your company"}
          error={errors.company}
          touched={touched.company}
          autoComplete="organization"
        />
      </FormField>

      {/* 主题 */}
      <FormField
        label={t('subject')}
        error={errors.subject}
        touched={touched.subject}
      >
        <Select
          name="subject"
          value={values.subject}
          onChange={handleChange}
          onBlur={handleBlur}
          options={subjectOptions}
          error={errors.subject}
          touched={touched.subject}
        />
      </FormField>

      {/* 消息 */}
      <FormField
        label={t('message')}
        required
        error={errors.message}
        touched={touched.message}
        hint={locale === 'zh' ? '请描述您的需求，至少10个字符' : 'Describe your needs, at least 10 characters'}
      >
        <Textarea
          name="message"
          value={values.message}
          onChange={handleChange}
          onBlur={handleBlur}
          rows={6}
          placeholder={locale === 'zh' ? "请描述您的需求..." : "Describe your needs..."}
          error={errors.message}
          touched={touched.message}
        />
      </FormField>

      {/* 字符计数 */}
      <div className="text-right text-sm text-zinc-500">
        {values.message.length} / 500
      </div>

      {/* 提交状态提示 */}
      {submitStatus === "success" && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
          <p className="text-green-700 dark:text-green-400 flex items-center gap-2">
            <span>✅</span>
            {t('success')}
          </p>
        </div>
      )}

      {submitStatus === "error" && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
          <p className="text-red-700 dark:text-red-400 flex items-center gap-2">
            <span>❌</span>
            {t('error')}
          </p>
        </div>
      )}

      {/* 提交按钮 */}
      <button
        type="submit"
        disabled={isSubmitting || !isValid}
        className={`w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl font-semibold text-lg transition-all duration-300 ${
          isSubmitting || !isValid
            ? "opacity-70 cursor-not-allowed"
            : "hover:shadow-lg hover:scale-[1.02]"
        }`}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
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

      {/* 调试信息（开发环境） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-mono">
          <p>Debug Info:</p>
          <p>isValid: {isValid.toString()}</p>
          <p>touched: {JSON.stringify(touched)}</p>
          <p>errors: {JSON.stringify(errors)}</p>
        </div>
      )}
    </form>
  );
}