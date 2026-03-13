import { ClientProviders, ThemeToggle } from '@/components/ClientProviders';
import MobileMenu from '@/components/MobileMenu';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { StructuredData } from '@/components/SEO';
import { ContactForm } from '@/components/ContactForm';
import { Link } from '@/i18n/routing';
import {
  ContactHero,
  ContactInfo,
  ContactFAQ,
  ContactCTA,
  ContactStructuredData,
} from '@/components/contact';
import {
  generateContactMetadata,
  getContactTranslations,
  getFAQItems,
} from '@/hooks/useContact';

type Params = Promise<{ locale: string }>;

export { generateContactMetadata as generateMetadata };

export default async function ContactPage({ params }: { params: Params }) {
  const { locale } = await params;
  const { tNav, tContact, tFooter, baseUrl, contactInfo } = await getContactTranslations(locale);

  const faqItems = getFAQItems(tContact as unknown as (key: string) => string, locale as 'zh' | 'en');

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
                <Link href="/about" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">{tNav('about')}</Link>
                <Link href="/team" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">{tNav('team')}</Link>
                <Link href="/blog" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">{tNav('blog')}</Link>
                <Link href="/dashboard" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">{tNav('dashboard')}</Link>
                <ThemeToggle />
                <LanguageSwitcher />
                <Link href="/contact" className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all">{tNav('contact')}</Link>
              </div>
              <div className="flex lg:hidden items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
                <MobileMenu />
              </div>
            </div>
          </div>
        </nav>

        <StructuredData locale={locale as 'zh' | 'en'} schemas={['website', 'organization']} />

        {/* Hero Section */}
        <ContactHero title={tContact('hero.title')} description={tContact('hero.description')} />

        {/* Contact Form & Info */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 shadow-xl">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">{tContact('form.title')}</h2>
                <ContactForm locale={locale as 'zh' | 'en'} />
              </div>
              <ContactInfo
                contactInfo={contactInfo}
                t={tContact as unknown as (key: string) => string}
                responseTitle={tContact('response.title')}
                responseDescription={tContact('response.description')}
                socialTitle={tContact('social.title')}
                infoTitle={tContact('info.title')}
              />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <ContactFAQ title={tContact('faq.title')} items={faqItems} />

        {/* CTA Section */}
        <ContactCTA
          title={tContact('cta.title')}
          description={tContact('cta.description')}
          emailButton={tContact('cta.emailButton')}
          homeButton={tContact('cta.homeButton')}
        />

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
              <div className="text-sm">{tFooter('copyright')}</div>
            </div>
          </div>
        </footer>

        <ContactStructuredData
          locale={locale as 'zh' | 'en'}
          baseUrl={baseUrl}
          contactInfo={contactInfo}
          t={tContact as unknown as (key: string) => string}
          description={tContact('description')}
        />
      </div>
    </ClientProviders>
  );
}