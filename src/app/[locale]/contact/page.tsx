import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Locale, locales } from '@/i18n/config';
import { Link } from '@/i18n/routing';
import { ClientProviders, ThemeToggle } from '@/components/ClientProviders';
import MobileMenu from '@/components/MobileMenu';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { StructuredData } from '@/components/SEO';
import { ContactForm } from '@/components/ContactForm';
import { SocialLinks } from '@/components/SocialLinks';
import type { Metadata } from 'next';

type Params = Promise<{ locale: string }>;

const baseUrl = 'https://7zi.studio';

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  
  const titles = {
    zh: '联系我们 - 获取专业数字化服务',
    en: 'Contact Us - Get Professional Digital Services',
  };
  
  const descriptions = {
    zh: '联系 7zi Studio - AI 驱动的创新数字工作室。商务合作、技术支持、项目咨询，我们 24 小时内回复。',
    en: 'Contact 7zi Studio - AI-powered digital innovation studio. Business cooperation, technical support, project consultation. We respond within 24 hours.',
  };

  return {
    title: titles[locale as 'zh' | 'en'] || titles.zh,
    description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    openGraph: {
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
      url: `${baseUrl}/${locale}/contact`,
      type: 'website',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/contact`,
      languages: {
        'zh-CN': `${baseUrl}/zh/contact`,
        'en-US': `${baseUrl}/en/contact`,
      },
    },
  };
}

// 联系方式信息
const contactInfo = [
  { emoji: '📧', key: 'business' },
  { emoji: '💻', key: 'support' },
  { emoji: '🤝', key: 'careers' },
];

export default async function ContactPage({ params }: { params: Params }) {
  const { locale } = await params;
  
  if (!locales.includes(locale as Locale)) {
    // notFound()
  }
  
  setRequestLocale(locale);
  
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tContact = await getTranslations({ locale, namespace: 'contact' });
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
        <section className="relative py-24 px-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black pt-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              {tContact('hero.title')}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                7zi Studio
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto">
              {tContact('hero.description')}
            </p>
          </div>
        </section>

        {/* Contact Form & Info */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 shadow-xl">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
                  {tContact('form.title')}
                </h2>
                <ContactForm locale={locale as 'zh' | 'en'} />
              </div>

              {/* Contact Info */}
              <div className="space-y-8">
                {/* Email Cards */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 shadow-xl">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
                    {tContact('info.title')}
                  </h2>
                  <div className="space-y-6">
                    {contactInfo.map((info) => (
                      <div key={info.key} className="flex items-start gap-4">
                        <div className="text-3xl" aria-hidden="true">{info.emoji}</div>
                        <div>
                          <h3 className="font-bold text-zinc-900 dark:text-white mb-1">
                            {tContact(`info.${info.key}.title`)}
                          </h3>
                          <a
                            href={`mailto:${tContact(`info.${info.key}.email`)}`}
                            className="text-cyan-500 hover:text-cyan-600 transition-colors"
                          >
                            {tContact(`info.${info.key}.email`)}
                          </a>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            {tContact(`info.${info.key}.description`)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Social Links */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 shadow-xl">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
                    {tContact('social.title')}
                  </h2>
                  <SocialLinks variant="grid" size="md" />
                </div>

                {/* Response Time */}
                <div className="bg-gradient-to-r from-cyan-500 to-purple-600 rounded-3xl p-8 text-white">
                  <h3 className="text-xl font-bold mb-2">{tContact('response.title')}</h3>
                  <p className="text-white/80">
                    {tContact('response.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-6 bg-white dark:bg-zinc-900">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-zinc-900 dark:text-white mb-12">
              {tContact('faq.title')}
            </h2>
            <div className="space-y-6">
              {(tContact.raw('faq.items') as Array<{ question: string; answer: string }>)?.map((faq, index) => (
                <details
                  key={index}
                  className="group bg-zinc-50 dark:bg-zinc-800 rounded-2xl overflow-hidden"
                >
                  <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {faq.question}
                    </span>
                    <span className="ml-4 flex-shrink-0 text-cyan-500 group-open:rotate-180 transition-transform" aria-hidden="true">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </span>
                  </summary>
                  <div className="px-6 pb-6 text-zinc-600 dark:text-zinc-400">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 bg-gradient-to-r from-cyan-600 to-purple-600">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {tContact('cta.title')}
            </h2>
            <p className="text-xl text-white/80 mb-8">
              {tContact('cta.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:business@7zi.studio"
                className="inline-flex items-center justify-center gap-2 bg-white text-cyan-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-cyan-50 transition-colors"
              >
                {tContact('cta.emailButton')}
                <span aria-hidden="true">✉️</span>
              </a>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition-colors"
              >
                {tContact('cta.homeButton')}
              </Link>
            </div>
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

        {/* Structured Data for Contact Page */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ContactPage",
              name: locale === 'zh' ? "联系 7zi Studio" : "Contact 7zi Studio",
              description: tContact('description'),
              url: `${baseUrl}/${locale}/contact`,
              mainEntity: {
                "@type": "Organization",
                name: "7zi Studio",
                url: baseUrl,
                contactPoint: contactInfo.map((info) => ({
                  "@type": "ContactPoint",
                  contactType: tContact(`info.${info.key}.title`),
                  email: tContact(`info.${info.key}.email`),
                  description: tContact(`info.${info.key}.description`),
                })),
              },
            }),
          }}
        />
      </div>
    </ClientProviders>
  );
}
