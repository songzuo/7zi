'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useAboutData } from './subcomponents/useAboutData';

export function TeamMembers() {
  const tAbout = useTranslations('about');
  const tTeam = useTranslations('team.members');
  const locale = useLocale();
  const { teamMembers } = useAboutData();
  
  return (
    <section className="py-24 px-6 bg-white dark:bg-zinc-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-full text-cyan-600 dark:text-cyan-400 text-sm font-medium mb-4 border border-cyan-500/20">
            <span>👥</span>
            {tAbout('team.badge')}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
            {tAbout('team.title')}
          </h2>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
            {tAbout('team.description')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member, index) => (
            <div
              key={member.id}
              className="group relative bg-zinc-50 dark:bg-black rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-transparent"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${member.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} aria-hidden="true" />
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${member.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-sm`} aria-hidden="true" />
              <div className="absolute inset-[2px] rounded-3xl bg-zinc-50 dark:bg-black group-hover:bg-white dark:group-hover:bg-zinc-900 transition-colors duration-500 -z-10" aria-hidden="true" />
              
              <div className="relative z-10">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">{member.emoji}</div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                  {tTeam(`${member.key}.name`)}
                </h3>
                <p className={`text-sm font-medium bg-gradient-to-r ${member.color} bg-clip-text text-transparent mb-4`}>
                  {tTeam(`${member.key}.role`)}
                </p>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-4">
                  {tTeam(`${member.key}.description`)}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">24/7 {locale === 'zh' ? '在线' : 'Online'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}