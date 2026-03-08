import { Link } from '@/i18n/routing';
import { PARTICLES } from './particles';

interface HeroSectionProps {
  locale: string;
  tHero: (key: string) => string;
  tStats: (key: string) => string;
}

export function HeroSection({ locale, tHero, tStats }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 pt-20" aria-labelledby="hero-title">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" aria-hidden="true" />
      
      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" aria-hidden="true" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" aria-hidden="true" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse delay-500" aria-hidden="true" />
      
      {/* Animated Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {PARTICLES.map((particle, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-500/30 rounded-full animate-pulse"
            style={particle}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-full text-cyan-600 dark:text-cyan-400 text-sm font-medium mb-8">
          <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" aria-hidden="true" />
          <span className="hidden sm:inline">{tHero('badge')}</span>
          <span className="sm:hidden">{tHero('badgeShort')}</span>
        </div>
        
        {/* Heading */}
        <h1 id="hero-title" className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-zinc-900 dark:text-white mb-6 leading-tight">
          {locale === 'zh' ? (
            <>
              用 AI 重新定义
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 animate-gradient bg-[length:200%_200%] inline-block hover:scale-105 transition-transform duration-300">
                团队协作
              </span>
            </>
          ) : (
            <>
              {tHero('title1Prefix')}
            </>
          )}
        </h1>
        
        <p className="text-lg sm:text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto mb-8 md:mb-12">
          {tHero('description')}
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/about"
            className="group relative inline-flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 sm:px-8 py-4 rounded-full font-semibold text-lg overflow-hidden hover:shadow-xl hover:shadow-cyan-500/25 hover:-translate-y-1 transition-all duration-300"
          >
            <span className="relative z-10 flex items-center gap-2">
              {tHero('cta1')}
              <span className="group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
          </Link>
          <Link
            href="/team"
            className="group inline-flex items-center justify-center gap-2 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-6 sm:px-8 py-4 rounded-full font-semibold text-lg hover:border-cyan-500 hover:text-cyan-500 dark:hover:border-cyan-400 dark:hover:text-cyan-400 transition-all hover:-translate-y-1"
          >
            {tHero('cta2')}
            <span className="group-hover:rotate-45 transition-transform" aria-hidden="true">↗</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-16 sm:mt-20 max-w-2xl mx-auto" role="region" aria-label="Statistics">
          <div className="text-center p-4 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all duration-300">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500">
              {tStats('experts.value')}
            </div>
            <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {tStats('experts.label')}
            </div>
          </div>
          <div className="text-center p-4 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all duration-300">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
              {tStats('service.value')}
            </div>
            <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {tStats('service.label')}
            </div>
          </div>
          <div className="text-center p-4 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all duration-300">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
              {tStats('delivery.value')}
            </div>
            <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {tStats('delivery.label')}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
        <div className="w-6 h-10 border-2 border-zinc-400 dark:border-zinc-600 rounded-full flex items-start justify-center p-2 hover:border-cyan-500 transition-colors">
          <div className="w-1.5 h-3 bg-zinc-400 dark:bg-zinc-600 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}