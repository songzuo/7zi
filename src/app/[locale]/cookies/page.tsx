import {getTranslations} from 'next-intl/server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'zh' ? 'Cookie政策 | 七子菜谱' : 'Cookie Policy | 7zi Recipes';
  const desc = locale === 'zh' 
    ? '了解七子菜谱如何使用Cookie和类似技术。'
    : 'Learn how 7zi Recipes uses cookies and similar technologies.';
  
  return {
    title,
    description: desc,
    alternates: {
      canonical: locale === 'zh' ? 'https://ai.7zi.com/cookies' : 'https://ai.7zi.com/en/cookies',
    },
  };
}

export default async function CookiesPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const t = await getTranslations('cookies');

  return (
    <div className="py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          {t('title')}
        </h1>
        
        <div className="prose dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('section1Title')}</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{t('section1Content')}</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('section2Title')}</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{t('section2Content')}</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('section3Title')}</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{t('section3Content')}</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('section4Title')}</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{t('section4Content')}</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('section5Title')}</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{t('section5Content')}</p>
          </section>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('lastUpdated')}
          </p>
        </div>
      </div>
    </div>
  );
}
