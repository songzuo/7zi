'use client'

import { useState, useEffect } from 'react'

interface FloatingCard {
  id: number
  emoji: string
  title: string
  delay: number
}

const floatingCards: FloatingCard[] = [
  { id: 1, emoji: '💻', title: '网站开发', delay: 0 },
  { id: 2, emoji: '🎨', title: '品牌设计', delay: 1 },
  { id: 3, emoji: '📈', title: '营销推广', delay: 2 },
  { id: 4, emoji: '🤖', title: 'AI 集成', delay: 3 },
  { id: 5, emoji: '📱', title: '移动应用', delay: 4 },
]

export function Hero3D() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isMounted] = useState(true) // Initialize as mounted for SSR safety

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20
      const y = (e.clientY / window.innerHeight - 0.5) * 20
      setMousePosition({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-[size:4rem_4rem]" />

      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-500/20 blur-3xl delay-1000" />
      <div className="absolute top-1/2 right-1/3 h-64 w-64 animate-pulse rounded-full bg-pink-500/20 blur-3xl delay-2000" />

      {/* 3D Floating Cards */}
      {isMounted && (
        <>
          {floatingCards.map((card, index) => {
            const angle = (index / floatingCards.length) * Math.PI * 2
            const radius = 280
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius

            return (
              <div
                key={card.id}
                className="absolute flex hidden h-20 w-20 cursor-pointer items-center justify-center rounded-2xl bg-white text-3xl shadow-xl transition-transform duration-300 hover:scale-110 lg:block dark:bg-zinc-800"
                style={{
                  transform: `translate(${x + mousePosition.x * (index + 1)}px, ${y + mousePosition.y * (index + 1)}px) rotate(${mousePosition.x * (index + 1)}deg)`,
                  animation: `float 3s ease-in-out infinite ${card.delay * 0.3}s`,
                }}
              >
                <span className="hover:animate-bounce">{card.emoji}</span>
              </div>
            )
          })}
        </>
      )}

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-20 text-center">
        {/* Badge */}
        <div className="animate-in fade-in slide-in-from-bottom-4 mb-8 inline-flex items-center gap-2 rounded-full bg-cyan-100 px-4 py-2 text-sm font-medium text-cyan-600 duration-700 dark:bg-cyan-900/30 dark:text-cyan-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
          AI 驱动的创新数字工作室
        </div>

        {/* Main Heading with 3D Effect */}
        <h1 className="animate-in fade-in slide-in-from-bottom-8 mb-6 text-5xl leading-tight font-bold text-zinc-900 delay-200 duration-1000 md:text-7xl lg:text-8xl dark:text-white">
          用 AI 重新定义
          <br />
          <span
            className="inline-block bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 bg-clip-text text-transparent"
            style={{
              transform: isMounted
                ? `perspective(1000px) rotateX(${mousePosition.y * 0.5}deg) rotateY(${mousePosition.x * 0.5}deg)`
                : 'none',
              transition: 'transform 0.3s ease-out',
            }}
          >
            团队协作
          </span>
        </h1>

        {/* Subtitle */}
        <p className="animate-in fade-in slide-in-from-bottom-8 mx-auto mb-12 max-w-3xl text-xl text-zinc-600 delay-400 duration-1000 md:text-2xl dark:text-zinc-400">
          7zi Studio 由 11 位专业的 AI 代理组成，从战略规划到产品交付，
          为您提供一站式的数字化解决方案。
        </p>

        {/* CTA Buttons with Hover Effects */}
        <div className="animate-in fade-in slide-in-from-bottom-8 flex flex-col justify-center gap-4 delay-600 duration-1000 sm:flex-row">
          <button className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-zinc-900 px-8 py-4 text-lg font-semibold text-white transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/25 dark:bg-white dark:text-zinc-900">
            <span className="relative z-10 flex items-center gap-2">
              了解更多
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </button>

          <button className="group inline-flex items-center justify-center gap-2 rounded-full border-2 border-zinc-300 px-8 py-4 text-lg font-semibold text-zinc-700 transition-all hover:-translate-y-1 hover:border-cyan-500 hover:text-cyan-500 hover:shadow-lg dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-cyan-400 dark:hover:text-cyan-400">
            团队成员
            <span className="transition-transform group-hover:rotate-45">↗</span>
          </button>
        </div>

        {/* Stats */}
        <div className="animate-in fade-in slide-in-from-bottom-8 mx-auto mt-20 grid max-w-2xl grid-cols-3 gap-8 delay-800 duration-1000">
          <div className="text-center">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
              11+
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">AI 专家</div>
          </div>
          <div className="text-center">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
              24/7
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">在线服务</div>
          </div>
          <div className="text-center">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
              100%
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">项目交付</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-zinc-400 p-2 dark:border-zinc-600">
          <div className="h-3 w-1.5 animate-pulse rounded-full bg-zinc-400 dark:bg-zinc-600" />
        </div>
      </div>

      {/* CSS for float animation */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>
    </section>
  )
}
