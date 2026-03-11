"use client";

import { useTranslations } from "next-intl";
import { ThemeSection, LanguageSection, NotificationsSection } from "@/components/settings";
import { useSettingsPage } from "@/hooks/useSettingsPage";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { saved, handleSave, handleReset } = useSettingsPage();

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

        {/* Sections */}
        <ThemeSection />
        <LanguageSection />
        <NotificationsSection />

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