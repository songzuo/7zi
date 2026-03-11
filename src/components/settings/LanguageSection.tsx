"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSettings } from "@/contexts/SettingsContext";
import { useRouter, usePathname } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";

export function LanguageSection() {
  const t = useTranslations("settings");
  const locale = useLocale() as Locale;
  const { setLanguage } = useSettings();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: Locale) => {
    setLanguage(newLocale);
    router.replace(pathname, { locale: newLocale });
  };

  const languages = [
    { code: "zh" as const, flag: "🇨🇳", label: t("language.zh"), native: "简体中文" },
    { code: "en" as const, flag: "🇺🇸", label: t("language.en"), native: "English" },
  ];

  return (
    <section className="mb-10">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
          {t("sections.language.title")}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t("sections.language.description")}
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
          {t("language.label")}
        </label>
        
        <div className="grid grid-cols-2 gap-3">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                locale === lang.code
                  ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lang.flag}</span>
                <div className="text-left">
                  <p className="font-medium text-zinc-900 dark:text-white">{lang.label}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{lang.native}</p>
                </div>
              </div>
              {locale === lang.code && <CheckIcon />}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    </div>
  );
}
