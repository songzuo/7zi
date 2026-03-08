"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSettings } from "@/contexts/SettingsContext";
import { useRouter, usePathname } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";
import { useState } from "react";

export default function SettingsPage() {
  const t = useTranslations("settings");
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-20 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {t("hero.title")}
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            {t("hero.description")}
          </p>
        </div>

        {/* Save Status */}
        {saved && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-700 dark:text-green-400 text-sm font-medium">
              ✓ {t("actions.saved")}
            </p>
          </div>
        )}

        {/* Appearance Section */}
        <section className="mb-10">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
              {t("sections.appearance.title")}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t("sections.appearance.description")}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
              {t("theme.label")}
            </label>
            
            <div className="grid grid-cols-3 gap-3">
              {/* Light Theme */}
              <button
                onClick={() => setTheme("light")}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  settings.theme === "light"
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-zinc-300 shadow-sm" />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("theme.light")}
                  </span>
                </div>
                {settings.theme === "light" && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>

              {/* Dark Theme */}
              <button
                onClick={() => setTheme("dark")}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  settings.theme === "dark"
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 border-2 border-zinc-700" />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("theme.dark")}
                  </span>
                </div>
                {settings.theme === "dark" && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>

              {/* System Theme */}
              <button
                onClick={() => setTheme("system")}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  settings.theme === "system"
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white to-zinc-900 border-2 border-zinc-400" />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("theme.system")}
                  </span>
                </div>
                {settings.theme === "system" && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            </div>

            {/* Theme Preview */}
            <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                {t("theme.preview")}
              </p>
              <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="bg-white dark:bg-zinc-900 p-4">
                  <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-zinc-100 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Language Section */}
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
              {/* Chinese */}
              <button
                onClick={() => handleLanguageChange("zh")}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  locale === "zh"
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇨🇳</span>
                  <div className="text-left">
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {t("language.zh")}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      简体中文
                    </p>
                  </div>
                </div>
                {locale === "zh" && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>

              {/* English */}
              <button
                onClick={() => handleLanguageChange("en")}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  locale === "en"
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇺🇸</span>
                  <div className="text-left">
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {t("language.en")}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      English
                    </p>
                  </div>
                </div>
                {locale === "en" && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="mb-10">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
              {t("sections.notifications.title")}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t("sections.notifications.description")}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-700">
            {/* Enable Notifications */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-zinc-900 dark:text-white">
                  {t("notifications.enabled.label")}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t("notifications.enabled.description")}
                </p>
              </div>
              <button
                onClick={() => setNotifications({ enabled: !settings.notifications.enabled })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.notifications.enabled
                    ? "bg-cyan-500"
                    : "bg-zinc-300 dark:bg-zinc-600"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.notifications.enabled ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Sound */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-zinc-900 dark:text-white">
                  {t("notifications.sound.label")}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t("notifications.sound.description")}
                </p>
              </div>
              <button
                onClick={() => setNotifications({ sound: !settings.notifications.sound })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.notifications.sound
                    ? "bg-cyan-500"
                    : "bg-zinc-300 dark:bg-zinc-600"
                }`}
                disabled={!settings.notifications.enabled}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.notifications.sound ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Email */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-zinc-900 dark:text-white">
                  {t("notifications.email.label")}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t("notifications.email.description")}
                </p>
              </div>
              <button
                onClick={() => setNotifications({ email: !settings.notifications.email })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.notifications.email
                    ? "bg-cyan-500"
                    : "bg-zinc-300 dark:bg-zinc-600"
                }`}
                disabled={!settings.notifications.enabled}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.notifications.email ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Push */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-zinc-900 dark:text-white">
                  {t("notifications.push.label")}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t("notifications.push.description")}
                </p>
              </div>
              <button
                onClick={() => setNotifications({ push: !settings.notifications.push })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.notifications.push
                    ? "bg-cyan-500"
                    : "bg-zinc-300 dark:bg-zinc-600"
                }`}
                disabled={!settings.notifications.enabled}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.notifications.push ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-4 pt-6 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors"
          >
            {t("actions.save")}
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
          >
            {t("actions.reset")}
          </button>
        </div>
      </div>
    </div>
  );
}
