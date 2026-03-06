'use client';

import { useState, useEffect } from 'react';

interface FloatingCard {
  id: number;
  emoji: string;
  title: string;
  delay: number;
}

const floatingCards: FloatingCard[] = [
  { id: 1, emoji: '💻', title: '网站开发', delay: 0 },
  { id: 2, emoji: '🎨', title: '品牌设计', delay: 1 },
  { id: 3, emoji: '📈', title: '营销推广', delay: 2 },
  { id: 4, emoji: '🤖', title: 'AI 集成', delay: 3 },
  { id: 5, emoji: '📱', title: '移动应用', delay: 4 },
];

export function Hero3D() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMounted] = useState(true); // Initialize as mounted for SSR safety

  useEffect(() => {
    
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-2000" />

      {/* 3D Floating Cards */}
      {isMounted && (
        <>
          {floatingCards.map((card, index) => {
            const angle = (index / floatingCards.length) * Math.PI * 2;
            const radius = 280;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            return (
              <div
                key={card.id}
                className="absolute hidden lg:block w-20 h-20 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl flex items-center justify-center text-3xl hover:scale-110 transition-transform duration-300 cursor-pointer"
                style={{
                  transform: `translate(${x + mousePosition.x * (index + 1)}px, ${y + mousePosition.y * (index + 1)}px) rotate(${mousePosition.x * (index + 1)}deg)`,
                  animation: `float 3s ease-in-out infinite ${card.delay * 0.3}s`,
                }}
              >
                <span className="hover:animate-bounce">{card.emoji}</span>
              </div>
            );
          })}
        </>
      )}

      {/* Main Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center px-6 pt-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-full text-cyan-600 dark:text-cyan-400 text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
          AI 驱动的创新数字工作室
        </div>

        {/* Main Heading with 3D Effect */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-zinc-900 dark:text-white mb-6 leading-tight animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          用 AI 重新定义
          <br />
          <span 
            className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 inline-block"
            style={{
              transform: isMounted ? `perspective(1000px) rotateX(${mousePosition.y * 0.5}deg) rotateY(${mousePosition.x * 0.5}deg)` : 'none',
              transition: 'transform 0.3s ease-out',
            }}
          >
            团队协作
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
          7zi Studio 由 11 位专业的 AI 代理组成，从战略规划到产品交付，
          为您提供一站式的数字化解决方案。
        </p>

        {/* CTA Buttons with Hover Effects */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-600">
          <button className="group relative inline-flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 py-4 rounded-full font-semibold text-lg overflow-hidden transition-all hover:shadow-2xl hover:shadow-cyan-500/25 hover:-translate-y-1">
            <span className="relative z-10 flex items-center gap-2">
              了解更多
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
          
          <button className="group inline-flex items-center justify-center gap-2 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-8 py-4 rounded-full font-semibold text-lg hover:border-cyan-500 hover:text-cyan-500 dark:hover:border-cyan-400 dark:hover:text-cyan-400 transition-all hover:shadow-lg hover:-translate-y-1">
            团队成员
            <span className="group-hover:rotate-45 transition-transform">↗</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-20 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-800">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500">
              11+
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">AI 专家</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
              24/7
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">在线服务</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
              100%
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">项目交付</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-zinc-400 dark:border-zinc-600 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-zinc-400 dark:bg-zinc-600 rounded-full animate-pulse" />
        </div>
      </div>

      {/* CSS for float animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>
    </section>
  );
}
