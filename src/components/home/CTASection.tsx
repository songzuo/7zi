import { Link } from '@/i18n/routing';
import { CTA_PARTICLES } from './particles';

interface CTASectionProps {
  tCta: (key: string) => string;
}

export function CTASection({ tCta }: CTASectionProps) {
  return (
    <section className="py-16 sm:py-20 px-6 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 animate-gradient bg-[length:200%_200%] relative overflow-hidden" aria-labelledby="cta-title">
      <div className="absolute inset-0" aria-hidden="true">
        {CTA_PARTICLES.map((particle, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
            style={particle}
          />
        ))}
      </div>
      
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <h2 id="cta-title" className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6">
          {tCta('title')}
        </h2>
        <p className="text-lg sm:text-xl text-white/80 mb-8">
          {tCta('description')}
        </p>
        <Link
          href="/contact"
          className="group inline-flex items-center justify-center gap-2 bg-white text-cyan-600 px-6 sm:px-8 py-4 rounded-full font-semibold text-lg hover:bg-cyan-50 transition-all hover:shadow-xl hover:-translate-y-1"
        >
          {tCta('button')}
          <span className="group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}