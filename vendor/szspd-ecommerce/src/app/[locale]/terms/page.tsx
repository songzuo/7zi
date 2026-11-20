import {getTranslations} from 'next-intl/server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'zh' ? '服务条款 | 七子菜谱' : 'Terms of Service | 7zi Recipes';
  const desc = locale === 'zh' 
    ? '了解使用七子菜谱服务的条款和条件。'
    : 'Learn about the terms and conditions for using 7zi Recipes services.';
  
  return {
    title,
    description: desc,
    alternates: {
      canonical: locale === 'zh' ? 'https://ai.7zi.com/terms' : 'https://ai.7zi.com/en/terms',
    },
  };
}

export default async function TermsPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const t = await getTranslations('terms');

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
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('section6Title')}</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{t('section6Content')}</p>
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
