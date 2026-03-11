"use client";

import { useTranslations } from "next-intl";
import { useSettings } from "@/contexts/SettingsContext";

export function ThemeSection() {
  const t = useTranslations("settings");
  const { settings, setTheme } = useSettings();

  const themes = [
    { value: "light" as const, label: t("theme.light"), bg: "bg-white border-zinc-300" },
    { value: "dark" as const, label: t("theme.dark"), bg: "bg-zinc-900 border-zinc-700" },
    { value: "system" as const, label: t("theme.system"), bg: "bg-gradient-to-br from-white to-zinc-900 border-zinc-400" },
  ];

  return (
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
          {themes.map((theme) => (
            <button
              key={theme.value}
              onClick={() => setTheme(theme.value)}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                settings.theme === theme.value
                  ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full ${theme.bg} border-2 shadow-sm`} />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {theme.label}
                </span>
              </div>
              {settings.theme === theme.value && <CheckIcon />}
            </button>
          ))}
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
