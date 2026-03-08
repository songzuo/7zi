'use client';

import { useTranslations } from 'next-intl';
import { useAboutData } from './subcomponents/useAboutData';

export function Values() {
  const tAbout = useTranslations('about');
  const { values } = useAboutData();
  
  return (
    <section className="py-24 px-6 bg-white dark:bg-zinc-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full text-purple-600 dark:text-purple-400 text-sm font-medium mb-4 border border-purple-500/20">
            <span>💎</span>
            {tAbout('values.badge')}
          </div>
          <h2 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {tAbout('values.title')}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {values.map((item) => (
            <div
              key={item.key}
              className="group relative bg-zinc-50 dark:bg-black rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${item.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} aria-hidden="true" />
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">{item.emoji}</div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">
                {tAbout(`values.items.${item.key}.title`)}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {tAbout(`values.items.${item.key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}