'use client';

import { useTranslations } from 'next-intl';
import { useAboutData } from './subcomponents/useAboutData';

export function Timeline() {
  const tAbout = useTranslations('about');
  const { timeline } = useAboutData();
  
  const timelineItems = tAbout.raw('timeline.items') as Array<{ year: string; title: string; description: string }>;
  
  return (
    <section className="py-24 px-6 bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-black dark:to-zinc-900">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-full text-cyan-600 dark:text-cyan-400 text-sm font-medium mb-4 border border-cyan-500/20">
            <span>📅</span>
            {tAbout('timeline.badge')}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
            {tAbout('timeline.title')}
          </h2>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
            {tAbout('timeline.description')}
          </p>
        </div>
        
        <div className="relative">
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-purple-500 to-pink-500" aria-hidden="true" />
          
          <div className="space-y-12">
            {timeline.map((item, index) => (
              <div 
                key={item.key}
                className={`relative flex items-center gap-8 md:gap-0 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
              >
                <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right md:pr-12' : 'md:text-left md:pl-12'} text-center`}>
                  <div className="inline-block bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 hover:shadow-xl hover:border-cyan-500/50 transition-all duration-300 group">
                    <div className="flex items-center gap-2 mb-2 justify-start">
                      <span className="text-2xl" aria-hidden="true">{item.emoji}</span>
                      <span className={`text-lg font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                        {timelineItems?.[index]?.year || item.year}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {timelineItems?.[index]?.title}
                    </h3>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                      {timelineItems?.[index]?.description}
                    </p>
                  </div>
                </div>
                <div className="absolute left-8 md:left-1/2 md:-translate-x-1/2 w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg z-10 border-4 border-white dark:border-zinc-900" aria-hidden="true">
                  {index + 1}
                </div>
                <div className="flex-1 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}