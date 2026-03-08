import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Locale, locales } from '@/i18n/config';
import { ClientProviders } from '@/components/ClientProviders';
import { StructuredData } from '@/components/SEO';
import { TeamGrid, CollaborationSection, HeroSection, CTASection, TeamNavigation, TeamFooter, TeamMember } from '@/components/team';
import type { Metadata } from 'next';

type Params = Promise<{ locale: string }>;
const baseUrl = 'https://7zi.studio';

const teamMembers: TeamMember[] = [
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

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const titles = { zh: '团队成员 - 11 位 AI 专家团队', en: 'Our Team - 11 AI Experts' };
  const descriptions = {
    zh: '7zi Studio 团队成员介绍 - 11 位专业的 AI 代理，从战略规划到执行落地，为您提供全方位的数字化服务。',
    en: '7zi Studio team members - 11 professional AI agents providing comprehensive digital services.',
  };
  return {
    title: titles[locale as 'zh' | 'en'] || titles.zh,
    description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    openGraph: { title: titles[locale as 'zh' | 'en'] || titles.zh, description: descriptions[locale as 'zh' | 'en'] || descriptions.zh, url: `${baseUrl}/${locale}/team`, type: 'website', locale: locale === 'zh' ? 'zh_CN' : 'en_US' },
    twitter: { card: 'summary_large_image', title: titles[locale as 'zh' | 'en'] || titles.zh, description: descriptions[locale as 'zh' | 'en'] || descriptions.zh },
    alternates: { canonical: `${baseUrl}/${locale}/team`, languages: { 'zh-CN': `${baseUrl}/zh/team`, 'en-US': `${baseUrl}/en/team` } },
  };
}

export default async function TeamPage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) { /* notFound() */ }
  setRequestLocale(locale);
  
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tTeam = await getTranslations({ locale, namespace: 'team' });
  const tMembers = await getTranslations({ locale, namespace: 'team.members' });
  const tFooter = await getTranslations({ locale, namespace: 'footer' });

  const getMemberData = (key: string) => ({
    name: tMembers(`${key}.name`),
    role: tMembers(`${key}.role`),
    description: tMembers(`${key}.description`),
    skills: (tMembers.raw(`${key}.skills`) as string[]) || [],
  });

  const heroStats = {
    members: { value: tTeam('hero.stats.members.value'), label: tTeam('hero.stats.members.label') },
    coverage: { value: tTeam('hero.stats.coverage.value'), label: tTeam('hero.stats.coverage.label') },
    support: { value: tTeam('hero.stats.support.value'), label: tTeam('hero.stats.support.label') },
  };

  const collaborationItems = {
    strategy: { title: tTeam('collaboration.items.strategy.title'), description: tTeam('collaboration.items.strategy.description') },
    design: { title: tTeam('collaboration.items.design.title'), description: tTeam('collaboration.items.design.description') },
    testing: { title: tTeam('collaboration.items.testing.title'), description: tTeam('collaboration.items.testing.description') },
    promotion: { title: tTeam('collaboration.items.promotion.title'), description: tTeam('collaboration.items.promotion.description') },
  };

  const navItems = ['home', 'about', 'team', 'blog'].map((key) => ({ key, label: tNav(key) }));

  return (
    <ClientProviders>
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <TeamNavigation tNav={tNav} locale={locale} />
        <StructuredData locale={locale as 'zh' | 'en'} schemas={['website', 'organization']} />
        <HeroSection badge={tTeam('hero.badge')} title={tTeam('hero.title')} description={tTeam('hero.description')} stats={heroStats} />
        <TeamGrid members={teamMembers} getMemberData={getMemberData} />
        <CollaborationSection title={tTeam('collaboration.title')} description={tTeam('collaboration.description')} items={collaborationItems} />
        <CTASection title={tTeam('cta.title')} description={tTeam('cta.description')} buttonText={tTeam('cta.button')} />
        <TeamFooter navItems={navItems} copyright={tFooter('copyright')} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: locale === 'zh' ? "7zi Studio 团队成员" : "7zi Studio Team Members",
          description: locale === 'zh' ? "11 位专业的 AI 代理团队介绍" : "Introduction to our 11 professional AI agents",
          url: `${baseUrl}/${locale}/team`,
          mainEntity: { "@type": "ItemList", numberOfItems: teamMembers.length, itemListElement: teamMembers.map((member, index) => ({ "@type": "ListItem", position: index + 1, item: { "@type": "Person", name: tMembers(`${member.key}.name`), jobTitle: tMembers(`${member.key}.role`), description: tMembers(`${member.key}.description`) } })) },
        }) }} />
      </div>
    </ClientProviders>
  );
}