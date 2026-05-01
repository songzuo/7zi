'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Zap, Shield, Users, BarChart3, ChevronDown, Star, CheckCircle2 } from 'lucide-react'

// Animation hook for fade-in on scroll
function useIntersectionObserver(options = {}) {
  const [isVisible, setIsVisible] = useState(false)
  const [ref, setRef] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!ref) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, ...options }
    )
    observer.observe(ref)
    return () => observer.disconnect()
  }, [ref])

  return { isVisible, ref: (el: HTMLElement | null) => setRef(el) }
}

// Animated section wrapper
function AnimatedSection({
  children,
  className = '',
  delay = 0,
  direction = 'up'
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
}) {
  const { isVisible, ref } = useIntersectionObserver()

  const directionClass = {
    up: 'translate-y-8',
    down: '-translate-y-8',
    left: 'translate-x-8',
    right: '-translate-x-8',
  }[direction]

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${directionClass} ${
        isVisible ? 'opacity-100 translate-y-0 translate-x-0' : 'opacity-0'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

// Feature card
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay = 0,
}: {
  icon: React.ElementType
  title: string
  description: string
  delay?: number
}) {
  const { isVisible, ref } = useIntersectionObserver()

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`group relative rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-500 hover:shadow-lg hover:-translate-y-1 dark:border-gray-700 dark:bg-gray-800 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900/30 dark:text-blue-400">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  )
}

// Pricing card
function PricingCard({
  name,
  price,
  features,
  highlighted = false,
  delay = 0,
}: {
  name: string
  price: string
  features: string[]
  highlighted?: boolean
  delay?: number
}) {
  const { isVisible, ref } = useIntersectionObserver()

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`relative rounded-2xl border p-8 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${
        highlighted
          ? 'border-blue-500 bg-gradient-to-b from-blue-50 to-white shadow-xl ring-2 ring-blue-500/20 dark:from-blue-900/20 dark:to-gray-800'
          : 'border-gray-200 bg-white shadow-md hover:shadow-lg dark:border-gray-700 dark:bg-gray-800'
      }`}
    >
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-sm font-semibold text-white">
          最受欢迎
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{name}</h3>
      <div className="mb-6">
        <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">{price}</span>
        <span className="text-gray-500 dark:text-gray-400">/月</span>
      </div>
      <ul className="mb-8 space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/register"
        className={`block w-full rounded-xl py-3 text-center font-semibold transition-colors ${
          highlighted
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
        }`}
      >
        立即开始
      </Link>
    </div>
  )
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ===== Navigation ===== */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <span className="text-lg font-bold text-white">7</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">7zi</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/demo"
              className="hidden text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white sm:block"
            >
              Demo
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              立即开始
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== Hero Section ===== */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-20 pb-16">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900" />
        <div className="absolute left-1/2 top-20 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-900/10" />

        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <AnimatedSection delay={0}>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              <Star className="h-4 w-4 fill-current" />
              v2.0 全新发布 — 智能体协作平台
            </div>
          </AnimatedSection>

          {/* Headline */}
          <AnimatedSection delay={100}>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
              构建下一代
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                智能体协作平台
              </span>
            </h1>
          </AnimatedSection>

          {/* Subheadline */}
          <AnimatedSection delay={200}>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600 dark:text-gray-400 sm:text-xl">
              7zi 是新一代 AI 原生协作平台，让团队与智能体无缝协作，
              自动化工作流程，提升 10 倍生产力。
            </p>
          </AnimatedSection>

          {/* CTAs */}
          <AnimatedSection delay={300}>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="group flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/40"
              >
                立即开始
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/demo"
                className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-8 py-4 text-lg font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                查看 Demo
              </Link>
            </div>
          </AnimatedSection>

          {/* Social proof badge */}
          <AnimatedSection delay={400}>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {['👨‍💻', '👩‍💻', '👨‍🎨', '👩‍🔬', '🧑‍💼'].map((emoji, i) => (
                    <div
                      key={i}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-sm dark:border-gray-900 dark:bg-gray-700"
                    >
                      {emoji}
                    </div>
                  ))}
                </div>
                <span>已有 <strong className="text-gray-900 dark:text-white">12,000+</strong> 用户</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-1 font-medium text-gray-900 dark:text-white">4.9</span>
                <span>/5 评分</span>
              </div>
            </div>
          </AnimatedSection>
        </div>

        {/* Scroll indicator */}
        <AnimatedSection delay={600}>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="h-6 w-6 text-gray-400" />
          </div>
        </AnimatedSection>
      </section>

      {/* ===== Features Section ===== */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <AnimatedSection className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              为什么选择 7zi？
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
              专为现代团队设计的智能协作平台，集成最前沿的 AI 技术
            </p>
          </AnimatedSection>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={Zap}
              title="闪电般快速"
              description="基于 Next.js 16 和 React 20 构建，毫秒级响应，体验流畅"
              delay={0}
            />
            <FeatureCard
              icon={Shield}
              title="企业级安全"
              description="端到端加密、细粒度权限控制、SOC 2 合规，保障数据安全"
              delay={100}
            />
            <FeatureCard
              icon={Users}
              title="团队协作"
              description="实时协作、多人编辑、评论和标注，团队效率提升 10 倍"
              delay={200}
            />
            <FeatureCard
              icon={BarChart3}
              title="深度分析"
              description="实时监控、智能洞察、数据驱动决策，让每一步都有据可依"
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* ===== Screenshot Section ===== */}
      <section className="bg-gray-100 px-4 py-24 dark:bg-gray-800/50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <AnimatedSection className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              功能一览
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
              直观易用的界面，强大的功能，一切尽在掌控
            </p>
          </AnimatedSection>

          <AnimatedSection delay={100} className="relative mx-auto max-w-5xl">
            {/* Browser chrome */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
              {/* Browser header */}
              <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="ml-4 flex-1 rounded-md bg-gray-200 px-3 py-1 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  app.7zi.com/dashboard
                </div>
              </div>
              {/* Screenshot content placeholder */}
              <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                <div className="absolute inset-0 flex flex-col">
                  {/* Mock sidebar */}
                  <div className="flex h-full">
                    <div className="w-16 border-r border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`mb-2 h-10 w-10 rounded-lg ${i === 1 ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                        />
                      ))}
                    </div>
                    {/* Main content area */}
                    <div className="flex-1 p-6">
                      {/* Header bar */}
                      <div className="mb-4 flex items-center justify-between">
                        <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-700" />
                        <div className="flex gap-2">
                          <div className="h-8 w-20 rounded-lg bg-gray-200 dark:bg-gray-700" />
                          <div className="h-8 w-20 rounded-lg bg-blue-600" />
                        </div>
                      </div>
                      {/* Cards grid */}
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                          >
                            <div className="mb-2 h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-8 w-full rounded bg-gray-100 dark:bg-gray-700" />
                          </div>
                        ))}
                      </div>
                      {/* Chart area */}
                      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                        <div className="mb-3 flex gap-4">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                          ))}
                        </div>
                        <div className="flex items-end gap-2">
                          {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                            <div
                              key={i}
                              className="h-24 flex-1 rounded-t bg-gradient-to-t from-blue-600 to-blue-400"
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Label */}
                <div className="absolute right-4 top-4 rounded-lg border border-gray-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-500 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/90">
                  实时仪表盘
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ===== Social Proof ===== */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <AnimatedSection className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              受全球团队信赖
            </h2>
          </AnimatedSection>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { quote: "7zi 让我们的工作流程自动化效率提升了 300%。团队终于可以专注于真正重要的事情。", author: "李明", role: "CTO", company: "科技创新有限公司" },
              { quote: "这是我用过的最直观的 AI 协作平台。部署简单，团队上手快，效果立竿见影。", author: "王芳", role: "产品负责人", company: "数字传媒集团" },
              { quote: "企业级的安全性加上灵活的工作流自动化，7zi 完全满足了我们对 AI 平台的所有期待。", author: "张伟", role: "技术总监", company: "金融服务公司" },
            ].map((testimonial, i) => (
              <AnimatedSection key={i} delay={i * 100}>
                <div className="h-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div className="mb-4 flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="mb-6 text-gray-700 dark:text-gray-300">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold">
                      {testimonial.author[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{testimonial.author}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {testimonial.role} · {testimonial.company}
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Logos */}
          <AnimatedSection delay={300} className="mt-16">
            <p className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">
              被以下知名企业采用
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-50 grayscale">
              {['阿里巴巴', '腾讯', '字节跳动', '华为', '小米', '京东'].map((name) => (
                <div key={name} className="text-xl font-bold text-gray-400 dark:text-gray-600">
                  {name}
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ===== Pricing Section ===== */}
      <section className="bg-gray-100 px-4 py-24 dark:bg-gray-800/50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <AnimatedSection className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              简单透明的定价
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
              无隐藏费用，随时升级或取消
            </p>
          </AnimatedSection>

          <div className="grid gap-8 sm:grid-cols-3">
            <PricingCard
              name="免费版"
              price="¥0"
              features={['最多 3 个项目', '基础协作功能', '1GB 存储空间', '社区支持']}
              delay={0}
            />
            <PricingCard
              name="专业版"
              price="¥199"
              features={['无限项目', '高级协作功能', '100GB 存储空间', '优先邮件支持', 'API 访问', '自定义工作流']}
              highlighted
              delay={100}
            />
            <PricingCard
              name="企业版"
              price="¥999"
              features={['专业版全部功能', '无限存储空间', '专属客户成功经理', 'SSO & SAML', 'SLA 99.99%', '私有化部署选项']}
              delay={200}
            />
          </div>

          <AnimatedSection delay={300} className="mt-12 text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              查看完整定价方案
              <ArrowRight className="h-4 w-4" />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ===== CTA Section ===== */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <AnimatedSection>
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              准备好提升团队生产力了吗？
            </h2>
            <p className="mb-10 text-lg text-gray-600 dark:text-gray-400">
              加入 12,000+ 团队，开始你的智能协作之旅
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="group flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700 hover:shadow-xl"
              >
                立即免费开始
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/demo"
                className="rounded-xl border border-gray-300 bg-white px-8 py-4 text-lg font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                预约 Demo
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
                  <span className="text-sm font-bold text-white">7</span>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">7zi</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                新一代 AI 原生协作平台
              </p>
            </div>
            {[
              {
                title: '产品',
                links: ['功能介绍', '定价方案', '更新日志', '路线图'],
              },
              {
                title: '资源',
                links: ['文档中心', 'API 参考', '社区论坛', '技术博客'],
              },
              {
                title: '公司',
                links: ['关于我们', '联系我们', '隐私政策', '服务条款'],
              },
            ].map((col) => (
              <div key={col.title}>
                <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">{col.title}</h3>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <Link
                        href="#"
                        className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-8 dark:border-gray-800 sm:flex-row">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2026 7zi. 保留所有权利。
            </p>
            <div className="flex gap-6">
              {['Twitter', 'GitHub', 'Discord', '微信'].map((social) => (
                <Link
                  key={social}
                  href="#"
                  className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  {social}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
