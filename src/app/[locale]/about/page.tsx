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
    zh: '关于我们 - AI 驱动的创新数字工作室',
    en: 'About Us - AI-Powered Digital Innovation Studio',
  };
  
  const descriptions = {
    zh: '了解 7zi Studio 团队 - 由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务。',
    en: 'Learn about 7zi Studio - An innovative digital studio powered by 11 AI agents, providing comprehensive digital services.',
  };

  return {
    title: titles[locale as 'zh' | 'en'] || titles.zh,
    description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    openGraph: {
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
      url: `${baseUrl}/${locale}/about`,
      type: 'website',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/about`,
      languages: {
        'zh-CN': `${baseUrl}/zh/about`,
        'en-US': `${baseUrl}/en/about`,
      },
    },
  };
}

// 团队成员数据
const teamMembers = [
  { id: 1, emoji: '🌟', color: 'from-yellow-400 to-orange-500', key: 'expert' },
  { id: 2, emoji: '📚', color: 'from-blue-400 to-indigo-600', key: 'consultant' },
  { id: 3, emoji: '🏗️', color: 'from-purple-400 to-pink-600', key: 'architect' },
  { id: 4, emoji: '⚡', color: 'from-green-400 to-emerald-600', key: 'executor' },
  { id: 5, emoji: '🛡️', color: 'from-red-400 to-rose-600', key: 'admin' },
  { id: 6, emoji: '🧪', color: 'from-cyan-400 to-teal-600', key: 'tester' },
  { id: 7, emoji: '🎨', color: 'from-pink-400 to-rose-500', key: 'designer' },
  { id: 8, emoji: '📣', color: 'from-amber-400 to-yellow-600', key: 'promoter' },
  { id: 9, emoji: '💼', color: 'from-violet-400 to-purple-600', key: 'sales' },
  { id: 10, emoji: '💰', color: 'from-emerald-400 to-green-600', key: 'finance' },
  { id: 11, emoji: '📺', color: 'from-sky-400 to-blue-600', key: 'media' },
];

// 发展历程数据
const timeline = [
  { year: '2024', emoji: '🚀', color: 'from-cyan-500 to-blue-600', key: '0' },
  { year: '2024', emoji: '👥', color: 'from-purple-500 to-pink-600', key: '1' },
  { year: '2025', emoji: '📈', color: 'from-green-500 to-emerald-600', key: '2' },
  { year: '2025', emoji: '⚡', color: 'from-amber-500 to-orange-600', key: '3' },
];

// 合作伙伴
const partners = [
  { name: 'TechCorp', logo: '💻', color: 'from-blue-500 to-cyan-500' },
  { name: 'InnovateLab', logo: '🔬', color: 'from-purple-500 to-pink-500' },
  { name: 'DigitalFirst', logo: '🎯', color: 'from-red-500 to-orange-500' },
  { name: 'CloudNine', logo: '☁️', color: 'from-sky-500 to-blue-600' },
  { name: 'FutureSoft', logo: '🤖', color: 'from-green-500 to-emerald-600' },
  { name: 'DataFlow', logo: '📊', color: 'from-indigo-500 to-purple-600' },
];

export default async function AboutPage({ params }: { params: Params }) {
  const { locale } = await params;
  
  if (!locales.includes(locale as Locale)) {
    // notFound()
  }
  
  setRequestLocale(locale);
  
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tAbout = await getTranslations({ locale, namespace: 'about' });
  const tTeam = await getTranslations({ locale, namespace: 'team.members' });
  const tFooter = await getTranslations({ locale, namespace: 'footer' });

  return (
    <ClientProviders>
      <div className="min-h-screen bg-zinc-50 dark:bg-black overflow-x-hidden">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800" aria-label="Main navigation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
              7zi<span className="text-cyan-500">Studio</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden lg:flex items-center gap-6">
                <Link href="/about" className="text-cyan-500 font-medium">
                  {tNav('about')}
                </Link>
                <Link href="/team" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
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

        {/* Hero Section */}
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

        {/* Studio Introduction */}
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

        {/* Team Members */}
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

        {/* Timeline Section */}
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
                {timeline.map((item, index) => {
                  const timelineItem = tAbout.raw('timeline.items') as Array<{ year: string; title: string; description: string }>;
                  return (
                    <div 
                      key={item.key}
                      className={`relative flex items-center gap-8 md:gap-0 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                    >
                      <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right md:pr-12' : 'md:text-left md:pl-12'} text-center`}>
                        <div className="inline-block bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 hover:shadow-xl hover:border-cyan-500/50 transition-all duration-300 group">
                          <div className="flex items-center gap-2 mb-2 justify-start">
                            <span className="text-2xl" aria-hidden="true">{item.emoji}</span>
                            <span className={`text-lg font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                              {timelineItem?.[index]?.year || item.year}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                            {timelineItem?.[index]?.title}
                          </h3>
                          <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                            {timelineItem?.[index]?.description}
                          </p>
                        </div>
                      </div>
                      <div className="absolute left-8 md:left-1/2 md:-translate-x-1/2 w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg z-10 border-4 border-white dark:border-zinc-900" aria-hidden="true">
                        {index + 1}
                      </div>
                      <div className="flex-1 hidden md:block" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
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
              {['collaboration', 'innovation', 'quality', 'customer'].map((key, index) => {
                const colors = [
                  'from-cyan-500 to-blue-600',
                  'from-purple-500 to-pink-600',
                  'from-amber-500 to-orange-600',
                  'from-green-500 to-emerald-600',
                ];
                const emojis = ['🚀', '💡', '🎯', '🤝'];
                return (
                  <div
                    key={key}
                    className="group relative bg-zinc-50 dark:bg-black rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                  >
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${colors[index]} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} aria-hidden="true" />
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">{emojis[index]}</div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">
                      {tAbout(`values.items.${key}.title`)}
                    </h3>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {tAbout(`values.items.${key}.description`)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
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
      </div>
    </ClientProviders>
  );
}
