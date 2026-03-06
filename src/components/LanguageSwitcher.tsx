'use client';

import { useRouter, usePathname } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { locales, type Locale } from '@/i18n/config';

const languageNames: Record<Locale, { name: string; flag: string }> = {
  zh: { name: '中文', flag: '🇨🇳' },
  en: { name: 'English', flag: '🇺🇸' }
};

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as Locale;

  const switchLocale = (newLocale: Locale) => {
    // 使用 router.replace 切换语言，保持当前路径
    router.replace(
      pathname,
      { locale: newLocale }
    );
  };

  return (
    <div className={`relative group ${className}`}>
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        aria-label="Switch language"
      >
        <span className="text-lg">{languageNames[currentLocale]?.flag}</span>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {languageNames[currentLocale]?.name}
        </span>
        <svg
          className="w-4 h-4 text-zinc-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-2 py-2 w-40 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {locales.map((locale) => (
          <button
            key={locale}
            onClick={() => switchLocale(locale)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${
              locale === currentLocale ? 'text-cyan-500 font-medium' : 'text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <span className="text-lg">{languageNames[locale].flag}</span>
            <span className="text-sm">{languageNames[locale].name}</span>
            {locale === currentLocale && (
              <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// 简洁版语言切换器（仅显示图标）
export function LanguageSwitcherCompact({ className = '' }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as Locale;

  const toggleLocale = () => {
    const newLocale = currentLocale === 'zh' ? 'en' : 'zh';
    router.replace(
      pathname,
      { locale: newLocale }
    );
  };

  return (
    <button
      onClick={toggleLocale}
      className={`flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors ${className}`}
      aria-label={`Switch to ${currentLocale === 'zh' ? 'English' : '中文'}`}
      title={currentLocale === 'zh' ? 'Switch to English' : '切换到中文'}
    >
      <span className="text-lg">{currentLocale === 'zh' ? '🇺🇸' : '🇨🇳'}</span>
    </button>
  );
}
