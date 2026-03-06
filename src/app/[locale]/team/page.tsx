import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Locale, locales } from '@/i18n/config';
import { Link } from '@/i18n/routing';
import { ClientProviders, ThemeToggle } from '@/components/ClientProviders';
import MobileMenu from '@/components/MobileMenu';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { StructuredData } from '@/components/SEO';
import type { Metadata } from 'next';

type Params = Promise<{ locale: string }>;

const baseUrl = 'https://7zi.studio';

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  
  const titles = {
    zh: '团队成员 - 11 位 AI 专家团队',
    en: 'Our Team - 11 AI Experts',
  };
  
  const descriptions = {
    zh: '7zi Studio 团队成员介绍 - 11 位专业的 AI 代理，从战略规划到执行落地，为您提供全方位的数字化服务。',
    en: '7zi Studio team members - 11 professional AI agents providing comprehensive digital services.',
  };

  return {
    title: titles[locale as 'zh' | 'en'] || titles.zh,
    description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    openGraph: {
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
      url: `${baseUrl}/${locale}/team`,
      type: 'website',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/team`,
      languages: {
        'zh-CN': `${baseUrl}/zh/team`,
        'en-US': `${baseUrl}/en/team`,
      },
    },
  };
}

// 团队成员数据
const teamMembers = [
  { id: 1, emoji: '🌟', color: 'from-yellow-400 to-orange-500', key: 'expert', category: 'strategy' },
  { id: 2, emoji: '📚', color: 'from-blue-400 to-indigo-600', key: 'consultant', category: 'strategy' },
  { id: 3, emoji: '🏗️', color: 'from-purple-400 to-pink-600', key: 'architect', category: 'tech' },
  { id: 4, emoji: '⚡', color: 'from-green-400 to-emerald-600', key: 'executor', category: 'tech' },
  { id: 5, emoji: '🛡️', color: 'from-red-400 to-rose-600', key: 'admin', category: 'tech' },
  { id: 6, emoji: '🧪', color: 'from-cyan-400 to-teal-600', key: 'tester', category: 'tech' },
  { id: 7, emoji: '🎨', color: 'from-pink-400 to-rose-500', key: 'designer', category: 'creative' },
  { id: 8, emoji: '📣', color: 'from-amber-400 to-yellow-600', key: 'promoter', category: 'creative' },
  { id: 9, emoji: '💼', color: 'from-violet-400 to-purple-600', key: 'sales', category: 'business' },
  { id: 10, emoji: '💰', color: 'from-emerald-400 to-green-600', key: 'finance', category: 'business' },
  { id: 11, emoji: '📺', color: 'from-sky-400 to-blue-600', key: 'media', category: 'creative' },
];

export default async function TeamPage({ params }: { params: Params }) {
  const { locale } = await params;
  
  if (!locales.includes(locale as Locale)) {
    // notFound()
  }
  
  setRequestLocale(locale);
  
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tTeam = await getTranslations({ locale, namespace: 'team' });
  const tMembers = await getTranslations({ locale, namespace: 'team.members' });
  const tFooter = await getTranslations({ locale, namespace: 'footer' });

  return (
    <ClientProviders>
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800" aria-label="Main navigation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
              7zi<span className="text-cyan-500">Studio</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden lg:flex items-center gap-6">
                <Link href="/about" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
                  {tNav('about')}
                </Link>
                <Link href="/team" className="text-cyan-500 font-medium">
                  {tNav('team')}
                </Link>
                <Link href="/blog" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
                  {tNav('blog')}
                </Link>
                <Link href="/dashboard" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
                  {tNav('dashboard')}
                </Link>
                <ThemeToggle />
                <LanguageSwitcher />
                <Link
                  href="/contact"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
                >
                  {tNav('contact')}
                </Link>
              </div>
              <div className="flex lg:hidden items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
                <MobileMenu />
              </div>
            </div>
          </div>
        </nav>

        {/* SEO Structured Data */}
        <StructuredData
          locale={locale as 'zh' | 'en'}
          schemas={['website', 'organization']}
        />

        {/* Hero */}
        <section className="pt-32 pb-16 px-6 bg-gradient-to-br from-cyan-900 via-purple-900 to-zinc-900">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-cyan-400 text-sm font-medium mb-6 border border-white/20">
              <span className="animate-pulse">✨</span>
              {tTeam('hero.badge')}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              {tTeam('hero.title')}
            </h1>
            <p className="text-xl text-zinc-300 max-w-2xl mx-auto mb-12">
              {tTeam('hero.description')}
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto">
              <div className="text-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  {tTeam('hero.stats.members.value')}
                </div>
                <div className="text-sm text-zinc-300 mt-1">
                  {tTeam('hero.stats.members.label')}
                </div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                  {tTeam('hero.stats.coverage.value')}
                </div>
                <div className="text-sm text-zinc-300 mt-1">
                  {tTeam('hero.stats.coverage.label')}
                </div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                  {tTeam('hero.stats.support.value')}
                </div>
                <div className="text-sm text-zinc-300 mt-1">
                  {tTeam('hero.stats.support.label')}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team Members Grid */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="group relative bg-white dark:bg-zinc-900 rounded-3xl p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                >
                  {/* Gradient border effect */}
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${member.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-sm`} aria-hidden="true" />
                  <div className="absolute inset-0 rounded-3xl bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800 transition-colors duration-300 -z-10" aria-hidden="true" />
                  
                  <div className="text-5xl mb-4" aria-hidden="true">{member.emoji}</div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
                    {tMembers(`${member.key}.name`)}
                  </h3>
                  <p className={`text-sm font-medium bg-gradient-to-r ${member.color} bg-clip-text text-transparent mb-4`}>
                    {tMembers(`${member.key}.role`)}
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                    {tMembers(`${member.key}.description`)}
                  </p>
                  
                  {/* Skills */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {(tMembers.raw(`${member.key}.skills`) as string[])?.map((skill: string, i: number) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${member.color} text-white/90`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Collaboration Mode */}
        <section className="py-20 px-6 bg-white dark:bg-zinc-900">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
                {tTeam('collaboration.title')}
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                {tTeam('collaboration.description')}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {['strategy', 'design', 'testing', 'promotion'].map((key) => {
                const colors = {
                  strategy: 'from-cyan-500 to-blue-600',
                  design: 'from-purple-500 to-pink-600',
                  testing: 'from-green-500 to-emerald-600',
                  promotion: 'from-amber-500 to-orange-600',
                };
                const emojis = { strategy: '🎯', design: '🎨', testing: '🧪', promotion: '📈' };
                return (
                  <div
                    key={key}
                    className="group bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[key as keyof typeof colors]} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300`} aria-hidden="true">
                      {emojis[key as keyof typeof emojis]}
                    </div>
                    <h3 className="font-bold text-zinc-900 dark:text-white mb-2">
                      {tTeam(`collaboration.items.${key}.title`)}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {tTeam(`collaboration.items.${key}.description`)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 bg-gradient-to-r from-cyan-500 to-purple-600">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {tTeam('cta.title')}
            </h2>
            <p className="text-xl text-white/80 mb-8">
              {tTeam('cta.description')}
            </p>
            <Link
              href="/contact"
              className="group inline-flex items-center gap-3 bg-white text-cyan-600 px-10 py-5 rounded-full font-semibold text-lg hover:bg-cyan-50 transition-all duration-300 hover:shadow-2xl hover:scale-105"
            >
              {tTeam('cta.button')}
              <span className="group-hover:translate-x-2 transition-transform duration-300" aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 bg-zinc-900 text-zinc-400" role="contentinfo">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-2xl font-bold text-white">
                7zi<span className="text-cyan-500">Studio</span>
              </div>
              <nav aria-label="Footer navigation">
                <ul className="flex gap-8">
                  <li><Link href="/" className="hover:text-white transition-colors">{tNav('home')}</Link></li>
                  <li><Link href="/about" className="hover:text-white transition-colors">{tNav('about')}</Link></li>
                  <li><Link href="/team" className="hover:text-white transition-colors">{tNav('team')}</Link></li>
                  <li><Link href="/blog" className="hover:text-white transition-colors">{tNav('blog')}</Link></li>
                </ul>
              </nav>
              <div className="text-sm">
                {tFooter('copyright')}
              </div>
            </div>
          </div>
        </footer>

        {/* Structured Data for Team Page */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: locale === 'zh' ? "7zi Studio 团队成员" : "7zi Studio Team Members",
              description: locale === 'zh' ? "11 位专业的 AI 代理团队介绍" : "Introduction to our 11 professional AI agents",
              url: `${baseUrl}/${locale}/team`,
              mainEntity: {
                "@type": "ItemList",
                numberOfItems: teamMembers.length,
                itemListElement: teamMembers.map((member, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  item: {
                    "@type": "Person",
                    name: tMembers(`${member.key}.name`),
                    jobTitle: tMembers(`${member.key}.role`),
                    description: tMembers(`${member.key}.description`),
                  },
                })),
              },
            }),
          }}
        />
      </div>
    </ClientProviders>
  );
}
