'use client'

import type { Metadata } from 'next'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  X,
  Mail,
  ArrowRight,
  Star,
  Zap,
  Shield,
  Users,
  Headphones,
  Globe,
} from 'lucide-react'
import { Navigation } from '@/components/ui/Navigation'

type PricingTier = 'free' | 'pro' | 'enterprise'

interface PricingCardProps {
  tier: PricingTier
  isYearly: boolean
  isPopular?: boolean
}

interface PricingFeatures {
  [key: string]: {
    free: boolean | string
    pro: boolean | string
    enterprise: boolean | string
  }
}

interface Translations {
  title: string
  subtitle: string
  billing: {
    monthly: string
    yearly: string
    save: string
  }
  tiers: {
    free: {
      name: string
      description: string
      price: string
      cta: string
    }
    pro: {
      name: string
      description: string
      price: string
      cta: string
      popular: string
    }
    enterprise: {
      name: string
      description: string
      price: string
      cta: string
    }
  }
  features: {
    basic: string
    advanced: string
    collaboration: string
    support: string
    integrations: string
    storage: string
    bandwidth: string
    users: string
    apiCalls: string
    customDomain: string
    analytics: string
    priority: string
  }
  comparison: {
    title: string
    description: string
  }
  form: {
    title: string
    subtitle: string
    email: string
    submit: string
    success: string
    error: string
    privacy: string
  }
  faq: {
    title: string
    items: Array<{
      question: string
      answer: string
    }>
  }
}

const zhTranslations: Translations = {
  title: '选择适合您的计划',
  subtitle: '灵活的定价方案，满足个人和团队的各种需求',
  billing: {
    monthly: '按月付费',
    yearly: '按年付费',
    save: '节省 20%',
  },
  tiers: {
    free: {
      name: '免费版',
      description: '适合个人用户和轻度使用',
      price: '¥0',
      cta: '开始使用',
    },
    pro: {
      name: '专业版',
      description: '适合小型团队和专业人士',
      price: '¥99',
      popular: '最受欢迎',
      cta: '立即升级',
    },
    enterprise: {
      name: '企业版',
      description: '适合大型组织和复杂需求',
      price: '¥399',
      cta: '联系销售',
    },
  },
  features: {
    basic: '基础功能',
    advanced: '高级功能',
    collaboration: '团队协作',
    support: '技术支持',
    integrations: '集成功能',
    storage: '存储空间',
    bandwidth: '带宽限制',
    users: '用户数量',
    apiCalls: 'API 调用',
    customDomain: '自定义域名',
    analytics: '数据分析',
    priority: '优先支持',
  },
  comparison: {
    title: '功能对比',
    description: '详细了解各版本的功能差异',
  },
  form: {
    title: '获取专业报价',
    subtitle: '提交您的信息，我们的销售团队将尽快与您联系',
    email: '邮箱地址',
    submit: '提交申请',
    success: '提交成功！我们会尽快与您联系。',
    error: '提交失败，请稍后重试。',
    privacy: '提交即表示您同意我们的隐私政策',
  },
  faq: {
    title: '常见问题',
    items: [
      {
        question: '免费版可以商用吗？',
        answer: '可以。免费版包含所有基础功能，适合个人和小团队使用。',
      },
      {
        question: '可以随时升级或降级吗？',
        answer: '可以。您可以随时在账户设置中更改您的订阅计划。',
      },
      {
        question: '支持退款吗？',
        answer: '我们提供 30 天无理由退款保证，让您放心使用。',
      },
      {
        question: '企业版包含哪些服务？',
        answer: '企业版包含专属客户经理、定制化功能、SLA 保证以及优先技术支持。',
      },
    ],
  },
}

const enTranslations: Translations = {
  title: 'Choose Your Plan',
  subtitle: 'Flexible pricing for individuals and teams of all sizes',
  billing: {
    monthly: 'Monthly',
    yearly: 'Yearly',
    save: 'Save 20%',
  },
  tiers: {
    free: {
      name: 'Free',
      description: 'Perfect for individuals and casual use',
      price: '$0',
      cta: 'Get Started',
    },
    pro: {
      name: 'Pro',
      description: 'Best for small teams and professionals',
      price: '$99',
      popular: 'Most Popular',
      cta: 'Upgrade Now',
    },
    enterprise: {
      name: 'Enterprise',
      description: 'Ideal for large organizations',
      price: '$399',
      cta: 'Contact Sales',
    },
  },
  features: {
    basic: 'Basic Features',
    advanced: 'Advanced Features',
    collaboration: 'Team Collaboration',
    support: 'Technical Support',
    integrations: 'Integrations',
    storage: 'Storage',
    bandwidth: 'Bandwidth',
    users: 'Users',
    apiCalls: 'API Calls',
    customDomain: 'Custom Domain',
    analytics: 'Analytics',
    priority: 'Priority Support',
  },
  comparison: {
    title: 'Feature Comparison',
    description: 'Compare all features across different plans',
  },
  form: {
    title: 'Get Custom Quote',
    subtitle: 'Submit your information and our sales team will contact you soon',
    email: 'Email Address',
    submit: 'Submit Request',
    success: 'Success! We will contact you soon.',
    error: 'Submission failed, please try again later.',
    privacy: 'By submitting, you agree to our Privacy Policy',
  },
  faq: {
    title: 'Frequently Asked Questions',
    items: [
      {
        question: 'Can I use the free plan for commercial purposes?',
        answer:
          'Yes. The free plan includes all basic features and is suitable for individuals and small teams.',
      },
      {
        question: 'Can I upgrade or downgrade anytime?',
        answer: 'Yes. You can change your subscription plan anytime in your account settings.',
      },
      {
        question: 'Do you offer refunds?',
        answer: 'We offer a 30-day no-questions-asked refund policy.',
      },
      {
        question: 'What services are included in the Enterprise plan?',
        answer:
          'The Enterprise plan includes a dedicated account manager, customized features, SLA guarantee, and priority technical support.',
      },
    ],
  },
}

const featuresData: PricingFeatures = {
  basic: { free: true, pro: true, enterprise: true },
  advanced: { free: false, pro: true, enterprise: true },
  collaboration: { free: false, pro: true, enterprise: true },
  support: { free: '社区支持', pro: '邮件支持', enterprise: '专属支持' },
  integrations: { free: '5 个', pro: '50 个', enterprise: '无限' },
  storage: { free: '1 GB', pro: '100 GB', enterprise: '无限' },
  bandwidth: { free: '10 GB/月', pro: '1 TB/月', enterprise: '无限' },
  users: { free: '1 人', pro: '10 人', enterprise: '无限' },
  apiCalls: { free: '1,000/月', pro: '100,000/月', enterprise: '无限' },
  customDomain: { free: false, pro: true, enterprise: true },
  analytics: { free: '基础', pro: '高级', enterprise: '定制' },
  priority: { free: false, pro: true, enterprise: true },
}

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false)
  const [language, setLanguage] = useState<'zh' | 'en'>('zh')
  const [email, setEmail] = useState('')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const t = language === 'zh' ? zhTranslations : enTranslations

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    try {
      // TODO: Integrate with backend API
      console.log('Email submitted:', email)
      setSubmitStatus('success')
      setEmail('')
    } catch (error) {
      console.error('Error submitting email:', error)
      setSubmitStatus('error')
    }
  }

  const router = useRouter()

  const handleCtaClick = (tier: PricingTier) => {
    switch (tier) {
      case 'free':
        router.push('/register')
        break
      case 'pro':
        router.push('/register?plan=pro')
        break
      case 'enterprise':
        router.push('/contact')
        break
    }
  }

  const PricingCard = ({ tier, isYearly, isPopular }: PricingCardProps) => {
    const tierData = t.tiers[tier]
    const isFree = tier === 'free'
    const isEnterprise = tier === 'enterprise'

    return (
      <div
        className={`relative rounded-2xl p-8 transition-all duration-300 ${isPopular ? 'scale-105 bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-xl' : 'bg-white shadow-lg hover:shadow-xl dark:bg-gray-800'} `}
      >
        {isPopular && 'popular' in tierData && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
            <span className="flex items-center gap-1 rounded-full bg-yellow-400 px-4 py-1 text-sm font-semibold text-yellow-900">
              <Star className="h-4 w-4" />
              {tierData.popular}
            </span>
          </div>
        )}

        <div className="mb-6 text-center">
          <h3 className="mb-2 text-2xl font-bold">{tierData.name}</h3>
          <p
            className={`text-sm ${isPopular ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}
          >
            {tierData.description}
          </p>
        </div>

        <div className="mb-6 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold">{tierData.price}</span>
            {!isEnterprise && (
              <span className={isPopular ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}>
                /{isYearly ? '年' : '月'}
              </span>
            )}
          </div>
          {isYearly && !isFree && !isEnterprise && (
            <p className="mt-2 text-sm text-green-400">{t.billing.save}</p>
          )}
        </div>

        <button
          onClick={() => handleCtaClick(tier)}
          className={`w-full rounded-lg px-6 py-3 font-semibold transition-all duration-200 ${
            isPopular
              ? 'bg-white text-blue-600 hover:bg-blue-50'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } `}
        >
          {tierData.cta}
          {!isEnterprise && <ArrowRight className="ml-2 inline h-4 w-4" />}
        </button>

        <ul className="mt-8 space-y-4">
          {Object.entries(featuresData).map(([feature, values]) => {
            const value = values[tier]
            const hasFeature = value === true || (typeof value === 'string' && value !== '社区支持')
            const featureLabel = t.features[feature as keyof typeof t.features]

            return (
              <li key={feature} className="flex items-start gap-3">
                {hasFeature ? (
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                ) : (
                  <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                )}
                <span className={isPopular ? '' : 'text-gray-700 dark:text-gray-300'}>
                  {featureLabel}
                  {typeof value === 'string' && value !== '社区支持' && (
                    <span
                      className={`ml-2 text-sm ${isPopular ? 'text-blue-100' : 'text-gray-500'}`}
                    >
                      ({value})
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <Navigation language={language} onLanguageChange={setLanguage} />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
          {t.title}
        </h2>
        <p className="mb-8 text-xl text-gray-600 dark:text-gray-400">{t.subtitle}</p>

        {/* Billing Toggle */}
        <div className="mb-12 flex items-center justify-center gap-4">
          <span
            className={
              !isYearly ? 'font-semibold text-blue-600' : 'text-gray-600 dark:text-gray-400'
            }
          >
            {t.billing.monthly}
          </span>
          <button
            role="switch"
            aria-checked={isYearly}
            aria-label={language === 'zh' ? '切换到年付/月付' : 'Switch to yearly/monthly billing'}
            onClick={() => setIsYearly(!isYearly)}
            className={`relative h-8 w-16 rounded-full transition-colors ${
              isYearly ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span className="sr-only">
              {isYearly ? (language === 'zh' ? '年付模式' : 'Yearly billing') : (language === 'zh' ? '月付模式' : 'Monthly billing')}
            </span>
            <div
              className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
                isYearly ? 'left-9' : 'left-1'
              }`}
            />
          </button>
          <span
            className={
              isYearly ? 'font-semibold text-blue-600' : 'text-gray-600 dark:text-gray-400'
            }
          >
            {t.billing.yearly}
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          <PricingCard tier="free" isYearly={isYearly} />
          <PricingCard tier="pro" isYearly={isYearly} isPopular />
          <PricingCard tier="enterprise" isYearly={isYearly} />
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h3 className="mb-4 text-center text-3xl font-bold text-gray-900 dark:text-white">
            {t.comparison.title}
          </h3>
          <p className="mb-12 text-center text-gray-600 dark:text-gray-400">
            {t.comparison.description}
          </p>

          <div className="overflow-hidden rounded-xl bg-white shadow-lg dark:bg-gray-800">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    功能
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    {t.tiers.free.name}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-blue-600">
                    {t.tiers.pro.name}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    {t.tiers.enterprise.name}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(featuresData).map(([feature, values]) => {
                  const featureLabel = t.features[feature as keyof typeof t.features]
                  return (
                    <tr
                      key={feature}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {featureLabel}
                      </td>
                      {(['free', 'pro', 'enterprise'] as const).map(tier => {
                        const value = values[tier]
                        const hasFeature =
                          value === true || (typeof value === 'string' && value !== '社区支持')
                        return (
                          <td key={tier} className="px-6 py-4 text-center">
                            {hasFeature ? (
                              <span className="flex items-center justify-center gap-2">
                                <Check className="h-5 w-5 text-green-500" />
                                {typeof value === 'string' && value !== '社区支持' && (
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {value}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <X className="mx-auto h-5 w-5 text-gray-400" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Email Collection Form */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white shadow-xl">
          <div className="mb-8 text-center">
            <Mail className="mx-auto mb-4 h-12 w-12 opacity-90" />
            <h3 className="mb-2 text-3xl font-bold">{t.form.title}</h3>
            <p className="text-blue-100">{t.form.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" aria-label={t.form.title}>
            <div>
              <label htmlFor="enterprise-email" className="sr-only">
                {t.form.email}
              </label>
              <input
                id="enterprise-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t.form.email}
                className="w-full rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-white focus:outline-none"
                required
                aria-describedby="enterprise-email-privacy"
              />
              <p id="enterprise-email-privacy" className="mt-2 text-center text-sm text-blue-100">
                {t.form.privacy}
              </p>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-white px-6 py-3 font-semibold text-blue-600 transition-colors hover:bg-blue-50"
            >
              {t.form.submit}
            </button>

            {submitStatus === 'success' && (
              <div role="alert" className="rounded-lg bg-green-500 p-3 text-center text-white">
                {t.form.success}
              </div>
            )}

            {submitStatus === 'error' && (
              <div role="alert" className="rounded-lg bg-red-500 p-3 text-center text-white">{t.form.error}</div>
            )}
          </form>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h3 className="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-white">
            {t.faq.title}
          </h3>

          <div className="space-y-4">
            {t.faq.items.map((item, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-lg bg-white shadow-md dark:bg-gray-800"
              >
                <button
                  aria-expanded={expandedFaq === index}
                  aria-controls={`faq-answer-${index}`}
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-500 transition-transform ${
                      expandedFaq === index ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {expandedFaq === index && (
                  <div id={`faq-answer-${index}`} className="px-6 pb-4 text-gray-600 dark:text-gray-400">{item.answer}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-12 text-center text-white shadow-xl">
          <Zap className="mx-auto mb-6 h-16 w-16 opacity-90" />
          <h3 className="mb-4 text-3xl font-bold">
            {language === 'zh' ? '准备好开始了吗？' : 'Ready to get started?'}
          </h3>
          <p className="mb-8 text-xl opacity-90">
            {language === 'zh'
              ? '加入数千名用户，体验 7zi 的强大功能'
              : 'Join thousands of users and experience the power of 7zi'}
          </p>
          <button
            onClick={() => router.push('/register')}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-lg font-semibold text-blue-600 transition-colors hover:bg-blue-50"
          >
            {t.tiers.free.cta}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-6">
              <span className="text-2xl font-bold text-blue-600">7zi</span>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-400"
                >
                  <Users className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-400"
                >
                  <Shield className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-400"
                >
                  <Globe className="h-5 w-5" />
                </a>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2026 7zi. {language === 'zh' ? '保留所有权利' : 'All rights reserved'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ChevronDown component for FAQ
function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
