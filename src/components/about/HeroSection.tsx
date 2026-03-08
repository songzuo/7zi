'use client';

import { useTranslations } from 'next-intl';

export function HeroSection() {
  const tAbout = useTranslations('about');
  
  return (
    <section className="relative py-32 px-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black dark:from-black dark:via-zinc-900 dark:to-zinc-800 overflow-hidden pt-24">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" aria-hidden="true" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-cyan-400 text-sm font-medium mb-6 border border-white/20">
          <span className="animate-pulse">✨</span>
          {tAbout('hero.badge')}
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
          {tAbout('hero.title')}{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 animate-gradient bg-[length:200%_200%]">
            7zi Studio
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto leading-relaxed">
          {tAbout('hero.description')}
        </p>
      </div>
    </section>
  );
}