"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useSettings } from "@/contexts/SettingsContext";
import type { Locale } from "@/i18n/config";

export function useSettingsPage() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { settings, setTheme, setLanguage, setNotifications, resetSettings } = useSettings();
  const [saved, setSaved] = useState(false);

  const handleLanguageChange = (newLocale: Locale) => {
    setLanguage(newLocale);
    router.replace(pathname, { locale: newLocale });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (confirm(locale === "zh" ? "确定要重置所有设置吗？" : "Are you sure you want to reset all settings?")) {
      resetSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return {
    locale,
    settings,
    saved,
    setTheme,
    setLanguage,
    setNotifications,
    handleLanguageChange,
    handleSave,
    handleReset,
  };
}
