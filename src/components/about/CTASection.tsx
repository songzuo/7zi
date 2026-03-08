'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export function CTASection() {
  const tAbout = useTranslations('about');
  
  return (
    <section className="py-24 px-6 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:32px_32px]" aria-hidden="true" />
      
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
          {tAbout('cta.title')}
        </h2>
        <p className="text-xl text-white/80 mb-10">
          {tAbout('cta.description')}
        </p>
        <Link
          href="/contact"
          className="group inline-flex items-center gap-3 bg-white text-cyan-600 px-10 py-5 rounded-full font-semibold text-lg hover:bg-cyan-50 transition-all duration-300 hover:shadow-2xl hover:scale-105"
        >
          {tAbout('cta.button')}
          <span className="group-hover:translate-x-2 transition-transform duration-300" aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}