'use client';

import { useTranslations } from 'next-intl';

export function CompanyIntro() {
  const tAbout = useTranslations('about');
  
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 shadow-2xl border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500/50 transition-colors duration-500">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl" aria-hidden="true">
              🚀
            </div>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
              {tAbout('intro.title')}
            </h2>
          </div>
          <div className="space-y-6 text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
            <p>
              <strong className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-400 font-bold">
                7zi Studio
              </strong>{" "}
              {tAbout('intro.p1')}
            </p>
            <p>{tAbout('intro.p2')}</p>
            <p>{tAbout('intro.p3')}</p>
          </div>
          
          {/* Stats Cards */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="group text-center p-6 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300 border border-cyan-200/50 dark:border-cyan-800/50">
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
                {tAbout('intro.stats.experts.value')}
              </div>
              <div className="text-zinc-600 dark:text-zinc-400 font-medium">
                {tAbout('intro.stats.experts.label')}
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                {tAbout('intro.stats.experts.sub')}
              </div>
            </div>
            <div className="group text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300 border border-purple-200/50 dark:border-purple-800/50">
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                {tAbout('intro.stats.projects.value')}
              </div>
              <div className="text-zinc-600 dark:text-zinc-400 font-medium">
                {tAbout('intro.stats.projects.label')}
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                {tAbout('intro.stats.projects.sub')}
              </div>
            </div>
            <div className="group text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300 border border-green-200/50 dark:border-green-800/50">
              <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                {tAbout('intro.stats.delivery.value')}
              </div>
              <div className="text-zinc-600 dark:text-zinc-400 font-medium">
                {tAbout('intro.stats.delivery.label')}
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                {tAbout('intro.stats.delivery.sub')}
              </div>
            </div>
            <div className="group text-center p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300 border border-amber-200/50 dark:border-amber-800/50">
              <div className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
                {tAbout('intro.stats.support.value')}
              </div>
              <div className="text-zinc-600 dark:text-zinc-400 font-medium">
                {tAbout('intro.stats.support.label')}
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                {tAbout('intro.stats.support.sub')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}